/* Light/dark toggle. Follows the OS until the visitor picks, then remembers. */
import { $, isDark, THEME_EVENT } from './env';

export function toggleTheme(){
  const next = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch { /* private mode — non-fatal */ }
  document.documentElement.dispatchEvent(new Event(THEME_EVENT));
  return next;
}

export function initTheme(){
  $('#themeBtn')?.addEventListener('click', toggleTheme);
  // OS switch while no explicit choice is saved
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) document.documentElement.dispatchEvent(new Event(THEME_EVENT));
  });
}
