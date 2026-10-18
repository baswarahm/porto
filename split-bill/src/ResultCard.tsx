import { useRef, useState } from "react";
import { toPng, toBlob } from "html-to-image";

type Line = { label: string; cents: number };
type Person = {
  name: string;
  color: string;
  lines: Line[];
  extra: number;
  total: number;
};
type Props = {
  title: string;
  currency: string;
  people: Person[];
  grandTotal: number;
};

const fmt = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const PAPER = "#ffffff";
const EDGE_BG = "#dce7e1";

function Tear({ flip, id }: { flip?: boolean; id: string }) {
  return (
    <svg
      className="tear"
      width="100%"
      height="8"
      aria-hidden="true"
      style={flip ? { transform: "scaleY(-1)" } : undefined}
    >
      <defs>
        <pattern id={id} width="12" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 0 L6 8 L12 0 Z" fill={PAPER} />
        </pattern>
      </defs>
      <rect width="100%" height="8" fill={`url(#${id})`} />
    </svg>
  );
}

export default function ResultCard({ title, currency, people, grandTotal }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("");
  const date = new Date().toLocaleDateString();
  const label = title.trim() || "Split Bill";
  const money = (c: number) => `${currency ? currency + " " : ""}${fmt(c)}`;
  const imageOptions = {
    pixelRatio: 2,
    backgroundColor: EDGE_BG,
    skipFonts: true,
    style: { margin: "0" },
  };

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  }

  async function downloadImage() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, imageOptions);
      const a = document.createElement("a");
      a.download = `${label.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = dataUrl;
      a.click();
      flash("Image downloaded");
    } catch {
      flash("Could not create the image");
    }
  }

  async function copyImage() {
    if (!cardRef.current) return;
    try {
      const blob = await toBlob(cardRef.current, imageOptions);
      if (!blob) throw new Error();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      flash("Image copied");
    } catch {
      flash("This browser can't copy images. Use Download.");
    }
  }

  async function copyText() {
    const lines: string[] = [`🧾 ${label}`, date, ""];
    for (const p of people) {
      lines.push(`*${p.name}*`);
      p.lines.forEach((l) => lines.push(`  ${l.label}: ${money(l.cents)}`));
      lines.push(`  Tax & service: ${money(p.extra)}`);
      lines.push(`  Total: ${money(p.total)}`);
      lines.push("");
    }
    lines.push(`Grand total: ${money(grandTotal)}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      flash("Text copied");
    } catch {
      flash("Could not copy text");
    }
  }

  return (
    <div>
      <div className="paper-center">
      <div className="paper-wrap" ref={cardRef}>
        <Tear id="tear-top" flip />
        <div className="paper">
          <div className="r-title">{label}</div>
          <div className="r-date">{date}</div>

          {people.map((p) => (
            <div key={p.name}>
              <div className="r-dash" />
              <div className="r-name" style={{ "--c": p.color } as React.CSSProperties}>
                <span className="dot" />
                {p.name}
              </div>
              {p.lines.map((l, i) => (
                <div className="r-row" key={i}>
                  <span>{l.label}</span>
                  <span>{money(l.cents)}</span>
                </div>
              ))}
              <div className="r-row r-muted">
                <span>Tax & service</span>
                <span>{money(p.extra)}</span>
              </div>
              <div className="r-row r-sum">
                <span>{p.name} pays</span>
                <span>{money(p.total)}</span>
              </div>
            </div>
          ))}

          <div className="r-dash" />
          <div className="r-grand">
            <span>Grand total</span>
            <span>{money(grandTotal)}</span>
          </div>
        </div>
        <Tear id="tear-bottom" />
      </div>
      </div>

      <div className="actions">
        <button className="btn primary block" onClick={downloadImage}>Download image</button>
        <button className="btn secondary" onClick={copyImage}>Copy image</button>
        <button className="btn secondary" onClick={copyText}>Copy text</button>
      </div>
      {status && <div className="toast" role="status">{status}</div>}
    </div>
  );
}