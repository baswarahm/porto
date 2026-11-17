/* ==========================================================================
   VIM.TS — statusline, j/k section navigation and the `:` command line.
   Other modules plug in with key() and command().
   ========================================================================== */
import { $, reducedMotion } from './env';
import { pages } from '../data/profile';

type Cmd = () => string | void;
const commands = new Map<string, { run: Cmd; help: string }>();
const keys = new Map<string, { down: () => void; up?: () => void }>();

export const command = (name: string, help: string, run: Cmd) => commands.set(name, { run, help });
export const key = (k: string, down: () => void, up?: () => void) => keys.set(k, { down, up });
export const setMode = (m: string) => { $('#vMode')!.textContent = m; };

/** the blocks j/k step through on this page: the hero, then each top-level section */
const secEls = () => Array.from(document.querySelectorAll<HTMLElement>('#top, body > main > section, body > section'));

/** where this page sits in the page order: -1 is home */
const pageIndex = () => pages.findIndex(p => p.id === document.body.dataset.page);
export const goPage = (i: number) => {
  if (i < -1 || i >= pages.length) return;
  location.href = i === -1 ? '/' : pages[i].path;
};

function currentIndex(){
  const els = secEls();
  // the last section is often too short to reach the trigger line
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) return els.length - 1;
  let i = 0;
  els.forEach((s, k) => { if (s.getBoundingClientRect().top < innerHeight * .4) i = k; });
  return i;
}

export function goTo(i: number){
  const els = secEls();
  // stepping past either end of the page turns to the neighbouring page
  if (i < 0 || i >= els.length){ goPage(pageIndex() + (i < 0 ? -1 : 1)); return; }
  const el = els[Math.max(0, Math.min(els.length - 1, i))];
  el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

export function initVim(){
  const cmd = $('#cmdline')!, input = $<HTMLInputElement>('#cmdInput')!, out = $('#cmdOut')!;

  /* statusline: current file, scroll %, Penang clock */
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight || 1, p = scrollY / max;
    $('#vPct')!.textContent = p < .01 ? 'Top' : p > .99 ? 'Bot' : Math.round(p * 100) + '%';
    const id = secEls()[currentIndex()]?.id || document.body.dataset.page || 'top';
    $('#vFile')!.textContent = `~/baswara/${id}.md`;
  };
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking){ ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
  update();

  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false });
  const tick = () => {
    const t = fmt.format(new Date()), h = +t.slice(0, 2);
    const mood = h < 5 ? 'asleep' : h < 8 ? 'up early' : h < 17 ? 'in class' : h < 23 ? 'coding' : 'should sleep';
    $('#vClock')!.textContent = `penang ${t} · ${mood}`;
  };
  tick(); setInterval(tick, 30_000);

  /* command line */
  const open = () => { cmd.classList.add('open'); setMode('COMMAND'); input.value = ''; out.textContent = ''; input.focus(); };
  const close = () => { cmd.classList.remove('open'); setMode('NORMAL'); input.blur(); };
  $('#cmdBtn')?.addEventListener('click', open);

  command('help', 'show this', () => {
    const rows = [
      'j / k       next / previous section (turns the page at the ends)',
      'gg / G      top / bottom',
      ...[...keys.keys()].filter(k => k.length === 1 && !'jkgG:'.includes(k)).map(k => `${k.padEnd(12)}${keyHelp[k] ?? ''}`),
      '',
      ...[...commands].map(([n, c]) => `:${n.padEnd(11)}${c.help}`),
    ];
    return rows.join('\n');
  });
  command('q', 'close this', () => { close(); });
  command('home', 'go to the home page', () => { close(); goPage(-1); });
  pages.forEach((p, i) => command(p.label, `open ${p.label}`, () => { close(); goPage(i); }));

  $('#cmdForm')!.addEventListener('submit', e => {
    e.preventDefault();
    const name = input.value.trim().replace(/^:/, '');
    const c = commands.get(name);
    const res = c ? c.run() : `E492: not an editor command: ${name}, try :help`;
    if (cmd.classList.contains('open')){ out.textContent = res ?? ''; input.value = ''; }
  });

  /* keys */
  let lastG = 0;
  key('j', () => goTo(currentIndex() + 1));
  key('k', () => goTo(currentIndex() - 1));
  key('G', () => { const els = secEls(); els[els.length - 1]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); });
  key('g', () => { if (Date.now() - lastG < 400) goTo(0); lastG = Date.now(); });
  key(':', open);

  // also stand down while a modal dialog (project showcase) is open
  const typing = (e: KeyboardEvent) => (e.target as HTMLElement).matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey
    || !!document.querySelector('dialog[open]');
  addEventListener('keydown', e => {
    if (e.key === 'Escape'){ close(); return; }
    if (typing(e) || e.repeat) return;
    const k = keys.get(e.key);
    if (k){ e.preventDefault(); k.down(); }
  });
  addEventListener('keyup', e => { if (!typing(e)) keys.get(e.key)?.up?.(); });
}

/** one-line descriptions for :help, filled in by main.ts */
export const keyHelp: Record<string, string> = {};
