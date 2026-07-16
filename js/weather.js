/* ==========================================================================
   WEATHER.JS — Living Weather Reactive Background.
   Free, keyless API (Open-Meteo). Geolocation permission is requested by
   the browser exactly once; if it's denied, times out, or the fetch fails
   for any reason, we NEVER interrupt the visitor — we just fall back to
   the default animated "cyber" background and try again next interval.
   ========================================================================== */

import { reducedMotion } from './main.js';

const CACHE_KEY = 'ibas_weather_cache';
const REFRESH_MS = 30 * 60 * 1000;
const root = document.documentElement;

function applyMood(mood){
  root.setAttribute('data-weather', mood);
}

function codeToMood(code, isDay){
  let base = 'cyber';
  if(code === 0) base = 'clear';
  else if([1, 2, 3].includes(code)) base = 'cloudy';
  else if([45, 48].includes(code)) base = 'fog';
  else if([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) base = 'rain';
  else if([71, 73, 75, 77, 85, 86].includes(code)) base = 'snow';
  else if([95, 96, 99].includes(code)) base = 'thunder';
  return isDay ? base : base + '-night';
}

function readCache(){
  try{ const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function writeCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }catch(e){ /* private mode — non-fatal */ }
}

function buildFxLayers(){
  const fx = document.getElementById('weatherFx');
  if(!fx || fx.dataset.built) return;
  fx.dataset.built = '1';
  if(reducedMotion) return; // static gradients still apply via CSS; skip particle DOM

  const rain = document.createElement('div'); rain.className = 'wfx wfx-rain';
  for(let i = 0; i < 26; i++){
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 2) + 's';
    s.style.animationDuration = (0.5 + Math.random() * 0.4) + 's';
    rain.appendChild(s);
  }

  const snow = document.createElement('div'); snow.className = 'wfx wfx-snow';
  for(let i = 0; i < 24; i++){
    const s = document.createElement('span');
    const size = 2 + Math.random() * 3;
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 8) + 's';
    s.style.animationDuration = (6 + Math.random() * 6) + 's';
    s.style.width = size + 'px'; s.style.height = size + 'px';
    snow.appendChild(s);
  }

  const fog = document.createElement('div'); fog.className = 'wfx wfx-fog';

  const stars = document.createElement('div'); stars.className = 'wfx wfx-stars';
  for(let i = 0; i < 46; i++){
    const s = document.createElement('span');
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 60 + '%';
    s.style.animationDelay = (Math.random() * 4) + 's';
    stars.appendChild(s);
  }

  const lightning = document.createElement('div'); lightning.className = 'wfx wfx-lightning';
  fx.append(rain, snow, fog, stars, lightning);

  let lightningTimer = null;
  const scheduleLightning = () => {
    clearInterval(lightningTimer);
    if(root.dataset.weather?.startsWith('thunder')){
      lightningTimer = setInterval(() => {
        lightning.classList.add('flash');
        setTimeout(() => lightning.classList.remove('flash'), 140);
      }, 3500 + Math.random() * 4000);
    }
  };
  new MutationObserver(scheduleLightning).observe(root, { attributes: true, attributeFilter: ['data-weather'] });
  scheduleLightning();
}

async function fetchWeather(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  if(!res.ok) throw new Error('weather fetch failed');
  const data = await res.json();
  return data.current_weather;
}

function refresh(){
  if(!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try{
        const cw = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
        const mood = codeToMood(cw.weathercode, cw.is_day === 1);
        writeCache({ mood, timestamp: Date.now() });
        applyMood(mood);
      }catch(e){ /* fetch failed — silently keep whatever is currently showing */ }
    },
    () => { /* denied / unavailable — never interrupt the visitor, keep cyber fallback */ },
    { timeout: 8000, maximumAge: 600000 }
  );
}

export function initWeatherBackground(){
  buildFxLayers();
  const cached = readCache();
  applyMood(cached?.mood || 'cyber');
  if(!cached || (Date.now() - cached.timestamp) > REFRESH_MS) refresh();
  setInterval(refresh, REFRESH_MS);
}

export function getWeatherMood(){
  return root.dataset.weather || 'cyber';
}
