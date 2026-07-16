/* ==========================================================================
   TERMINAL.JS — interactive Contact-section terminal.
   Commands: help, about, skills, projects, contact, coffee, matrix, theme,
   whoami, clear. Every fact returned here already exists elsewhere on the
   site (About/Skills/Building/Contact sections) — this is a different way
   to reach the same honest information, not a new set of claims.
   ========================================================================== */
import { reducedMotion } from './main.js';
import { showToast, copyToClipboard, downloadVCard } from './interaction.js';
import { triggerMatrixMode } from './easter-egg.js';

const EMAIL = 'baswarahafizh@gmail.com';

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const COMMANDS = {
  help(){
    return `Available commands:
  <span class="term-cmd">about</span>      — who I am
  <span class="term-cmd">skills</span>     — current tech stack
  <span class="term-cmd">projects</span>   — what's on the workbench
  <span class="term-cmd">contact</span>    — email + socials
  <span class="term-cmd">vcard</span>      — download my contact card
  <span class="term-cmd">nav</span>        — open the quick-nav palette (Ctrl/Cmd+K)
  <span class="term-cmd">palette</span>    — what's with the shifting HUD color?
  <span class="term-cmd">matrix</span>     — you know what this does
  <span class="term-cmd">whoami</span>     — short answer
  <span class="term-cmd">clear</span>      — clear this terminal`;
  },

  about(){
    return `Baswara Hafizh Muttaqin — undergraduate CS (Intelligent Computing) student
at Universiti Sains Malaysia, originally from Solo, Indonesia.
Freshman year, first internship not yet found, learns fast, not afraid
of the unfamiliar. Also: airsoft, Mobile Legends ranked, smartphone
photography, and reading about tech × economics.`;
  },

  skills(){
    return `Languages : Python (60%), JavaScript (50%), C++ (40%)
Tools     : GitHub (55%), Docker (35% — learning), Kali Linux (35% — learning)
Design    : Canva (65%), Figma (50%), CSS/Tailwind (45%)
(Full breakdown with progress bars is in the Skills section above.)`;
  },

  projects(){
    return `Nothing shipped yet — here's what's on the workbench:
  · Mobile Legends Match Tracker      [idea stage]   — Python, data
  · Airsoft Scoring Companion         [planning]     — JavaScript, Figma
  · Tech × Economics Reading Log      [exploring]    — CSS, writing`;
  },

  contact(){
    return `Email   : <button type="button" class="term-copy" data-copy="${EMAIL}">${EMAIL}</button> <span class="term-hint">(click to copy)</span>
LinkedIn: <a href="https://www.linkedin.com/in/baswara-hafizh-muttaqin-68a7b4329/" target="_blank" rel="noopener noreferrer">linkedin.com/in/baswara-hafizh-muttaqin</a>
Instagram: <a href="https://instagram.com/baswara.hm" target="_blank" rel="noopener noreferrer">@baswara.hm</a>
Discord : <a href="https://discord.gg/53y7EKCfwP" target="_blank" rel="noopener noreferrer">discord.gg/53y7EKCfwP</a>`;
  },

  whoami(){ return 'guest — but feel free to become a collaborator. Try `contact`.'; },

  vcard(){
    downloadVCard();
    return 'Contact card downloading — check your downloads folder.';
  },

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

  matrix(){
    triggerMatrixMode();
    return reducedMotion
      ? 'Matrix mode is disabled while reduced motion is on.'
      : 'Wake up... (check your screen)';
  }
};

export function initTerminal(){
  const body = document.getElementById('terminalBody');
  const form = document.getElementById('terminalForm');
  const input = document.getElementById('terminalInput');
  const quickBtns = document.querySelectorAll('.quick-cmd');
  if(!body || !form || !input) return;

  const history = [];
  let historyPos = -1;

  function printLine(html, { isCommand = false } = {}){
    const p = document.createElement('p');
    p.className = 'term-line';
    if(isCommand) p.classList.add('term-line-echo');
    p.innerHTML = html;
    body.appendChild(p);
    body.scrollTop = body.scrollHeight;
  }

  function runCommand(raw){
    const cmd = raw.trim();
    if(!cmd) return;
    printLine(`<span class="term-prompt-echo">guest@ibas:~$</span> ${escapeHtml(cmd)}`, { isCommand:true });

    if(cmd.toLowerCase() === 'clear'){
      body.innerHTML = '';
      return;
    }

    const handler = COMMANDS[cmd.toLowerCase()];
    if(handler){
      printLine(handler().replace(/\n/g, '<br>'));
    } else {
      printLine(`command not found: ${escapeHtml(cmd)} — type <span class="term-cmd">help</span> for a list.`);
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value;
    if(val.trim()){ history.push(val); historyPos = history.length; }
    runCommand(val);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowUp'){
      if(historyPos > 0){ historyPos--; input.value = history[historyPos] || ''; }
      e.preventDefault();
    } else if(e.key === 'ArrowDown'){
      if(historyPos < history.length){ historyPos++; input.value = history[historyPos] || ''; }
      e.preventDefault();
    }
  });

  // quick-command chips — the touch-friendly path for mobile visitors who
  // don't want to type on a phone keyboard
  quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      runCommand(btn.dataset.cmd);
      input.focus();
    });
  });

  // delegated handler for the copy-to-clipboard button rendered inside
  // the `contact` command's output
  body.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.term-copy');
    if(!copyBtn) return;
    const rect = copyBtn.getBoundingClientRect();
    copyToClipboard(copyBtn.dataset.copy, { successMsg:'Email copied to clipboard', celebrateRect: rect });
  });

  body.addEventListener('click', () => input.focus());
}
