/* ═══════════════════════════════════════════
   pages/budget.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Budget = (() => {
  let _month = UI.currentMonth();

  async function render() {
    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Anggaran</div>
          <div class="page-sub">Atur batas pengeluaran per kategori</div>
        </div>
        <div class="page-actions">
          <div class="month-picker">
            <input type="month" id="bud-month" value="${_month}" onchange="Pages.Budget.changeMonth(this.value)">
          </div>
          <button class="btn btn-primary" onclick="Pages.Budget.openModal()">+ Atur Anggaran</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-title">Status Anggaran</div>
          <div id="budget-list">${_spin()}</div>
        </div>
        <div class="panel">
          <div class="panel-title">Perbandingan</div>
          <canvas id="budget-chart" height="260"></canvas>
          <div id="budget-chart-empty" style="display:none;" class="empty">
            <div class="empty-icon">📊</div><p>Belum ada anggaran</p>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <div id="modal-budget" class="modal-overlay" style="display:none;">
        <div class="modal">
          <div class="modal-title">Atur Anggaran Bulanan</div>
          <div class="form-grid">
            <div>
              <label class="field-label">Kategori</label>
              <select class="field-select" id="b-cat">
                ${App.state.categories.filter(c=>c.type==='expense'||c.type==='both')
                  .map(c=>`<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="field-label">Batas Anggaran (Rp)</label>
              <input type="number" class="field-input" id="b-amount" placeholder="500000" min="1" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="Pages.Budget.closeModal()">Batal</button>
            <button class="btn btn-primary" onclick="Pages.Budget.save()">Simpan</button>
          </div>
        </div>
      </div>
    `);

    UI.bindModalOverlay('modal-budget');
    await _load();
  }

  async function _load() {
    const { start, end } = DB.monthRange(_month);
    const [budgets, txs] = await Promise.all([
      DB.getBudgets(_month),
      DB.getTx(start, end),
    ]);

    const catTotals = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      catTotals[t.category||'Lainnya'] = (catTotals[t.category||'Lainnya']||0) + +t.amount;
    });

    // Budget list
    const listEl = document.getElementById('budget-list');
    if (!budgets.length) {
      listEl.innerHTML = UI.emptyHtml('📊', 'Belum ada anggaran. Klik "+ Atur Anggaran"');
    } else {
      listEl.innerHTML = budgets.map(b => {
        const spent = catTotals[b.category] || 0;
        const pct   = Math.min(Math.round((spent / b.amount) * 100), 100);
        const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F97316' : '#10B981';
        return `
          <div class="budget-row">
            <div class="budget-head">
              <span class="budget-name">${b.category}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="budget-nums">${UI.fmt(spent)} / ${UI.fmt(b.amount)}</span>
                <span style="font-size:11px;font-weight:700;color:${color};">${pct}%</span>
                <button class="del-btn" onclick="Pages.Budget.delete('${b.id}')">🗑</button>
              </div>
            </div>
            <div class="budget-bar">
              <div class="budget-fill" style="width:${pct}%;background:${color};"></div>
            </div>
          </div>`;
      }).join('');
    }

    // Bar chart
    if (budgets.length) {
      document.getElementById('budget-chart').style.display = '';
      document.getElementById('budget-chart-empty').style.display = 'none';
      UI.barChart('budget-chart',
        budgets.map(b => b.category),
        [
          { label: 'Anggaran',   data: budgets.map(b => b.amount),               backgroundColor: '#E5E7EB', borderRadius: 5 },
          { label: 'Digunakan',  data: budgets.map(b => catTotals[b.category]||0), backgroundColor: '#F59E0BAA', borderRadius: 5 },
        ]
      );
    } else {
      document.getElementById('budget-chart').style.display = 'none';
      document.getElementById('budget-chart-empty').style.display = 'block';
    }
  }

  function openModal()  { UI.openModal('modal-budget'); }
  function closeModal() { UI.closeModal('modal-budget'); }

  async function save() {
    const cat = document.getElementById('b-cat').value;
    const amt = parseFloat(document.getElementById('b-amount').value);
    if (!cat || !amt || amt <= 0) { UI.toast('Lengkapi data anggaran!', 'error'); return; }
    try {
      await DB.upsertBudget({ category: cat, amount: amt, month: _month });
      closeModal();
      UI.toast('Anggaran disimpan! 💰', 'success');
      await _load();
    } catch(e) { UI.toast('Gagal simpan: ' + e.message, 'error'); }
  }

  async function del(id) {
    if (!confirm('Hapus anggaran ini?')) return;
    try {
      await DB.deleteBudget(id);
      UI.toast('Dihapus.', 'success');
      await _load();
    } catch(e) { UI.toast('Gagal hapus: ' + e.message, 'error'); }
  }

  function changeMonth(val) { _month = val; _load(); }

  function _spin() {
    return '<div style="padding:32px;text-align:center;color:var(--ink-4);font-size:13px;">Memuat...</div>';
  }

  return { render, openModal, closeModal, save, delete: del, changeMonth };
})();
