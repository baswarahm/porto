/* ==========================================================================
   TIMELINE.JS — quest log (Experience/Education tabs + accordion entries)
   and skill-bar fill-on-scroll.
   ========================================================================== */

export function initQuestTabs(){
  const tabs = document.querySelectorAll('.quest-tab');
  const panels = { 'panel-exp': document.getElementById('panel-exp'), 'panel-edu': document.getElementById('panel-edu') };
  if(!tabs.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.setAttribute('aria-selected', 'false'); t.tabIndex = -1; });
      tab.setAttribute('aria-selected', 'true');
      tab.tabIndex = 0;
      Object.keys(panels).forEach(id => {
        if(panels[id]) panels[id].hidden = (id !== tab.getAttribute('aria-controls'));
      });
    });
  });
}

export function initQuestExpand(){
  document.querySelectorAll('.quest-entry-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const entry = btn.closest('.quest-entry');
      if(entry) entry.style.boxShadow = expanded ? '' : '0 0 0 1px rgba(var(--accent-rgb), .25)';
    });
  });
}

export function initSkillBars(){
  const items = document.querySelectorAll('.skill-item');
  if(!items.length) return;

  if(!('IntersectionObserver' in window)){
    items.forEach(it => { it.querySelector('.skill-bar-fill').style.width = it.dataset.pct + '%'; });
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        const it = entry.target;
        it.querySelector('.skill-bar-fill').style.width = it.dataset.pct + '%';
        obs.unobserve(it);
      }
    });
  }, { threshold:0.5 });
  items.forEach(it => obs.observe(it));
}
