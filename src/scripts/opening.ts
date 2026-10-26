/* ==========================================================================
   OPENING.TS — a short fake terminal run before the page is revealed.
   Four styles; each visit picks one it didn't play last time (or force one
   with ?opening=compile|boot|git|train). Plays once per browser session
   (the inline script in Base.astro decides before first paint), skippable
   with any key or click. Everything that should start "on reveal" awaits
   `opened`.
   ========================================================================== */
import { $ } from './env';
import { courses } from '../data/courses';

/** one beat of an opening */
type Step =
  | { cmd: string }                                   // typed at a $ prompt
  | { out: string; wait?: number }                    // a printed line (HTML)
  | { count: (n: number) => string; to: number; ms: number }   // a line that counts up in place
  | { bar: number };                                  // progress bar, 0–1

interface Opening { id: string; label: string; steps: () => Step[] }

const ok = (s = 'ok') => `<span class="ok">${s}</span>`;
const pc = (s: string) => `<span class="pc">${s}</span>`;
const pad = (n: number, w = 3) => String(n).padStart(w, ' ');
const codes = courses.filter(c => c.code !== 'SELF').map(c => c.code);

const OPENINGS: Opening[] = [
  {
    id: 'compile', label: 'g++ build',
    steps: () => {
      const parts = ['hero', 'progress', 'courses', 'targets', 'projects', 'contact'];
      return [
        { cmd: 'g++ -std=c++20 -O2 baswara.cpp -o portfolio' },
        ...parts.flatMap((p, i): Step[] => [
          { out: `${pc(`[${pad(Math.round(((i + 1) / (parts.length + 1)) * 100))}%]`)} compiling ${p}.cpp ${ok()}`, wait: 110 },
          { bar: (i + 1) / (parts.length + 1) },
        ]),
        { out: `${pc('[100%]')} linking portfolio ${ok()}` },
        { out: ok('build finished: 0 errors, 0 warnings, 1 first-year student'), wait: 200 },
        { bar: 1 },
        { cmd: './portfolio' },
      ];
    },
  },
  {
    id: 'boot', label: 'bios boot',
    steps: () => [
      { out: 'BASWARA BIOS v1.0 · (c) 2026 Solo → Penang', wait: 160 },
      { count: n => `memory test: ${n * 1024}K ${n === 16 ? ok() : ''}`, to: 16, ms: 420 },
      { bar: .3 },
      { out: `detecting cpu ........ 1x first-year student ${ok()}`, wait: 130 },
      { out: `detecting courses .... ${codes.join(' ')} ${ok()}`, wait: 130 },
      { out: `detecting caffeine ... ${pc('low')}`, wait: 160 },
      { bar: .7 },
      { out: 'boot device: /dev/portfolio', wait: 140 },
      { out: ok('loading kernel... done'), wait: 160 },
      { bar: 1 },
      { cmd: 'login: guest' },
    ],
  },
  {
    id: 'git', label: 'git clone',
    steps: () => [
      { cmd: 'git clone https://github.com/baswarahm/portfolio.git' },
      { out: "Cloning into 'portfolio'...", wait: 140 },
      { count: n => `Receiving objects: ${pad(n)}% (${Math.round(n * 2.48)}/248)${n === 100 ? ', done.' : ''}`, to: 100, ms: 650 },
      { bar: .6 },
      { count: n => `Resolving deltas: ${pad(n)}% (${Math.round(n * .91)}/91)${n === 100 ? ', done.' : ''}`, to: 100, ms: 320 },
      { bar: .8 },
      { cmd: 'cd portfolio && npm run dev' },
      { out: `${ok('ready')} in 312 ms · local: ${pc('http://baswarahm.my.id')}`, wait: 150 },
      { bar: 1 },
    ],
  },
  {
    id: 'train', label: 'model training',
    steps: () => {
      const epochs = [[0.912, 0.38], [0.541, 0.62], [0.276, 0.81], [0.118, 0.93], [0.041, 0.99]];
      return [
        { cmd: 'python train.py --model baswara --epochs 5' },
        { out: 'loading dataset: 4 courses, 10 commits, 1 sunrise hike', wait: 160 },
        ...epochs.flatMap(([loss, acc], i): Step[] => [
          { out: `epoch ${i + 1}/5  loss ${pc(loss.toFixed(3))}  acc ${(acc * 100).toFixed(0)}% ${i === 4 ? ok('✓') : ''}`, wait: 140 },
          { bar: (i + 1) / 6 },
        ]),
        { out: ok('saved: baswara.pt (first-year, still learning)'), wait: 180 },
        { bar: 1 },
        { cmd: 'python serve.py' },
      ];
    },
  },
];

const LAST_KEY = 'openingLast';
function pick(): Opening {
  const forced = new URLSearchParams(location.search).get('opening');
  const byId = OPENINGS.find(o => o.id === forced);
  if (byId) return byId;
  let last = '';
  try { last = localStorage.getItem(LAST_KEY) ?? ''; } catch { /* non-fatal */ }
  const pool = OPENINGS.filter(o => o.id !== last);
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  try { localStorage.setItem(LAST_KEY, chosen.id); } catch { /* non-fatal */ }
  return chosen;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let resolveOpened!: () => void;
export const opened = new Promise<void>(r => { resolveOpened = r; });

export function initOpening(){
  const root = document.documentElement, el = $('#opening'), log = $('#opLog'), bar = $('#opBar');
  if (!el || !log || !bar || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  const opening = pick();
  const label = $('#opStyle');
  if (label) label.textContent = `opening ${OPENINGS.indexOf(opening) + 1}/${OPENINGS.length} · ${opening.label}`;

  let skipped = false;
  const skip = () => { skipped = true; };
  addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });

  const lines: string[] = [];
  const render = (tail = '') => { log.innerHTML = lines.join('\n') + (lines.length ? '\n' : '') + tail + '<span class="caret"></span>'; };

  (async () => {
    for (const step of opening.steps()){
      if (skipped) break;
      if ('cmd' in step){
        for (let i = 1; i <= step.cmd.length && !skipped; i++){
          render(`<span class="prompt">$</span> ${step.cmd.slice(0, i)}`);
          await sleep(13);
        }
        lines.push(`<span class="prompt">$</span> ${step.cmd}`);
        render();
        await sleep(120);
      } else if ('out' in step){
        lines.push(step.out);
        render();
        await sleep(step.wait ?? 90);
      } else if ('count' in step){
        const t0 = performance.now();
        let n = 0;
        while (n < step.to && !skipped){
          n = Math.min(step.to, Math.round(((performance.now() - t0) / step.ms) * step.to));
          render(step.count(n));
          await sleep(16);
        }
        lines.push(step.count(step.to));
        render();
      } else {
        bar.style.width = step.bar * 100 + '%';
      }
    }
    if (!skipped){
      $('#opName')?.classList.add('show');
      await sleep(650);
    }
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    removeEventListener('keydown', skip);
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 850);
  })();
}
