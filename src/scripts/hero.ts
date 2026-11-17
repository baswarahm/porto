/* The dossier's counters count up when the page opens. */
import { reducedMotion } from './env';

export function initCounters(){
  if (reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => {
    const to = +el.dataset.count!, start = performance.now();
    const frame = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      el.textContent = String(Math.round((1 - (1 - p) ** 3) * to));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
