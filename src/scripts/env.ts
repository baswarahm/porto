/* Shared browser helpers, plus the two display settings (fx panel in the HUD):
     motion   full / reduced   (starts from prefers-reduced-motion, the visitor can override)
     quality  high / low       (low: no bloom or CRT pass, pixel ratio 1, a lighter swarm)
   Both are live bindings: modules that import them see the new value. */
export const store = {
  get(k: string){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string){ try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

const savedMotion = store.get('bhm-motion');
export let reducedMotion = savedMotion ? savedMotion === 'reduced' : matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.toggle('rm', reducedMotion);
export const MOTION_EVENT = 'motionchange';
export function setReducedMotion(on: boolean){
  reducedMotion = on; store.set('bhm-motion', on ? 'reduced' : 'full');
  document.documentElement.classList.toggle('rm', on);
  document.documentElement.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: on }));
}

export type Quality = 'high' | 'low';
export let quality: Quality = (store.get('bhm-quality') as Quality | null) ?? ((navigator.hardwareConcurrency || 8) <= 4 ? 'low' : 'high');
export const QUALITY_EVENT = 'qualitychange';
export function setQuality(q: Quality){
  quality = q; store.set('bhm-quality', q);
  document.documentElement.dispatchEvent(new CustomEvent(QUALITY_EVENT, { detail: q }));
}

export const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function isDark(){
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Fired on <html> whenever the theme flips, so canvases can repaint in the new ink. */
export const THEME_EVENT = 'themechange';

/** Things that happen in the 3D world, fired on window. */
export const WORLD = { ready: 'worldready', arrive: 'hostarrive', shatter: 'shatter', nmap: 'nmapscan', breach: 'breach' } as const;
export const emit = (name: string, detail?: unknown) => dispatchEvent(new CustomEvent(name, { detail }));
