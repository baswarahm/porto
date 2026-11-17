/* JOURNEY.TS — the git graph in Experience & education (Journey.astro).
   As you scroll the section a HEAD marker rides down main; every commit it
   passes lights up its branch, and the one it sits on is "checked out".
   The 3D rail in world.ts follows the same position (event "journeyhead"). */
export const JOURNEY_EVENT = 'journeyhead';
const DOT = 26;

export function initJourney(){
  const track = document.querySelector<HTMLElement>('.gg-track');
  if (!track) return;
  const rows = Array.from(track.querySelectorAll<HTMLElement>('.gg-row'));
  let raf = 0, last = -1;
  const update = () => {
    raf = 0;
    // layout height, not the tilted on-screen box
    const span = Math.max(1, track.offsetHeight - DOT * 2);
    const p = Math.min(1, Math.max(0, (innerHeight * .62 - track.getBoundingClientRect().top - DOT) / span));
    if (Math.abs(p - last) < .0005) return;
    last = p;
    track.style.setProperty('--p', p.toFixed(4));
    const head = DOT + p * span;
    let at: HTMLElement | null = null;
    rows.forEach(r => { const lit = r.offsetTop + DOT <= head + 2; r.classList.toggle('lit', lit); if (lit) at = r; });
    rows.forEach(r => r.classList.toggle('at', r === at));
    dispatchEvent(new CustomEvent(JOURNEY_EVENT, { detail: p }));
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { last = -1; queue(); });
  // opening a commit changes the heights
  track.addEventListener('toggle', () => { last = -1; queue(); }, true);
  update();
}
