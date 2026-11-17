/* ==========================================================================
   UX.TS — helping people find their way around the 3D page:
     · boot      a short terminal boot while the world loads (once per visit,
                 any key skips, it never waits longer than ~3s)
     · tour      four quick cards on the first visit: scroll, look, keys, map
                 (skip any time; `tour` in the terminal replays it)
     · minimap   a rail of hosts on the right edge: where you are, click to jump
     · fx panel  quality high / low, motion full / reduced, replay the tour
     · ripples   a ring where you click a key or link
     · arrival   when the camera settles on a section, a scan line sweeps its
                 panel and its note types itself out (first time only)
     · my name   click it: the letters fly apart and the 3D network shatters
   ========================================================================== */
import { reducedMotion, setReducedMotion, quality, setQuality, store, WORLD, emit, MOTION_EVENT, QUALITY_EVENT, type Quality } from './env';

const LABELS: Record<string, string> = { top: 'profile', network: 'network', progress: 'progress', now: 'now', targets: 'goals', projects: 'projects', journey: 'journey', contact: 'contact', root: 'root' };

const STEPS = [
  { k: '01 · move', t: 'Scroll to fly', b: 'This page is one 3D world. Scrolling flies the camera from host to host, and every section lives on one machine of my network.' },
  { k: '02 · look', t: 'Look around', b: 'Drag empty space to look around. Hover a glowing host to scan it and click it to fly there. At the top, click the firewall to break it, or click my name.' },
  { k: '03 · keys', t: 'Use the keys', b: '~ opens a terminal (try nmap, breach or sudo su). j / k jump between sections, / searches the course map, ? lists every key.' },
  { k: '04 · map', t: 'Never get lost', b: 'The rail on the right shows where you are; click a dot to jump. The fx key up top sets quality and motion if your device struggles.' },
];

