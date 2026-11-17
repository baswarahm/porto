/* ==========================================================================
   TERMINAL.TS — "terminal takeover". Press ~ (or the >_ key in the HUD)
   and a 3D CRT terminal folds out over the network. Real commands:
     help · whoami · ls · cat <file> · open <section> · date · theme
     matrix · breach · sudo su · exit · clear
   `open` closes the terminal and flies the camera there (warp speed).
   ↑/↓ walk the history, Tab completes.
   ========================================================================== */
import { profile, socials, pages } from '../data/profile';
import { courses } from '../data/courses';
import { targets } from '../data/targets';
import { experience, education } from '../data/experience';
import { degreeProgress, textBar } from '../lib/degree';
import { isRoot, setRoot } from './root';

const FILES: Record<string, () => string[]> = {
  'progress.log': () => {
    const d = degreeProgress();
    return [`B.CS (Intelligent Computing) · Universiti Sains Malaysia`, `[${textBar(d.pct, 30)}] ${(d.pct * 100).toFixed(1)}%`, `year ${d.year}, semester ${d.sem}`];
  },
  'courses.db': () => courses.map(c => `${c.code.padEnd(8)}${c.name.padEnd(30)}${c.week ? `wk ${c.week}/${c.weeks}${c.status ? ' · ' + c.status : ''}` : 'ongoing'}`),
  'goals.txt': () => (['doing', 'next', 'done'] as const).flatMap(k => targets[k].map(t => `[${k === 'done' ? 'x' : k === 'doing' ? '~' : ' '}] ${t.title}  (${t.due})`)),
  'journey.git': () => [...education, ...experience].sort((a, b) => +(b.date.match(/\d{4}/)?.[0] ?? 0) - +(a.date.match(/\d{4}/)?.[0] ?? 0)).map(e => `${e.date.padEnd(12)}${e.title}`),
  'contact.vcf': () => [`email      ${profile.email}`, ...socials.map(s => `${s.label.padEnd(11)}${s.href}`)],
  'projects/': () => ['!permission denied: projects/ is locked while it is rebuilt. coming soon.'],
};
const SECTIONS: Record<string, string> = { top: 'top', home: 'top', network: 'network', root: 'root', ...Object.fromEntries(pages.map(p => [p.label, p.id])) };
const COMMANDS = ['help', 'whoami', 'ls', 'cat', 'open', 'cd', 'date', 'theme', 'matrix', 'breach', 'sudo', 'exit', 'clear'];

