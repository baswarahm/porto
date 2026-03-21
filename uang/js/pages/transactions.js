/* ═══════════════════════════════════════════
   pages/transactions.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Transactions = (() => {
  let _month = UI.currentMonth();
  let _all   = [];

  async function render() {
    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Transaksi</div>
          <div class="page-sub">Riwayat semua pemasukan & pengeluaran</div>
        </div>
        <div class="page-actions">
          <div class="month-picker">
            <input type="month" id="tx-month" value="${_month}" onchange="Pages.Transactions.changeMonth(this.value)">
          </div>
          <button class="btn btn-primary" onclick="UI.navigate('add')">+ Catat Baru</button>
        </div>
      </div>

      <div class="panel">
        <div class="filter-row">
          <input class="field-input" id="tx-search" placeholder="🔍 Cari..." oninput="Pages.Transactions.filter()">
          <select class="field-select" id="tx-type" onchange="Pages.Transactions.filter()">
            <option value="">Semua Tipe</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
          <select class="field-select" id="tx-cat" onchange="Pages.Transactions.filter()">
            <option value="">Semua Kategori</option>
            ${App.state.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
          </select>
        </div>
        <div id="tx-list">${_spin()}</div>
      </div>
    `);
    await _load();
  }

  async function _load() {
    const { start, end } = DB.monthRange(_month);
    _all = await DB.getTx(start, end);
    filter();
  }

  function filter() {
    const search = (document.getElementById('tx-search')?.value || '').toLowerCase();
    const type   = document.getElementById('tx-type')?.value || '';
    const cat    = document.getElementById('tx-cat')?.value || '';

    const filtered = _all.filter(t =>
      (!search || t.description?.toLowerCase().includes(search) || t.category?.toLowerCase().includes(search)) &&
      (!type   || t.type === type) &&
      (!cat    || t.category === cat)
    );

    const cats = App.state.categories;
    document.getElementById('tx-list').innerHTML = filtered.length
      ? `<div class="tx-list">${filtered.map(t => UI.txItemHtml(t, cats, true)).join('')}</div>`
      : UI.emptyHtml('📭', 'Tidak ada transaksi ditemukan');
  }

  async function del(id) {
    if (!confirm('Hapus transaksi ini?')) return;
    try {
      await DB.deleteTx(id);
      UI.toast('Transaksi dihapus.', 'success');
      await _load();
    } catch(e) { UI.toast('Gagal hapus: ' + e.message, 'error'); }
  }

  function changeMonth(val) { _month = val; _load(); }

  function _spin() {
    return '<div style="padding:32px;text-align:center;color:var(--ink-4);font-size:13px;">Memuat...</div>';
  }

  return { render, filter, delete: del, changeMonth };
})();
