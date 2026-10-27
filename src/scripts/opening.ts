/* ==========================================================================
   OPENING.TS — a short fake C++ build before the page is revealed.
   Plays once per browser session (the inline script in Base.astro decides
   before first paint), skippable with any key or click. Everything that should start "on reveal" awaits
   `opened`.
   ========================================================================== */
import { $ } from './env';

/** one beat of the opening */
type Step =
  | { cmd: string }                                   // typed at a $ prompt
  | { out: string; wait?: number }                    // a printed line (HTML)
  | { bar: number };                                  // progress bar, 0–1

const ok = (s = 'ok') => `<span class="ok">${s}</span>`;
const pc = (s: string) => `<span class="pc">${s}</span>`;
const pad = (n: number, w = 3) => String(n).padStart(w, ' ');

const PARTS = ['hero', 'progress', 'courses', 'targets', 'projects', 'contact'];
const STEPS: Step[] = [
  { cmd: 'g++ -std=c++20 -O2 baswara.cpp -o portfolio' },
  ...PARTS.flatMap((p, i): Step[] => [
    { out: `${pc(`[${pad(Math.round(((i + 1) / (PARTS.length + 1)) * 100))}%]`)} compiling ${p}.cpp ${ok()}`, wait: 110 },
    { bar: (i + 1) / (PARTS.length + 1) },
  ]),
  { out: `${pc('[100%]')} linking portfolio ${ok()}` },
  { out: ok('build finished: 0 errors, 0 warnings, 1 first-year student'), wait: 200 },
  { bar: 1 },
  { cmd: './portfolio' },
];

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
  let skipped = false;
  const skip = () => { skipped = true; };
  addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });

  const lines: string[] = [];
  const render = (tail = '') => { log.innerHTML = lines.join('\n') + (lines.length ? '\n' : '') + tail + '<span class="caret"></span>'; };

  (async () => {
    for (const step of STEPS){
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
