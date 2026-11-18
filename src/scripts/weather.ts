/* ==========================================================================
   WEATHER.TS — the real weather in Penang, from Open-Meteo (free, no key,
   no account). Cached for 15 minutes per visitor. If it can't be reached,
   the site simply runs on Penang's time of day alone.
   ========================================================================== */
export interface Weather { temp: number; code: number; isDay: boolean; rain: number; cloud: number; label: string; storm: boolean; wet: boolean; wind: number; windDir: number }

const URL_ = 'https://api.open-meteo.com/v1/forecast?latitude=5.41&longitude=100.33&current=temperature_2m,weather_code,is_day,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m&timezone=Asia%2FKuala_Lumpur';

const label = (c: number) =>
  c === 0 ? 'clear' : c <= 2 ? 'partly cloudy' : c === 3 ? 'overcast' : c <= 48 ? 'fog'
  : c <= 57 ? 'drizzle' : c <= 67 ? 'rain' : c <= 77 ? 'snow?!' : c <= 82 ? 'showers' : c <= 86 ? 'snow showers' : 'thunderstorm';

let pending: Promise<Weather | null> | null = null;

export function penangWeather(): Promise<Weather | null>{
  if (pending) return pending;
  pending = (async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem('pngWeather') ?? 'null');
      if (cached && Date.now() - cached.at < 15 * 60_000 && 'wind' in cached.w) return cached.w as Weather;
    } catch { /* no storage: just fetch */ }
    try {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(URL_, { signal: ctl.signal }); clearTimeout(timer);
      if (!r.ok) return null;
      const c = (await r.json()).current;
      const code = +c.weather_code;
      const w: Weather = { temp: Math.round(+c.temperature_2m), code, isDay: !!c.is_day, rain: +c.precipitation || 0, cloud: +c.cloud_cover || 0,
        label: label(code), storm: code >= 95, wind: +c.wind_speed_10m || 0, windDir: +c.wind_direction_10m || 0, wet: (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 || +c.precipitation > 0 };
      try { sessionStorage.setItem('pngWeather', JSON.stringify({ at: Date.now(), w })); } catch { /* fine */ }
      return w;
    } catch { return null; }
  })();
  return pending;
}

/** Penang's hour as a fraction (0–24) */
export const penangHour = () => {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':').map(Number);
  return h + m / 60;
};
