export const toCents = (n: number) => Math.round((Number(n) || 0) * 100);

type SplitItem = { price: number; people: string[] };

export function calculateSplit(
  items: SplitItem[],
  extraCents: number, // service + tax - discount + rounding
  names: string[]
) {
  const subs: Record<string, number> = {};
  names.forEach((n) => (subs[n] = 0));

  // 1. Split each item's price between the people who ordered it
  for (const it of items) {
    const n = it.people.length;
    if (n === 0) continue;
    const cents = toCents(it.price);
    const base = Math.floor(cents / n);
    let remainder = cents - base * n;
    for (const p of it.people) {
      if (!(p in subs)) continue;
      subs[p] += base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
    }
  }

  // 2. Split service charge, tax, discount and rounding in proportion
  const totalSub = names.reduce((s, n) => s + subs[n], 0);
  const extras: Record<string, number> = {};
  let allocated = 0;
  names.forEach((n) => {
    extras[n] = totalSub > 0 ? Math.round((extraCents * subs[n]) / totalSub) : 0;
    allocated += extras[n];
  });

  // 3. Give any leftover cents to the person with the biggest share
  const leftover = extraCents - allocated;
  if (leftover !== 0 && names.length > 0) {
    const biggest = names.reduce((a, b) => (subs[b] > subs[a] ? b : a));
    extras[biggest] += leftover;
  }

  return names.map((n) => ({
    name: n,
    subtotal: subs[n],
    extra: extras[n],
    total: subs[n] + extras[n],
  }));
}

export function itemShares(price: number, people: string[]) {
  const shares: Record<string, number> = {};
  const n = people.length;
  if (n === 0) return shares;
  const cents = toCents(price);
  const base = Math.floor(cents / n);
  let remainder = cents - base * n;
  for (const p of people) {
    shares[p] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return shares;
}