export function initUx(){
  const html = document.documentElement;
  const zones = Array.from(document.querySelectorAll<HTMLElement>('.zone[data-stage]'));
  const isHome = !!document.getElementById('world');

  /* ---- tour ---------------------------------------------------------------------------------------------------- */
  let tourEl: HTMLElement | null = null;
  const closeTour = () => {
    if (!tourEl) return;
    store.set('bhm-tour', 'seen');
    const el = tourEl; tourEl = null;
    el.classList.add('out'); setTimeout(() => el.remove(), reducedMotion ? 0 : 300);
    removeEventListener('keydown', tourKeys, true);
  };
  const tourKeys = (e: KeyboardEvent) => {
    if (!tourEl) return;
    if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeTour(); }
    else if (e.key === 'ArrowRight'){ e.stopPropagation(); tourEl.querySelector<HTMLButtonElement>('[data-next]')?.click(); }
    else if (e.key === 'ArrowLeft'){ e.stopPropagation(); tourEl.querySelector<HTMLButtonElement>('[data-back]')?.click(); }
  };
  const openTour = () => {
    if (tourEl || !isHome) return;
    let n = 0;
    tourEl = document.createElement('div');
    tourEl.className = 'tour'; tourEl.setAttribute('role', 'dialog'); tourEl.setAttribute('aria-modal', 'false'); tourEl.setAttribute('aria-labelledby', 'tourT');
    tourEl.innerHTML = `<div class="tour-card b-win"><p class="tour-k"></p><h2 id="tourT"></h2><p class="tour-b"></p>
      <div class="tour-dots" aria-hidden="true">${STEPS.map(() => '<i></i>').join('')}</div>
      <div class="tour-act"><button type="button" class="key" data-skip><span>skip</span></button><span></span>
        <button type="button" class="key" data-back><span>back</span></button><button type="button" class="key tour-next" data-next><span>next</span></button></div></div>`;
    document.body.append(tourEl);
    const el = tourEl;
    const show = () => {
      const st = STEPS[n];
      el.querySelector('.tour-k')!.textContent = st.k;
      el.querySelector('#tourT')!.textContent = st.t;
      el.querySelector('.tour-b')!.textContent = st.b;
      el.querySelectorAll('.tour-dots i').forEach((d, i) => d.classList.toggle('on', i === n));
      (el.querySelector('[data-back]') as HTMLButtonElement).disabled = n === 0;
      el.querySelector('[data-next] span')!.textContent = n === STEPS.length - 1 ? 'got it' : 'next';
      el.querySelector('.tour-card')!.classList.remove('flip'); void (el.querySelector('.tour-card') as HTMLElement).offsetWidth;
      el.querySelector('.tour-card')!.classList.add('flip');
    };
    el.querySelector('[data-skip]')!.addEventListener('click', closeTour);
    el.querySelector('[data-back]')!.addEventListener('click', () => { if (n > 0){ n--; show(); } });
    el.querySelector('[data-next]')!.addEventListener('click', () => { if (n < STEPS.length - 1){ n++; show(); } else closeTour(); });
    addEventListener('keydown', tourKeys, true);
    show();
    setTimeout(() => el.querySelector<HTMLButtonElement>('[data-next]')?.focus({ preventScroll: true }), 50);
  };
  addEventListener('tour', openTour);

  /* ---- boot ---------------------------------------------------------------------------------------------------- */
  const boot = document.querySelector<HTMLElement>('.boot');
  const afterBoot = () => { if (isHome && !store.get('bhm-tour')) setTimeout(openTour, 450); };
  if (boot && html.classList.contains('booting')){
    const t0 = performance.now();
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try { sessionStorage.setItem('bhm-boot', '1'); } catch { /* fine */ }
      boot.classList.add('out');
      setTimeout(() => { html.classList.remove('booting'); afterBoot(); }, reducedMotion ? 0 : 420);
      removeEventListener('keydown', finish); removeEventListener('pointerdown', finish);
    };
    // at least long enough to read a line or two, never longer than ~3s
    addEventListener(WORLD.ready, () => setTimeout(finish, Math.max(0, 900 - (performance.now() - t0))), { once: true });
    setTimeout(finish, 3000);
    addEventListener('keydown', finish); addEventListener('pointerdown', finish);
  } else afterBoot();

  /* ---- minimap ------------------------------------------------------------------------------------------------- */
  if (zones.length > 2){
    const nav = document.createElement('nav');
    nav.className = 'minimap'; nav.setAttribute('aria-label', 'Where you are');
    nav.innerHTML = `<span class="mm-fill" aria-hidden="true"></span>` + zones.map((z, i) =>
      `<button type="button" data-z="${i}" aria-label="Go to ${LABELS[z.id] ?? z.id}"><i></i><span>${String(i).padStart(2, '0')} ${LABELS[z.id] ?? z.id}</span></button>`).join('');
    document.body.append(nav);
    const dots = Array.from(nav.querySelectorAll<HTMLButtonElement>('button'));
    dots.forEach(b => b.addEventListener('click', () => zones[+b.dataset.z!]?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })));
    const fill = nav.querySelector<HTMLElement>('.mm-fill')!;
    let raf = 0, cur = -1;
    const upd = () => {
      raf = 0;
      let i = 0;
      zones.forEach((z, k) => { if (z.getBoundingClientRect().top <= innerHeight * .45) i = k; });
      fill.style.transform = `scaleY(${(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(3)})`;
      if (i === cur) return;
      cur = i;
      dots.forEach((d, k) => { d.classList.toggle('done', k < i); if (k === i) d.setAttribute('aria-current', 'location'); else d.removeAttribute('aria-current'); });
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd); upd();
  }

  /* ---- fx panel: quality + motion ------------------------------------------------------------------------------ */
  const pop = document.createElement('div');
  pop.className = 'fx-pop b-win'; pop.id = 'fxPop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Display settings');
  pop.innerHTML = `<p class="fx-h">display.cfg</p>
    <div class="fx-row"><span>quality</span><div role="group" aria-label="Quality"><button type="button" class="chip" data-q="high">high</button><button type="button" class="chip" data-q="low">low</button></div></div>
    <p class="fx-note">low turns off bloom and the CRT pass and thins the particles.</p>
    <div class="fx-row"><span>motion</span><div role="group" aria-label="Motion"><button type="button" class="chip" data-m="full">full</button><button type="button" class="chip" data-m="reduced">reduced</button></div></div>
    <div class="fx-row"><span>tour</span><button type="button" class="chip" data-tour>replay</button></div>`;
  document.body.append(pop);
  const sync = () => {
    pop.querySelectorAll<HTMLButtonElement>('[data-q]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.q === quality)));
    pop.querySelectorAll<HTMLButtonElement>('[data-m]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.m === 'reduced') === reducedMotion)));
  };
  sync();
  html.addEventListener(QUALITY_EVENT, sync); html.addEventListener(MOTION_EVENT, sync);
  pop.querySelectorAll<HTMLButtonElement>('[data-q]').forEach(b => b.addEventListener('click', () => setQuality(b.dataset.q as Quality)));
  pop.querySelectorAll<HTMLButtonElement>('[data-m]').forEach(b => b.addEventListener('click', () => setReducedMotion(b.dataset.m === 'reduced')));
  pop.querySelector('[data-tour]')!.addEventListener('click', () => { closePop(); window.scrollTo({ top: 0, behavior: 'auto' }); openTour(); });
  let opener: HTMLElement | null = null;
  const closePop = () => { if (pop.hidden) return; pop.hidden = true; document.querySelectorAll('[data-fx]').forEach(b => b.setAttribute('aria-expanded', 'false')); opener?.focus({ preventScroll: true }); };
  document.querySelectorAll<HTMLElement>('[data-fx]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    (document.getElementById('menu3d') as HTMLDialogElement | null)?.close?.();
    if (!pop.hidden){ closePop(); return; }
    const hudFx = document.querySelector<HTMLElement>('.hud [data-fx]');
    opener = hudFx?.offsetParent ? hudFx : document.getElementById('menuBtn') ?? b;
    pop.hidden = false; b.setAttribute('aria-expanded', 'true');
    pop.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  }));
  addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target as Node)) closePop(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden){ e.stopPropagation(); closePop(); } }, true);

  /* ---- click ripples ------------------------------------------------------------------------------------------- */
  addEventListener('pointerdown', e => {
    if (reducedMotion) return;
    const t = (e.target as Element).closest?.('button, a, summary, .key, .chip');
    if (!t) return;
    const r = document.createElement('span');
    r.className = 'ripple'; r.style.left = `${e.clientX}px`; r.style.top = `${e.clientY}px`;
    document.body.append(r); setTimeout(() => r.remove(), 650);
  }, { passive: true });

  /* ---- arrival ------------------------------------------------------------------------------------------------- */
  const typed = new Set<string>();
  addEventListener(WORLD.arrive, e => {
    const id = (e as CustomEvent<string>).detail, z = id ? document.getElementById(id) : null;
    if (!z || reducedMotion) return;
    z.classList.remove('arrived'); void z.offsetWidth; z.classList.add('arrived');
    const note = z.querySelector<HTMLElement>('.sec-head p');
    if (note && !typed.has(id) && !note.children.length){
      typed.add(id);
      const full = note.textContent ?? '';
      note.style.minHeight = `${note.offsetHeight}px`;
      note.setAttribute('aria-label', full);
      let n = 0;
      const step = () => { n += 2; note.textContent = full.slice(0, n) + (n < full.length ? '▌' : ''); if (n < full.length) setTimeout(step, 22); };
      step();
    }
  });

  /* ---- my name: the letters fly apart and the network shatters ------------------------------------------------- */
  const name = document.getElementById('who');
  if (name && isHome){
    name.title = 'click me';
    name.classList.add('breakable');
    name.addEventListener('click', () => {
      emit(WORLD.shatter);
      if (reducedMotion) return;
      name.querySelectorAll<HTMLElement>('.l').forEach(l => {
        l.style.setProperty('--dx', `${(Math.random() - .5) * 260}px`);
        l.style.setProperty('--dy', `${(Math.random() - .5) * 180}px`);
        l.style.setProperty('--dz', `${Math.random() * 240}px`);
        l.style.setProperty('--dr', `${(Math.random() - .5) * 540}deg`);
      });
      name.classList.remove('apart'); void name.offsetWidth; name.classList.add('apart');
      setTimeout(() => name.classList.remove('apart'), 900);
    });
  }
}
