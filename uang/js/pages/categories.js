/* ═══════════════════════════════════════════
   pages/categories.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Categories = (() => {

  function render() {
    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Kelola Kategori</div>
          <div class="page-sub">Tambah atau hapus kategori transaksi</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-title">Tambah Kategori Baru</div>
          <div class="form-grid">
            <div>
              <label class="field-label">Nama Kategori</label>
              <input type="text" class="field-input" id="nc-name" placeholder="Contoh: Kos, Bensin, Bonus..." />
            </div>
            <div class="form-row">
              <div>
                <label class="field-label">Tipe</label>
                <select class="field-select" id="nc-type">
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                  <option value="both">Keduanya</option>
                </select>
              </div>
              <div>
                <label class="field-label">Icon (emoji)</label>
                <input type="text" class="field-input" id="nc-icon" placeholder="🏠" maxlength="4" />
              </div>
            </div>
            <button class="btn btn-primary btn-block" onclick="Pages.Categories.add()">+ Tambah Kategori</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">
            Daftar Kategori
            <span style="font-size:11px;font-weight:400;color:var(--ink-4);" id="cat-count"></span>
          </div>

          <div style="display:flex;gap:6px;margin-bottom:14px;">
            <button class="btn btn-sm btn-ghost" onclick="Pages.Categories.filterType('')">Semua</button>
            <button class="btn btn-sm btn-ghost" onclick="Pages.Categories.filterType('income')">Pemasukan</button>
            <button class="btn btn-sm btn-ghost" onclick="Pages.Categories.filterType('expense')">Pengeluaran</button>
          </div>

          <div id="cat-list" style="max-height:380px;overflow-y:auto;"></div>
        </div>
      </div>
    `);

    _render('');
  }

  function _render(filter) {
    const cats = App.state.categories;
    const shown = filter ? cats.filter(c => c.type === filter || c.type === 'both') : cats;

    document.getElementById('cat-count').textContent = `${shown.length} kategori`;

    const typeLabel = { income: 'Pemasukan', expense: 'Pengeluaran', both: 'Keduanya' };
    const typeBg    = { income: 'var(--green-soft)', expense: 'var(--red-soft)', both: 'var(--blue-soft)' };
    const typeColor = { income: 'var(--green)',       expense: 'var(--red)',       both: 'var(--blue)' };

    document.getElementById('cat-list').innerHTML = shown.length
      ? shown.map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:20px;width:28px;text-align:center;">${c.icon || '💰'}</span>
              <div>
                <div style="font-size:13.5px;font-weight:500;">${c.name}</div>
                <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;
                  background:${typeBg[c.type]};color:${typeColor[c.type]};">
                  ${typeLabel[c.type]}
                </span>
              </div>
            </div>
            <button class="del-btn" onclick="Pages.Categories.delete('${c.id}', '${c.name}')">🗑</button>
          </div>`).join('')
      : `<div style="padding:20px;text-align:center;font-size:13px;color:var(--ink-4);">Tidak ada kategori</div>`;
  }

  function filterType(type) {
    _render(type);
  }

  async function add() {
    const name = document.getElementById('nc-name').value.trim();
    const type = document.getElementById('nc-type').value;
    const icon = document.getElementById('nc-icon').value.trim() || '💰';

    if (!name) { UI.toast('Nama kategori wajib diisi!', 'error'); return; }

    try {
      await DB.insertCategory({ name, type, icon, color: '#9CA3AF' });
      await App.reloadCategories();
      document.getElementById('nc-name').value = '';
      document.getElementById('nc-icon').value = '';
      _render('');
      UI.toast(`Kategori "${name}" ditambahkan!`, 'success');
    } catch(e) { UI.toast('Gagal: ' + e.message, 'error'); }
  }

  async function del(id, name) {
    if (!confirm(`Hapus kategori "${name}"?`)) return;
    try {
      await DB.deleteCategory(id);
      await App.reloadCategories();
      _render('');
      UI.toast('Kategori dihapus.', 'success');
    } catch(e) { UI.toast('Gagal: ' + e.message, 'error'); }
  }

  return { render, filterType, add, delete: del };
})();
