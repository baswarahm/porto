/* Light/dark toggle. Follows the OS until the visitor picks, then remembers.
   Where View Transitions exist, the new theme grows as a circle from the
   point that triggered it. */
import { $, isDark, reducedMotion, THEME_EVENT } from './env';

let origin = { x: innerWidth - 40, y: 30 };

function apply(next: 'light' | 'dark'){
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* private mode — non-fatal */ }
  document.documentElement.dispatchEvent(new Event(THEME_EVENT));
}

export function toggleTheme(){
  const next = isDark() ? 'light' : 'dark';
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reducedMotion){ apply(next); return next; }
  const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
  doc.startViewTransition(() => apply(next)).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.7,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    );
  });
  return next;
}

export function initTheme(){
  const btn = $('#themeBtn');
  btn?.addEventListener('click', e => { origin = { x: e.clientX, y: e.clientY }; toggleTheme(); });
  // OS switch while no explicit choice is saved
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) document.documentElement.dispatchEvent(new Event(THEME_EVENT));
  });
}
