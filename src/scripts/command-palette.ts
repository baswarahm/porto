/* ==========================================================================
   COMMAND-PALETTE.TS — Ctrl/Cmd+K quick nav.
   A fuzzy-filterable list of destinations (sections) and actions (copy
   email, save contact, toggle matrix, scroll to top, open GitHub).
   Keyboard-first: type to filter, ↑/↓ to move, Enter to run, Esc to close.
   ========================================================================== */
import { reducedMotion, scrollToTarget } from './core';
import { copyToClipboard, downloadVCard } from './interaction';
import { triggerMatrixMode } from './easter-egg';
import { profile, sections, socials } from '../data/profile';

interface PaletteItem { group: string; label: string; hint?: string; run: () => void }

function buildItems(): PaletteItem[] {
  const github = socials.find(s => s.label === 'GitHub')?.href;
  return [
    ...sections.map(s => ({ group: 'Jump to', label: s.label, hint: s.id === 'hero' ? 'top of page' : undefined, run: () => scrollToTarget('#' + s.id) })),
    { group: 'Actions', label: 'Copy email address', hint: profile.email, run: () => copyToClipboard(profile.email, { successMsg: 'Email copied to clipboard' }) },
    { group: 'Actions', label: 'Save contact card', hint: '.vcf download', run: () => downloadVCard() },
    ...(github ? [{ group: 'Actions', label: 'Open GitHub profile', run: () => window.open(github, '_blank', 'noopener') }] : []),
    { group: 'Actions', label: 'Toggle Matrix mode', hint: '↑↑↓↓←→←→ B A also works', run: () => triggerMatrixMode() },
    { group: 'Actions', label: 'Scroll to top', run: () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }) },
  ];
}

export function initCommandPalette(){
  const overlay = document.getElementById('cmdkOverlay');
  const input = document.getElementById('cmdkInput') as HTMLInputElement | null;
  const list = document.getElementById('cmdkList');
  const trigger = document.getElementById('cmdkBtn');
  if(!overlay || !input || !list) return;

  const items = buildItems();
  let filtered = items;
  let activeIndex = 0;
  let lastFocused: Element | null = null;

  function render(){
    list!.innerHTML = '';
    if(!filtered.length){
      const empty = document.createElement('li');
      empty.className = 'cmdk-empty';
      empty.textContent = 'No matches — try “skills”, “email”, or “matrix”.';
      list!.appendChild(empty);
      return;
    }
    let currentGroup: string | null = null;
    filtered.forEach((item, i) => {
      if(item.group !== currentGroup){
        currentGroup = item.group;
        const heading = document.createElement('li');
        heading.className = 'cmdk-group';
        heading.textContent = currentGroup;
        heading.setAttribute('role', 'presentation');
        list!.appendChild(heading);
      }
      const li = document.createElement('li');
      li.className = 'cmdk-item' + (i === activeIndex ? ' is-active' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
      const label = document.createElement('span');
      label.className = 'cmdk-item-label';
      label.textContent = item.label;
      li.appendChild(label);
      if(item.hint){
        const hint = document.createElement('span');
        hint.className = 'cmdk-item-hint';
        hint.textContent = item.hint;
        li.appendChild(hint);
      }
      li.addEventListener('mouseenter', () => { activeIndex = i; render(); });
      li.addEventListener('click', () => runActive());
      list!.appendChild(li);
    });
  }

  function runActive(){
    const item = filtered[activeIndex];
    if(!item) return;
    close();
    item.run();
  }

  function filter(query: string){
    const q = query.trim().toLowerCase();
    filtered = !q ? items : items.filter(it =>
      it.label.toLowerCase().includes(q) || (it.hint || '').toLowerCase().includes(q) || it.group.toLowerCase().includes(q)
    );
    activeIndex = 0;
    render();
  }

  function open(){
    lastFocused = document.activeElement;
    overlay!.hidden = false;
    overlay!.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => overlay!.classList.add('is-open'));
    input!.value = '';
    filter('');
    input!.focus();
    document.body.style.overflow = 'hidden';
  }
  function close(){
    overlay!.classList.remove('is-open');
    overlay!.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { overlay!.hidden = true; }, reducedMotion ? 0 : 180);
    (lastFocused as HTMLElement | null)?.focus?.();
  }
  const toggle = () => overlay.hidden ? open() : close();

  trigger?.addEventListener('click', open);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });

  function scrollActiveIntoView(){
    list!.querySelector('.cmdk-item.is-active')?.scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('keydown', (e) => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); toggle(); return; }
    if(overlay.hidden) return;
    if(e.key === 'Escape'){ close(); return; }
    if(e.key === 'ArrowDown'){ e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); render(); scrollActiveIntoView(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); render(); scrollActiveIntoView(); }
    else if(e.key === 'Enter'){ e.preventDefault(); runActive(); }
  });

  input.addEventListener('input', () => filter(input.value));

  render();
}
