/* ==========================================================================
   PHOTO.TS — photo mode: stop the world, frame a shot, save a poster.
   The page steps out of the way; drag to orbit, scroll to zoom, right-drag
   to pan (world.ts runs the camera). Click anything to focus on it, then
   open the blur for real depth of field. Colour grades: noir, film, neon.
   "Save poster" renders the frame again at a higher resolution with a
   small caption and downloads it as a PNG.
   Keys: S save · H hide this panel · Esc leave.
   ========================================================================== */
export interface PhotoState { blur: number; focus: number; grade: number; freeze: boolean; grid: boolean }

export function createPhotoUI(cb: { enter: () => void; exit: () => void; save: () => Promise<void>; change: (s: PhotoState) => void }){
  const s: PhotoState = { blur: .35, focus: 20, grade: 0, freeze: true, grid: false };
  let on = false;
  const el = document.createElement('section');
  el.className = 'photo b-win'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Photo mode');
  el.innerHTML = `
    <header class="ph-top"><p class="ph-k">photo.mode</p><span class="ph-focus" aria-live="polite">click the scene to focus</span><button type="button" class="key ph-x"><span>esc · leave</span></button></header>
    <div class="ph-grid-row">
      <label class="ph-ctl"><span>blur</span><input type="range" min="0" max="1" step=".01" value="${s.blur}" data-k="blur"></label>
      <div class="ph-ctl" role="group" aria-label="Colour grade"><span>grade</span>
        ${['none', 'noir', 'film', 'neon'].map((g, i) => `<button type="button" class="chip" data-grade="${i}" aria-pressed="${i === 0}">${g}</button>`).join('')}</div>
      <div class="ph-ctl"><button type="button" class="chip" data-t="freeze" aria-pressed="true">freeze time</button><button type="button" class="chip" data-t="grid" aria-pressed="false">thirds grid</button></div>
      <button type="button" class="chip ph-save">save poster <kbd>S</kbd></button>
    </div>
    <p class="ph-hint">drag to orbit · scroll to zoom · right-drag to pan · H hides this panel</p>`;
  document.body.append(el);
  const grid = document.createElement('div'); grid.className = 'ph-thirds'; grid.hidden = true; grid.setAttribute('aria-hidden', 'true'); document.body.append(grid);
  const ring = document.createElement('i'); ring.className = 'ph-ring'; ring.setAttribute('aria-hidden', 'true'); document.body.append(ring);
  const focusEl = el.querySelector('.ph-focus')!, save = el.querySelector<HTMLButtonElement>('.ph-save')!;

  el.querySelector<HTMLInputElement>('[data-k=blur]')!.addEventListener('input', e => { s.blur = +(e.target as HTMLInputElement).value; cb.change(s); });
  el.querySelectorAll<HTMLButtonElement>('[data-grade]').forEach(b => b.addEventListener('click', () => {
    s.grade = +b.dataset.grade!; el.querySelectorAll('[data-grade]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); cb.change(s);
  }));
  el.querySelectorAll<HTMLButtonElement>('[data-t]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.t as 'freeze' | 'grid'; s[k] = !s[k]; b.setAttribute('aria-pressed', String(s[k]));
    grid.hidden = !s.grid; cb.change(s);
  }));
  const doSave = async () => {
    save.disabled = true; save.firstChild!.textContent = 'rendering… ';
    try { await cb.save(); save.firstChild!.textContent = 'saved ✓ '; }
    catch { save.firstChild!.textContent = 'could not save '; }
    setTimeout(() => { save.disabled = false; save.firstChild!.textContent = 'save poster '; }, 1600);
  };
  save.addEventListener('click', doSave);
  el.querySelector('.ph-x')!.addEventListener('click', () => close());
  const onKey = (e: KeyboardEvent) => {
    if (!on || (e.target as HTMLElement).closest?.('input, textarea')) return;
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === 's' || e.key === 'S'){ e.preventDefault(); e.stopPropagation(); doSave(); }
    else if (e.key === 'h' || e.key === 'H'){ e.preventDefault(); e.stopPropagation(); el.classList.toggle('tucked'); }
  };
  const open = () => {
    if (on) return; on = true; el.hidden = false; el.classList.remove('tucked'); grid.hidden = !s.grid;
    document.documentElement.classList.add('photographing'); addEventListener('keydown', onKey, true);
    cb.enter(); cb.change(s);
    setTimeout(() => save.focus({ preventScroll: true }), 30);
  };
  const close = () => {
    if (!on) return; on = false; el.hidden = true; grid.hidden = true;
    document.documentElement.classList.remove('photographing'); removeEventListener('keydown', onKey, true);
    cb.exit();
  };
  /** world.ts tells us where you focused (distance, and the click point for the little ring) */
  const focused = (d: number, x: number, y: number) => {
    s.focus = d; focusEl.textContent = `focus ${d.toFixed(1)} m`; cb.change(s);
    ring.style.left = `${x}px`; ring.style.top = `${y}px`; ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go');
  };
  return { open, close, focused, get on(){ return on; }, state: s };
}
