/* ==========================================================================
   MAIN.TS — system bring-up. Order matters here.
   ========================================================================== */
import { initScrollController, initReveal, initParticleField, onScroll } from './core';
import { restoreSavedPalette, initColorWalk } from './theme';
import { initWeatherBackground } from './weather';
import { initMemory, trackSection, showWelcomeCard } from './memory';
import { runBootSequence } from './boot';
import { initCursorFx, initRipples, initToTop, initVCard } from './interaction';
import { initDecryptTagline, initXpBar, initLiveClock, initHeroParallax, initHeroStats, initScrollIndicator } from './hero';
import { initQuestTabs, initQuestExpand, initSkillBars } from './timeline';
import { initKonamiCode } from './easter-egg';
import { initCommandPalette } from './command-palette';

// 1) palette + weather restore first (before anything else reads
//    --accent / data-weather), so the very first frame is already correct.
restoreSavedPalette();
initWeatherBackground();

// 2) AI Memory — figure out if this browser has been here before, and bump
//    the visit counters, ahead of deciding which boot to play.
const { isReturning, previous } = initMemory();
onScroll(({ currentId }) => trackSection(currentId));

// 3) everything else initializes underneath the boot overlay (it's opaque /
//    highest z-index, so there's no visible race).
initScrollController();
initReveal();
initParticleField();
initColorWalk();
initCursorFx();
initRipples();
initToTop();
initVCard();
initDecryptTagline();
initXpBar();
initLiveClock();
initHeroParallax();
initHeroStats();
initScrollIndicator();
initQuestTabs();
initQuestExpand();
initSkillBars();
initKonamiCode();
initCommandPalette();

// 4) Launch Sequence — full boot for first-ever visits, a sub-second
//    "Welcome Back" beat for returning ones, skipped on refresh within the
//    same browser session.
runBootSequence({
  isReturning,
  onComplete(){
    if(isReturning) showWelcomeCard(previous);
  }
});
