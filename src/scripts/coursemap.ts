/* ==========================================================================
   COURSEMAP.TS — the four-year course map: filter by track, live search,
   click a course for its details, highlight a whole semester.
   ========================================================================== */
import { $, reducedMotion } from './env';
import { tracks, type Track } from '../data/courses';
import { degreeProgress } from '../lib/degree';

export function initCourseMap(){
  const map = $('#cmap'), detail = $('#cmapDetail'), search = $<HTMLInputElement>('#cmapSearch');
  if (!map || !detail || !search) return { open: (_c: string) => {}, focusSem: (_i: number) => {}, focusSearch: () => {} };
  const tiles = Array.from(map.querySelectorAll<HTMLButtonElement>('.tile'));
  const cols = Array.from(map.querySelectorAll<HTMLElement>('.cmap-col'));
  const p = degreeProgress();
  let track: string = 'all';

  // live state: the build only knows its own date
  cols.forEach((col, i) => {
    const s = p.semesters[i].state;
    col.classList.remove('done', 'now', 'future'); col.classList.add(s);
    col.querySelectorAll('.tile').forEach(t => { t.classList.remove('done', 'now', 'future'); t.classList.add(s); });
  });

  // phones start with only the current semester; the rest is one tap away
  const more = $<HTMLButtonElement>('#cmapMore');
  const expand = (on = true) => {
    map.classList.toggle('expanded', on);
    if (more){
      more.setAttribute('aria-expanded', String(on));
      more.textContent = on ? 'show only this semester ↑' : 'show the full four-year roadmap ↓';
    }
  };
  more?.addEventListener('click', () => {
    const on = !map.classList.contains('expanded');
    expand(on);
    if (!on) map.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });

  const apply = () => {
    const q = search.value.trim().toLowerCase();
    if (q) expand();
    tiles.forEach(t => {
      const okTrack = track === 'all' || t.dataset.track === track;
      const okText = !q || `${t.dataset.code} ${t.dataset.name}`.toLowerCase().includes(q);
      t.classList.toggle('dim', !(okTrack && okText));
      t.classList.toggle('hit', !!q && okTrack && okText);
    });
  };

  document.querySelectorAll<HTMLButtonElement>('[data-track]').forEach(btn => {
    if (btn.classList.contains('tile')) return;
    btn.addEventListener('click', () => {
      track = btn.dataset.track!;
      document.querySelectorAll('.cmap-tools .chip').forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
      apply();
    });
  });
  search.addEventListener('input', apply);
  search.addEventListener('keydown', e => { if (e.key === 'Escape'){ search.value = ''; apply(); search.blur(); } });

  const show = (t: HTMLButtonElement) => {
    tiles.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
    const i = +t.dataset.sem!, s = p.semesters[i], tr = t.dataset.track as Track;
    const when = s.state === 'done' ? 'passed' : s.state === 'now' ? 'taking it now' : 'planned';
    detail.className = `cmap-detail tk-${tr}`;
    detail.innerHTML = '';
    const b = document.createElement('b'); b.textContent = `${t.dataset.code} `;
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = tracks[tr].label;
    detail.append(b, `${t.dataset.name} · ${t.dataset.credits} credits · ${s.label} · ${when}`, tag);
  };
  tiles.forEach(t => t.addEventListener('click', () => show(t)));

  const focusSem = (i: number) => {
    cols.forEach((c, k) => c.classList.toggle('sel', k === i));
    if (!cols[i]?.classList.contains('now')) expand();
  };
  const open = (code: string) => {
    const t = tiles.find(x => x.dataset.code === code);
    if (!t) return;
    if (!t.classList.contains('now')) expand();
    show(t);
    t.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    t.classList.add('hit'); setTimeout(() => apply(), 1400);
  };
  const focusSearch = () => { map.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' }); search.focus(); };
  return { open, focusSem, focusSearch };
}
