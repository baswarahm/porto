/* ==========================================================================
   MAIN.TS — wires every feature together and registers its keys and
   `:commands` with the vim layer.
   ========================================================================== */
import { $ } from './env';
import { initOpening, opened } from './opening';
import { initTheme, toggleTheme } from './theme';
import { initProgress, initGitLog, initCourses } from './progress';
import { initCourseMap } from './coursemap';
import { initHeroName, initNameSplit, initCounters } from './hero';
import { initDither } from './dither';
import { initBinaryBackground } from './binarybg';
import { initVim, command, key, keyHelp, setMode, goTo } from './vim';
import { initXray } from './xray';
import { initReveal, initPill, initTargets, initContact, initSections, initCheatSheet, initSudo, copyEmail, toast } from './ui';
import { courses } from '../data/courses';
import { skills } from '../data/skills';

initOpening();
initTheme();
const map = initCourseMap();
initProgress(map);
const git = initGitLog();
initCourses(git);
initTargets();
initContact();
initPill();
initVim();
initSudo();
const name = initHeroName();
const nameSplit = initNameSplit(() => toast('drag the letters around · reassemble when you are done'));
const photo = initDither(opened);
const xray = initXray();
let bg: ReturnType<typeof initBinaryBackground> | null = null;

// things that should happen as the page is revealed, not behind the opening
opened.then(() => {
  bg = initBinaryBackground();
  initReveal();
  initSections();
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
key('/', () => { map.focusSearch(); });
key('n', () => { (document.getElementById('heroName')?.classList.contains('split') ? nameSplit.reset : nameSplit.split)(); goTo(0); });
Object.assign(keyHelp, {
  p: 'hold to develop the photo', x: 'x-ray: inspect any element', b: 'toggle the binary background',
  t: 'toggle light / dark', '/': 'search the course map', n: 'break / reassemble my name', '?': 'show all shortcuts',
});

const sheet = initCheatSheet([
  ['j k', 'next / previous section'],
  ['g g', 'back to the top'],
  ['G', 'jump to the bottom'],
  ['/', 'search the course map'],
  ['n', 'break apart / reassemble my name'],
  ['p', 'hold to see the photo in colour'],
  ['x', 'x-ray: inspect any element'],
  ['t', 'toggle light / dark'],
  ['b', 'toggle the binary background'],
  [':', 'open the command line (try :help)'],
  ['?', 'this sheet'],
]);
key('?', sheet.toggle);

/* commands */
command('courses', "list what I'm taking", () => courses.map(c => `${c.code.padEnd(8)}${c.name}`).join('\n'));
command('skills', 'list what I build with', () => skills.map(s => `${s.name.padEnd(14)}${s.usedIn}`).join('\n'));
command('email', 'copy my email', () => { copyEmail(); return 'copied to clipboard'; });
command('theme', 'toggle light / dark', () => `theme: ${toggleTheme()}`);
command('xray', 'inspect the page', () => `x-ray ${xray.toggle() ? 'on — hover anything' : 'off'}`);
command('bg', 'toggle the binary background', () => `binary background ${toggleBg() ? 'on' : 'off'}`);
command('decode', 'what the binary rain says', () => bg ? `the rain spells:
"${bg.message}"` : 'the background is off');
command('split', 'break my name apart', () => { goTo(0); nameSplit.split(); return 'drag the letters around'; });
command('reset', 'reassemble my name', () => { nameSplit.reset(); return 'name reassembled'; });
command('find', 'search the course map', () => { map.focusSearch(); });
command('replay', 'replay the opening', () => {
  try { sessionStorage.removeItem('opened'); } catch { /* non-fatal */ }
  location.reload();
});
command('sudo', 'try it', () => 'nice try — baswara is not in the sudoers file.');

/* perf readout, once everything has loaded */
addEventListener('load', () => setTimeout(() => {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const ms = Math.round(nav ? nav.domContentLoadedEventEnd : performance.now());
  $('#vPerf')!.textContent = `${document.getElementsByTagName('*').length} nodes · ${ms}ms`;
}));