export function initTerminal(){
  const wrap = document.createElement('div');
  wrap.className = 'term-wrap'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', 'Terminal');
  wrap.innerHTML = `
    <div class="term">
      <header class="term-bar"><span>baswara.hm · tty1</span><button type="button" class="term-x" aria-label="Close terminal">esc</button></header>
      <div class="term-screen"><pre class="term-out" aria-live="polite"></pre>
        <form class="term-line"><label for="termIn">root@baswara.hm:~$</label><input id="termIn" autocomplete="off" spellcheck="false" autocapitalize="off"></form>
      </div>
    </div>`;
  document.body.append(wrap);
  const out = wrap.querySelector<HTMLElement>('.term-out')!, input = wrap.querySelector<HTMLInputElement>('input')!;
  const history: string[] = []; let hi = 0, greeted = false, lastFocus: HTMLElement | null = null;

  const print = (lines: string[], cls = '') => {
    for (const l of lines){
      const row = document.createElement('div');
      row.className = l.startsWith('!') ? 'err' : cls;
      row.textContent = l.replace(/^!/, '');
      out.append(row);
    }
    out.scrollTop = out.scrollHeight;
  };
  const open = () => {
    if (wrap.classList.contains('open')) return;
    lastFocus = document.activeElement as HTMLElement;
    wrap.classList.add('open');
    if (!greeted){
      greeted = true;
      print(['baswara.hm terminal · type "help" to see what you can do', ''], 'dim');
    }
    setTimeout(() => input.focus(), 60);
  };
  const close = () => { wrap.classList.remove('open'); lastFocus?.focus?.(); };
  const go = (id: string) => { close(); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' }), 280); };

  const run = (raw: string) => {
    const [cmd = '', ...args] = raw.trim().split(/\s+/);
    const arg = args.join(' ');
    switch (cmd){
      case '': return;
      case 'help': return print([
        'whoami            who I am', 'ls                list my files', 'cat <file>        read one, e.g. cat goals.txt',
        'open <section>    fly there: progress, now, goals, projects, journey, contact', 'date              the time in Penang',
        'theme             switch day / night', 'matrix            binary rain on / off', 'breach            jump to the network',
        'sudo su           ...', 'clear · exit']);
      case 'whoami': return print([profile.name, 'first-year CS student · Intelligent Computing · Universiti Sains Malaysia', 'from Solo, Indonesia · now in Penang, Malaysia']);
      case 'ls': return print([Object.keys(FILES).map(f => f === 'projects/' ? `${f} (locked)` : f).join('   ')]);
      case 'cat': {
        const f = FILES[arg] ?? FILES[Object.keys(FILES).find(k => k.startsWith(arg)) ?? ''];
        return print(f ? f() : [`!cat: ${arg || '(nothing)'}: no such file. try "ls"`]);
      }
      case 'open': case 'cd': {
        const id = SECTIONS[arg.replace(/^\/|\/$/g, '')];
        if (!id) return print([`!open: unknown section "${arg}". try: ${Object.keys(SECTIONS).join(', ')}`]);
        print([`flying to /${arg} ...`], 'ok'); return go(id);
      }
      case 'breach': print(['breaching the firewall ...'], 'ok'); return go('network');
      case 'date': return print([new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'full', timeStyle: 'short' }).format(new Date()) + ' · Penang']);
      case 'theme': document.querySelector<HTMLElement>('[data-theme-toggle]')?.click(); return print(['theme switched'], 'ok');
      case 'matrix': document.getElementById('bgBtn')?.click(); return print(['binary rain toggled'], 'ok');
      case 'sudo':
        if (arg === 'su' || arg === '-i'){ setRoot(true); return print(['!ROOT ACCESS GRANTED · red alert · hidden nodes exposed', 'type "exit" to stand down']); }
        return print(['!nice try. sudo what? (hint: sudo su)']);
      case 'exit':
        if (isRoot()){ setRoot(false); return print(['standing down. back to normal.'], 'ok'); }
        return close();
      case 'clear': out.textContent = ''; return;
      default: return print([`!${cmd}: command not found. type "help"`]);
    }
  };

  wrap.querySelector('form')!.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value; input.value = '';
    print([`root@baswara.hm:~$ ${v}`], 'cmd');
    if (v.trim()){ history.push(v); hi = history.length; }
    run(v);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp'){ e.preventDefault(); hi = Math.max(0, hi - 1); input.value = history[hi] ?? ''; }
    else if (e.key === 'ArrowDown'){ e.preventDefault(); hi = Math.min(history.length, hi + 1); input.value = history[hi] ?? ''; }
    else if (e.key === 'Tab'){
      e.preventDefault();
      const parts = input.value.split(' '), last = parts.pop() ?? '';
      const pool = parts.length ? [...Object.keys(FILES), ...Object.keys(SECTIONS), 'su'] : COMMANDS;
      const hit = pool.find(p => p.startsWith(last));
      if (hit) input.value = [...parts, hit].join(' ') + (parts.length ? '' : ' ');
    }
    else if (e.key === 'Escape'){ e.stopPropagation(); close(); }
  });
  wrap.querySelector('.term-x')!.addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  document.querySelectorAll('[data-term]').forEach(b => b.addEventListener('click', open));
  addEventListener('keydown', e => {
    if ((e.key === '~' || e.key === '`') && !(e.target as HTMLElement).matches?.('input, textarea')){ e.preventDefault(); open(); }
  });
  return { open };
}
