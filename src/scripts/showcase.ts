/* Project "features & screenshots" dialogs: open from any
   [data-showcase="<slug>"] button, swap screenshots with the thumbnails,
   the arrows or ← / →, close with ✕, Esc or a click on the backdrop. */
export function initShowcase(){
  document.querySelectorAll<HTMLButtonElement>('[data-showcase]').forEach(btn => {
    const dialog = document.getElementById(`sc-${btn.dataset.showcase}`) as HTMLDialogElement | null;
    if (!dialog) return;
    btn.addEventListener('click', e => { e.preventDefault(); dialog.showModal(); });
  });

  document.querySelectorAll<HTMLDialogElement>('dialog.showcase').forEach(dialog => {
    const main = dialog.querySelector<HTMLImageElement>('[data-main]')!;
    const caption = dialog.querySelector<HTMLElement>('[data-caption]')!;
    const thumbs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('.sc-thumb'));
    let index = 0;

    const show = (i: number) => {
      index = (i + thumbs.length) % thumbs.length;
      const t = thumbs[index];
      thumbs.forEach(x => x.setAttribute('aria-pressed', String(x === t)));
      main.classList.add('swap');
      setTimeout(() => {
        main.src = t.dataset.src!; main.alt = t.dataset.alt!;
        caption.innerHTML = '';
        const count = document.createElement('span');
        count.textContent = `${index + 1} / ${thumbs.length}`;
        caption.append(count, t.dataset.caption ?? '');
        main.classList.remove('swap');
      }, 160);
    };

    thumbs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    dialog.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(b =>
      b.addEventListener('click', () => show(index + Number(b.dataset.step))));
    dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
    // a click on the backdrop lands on the <dialog> itself, outside the card
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft'){ e.preventDefault(); show(index - 1); }
      if (e.key === 'ArrowRight'){ e.preventDefault(); show(index + 1); }
    });
  });
}
