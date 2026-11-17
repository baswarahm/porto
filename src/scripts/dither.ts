/* ==========================================================================
   DITHER.TS — the hero photo as 1-bit Atkinson dither, rendered as a 3D
   cloud of points in WebGL: bright parts of the photo sit closer to you,
   the cloud tilts toward the cursor, pushes away from it, flies in on
   reveal and scatters on a click. Hold the photo (or the p key) to
   "develop" it back to full colour.

   Cheap on purpose: one draw call, one static buffer, no library. It only
   renders while the photo is on screen and something is moving, and it
   falls back to the old flat dither without WebGL or with reduced motion.
   ========================================================================== */
import { $, cssVar, isDark, reducedMotion, THEME_EVENT } from './env';

const BASE_W = 300;                 // dither width in dots; height follows the frame's aspect
const ROWS_PER_FRAME = 14;          // flat fallback: rows printed per frame

/** crop the photo like CSS object-fit: cover, then Atkinson-dither it */
function atkinson(img: HTMLImageElement, W: number, H: number, posY: number){
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const o = off.getContext('2d')!;
  const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  o.drawImage(img, (W - dw) / 2, (H - dh) * posY, dw, dh);
  const d = o.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) * 1.08 - 6;
  const tone = lum.slice();          // the smooth luminance, before dithering: used for depth
  const spread = [[1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const i = y * W + x, v = lum[i] < 128 ? 0 : 255, err = (lum[i] - v) / 8;
    lum[i] = v;
    for (const [dx, dy] of spread){
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < W && ny < H) lum[ny * W + nx] += err;
    }
  }
  return { dots: lum, tone };
}

