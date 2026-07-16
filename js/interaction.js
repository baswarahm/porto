/* ==========================================================================
   INTERACTION.JS
   v1 had cursor-follow, magnetic buttons, and tilt cards each register
   their own `mousemove` listener doing independent trig. This module
   reads pointer position once per frame and drives all three from it.
   ========================================================================== */
import { reducedMotion, isCoarsePointer } from './main.js';

export function initCursorFx(){
  if(isCoarsePointer) return;
  document.body.classList.add('has-pointer');

  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  const spot = document.getElementById('spotlight');
  const magneticEls = document.querySelectorAll('[data-magnetic]');
  const tiltEls = document.querySelectorAll('[data-tilt]');

  let px = 0, py = 0;   // raw pointer position
  let rx = 0, ry = 0;   // eased ring position
  let hoveredMagnetic = null;
  let hoveredTilt = null;

  window.addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if(dot){ dot.style.left = px + 'px'; dot.style.top = py + 'px'; }
    if(spot){ spot.style.setProperty('--spot-x', px + 'px'); spot.style.setProperty('--spot-y', py + 'px'); }
  }, { passive:true });

  document.querySelectorAll('a,button,[data-magnetic],[data-tilt]').forEach(el => {
    el.addEventListener('mouseenter', () => ring?.classList.add('is-active'));
    el.addEventListener('mouseleave', () => ring?.classList.remove('is-active'));
  });

  magneticEls.forEach(el => {
    el.addEventListener('mouseenter', () => hoveredMagnetic = el);
    el.addEventListener('mouseleave', () => { hoveredMagnetic = null; el.style.transform = ''; });
  });
  tiltEls.forEach(el => {
    el.addEventListener('mouseenter', () => hoveredTilt = el);
    el.addEventListener('mouseleave', () => { hoveredTilt = null; el.style.transform = ''; });
  });

  function frame(){
    // ring easing
    rx += (px - rx) * 0.18;
    ry += (py - ry) * 0.18;
    if(ring){ ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }

    if(!reducedMotion && hoveredMagnetic){
      const r = hoveredMagnetic.getBoundingClientRect();
      const x = (px - r.left - r.width / 2) * 0.25;
      const y = (py - r.top - r.height / 2) * 0.35;
      hoveredMagnetic.style.transform = `translate(${x}px,${y}px)`;
    }
    if(!reducedMotion && hoveredTilt){
      const r = hoveredTilt.getBoundingClientRect();
      const rxPct = (px - r.left) / r.width - 0.5;
      const ryPct = (py - r.top) / r.height - 0.5;
      hoveredTilt.style.transform = `perspective(600px) rotateX(${ryPct * -6}deg) rotateY(${rxPct * 6}deg)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function initRipples(){
  if(reducedMotion) return;
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const r = document.createElement('span');
      Object.assign(r.style, {
        position:'absolute', borderRadius:'50%', background:'rgba(255,255,255,.35)',
        transform:'scale(0)', transition:'transform .6s cubic-bezier(.16,.8,.24,1), opacity .6s ease',
        left:(e.offsetX - 10) + 'px', top:(e.offsetY - 10) + 'px', width:'20px', height:'20px',
        pointerEvents:'none'
      });
      btn.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(4.5)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 650);
    });
  });
}

export function showToast(msg){
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if(!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.add('is-shown');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('is-shown'), 2600);
}

export function confettiBurstAt(rect){
  if(reducedMotion) return;
  const colors = [getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), '#4bc9bb', '#d1a24e'];
  for(let i = 0; i < 28; i++){
    const p = document.createElement('div');
    const size = Math.random() * 6 + 4;
    Object.assign(p.style, {
      position:'fixed', left:(rect.left + Math.random() * rect.width) + 'px',
      top:(rect.top + Math.random() * 20) + 'px', width:size + 'px', height:size + 'px',
      borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      background: colors[Math.floor(Math.random() * colors.length)],
      zIndex:'9999', pointerEvents:'none', transition:'transform 800ms ease-out, opacity 800ms ease-out'
    });
    document.body.appendChild(p);
    const dx = (Math.random() - 0.5) * 180, dy = Math.random() * -120 - 40;
    requestAnimationFrame(() => {
      p.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.random() * 360}deg)`;
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 900);
  }
}

export function copyToClipboard(text, { successMsg, celebrateRect } = {}){
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast(successMsg || (text + ' copied to clipboard'));
        if(celebrateRect) confettiBurstAt(celebrateRect);
      })
      .catch(() => showToast('Copy failed — value is ' + text));
  } else {
    showToast('Value is ' + text);
  }
}

export function initCopyEmail(){
  const btn = document.getElementById('copyEmailBtn');
  if(!btn) return; // contact section is now the terminal (see terminal.js) — kept for backward compatibility
  const email = 'baswarahafizh@gmail.com';
  btn.addEventListener('click', () => copyToClipboard(email, { successMsg:'Email copied to clipboard', celebrateRect: btn.getBoundingClientRect() }));
}

export function initToTop(){
  document.getElementById('toTopBtn')?.addEventListener('click', () => {
    window.scrollTo({ top:0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
}

/* --------------------------------------------------------------------------
   Contact card — generates a standard .vcf file client-side (no server, no
   dependency) so a recruiter can tap once and get a real contact saved to
   their phone/desktop instead of retyping an email address by hand.
   -------------------------------------------------------------------------- */
const VCARD_EMAIL = 'baswarahafizh@gmail.com';

export function downloadVCard(){
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Muttaqin;Baswara Hafizh;;;',
    'FN:Baswara Hafizh Muttaqin',
    'TITLE:CS (Intelligent Computing) Student — USM',
    `EMAIL;TYPE=INTERNET:${VCARD_EMAIL}`,
    'URL:https://www.linkedin.com/in/baswara-hafizh-muttaqin-68a7b4329/',
    'NOTE:Found via IBAS.SYS portfolio.',
    'END:VCARD'
  ];
  const blob = new Blob([lines.join('\r\n')], { type:'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Baswara-Hafizh-Muttaqin.vcf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Contact card downloaded 📇');
}

export function initVCard(){
  document.querySelectorAll('.vcard-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      downloadVCard();
      confettiBurstAt(e.currentTarget.getBoundingClientRect());
    });
  });
}
