/* ==========================================================================
   GITHUB.JS — Live GitHub Activity Feed.
   Same posture as weather.js: free, keyless API (GitHub's public REST API),
   cached in LocalStorage, and if the fetch fails for any reason (rate
   limit, offline, no public activity) we fail quietly — the widget just
   hides itself instead of showing an error to a visitor.
   ========================================================================== */

const USERNAME = 'baswarahafizh'; // ← update this to the real GitHub handle
const CACHE_KEY = 'ibas_github_cache';
const REFRESH_MS = 15 * 60 * 1000;
const MAX_ITEMS = 5;

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

async function fetchActivity(){
  const res = await fetch(`https://api.github.com/users/${USERNAME}/events/public?per_page=10`, {
    headers: { Accept: 'application/vnd.github+json' }
  });
  if(!res.ok) throw new Error('github fetch failed: ' + res.status);
  const events = await res.json();
  return toItems(Array.isArray(events) ? events : []);
}

function render(widget, listEl, items){
  if(!items.length){
    widget.hidden = true;
    return;
  }
  widget.hidden = false;
  listEl.innerHTML = '';
  items.forEach(it => {
    const li = document.createElement('li');
    li.className = 'github-feed-item';
    li.innerHTML = `<span class="github-feed-verb">${it.verb}</span> <a class="github-feed-repo" href="${it.url}" target="_blank" rel="noopener noreferrer">${it.repo}</a><span class="github-feed-time mono">${timeAgo(it.when)}</span>`;
    listEl.appendChild(li);
  });
}

export function initGithubFeed(){
  const widget = document.getElementById('githubFeed');
  const listEl = document.getElementById('githubFeedList');
  const profileLink = document.getElementById('githubProfileLink');
  if(!widget || !listEl) return;

  if(profileLink) profileLink.href = `https://github.com/${USERNAME}`;

  const cached = readCache();
  if(cached?.items?.length) render(widget, listEl, cached.items);

  const isStale = !cached || (Date.now() - cached.timestamp) > REFRESH_MS;
  if(isStale){
    fetchActivity()
      .then(items => {
        writeCache({ items, timestamp: Date.now() });
        render(widget, listEl, items);
      })
      .catch(() => {
        // no cache and the fetch failed — don't show a half-built widget
        if(!cached?.items?.length) widget.hidden = true;
      });
  }
}
