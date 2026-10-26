/* ==========================================================================
   PROGRESS.TS — degree track, git log and the links between the git log
   and the course cards.
   ========================================================================== */
import { $, reducedMotion } from './env';
import { degreeProgress, textBar } from '../lib/degree';
import { curriculum } from '../data/courses';

/* ---- degree track: live values + clickable semesters ---------------------- */
export function initProgress(map: { open: (code: string) => void; focusSem: (i: number) => void }){
  const p = degreeProgress();
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#semTrack .sem'));
  const detail = $('#semDetail');

  // a semester shows its courses; each one jumps to its tile on the course map
  const select = (btn: HTMLButtonElement) => {
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    const i = +btn.dataset.sem!, s = p.semesters[i];
    const state = s.state === 'done' ? 'done' : s.state === 'now' ? `in progress · ${Math.round(s.fill * 100)}%` : 'planned';
    if (!detail) return;
    detail.innerHTML = `<b>${s.label} · ${state}</b><span></span>`;
    const list = detail.querySelector('span')!;
    for (const c of curriculum[i]){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip-link'; b.textContent = c.code; b.title = c.name;
      b.addEventListener('click', () => map.open(c.code));
      list.append(b);
    }
    map.focusSem(i);
  };

  buttons.forEach((el, i) => {
    const s = p.semesters[i];
    el.classList.remove('done', 'now', 'future');
    el.classList.add(s.state);
    el.querySelector('.lbl')!.textContent = s.state === 'now' ? '● now' : `sem ${i + 1}`;
    el.querySelector<HTMLElement>('.fill')!.style.width = (s.fill * 100).toFixed(1) + '%';
    el.addEventListener('click', () => select(el));
  });
  if (buttons[p.current]) select(buttons[p.current]);

  const pct = (p.pct * 100).toFixed(1) + '%';
  const bar = $('[data-degree-bar]');
  if (bar) bar.innerHTML = `<span class="mono">${textBar(p.pct)}</span> <b>${pct}</b>`;
  const fact = $('[data-degree-pct]');
  if (fact) fact.textContent = `${pct} done`;
  const sem = $('[data-sem-label]');
  if (sem) sem.textContent = `year ${p.year}, semester ${p.sem}`;
  document.querySelectorAll<HTMLElement>('[data-degree-fill]').forEach(el => { el.style.width = pct; });
  document.querySelectorAll<HTMLElement>('[data-degree-pct-short]').forEach(el => { el.textContent = pct; });
}

/* ---- git log -------------------------------------------------------------- */
export function initGitLog(){
  const log = $('#gitlog'), tools = $('#glTools');
  if (!log) return { filter: (_f: string) => {}, focus: (_l: string | null) => {} };
  const rows = Array.from(log.querySelectorAll<HTMLElement>('.gl-row'));

  // typed in row by row, the first time it scrolls into view
  if (reducedMotion) log.classList.remove('typing');
  else new IntersectionObserver((entries, obs) => {
    if (!entries.some(e => e.isIntersecting)) return;
    obs.disconnect();
    rows.forEach((r, i) => setTimeout(() => r.classList.add('shown'), i * 70));
    setTimeout(() => log.classList.remove('typing'), rows.length * 70 + 200);
  }, { threshold: .3 }).observe(log);

  // open a commit to see its diff
  log.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button.gl-row');
    if (!btn) return;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    document.getElementById(btn.getAttribute('aria-controls')!)?.classList.toggle('open', open);
  });

  const filter = (f: string) => {
    tools?.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String((c as HTMLElement).dataset.f === f)));
    log.querySelectorAll<HTMLElement>('.gl-row, .gl-diff').forEach(r => {
      r.classList.toggle('hide', f !== 'all' && r.dataset.b !== f && r.dataset.b !== '0');
    });
  };
  tools?.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chip');
    if (btn) filter(btn.dataset.f!);
  });

  // dim every other branch while a course card is hovered
  const focus = (lane: string | null) => {
    log.classList.toggle('focus', !!lane);
    rows.forEach(r => r.classList.toggle('lit', !!lane && r.dataset.b === lane));
  };
  return { filter, focus };
}

/* ---- course cards talk to the git log ------------------------------------- */
export function initCourses(git: ReturnType<typeof initGitLog>){
  document.querySelectorAll<HTMLElement>('.course').forEach(card => {
    const lane = card.dataset.lane!;
    card.addEventListener('pointerenter', () => git.focus(lane));
    card.addEventListener('pointerleave', () => git.focus(null));
    card.querySelector('.go')?.addEventListener('click', () => {
      git.filter(lane);
      $('#gitlog')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  });
}
