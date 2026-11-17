/* ==========================================================================
   CURSOR.TS — a target-lock reticle in place of the mouse pointer.
   It follows the mouse with live screen coordinates; over anything you can
   click, its four brackets snap out to frame that element ("lock").
   Mouse-and-trackpad screens only; touch and pen keep their own behaviour.
   ========================================================================== */
import { reducedMotion } from './env';

const LOCKABLE = 'a, button, summary, label, .tilt3d, .tile, .sem, [role="button"]';

export function initCursor(){
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const el = document.createElement('div');
  el.className = 'reticle gone'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="c tl"></i><i class="c tr"></i><i class="c bl"></i><i class="c br"></i><span class="dot"></span><span class="read"></span>';
  document.body.append(el);
  document.documentElement.classList.add('has-reticle');
  const read = el.querySelector<HTMLElement>('.read')!;

  const cur = { x: -100, y: -100, w: 26, h: 26 }, aim = { ...cur };
  let target: Element | null = null, mx = -100, my = -100, raf = 0, typing = false;

  const step = () => {
    raf = 0;
    if (target?.isConnected){
      const r = target.getBoundingClientRect();
      aim.x = r.left + r.width / 2; aim.y = r.top + r.height / 2; aim.w = r.width + 14; aim.h = r.height + 14;
      el.classList.add('lock'); read.textContent = 'lock';
    } else {
      aim.x = mx; aim.y = my; aim.w = 26; aim.h = 26;
      el.classList.remove('lock');
      read.textContent = `${String(Math.round(mx)).padStart(4, '0')}·${String(Math.round(my)).padStart(4, '0')}`;
    }
    const k = reducedMotion ? 1 : .28;
    cur.x += (aim.x - cur.x) * k; cur.y += (aim.y - cur.y) * k;
    cur.w += (aim.w - cur.w) * k; cur.h += (aim.h - cur.h) * k;
    el.style.transform = `translate(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px) translate(-50%, -50%)`;
    el.style.width = `${cur.w.toFixed(1)}px`; el.style.height = `${cur.h.toFixed(1)}px`;
    if (Math.abs(aim.x - cur.x) + Math.abs(aim.y - cur.y) + Math.abs(aim.w - cur.w) + Math.abs(aim.h - cur.h) > .4) raf = requestAnimationFrame(step);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(step); };

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    const t = e.target as Element;
    // in a text field the normal caret cursor comes back
    typing = !!t.closest?.('input, textarea, [contenteditable="true"]');
    el.classList.toggle('typing', typing);
    target = typing ? null : t.closest?.(LOCKABLE) ?? null;
    el.classList.remove('gone');
    kick();
  }, { passive: true });
  addEventListener('scroll', kick, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => el.classList.add('gone'));
  addEventListener('pointerdown', () => el.classList.add('press'));
  addEventListener('pointerup', () => el.classList.remove('press'));
}
