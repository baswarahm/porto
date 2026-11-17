/* Cards lean toward the cursor and light up under it (.tilt3d in one.css).
   Mouse only; nothing under reduced motion. */
import { reducedMotion } from './env';

const CARDS = '.course, .issue, .sem, .contact-card, .soon-card, .pick-a, .gate .b-win, .cmap-stats';

export function initTilt(){
  // the old one-off entrances are replaced by the 3D scroll rise (one.css)
  document.querySelectorAll('.zone .reveal').forEach(el => el.classList.add('in'));
  if (reducedMotion || !matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll<HTMLElement>(CARDS).forEach(el => {
    el.classList.add('tilt3d');
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      const k = Math.min(1, 300 / Math.max(r.width, r.height)) * 9;
      el.style.setProperty('--ty', `${((fx - .5) * k).toFixed(2)}deg`);
      el.style.setProperty('--tx', `${((.5 - fy) * k).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(fx * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(fy * 100).toFixed(1)}%`);
    });
    el.addEventListener('pointerleave', () => ['--tx', '--ty'].forEach(p => el.style.removeProperty(p)));
  });
  // the dossier photo leans on its own, like a print held up to the light
  const photo = document.querySelector<HTMLElement>('.doss-photo');
  photo?.addEventListener('pointermove', e => {
    const r = photo.getBoundingClientRect();
    photo.style.setProperty('--pty', `${(((e.clientX - r.left) / r.width - .5) * 14).toFixed(2)}deg`);
    photo.style.setProperty('--ptx', `${((.5 - (e.clientY - r.top) / r.height) * 10).toFixed(2)}deg`);
  });
  photo?.addEventListener('pointerleave', () => { photo.style.removeProperty('--pty'); photo.style.removeProperty('--ptx'); });
}
