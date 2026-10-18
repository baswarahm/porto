import type { VercelRequest, VercelResponse } from "@vercel/node";

const PROMPT =
  "Extract every line item from this receipt, plus subtotal, service_charge, tax, discount, rounding and total. Prices are numbers without currency symbols. For each item, price is the LINE TOTAL (qty × unit price). If a field is missing, use 0. Return JSON only.";

const SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          qty: { type: "NUMBER" },
          price: { type: "NUMBER" },
        },
      },
    },
    subtotal: { type: "NUMBER" },
    service_charge: { type: "NUMBER" },
    tax: { type: "NUMBER" },
    discount: { type: "NUMBER" },
    rounding: { type: "NUMBER" },
    total: { type: "NUMBER" },
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callGemini(
  model: string,
  apiKey: string,
  imageBase64: string,
  mimeType: string
) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA,
        },
      }),
    }
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mimeType } = req.body ?? {};
  if (!imageBase64 || !mimeType?.startsWith("image/")) {
    return res.status(400).json({ error: "Send imageBase64 and a valid image mimeType" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  // Try the main model first, then a backup model
  const models = [
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite",
  ];

  let lastStatus = 500;

  try {
    for (const model of models) {
      // Up to 2 tries per model, with a short wait between tries
      for (let attempt = 1; attempt <= 2; attempt++) {
        const response = await callGemini(model, apiKey, imageBase64, mimeType);

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            return res.status(502).json({ error: "Empty response from Gemini" });
          }
          return res.status(200).json(JSON.parse(text));
        }

        lastStatus = response.status;
        const detail = await response.text();
        console.error(`Gemini error (${model}, try ${attempt}, ${response.status}):`, detail);

        // Only retry when the problem is temporary
        const temporary = [429, 500, 503, 504].includes(response.status);
        if (!temporary) {
          return res.status(502).json({ error: "Scan failed" });
        }
        if (attempt < 2) await sleep(1500);
      }
    }

    // Everything failed
    if (lastStatus === 429) {
      return res.status(429).json({ error: "Rate limit reached, try again in a minute" });
    }
    return res.status(503).json({
      error: "The AI is very busy right now. Please try again in a minute.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}