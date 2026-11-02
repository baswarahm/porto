/* ==========================================================================
   OPENING.TS — a ~3 s profile intro before the page is revealed. Beside
   my silhouette (first made of flickering binary, then scanned solid),
   each letter of the name decodes from its 8-bit binary, the rest of the
   name slides in, two facts flip past, the name hands over to the USM
   crest ("studying at") while the silhouette glows, then the screen
   splits open.
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
  const sceneA = $('#opSceneA'), sceneB = $('#opSceneB'), figure = $('#opFigure'), bits = $('#opBits');
  if (!el || !nameEl || !sub || !facts || !bar || !sceneA || !sceneB || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  let skipped = false;
  const skip = () => { skipped = true; };
  addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });
  const progress = (p: number) => { bar.style.width = `${Math.round(p * 100)}%`; };

  // the silhouette's insides: a block of 0s and 1s, reshuffled every few frames
  let bitsTimer: ReturnType<typeof setInterval> | undefined;
  if (figure && bits){
    const cols = Math.ceil(figure.offsetWidth / 6) + 1, rows = Math.ceil(figure.offsetHeight / 10) + 1;
    const fill = () => {
      let out = '';
      for (let r = 0; r < rows; r++){
        for (let c = 0; c < cols; c++){
          const bit = Math.random() < .5 ? '0' : '1';
          out += Math.random() < .04 ? `<b>${bit}</b>` : bit;
        }
        out += '\n';
      }
      bits.innerHTML = out;
    };
    fill();
    bitsTimer = setInterval(fill, 90);
  }

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

    // the binary body is scanned into a solid figure
    figure?.classList.add('solid');
    setTimeout(() => clearInterval(bitsTimer), 950);

    // 2. the rest of the name
    if (!skipped){ sub.classList.add('show'); await sleep(320); }

    // 3. the facts flip past
    const items = Array.from(facts.children) as HTMLElement[];
    for (const [i, f] of items.entries()){
      if (skipped) break;
      items[i - 1]?.classList.replace('on', 'off');
      f.classList.add('on');
      progress(.45 + (i + 1) / items.length * .25);
      await sleep(420);
    }

    // 4. the name hands over to where I study
    if (!skipped){
      sceneA.classList.add('out');
      figure?.classList.add('glow');
      await sleep(180);
      sceneB.classList.add('in');
      progress(1);
      await sleep(1050);
    }

    // 5. split open
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    removeEventListener('keydown', skip);
    clearInterval(bitsTimer);
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 850);
  })();
}
