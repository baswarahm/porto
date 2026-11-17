/* ==========================================================================
   GHOSTS.TS — other visitors, live. Every open tab gets a random id and
   shares only which section it is reading. Everyone else shows up in the
   3D world as a glowing packet travelling between the hosts (world.ts draws
   them), and the HUD counts who's online.
   Transport: Supabase Realtime presence when src/data/realtime.ts is filled
   in; otherwise a BroadcastChannel, which links the tabs of one browser.
   ========================================================================== */
import { realtime } from '../data/realtime';
import { WORLD } from './env';

export interface Ghost { id: string; stage: string }
export const GHOST_EVENT = 'ghosts';

export function initGhosts(){
  const zones = Array.from(document.querySelectorAll<HTMLElement>('.zone[data-stage]'));
  if (!zones.length) return;
  let id = '';
  try { id = sessionStorage.getItem('bhm-ghost') ?? ''; } catch { /* private mode */ }
  if (!id){ id = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('bhm-ghost', id); } catch { /* fine */ } }
  let stage = 'hero';

  // HUD counter
  const pill = document.createElement('span');
  pill.className = 'hud-ghosts'; pill.setAttribute('aria-live', 'polite'); pill.hidden = true;
  document.querySelector('.hud-r')?.prepend(pill);
  const publish = (list: Ghost[]) => {
    const others = list.filter(g => g.id !== id);
    pill.hidden = others.length === 0;
    pill.innerHTML = `<i aria-hidden="true"></i>${others.length + 1}<span> online</span>`;
    pill.title = others.length ? `${others.length} other ${others.length === 1 ? 'visitor is' : 'visitors are'} here right now` : '';
    dispatchEvent(new CustomEvent(GHOST_EVENT, { detail: others }));
  };

  let send: (s: string) => void = () => {};
  if (realtime.url && realtime.anonKey){
    import('@supabase/realtime-js').then(({ RealtimeClient }) => {
      const client = new RealtimeClient(`${realtime.url.replace(/^http/, 'ws')}/realtime/v1`, { params: { apikey: realtime.anonKey } });
      const ch = client.channel('ghosts', { config: { presence: { key: id, enabled: true } } });
      ch.on('presence', { event: 'sync' }, () => {
        const st = ch.presenceState<{ stage: string }>();
        publish(Object.entries(st).map(([k, v]) => ({ id: k, stage: v[0]?.stage ?? 'hero' })));
      });
      ch.subscribe(status => { if (status === 'SUBSCRIBED') ch.track({ stage }); });
      send = s => { ch.track({ stage: s }); };
    }).catch(err => console.warn('ghosts: realtime unavailable', err));
  } else if ('BroadcastChannel' in window){
    const bc = new BroadcastChannel('bhm-ghosts'), seen = new Map<string, Ghost & { at: number }>();
    const beat = () => bc.postMessage({ id, stage });
    bc.onmessage = e => { const g = e.data as Ghost & { bye?: boolean }; if (g.bye) seen.delete(g.id); else seen.set(g.id, { ...g, at: Date.now() }); };
    setInterval(() => {
      beat();
      for (const [k, g] of seen) if (Date.now() - g.at > 6000) seen.delete(k);
      publish([{ id, stage }, ...seen.values()]);
    }, 1500);
    addEventListener('pagehide', () => bc.postMessage({ id, bye: true }));
    send = () => beat();
    beat();
  }

  // share the section you settle on
  addEventListener(WORLD.arrive, e => {
    const z = document.getElementById((e as CustomEvent<string>).detail ?? '');
    const s = z?.dataset.stage; if (!s || s === stage) return;
    stage = s; send(s);
  });
}
