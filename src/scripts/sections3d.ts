/* ==========================================================================
   SECTIONS3D.TS — the 3D life inside each section (one.css draws it):
     · groups get .on3d when they scroll into view, which plays their
       cascade: course-map tiles flip down like a departures board,
       semesters flip over, course cards deal in, goals drop into their
       stacks, timeline entries swing in from the side
     · course cards flip over to show what I learned (click / Enter)
     · the projects vault spins its dial and refuses; the card shakes "access denied"
   ========================================================================== */
import { reducedMotion } from './env';

const GROUPS = '.cmap, .sem-track, .courses, .targets, .ggraph, .socials, .cmap-stats, .gauge, .vault, .cyl';

export function initSections3d(){
  const groups = Array.from(document.querySelectorAll<HTMLElement>(GROUPS));
  if (reducedMotion) groups.forEach(g => g.classList.add('on3d'));
  else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('on3d'); io.unobserve(e.target);
    }), { threshold: .12 });
    groups.forEach(g => io.observe(g));
  }

  // course cards flip over
  document.querySelectorAll<HTMLElement>('.course').forEach(card => {
    const btns = Array.from(card.querySelectorAll<HTMLButtonElement>('.flip-btn'));
    const set = (on: boolean) => {
      card.classList.toggle('flipped', on);
      btns[0]?.setAttribute('aria-expanded', String(on));
      (on ? btns[1] : btns[0])?.focus({ preventScroll: true });
    };
    btns[0]?.addEventListener('click', () => set(true));
    btns[1]?.addEventListener('click', () => set(false));
    card.querySelector('.face.front')?.addEventListener('click', e => { if (!(e.target as HTMLElement).closest('button, a')) set(true); });
  });

  // projects: locked; trying the vault (or the card) spins the dial and refuses
  const lock = document.querySelector<HTMLElement>('.vault-row');
  lock?.addEventListener('pointerenter', () => {
    lock.classList.remove('deny'); void lock.offsetWidth; lock.classList.add('deny');
  });
}
