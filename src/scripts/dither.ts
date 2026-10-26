/* ==========================================================================
   DITHER.TS — the hero photo as 1-bit Atkinson dither, printed row by row
   like a thermal printer. Hold the photo (or the p key) to "develop" it
   back to full colour.
   ========================================================================== */
import { $, cssVar, isDark, reducedMotion, THEME_EVENT } from './env';

const W = 300, H = 400, SCALE = 2;   // dither at low res, draw each dot as 2×2
const ROWS_PER_FRAME = 14;

function atkinson(img: HTMLImageElement){
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const o = off.getContext('2d')!;
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  o.drawImage(img, (W - img.naturalWidth * s) / 2, (H - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  const d = o.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) * 1.08 - 6;
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const i = y * W + x, v = lum[i] < 128 ? 0 : 255, err = (lum[i] - v) / 8;
    lum[i] = v;
    for (const [dx, dy] of spread){
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < W && ny < H) lum[ny * W + nx] += err;
    }
  }
  return lum;
}

export function initDither(){
  const fig = $('#photo'), canvas = $<HTMLCanvasElement>('#dither'), img = fig?.querySelector('img');
  if (!fig || !canvas || !img) return { develop: (_on: boolean) => {} };
  const ctx = canvas.getContext('2d')!;
  let dots: Float32Array | null = null, job = 0;

  function print(){
    if (!dots) return;
    const id = ++job;
    canvas!.width = W * SCALE; canvas!.height = H * SCALE;
    ctx.fillStyle = cssVar('--paper-2'); ctx.fillRect(0, 0, canvas!.width, canvas!.height);
    ctx.fillStyle = cssVar('--ink');
    const on = isDark() ? 255 : 0;   // light ink on dark paper: draw the highlights instead
    let y = 0;
    const rows = (n: number) => {
      for (let k = 0; k < n && y < H; k++, y++)
        for (let x = 0; x < W; x++) if (dots![y * W + x] === on) ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    };
    if (reducedMotion) { rows(H); return; }
    const frame = () => { if (id !== job) return; rows(ROWS_PER_FRAME); if (y < H) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  }

  const start = () => { dots = atkinson(img); print(); };
  img.complete && img.naturalWidth ? start() : img.addEventListener('load', start, { once: true });
  document.documentElement.addEventListener(THEME_EVENT, print);

  const develop = (on: boolean) => fig.classList.toggle('dev', on);
  fig.addEventListener('pointerdown', () => develop(true));
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) fig.addEventListener(ev, () => develop(false));
  return { develop };
}
