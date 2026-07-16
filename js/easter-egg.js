/* ==========================================================================
   EASTER-EGG.JS
   Konami code (↑ ↑ ↓ ↓ ← → ← → B A) toggles a full-screen Matrix-style
   digital rain overlay. Purely a delight feature — costs zero performance
   until triggered, and Esc or re-entering the code turns it back off.
   ========================================================================== */
import { reducedMotion } from './main.js';
import { unlockAchievement } from './memory.js';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

let toggleMatrix = () => {};
export function triggerMatrixMode(){ toggleMatrix(); }

export function initKonamiCode(){
  const overlay = document.getElementById('matrixOverlay');
  const canvas = document.getElementById('matrixCanvas');
  if(!overlay || !canvas) return;

  let progress = 0;
  let active = false;
  let rafId = null;

  function showToast(msg){
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if(!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.add('is-shown');
    setTimeout(() => toast.classList.remove('is-shown'), 2200);
  }

  function startRain(){
    if(reducedMotion){ showToast('Matrix mode skipped — reduced motion is on'); return; }
    const ctx = canvas.getContext('2d');
    const glyphs = 'アイウエオカキクケコサシスセソ01';
    let cols, drops, w, h;

    function size(){
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w; canvas.height = h;
      cols = Math.floor(w / 18);
      drops = new Array(cols).fill(1);
    }
    size();
    const onResize = () => size();
    window.addEventListener('resize', onResize);

    function draw(){
      ctx.fillStyle = 'rgba(8,11,16,.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#4bc9bb';
      ctx.font = '16px monospace';
      drops.forEach((y, i) => {
        const text = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx.fillText(text, i * 18, y * 18);
        if(y * 18 > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      rafId = requestAnimationFrame(draw);
    }
    draw();

    overlay._cleanup = () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(rafId);
    };
  }

  function toggleMatrixInternal(){
    active = !active;
    overlay.classList.toggle('is-active', active);
    overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
    if(active){
      startRain();
      if(unlockAchievement('matrix', 'Matrix Mode')) showToast('🏆 Achievement Unlocked — Matrix Mode');
      else showToast('MATRIX MODE ENGAGED — press Esc to exit');
    } else {
      overlay._cleanup?.();
      showToast('Matrix mode disengaged');
    }
  }
  toggleMatrix = toggleMatrixInternal; // expose to triggerMatrixMode() for the terminal's 'matrix' command

  document.addEventListener('keydown', (e) => {
    if(active && e.key === 'Escape'){ toggleMatrixInternal(); return; }

    const expected = KONAMI[progress];
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(key === expected){
      progress++;
      if(progress === KONAMI.length){
        progress = 0;
        toggleMatrixInternal();
      }
    } else {
      progress = (key === KONAMI[0]) ? 1 : 0;
    }
  });
}
