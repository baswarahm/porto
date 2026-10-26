/* ==========================================================================
   UI.TS — small page-wide behaviours: reveal on scroll, active nav link,
   toast, the "open" pill on expandable rows, target filters, contact card.
   ========================================================================== */
import { $, reducedMotion } from './env';
import { profile, socials } from '../data/profile';

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string){
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

export function copyEmail(){
  navigator.clipboard?.writeText(profile.email)
    .then(() => toast(`copied ${profile.email}`))
    .catch(() => toast(profile.email));
}

export function initReveal(){
  let pending = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  if (reducedMotion){ pending.forEach(el => el.classList.add('in')); return; }
  // a plain position check rather than IntersectionObserver: a fast jump can
  // skip an element between two observer frames, but anything whose top has
  // passed 88% of the viewport (including everything above it) gets revealed
  let ticking = false;
  const check = () => {
    ticking = false;
    const line = innerHeight * .88;
    pending = pending.filter(el => {
      if (el.getBoundingClientRect().top > line) return true;
      el.classList.add('in');
      return false;
    });
    if (!pending.length) removeEventListener('scroll', onScroll);
  };
  const onScroll = () => { if (!ticking){ ticking = true; requestAnimationFrame(check); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  check();
}

/* ---- sections: rule draws in, heading decrypts, watermark drifts --------- */
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz<>/{}#';
function decrypt(el: HTMLElement){
  const final = el.textContent ?? '';
  if (reducedMotion || !final) return;
  const start = performance.now(), dur = 700;
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / dur), keep = Math.floor(t * final.length);
    el.textContent = final.slice(0, keep) + [...final.slice(keep)].map(ch => ch === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
    if (t < 1) requestAnimationFrame(frame); else el.textContent = final;
  };
  requestAnimationFrame(frame);
}

export function initSections(){
  let unseen = Array.from(document.querySelectorAll<HTMLElement>('section'));
  const markSeen = () => {
    unseen = unseen.filter(s => {
      if (s.getBoundingClientRect().top > innerHeight * .9) return true;
      s.classList.add('seen');
      return false;
    });
  };
  addEventListener('scroll', () => requestAnimationFrame(markSeen), { passive: true });
  markSeen();

  const heads = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    decrypt(e.target as HTMLElement);
    heads.unobserve(e.target);
  }), { threshold: 1 });
  document.querySelectorAll<HTMLElement>('.sec-head h2 .txt').forEach(h => heads.observe(h));

  if (reducedMotion) return;
  const marks = Array.from(document.querySelectorAll<HTMLElement>('.wm'));
  const lines = Array.from(document.querySelectorAll<HTMLElement>('.tl'));
  let ticking = false;
  const update = () => {
    ticking = false;
    for (const m of marks){
      const r = m.parentElement!.getBoundingClientRect();
      m.style.setProperty('--py', `${(r.top - innerHeight / 2) * -.12}px`);
    }
    // timeline lines fill as the timeline passes through the viewport
    for (const tl of lines){
      const r = tl.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (innerHeight * .8 - r.top) / r.height));
      tl.querySelector<HTMLElement>('.tl-line')?.style.setProperty('--p', p.toFixed(3));
    }
  };
  addEventListener('scroll', () => { if (!ticking){ ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/* ---- skills: filter by group, pin a skill, logo leans toward the cursor --- */
export function initSkills(){
  const grid = $('#skillGrid'), tools = $('#skTools');
  if (!grid || !tools) return;
  const tiles = Array.from(grid.querySelectorAll<HTMLButtonElement>('.skill'));

  tools.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chip');
    if (!btn) return;
    tools.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
    const g = btn.dataset.g!;
    tiles.forEach(t => t.classList.toggle('off', g !== 'all' && t.dataset.g !== g));
  });

  tiles.forEach(t => {
    t.setAttribute('aria-pressed', 'false');
    t.addEventListener('click', () => {
      const on = t.getAttribute('aria-pressed') !== 'true';
      tiles.forEach(x => x.setAttribute('aria-pressed', String(on && x === t)));
    });
    if (reducedMotion) return;
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - .5) * 14}px`);
      t.style.setProperty('--my', `${((e.clientY - r.top) / r.height - .5) * 14}px`);
    });
    t.addEventListener('pointerleave', () => { t.style.removeProperty('--mx'); t.style.removeProperty('--my'); });
  });
}

/* ---- keyboard cheat sheet ------------------------------------------------- */
export function initCheatSheet(rows: [string, string][]){
  const sheet = $('#sheet'), list = $('#sheetList');
  if (!sheet || !list) return { toggle: () => {} };
  for (const [k, d] of rows){
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    k.split(' ').forEach((part, i) => { if (i) dt.append(' '); const kb = document.createElement('kbd'); kb.textContent = part; dt.append(kb); });
    dd.textContent = d;
    list.append(dt, dd);
  }
  let last: Element | null = null;
  const close = () => { sheet.classList.remove('open'); (last as HTMLElement | null)?.focus?.(); };
  const toggle = () => {
    if (sheet.classList.contains('open')) return close();
    last = document.activeElement;
    sheet.classList.add('open');
    $('#sheetClose')?.focus();
  };
  $('#sheetClose')?.addEventListener('click', close);
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && sheet.classList.contains('open')) close(); });
  return { toggle };
}

/* ---- typing "sudo" anywhere ----------------------------------------------- */
export function initSudo(){
  let buf = '';
  addEventListener('keydown', e => {
    if ((e.target as HTMLElement).matches?.('input, textarea') || e.key.length !== 1) return;
    buf = (buf + e.key.toLowerCase()).slice(-4);
    if (buf === 'sudo'){ toast('nice try — baswara is not in the sudoers file. this incident will be reported.'); buf = ''; }
  });
}

/** lights the top-nav link for the section in view */
export function setActiveNav(id: string){
  document.querySelectorAll<HTMLElement>('[data-nav]').forEach(a => a.setAttribute('aria-current', String(a.dataset.nav === id)));
}

export function initPill(){
  const pill = $('#pill');
  if (!pill || matchMedia('(hover: none)').matches) return;
  let over: HTMLDetailsElement | null = null;
  addEventListener('pointermove', e => {
    const d = (e.target as HTMLElement).closest?.<HTMLDetailsElement>('[data-pill]') ?? null;
    if (d !== over){ over = d; pill.classList.toggle('show', !!d); }
    if (d){
      pill.textContent = d.open ? 'close ↑' : 'open ↓';
      pill.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
    }
  }, { passive: true });
  document.addEventListener('toggle', e => {
    if (e.target === over) pill.textContent = over!.open ? 'close ↑' : 'open ↓';
  }, true);
}

export function initTargets(){
  const tools = $('#tTools');
  tools?.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chip');
    if (!btn) return;
    const l = btn.dataset.l!;
    tools.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
    document.querySelectorAll<HTMLElement>('.issue').forEach(i => i.classList.toggle('hide', l !== 'all' && i.dataset.l !== l));
  });
}

export function initContact(){
  const avail = $('#avail');
  if (avail){
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => {
      const t = fmt.format(new Date()), h = +t.slice(0, 2);
      const awake = h >= 6 && h < 23;
      avail.classList.toggle('away', !awake);
      avail.querySelector('span')!.textContent = awake
        ? `${t} in Penang · usually replies within a day`
        : `${t} in Penang · asleep, will reply in the morning`;
    };
    tick(); setInterval(tick, 30_000);
  }
  $('#copyEmail')?.addEventListener('click', copyEmail);
  $('#vcard')?.addEventListener('click', () => {
    const linkedin = socials.find(s => s.label === 'linkedin')?.href;
    const [first, ...rest] = profile.name.split(' ');
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${rest.join(' ')};${first};;;`, `FN:${profile.name}`, `TITLE:${profile.title}`,
      `EMAIL;TYPE=INTERNET:${profile.email}`, ...(linkedin ? [`URL:${linkedin}`] : []), 'END:VCARD'];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/vcard' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: profile.name.replace(/ /g, '-') + '.vcf' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('contact card downloaded');
  });
}
