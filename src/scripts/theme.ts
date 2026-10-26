/* ==========================================================================
   THEME.TS — Ambient Color Walk
   The HUD accent quietly "walks" through 8 curated palettes, one gentle step
   at a time. Each step interpolates --accent(-2)-rgb over 3.2s so the whole
   site — buttons, glows, particles, borders — shifts in sync with never a
   hard cut. Paused under prefers-reduced-motion.
   ========================================================================== */
import { reducedMotion } from './core';

const root = document.documentElement;
const STEP_MS = 3200;      // duration of each color transition
const WALK_MS = 14000;     // time spent resting on each palette before stepping

interface Palette { id: string; name: string; c1: string; c2: string }

export const PALETTES: Palette[] = [
  { id: 'violet',  name: 'Void Violet',   c1: '#8b83ee', c2: '#4bc9bb' },
  { id: 'emerald', name: 'Cyber Emerald', c1: '#10b981', c2: '#8b83ee' },
  { id: 'gold',    name: 'Solar Gold',    c1: '#d1a24e', c2: '#4bc9bb' },
  { id: 'crimson', name: 'Crimson Pulse', c1: '#e05a5a', c2: '#22d3ee' },
  { id: 'ocean',   name: 'Ocean Blue',    c1: '#2f8fe0', c2: '#38bdf8' },
  { id: 'arctic',  name: 'Arctic Ice',    c1: '#22d3ee', c2: '#a78bfa' },
  { id: 'synth',   name: 'Synthwave',     c1: '#ff00aa', c2: '#00f0ff' },
  { id: 'royal',   name: 'Royal Purple',  c1: '#7c3aed', c2: '#c084fc' },
];

function hexToRgb(hex: string){
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

let animId = 0;
let walkTimer: ReturnType<typeof setInterval> | undefined;
let stepIndex = 0;

function stepToPalette(palette: Palette){
  const cs = getComputedStyle(root);
  const from1 = (cs.getPropertyValue('--accent-rgb').trim() || '139,131,238').split(',').map(Number);
  const from2 = (cs.getPropertyValue('--accent-2-rgb').trim() || '75,201,187').split(',').map(Number);
  const to1 = hexToRgb(palette.c1);
  const to2 = hexToRgb(palette.c2);

  root.setAttribute('data-palette', palette.id);

  const start = performance.now();
  cancelAnimationFrame(animId);
  function frame(now: number){
    const t = Math.min(1, (now - start) / STEP_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    const a1 = from1.map((v, i) => Math.round(lerp(v, to1[i], eased)));
    const a2 = from2.map((v, i) => Math.round(lerp(v, to2[i], eased)));
    root.style.setProperty('--accent-rgb', a1.join(','));
    root.style.setProperty('--accent-2-rgb', a2.join(','));
    root.style.setProperty('--accent', `rgb(${a1.join(',')})`);
    root.style.setProperty('--accent-2', `rgb(${a2.join(',')})`);
    if(t < 1){ animId = requestAnimationFrame(frame); }
  }
  animId = requestAnimationFrame(frame);
}

/** Sets the very first palette synchronously. Picks a starting point off
    the wall-clock so returning visitors don't always open on the same one. */
export function restoreSavedPalette(){
  stepIndex = Math.floor(Date.now() / 60000) % PALETTES.length;
  root.setAttribute('data-palette', PALETTES[stepIndex].id);
}

/** Starts the ambient walk. No-op under reduced-motion. */
export function initColorWalk(){
  if(reducedMotion) return;
  clearInterval(walkTimer);
  walkTimer = setInterval(() => {
    stepIndex = (stepIndex + 1) % PALETTES.length;
    stepToPalette(PALETTES[stepIndex]);
  }, WALK_MS);
}
