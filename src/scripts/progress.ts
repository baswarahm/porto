/* Live degree progress (the build only knows its own date) + git log filter. */
import { $ } from './env';
import { degreeProgress, textBar } from '../lib/degree';

export function initProgress(){
  const p = degreeProgress();
  document.querySelectorAll<HTMLElement>('#semTrack .sem').forEach((el, i) => {
    const s = p.semesters[i];
    el.className = `sem ${s.state}`;
    el.querySelector('.lbl')!.textContent = s.state === 'now' ? '● now' : `sem ${i + 1}`;
    el.querySelector<HTMLElement>('.fill')!.style.width = (s.fill * 100).toFixed(1) + '%';
  });
  const pct = (p.pct * 100).toFixed(1) + '%';
  const bar = $('[data-degree-bar]');
  if (bar) bar.innerHTML = `<span class="mono">${textBar(p.pct)}</span> <b>${pct}</b>`;
  const fact = $('[data-degree-pct]');
  if (fact) fact.textContent = `${pct} done`;
  const sem = $('[data-sem-label]');
  if (sem) sem.textContent = `year ${p.year}, semester ${p.sem}`;
  return p;
}

export function initGitFilter(){
  const tools = $('#glTools');
  tools?.addEventListener('click', e => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.chip');
    if (!btn) return;
    tools.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === btn)));
    const f = btn.dataset.f;
    document.querySelectorAll<HTMLElement>('.gl-row').forEach(r => {
      r.classList.toggle('hide', f !== 'all' && r.dataset.b !== f && r.dataset.b !== '0');
    });
  });
}
