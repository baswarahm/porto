/* ==========================================================================
   MELT.TS — panels made of particles.
   When you scroll away from a section, its panel breaks into particles that
   stream back into its host in the 3D world; when you reach the next one,
   particles stream out of that host and assemble its panel, which then
   fades in for real.
   The particles are sampled from the panel itself: every visible line of
   text (in its own colour) and the panel's outline, so the swarm has the
   panel's actual shape. A 2D canvas over the world draws them.
   Reduced motion: none of this; panels just stay put.
   ========================================================================== */
type P = { fx: number; fy: number; tx: number; ty: number; cx: number; cy: number; c: string; d: number; s: number };
type Job = { ps: P[]; t0: number; dur: number; kind: 'in' | 'out'; el: HTMLElement; done: boolean };

const MAX = 2400;

export function createMelt(){
  const cv = document.createElement('canvas');
  cv.className = 'melt-cv'; cv.setAttribute('aria-hidden', 'true');
  document.body.append(cv);
  const g = cv.getContext('2d')!;
  let jobs: Job[] = [], raf = 0, W = 0, H = 0, dpr = 1;
  const size = () => { dpr = Math.min(2, devicePixelRatio); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; };
  size(); addEventListener('resize', size);

  /** points that trace what's visible of a panel: each text line, in its colour, and the panel's outline */
  const sample = (el: HTMLElement) => {
    const out: { x: number; y: number; c: string }[] = [];
    const box = el.getBoundingClientRect();
    const top = Math.max(0, box.top), bot = Math.min(H, box.bottom);
    if (bot - top < 20) return out;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent!.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const range = document.createRange();
    for (let n = walker.nextNode(); n && out.length < MAX * .8; n = walker.nextNode()){
      const par = n.parentElement!; const cs = getComputedStyle(par);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()){
        if (r.bottom < top || r.top > bot || r.width < 2) continue;
        const step = Math.max(3, r.height * .32);
        // a couple of rows across the line, like the letters' bodies
        for (let x = r.left; x < r.right; x += step){
          out.push({ x: x + Math.random() * step * .6, y: r.top + r.height * (.35 + Math.random() * .35), c: cs.color });
          if (r.height > 20 && Math.random() < .55) out.push({ x: x + Math.random() * step, y: r.top + r.height * (.2 + Math.random() * .6), c: cs.color });
        }
      }
    }
    // the outline of the visible part of the panel
    const edge = getComputedStyle(document.documentElement).getPropertyValue('--lime').trim() || '#c6ff3d';
    for (let x = box.left; x < box.right; x += 9){ if (box.top >= 0) out.push({ x, y: box.top, c: edge }); if (box.bottom <= H) out.push({ x, y: box.bottom, c: edge }); }
    for (let y = top; y < bot; y += 9){ out.push({ x: box.left, y, c: edge }); out.push({ x: box.right, y, c: edge }); }
    // thin it evenly if there are too many
    if (out.length > MAX){ const k = out.length / MAX; return out.filter((_, i) => Math.floor(i / k) !== Math.floor((i - 1) / k)); }
    return out;
  };

  const loop = (now: number) => {
    raf = 0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    for (const j of jobs){
      const u = (now - j.t0) / j.dur;
      for (const p of j.ps){
        const k = Math.min(1, Math.max(0, (u - p.d) / (1 - p.d * .9)));
        if (k <= 0 && j.kind === 'in') continue;
        const e = j.kind === 'in' ? 1 - Math.pow(1 - k, 3) : k * k * (3 - 2 * k);
        // a curved flight: from → control → to
        const a = 1 - e, x = a * a * p.fx + 2 * a * e * p.cx + e * e * p.tx, y = a * a * p.fy + 2 * a * e * p.cy + e * e * p.ty;
        const alpha = j.kind === 'in' ? Math.min(1, k * 3) * (u > .85 ? Math.max(0, (1.05 - u) / .2) : 1) : 1 - e * .85;
        const s = j.kind === 'in' ? p.s * (.4 + e * .6) : p.s * (1 - e * .7);
        g.globalAlpha = alpha; g.fillStyle = p.c; g.fillRect(x - s / 2, y - s / 2, s, s);
      }
      // assembling: the real panel fades in under the particles near the end
      if (j.kind === 'in' && u > .6 && !j.done){ j.done = true; j.el.classList.remove('melt-hide'); }
    }
    g.globalAlpha = 1;
    jobs = jobs.filter(j => now - j.t0 < j.dur + 80);
    if (jobs.length) raf = requestAnimationFrame(loop);
  };
  const run = (j: Job) => { jobs = jobs.filter(o => o.el !== j.el); jobs.push(j); if (!raf) raf = requestAnimationFrame(loop); };
  const ctrl = (ax: number, ay: number, bx: number, by: number) => {
    const mx = (ax + bx) / 2, my = (ay + by) / 2, dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const bend = (Math.random() - .5) * len * .7;
    return { cx: mx - dy / len * bend, cy: my + dx / len * bend - len * .15 };
  };

  return {
    /** the panel breaks up and streams into (x, y): its host on screen */
    leave(el: HTMLElement, to: { x: number; y: number }){
      const pts = sample(el);
      el.classList.add('melt-hide');
      if (!pts.length) return;
      run({ kind: 'out', el, t0: performance.now(), dur: 950, done: true, ps: pts.map(p => {
        const tx = to.x + (Math.random() - .5) * 26, ty = to.y + (Math.random() - .5) * 26;
        return { fx: p.x, fy: p.y, tx, ty, ...ctrl(p.x, p.y, tx, ty), c: p.c, d: Math.random() * .35 + (p.y - to.y) / H * .1, s: 2.2 };
      }) });
    },
    /** hide a panel without any animation (it'll assemble when you get there) */
    hide(el: HTMLElement){ el.classList.add('melt-hide'); },
    /** particles stream out of (x, y) and assemble the panel, which then fades in */
    form(el: HTMLElement, from: { x: number; y: number }){
      const pts = sample(el);
      if (!pts.length){ el.classList.remove('melt-hide'); return; }
      run({ kind: 'in', el, t0: performance.now(), dur: 1000, done: false, ps: pts.map(p => {
        const fx = from.x + (Math.random() - .5) * 30, fy = from.y + (Math.random() - .5) * 30;
        return { fx, fy, tx: p.x, ty: p.y, ...ctrl(fx, fy, p.x, p.y), c: p.c, d: Math.random() * .3, s: 2.4 };
      }) });
    },
    show(el: HTMLElement){ el.classList.remove('melt-hide'); },
  };
}
