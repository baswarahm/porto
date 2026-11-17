/* ==========================================================================
   MAIN.TS — wires every feature together and registers its keys and
   `:commands` with the vim layer.
   ========================================================================== */
import { $ } from './env';
import { initTheme, toggleTheme } from './theme';
import { initProgress, initGitLog, initCourses } from './progress';
import { initCourseMap } from './coursemap';
import { initCounters } from './hero';
import { initBinaryBackground } from './binarybg';
import { initVim, command, key, keyHelp } from './vim';
import { initXray } from './xray';
import { initMenu } from './menu';
import { initText3d } from './text3d';
import { initTilt } from './tilt';
import { initSections3d } from './sections3d';
import { initCursor } from './cursor';
import { initRoot } from './root';
import { initTerminal } from './terminal';
import { initJourney } from './journey';
import { initUx } from './ux';
import { initGhosts } from './ghosts';
import { initReveal, initPill, initTargets, initContact, initSections, initCheatSheet, initSudo, copyEmail, toast } from './ui';
import { courses } from '../data/courses';
import { skills } from '../data/skills';

initTheme();
const menu = initMenu();
// the home page's breach scene loads three.js only where it's needed
// 3D type everywhere, cards that lean to the cursor, and the WebGL world behind the page
initText3d();
initTilt();
initSections3d();
initCursor();
initRoot();
initTerminal();
initJourney();
initUx();
initGhosts();
if (document.getElementById('world')) import('./world').then(m => m.initWorld());
const map = initCourseMap();
initProgress(map);
const git = initGitLog();
initCourses(git);
initTargets();
initContact();
initPill();
initVim();
initSudo();
const xray = initXray();
let bg: ReturnType<typeof initBinaryBackground> | null = null;

// things that start once the page is up
Promise.resolve().then(() => {
  initReveal();
  initSections();
  initCounters();
});

// the binary rain is off by default now; `b` (or the 0101 button) starts it
const toggleBg = () => {
  let on: boolean;
  if (!bg){ bg = initBinaryBackground(); on = true; } else on = bg.toggle();
  $('#bgBtn')!.setAttribute('aria-pressed', String(on));
  return on;
};
$('#bgBtn')!.addEventListener('click', toggleBg);

/* keys */
key('x', () => { xray.toggle(); });
key('b', () => { toggleBg(); });
key('t', () => { toast(`theme: ${toggleTheme()}`); });
key('/', () => { map.focusSearch(); });
Object.assign(keyHelp, {
  x: 'x-ray: inspect any element', b: 'toggle the binary background',
  t: 'toggle light / dark', '/': 'search the course map', '?': 'show all shortcuts',
});

const sheet = initCheatSheet([
  ['j k', 'next / previous section'],
  ['g g', 'back to the top'],
  ['G', 'jump to the bottom'],
  ['/', 'search the course map'],
  ['x', 'x-ray: inspect any element'],
  ['t', 'toggle light / dark'],
  ['b', 'toggle the binary background'],
  [':', 'open the command line (try :help)'],
  ['m', 'open the menu'],
  ['~', 'open the terminal'],
  ['?', 'this sheet'],
]);
key('?', sheet.toggle);
key('m', menu.toggle);

/* commands */
command('courses', "list what I'm taking", () => courses.map(c => `${c.code.padEnd(8)}${c.name}`).join('\n'));
command('skills', 'list what I build with', () => skills.map(s => `${s.name.padEnd(14)}${s.usedIn}`).join('\n'));
command('email', 'copy my email', () => { copyEmail(); return 'copied to clipboard'; });
command('theme', 'toggle light / dark', () => `theme: ${toggleTheme()}`);
command('xray', 'inspect the page', () => `x-ray ${xray.toggle() ? 'on, hover anything' : 'off'}`);
command('bg', 'toggle the binary background', () => `binary background ${toggleBg() ? 'on' : 'off'}`);
command('decode', 'what the binary rain says', () => bg ? `the rain spells:
"${bg.message}"` : 'the background is off');
command('find', 'search the course map', () => { map.focusSearch(); });
command('sudo', 'try it', () => 'nice try. baswara is not in the sudoers file.');

/* perf readout, once everything has loaded */
addEventListener('load', () => setTimeout(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const ms = Math.round(nav ? nav.domContentLoadedEventEnd : performance.now());
  $('#vPerf')!.textContent = `${document.getElementsByTagName('*').length} nodes · ${ms}ms`;
}));
