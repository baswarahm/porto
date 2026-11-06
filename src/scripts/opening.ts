/* ==========================================================================
   OPENING.TS — two slides (see opening.css):
     name   scattered letters fly together, then split apart sideways
     USM    the crest drops in, then a portal opens onto the site
   Plays once per browser session (Base.astro decides before first paint),
   skippable with any key or click. Everything that should start "on
   reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

/** how long each slide holds after its entrance, in ms (also the progress bars) */
const HOLD = [800, 800];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

/** wraps every letter in .c (inside a nowrap .wd per word) and returns the letters */
function splitChars(root: HTMLElement){
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)){
      if (child.nodeType === Node.TEXT_NODE){
        const frag = document.createDocumentFragment();
        for (const part of (child.textContent ?? '').split(/(\s+)/)){
          if (!part) continue;
          if (/^\s+$/.test(part)){ frag.append(' '); continue; }
          const wd = document.createElement('span'); wd.className = 'wd';
          for (const ch of part){ const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; wd.append(c); }
          frag.append(wd);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && (child as Element).tagName !== 'BR'){
        walk(child);
      }
    }
  };
  walk(root);
  return Array.from(root.querySelectorAll<HTMLElement>('.c'));
}

const set = (els: HTMLElement[], fn: (el: HTMLElement, i: number) => Partial<CSSStyleDeclaration>) =>
  els.forEach((el, i) => Object.assign(el.style, fn(el, i)));

let resolveOpened!: () => void;
export const opened = new Promise<void>(r => { resolveOpened = r; });

export function initOpening(){
  const root = document.documentElement, el = $('#opening');
  if (!el || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  const [name, usm] = Array.from(el.querySelectorAll<HTMLElement>('.op-slide'));
  const dots = Array.from(el.querySelectorAll<HTMLElement>('#opDots i'));
  const letters = splitChars(name.querySelector<HTMLElement>('[data-chars]')!);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    removeEventListener('keydown', finish);
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 1100);
  };
  addEventListener('keydown', finish, { once: true });
  el.addEventListener('pointerdown', finish, { once: true });

  const progress = (n: number) => dots.forEach((d, i) => {
    d.classList.toggle('done', i < n); d.classList.toggle('on', i === n); d.style.setProperty('--d', `${HOLD[i]}ms`);
  });
  const enter = (s: HTMLElement) => { s.classList.add('on'); requestAnimationFrame(() => s.classList.add('show')); };
  const leave = (s: HTMLElement) => s.classList.add('out');
  const hide = (s: HTMLElement) => s.classList.remove('on', 'show', 'out');
  const vw = innerWidth, vh = innerHeight;

  // my name's letters start scattered, ready to fly together
  set(letters, () => ({ transform: `translate(${rand(-.45, .45) * vw}px, ${rand(-.4, .4) * vh}px) rotate(${rand(-200, 200)}deg) scale(${rand(.3, 1.4)})`, opacity: '0' }));

  (async () => {
    await frame();

    /* name ─ the letters fly together */
    progress(0);
    enter(name);
    await frame();
    set(letters, () => ({ transitionDelay: `${rand(0, 260)}ms`, transform: 'none', opacity: '1' }));
    await sleep(950 + HOLD[0]);
    if (done) return;

    /* name → USM ─ my name splits apart sideways, the crest drops in */
    leave(name);
    await sleep(300);
    progress(1);
    enter(usm);
    await sleep(500);
    hide(name);
    await sleep(400 + HOLD[1]);
    if (done) return;

    /* USM → site ─ the slide lifts away and a portal opens */
    leave(usm);
    await sleep(250);
    finish();
  })();
}
