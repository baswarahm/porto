/* ==========================================================================
   COMMAND-PALETTE.JS — Ctrl/Cmd+K quick nav.
   A single fuzzy-filterable list of destinations (sections) and actions
   (copy email, save contact, toggle matrix, scroll to top, open GitHub,
   focus the terminal). Keyboard-first: type to filter, ↑/↓ to move,
   Enter to run, Esc to close. Mouse works too — every row is a button.
   ========================================================================== */
import { reducedMotion } from './main.js';
import { copyToClipboard, downloadVCard } from './interaction.js';
import { triggerMatrixMode } from './easter-egg.js';

const EMAIL = 'baswarahafizh@gmail.com';

function buildItems(){
  return [
    { group:'Jump to', label:'Hero', hint:'top of page', run: () => go('#hero') },
    { group:'Jump to', label:'About', run: () => go('#about') },
    { group:'Jump to', label:'Skills', run: () => go('#skills') },
    { group:'Jump to', label:'Quest Log', hint:'experience & education', run: () => go('#quest-log') },
    { group:'Jump to', label:'Currently Building', run: () => go('#building') },
    { group:'Jump to', label:'Contact', hint:'terminal', run: () => go('#contact') },
    { group:'Actions', label:'Copy email address', hint:EMAIL, run: () => copyToClipboard(EMAIL, { successMsg:'Email copied to clipboard' }) },
    { group:'Actions', label:'Save contact card', hint:'.vcf download', run: () => downloadVCard() },
    { group:'Actions', label:'Open GitHub profile', run: () => window.open(document.getElementById('githubProfileLink')?.href || 'https://github.com/', '_blank', 'noopener') },
    { group:'Actions', label:'Focus terminal', hint:'type commands', run: () => { go('#contact'); setTimeout(() => document.getElementById('terminalInput')?.focus(), reducedMotion ? 0 : 500); } },
    { group:'Actions', label:'Toggle Matrix mode', hint:'↑↑↓↓←→←→ B A also works', run: () => triggerMatrixMode() },
    { group:'Actions', label:'Scroll to top', run: () => window.scrollTo({ top:0, behavior: reducedMotion ? 'auto' : 'smooth' }) },
  ];
}

function go(hash){
  document.querySelector(hash)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block:'start' });
}

export function initCommandPalette(){
  const overlay = document.getElementById('cmdkOverlay');
  const input = document.getElementById('cmdkInput');
  const list = document.getElementById('cmdkList');
  const trigger = document.getElementById('cmdkBtn');
  if(!overlay || !input || !list) return;

  const items = buildItems();
  let filtered = items;
  let activeIndex = 0;
  let lastFocused = null;

  function render(){
    list.innerHTML = '';
    let currentGroup = null;
    if(!filtered.length){
      const empty = document.createElement('li');
      empty.className = 'cmdk-empty';
      empty.textContent = 'No matches — try “skills”, “email”, or “matrix”.';
      list.appendChild(empty);
      return;
    }
    filtered.forEach((item, i) => {
      if(item.group !== currentGroup){
        currentGroup = item.group;
        const heading = document.createElement('li');
        heading.className = 'cmdk-group';
        heading.textContent = currentGroup;
        heading.setAttribute('role', 'presentation');
        list.appendChild(heading);
      }
      const li = document.createElement('li');
      li.className = 'cmdk-item' + (i === activeIndex ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
      li.innerHTML = `<span class="cmdk-item-label">${item.label}</span>` + (item.hint ? `<span class="cmdk-item-hint">${item.hint}</span>` : '');
      li.addEventListener('mouseenter', () => { activeIndex = i; render(); });
      li.addEventListener('click', () => runActive());
      list.appendChild(li);
    });
  }

  function runActive(){
    const item = filtered[activeIndex];
    if(!item) return;
    close();
    item.run();
  }

  function filter(query){
    const q = query.trim().toLowerCase();
    filtered = !q ? items : items.filter(it =>
      it.label.toLowerCase().includes(q) || (it.hint || '').toLowerCase().includes(q) || it.group.toLowerCase().includes(q)
    );
    activeIndex = 0;
    render();
  }

  function open(){
    lastFocused = document.activeElement;
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => overlay.classList.add('is-open'));
    input.value = '';
    filter('');
    input.focus();
    document.body.style.overflow = 'hidden';
  }
  function close(){
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.hidden = true; }, reducedMotion ? 0 : 180);
    lastFocused?.focus?.();
  }
  function toggle(){ overlay.hidden ? open() : close(); }

  trigger?.addEventListener('click', open);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });

  document.addEventListener('keydown', (e) => {
    const meta = e.metaKey || e.ctrlKey;
    if(meta && e.key.toLowerCase() === 'k'){ e.preventDefault(); toggle(); return; }
    if(overlay.hidden) return;
    if(e.key === 'Escape'){ close(); return; }
    if(e.key === 'ArrowDown'){ e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); render(); scrollActiveIntoView(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); scrollActiveIntoView(); }
    else if(e.key === 'Enter'){ e.preventDefault(); runActive(); }
  });

  function scrollActiveIntoView(){
    list.querySelector('.cmdk-item.is-active')?.scrollIntoView({ block:'nearest' });
  }

  input.addEventListener('input', () => filter(input.value));

  render();
}
