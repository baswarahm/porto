/* ==========================================================================
   TIMEMACHINE.TS — drag a date and the whole site goes there.
   The rail runs from my first school year on the journey graph to the end
   of the degree. Picking a day re-computes, for that day:
     · degree progress (gauge, semester stairs, the rings under the network,
       the semester pillars)
     · where HEAD sits on the journey graph (which part of my life is
       "checked out")
     · the real sun, moon and stars over Penang at that date
   Everything listens for the "timetravel" event (detail: ms, or null for
   back to today). Nothing here is invented: the dates come from the same
   data the sections are built from.
   ========================================================================== */
import { degree } from '../data/courses';
import { graph } from '../data/journey-graph';
import { degreeProgress } from '../lib/degree';
import { reducedMotion, emit } from './env';

export const TIME_EVENT = 'timetravel';
const DAY = 86_400_000;
const startYear = (d: string) => +(d.match(/\d{4}/)?.[0] ?? 0);

/** where HEAD sits on the journey graph at a date (0 = first commit, 1 = HEAD) */
export function journeyHeadAt(ms: number){
  const y = new Date(ms).getFullYear() + new Date(ms).getMonth() / 12;
  let at = 0;
  graph.forEach((r, i) => { if (startYear(r.item.date) <= y) at = i; });
  return { frac: graph.length > 1 ? at / (graph.length - 1) : 1, row: graph[at] };
}

export function initTimeMachine(){
  const MIN = +new Date(`${startYear(graph[0].item.date)}-07-01`), MAX = +new Date(degree.end), TODAY = Date.now();
  const el = document.createElement('section');
  el.className = 'tm b-win'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Time machine');
  const pct = (ms: number) => ((ms - MIN) / (MAX - MIN) * 100).toFixed(2) + '%';
  const years: number[] = []; for (let y = new Date(MIN).getFullYear() + 1; y <= new Date(MAX).getFullYear(); y++) years.push(y);
  const marks = [
    ...graph.map(r => ({ ms: +new Date(`${startYear(r.item.date)}-07-01`), t: r.item.title, c: 'ev' })),
    { ms: +new Date(degree.start), t: 'USM starts', c: 'deg' }, { ms: MAX, t: 'graduation', c: 'deg' }, { ms: TODAY, t: 'today', c: 'now' },
  ];
  el.innerHTML = `
    <header class="tm-top"><p class="tm-k">time.machine · Penang</p><button type="button" class="key tm-x"><span>esc · close</span></button></header>
    <div class="tm-read" aria-live="polite"><b class="tm-date"></b><span class="tm-rel"></span></div>
    <p class="tm-what"></p>
    <div class="tm-rail">
      <div class="tm-years" aria-hidden="true">${years.map(y => `<span style="left:${pct(+new Date(`${y}-01-01`))}">${y}</span>`).join('')}</div>
      <div class="tm-marks" aria-hidden="true">${marks.map(m => `<i class="${m.c}" style="left:${pct(m.ms)}" title="${m.t}"></i>`).join('')}</div>
      <input class="tm-range" type="range" min="${MIN}" max="${MAX}" step="${DAY}" value="${TODAY}" aria-label="Travel to a date" aria-valuetext="">
    </div>
    <div class="tm-row">
      <button type="button" class="chip tm-play" aria-pressed="false">▶ play the years</button>
      <button type="button" class="chip tm-today">back to today</button>
      <span class="tm-hint">drag, or use the arrow keys (page up / down jumps a month)</span>
    </div>`;
  document.body.append(el);
  const range = el.querySelector<HTMLInputElement>('.tm-range')!, date = el.querySelector('.tm-date')!, rel = el.querySelector('.tm-rel')!, what = el.querySelector('.tm-what')!;
  const playBtn = el.querySelector<HTMLButtonElement>('.tm-play')!;
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const monsoon = (m: number) => m >= 10 || m <= 2 ? 'northeast monsoon season' : m >= 4 && m <= 8 ? 'southwest monsoon season' : 'between the monsoons';
  const describe = (ms: number) => {
    const d = new Date(ms), days = Math.round((ms - TODAY) / DAY);
    date.textContent = fmt.format(d);
    rel.textContent = Math.abs(days) < 1 ? 'today' : days > 0 ? `${days >= 365 ? `${(days / 365).toFixed(1)} years` : `${days} days`} from now` : `${-days >= 365 ? `${(-days / 365).toFixed(1)} years` : `${-days} days`} ago`;
    const start = +new Date(degree.start);
    let deg: string;
    if (ms < start) deg = `${Math.ceil((start - ms) / DAY)} days before USM`;
    else if (ms >= MAX) deg = 'degree done: graduated';
    else { const p = degreeProgress(ms); deg = `Year ${p.year}, semester ${p.sem} · ${(p.pct * 100).toFixed(1)}% of the degree`; }
    const head = journeyHeadAt(ms).row;
    what.textContent = `${deg} · HEAD at ${head.item.title} · ${monsoon(d.getMonth())}`;
    range.setAttribute('aria-valuetext', `${fmt.format(d)}, ${deg}`);
    el.style.setProperty('--at', pct(ms));
  };
  let raf = 0, pending = 0;
  const travel = (ms: number) => {
    describe(ms);
    const home = Math.abs(ms - TODAY) < DAY / 2;
    document.documentElement.classList.toggle('travelling', !home);
    // throttle the heavy re-compute to once a frame
    pending = ms;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; emit(TIME_EVENT, Math.abs(pending - TODAY) < DAY / 2 ? null : pending); });
  };
  range.addEventListener('input', () => travel(+range.value));

  let playing = 0;
  const stop = () => { cancelAnimationFrame(playing); playing = 0; playBtn.setAttribute('aria-pressed', 'false'); playBtn.textContent = '▶ play the years'; };
  playBtn.addEventListener('click', () => {
    if (playing) return stop();
    if (+range.value >= MAX - DAY) range.value = String(MIN);
    playBtn.setAttribute('aria-pressed', 'true'); playBtn.textContent = '❚❚ pause';
    let prev = performance.now();
    const step = (n: number) => {
      const dt = Math.min(.1, (n - prev) / 1000); prev = n;
      // a year every 2.5 seconds
      const v = Math.min(MAX, +range.value + dt * 365 * DAY / 2.5);
      range.value = String(v); travel(v);
      if (v >= MAX) return stop();
      playing = requestAnimationFrame(step);
    };
    if (reducedMotion){ range.value = String(MAX); travel(MAX); stop(); return; }
    playing = requestAnimationFrame(step);
  });
  el.querySelector('.tm-today')!.addEventListener('click', () => { stop(); range.value = String(TODAY); travel(TODAY); });

  const open = () => { el.hidden = false; describe(+range.value); setTimeout(() => range.focus({ preventScroll: true }), 20); };
  const close = () => { stop(); el.hidden = true; range.value = String(TODAY); travel(TODAY); };
  el.querySelector('.tm-x')!.addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !el.hidden){ e.stopPropagation(); close(); } }, true);
  addEventListener('timemachine', () => (el.hidden ? open() : close()));
  return { open, close };
}
