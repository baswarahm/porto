/* ==========================================================================
   TERMINAL.JS — real interactive Contact-section terminal.
   Virtual filesystem, command history (persisted), Tab autocomplete,
   40+ commands, neofetch, JSON viewer, fake-hack sequence, matrix trigger.
   Every fact returned here already exists elsewhere on the site — this is
   a different way to reach the same honest information, not new claims.
   ========================================================================== */
import { reducedMotion } from './main.js';
import { showToast, copyToClipboard, downloadVCard } from './interaction.js';
import { triggerMatrixMode } from './easter-egg.js';
import { unlockAchievement } from './memory.js';

const EMAIL = 'baswarahafizh@gmail.com';
const HIST_KEY = 'baswara_term_history';
const BOOTED_AT = Date.now();

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/* ---- virtual filesystem -------------------------------------------------
   Plain nested-object tree. Directories are objects, files are strings
   (rendered as-is) or { json: <object> } (rendered through the JSON
   viewer). Nothing here is fetched — it's just structured content that
   already lives on the page, presented as a filesystem for flavor. ------ */
const FS = {
  home: {
    guest: {
      'about.txt':
`Baswara Hafizh Muttaqin
Undergraduate CS (Intelligent Computing) student at Universiti Sains Malaysia.
Originally from Solo, Indonesia. Freshman year, learns fast, not afraid of
the unfamiliar. Also: airsoft, Mobile Legends ranked, smartphone photography,
and reading about tech x economics.`,
      'skills.json': { json: {
        languages: { Python: '60%', JavaScript: '50%', 'C++': '40%' },
        tools: { GitHub: '55%', Docker: '35% (learning)', 'Kali Linux': '35% (learning)' },
        design: { Canva: '65%', Figma: '50%', 'CSS/Tailwind': '45%' }
      }},
      'projects.md':
`# Currently Building (nothing shipped yet)
- Mobile Legends Match Tracker      [idea stage]   Python, data
- Airsoft Scoring Companion         [planning]     JavaScript, Figma
- Tech x Economics Reading Log      [exploring]    CSS, writing

See the live GitHub feed in the "Currently Building" section for real-time activity.`,
      'resume.json': { json: {
        name: 'Baswara Hafizh Muttaqin',
        role: 'CS (Intelligent Computing) student',
        university: 'Universiti Sains Malaysia',
        origin: 'Solo, Indonesia',
        status: 'Seeking first project opportunity',
        experience: [
          { title: 'Chairman, Commission 1', org: 'MPK Student Representative Council', years: '2024–2025' },
          { title: 'Bronze Medal — Science Castle Asia', org: 'Multimedia University (MMU)', years: '2025' }
        ],
        contact: { email: EMAIL, github: 'github.com/baswarahafizh', linkedin: 'linkedin.com/in/baswara-hafizh-muttaqin' }
      }},
      'contact.txt':
`Email    : ${EMAIL}
LinkedIn : linkedin.com/in/baswara-hafizh-muttaqin-68a7b4329
Instagram: @baswara.hm
Discord  : discord.gg/53y7EKCfwP`,
      '.secrets': {
        'flag.txt': "You found it. There's no prize, just a friendly hello from whoever built this. o/"
      }
    }
  },
  var: {
    log: {
      'visits.log': "[system] this log is decorative — no real analytics are collected client-side."
    }
  }
};

function resolvePath(cwdArr, arg){
  if(!arg || arg === '~') return ['home','guest'];
  let parts = arg.startsWith('/') ? arg.split('/').filter(Boolean) : cwdArr.concat(arg.split('/').filter(Boolean));
  const out = [];
  for(const p of parts){
    if(p === '.') continue;
    if(p === '..'){ out.pop(); continue; }
    out.push(p);
  }
  return out;
}
function getNode(pathArr){
  let node = FS;
  for(const p of pathArr){
    if(node && typeof node === 'object' && !node.json && p in node) node = node[p];
    else return undefined;
  }
  return node;
}
function isDir(node){ return node && typeof node === 'object' && !('json' in node); }

/* ---- tiny JSON syntax highlighter, matches the terminal's accent colors */
function highlightJson(obj){
  const json = JSON.stringify(obj, null, 2);
  return escapeHtml(json)
    .replace(/(&quot;)([^&]*?)(&quot;)(:)/g, '<span class="term-json-key">$1$2$3</span>$4')
    .replace(/: (&quot;.*?&quot;)/g, ': <span class="term-json-str">$1</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="term-json-num">$1</span>');
}

