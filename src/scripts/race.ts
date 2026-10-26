/* ==========================================================================
   RACE.TS — bubble vs insertion vs merge sort on the same shuffled array.
   Each algorithm is a generator that yields the pair it is comparing, so
   one frame can advance every lane by the same number of comparisons.
   ========================================================================== */
import { $, cssVar, THEME_EVENT } from './env';

type Sorter = (a: number[]) => Generator<[number, number]>;

function* bubble(a: number[]): Generator<[number, number]> {
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < a.length - i - 1; j++){
      yield [j, j + 1];
      if (a[j] > a[j + 1]) [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
}
function* insertion(a: number[]): Generator<[number, number]> {
  for (let i = 1; i < a.length; i++)
    for (let j = i; j > 0; j--){
      yield [j - 1, j];
      if (a[j - 1] <= a[j]) break;
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
    }
}
function* merge(a: number[], lo = 0, hi = a.length): Generator<[number, number]> {
  if (hi - lo < 2) return;
  const mid = (lo + hi) >> 1;
  yield* merge(a, lo, mid);
  yield* merge(a, mid, hi);
  const left = a.slice(lo, mid), right = a.slice(mid, hi);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length){
    yield [lo + i, mid + j];
    a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
  }
  while (i < left.length) a[k++] = left[i++];
  while (j < right.length) a[k++] = right[j++];
}
const SORTERS: Record<string, Sorter> = { bubble, insertion, merge: a => merge(a) };
const PLACES = ['🥇 1st', '2nd', '3rd'];

export function initRace(){
  const race = $('#race');
  if (!race) return { run: () => {} };
  const lanes = Array.from(race.querySelectorAll<HTMLElement>('.race-lane'));
  const nInput = $<HTMLInputElement>('#raceN')!, speed = $<HTMLInputElement>('#raceSpeed')!;
  let base: number[] = [], raceId = 0, lastArrays: number[][] = [];

  function shuffle(n: number){
    base = Array.from({ length: n }, (_, i) => i + 1);
    for (let i = n - 1; i > 0; i--){ const j = (Math.random() * (i + 1)) | 0; [base[i], base[j]] = [base[j], base[i]]; }
  }

  function draw(lane: HTMLElement, arr: number[], hi?: [number, number] | null){
    const cv = lane.querySelector('canvas')!, c = cv.getContext('2d')!;
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(w * dpr)){ cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const ink = cssVar('--ink'), sig = cssVar('--signal'), bw = w / arr.length;
    arr.forEach((v, k) => {
      c.fillStyle = hi && (hi[0] === k || hi[1] === k) ? sig : ink;
      const bh = (v / arr.length) * (h - 12);
      c.fillRect(k * bw + .5, h - bh, Math.max(1, bw - 1), bh);
    });
  }

  function reset(){
    raceId++;
    lastArrays = lanes.map(() => base.slice());
    lanes.forEach((l, i) => {
      draw(l, lastArrays[i]);
      l.classList.remove('win');
      l.querySelector('.cmp')!.textContent = '0 comparisons';
      l.querySelector('.st')!.textContent = 'ready';
    });
  }

  function run(){
    reset();
    const id = raceId;
    let place = 0;
    const runs = lanes.map((lane, i) => {
      const arr = lastArrays[i];
      return { lane, arr, it: SORTERS[lane.dataset.algo!](arr), cmp: 0, done: false };
    });
    const step = () => {
      if (id !== raceId) return;
      const per = (+speed.value) ** 2;
      for (const r of runs){
        if (r.done) continue;
        let hi: [number, number] | null = null;
        for (let s = 0; s < per; s++){
          const n = r.it.next();
          if (n.done){ r.done = true; break; }
          r.cmp++; hi = n.value;
        }
        draw(r.lane, r.arr, r.done ? null : hi);
        r.lane.querySelector('.cmp')!.textContent = `${r.cmp} comparisons`;
        const st = r.lane.querySelector('.st')!;
        if (r.done){
          st.textContent = PLACES[place++];
          if (place === 1) r.lane.classList.add('win');
        } else st.textContent = 'sorting…';
      }
      if (runs.some(r => !r.done)) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  $('#raceGo')!.addEventListener('click', run);
  $('#raceShuffle')!.addEventListener('click', () => { shuffle(+nInput.value); reset(); });
  nInput.addEventListener('input', () => { $('#raceNOut')!.textContent = nInput.value; shuffle(+nInput.value); reset(); });
  const redraw = () => lanes.forEach((l, i) => draw(l, lastArrays[i]));
  addEventListener('resize', redraw);
  document.documentElement.addEventListener(THEME_EVENT, redraw);

  shuffle(+nInput.value);
  reset();
  // start once, the first time the race scrolls into view
  new IntersectionObserver((entries, obs) => {
    if (entries.some(e => e.isIntersecting)){ run(); obs.disconnect(); }
  }, { threshold: .5 }).observe(race);

  return { run };
}
