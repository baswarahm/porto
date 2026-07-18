/* ==========================================================================
   BOOT.JS — Launch Sequence
   Plays once per browser SESSION (sessionStorage — survives a refresh,
   cleared when the tab/browser session ends). Returning visitors (per the
   AI Memory record in localStorage) get a sub-second "Welcome Back" beat
   instead of the full 4-phase boot. Skippable at any time via click/key.
   Total runtime is kept comfortably under 3s (full) / 1s (welcome-back).
   ========================================================================== */

import { reducedMotion } from './main.js';

const SESSION_KEY = 'baswara_boot_played';
const WELCOME_LINES = ['WELCOME TO MY PORTFOLIO!', 'MISSION READY.'];
const LOG_LINES = [
  'Loading Assets…', 'Initializing Interface…', 'Rendering Experience…',
  'Preparing Portfolio…', 'Connecting Systems…', 'Calibrating HUD…'
];

function alreadyPlayed(){
  try{ return sessionStorage.getItem(SESSION_KEY) === '1'; }catch(e){ return false; }
}
function markPlayed(){
  try{ sessionStorage.setItem(SESSION_KEY, '1'); }catch(e){ /* private mode — non-fatal */ }
}

function particleBurst(canvas){
  if(!canvas || reducedMotion) return () => {};
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = '100%'; canvas.style.height = '100%';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const accentRgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '139,131,238';
  const particles = Array.from({ length: 40 }, () => {
    const angle = Math.random() * Math.PI * 2, speed = 0.5 + Math.random() * 2;
    return { x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, size: 1 + Math.random() * 2 };
  });
  let rafId, start = null;
  function step(ts){
    if(start === null) start = ts;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.012;
      if(p.life > 0){
        ctx.fillStyle = `rgba(${accentRgb}, ${p.life * 0.8})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    });
    if(ts - start < 1600){ rafId = requestAnimationFrame(step); }
  }
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}

function finishFullBoot(overlay, html, onComplete){
  overlay.classList.add('is-leaving');
  html.classList.remove('boot-preblur');
  html.classList.add('boot-revealing');
  setTimeout(() => {
    overlay.remove();
    html.classList.remove('boot-revealing');
    onComplete?.();
  }, 720);
}

function playFullBoot(overlay, onComplete){
  const html = document.documentElement;
  html.classList.add('boot-preblur');
  overlay.hidden = false;

  const phase1 = overlay.querySelector('[data-phase="1"]');
  const phase2 = overlay.querySelector('[data-phase="2"]');
  const phase3 = overlay.querySelector('[data-phase="3"]');
  const logList = document.getElementById('bootLoglines');
  const welcomeEl = document.getElementById('bootWelcome');
  const particlesCanvas = document.getElementById('bootParticles');

  logList.innerHTML = '';
  LOG_LINES.forEach(text => {
    const li = document.createElement('li');
    li.textContent = text;
    logList.appendChild(li);
  });
  welcomeEl.textContent = WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)];

  let done = false;
  const timers = [];
  const clearAll = () => timers.forEach(clearTimeout);

  function finish(){
    if(done) return;
    done = true;
    clearAll();
    cleanupListeners();
    finishFullBoot(overlay, html, onComplete);
  }
  function onSkip(){ finish(); }
  function cleanupListeners(){
    overlay.removeEventListener('click', onSkip);
    document.removeEventListener('keydown', onSkip);
  }
  overlay.addEventListener('click', onSkip);
  document.addEventListener('keydown', onSkip);

  phase1.classList.add('is-active');

  timers.push(setTimeout(() => {
    phase1.classList.remove('is-active');
    phase2.classList.add('is-active');
    const lines = logList.querySelectorAll('li');
    lines.forEach((li, i) => timers.push(setTimeout(() => li.classList.add('is-shown'), 70 * i)));

    timers.push(setTimeout(() => {
      phase2.classList.remove('is-active');
      phase3.classList.add('is-active');
      particleBurst(particlesCanvas);
    }, 70 * lines.length + 260));
  }, 480));

  // hard stop — guarantees the whole thing (incl. the reveal transition)
  // never runs long, and always resolves even if a phase timer misfires.
  timers.push(setTimeout(finish, 1850));
}

function playWelcomeBack(overlay, onComplete){
  overlay.hidden = false;
  overlay.classList.add('mode-welcome-back');
  overlay.innerHTML = '';
  const text = document.createElement('p');
  text.className = 'boot-welcome-back-text';
  text.textContent = 'WELCOME BACK';
  overlay.appendChild(text);

  let done = false;
  function finish(){
    if(done) return;
    done = true;
    cleanupListeners();
    overlay.classList.add('is-leaving');
    setTimeout(() => { overlay.remove(); onComplete?.(); }, 260);
  }
  function onSkip(){ finish(); }
  function cleanupListeners(){
    overlay.removeEventListener('click', onSkip);
    document.removeEventListener('keydown', onSkip);
  }
  overlay.addEventListener('click', onSkip);
  document.addEventListener('keydown', onSkip);

  requestAnimationFrame(() => overlay.classList.add('is-shown'));
  setTimeout(finish, 480); // whole beat lands well under 1s
}

/**
 * @param {Object} opts
 * @param {boolean} opts.isReturning — from AI Memory: has this browser visited before?
 * @param {Function} [opts.onComplete]
 */
export function runBootSequence({ isReturning = false, onComplete } = {}){
  const overlay = document.getElementById('bootSequence');
  if(!overlay){ onComplete?.(); return; }

  if(alreadyPlayed()){
    overlay.remove();
    onComplete?.();
    return;
  }
  markPlayed();

  if(reducedMotion){
    overlay.remove();
    onComplete?.();
    return;
  }

  if(isReturning) playWelcomeBack(overlay, onComplete);
  else playFullBoot(overlay, onComplete);
}
