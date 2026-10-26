/* X-ray: outline every element and label the one under the cursor with its
   selector and size, like the browser's own inspector. */
import { $ } from './env';
import { setMode } from './vim';

export function initXray(){
  const label = $('#xlabel')!, btn = $('#xrayBtn')!;

  addEventListener('pointermove', e => {
    if (!document.body.classList.contains('xray')) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === label) return;
    const r = el.getBoundingClientRect();
    const name = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + [...el.classList].join('.') : '');
    label.textContent = `${name}  ${Math.round(r.width)}×${Math.round(r.height)}`;
    label.style.left = Math.min(e.clientX + 14, innerWidth - label.offsetWidth - 8) + 'px';
    label.style.top = Math.min(e.clientY + 18, innerHeight - 56) + 'px';
  }, { passive: true });

  const toggle = () => {
    const on = document.body.classList.toggle('xray');
    btn.setAttribute('aria-pressed', String(on));
    setMode(on ? 'INSPECT' : 'NORMAL');
    return on;
  };
  btn.addEventListener('click', toggle);
  return { toggle };
}
