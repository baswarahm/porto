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
      if (busy || w.closest('.split')) return;
      busy = true; scramble(groups[i], 380);
      setTimeout(() => { busy = false; }, 600);
    });
  });
  return { decrypt: () => scramble(groups.flat(), 900) };
}

/* ==========================================================================
   Name split: click the name and every letter flies apart. While split,
   letters can be dragged anywhere; "reassemble" springs them home.
   ========================================================================== */
export function initNameSplit(onSplit?: () => void){
  const h1 = document.getElementById('heroName'), tools = document.getElementById('nameTools');
  if (!h1 || !tools) return { split: () => {}, reset: () => {} };
  const letters = () => Array.from(h1.querySelectorAll<HTMLElement>('.ch'));
  const pos = new Map<HTMLElement, { x: number; y: number; r: number }>();
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const apply = (el: HTMLElement) => { const p = pos.get(el)!; el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg)`; };

  const split = () => {
    // drop the 3D tilt first so the letters are measured flat
    h1.style.transform = ''; h1.style.textShadow = '';
    // scatter inside the hero's left column, never off-screen
    const box = h1.parentElement!.getBoundingClientRect();
    const minX = Math.max(8, box.left), maxX = Math.min(innerWidth - 48, box.right - 20);
    letters().forEach(el => {
      const cur = pos.get(el) ?? { x: 0, y: 0, r: 0 };
      const r = el.getBoundingClientRect();
      const homeX = r.left - cur.x, homeY = r.top - cur.y;
      const tx = rand(minX, maxX), ty = rand(box.top - 30, box.top + box.height * .6);
      pos.set(el, { x: tx - homeX, y: ty - homeY, r: rand(-70, 70) });
      apply(el);
    });
    h1.classList.add('split');
    tools.classList.add('on');
    onSplit?.();
  };
  const reset = () => {
    letters().forEach(el => { pos.set(el, { x: 0, y: 0, r: 0 }); el.style.transform = ''; });
    h1.classList.remove('split');
    tools.classList.remove('on');
  };

  h1.addEventListener('click', () => { if (!h1.classList.contains('split')) split(); });
  document.getElementById('nameReset')?.addEventListener('click', reset);
  document.getElementById('nameShake')?.addEventListener('click', split);

  // drag a loose letter
  h1.addEventListener('pointerdown', e => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.ch');
    if (!el || !h1.classList.contains('split')) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.classList.add('drag');
    const start = { ...pos.get(el)! }, sx = e.clientX, sy = e.clientY;
    const move = (ev: PointerEvent) => {
      pos.set(el, { x: start.x + ev.clientX - sx, y: start.y + ev.clientY - sy, r: start.r * .9 });
      apply(el);
    };
    const up = () => {
      el.classList.remove('drag');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
  return { split, reset };
}

/* ==========================================================================
   Name tilt: the name leans toward the cursor like a physical sign, and a
   stack of text-shadows gives it an extruded purple edge that shifts with
   the angle. Mouse only; stands down while the letters are split apart.
   ========================================================================== */
export function initNameTilt(){
  const h1 = document.getElementById('heroName'), area = h1?.parentElement;
  if (!h1 || !area || reducedMotion || !matchMedia('(hover: hover)').matches) return;
  const cur = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  let raf = 0;
  const LAYERS = 7;

  const paint = () => {
    raf = 0;
    cur.x += (target.x - cur.x) * .12; cur.y += (target.y - cur.y) * .12;
    if (h1.classList.contains('split')){ h1.style.transform = ''; h1.style.textShadow = ''; return; }
    h1.style.transform = `perspective(900px) rotateX(${(-cur.y * 9).toFixed(2)}deg) rotateY(${(cur.x * 13).toFixed(2)}deg)`;
    // the edge shows on the side facing away from the cursor
    const sh: string[] = [];
    for (let k = 1; k <= LAYERS; k++)
      sh.push(`${(-cur.x * k * .9).toFixed(2)}px ${(k * .55 - cur.y * k * .7).toFixed(2)}px 0 var(--extrude)`);
    sh.push(`${(-cur.x * 10).toFixed(1)}px ${(8 - cur.y * 8).toFixed(1)}px 28px color-mix(in srgb, var(--usm) 45%, transparent)`);
    h1.style.textShadow = sh.join(', ');
    if (Math.abs(target.x - cur.x) > .002 || Math.abs(target.y - cur.y) > .002) raf = requestAnimationFrame(paint);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(paint); };

  area.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = h1.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    target.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 1.2)));
    kick();
  });
  area.addEventListener('pointerleave', () => { target.x = 0; target.y = .15; kick(); });
  target.y = .15; kick();   // a slight resting angle so the depth is visible before you move
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