const hexToRgb = (hex: string) => {
  const m = hex.replace('#', '');
  const n = parseInt(m.length === 3 ? m.replace(/./g, c => c + c) : m, 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
};

const VERT = `
attribute vec3 a_pos; attribute vec3 a_rand;
uniform vec2 u_tilt; uniform float u_burst; uniform vec3 u_mouse; uniform float u_size; uniform float u_time;
varying float v_glow; varying float v_depth;
void main(){
  vec3 p = a_pos;
  // scatter: each dot flies along its own random direction, with a little swirl
  float b = u_burst * u_burst;
  p += a_rand * b * 1.8;
  p.xy += vec2(-a_rand.y, a_rand.x) * b * .6;
  // the cursor pushes dots away and lifts them toward you
  vec2 d = p.xy - u_mouse.xy;
  float near = u_mouse.z * smoothstep(.32, 0., length(d));
  p.xy += normalize(d + 1e-5) * near * .06;
  p.z += near * .12;
  // a slow breath so the cloud never looks frozen
  p.z += sin(u_time * .8 + a_rand.x * 6.28) * .006;
  // tilt toward the cursor, then perspective
  float cy = cos(u_tilt.x), sy = sin(u_tilt.x), cx = cos(u_tilt.y), sx = sin(u_tilt.y);
  p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy);
  p = vec3(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx);
  float persp = 3. / (3. - p.z);
  gl_Position = vec4(p.xy * persp * .94, 0., 1.);
  gl_PointSize = u_size * persp * (1. + near * .8);
  v_glow = near; v_depth = p.z;
}`;
const FRAG = `
precision mediump float;
uniform vec3 u_ink; uniform vec3 u_accent; uniform float u_fade;
varying float v_glow; varying float v_depth;
void main(){
  vec3 c = mix(u_ink, u_accent, clamp(v_glow * 1.4 + max(v_depth, 0.) * .9, 0., 1.));
  gl_FragColor = vec4(c, u_fade * clamp(.72 + v_depth * 1.2, .45, 1.));
}`;

/** @param startWhen the cloud waits for this, so it flies in once the page is revealed */
export function initDither(startWhen: Promise<void> = Promise.resolve()){
  const fig = $('#photo'), canvas = $<HTMLCanvasElement>('#dither'), img = fig?.querySelector('img');
  if (!fig || !canvas || !img) return { develop: (_on: boolean) => {}, scatter: () => {} };

  const develop = (on: boolean) => fig.classList.toggle('dev', on);
  const loaded = img.complete && img.naturalWidth ? Promise.resolve() : new Promise(r => img.addEventListener('load', r, { once: true }));
  // the frame is 3:4 on desktop and a 16:10 crop (anchored 66% down) on phones
  const frame = () => {
    const r = canvas.getBoundingClientRect();
    const aspect = r.width && r.height ? r.width / r.height : .75;
    return { W: BASE_W, H: Math.round(BASE_W / aspect), posY: aspect > 1 ? .66 : .5 };
  };

  const gl = reducedMotion ? null : canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: true });
  const api = gl ? webgl(gl) : flat();

  // a short tap scatters the cloud; holding develops the colour photo
  let holdTimer = 0;
  fig.addEventListener('pointerdown', () => {
    holdTimer = window.setTimeout(() => { holdTimer = 0; develop(true); }, 220);
  });
  const release = (tap: boolean) => {
    if (holdTimer){ clearTimeout(holdTimer); holdTimer = 0; if (tap) api.scatter(); }
    develop(false);
  };
  fig.addEventListener('pointerup', () => release(true));
  fig.addEventListener('pointerleave', () => release(false));
  fig.addEventListener('pointercancel', () => release(false));

  // mouse only: a colour lens that follows the cursor over the dots
  fig.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const r = canvas.getBoundingClientRect();
    fig.style.setProperty('--x', e.clientX - r.left + 'px');
    fig.style.setProperty('--y', e.clientY - r.top + 'px');
    fig.classList.toggle('lens', e.shiftKey);
  });
  fig.addEventListener('pointerleave', () => fig.classList.remove('lens'));
  // no right-click / long-press save menu (it can't stop a determined visitor, but it stops the casual one)
  fig.addEventListener('contextmenu', e => e.preventDefault());
  fig.addEventListener('dragstart', e => e.preventDefault());
  return { develop, scatter: api.scatter };

  /* ---- WebGL point cloud ---------------------------------------------- */
  function webgl(gl: WebGLRenderingContext){
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return flat();
    gl.useProgram(prog);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uTilt = U('u_tilt'), uBurst = U('u_burst'), uMouse = U('u_mouse'), uSize = U('u_size'), uTime = U('u_time');
    const uInk = U('u_ink'), uAccent = U('u_accent'), uFade = U('u_fade');
    const buf = gl.createBuffer();
    const aPos = gl.getAttribLocation(prog, 'a_pos'), aRand = gl.getAttribLocation(prog, 'a_rand');
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const phone = matchMedia('(max-width: 640px)').matches;
    let count = 0, cssW = 0;
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    const mouse = { x: 0, y: 0, z: 0, tz: 0 };
    let burst = 0, burstFrom = 0, burstAt = 0, burstDur = 1, fade = 0, visible = true, running = false, ready = false;

    const colors = () => {
      gl.uniform3fv(uInk, hexToRgb(cssVar('--ink')));
      gl.uniform3fv(uAccent, hexToRgb(cssVar('--signal')));
    };
    function build(){
      const { W, H, posY } = frame();
      const { dots, tone } = atkinson(img!, W, H, posY);
      const on = isDark() ? 255 : 0;      // light dots on dark paper: draw the highlights
      const data: number[] = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
        const i = y * W + x;
        if (dots[i] !== on) continue;
        const t = Math.max(0, Math.min(1, tone[i] / 255));
        const z = (isDark() ? t - .5 : .5 - t) * .32;           // bright (dark mode) / dark (light mode) parts come forward
        const a = Math.random() * Math.PI * 2, r = .4 + Math.random() * .6, zr = Math.random() * 2 - 1;
        data.push(x / W * 2 - 1, 1 - y / H * 2, z, Math.cos(a) * r, Math.sin(a) * r, zr);
      }
      count = data.length / 6;
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
      gl.enableVertexAttribArray(aRand); gl.vertexAttribPointer(aRand, 3, gl.FLOAT, false, 24, 12);
      colors();
    }
    function size(){
      const r = canvas!.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, phone ? 1.5 : 2);
      cssW = r.width;
      canvas!.width = Math.round(r.width * dpr); canvas!.height = Math.round(r.height * dpr);
      gl.viewport(0, 0, canvas!.width, canvas!.height);
      // one dot per dither cell, slightly overlapping so the photo reads solid
      gl.uniform1f(uSize, (cssW / BASE_W) * dpr * 1.15);
    }

    const ease = (t: number) => 1 - (1 - t) ** 3;
    function draw(now: number){
      running = false;
      if (!ready) return;
      tilt.x += (tilt.tx - tilt.x) * .08; tilt.y += (tilt.ty - tilt.y) * .08;
      mouse.z += (mouse.tz - mouse.z) * .12;
      const bt = Math.min(1, (now - burstAt) / burstDur);
      burst = burstFrom * (1 - ease(bt));
      fade = Math.min(1, fade + .04);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uTilt, tilt.x, tilt.y);
      gl.uniform1f(uBurst, burst);
      gl.uniform3f(uMouse, mouse.x, mouse.y, mouse.z);
      gl.uniform1f(uTime, now / 1000);
      gl.uniform1f(uFade, fade);
      gl.drawArrays(gl.POINTS, 0, count);
      // keep going while anything moves (or the slow breath, while hovered)
      const moving = Math.abs(tilt.tx - tilt.x) > .0005 || Math.abs(tilt.ty - tilt.y) > .0005 || Math.abs(mouse.tz - mouse.z) > .002 || bt < 1 || fade < 1 || mouse.tz > 0;
      if (moving) kick();
    }
    const kick = () => {
      if (running || !visible || document.hidden) return;
      running = true; requestAnimationFrame(draw);
    };
    const fly = (from: number, ms: number) => { burstFrom = from; burstAt = performance.now(); burstDur = ms; kick(); };

    // tilt follows the cursor anywhere in the hero, a bit more over the photo
    const hero = fig!.closest('.hero') ?? fig!;
    hero.addEventListener('pointermove', (e: Event) => {
      const ev = e as PointerEvent;
      if (ev.pointerType !== 'mouse') return;
      const r = canvas!.getBoundingClientRect();
      const nx = (ev.clientX - r.left) / r.width * 2 - 1, ny = (ev.clientY - r.top) / r.height * 2 - 1;
      tilt.tx = Math.max(-1, Math.min(1, nx)) * .38;
      tilt.ty = Math.max(-1, Math.min(1, ny)) * .26;
      const inside = Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
      mouse.x = nx / .94; mouse.y = -ny / .94; mouse.tz = inside ? 1 : 0;
      kick();
    });
    hero.addEventListener('pointerleave', () => { tilt.tx = tilt.ty = 0; mouse.tz = 0; kick(); });

    new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }).observe(canvas!);
    document.addEventListener('visibilitychange', kick);
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = window.setTimeout(() => { size(); build(); kick(); }, 150); });
    document.documentElement.addEventListener(THEME_EVENT, () => { build(); kick(); });

    Promise.all([loaded, startWhen]).then(() => {
      size(); build(); ready = true;
      fly(1, 1500);                       // the dots fly in from everywhere on reveal
    });
    return { scatter: () => fly(Math.max(burst, 1), 1300) };
  }

  /* ---- flat fallback: the old row-by-row thermal print ----------------- */
  function flat(){
    const ctx = canvas!.getContext('2d');
    if (!ctx) return { scatter: () => {} };
    let job = 0;
    function print(){
      const { W, H, posY } = frame(), SCALE = 2;
      const { dots } = atkinson(img!, W, H, posY);
      const id = ++job;
      canvas!.width = W * SCALE; canvas!.height = H * SCALE;
      ctx!.fillStyle = cssVar('--paper-2'); ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.fillStyle = cssVar('--ink');
      const on = isDark() ? 255 : 0;
      let y = 0;
      const rows = (n: number) => {
        for (let k = 0; k < n && y < H; k++, y++)
          for (let x = 0; x < W; x++) if (dots[y * W + x] === on) ctx!.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      };
      if (reducedMotion) { rows(H); return; }
      const step = () => { if (id !== job) return; rows(ROWS_PER_FRAME); if (y < H) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }
    Promise.all([loaded, startWhen]).then(print);
    document.documentElement.addEventListener(THEME_EVENT, print);
    return { scatter: () => {} };
  }
}