function neofetchArt(){
  return `      /\\\\
     /  \\\\      <span class="term-json-key">guest</span>@<span class="term-json-key">baswara.hm</span>
    / /\\\\ \\\\    -----------------
   / ____ \\\\   <span class="term-cmd">OS</span>       BASWARA.HM v2.0 (web)
  /_/    \\\\_\\\\  <span class="term-cmd">Host</span>     Portfolio Terminal
                <span class="term-cmd">Shell</span>    vanilla-js 1.0
                <span class="term-cmd">Uptime</span>   {{UPTIME}}
                <span class="term-cmd">Stack</span>    HTML5, CSS3, ES Modules
                <span class="term-cmd">Focus</span>    Python, JS, C++
                <span class="term-cmd">Status</span>   Seeking first project opportunity`;
}

function uptimeStr(){
  const s = Math.floor((Date.now() - BOOTED_AT) / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function githubSummaryText(){
  try{
    const raw = localStorage.getItem('baswara_github_summary');
    const data = raw ? JSON.parse(raw) : null;
    if(!data) return "No cached GitHub stats yet — scroll to 'Currently Building' to load them, then try again.";
    return `Public repos : ${data.public_repos ?? '—'}
Followers    : ${data.followers ?? '—'}
Top language : ${data.topLanguage ?? '—'}
Profile      : github.com/${data.login ?? 'baswarahafizh'}`;
  }catch(e){ return 'GitHub stats unavailable.'; }
}

export function initTerminal(){
  const body = document.getElementById('terminalBody');
  const form = document.getElementById('terminalForm');
  const input = document.getElementById('terminalInput');
  const quickBtns = document.querySelectorAll('.quick-cmd');
  const promptEl = document.querySelector('.terminal-prompt');
  if(!body || !form || !input) return;

  let cwd = ['home','guest'];
  const cwdLabel = () => '~' + (cwd.length > 2 ? '/' + cwd.slice(2).join('/') : '');
  const promptText = () => `guest@baswara:${cwdLabel()}$`;
  const syncPrompt = () => { if(promptEl) promptEl.textContent = promptText(); };

  let history = [];
  try{ history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); }catch(e){ history = []; }
  let historyPos = history.length;

  function printLine(html, { isCommand = false, extraClass = '' } = {}){
    const p = document.createElement('p');
    p.className = 'term-line' + (isCommand ? ' term-line-echo' : '') + (extraClass ? ' ' + extraClass : '');
    p.innerHTML = html;
    body.appendChild(p);
    body.scrollTop = body.scrollHeight;
    return p;
  }
  function printRaw(html){
    body.insertAdjacentHTML('beforeend', html);
    body.scrollTop = body.scrollHeight;
  }

  const COMMANDS = {
    help(args){
      if(args[0] && COMMANDS[args[0]]){
        return `<span class="term-cmd">${args[0]}</span> — see it in action, or type <span class="term-cmd">help</span> for the full list.`;
      }
      return `Available commands (try <span class="term-cmd">help &lt;command&gt;</span> for hints):

  <span class="term-json-key">— content —</span>
  <span class="term-cmd">about</span> <span class="term-cmd">skills</span> <span class="term-cmd">projects</span> <span class="term-cmd">contact</span> <span class="term-cmd">resume</span> <span class="term-cmd">github</span> <span class="term-cmd">socials</span>

  <span class="term-json-key">— filesystem —</span>
  <span class="term-cmd">ls</span> <span class="term-cmd">cd</span> <span class="term-cmd">cat</span> <span class="term-cmd">pwd</span> <span class="term-cmd">tree</span>

  <span class="term-json-key">— system —</span>
  <span class="term-cmd">neofetch</span> <span class="term-cmd">whoami</span> <span class="term-cmd">date</span> <span class="term-cmd">uptime</span> <span class="term-cmd">history</span> <span class="term-cmd">motd</span> <span class="term-cmd">clear</span> <span class="term-cmd">reset</span>

  <span class="term-json-key">— fun —</span>
  <span class="term-cmd">matrix</span> <span class="term-cmd">hack</span> <span class="term-cmd">sudo</span> <span class="term-cmd">cowsay</span> <span class="term-cmd">joke</span> <span class="term-cmd">coinflip</span> <span class="term-cmd">roll</span>

  <span class="term-json-key">— site —</span>
  <span class="term-cmd">nav</span> <span class="term-cmd">palette</span> <span class="term-cmd">theme</span> <span class="term-cmd">vcard</span>

Tab = autocomplete · ↑/↓ = history`;
    },
    about(){
      return `Baswara Hafizh Muttaqin — undergraduate CS (Intelligent Computing) student
at Universiti Sains Malaysia, originally from Solo, Indonesia.
Freshman year, first internship not yet found, learns fast, not afraid
of the unfamiliar. Also: airsoft, Mobile Legends ranked, smartphone
photography, and reading about tech x economics.
Type <span class="term-cmd">cat about.txt</span> for the raw file.`;
    },
    skills(){
      return `Languages : Python (60%), JavaScript (50%), C++ (40%)
Tools     : GitHub (55%), Docker (35% — learning), Kali Linux (35% — learning)
Design    : Canva (65%), Figma (50%), CSS/Tailwind (45%)
Try <span class="term-cmd">cat skills.json</span> for the structured version, or scroll to the Skills section for the radar view.`;
    },
    projects(){
      return `Nothing shipped yet — here's what's on the workbench:
  · Mobile Legends Match Tracker      [idea stage]   — Python, data
  · Airsoft Scoring Companion         [planning]     — JavaScript, Figma
  · Tech x Economics Reading Log      [exploring]    — CSS, writing`;
    },
    contact(){
      return `Email   : <button type="button" class="term-copy" data-copy="${EMAIL}">${EMAIL}</button> <span class="term-hint">(click to copy)</span>
LinkedIn: <a href="https://www.linkedin.com/in/baswara-hafizh-muttaqin-68a7b4329/" target="_blank" rel="noopener noreferrer">linkedin.com/in/baswara-hafizh-muttaqin</a>
Instagram: <a href="https://instagram.com/baswara.hm" target="_blank" rel="noopener noreferrer">@baswara.hm</a>
Discord : <a href="https://discord.gg/53y7EKCfwP" target="_blank" rel="noopener noreferrer">discord.gg/53y7EKCfwP</a>`;
    },
    socials(){ return COMMANDS.contact(); },
    resume(){
      printRaw(`<pre class="term-json">${highlightJson(FS.home.guest['resume.json'].json)}</pre>`);
      return null;
    },
    github(){ return githubSummaryText(); },
    whoami(){ return 'guest — but feel free to become a collaborator. Try `contact`.'; },
    vcard(){ downloadVCard(); return 'Contact card downloading — check your downloads folder.'; },
    nav(){
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'k', ctrlKey:true }));
      return 'Opening quick nav →';
    },
    palette(){
      return `The HUD accent color isn't picked — it walks on its own, drifting
through 8 palettes every so often like a status light on a slow cycle.
No buttons needed. If you have prefers-reduced-motion on, it just
holds still on whichever color it opened on.`;
    },
    theme(){ return `Theme cycles automatically (see \`palette\`). Manual theme switching isn't wired up — this is a living HUD, not a settings panel.`; },
    matrix(){
      triggerMatrixMode();
      return reducedMotion ? 'Matrix mode is disabled while reduced motion is on.' : 'Wake up... (check your screen)';
    },
    date(){ return new Date().toString(); },
    uptime(){ return `Session uptime: ${uptimeStr()}`; },
    motd(){ return `Welcome to BASWARA.HM. This portfolio is under active construction — type \`projects\` to see what's cooking.`; },
    history(){
      if(!history.length) return 'No commands run yet this session.';
      return history.map((h, i) => `${String(i+1).padStart(3,' ')}  ${escapeHtml(h)}`).join('\n');
    },
    clear(){ body.innerHTML=''; return null; },
    reset(){ body.innerHTML=''; cwd=['home','guest']; syncPrompt(); return 'Terminal reset.'; },
    exit(){ return "There's no exit — this is a website, not a shell. Try scrolling instead. 😄"; },
    sudo(args){
      unlockAchievement && unlockAchievement('sudo', 'Nice Try');
      return args.length
        ? `guest is not in the sudoers file. This incident will be reported (jk, nothing is logged).`
        : 'usage: sudo &lt;command&gt; — but it will never work here.';
    },
    hack(){ runHackSequence(); return null; },
    cowsay(args){
      const msg = args.join(' ') || 'moo?';
      const top = ' ' + '_'.repeat(msg.length + 2);
      const bottom = ' ' + '-'.repeat(msg.length + 2);
      return `${top}\n&lt; ${escapeHtml(msg)} &gt;\n${bottom}\n        \\   ^__^\n         \\  (oo)\\\\_______\n            (__)\\\\       )\\\\/\\\\\n                ||----w |\n                ||     ||`;
    },
    joke(){
      const jokes = [
        'Why do programmers prefer dark mode? Because light attracts bugs.',
        "I'd tell you a UDP joke, but you might not get it.",
        'There are 10 kinds of people: those who understand binary, and those who don\'t.',
        "A freshman CS student's favorite exception: NotImplementedError.",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    },
    coinflip(){ return Math.random() < 0.5 ? 'Heads.' : 'Tails.'; },
    roll(args){
      const n = Math.max(2, parseInt(args[0], 10) || 6);
      return `🎲 Rolled a d${n}: ${1 + Math.floor(Math.random() * n)}`;
    },
    echo(args){ return escapeHtml(args.join(' ')); },
    pwd(){ return '/' + cwd.join('/'); },
    ls(args){
      const target = resolvePath(cwd, args[0]);
      const node = getNode(target);
      if(!isDir(node)) return `ls: cannot access '${escapeHtml(args[0]||'')}': not a directory`;
      const entries = Object.keys(node).filter(k => !k.startsWith('.'));
      if(!entries.length) return '(empty)';
      return entries.map(k => isDir(node[k]) ? `<span class="term-json-key">${k}/</span>` : k).join('  ');
    },
    cd(args){
      if(!args[0] || args[0] === '~'){ cwd = ['home','guest']; syncPrompt(); return null; }
      const target = resolvePath(cwd, args[0]);
      const node = getNode(target);
      if(!isDir(node)) return `cd: no such directory: ${escapeHtml(args[0])}`;
      cwd = target; syncPrompt();
      return null;
    },
    cat(args){
      if(!args[0]) return 'usage: cat <file>';
      const target = resolvePath(cwd, args[0]);
      const node = getNode(target);
      if(node === undefined) return `cat: ${escapeHtml(args[0])}: no such file`;
      if(isDir(node)) return `cat: ${escapeHtml(args[0])}: is a directory`;
      if(node && typeof node === 'object' && node.json){
        printRaw(`<pre class="term-json">${highlightJson(node.json)}</pre>`);
        return null;
      }
      return escapeHtml(node).replace(/\n/g,'<br>');
    },
    tree(){
      function walk(node, prefix){
        const keys = Object.keys(node).filter(k => !k.startsWith('.'));
        return keys.map((k,i) => {
          const last = i === keys.length - 1;
          const branch = prefix + (last ? '└── ' : '├── ');
          const childPrefix = prefix + (last ? '    ' : '│   ');
          if(isDir(node[k])) return `${branch}<span class="term-json-key">${k}/</span>\n${walk(node[k], childPrefix)}`;
          return `${branch}${k}`;
        }).join('\n');
      }
      return `~\n${walk(FS.home.guest, '')}`;
    },
    neofetch(){ return neofetchArt().replace('{{UPTIME}}', uptimeStr()); },
    man(args){
      return args[0] ? `No manual entry for ${escapeHtml(args[0])}. Try \`help ${escapeHtml(args[0])}\`.` : 'What manual page do you want?';
    },
  };
  const ALIASES = { ll:'ls', dir:'ls', cls:'clear', quit:'exit' };

  function runCommand(raw){
    const cmd = raw.trim();
    if(!cmd) return;
    printLine(`<span class="term-prompt-echo">${promptText()}</span> ${escapeHtml(cmd)}`, { isCommand:true });

    const [word, ...args] = cmd.split(/\s+/);
    const key = ALIASES[word.toLowerCase()] || word.toLowerCase();
    const handler = COMMANDS[key];
    if(handler){
      const out = handler(args);
      if(out !== null && out !== undefined) printLine(String(out).replace(/\n/g, '<br>'));
    } else {
      printLine(`command not found: ${escapeHtml(word)} — type <span class="term-cmd">help</span> for a list.`);
    }
  }

  function runHackSequence(){
    if(reducedMotion){ printLine('hack: skipped (reduced motion is on) — spoiler, access was always going to be denied.'); return; }
    const lines = [
      'Initializing exploit framework...',
      'Bypassing firewall [<span class="term-json-key">##########</span>] 100%',
      'Cracking password hash... trying rockyou.txt',
      'Injecting payload into /dev/null',
      'Escalating privileges...',
      'Rerouting through 12 proxies...',
    ];
    let i = 0;
    const el = printLine('');
    function next(){
      if(i < lines.length){
        el.innerHTML += (i ? '<br>' : '') + lines[i];
        body.scrollTop = body.scrollHeight;
        i++;
        setTimeout(next, 260 + Math.random()*220);
      } else {
        setTimeout(() => {
          printLine('<span class="term-json-key">ACCESS DENIED.</span> Nice try though. 😄 (this was always fake — no real network calls were made)');
          if(unlockAchievement && unlockAchievement('hacker', 'Definitely Not A Hacker')) showToast('🏆 Achievement Unlocked — Definitely Not A Hacker');
        }, 400);
      }
    }
    next();
  }

  /* ---- autocomplete -------------------------------------------------- */
  const suggestBox = document.createElement('div');
  suggestBox.className = 'term-suggest';
  suggestBox.setAttribute('role','listbox');
  form.appendChild(suggestBox);
  let suggestions = [];
  let suggestIdx = -1;

  function allNames(){ return [...Object.keys(COMMANDS), ...Object.keys(ALIASES)].sort(); }
  function updateSuggestions(){
    const val = input.value;
    if(!val){ suggestBox.hidden = true; suggestions = []; return; }
    const parts = val.split(/\s+/);
    let pool, prefix;
    if(parts.length === 1){ pool = allNames(); prefix = parts[0]; }
    else {
      const dirNode = getNode(cwd) || {};
      pool = Object.keys(dirNode);
      prefix = parts[parts.length-1];
    }
    suggestions = pool.filter(n => n.toLowerCase().startsWith(prefix.toLowerCase()) && n.toLowerCase() !== prefix.toLowerCase());
    suggestIdx = -1;
    if(!suggestions.length){ suggestBox.hidden = true; return; }
    suggestBox.hidden = false;
    suggestBox.innerHTML = suggestions.slice(0,8).map((s,i) => `<span class="term-suggest-item" data-i="${i}">${s}</span>`).join('');
  }
  function applySuggestion(name){
    const parts = input.value.split(/\s+/);
    parts[parts.length-1] = name;
    input.value = parts.join(' ');
    suggestBox.hidden = true;
    input.focus();
  }
  suggestBox.addEventListener('mousedown', (e) => {
    const item = e.target.closest('.term-suggest-item');
    if(item) applySuggestion(suggestions[+item.dataset.i]);
  });
  input.addEventListener('input', updateSuggestions);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value;
    if(val.trim()){
      history.push(val); historyPos = history.length;
      try{ localStorage.setItem(HIST_KEY, JSON.stringify(history.slice(-50))); }catch(err){}
    }
    runCommand(val);
    input.value = '';
    suggestBox.hidden = true;
  });

  input.addEventListener('keydown', (e) => {
    if(e.key === 'Tab'){
      e.preventDefault();
      if(!suggestions.length) updateSuggestions();
      if(suggestions.length){
        suggestIdx = (suggestIdx + 1) % suggestions.length;
        applySuggestion(suggestions[suggestIdx]);
        updateSuggestions();
      }
      return;
    }
    if(e.key === 'ArrowUp'){
      if(historyPos > 0){ historyPos--; input.value = history[historyPos] || ''; }
      e.preventDefault();
    } else if(e.key === 'ArrowDown'){
      if(historyPos < history.length){ historyPos++; input.value = history[historyPos] || ''; }
      e.preventDefault();
    } else if(e.key === 'Escape'){
      suggestBox.hidden = true;
    }
  });

  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => { runCommand(btn.dataset.cmd); input.focus(); });
  });

  body.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.term-copy');
    if(copyBtn){
      const rect = copyBtn.getBoundingClientRect();
      copyToClipboard(copyBtn.dataset.copy, { successMsg:'Email copied to clipboard', celebrateRect: rect });
      return;
    }
    input.focus();
  });

  syncPrompt();
}
