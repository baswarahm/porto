/* ==========================================================================
   HERO.TS — decrypt tagline, XP bar, live clock, parallax, stat counters,
   scroll indicator.
   ========================================================================== */
import { reducedMotion, onScroll } from './core';

export function initDecryptTagline(){
  const el = document.getElementById('decryptTagline');
  if(!el) return;
  const finalText = el.dataset.text || '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01#$%&';

  if(reducedMotion){ el.textContent = finalText; return; }

  let frame = 0;
  const totalFrames = finalText.length * 3;

  function tick(){
    frame++;
    const revealed = Math.floor((frame / totalFrames) * finalText.length);
    let out = '';
    for(let i = 0; i < finalText.length; i++){
      if(finalText[i] === ' '){ out += ' '; continue; }
      out += i < revealed ? finalText[i] : chars[Math.floor(Math.random() * chars.length)];
    }
    el!.textContent = out;
    if(frame < totalFrames){ requestAnimationFrame(tick); }
    else{
      el!.textContent = finalText;
      const caret = document.createElement('span');
      caret.className = 'cursor-caret';
      caret.setAttribute('aria-hidden', 'true');
      el!.appendChild(caret);
    }
  }
  requestAnimationFrame(tick);
}

export function initXpBar(){
  const fill = document.getElementById('xpFill');
  const label = document.getElementById('xpPercentLabel');
  const wrap = fill?.closest('.hero-xp');
  if(!fill || !label || !wrap) return;

  const start = new Date('2026-09-01T00:00:00+08:00').getTime();
  const end = new Date('2027-06-30T00:00:00+08:00').getTime();
  const now = Date.now();
  let pct: number;
  if(now < start) pct = 0;
  else if(now > end) pct = 100;
  else pct = Math.round(((now - start) / (end - start)) * 100);

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        fill.style.width = pct + '%';
        label.textContent = pct + '%';
        obs.disconnect();
      }
    });
  }, { threshold: 0.4 });
  obs.observe(wrap);
}

export function initLiveClock(){
  const el = document.getElementById('hudClock');
  if(!el) return;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const tick = () => { el.textContent = fmt.format(new Date()) + ' WIB'; };
  tick();
  setInterval(tick, 1000);
}

/* Parallax — the avatar + floating badges drift opposite to scroll, using
   the shared scroll controller. Skipped under reduced-motion. */
export function initHeroParallax(){
  if(reducedMotion) return;
  const target = document.querySelector<HTMLElement>('[data-parallax]');
  const hero = document.getElementById('hero');
  if(!target || !hero) return;

  onScroll(({ scrollTop }) => {
    if(scrollTop > hero.offsetHeight * 1.5) return;
    const offset = Math.min(scrollTop * 0.15, 60);
    target.style.transform = `translateY(${offset}px)`;
  });
}

/* Stat counters — count up from 0 to data-count-to once in view. */
export function initHeroStats(){
  const nums = document.querySelectorAll<HTMLElement>('.hero-stat-num');
  if(!nums.length) return;

  function animateCount(el: HTMLElement){
    const target = parseInt(el.dataset.countTo || '0', 10) || 0;
    if(reducedMotion){ el.textContent = String(target); return; }
    const duration = 900;
    const startTime = performance.now();
    function tick(now: number){
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      el.textContent = String(Math.round(eased * target));
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animateCount(entry.target as HTMLElement);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  nums.forEach(n => obs.observe(n));
}

/* Scroll indicator — click scrolls to About, fades once the visitor scrolls. */
export function initScrollIndicator(){
  const btn = document.getElementById('scrollIndicator');
  const about = document.getElementById('about');
  if(!btn || !about) return;

  btn.addEventListener('click', () => {
    about.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  onScroll(({ scrollTop }) => {
    btn.classList.toggle('is-faded', scrollTop > 80);
  });
}
