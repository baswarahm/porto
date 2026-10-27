/* ==========================================================================
   BINARYBG.TS — the background: columns of 0s and 1s falling like rain.
   The bits aren't random: every column reads its bits from MESSAGE, so the
   rain is literally a hidden sentence in binary. Lit up under the cursor,
   one random column at a time glows in the accent colour.
   Cheap on purpose: each frame draws one glyph per column and fades the old
   frame with a translucent wash, so phones stay smooth.
   ========================================================================== */
import { cssVar, isDark, reducedMotion, THEME_EVENT } from './env';

const MESSAGE = "hello, I'm baswara. first-year cs student at USM, from Solo, now in Penang. still compiling. ";
const BITS = [...MESSAGE].map(ch => ch.charCodeAt(0).toString(2).padStart(8, '0')).join('');

interface Drop { x: number; y: number; speed: number; bit: number; hot: number }

export function initBinaryBackground(){
  const canvas = document.createElement('canvas');
  canvas.id = 'binbg'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', { alpha: true })!;
  const phone = matchMedia('(max-width: 640px)').matches;
  const CELL = phone ? 15 : 17, FONT = `${phone ? 12 : 14}px "IBM Plex Mono", monospace`;
  const FPS = phone ? 24 : 32;

  let on = true, w = 0, h = 0, drops: Drop[] = [], last = 0;
  let paper = '', ink = '', sig = '', fade = .1, headAlpha = .5;
  const mouse = { x: -999, y: -999 };

  const readColors = () => {
    paper = cssVar('--paper'); ink = cssVar('--ink'); sig = cssVar('--signal');
    // dark paper needs a softer wash and brighter heads to read the same
    fade = isDark() ? .085 : .1;
    headAlpha = isDark() ? .55 : .42;
  };

  function size(){
    const dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2);
    w = document.documentElement.clientWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    drops = Array.from({ length: Math.ceil(w / CELL) }, (_, i) => ({
      x: i * CELL + CELL / 2,
      y: Math.random() * -h / CELL,           // staggered start above the screen
      speed: .35 + Math.random() * .65,
      bit: Math.floor(Math.random() * BITS.length),
      hot: 0,
    }));
    ctx.fillStyle = paper; ctx.globalAlpha = 1; ctx.fillRect(0, 0, w, h);
  }

  function frame(){
    // wash the previous frame towards paper, which leaves fading trails
    ctx.globalAlpha = fade; ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
    if (Math.random() < .02){ const d = drops[(Math.random() * drops.length) | 0]; if (d) d.hot = 60; }

    for (const d of drops){
      const row = Math.floor(d.y);
      d.y += d.speed;
      if (Math.floor(d.y) === row) continue;          // only draw when the column moves down a cell
      const y = row * CELL;
      if (y > h){
        if (Math.random() > .975){ d.y = 0; d.speed = .35 + Math.random() * .65; }
        continue;
      }
      const ch = BITS[d.bit]; d.bit = (d.bit + 1) % BITS.length;
      const near = Math.max(0, 1 - Math.hypot(mouse.x - d.x, mouse.y - y) / 160);
      const hot = d.hot > 0 ? (d.hot--, 1) : 0;
      ctx.globalAlpha = Math.min(1, headAlpha + near * .5 + hot * .3);
      ctx.fillStyle = near > .2 || hot ? sig : ink;
      ctx.fillText(ch, d.x, y);
    }
    ctx.globalAlpha = 1;
  }

  function staticField(){
    ctx.fillStyle = paper; ctx.globalAlpha = 1; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = ink;
    let b = 0;
    for (let y = 0; y < h; y += CELL) for (const d of drops){
      if (Math.random() < .55) continue;
      ctx.globalAlpha = .05 + Math.random() * .18;
      ctx.fillText(BITS[b++ % BITS.length], d.x, y);
    }
    ctx.globalAlpha = 1;
  }

  const loop = (t: number) => {
    requestAnimationFrame(loop);
    if (!on || document.hidden || t - last < 1000 / FPS) return;
    last = t;
    frame();
  };

  addEventListener('resize', () => { size(); if (reducedMotion) staticField(); });
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
  document.documentElement.addEventListener(THEME_EVENT, () => {
    readColors();
    if (!on) return;
    ctx.globalAlpha = 1; ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
    if (reducedMotion) staticField();
  });

  document.fonts.ready.then(() => {
    readColors(); size();
    if (reducedMotion) staticField(); else requestAnimationFrame(loop);
  });

  return {
    toggle(){
      on = !on;
      if (on){ ctx.globalAlpha = 1; ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h); if (reducedMotion) staticField(); }
      else ctx.clearRect(0, 0, w, h);
      return on;
    },
    /** the hidden sentence, for the :decode command */
    message: MESSAGE.trim(),
  };
}
