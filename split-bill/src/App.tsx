import { useEffect, useState } from "react";
import { calculateSplit, toCents, itemShares } from "./lib/split";
import ResultCard from "./ResultCard";

type Item = { id: number; name: string; qty: number; price: number; people: string[] };
type Bill = {
  items: Item[];
  service_charge: number;
  tax: number;
  discount: number;
  rounding: number;
  total: number;
};
type Step = "review" | "assign" | "result";

const PALETTE = ["#2563eb", "#db2777", "#b45309", "#7c3aed", "#0e7490", "#4d7c0f", "#dc2626", "#475569"];
const STEP_LABELS = ["Scan", "Check", "Assign", "Share"];

const fmt = (cents: number) =>
  (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const initial = (n: string) => (n.trim()[0] ?? "?").toUpperCase();

function loadNames(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem("splitbill:names") ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function loadCurrency(): string {
  try {
    return localStorage.getItem("splitbill:currency") ?? "";
  } catch {
    return "";
  }
}

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const CameraIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0a7b5b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span className="avatar" style={{ "--c": color } as React.CSSProperties}>
      {initial(name)}
    </span>
  );
}

export default function App() {
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [step, setStep] = useState<Step>("review");
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState(loadCurrency);
  const [names, setNames] = useState<string[]>(loadNames);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("splitbill:names", JSON.stringify(names));
      localStorage.setItem("splitbill:currency", currency);
    } catch {
      /* storage can be unavailable; the app still works */
    }
  }, [names, currency]);

  const colorOf = (n: string) => PALETTE[Math.max(0, names.indexOf(n)) % PALETTE.length];

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    setError("");
    setBill(null);
    setStep("review");
    setPreview(URL.createObjectURL(file));

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");

      setBill({
        items: (data.items ?? []).map((it: any, i: number) => ({
          id: i,
          name: it.name ?? "",
          qty: it.qty ?? 1,
          price: it.price ?? 0,
          people: [],
        })),
        service_charge: data.service_charge ?? 0,
        tax: data.tax ?? 0,
        discount: data.discount ?? 0,
        rounding: data.rounding ?? 0,
        total: data.total ?? 0,
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  }

  function startOver() {
    setBill(null);
    setStep("review");
    setPreview("");
    setTitle("");
    setError("");
  }

  // ---------- review helpers ----------
  function updateItem(id: number, field: "name" | "qty" | "price", value: string) {
    if (!bill) return;
    setBill({
      ...bill,
      items: bill.items.map((it) =>
        it.id === id ? { ...it, [field]: field === "name" ? value : Number(value) } : it
      ),
    });
  }
  function removeItem(id: number) {
    if (!bill) return;
    setBill({ ...bill, items: bill.items.filter((it) => it.id !== id) });
  }
  function addItem() {
    if (!bill) return;
    const newId = Math.max(-1, ...bill.items.map((i) => i.id)) + 1;
    setBill({ ...bill, items: [...bill.items, { id: newId, name: "", qty: 1, price: 0, people: [] }] });
  }
  function updateField(field: keyof Omit<Bill, "items">, value: string) {
    if (!bill) return;
    setBill({ ...bill, [field]: Number(value) });
  }

  // ---------- people helpers ----------
  function addPerson() {
    const n = newName.trim();
    if (!n || names.includes(n)) return;
    setNames([...names, n]);
    setNewName("");
  }
  function removePerson(n: string) {
    setNames(names.filter((x) => x !== n));
    if (bill) {
      setBill({
        ...bill,
        items: bill.items.map((it) => ({ ...it, people: it.people.filter((p) => p !== n) })),
      });
    }
  }
  function togglePerson(itemId: number, n: string) {
    if (!bill) return;
    setBill({
      ...bill,
      items: bill.items.map((it) =>
        it.id === itemId
          ? { ...it, people: it.people.includes(n) ? it.people.filter((p) => p !== n) : [...it.people, n] }
          : it
      ),
    });
  }
  function toggleEveryone(itemId: number) {
    if (!bill) return;
    setBill({
      ...bill,
      items: bill.items.map((it) =>
        it.id === itemId ? { ...it, people: it.people.length === names.length ? [] : [...names] } : it
      ),
    });
  }
  function dropPerson(itemId: number, n: string) {
    if (!bill || !names.includes(n)) return;
    setBill({
      ...bill,
      items: bill.items.map((it) =>
        it.id === itemId && !it.people.includes(n) ? { ...it, people: [...it.people, n] } : it
      ),
    });
  }

  // ---------- calculations ----------
  let itemsSum = 0;
  let calculated = 0;
  let diff = 0;
  let extraCents = 0;
  if (bill) {
    itemsSum = bill.items.reduce((s, it) => s + toCents(it.price), 0);
    extraCents =
      toCents(bill.service_charge) + toCents(bill.tax) - toCents(bill.discount) + toCents(bill.rounding);
    calculated = itemsSum + extraCents;
    diff = calculated - toCents(bill.total);
  }

  const assignedCount = bill ? bill.items.filter((it) => it.people.length > 0).length : 0;
  const itemCount = bill ? bill.items.length : 0;
  const allAssigned = !!bill && itemCount > 0 && assignedCount === itemCount && names.length > 0;
  const results = bill && names.length > 0 ? calculateSplit(bill.items, extraCents, names) : [];
  const grandTotal = results.reduce((s, r) => s + r.total, 0);

  const stepIndex = !bill ? 0 : step === "review" ? 1 : step === "assign" ? 2 : 3;

  return (
    <>
      <header className="top">
        <h1 className="brand">Split Bill</h1>
        <div className="steps" aria-label="Progress">
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`step ${i < stepIndex ? "done" : ""} ${i === stepIndex ? "now" : ""}`}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              <i />
              {label}
            </div>
          ))}
        </div>
      </header>

      {/* ================= SCAN ================= */}
      {!bill && (
        <section>
          <h2 className="h">Scan your receipt</h2>
          <p className="sub">We read every item, plus tax and service charge.</p>

          {error && <div className="error" role="alert">{error}</div>}

          {loading ? (
            <>
              <div className="scan">
                {preview && <img src={preview} alt="Your receipt" />}
                <div className="scanline" />
              </div>
              <p className="scan-note">Reading your receipt…</p>
            </>
          ) : (
            <label className="drop">
              <CameraIcon />
              <strong>{error ? "Choose another photo" : "Take or choose a photo"}</strong>
              <span>Lay the receipt flat and keep all the text in the frame.</span>
              <input className="sr" type="file" accept="image/*" onChange={handleFile} />
            </label>
          )}
        </section>
      )}

      {/* ================= CHECK ================= */}
      {bill && step === "review" && (
        <section>
          <h2 className="h">Check the scan</h2>
          <p className="sub">Fix anything that looks off. The totals must match before you continue.</p>

          <div className="card">
            <div className="cols">
              <span>Item</span>
              <span>Qty</span>
              <span>Price</span>
              <span />
            </div>
            {bill.items.map((it) => (
              <div className="item-row" key={it.id}>
                <input className="in" value={it.name} placeholder="Item name" aria-label="Item name"
                  onChange={(e) => updateItem(it.id, "name", e.target.value)} />
                <input className="in num" type="number" inputMode="numeric" value={it.qty} aria-label="Quantity"
                  onChange={(e) => updateItem(it.id, "qty", e.target.value)} />
                <input className="in num" type="number" inputMode="decimal" step="0.01" value={it.price} aria-label="Price"
                  onChange={(e) => updateItem(it.id, "price", e.target.value)} />
                <button className="icon-btn" aria-label={`Remove ${it.name || "item"}`} onClick={() => removeItem(it.id)}>
                  <XIcon />
                </button>
              </div>
            ))}
            <button className="btn ghost small" onClick={addItem}>Add item</button>
          </div>

          <div className="card">
            {(
              [
                ["service_charge", "Service charge"],
                ["tax", "Tax"],
                ["discount", "Discount"],
                ["rounding", "Rounding"],
              ] as const
            ).map(([f, label]) => (
              <div className="kv" key={f}>
                <label htmlFor={f}>{label}</label>
                <input id={f} className="in num" type="number" inputMode="decimal" step="0.01"
                  value={bill[f]} onChange={(e) => updateField(f, e.target.value)} />
              </div>
            ))}
            <div className="kv total">
              <label htmlFor="total">Receipt total</label>
              <input id="total" className="in num" type="number" inputMode="decimal" step="0.01"
                value={bill.total} onChange={(e) => updateField("total", e.target.value)} />
            </div>
          </div>

          {diff === 0 ? (
            <div className="check ok" role="status">Items and charges match the receipt total.</div>
          ) : (
            <div className="check warn" role="status">
              <p>
                Items and charges add up to <strong>{fmt(calculated)}</strong>, but the receipt total says{" "}
                <strong>{fmt(toCents(bill.total))}</strong>. Check the prices above, or fix the total if it was misread.
              </p>
              <button className="btn secondary small" onClick={() => updateField("total", String(calculated / 100))}>
                Set total to {fmt(calculated)}
              </button>
            </div>
          )}

          <div className="bar">
            <div className="bar-in">
              <div className="bar-info">
                <div className="bar-label">Receipt total</div>
                <div className="bar-value">{fmt(toCents(bill.total))}</div>
              </div>
              <button className="btn primary" disabled={diff !== 0 || itemCount === 0} onClick={() => setStep("assign")}>
                Continue
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ================= ASSIGN ================= */}
      {bill && step === "assign" && (
        <section>
          <button className="btn ghost back" onClick={() => setStep("review")}>Back to check</button>
          <h2 className="h">Who ate what?</h2>
          <p className="sub">Add everyone at the table, then tap names under each dish.</p>

          <div className="card">
            <div className="people-form">
              <input className="in" value={newName} placeholder="Add a name" aria-label="Add a name"
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()} />
              <button className="btn primary" onClick={addPerson}>Add</button>
            </div>
            {names.length > 0 && (
              <div className="people">
                {names.map((n) => (
                  <span key={n} className="person" style={{ "--c": colorOf(n) } as React.CSSProperties}
                    draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", n)}>
                    <Avatar name={n} color={colorOf(n)} />
                    {n}
                    <button className="icon-btn" aria-label={`Remove ${n}`} onClick={() => removePerson(n)}>
                      <XIcon />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {names.length > 0 && (
              <p className="hint">On a computer you can also drag a name onto a dish. Names are saved for next time.</p>
            )}
          </div>

          {bill.items.map((it) => {
            const n = it.people.length;
            return (
              <div
                key={it.id}
                className={`dish ${n > 0 ? "done" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  dropPerson(it.id, e.dataTransfer.getData("text/plain"));
                }}
              >
                <div className="dish-head">
                  <span>{it.name || "Unnamed item"}{it.qty > 1 ? ` ×${it.qty}` : ""}</span>
                  <span>{fmt(toCents(it.price))}</span>
                </div>
                <div className="dish-sub">
                  {n === 0 && "Nobody assigned yet"}
                  {n === 1 && `Only ${it.people[0]}`}
                  {n > 1 && `Split ${n} ways · ${fmt(Math.round(toCents(it.price) / n))} each`}
                </div>
                {names.length > 0 && (
                  <div className="pills">
                    {names.map((p) => (
                      <button key={p} className={`pill ${it.people.includes(p) ? "on" : ""}`}
                        style={{ "--c": colorOf(p) } as React.CSSProperties}
                        aria-pressed={it.people.includes(p)} onClick={() => togglePerson(it.id, p)}>
                        <Avatar name={p} color={colorOf(p)} />
                        {p}
                      </button>
                    ))}
                    {names.length > 1 && (
                      <button className="pill all" onClick={() => toggleEveryone(it.id)}>
                        {n === names.length ? "Clear" : "Everyone"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {allAssigned && (
            <>
              <h2 className="h">Each person pays</h2>
              <div className="pay">
                {results.map((r) => (
                  <div className="pay-row" key={r.name}>
                    <Avatar name={r.name} color={colorOf(r.name)} />
                    <div className="grow">
                      <strong>{r.name}</strong>
                      <small>Items {fmt(r.subtotal)} + tax & service {fmt(r.extra)}</small>
                    </div>
                    <strong>{fmt(r.total)}</strong>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="bar">
            <div className="bar-in">
              <div className="bar-info">
                <div className="bar-label">
                  {names.length === 0 ? "Add at least one name" : `${assignedCount} of ${itemCount} dishes assigned`}
                </div>
                <div className="progress">
                  <span style={{ width: `${itemCount ? (assignedCount / itemCount) * 100 : 0}%` }} />
                </div>
              </div>
              <button className="btn primary" disabled={!allAssigned} onClick={() => setStep("result")}>
                See result
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ================= SHARE ================= */}
      {bill && step === "result" && (
        <section>
          <button className="btn ghost back" onClick={() => setStep("assign")}>Back to assign</button>
          <h2 className="h">Share the bill</h2>
          <p className="sub">Name it, pick a currency, then send the image to your group chat.</p>

          <div className="card">
            <div className="people-form">
              <input className="in" value={title} placeholder="Name this split, e.g. Dinner at Warung"
                aria-label="Split name" onChange={(e) => setTitle(e.target.value)} />
              <input className="in" style={{ width: 84 }} value={currency} placeholder="RM"
                aria-label="Currency" onChange={(e) => setCurrency(e.target.value)} />
            </div>
          </div>

          <ResultCard
            title={title}
            currency={currency}
            grandTotal={grandTotal}
            people={results.map((r) => ({
              name: r.name,
              color: colorOf(r.name),
              extra: r.extra,
              total: r.total,
              lines: bill.items
                .filter((it) => it.people.includes(r.name))
                .map((it) => {
                  let label = it.qty > 1 ? `${it.name} ×${it.qty}` : it.name;
                  if (it.people.length > 1) label += ` (1/${it.people.length})`;
                  return { label, cents: itemShares(it.price, it.people)[r.name] ?? 0 };
                }),
            }))}
          />

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button className="btn secondary" onClick={startOver}>Scan a new receipt</button>
          </div>
        </section>
      )}
    </>
  );
}