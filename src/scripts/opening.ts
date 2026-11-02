/* ==========================================================================
   OPENING.TS — a ~2.5 s profile intro before the page is revealed:
   each letter of the name decodes from its 8-bit binary, the rest of the
   name slides in, three facts flip past, then the screen splits open.
   Plays once per browser session (the inline script in Base.astro decides
   before first paint), skippable with any key or click. Everything that
   should start "on reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const byte = (ch: string) => ch.charCodeAt(0).toString(2).padStart(8, '0');
const randomByte = () => Array.from({ length: 8 }, () => (Math.random() < .5 ? '0' : '1')).join('');

let resolveOpened!: () => void;
export const opened = new Promise<void>(r => { resolveOpened = r; });

export function initOpening(){
  const root = document.documentElement, el = $('#opening');
  const nameEl = $('#opName'), sub = $('#opSub'), facts = $('#opFacts'), bar = $('#opBar');
  if (!el || !nameEl || !sub || !facts || !bar || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  let skipped = false;
  const skip = () => { skipped = true; };
  addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });
  const progress = (p: number) => { bar.style.width = `${Math.round(p * 100)}%`; };

  // one cell per letter: its binary on top, the letter underneath
  const letters = [...(nameEl.dataset.name ?? '')].map(ch => {
    const cell = document.createElement('span'); cell.className = 'l';
    const bin = document.createElement('span'); bin.className = 'bin'; bin.textContent = randomByte();
    const glyph = document.createElement('span'); glyph.className = 'ch'; glyph.textContent = ch;
    cell.append(bin, glyph);
    nameEl.append(cell);
    return { cell, bin, ch };
  });

  (async () => {
    // 1. bits flicker, then each letter locks to its real byte and snaps into place
    const flicker = setInterval(() => letters.forEach(l => { if (!l.cell.classList.contains('done')) l.bin.textContent = randomByte(); }), 50);
    await sleep(250);
    for (const [i, l] of letters.entries()){
      if (skipped) break;
      l.bin.textContent = byte(l.ch);
      await sleep(60);
      l.cell.classList.add('done');
      progress((i + 1) / letters.length * .45);
      await sleep(55);
    }
    clearInterval(flicker);

    // 2. the rest of the name
    if (!skipped){ sub.classList.add('show'); await sleep(320); }

    // 3. three facts flip past
    const items = Array.from(facts.children) as HTMLElement[];
    for (const [i, f] of items.entries()){
      if (skipped) break;
      items[i - 1]?.classList.replace('on', 'off');
      f.classList.add('on');
      progress(.45 + (i + 1) / items.length * .55);
      await sleep(i === items.length - 1 ? 520 : 400);
    }

    // 4. split open
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    removeEventListener('keydown', skip);
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 850);
  })();
}
