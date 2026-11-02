/* ==========================================================================
   OPENING.TS — four slides, a different cut between each (see opening.css):
     1 → 2  scatter / reassemble     2 → 3  split apart / crest drops
     3 → 4  orange iris              4 → ✕  letters fall, portal opens
   Plays once per browser session (Base.astro decides before first paint),
   skippable with any key or click. Everything that should start "on
   reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

/** how long each slide holds after its entrance, in ms (also the progress bars) */
const HOLD = [1000, 1000, 1000, 900];

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
  const root = document.documentElement, el = $('#opening'), iris = $('#opIris'), crest = $('#opCrest');
  if (!el || !iris || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  const slides = Array.from(el.querySelectorAll<HTMLElement>('.op-slide'));
  const [s1, s2, s3, s4] = slides;
  const dots = Array.from(el.querySelectorAll<HTMLElement>('#opDots i'));
  const letters = slides.map(s => { const big = s.querySelector<HTMLElement>('[data-chars]'); return big ? splitChars(big) : []; });

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

  // slide 2's letters start scattered, ready to fly together
  set(letters[1], () => ({ transform: `translate(${rand(-.45, .45) * vw}px, ${rand(-.4, .4) * vh}px) rotate(${rand(-200, 200)}deg) scale(${rand(.3, 1.4)})`, opacity: '0' }));

  (async () => {
    await frame();

    /* 1 ─ welcome: letters rise in */
    progress(0);
    set(letters[0], (_, i) => ({ transitionDelay: `${i * 22}ms` }));
    enter(s1);
    await sleep(900 + HOLD[0]);
    if (done) return;

    /* 1 → 2 ─ the welcome letters scatter … */
    leave(s1);
    s1.querySelector('.op-big')!.classList.add('scatter');
    set(letters[0], () => ({
      transitionDelay: `${rand(0, 120)}ms`,
      transform: `translate(${rand(-.6, .6) * vw}px, ${rand(-.5, .5) * vh}px) rotate(${rand(-260, 260)}deg) scale(${rand(.2, .7)})`,
      opacity: '0',
    }));
    await sleep(420);
    /* … and my name's letters fly back together */
    progress(1);
    enter(s2);
    await frame();
    set(letters[1], () => ({ transitionDelay: `${rand(0, 260)}ms`, transform: 'none', opacity: '1' }));
    await sleep(500);
    hide(s1);
    await sleep(600 + HOLD[1]);
    if (done) return;

    /* 2 → 3 ─ my name splits apart sideways, the silhouette sinks … */
    leave(s2);
    await sleep(380);
    /* … and the USM crest drops in */
    progress(2);
    enter(s3);
    await sleep(500);
    hide(s2);
    await sleep(500 + HOLD[2]);
    if (done) return;

    /* 3 → 4 ─ an orange iris bursts from the crest … */
    const r = (crest ?? s3).getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const reach = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));
    iris.style.setProperty('--ix', `${cx}px`); iris.style.setProperty('--iy', `${cy}px`);
    iris.style.setProperty('--iscale', String(Math.ceil(reach / 10) + 2));
    iris.classList.add('grow');
    await sleep(560);
    /* … and closes on "enjoy the visit" */
    hide(s3);
    progress(3);
    set(letters[3], (_, i) => ({ transitionDelay: `${180 + i * 35}ms` }));
    enter(s4);
    iris.classList.replace('grow', 'close');
    await sleep(900 + HOLD[3]);
    if (done) return;

    /* 4 → site ─ the letters fall away and a portal opens */
    leave(s4);
    s4.querySelector('.op-big')!.classList.add('fall');
    set(letters[3], () => ({
      transitionDelay: `${rand(0, 160)}ms`,
      transform: `translate(${rand(-40, 40)}px, ${rand(.45, .7) * vh}px) rotate(${rand(-70, 70)}deg)`,
      opacity: '0',
    }));
    await sleep(320);
    finish();
  })();
}
