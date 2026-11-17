/* The HUD (Menu.astro): the phone menu and the Penang clock. `m` also opens the menu. */
import { $ } from './env';
import { penangWeather, type Weather } from './weather';

export function initMenu(){
  const btn = $('#menuBtn'), dlg = $<HTMLDialogElement>('#menu3d');
  if (!btn || !dlg) return { toggle: () => {} };
  const open = () => { dlg.showModal(); btn.setAttribute('aria-expanded', 'true'); };
  const close = () => { dlg.close(); };
  dlg.addEventListener('close', () => btn.setAttribute('aria-expanded', 'false'));
  btn.addEventListener('click', open);
  $('#menuClose')?.addEventListener('click', close);
  // a click on the backdrop (outside the list) closes it
  dlg.addEventListener('click', e => { if (e.target === dlg || (e.target as HTMLElement).classList.contains('m3d-in')) close(); });
  // Penang time in the HUD
  const clock = $('#hudClock');
  if (clock){
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false });
    let wx: Weather | null = null;
    const time = document.createElement('span'), weather = document.createElement('span');
    weather.className = 'hud-wx'; clock.replaceChildren(time, weather);
    const tick = () => { time.textContent = `PNG ${fmt.format(new Date())}`; weather.textContent = wx ? ` · ${wx.temp}° ${wx.label}` : ''; };
    tick(); setInterval(tick, 20_000);
    penangWeather().then(x => { wx = x; tick(); });
  }
  return { toggle: () => (dlg.open ? close() : open()) };
}
