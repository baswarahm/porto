/* ==========================================================================
   OPENING.TS — a short fake compile run before the page is revealed.
   Plays once per browser session (the inline script in Base.astro decides
   before first paint), skippable with any key or click. Everything that
   should start "on reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

const CMD = '$ g++ -std=c++20 -O2 baswara.cpp -o portfolio';
const STEPS = ['hero', 'progress', 'courses', 'targets', 'projects', 'contact'];
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

  const write = (html: string) => { log.innerHTML = html + '<span class="caret"></span>'; };
  let out = '';

  (async () => {
    for (let i = 1; i <= CMD.length && !skipped; i++){
      write(`<span class="prompt">${CMD.slice(0, 1)}</span>${CMD.slice(1, i)}`);
      await sleep(14);
    }
    out = `<span class="prompt">$</span>${CMD.slice(1)}\n`;
    for (let i = 0; i < STEPS.length && !skipped; i++){
      const pct = String(Math.round(((i + 1) / (STEPS.length + 1)) * 100)).padStart(3, ' ');
      out += `<span class="pc">[${pct}%]</span> compiling ${STEPS[i]}.cpp <span class="ok">ok</span>\n`;
      write(out);
      bar.style.width = ((i + 1) / (STEPS.length + 1)) * 100 + '%';
      await sleep(110);
    }
    if (!skipped){
      out += `<span class="pc">[100%]</span> linking portfolio <span class="ok">ok</span>\n<span class="ok">build finished: 0 errors, 0 warnings, 1 first-year student</span>\n<span class="prompt">$</span> ./portfolio`;
      write(out);
      bar.style.width = '100%';
      await sleep(260);
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
