/* Hero: the name decrypts on reveal and re-scrambles a word on hover;
   the fact counters count up. */
import { reducedMotion } from './env';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz01{}<>/*#$%&';

function scramble(chars: HTMLElement[], duration = 520){
  if (reducedMotion) return;
  const finals = chars.map(c => c.dataset.ch!);
  const start = performance.now();
  const frame = (now: number) => {
    const t = (now - start) / duration;
    chars.forEach((c, i) => {
      const settle = i / chars.length;   // letters settle left to right
      if (t >= settle + .35){ c.textContent = finals[i]; c.classList.remove('hot'); }
      else { c.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0]; c.classList.add('hot'); }
    });
    if (t < 1.4) requestAnimationFrame(frame);
    else chars.forEach((c, i) => { c.textContent = finals[i]; c.classList.remove('hot'); });
  };
  requestAnimationFrame(frame);
}

export function initHeroName(){
  const words = Array.from(document.querySelectorAll<HTMLElement>('#heroName .word'));
  const groups = words.map(w => {
    const text = w.textContent ?? '';
    w.textContent = '';
    return [...text].map(ch => {
      const s = document.createElement('span');
      s.className = 'ch'; s.dataset.ch = ch; s.textContent = ch;
      w.appendChild(s);
      return s;
    });
  });
  words.forEach((w, i) => {
    let busy = false;
    w.addEventListener('pointerenter', () => {
      if (busy) return;
      busy = true; scramble(groups[i], 380);
      setTimeout(() => { busy = false; }, 600);
    });
  });
  return { decrypt: () => scramble(groups.flat(), 900) };
}

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
