/* ==========================================================================
   GITHUB.JS — Live GitHub integration for the "Currently Building" section.
   Uses only free, keyless public APIs:
     - GitHub REST API (profile, repos, events)
     - github-contributions-api.jogruber.de (public contribution-graph JSON,
       since GitHub's own contribution graph requires GraphQL + a token)
   Everything is cached in LocalStorage and fails quietly — on any error the
   relevant widget just hides instead of showing a broken UI to a visitor.
   ========================================================================== */

const USERNAME = 'baswarahafizh'; // ← update this to the real GitHub handle
const CACHE_KEY = 'baswara_github_cache';
const SUMMARY_KEY = 'baswara_github_summary'; // read by the terminal's `github` command
const REFRESH_MS = 15 * 60 * 1000;
const MAX_ITEMS = 5;
const MAX_REPOS = 6;

const EVENT_VERBS = {
  PushEvent: (e) => `pushed ${e.payload?.commits?.length || 0} commit(s) to`,
  CreateEvent: (e) => `created ${e.payload?.ref_type || 'a repo'} in`,
  PullRequestEvent: (e) => `${e.payload?.action || 'updated'} a pull request in`,
  IssuesEvent: (e) => `${e.payload?.action || 'updated'} an issue in`,
  WatchEvent: () => 'starred',
  ForkEvent: () => 'forked',
  IssueCommentEvent: () => 'commented on an issue in',
  PublicEvent: () => 'open-sourced',
};

const LANG_COLORS = {
  JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5', HTML:'#e34c26',
  CSS:'#563d7c', 'C++':'#f34b7d', C:'#555555', Java:'#b07219', Shell:'#89e051',
  Dart:'#00B4AB', Go:'#00ADD8', Rust:'#dea584', PHP:'#4F5D95', Ruby:'#701516',
};
function langColor(l){ return LANG_COLORS[l] || 'var(--accent)'; }

