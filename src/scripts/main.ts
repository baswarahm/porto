/* ==========================================================================
   MAIN.TS — wires every feature together and registers its keys and
   `:commands` with the vim layer.
   ========================================================================== */
import { $ } from './env';
import { initTheme, toggleTheme } from './theme';
import { initProgress, initGitFilter } from './progress';
import { initDither } from './dither';
import { initCodeBackground } from './codebg';
import { initRace } from './race';
import { initVim, command, key, keyHelp, setMode, goTo } from './vim';
import { initXray } from './xray';
import { profile, sections } from '../data/profile';
import { courses } from '../data/courses';

initTheme();
initProgress();
initGitFilter();
initVim();
const photo = initDither();
const bg = initCodeBackground();
const race = initRace();
const xray = initXray();

const toggleBg = () => {
  const on = bg.toggle();
  $('#bgBtn')!.setAttribute('aria-pressed', String(on));
  return on;
};
$('#bgBtn')!.addEventListener('click', toggleBg);
const runRace = () => { goTo(sections.findIndex(s => s.id === 'lab')); race.run(); };

/* keys */
key('p', () => { photo.develop(true); setMode('VISUAL'); }, () => { photo.develop(false); setMode('NORMAL'); });
key('x', () => { xray.toggle(); });
key('b', () => { toggleBg(); });
key('r', runRace);
Object.assign(keyHelp, { p: 'hold to develop the photo', x: 'x-ray: inspect any element', b: 'toggle the code background', r: 'run the sorting race' });

/* commands */
command('courses', "list what I'm taking", () => courses.map(c => `${c.code.padEnd(8)}${c.name}`).join('\n'));
command('email', 'copy my email', () => {
  navigator.clipboard?.writeText(profile.email).catch(() => {});
  return `copied ${profile.email}`;
});
command('theme', 'toggle light / dark', () => `theme: ${toggleTheme()}`);
command('race', 'run the sorting race', () => { runRace(); });
command('xray', 'inspect the page', () => `x-ray ${xray.toggle() ? 'on — hover anything' : 'off'}`);
command('src', 'toggle the code background', () => `code background ${toggleBg() ? 'on' : 'off'}`);

/* perf readout, once everything has loaded */
addEventListener('load', () => setTimeout(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const ms = Math.round(nav ? nav.domContentLoadedEventEnd : performance.now());
  $('#vPerf')!.textContent = `${document.getElementsByTagName('*').length} nodes · ${ms}ms`;
}));
