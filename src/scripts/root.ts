/* ==========================================================================
   ROOT.TS — the secret "root mode". The Konami code (↑↑↓↓←→←→ B A) or
   `sudo su` in the terminal turns the whole site to red alert: every lime
   becomes red, alarm light sweeps the screen, the firewall rebuilds itself
   and hidden nodes with messages appear in the network (world.ts listens
   for the "rootmode" event). Esc, or `exit` in the terminal, stands down.
   ========================================================================== */
import { THEME_EVENT } from './env';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

let on = false;
export const isRoot = () => on;

export function setRoot(next: boolean){
  if (next === on) return;
  on = next;
  const root = document.documentElement;
  root.classList.toggle('root', on);
  let banner = document.getElementById('rootBanner');
  if (!banner){
    banner = document.createElement('div');
    banner.id = 'rootBanner'; banner.className = 'root-banner'; banner.setAttribute('role', 'status');
    banner.innerHTML = '<b>⚠ root access</b><span>red alert · 3 hidden nodes exposed · press esc to stand down</span>';
    document.body.append(banner, Object.assign(document.createElement('div'), { className: 'root-alarm' }));
  }
  // colours come from CSS variables; tell everything that draws with them to repaint
  root.dispatchEvent(new Event(THEME_EVENT));
  root.dispatchEvent(new CustomEvent('rootmode', { detail: on }));
}

export function initRoot(){
  let i = 0;
  addEventListener('keydown', e => {
    if ((e.target as HTMLElement).matches?.('input, textarea')) return;
    if (e.key === 'Escape' && on){ setRoot(false); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    i = k === KONAMI[i] ? i + 1 : (k === KONAMI[0] ? 1 : 0);
    if (i === KONAMI.length){ i = 0; setRoot(!on); }
  });
}
