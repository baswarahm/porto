/* ==========================================================================
   OPENING.TS — a calm ~2.6 s intro before the page is revealed: the name
   rises out of a line, the university and origin settle underneath, my
   silhouette sits quietly behind, then the panel lifts away. All motion is
   CSS (opening.css); this only starts it, holds, and lifts it.
   Plays once per browser session (Base.astro decides before first paint),
   skippable with any key or click. Everything that should start "on
   reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

const HOLD_MS = 2300;

let resolveOpened!: () => void;
export const opened = new Promise<void>(r => { resolveOpened = r; });

export function initOpening(){
  const root = document.documentElement, el = $('#opening');
  if (!el || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    removeEventListener('keydown', finish);
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 1200);
  };
  addEventListener('keydown', finish, { once: true });
  el.addEventListener('pointerdown', finish, { once: true });

  // start on the next frame so the transitions run from their initial state
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('play')));
  const timer = setTimeout(finish, HOLD_MS);
}
