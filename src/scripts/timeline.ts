/* ==========================================================================
   TIMELINE.TS — quest log (Experience/Education tabs + accordion entries)
   and skill-bar fill-on-scroll.
   ========================================================================== */

export function initQuestTabs(){
  const tabs = document.querySelectorAll<HTMLButtonElement>('.quest-tab');
  if(!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls') || '');
        if(panel) panel.hidden = !selected;
      });
    });
  });
}

export function initQuestExpand(){
  document.querySelectorAll<HTMLButtonElement>('.quest-entry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const entry = btn.closest<HTMLElement>('.quest-entry');
      if(entry) entry.style.boxShadow = expanded ? '' : '0 0 0 1px rgba(var(--accent-rgb), .25)';
    });
  });
}

export function initSkillBars(){
  const items = document.querySelectorAll<HTMLElement>('.skill-item');
  if(!items.length) return;
  const fill = (it: HTMLElement) => {
    const bar = it.querySelector<HTMLElement>('.skill-bar-fill');
    if(bar) bar.style.width = it.dataset.pct + '%';
  };

  if(!('IntersectionObserver' in window)){ items.forEach(fill); return; }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        fill(entry.target as HTMLElement);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  items.forEach(it => obs.observe(it));
}
