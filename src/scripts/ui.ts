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
  const items = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)){ items.forEach(el => el.classList.add('in')); return; }
  const obs = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); }
  }), { threshold: .15 });
  items.forEach(el => obs.observe(el));
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
