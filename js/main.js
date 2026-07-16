/* ==========================================================================
   MAIN.JS — core engine, loaded first (type="module").
   Exposes shared helpers so every other module (hero.js, interaction.js,
   theme.js, timeline.js, terminal.js) reads state from
   ONE place instead of each re-querying matchMedia / re-binding scroll.
   ========================================================================== */

/* ---- environment flags -------------------------------------------------- */
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isCoarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

/* ---- tiny pub/sub so unrelated modules can react to the same tick
   without each attaching its own scroll/resize listener ------------------- */
const listeners = { scroll: new Set(), resize: new Set() };
export function onScroll(fn){ listeners.scroll.add(fn); return () => listeners.scroll.delete(fn); }
export function onResize(fn){ listeners.resize.add(fn); return () => listeners.resize.delete(fn); }

/* ==========================================================================
   SCROLL CONTROLLER — the ONE scroll listener for the whole page.
   Drives: scroll-progress bar, nav blur, mobile nav hide/show, scrollspy.
   ========================================================================== */
(function scrollController(){
  const nav = document.querySelector('.site-nav');
  const progressBar = document.getElementById('scrollProgress');
  const sections = Array.from(document.querySelectorAll('main .section'));
  const navAnchors = Array.from(document.querySelectorAll('.nav-links a'));
  const mapAnchors = Array.from(document.querySelectorAll('.mini-map a'));

  let lastY = window.scrollY;
  let ticking = false;

  function update(){
    ticking = false;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if(progressBar) progressBar.style.width = pct + '%';

    if(nav){
      nav.classList.toggle('is-scrolled', scrollTop > 8);
      // mobile bottom bar: hide on scroll down, show on scroll up
      if(window.innerWidth <= 820){
        const goingDown = scrollTop > lastY && scrollTop > 80;
        nav.classList.toggle('nav-hidden', goingDown);
      } else {
        nav.classList.remove('nav-hidden');
      }
    }
    lastY = scrollTop;

    const viewportMid = scrollTop + window.innerHeight * 0.35;
    let currentId = sections[0] ? sections[0].id : null;
    for(const s of sections){ if(s.offsetTop <= viewportMid) currentId = s.id; }

    navAnchors.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + currentId ? 'true' : 'false'));
    mapAnchors.forEach(a => a.setAttribute('aria-current', a.dataset.map === currentId ? 'true' : 'false'));

    listeners.scroll.forEach(fn => fn({ scrollTop, pct, currentId }));
  }

  window.addEventListener('scroll', () => {
    if(!ticking){ requestAnimationFrame(update); ticking = true; }
  }, { passive:true });

  window.addEventListener('resize', () => {
    listeners.resize.forEach(fn => fn({ width: window.innerWidth, height: window.innerHeight }));
  }, { passive:true });

  update();
})();

/* ==========================================================================
   REVEAL-ON-SCROLL — single IntersectionObserver reused by every .reveal
   element across every section, instead of each section rolling its own.
   ========================================================================== */
(function scrollReveal(){
  const items = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window) || reducedMotion){
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold:0.12 });
  items.forEach(el => obs.observe(el));
})();

/* ==========================================================================
   PARTICLE FIELD — ambient constellation canvas, theme-reactive.
   Uses ResizeObserver on <body> instead of a debounced window resize,
   so it also recalculates if a browser sidebar/devtools panel changes
   the layout without a full window resize event firing.
   ========================================================================== */
(function particleField(){
  const canvas = document.getElementById('particle-canvas');
  if(!canvas) return;
  if(reducedMotion){ canvas.style.display = 'none'; return; }

  const ctx = canvas.getContext('2d');
  let w, h, dpr, points = [];
  const pointer = { x:null, y:null };
  let running = true, rafId;

  function sizeCanvas(){
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.max(24, Math.min(70, Math.floor((w * h) / 22000)));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18
    }));
  }

  function step(){
    if(!running) return;
    ctx.clearRect(0, 0, w, h);
    const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '139,131,238';

    for(const p of points){
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0 || p.x > w) p.vx *= -1;
      if(p.y < 0 || p.y > h) p.vy *= -1;
      if(pointer.x !== null){
        const dx = pointer.x - p.x, dy = pointer.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 140){ p.x -= dx * 0.0018; p.y -= dy * 0.0018; }
      }
    }
    for(let i = 0; i < points.length; i++){
      for(let j = i + 1; j < points.length; j++){
        const a = points[i], b = points[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if(d < 120){
          ctx.strokeStyle = `rgba(${accentRgb}, ${0.12 * (1 - d / 120)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
      ctx.fillStyle = `rgba(${accentRgb}, 0.5)`;
      ctx.beginPath(); ctx.arc(points[i].x, points[i].y, 1.4, 0, Math.PI * 2); ctx.fill();
    }
    rafId = requestAnimationFrame(step);
  }

  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive:true });
  window.addEventListener('pointerleave', () => { pointer.x = null; pointer.y = null; });

  const ro = new ResizeObserver(() => sizeCanvas());
  ro.observe(document.body);

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if(running) rafId = requestAnimationFrame(step);
    else cancelAnimationFrame(rafId);
  });

  sizeCanvas();
  rafId = requestAnimationFrame(step);
})();

/* ==========================================================================
   MOBILE NAV (bottom bar has no drawer to toggle, but desktop→mobile
   transition still needs body scroll-lock cleared defensively)
   ========================================================================== */
window.addEventListener('resize', () => {
  if(window.innerWidth > 820) document.body.style.overflow = '';
});
