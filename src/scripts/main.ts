/* ==========================================================================
   MAIN.TS — wires every feature together and registers its keys and
   `:commands` with the vim layer.
   ========================================================================== */
import { $ } from './env';
import { initOpening, opened } from './opening';
import { initTheme, toggleTheme } from './theme';
import { initProgress, initGitLog, initCourses } from './progress';
import { initHeroName, initCounters } from './hero';
import { initDither } from './dither';
import { initCodeBackground } from './codebg';
import { initVim, command, key, keyHelp, setMode } from './vim';
import { initXray } from './xray';
import { initReveal, initPill, initTargets, initContact, copyEmail, toast } from './ui';
import { courses } from '../data/courses';

initOpening();
initTheme();
initProgress();
const git = initGitLog();
initCourses(git);
initTargets();
initContact();
initPill();
initVim();
const name = initHeroName();
const photo = initDither(opened);
const xray = initXray();
let bg: ReturnType<typeof initCodeBackground> | null = null;

// things that should happen as the page is revealed, not behind the opening
opened.then(() => {
  bg = initCodeBackground();
  initReveal();
  name.decrypt();
  initCounters();
});

const toggleBg = () => {
  const on = bg ? bg.toggle() : false;
  $('#bgBtn')!.setAttribute('aria-pressed', String(on));
  return on;
};
$('#bgBtn')!.addEventListener('click', toggleBg);

/* keys */
key('p', () => { photo.develop(true); setMode('VISUAL'); }, () => { photo.develop(false); setMode('NORMAL'); });
key('x', () => { xray.toggle(); });
key('b', () => { toggleBg(); });
key('t', () => { toast(`theme: ${toggleTheme()}`); });
Object.assign(keyHelp, { p: 'hold to develop the photo', x: 'x-ray: inspect any element', b: 'toggle the code background', t: 'toggle light / dark' });

/* commands */
command('courses', "list what I'm taking", () => courses.map(c => `${c.code.padEnd(8)}${c.name}`).join('\n'));
command('email', 'copy my email', () => { copyEmail(); return 'copied to clipboard'; });
command('theme', 'toggle light / dark', () => `theme: ${toggleTheme()}`);
command('xray', 'inspect the page', () => `x-ray ${xray.toggle() ? 'on — hover anything' : 'off'}`);
command('src', 'toggle the code background', () => `code background ${toggleBg() ? 'on' : 'off'}`);
command('replay', 'replay the opening', () => {
  try { sessionStorage.removeItem('opened'); } catch { /* non-fatal */ }
  location.reload();
});

/* perf readout, once everything has loaded */
addEventListener('load', () => setTimeout(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const ms = Math.round(nav ? nav.domContentLoadedEventEnd : performance.now());
  $('#vPerf')!.textContent = `${document.getElementsByTagName('*').length} nodes · ${ms}ms`;
}));
