/* ==========================================================================
   OPENING.TS — a four-slide intro before the page is revealed:
   "Welcome to my portfolio" → my name with my silhouette behind it → USM
   → "Enjoy the visit." The track glides one slide left per beat; all the
   motion lives in opening.css. Then the panel lifts away.
   Plays once per browser session (Base.astro decides before first paint),
   skippable with any key or click. Everything that should start "on
   reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

/** how long each slide stays up, in ms */
const BEATS = [1150, 1350, 1350, 1150];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let resolveOpened!: () => void;
export const opened = new Promise<void>(r => { resolveOpened = r; });

export function initOpening(){
  const root = document.documentElement, el = $('#opening'), track = $('#opTrack');
  if (!el || !track || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  const slides = Array.from(track.children) as HTMLElement[];
  const dots = Array.from(el.querySelectorAll<HTMLElement>('#opDots i'));

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    removeEventListener('keydown', finish);
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 1200);
  };
  addEventListener('keydown', finish, { once: true });
  el.addEventListener('pointerdown', finish, { once: true });

  const show = (n: number) => {
    track.style.setProperty('--n', String(n));
    slides.forEach((s, i) => { s.classList.toggle('on', i === n); s.classList.toggle('past', i < n); });
    dots.forEach((d, i) => {
      d.classList.toggle('done', i < n);
      d.classList.toggle('on', i === n);
      d.style.setProperty('--d', `${BEATS[i]}ms`);
    });
  };

  (async () => {
    // wait a frame so the first slide's text rises from its starting position
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (let n = 0; n < slides.length && !done; n++){
      show(n);
      await sleep(BEATS[n]);
    }
    finish();
  })();
}
