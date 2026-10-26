/* Shared browser helpers. */
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

export const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function isDark(){
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Fired on <html> whenever the theme flips, so canvases can repaint in the new ink. */
export const THEME_EVENT = 'themechange';
