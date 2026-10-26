/* ==========================================================================
   EASTER-EGG.TS
   Konami code (↑ ↑ ↓ ↓ ← → ← → B A) toggles a full-screen Matrix-style
   digital rain overlay. Costs nothing until triggered; Esc or re-entering
   the code turns it back off.
   ========================================================================== */
import { reducedMotion } from './core';
import { unlockAchievement } from './memory';
import { showToast } from './interaction';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

let toggleMatrix = () => {};
export function triggerMatrixMode(){ toggleMatrix(); }

export function initKonamiCode(){
  const overlay = document.getElementById('matrixOverlay');
  const canvas = document.getElementById('matrixCanvas') as HTMLCanvasElement | null;
  if(!overlay || !canvas) return;

  let progress = 0;
  let active = false;
  let cleanup: (() => void) | null = null;

  function startRain(){
    if(reducedMotion){ showToast('Matrix mode skipped — reduced motion is on'); return; }
    const ctx = canvas!.getContext('2d');
    if(!ctx) return;
    const glyphs = 'アイウエオカキクケコサシスセソ01';
    let drops: number[] = [], w = 0, h = 0, rafId = 0;

    function size(){
      w = window.innerWidth; h = window.innerHeight;
      canvas!.width = w; canvas!.height = h;
      drops = new Array(Math.floor(w / 18)).fill(1);
    }
    size();
    window.addEventListener('resize', size);

    function draw(){
      ctx!.fillStyle = 'rgba(8,11,16,.08)';
      ctx!.fillRect(0, 0, w, h);
      ctx!.fillStyle = '#4bc9bb';
      ctx!.font = '16px monospace';
      drops.forEach((y, i) => {
        const text = glyphs[Math.floor(Math.random() * glyphs.length)];
        ctx!.fillText(text, i * 18, y * 18);
        if(y * 18 > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      });
      rafId = requestAnimationFrame(draw);
    }
    draw();

    cleanup = () => {
      window.removeEventListener('resize', size);
      cancelAnimationFrame(rafId);
    };
  }

  toggleMatrix = () => {
    active = !active;
    overlay.classList.toggle('is-active', active);
    overlay.setAttribute('aria-hidden', active ? 'false' : 'true');
    if(active){
      startRain();
      if(unlockAchievement('matrix', 'Matrix Mode')) showToast('🏆 Achievement Unlocked — Matrix Mode');
      else showToast('MATRIX MODE ENGAGED — press Esc to exit');
    } else {
      cleanup?.();
      cleanup = null;
      showToast('Matrix mode disengaged');
    }
  };

  document.addEventListener('keydown', (e) => {
    if(active && e.key === 'Escape'){ toggleMatrix(); return; }

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(key === KONAMI[progress]){
      progress++;
      if(progress === KONAMI.length){
        progress = 0;
        toggleMatrix();
      }
    } else {
      progress = (key === KONAMI[0]) ? 1 : 0;
    }
  });
}
