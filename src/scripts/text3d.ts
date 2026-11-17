/* 3D type: every .t3d heading is split into letters that flip up out of
   the page one after another when it scrolls into view, and ripple in a
   wave when hovered (one.css does the motion). Screen readers get the
   plain text through aria-label. */
import { reducedMotion } from './env';

export function initText3d(){
  const els = Array.from(document.querySelectorAll<HTMLElement>('.t3d'));
  els.forEach(el => {
    const text = el.textContent ?? '';
    el.setAttribute('aria-label', text);
    el.textContent = '';
    let i = 0;
    text.split(/(\s+)/).forEach(part => {
      if (/^\s+$/.test(part)){ el.append(' '); return; }
      const word = document.createElement('span');
      word.className = 'w'; word.setAttribute('aria-hidden', 'true');
      for (const ch of part){
        const l = document.createElement('span');
        l.className = 'l'; l.textContent = ch; l.style.setProperty('--i', String(i++));
        word.append(l);
      }
      el.append(word);
    });
  });
  if (reducedMotion){ els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: .2 });
  els.forEach(el => io.observe(el));
}
