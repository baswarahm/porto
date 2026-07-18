/* ==========================================================================
   MEMORY.JS — "AI Memory": returning-visitor recognition, LocalStorage only.
   No login, no server, no personal information. Tracks first/last visit,
   visit count, last section viewed, time spent, sections explored, and
   hidden achievements — then greets returning visitors with a glass card.
   ========================================================================== */

const KEY = 'baswara_memory';
const SECTION_LABELS = {
  hero: 'Hero', about: 'About', skills: 'Skills',
  'quest-log': 'Quest Log', building: 'Building', contact: 'Contact'
};

let record = null;
let sessionStart = performance.now();

function load(){
  try{ const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function save(){
  if(!record) return;
  try{ localStorage.setItem(KEY, JSON.stringify(record)); }catch(e){ /* private mode — non-fatal */ }
}

function timeAgo(iso){
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + (mins === 1 ? ' minute ago' : ' minutes ago');
  const hrs = Math.floor(mins / 60);
  if(hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
  const days = Math.floor(hrs / 24);
  return days + (days === 1 ? ' day ago' : ' days ago');
}

function flushTime(){
  if(!record) return;
  const elapsed = (performance.now() - sessionStart) / 1000;
  sessionStart = performance.now();
  if(elapsed > 0 && elapsed < 3600){
    record.totalTimeSpent = (record.totalTimeSpent || 0) + elapsed;
    save();
  }
}

/**
 * Call once on load. Returns whether this browser has visited before, and
 * a snapshot of the PREVIOUS record (before this visit's counters were
 * bumped) so the welcome card can say "last visit: 3 days ago" correctly.
 */
export function initMemory(){
  const now = new Date().toISOString();
  const existing = load();
  const isReturning = !!existing;
  const previous = existing ? { ...existing } : null;

  record = existing || {
    firstVisit: now, lastVisit: now, visitCount: 0,
    lastSection: 'hero', totalTimeSpent: 0,
    sectionsExplored: [], achievements: []
  };
  record.visitCount += 1;
  record.lastVisit = now;
  save();

  sessionStart = performance.now();
  window.addEventListener('pagehide', flushTime);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden) flushTime(); else sessionStart = performance.now();
  });
  setInterval(flushTime, 20000);

  return { isReturning, previous };
}

export function trackSection(id){
  if(!record || !id) return;
  record.lastSection = id;
  if(!record.sectionsExplored.includes(id)) record.sectionsExplored.push(id);
  save();
}

/** Records a hidden achievement. Returns true only the FIRST time it's unlocked. */
export function unlockAchievement(id, label){
  if(!record) return false;
  if(record.achievements.some(a => a.id === id)) return false;
  record.achievements.push({ id, label });
  save();
  return true;
}

export function showWelcomeCard(previous){
  if(!previous || !previous.visitCount) return;
  const card = document.getElementById('memoryCard');
  if(!card) return;

  document.getElementById('memoryLastVisit').textContent = 'Last visit: ' + timeAgo(previous.lastVisit);
  const visits = previous.visitCount + 1;
  document.getElementById('memoryVisitCount').textContent = `You've visited ${visits} time${visits === 1 ? '' : 's'}.`;

  const secWrap = document.getElementById('memorySections');
  secWrap.innerHTML = '';
  if(previous.sectionsExplored?.length){
    const label = document.createElement('p');
    label.className = 'memory-explored-label';
    label.textContent = 'Previously you explored:';
    const list = document.createElement('ul');
    list.className = 'memory-explored-list';
    previous.sectionsExplored.forEach(id => {
      const li = document.createElement('li');
      li.textContent = '✓ ' + (SECTION_LABELS[id] || id);
      list.appendChild(li);
    });
    secWrap.append(label, list);
  }

  const achEl = document.getElementById('memoryAchievement');
  if(previous.achievements?.length){
    achEl.hidden = false;
    achEl.textContent = '🏆 Achievement Restored — ' + previous.achievements.map(a => a.label).join(', ');
  } else {
    achEl.hidden = true;
  }

  function dismiss(){
    card.classList.remove('is-shown');
    setTimeout(() => card.setAttribute('aria-hidden', 'true'), 500);
  }

  document.getElementById('memoryResumeBtn').onclick = () => {
    const target = document.getElementById(previous.lastSection || 'hero');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    dismiss();
  };
  document.getElementById('memoryCardClose').onclick = dismiss;

  card.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => card.classList.add('is-shown'));
  setTimeout(dismiss, 13000);
}
