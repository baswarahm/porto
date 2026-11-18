/* ==========================================================================
   PROGRESS.TS — degree track, git log and the links between the git log
   and the course cards.
   ========================================================================== */
import { $, reducedMotion } from './env';
import { degreeProgress, textBar } from '../lib/degree';
import { curriculum } from '../data/courses';
import { TIME_EVENT } from './timemachine';

/* ---- degree track: live values + clickable semesters ---------------------- */
// renders for today, and again for any day the time machine travels to
export function initProgress(map: { open: (code: string) => void; focusSem: (i: number) => void }){
  let p = degreeProgress();
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('#semTrack .sem'));
  const detail = $('#semDetail');
  const gauge = $('.gauge');
  const pctEl = gauge?.querySelector<HTMLElement>('[data-gauge-pct]');

  // a semester shows its courses; each one jumps to its tile on the course map
  const select = (btn: HTMLButtonElement, focusMap = true) => {
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
    if (focusMap) map.focusSem(i);
  };
  buttons.forEach(el => el.addEventListener('click', () => select(el)));

  const render = (ms?: number, first = false) => {
    p = degreeProgress(ms);
    const setState = (el: Element, st: string) => { el.classList.remove('done', 'now', 'future'); el.classList.add(st); };
    buttons.forEach((el, i) => {
      const s = p.semesters[i]; setState(el, s.state);
      el.querySelector('.lbl')!.textContent = s.state === 'now' ? '● now' : `sem ${i + 1}`;
      el.querySelector<HTMLElement>('.fill')!.style.width = (s.fill * 100).toFixed(1) + '%';
    });
    if (buttons[p.current]) select(buttons[p.current], first);
    // the gauge: segment states, fill lengths, the glints, the ticks and the bead on the end of this semester
    gauge?.querySelectorAll<SVGElement>('.seg').forEach((c, i) => setState(c, p.semesters[i].state));
    gauge?.querySelectorAll<SVGElement>('.tick').forEach((c, i) => setState(c, p.semesters[i].state));
    gauge?.querySelectorAll<SVGElement>('.seg-fill, .seg-glint').forEach(c => {
      const s = p.semesters[Number(c.dataset.seg ?? c.dataset.glint)], len = 41 * s.fill;
      c.style.setProperty('--len', len.toFixed(2));
      if (c.classList.contains('seg-glint')) c.style.display = len > 2 ? '' : 'none';
    });
    const tip = gauge?.querySelector<SVGGElement>('.seg-tip');
    if (tip){
      const s = p.semesters[p.current], a = (p.current * 45 + 2 + 41 * s.fill) * Math.PI / 180;
      tip.querySelectorAll('circle').forEach(c => { c.setAttribute('cx', (100 + 82 * Math.cos(a)).toFixed(2)); c.setAttribute('cy', (100 + 82 * Math.sin(a)).toFixed(2)); });
      tip.style.display = p.pct >= 1 ? 'none' : '';
    }
    const em = gauge?.querySelector('figcaption em'); if (em) em.textContent = p.semesters[p.current].label;
    const pct = (p.pct * 100).toFixed(1) + '%';
    // always today's (or the time machine's) value, never the build-time one; the replay below only animates it
    if (pctEl){ pctEl.textContent = pct; pctEl.dataset.gaugePct = (p.pct * 100).toFixed(1); }
    const bar = $('[data-degree-bar]');
    if (bar) bar.innerHTML = `<span class="mono">${textBar(p.pct)}</span> <b>${pct}</b>`;
    const fact = $('[data-degree-pct]');
    if (fact) fact.textContent = `${pct} done`;
    const sem = $('[data-sem-label]');
    if (sem) sem.textContent = `year ${p.year}, semester ${p.sem}`;
    document.querySelectorAll<HTMLElement>('[data-degree-fill]').forEach(el => { el.style.width = pct; });
    document.querySelectorAll<HTMLElement>('[data-degree-pct-short]').forEach(el => { el.textContent = pct; });
  };
  render(undefined, true);
  addEventListener(TIME_EVENT, e => render((e as CustomEvent<number | null>).detail ?? undefined));

  // pointing at a semester lights its segment here and its ring in the 3D world
  const hot = (i: number) => {
    gauge?.querySelectorAll<SVGElement>('[data-seg]').forEach(c => c.classList.toggle('hot', Number(c.dataset.seg) === i));
    dispatchEvent(new CustomEvent('semfocus', { detail: i }));
  };
  buttons.forEach((el, i) => {
    el.addEventListener('pointerenter', () => hot(i)); el.addEventListener('pointerleave', () => hot(-1));
    el.addEventListener('focus', () => hot(i)); el.addEventListener('blur', () => hot(-1));
  });
  // ...and the rings replay their fill, with the percentage counting up alongside.
  // The real value is the resting state: the page always says the true percentage (to a reader, a
  // full-page screenshot, a crawler, a tab that never scrolls). The replay only starts from zero for a
  // moment, just before the gauge scrolls into view, and always lands back on the real number.
  if (gauge && pctEl && !reducedMotion){
    const replay = () => {
      const goal = p.pct * 100;   // today, or the day the time machine is on
      gauge.classList.add('replay'); void gauge.getBoundingClientRect(); gauge.classList.remove('replay');
      const t0 = performance.now();
      const step = (n: number) => {
        const u = Math.min(1, Math.max(0, (n - t0 - 300) / 1500)), e = 1 - Math.pow(1 - u, 4);
        pctEl.textContent = (goal * e).toFixed(1) + '%';
        if (u < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      setTimeout(() => { pctEl.textContent = goal.toFixed(1) + '%'; }, 2200);   // even if frames stall
    };
    let played = false;
    new IntersectionObserver(es => {
      if (played || !es.some(e => e.isIntersecting)) return;
      // only when you scroll to it: a gauge already on screen at load just stays put
      if (performance.now() > 600) { played = true; replay(); }
    }, { rootMargin: '0px 0px 8% 0px' }).observe(gauge);
  }
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
    if (btn) filterPaged(btn.dataset.f!);
  });

  // dim every other branch while a course card is hovered
  const focus = (lane: string | null) => {
    log.classList.toggle('focus', !!lane);
    rows.forEach(r => r.classList.toggle('lit', !!lane && r.dataset.b === lane));
  };
  // newest 5 commits first; "load more" shows 5 older at a time (a course filter shows all of its commits)
  const PAGE = 5, commits = log.querySelectorAll('button.gl-row').length;
  let shown = PAGE, filtered = false;
  const more = document.createElement('button');
  more.type = 'button'; more.className = 'key gl-more';
  log.after(more);
  const paginate = () => {
    let n = 0;
    log.querySelectorAll<HTMLElement>('.gl-row, .gl-diff').forEach(r => {
      if (r.matches('button.gl-row')) n++;
      r.classList.toggle('more', !filtered && n > shown);
    });
    const left = commits - shown;
    more.hidden = filtered || left <= 0;
    more.innerHTML = `<span>load more · ${Math.min(PAGE, left)} older (${left} left)</span>`;
  };
  more.addEventListener('click', () => { shown += PAGE; paginate(); });
  paginate();
  const filterAll = filter;
  const filterPaged = (f: string) => { filtered = f !== 'all'; filterAll(f); paginate(); };

  // arriving from a course card on /now/ (?lane=…): show only that course
  const lane = new URLSearchParams(location.search).get('lane');
  if (lane && tools?.querySelector(`[data-f="${CSS.escape(lane)}"]`)) filterPaged(lane);
  return { filter: filterPaged, focus };
}

/* ---- course cards talk to the git log ------------------------------------- */
export function initCourses(git: ReturnType<typeof initGitLog>){
  document.querySelectorAll<HTMLElement>('.course').forEach(card => {
    const lane = card.dataset.lane!;
    card.addEventListener('pointerenter', () => git.focus(lane));
    card.addEventListener('pointerleave', () => git.focus(null));
    card.querySelector('.go')?.addEventListener('click', e => {
      if (!$('#gitlog')) return;           // on its own page: follow the link to /progress/
      e.preventDefault();
      git.filter(lane);
      $('#gitlog')!.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    });
  });
}