function timeAgo(iso){
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if(hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function readCache(){
  try{ const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
}
function writeCache(data){
  try{ localStorage.setItem(CACHE_KEY, JSON.stringify(data)); }catch(e){ /* private mode — non-fatal */ }
}

function toItems(events){
  return events
    .filter(e => EVENT_VERBS[e.type])
    .slice(0, MAX_ITEMS)
    .map(e => ({
      verb: EVENT_VERBS[e.type](e),
      repo: e.repo?.name || '',
      url: `https://github.com/${e.repo?.name || ''}`,
      when: e.created_at,
    }));
}

function animateCount(el, target, { duration = 900, suffix = '' } = {}){
  if(!el) return;
  const start = 0;
  const t0 = performance.now();
  function tick(now){
    const p = Math.min(1, (now - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(start + (target - start) * eased) + suffix;
    if(p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---- fetchers ------------------------------------------------------------ */
async function fetchJson(url){
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if(!res.ok) throw new Error('fetch failed: ' + res.status + ' ' + url);
  return res.json();
}

async function fetchAll(){
  const [profile, events, repos, contrib] = await Promise.all([
    fetchJson(`https://api.github.com/users/${USERNAME}`),
    fetchJson(`https://api.github.com/users/${USERNAME}/events/public?per_page=15`).catch(() => []),
    fetchJson(`https://api.github.com/users/${USERNAME}/repos?sort=pushed&per_page=100`).catch(() => []),
    fetch(`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=last`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  const items = toItems(Array.isArray(events) ? events : []);

  const repoList = Array.isArray(repos) ? repos.filter(r => !r.fork) : [];
  const pinned = repoList
    .slice()
    .sort((a,b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)))
    .slice(0, MAX_REPOS)
    .map(r => ({
      name: r.name, url: r.html_url, desc: r.description || 'No description yet.',
      lang: r.language, stars: r.stargazers_count, forks: r.forks_count, updated: r.pushed_at,
    }));

  const langTotals = {};
  repoList.forEach(r => { if(r.language) langTotals[r.language] = (langTotals[r.language] || 0) + 1; });
  const langTotal = Object.values(langTotals).reduce((a,b) => a+b, 0) || 1;
  const languages = Object.entries(langTotals)
    .sort((a,b) => b[1]-a[1]).slice(0,5)
    .map(([lang,count]) => ({ lang, pct: Math.round((count/langTotal)*100) }));

  const stars = repoList.reduce((sum,r) => sum + (r.stargazers_count||0), 0);

  return {
    profile: {
      login: profile.login, avatar: profile.avatar_url, bio: profile.bio,
      public_repos: profile.public_repos, followers: profile.followers,
      following: profile.following, html_url: profile.html_url,
    },
    items, pinned, languages, stars,
    contributions: (contrib && Array.isArray(contrib.contributions)) ? contrib.contributions.slice(-119) : null,
    topLanguage: languages[0]?.lang || null,
  };
}

/* ---- render: activity feed ------------------------------------------------ */
function renderFeed(listEl, items){
  listEl.innerHTML = '';
  if(!items.length){
    listEl.innerHTML = '<li class="github-feed-item">No recent public activity — check back soon.</li>';
    return;
  }
  items.forEach(it => {
    const li = document.createElement('li');
    li.className = 'github-feed-item';
    li.innerHTML = `<span class="github-feed-verb">${it.verb}</span> <a class="github-feed-repo" href="${it.url}" target="_blank" rel="noopener noreferrer">${it.repo}</a><span class="github-feed-time mono">${timeAgo(it.when)}</span>`;
    listEl.appendChild(li);
  });
}

/* ---- render: stat counters ------------------------------------------------ */
function renderStats(root, profile, stars){
  const repoEl = root.querySelector('[data-gh-stat="repos"]');
  const starEl = root.querySelector('[data-gh-stat="stars"]');
  const followEl = root.querySelector('[data-gh-stat="followers"]');
  animateCount(repoEl, profile.public_repos || 0);
  animateCount(starEl, stars || 0);
  animateCount(followEl, profile.followers || 0);
}

/* ---- render: language bar -------------------------------------------------- */
function renderLanguages(root, languages){
  const bar = root.querySelector('[data-gh="lang-bar"]');
  const legend = root.querySelector('[data-gh="lang-legend"]');
  if(!bar || !legend) return;
  if(!languages.length){ bar.innerHTML=''; legend.innerHTML=''; return; }
  bar.innerHTML = languages.map(l => `<span style="width:${l.pct}%;background:${langColor(l.lang)}" title="${l.lang} ${l.pct}%"></span>`).join('');
  legend.innerHTML = languages.map(l => `<span class="gh-lang-chip"><i style="background:${langColor(l.lang)}"></i>${l.lang} <b>${l.pct}%</b></span>`).join('');
}

/* ---- render: contribution graph -------------------------------------------- */
function renderContributions(root, contributions){
  const wrap = root.querySelector('[data-gh="contrib-graph"]');
  if(!wrap) return;
  if(!contributions || !contributions.length){ wrap.hidden = true; return; }
  wrap.hidden = false;
  const max = Math.max(1, ...contributions.map(d => d.count));
  wrap.innerHTML = contributions.map(d => {
    const level = d.count === 0 ? 0 : Math.min(4, Math.ceil((d.count / max) * 4));
    return `<span class="gh-contrib-cell" data-level="${level}" title="${d.date}: ${d.count} contribution(s)"></span>`;
  }).join('');
}

/* ---- render: pinned-style repo cards ---------------------------------------- */
function renderRepos(root, pinned){
  const grid = root.querySelector('[data-gh="repo-grid"]');
  if(!grid) return;
  if(!pinned.length){ grid.innerHTML = ''; return; }
  grid.innerHTML = pinned.map(r => `
    <a class="gh-repo-card" href="${r.url}" target="_blank" rel="noopener noreferrer" data-tilt>
      <div class="gh-repo-card-head">
        <span class="gh-repo-icon" aria-hidden="true">⌥</span>
        <span class="gh-repo-name">${r.name}</span>
      </div>
      <p class="gh-repo-desc">${(r.desc || '').replace(/</g,'&lt;')}</p>
      <div class="gh-repo-meta">
        ${r.lang ? `<span class="gh-repo-lang"><i style="background:${langColor(r.lang)}"></i>${r.lang}</span>` : ''}
        <span>★ ${r.stars}</span>
        <span>⑂ ${r.forks}</span>
      </div>
    </a>`).join('');
}

function showSkeleton(root, show){
  const skel = root.querySelector('[data-gh="skeleton"]');
  const live = root.querySelector('[data-gh="live"]');
  if(skel) skel.hidden = !show;
  if(live) live.hidden = show;
}

function renderAll(root, listEl, data){
  root.hidden = false;
  showSkeleton(root, false);
  renderFeed(listEl, data.items);
  renderStats(root, data.profile, data.stars);
  renderLanguages(root, data.languages);
  renderContributions(root, data.contributions);
  renderRepos(root, data.pinned);
}

export function initGithubFeed(){
  const widget = document.getElementById('githubFeed');
  const listEl = document.getElementById('githubFeedList');
  const profileLink = document.getElementById('githubProfileLink');
  if(!widget || !listEl) return;

  if(profileLink) profileLink.href = `https://github.com/${USERNAME}`;

  const cached = readCache();
  if(cached?.data) renderAll(widget, listEl, cached.data);
  else showSkeleton(widget, true);

  const isStale = !cached || (Date.now() - cached.timestamp) > REFRESH_MS;
  if(isStale){
    fetchAll()
      .then(data => {
        writeCache({ data, timestamp: Date.now() });
        try{
          localStorage.setItem(SUMMARY_KEY, JSON.stringify({
            login: data.profile.login, public_repos: data.profile.public_repos,
            followers: data.profile.followers, topLanguage: data.topLanguage,
          }));
        }catch(e){}
        renderAll(widget, listEl, data);
      })
      .catch(() => {
        if(!cached?.data) widget.hidden = true;
        else showSkeleton(widget, false);
      });
  }
}
