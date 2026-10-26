/* ==========================================================================
   CODEBG.TS — the background is this site's own source code, pulled in at
   build time, scrolling in columns. Lines near the cursor light up.
   ========================================================================== */
import { cssVar, reducedMotion, THEME_EVENT } from './env';

const sources = import.meta.glob(['./*.ts', '../lib/*.ts', '../styles/global.css'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const LINES = Object.values(sources).join('\n').split('\n').map(l => l.replace(/\s+$/, '')).filter(l => l.trim());

const LH = 18, FONT = '12px "IBM Plex Mono", monospace', CHARS = 62;

export function initCodeBackground(){
  const canvas = document.createElement('canvas');
  canvas.id = 'codebg'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d')!;
  let on = true, w = 0, h = 0, ink = '', sig = '';
  let cols: { x: number; start: number; off: number; speed: number }[] = [];
  const mouse = { x: -999, y: -999 };

  function size(){
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT;
    const colW = (CHARS + 2) * ctx.measureText('m').width;
    cols = Array.from({ length: Math.max(1, Math.ceil(w / colW)) }, (_, i) => ({
      x: i * colW + 12, start: Math.floor(Math.random() * LINES.length), off: Math.random() * LH, speed: .15 + Math.random() * .35,
    }));
  }
  const readColors = () => { ink = cssVar('--ink'); sig = cssVar('--signal'); };

  function draw(){
    ctx.clearRect(0, 0, w, h);
    ctx.font = FONT;
    const parallax = scrollY * .15;
    for (const c of cols){
      if (!reducedMotion) c.off += c.speed;
      const shift = c.off + parallax, first = Math.floor(shift / LH);
      for (let r = -1; r < h / LH + 1; r++){
        const y = r * LH - (shift % LH) + 14;
        const line = LINES[(((c.start + first + r) % LINES.length) + LINES.length) % LINES.length].slice(0, CHARS);
        const near = Math.max(0, 1 - Math.hypot(mouse.x - (c.x + 180), mouse.y - y) / 220);
        ctx.globalAlpha = .055 + near * .5;
        ctx.fillStyle = near > .25 ? sig : ink;
        ctx.fillText(line, c.x, y);
      }
    }
    ctx.globalAlpha = 1;
  }
  const loop = () => { if (on && !document.hidden) draw(); requestAnimationFrame(loop); };

  addEventListener('resize', () => { size(); if (reducedMotion) draw(); });
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.documentElement.addEventListener(THEME_EVENT, () => { readColors(); if (reducedMotion && on) draw(); });
  document.fonts.ready.then(() => { readColors(); size(); reducedMotion ? draw() : loop(); });

  return {
    toggle(){
      on = !on;
      if (on) draw(); else ctx.clearRect(0, 0, w, h);
      return on;
    },
  };
}
