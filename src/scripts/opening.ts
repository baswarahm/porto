/* ==========================================================================
   OPENING.TS — a ~3.5 s glitch trailer before the page is revealed.
   Fast cuts, one card per beat: my silhouette with the name across it,
   the rest of the name, "from Surakarta", "studying in Penang", then the
   USM crest. Every cut slams in with a flash, a camera shake and RGB
   ghosts sliced into jumping bands; then the black backdrop shatters into
   strips that fly off. Plays once per browser session (Base.astro decides
   before first paint), skippable with any key or click. Everything that
   should start "on reveal" awaits `opened`.
   ========================================================================== */
import { $ } from './env';

/** how long each card stays up, in ms */
const BEATS = [950, 520, 430, 430, 820];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

let resolveOpened!: () => void;
export const opened = new Promise<void>(r => { resolveOpened = r; });

export function initOpening(){
  const root = document.documentElement, el = $('#opening'), stage = $('#glStage'), flash = $('#glFlash');
  if (!el || !stage || !flash || !root.classList.contains('opening-on')){
    el?.remove();
    resolveOpened();
    return;
  }
  const cards = Array.from(stage.querySelectorAll<HTMLElement>('.gl-card'));
  let skipped = false;
  const skip = () => { skipped = true; };
  addEventListener('keydown', skip, { once: true });
  el.addEventListener('pointerdown', skip, { once: true });

  /* RGB ghosts: two tinted clones of the current card, re-sliced every frame */
  let ghosts: HTMLElement[] = [], glitchTimer: ReturnType<typeof setInterval> | undefined;
  const clearGhosts = () => { clearInterval(glitchTimer); ghosts.forEach(g => g.remove()); ghosts = []; };
  const glitch = (card: HTMLElement, ms: number) => {
    clearGhosts();
    ghosts = ['r', 'c'].map(tint => {
      const g = card.cloneNode(true) as HTMLElement;
      g.classList.remove('on');
      g.classList.add('gl-ghost', tint);
      stage.append(g);
      return g;
    });
    const jolt = () => ghosts.forEach((g, i) => {
      const top = rand(0, 85), h = rand(4, 22);
      g.style.clipPath = Math.random() < .25 ? 'none' : `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`;
      g.style.transform = `translate(${rand(-18, 18) + (i ? 4 : -4)}px, ${rand(-3, 3)}px)`;
      g.style.opacity = Math.random() < .15 ? '0' : '.9';
    });
    jolt();
    glitchTimer = setInterval(jolt, 45);
    setTimeout(clearGhosts, ms);
  };

  const slam = (card: HTMLElement) => {
    cards.forEach(c => c.classList.toggle('on', c === card));
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    glitch(card, 260);
  };

  (async () => {
    await sleep(120);
    for (const [i, card] of cards.entries()){
      if (skipped) break;
      slam(card);
      // a second, smaller burst in the middle of the longer beats
      if (BEATS[i] > 700) setTimeout(() => { if (!skipped) glitch(card, 140); }, BEATS[i] * .6);
      await sleep(BEATS[i]);
    }

    // shatter
    clearGhosts();
    try { sessionStorage.setItem('opened', '1'); } catch { /* private mode — non-fatal */ }
    removeEventListener('keydown', skip);
    root.classList.remove('opening-on');
    el.classList.add('leave');
    resolveOpened();
    setTimeout(() => el.remove(), 1200);
  })();
}
