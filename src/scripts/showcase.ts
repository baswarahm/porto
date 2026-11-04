/* Project tool tours: open from any [data-showcase="<slug>"] button.
   Tabs switch tools (click, or ← / → while a tab has focus), view buttons
   switch screenshots inside a tool, close with ✕, Esc or the backdrop. */
export function initShowcase(){
  document.querySelectorAll<HTMLButtonElement>('[data-showcase]').forEach(btn => {
    const dialog = document.getElementById(`sc-${btn.dataset.showcase}`) as HTMLDialogElement | null;
    if (!dialog) return;
    btn.addEventListener('click', e => { e.preventDefault(); dialog.showModal(); });
  });

  document.querySelectorAll<HTMLDialogElement>('dialog.showcase').forEach(dialog => {
    const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const panels = Array.from(dialog.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    const body = dialog.querySelector<HTMLElement>('.sc-body')!;

    const select = (i: number, focus = false) => {
      i = (i + tabs.length) % tabs.length;
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      panels[i].classList.remove('in'); void panels[i].offsetWidth; panels[i].classList.add('in');
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      body.scrollTop = 0;
      // on phones the whole card scrolls: bring the new tool's top back under the pinned tabs
      const card = body.parentElement!, tabsEl = tabs[0].parentElement!;
      if (card.scrollTop > tabsEl.offsetTop) card.scrollTop = tabsEl.offsetTop;
      if (focus) tabs[i].focus();
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', e => {
        const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (step){ e.preventDefault(); select(i + step, true); }
      });
    });
    dialog.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach(b =>
      b.addEventListener('click', () => select(Number(b.dataset.goto), true)));

    // a tool with several screenshots gets small view switches
    panels.forEach(panel => {
      const main = panel.querySelector<HTMLImageElement>('[data-main]')!;
      const views = Array.from(panel.querySelectorAll<HTMLButtonElement>('.sc-views button'));
      views.forEach(v => v.addEventListener('click', () => {
        views.forEach(x => x.setAttribute('aria-pressed', String(x === v)));
        main.classList.add('swap');
        setTimeout(() => { main.src = v.dataset.src!; main.alt = v.dataset.alt!; main.classList.remove('swap'); }, 160);
      }));
    });

    dialog.addEventListener('close', () => select(0));
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    // a click on the backdrop lands on the <dialog> itself, outside the card
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  });
}
