/* ==========================================================================
   THEME.JS — Ambient Color Walk
   The HUD accent color no longer needs a picker: it quietly "walks" through
   the 8 curated palettes on its own, one gentle step at a time, the same
   way a status light drifts on a HUD. Each step interpolates --accent(-2)-rgb
   over 3.2s (identical tweening logic the old Theme Forge used) so the
   whole site — buttons, glows, particles, borders — shifts in sync with
   never a hard cut. Fully paused under prefers-reduced-motion, where the
   accent simply stays put on the palette that was showing.
   ========================================================================== */
import { reducedMotion } from './main.js';

const root = document.documentElement;
const STEP_MS = 3200;      // duration of each color transition
const WALK_MS = 14000;     // time spent resting on each palette before stepping

export const PALETTES = [
  { id:'violet',  name:'Void Violet',   c1:'#8b83ee', c2:'#4bc9bb' },
  { id:'emerald', name:'Cyber Emerald', c1:'#10b981', c2:'#8b83ee' },
  { id:'gold',    name:'Solar Gold',    c1:'#d1a24e', c2:'#4bc9bb' },
  { id:'crimson', name:'Crimson Pulse', c1:'#e05a5a', c2:'#22d3ee' },
  { id:'ocean',   name:'Ocean Blue',    c1:'#2f8fe0', c2:'#38bdf8' },
  { id:'arctic',  name:'Arctic Ice',    c1:'#22d3ee', c2:'#a78bfa' },
  { id:'synth',   name:'Synthwave',     c1:'#ff00aa', c2:'#00f0ff' },
  { id:'royal',   name:'Royal Purple',  c1:'#7c3aed', c2:'#c084fc' },
];

function hexToRgb(hex){
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lerp = (a, b, t) => a + (b - a) * t;

let animId = null;
let walkTimer = null;
let stepIndex = 0;

function stepToPalette(palette){
  const cs = getComputedStyle(root);
  const from1 = (cs.getPropertyValue('--accent-rgb').trim() || '139,131,238').split(',').map(Number);
  const from2 = (cs.getPropertyValue('--accent-2-rgb').trim() || '75,201,187').split(',').map(Number);
  const to1 = hexToRgb(palette.c1);
  const to2 = hexToRgb(palette.c2);

  root.setAttribute('data-palette', palette.id);

  const start = performance.now();
  cancelAnimationFrame(animId);
  function frame(now){
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

/** Sets the very first palette synchronously — call before first paint so
    the opening frame is never a flash of the wrong color. Picks a starting
    point off the wall-clock so returning visitors don't always open on the
    same one, without needing to read/write LocalStorage at all. */
export function restoreSavedPalette(){
  stepIndex = Math.floor(Date.now() / 60000) % PALETTES.length;
  root.setAttribute('data-palette', PALETTES[stepIndex].id);
}

/** Starts the ambient walk. A no-op loop under reduced-motion — the accent
    just stays on whatever restoreSavedPalette() picked. */
export function initColorWalk(){
  if(reducedMotion) return;
  clearInterval(walkTimer);
  walkTimer = setInterval(() => {
    stepIndex = (stepIndex + 1) % PALETTES.length;
    stepToPalette(PALETTES[stepIndex]);
  }, WALK_MS);
}
