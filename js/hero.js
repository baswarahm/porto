/* ==========================================================================
   HERO.JS — decrypt tagline, XP bar, live clock.
   Full hero rebuild (parallax bg, animated stats, floating badges) lands
   in Step 2; this ports the working v1 hero logic into the new module
   structure without regressions.
   ========================================================================== */
import { reducedMotion, onScroll } from './main.js';

export function initDecryptTagline(){
  const el = document.getElementById('decryptTagline');
  if(!el) return;
  const finalText = 'Computer Science (Intelligent Computing) · USM';
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
    el.textContent = out;
    if(frame < totalFrames){ requestAnimationFrame(tick); }
    else{
      el.textContent = finalText;
      const caret = document.createElement('span');
      caret.className = 'cursor-caret';
      caret.setAttribute('aria-hidden', 'true');
      el.appendChild(caret);
    }
  }
  requestAnimationFrame(tick);
}

export function initXpBar(){
  const fill = document.getElementById('xpFill');
  const label = document.getElementById('xpPercentLabel');
  if(!fill || !label) return;

  const start = new Date('2026-09-01T00:00:00+08:00').getTime();
  const end = new Date('2027-06-30T00:00:00+08:00').getTime();
  const now = Date.now();
  let pct;
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
  }, { threshold:0.4 });
  obs.observe(fill.closest('.hero-xp'));
}

export function initLiveClock(){
  const el = document.getElementById('hudClock');
  if(!el) return;
  function tick(){
    const wib = new Intl.DateTimeFormat('en-GB', {
      timeZone:'Asia/Jakarta', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }).format(new Date());
    el.textContent = wib + ' WIB';
  }
  tick();
  setInterval(tick, 1000);
}

/* --------------------------------------------------------------------------
   Parallax — the avatar + floating badges drift opposite to scroll,
   using the shared scroll controller from main.js (no extra listener).
   Uses a tiny fraction of scroll distance so it reads as depth, not motion
   sickness, and is fully skipped under reduced-motion.
   -------------------------------------------------------------------------- */
export function initHeroParallax(){
  if(reducedMotion) return;
  const target = document.querySelector('[data-parallax]');
  const hero = document.getElementById('hero');
  if(!target || !hero) return;

  onScroll(({ scrollTop }) => {
    // only animate while the hero is plausibly in view — cheap guard
    // against transforming an element far off-screen every frame
    if(scrollTop > hero.offsetHeight * 1.5) return;
    const offset = Math.min(scrollTop * 0.15, 60);
    target.style.transform = `translateY(${offset}px)`;
  });
}

/* --------------------------------------------------------------------------
   Stat counters — counts up from 0 to the real, honest number in
   data-count-to once the row scrolls into view. No invented metrics:
   these three numbers are the exact totals from the Achievements and
   Quest Log sections (10 results, 4 arenas, 2 years of council roles).
   -------------------------------------------------------------------------- */
export function initHeroStats(){
  const nums = document.querySelectorAll('.hero-stat-num');
  if(!nums.length) return;

  function animateCount(el){
    const target = parseInt(el.dataset.countTo, 10) || 0;
    if(reducedMotion){ el.textContent = target; return; }
    const duration = 900;
    const startTime = performance.now();
    function tick(now){
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      el.textContent = Math.round(eased * target);
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        animateCount(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold:0.6 });
  nums.forEach(n => obs.observe(n));
}

/* --------------------------------------------------------------------------
   Scroll indicator — bounces at the base of the hero, click/Enter smooth-
   scrolls to About, and hides itself once the person has actually scrolled
   so it doesn't linger over content lower on the page.
   -------------------------------------------------------------------------- */
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
