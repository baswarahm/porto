/* ==========================================================================
   VIM.TS — statusline, j/k section navigation and the `:` command line.
   Other modules plug in with key() and command().
   ========================================================================== */
import { $, reducedMotion } from './env';
import { sections } from '../data/profile';

type Cmd = () => string | void;
const commands = new Map<string, { run: Cmd; help: string }>();
const keys = new Map<string, { down: () => void; up?: () => void }>();

export const command = (name: string, help: string, run: Cmd) => commands.set(name, { run, help });
export const key = (k: string, down: () => void, up?: () => void) => keys.set(k, { down, up });
export const setMode = (m: string) => { $('#vMode')!.textContent = m; };

const secEls = () => sections.map(s => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);

function currentIndex(){
  let i = 0;
  secEls().forEach((s, k) => { if (s.getBoundingClientRect().top < innerHeight * .4) i = k; });
  return i;
}

export function goTo(i: number){
  const els = secEls();
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
    $('#vFile')!.textContent = `~/baswara/${sections[currentIndex()].id}.md`;
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
      'j / k       next / previous section',
      'gg / G      top / bottom',
      ...[...keys.keys()].filter(k => k.length === 1 && !'jkgG:'.includes(k)).map(k => `${k.padEnd(12)}${keyHelp[k] ?? ''}`),
      '',
      ...[...commands].map(([n, c]) => `:${n.padEnd(11)}${c.help}`),
    ];
    return rows.join('\n');
  });
  command('q', 'close this', () => { close(); });
  sections.forEach((s, i) => command(s.id, `jump to ${s.label}`, () => { close(); goTo(i); }));

  $('#cmdForm')!.addEventListener('submit', e => {
    e.preventDefault();
    const name = input.value.trim().replace(/^:/, '');
    const c = commands.get(name);
    const res = c ? c.run() : `E492: not an editor command: ${name} — try :help`;
    if (cmd.classList.contains('open')){ out.textContent = res ?? ''; input.value = ''; }
  });

  /* keys */
  let lastG = 0;
  key('j', () => goTo(currentIndex() + 1));
  key('k', () => goTo(currentIndex() - 1));
  key('G', () => goTo(sections.length - 1));
  key('g', () => { if (Date.now() - lastG < 400) goTo(0); lastG = Date.now(); });
  key(':', open);

  const typing = (e: KeyboardEvent) => (e.target as HTMLElement).matches?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey;
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
