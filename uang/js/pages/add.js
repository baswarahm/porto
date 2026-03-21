/* ═══════════════════════════════════════════
   pages/add.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Add = (() => {
  let _type = 'expense';

  function render() {
    const cats = App.state.categories;
    const expCats = cats.filter(c => c.type === 'expense' || c.type === 'both');
    const incCats = cats.filter(c => c.type === 'income'  || c.type === 'both');

    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Catat Transaksi</div>
          <div class="page-sub">Tambahkan pemasukan atau pengeluaran baru</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-title">Detail Transaksi</div>
          <div class="form-grid">

            <div>
              <div class="field-label" style="margin-bottom:6px;">Tipe</div>
              <div class="type-toggle">
                <button class="type-btn ${_type==='income'?'sel-income':''}" id="btn-inc" onclick="Pages.Add.setType('income')">
                  💚 Pemasukan
                </button>
                <button class="type-btn ${_type==='expense'?'sel-expense':''}" id="btn-exp" onclick="Pages.Add.setType('expense')">
                  🔴 Pengeluaran
                </button>
              </div>
            </div>

            <div>
              <label class="field-label">Jumlah (Rp)</label>
              <input type="number" class="field-input" id="f-amount" placeholder="0" min="1" />
            </div>

            <div>
              <label class="field-label">Keterangan</label>
              <input type="text" class="field-input" id="f-desc" placeholder="Contoh: Gaji Januari, Makan siang..." />
            </div>

            <div class="form-row">
              <div>
                <label class="field-label">Kategori</label>
                <select class="field-select" id="f-cat">
                  <option value="">— Pilih —</option>
                  ${(_type==='income'?incCats:expCats).map(c => `<option value="${c.name}">${c.icon} ${c.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="field-label">Tanggal</label>
                <input type="date" class="field-input" id="f-date" value="${UI.today()}" />
              </div>
            </div>

            <div>
              <label class="field-label">Catatan (opsional)</label>
              <textarea class="field-textarea" id="f-note" placeholder="Keterangan tambahan..."></textarea>
            </div>

            <button class="btn btn-primary btn-block" onclick="Pages.Add.save()">
              💾 Simpan Transaksi
            </button>
          </div>
        </div>

        <div>
          <div class="panel" style="margin-bottom:16px;">
            <div class="panel-title">Kategori ${_type==='income'?'Pemasukan':'Pengeluaran'}</div>
            <div class="chips" id="cat-chips">
              ${(_type==='income'?incCats:expCats).map(c =>
                `<div class="chip" onclick="document.getElementById('f-cat').value='${c.name}';Pages.Add.highlightChip(this)">
                  ${c.icon} ${c.name}
                </div>`
              ).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-title">Tips Mencatat</div>
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${[
                ['📅','Catat segera setelah transaksi agar tidak lupa'],
                ['🏷️','Pilih kategori yang tepat untuk laporan lebih akurat'],
                ['📝','Tulis keterangan yang jelas agar mudah ditelusuri'],
                ['💡','Rutin catat = lebih sadar pengeluaranmu'],
              ].map(([i,t]) => `
                <div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--ink-3);">
                  <span style="font-size:16px;">${i}</span><span>${t}</span>
                </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `);
  }

  function setType(type) {
    _type = type;
    // Re-render to update category options
    render();
  }

  function highlightChip(el) {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
  }

  async function save() {
    const amount = parseFloat(document.getElementById('f-amount').value);
    const desc   = document.getElementById('f-desc').value.trim();
    const cat    = document.getElementById('f-cat').value;
    const date   = document.getElementById('f-date').value;
    const note   = document.getElementById('f-note').value.trim();

    if (!amount || amount <= 0) { UI.toast('Masukkan jumlah yang valid!', 'error'); return; }
    if (!desc)                   { UI.toast('Keterangan wajib diisi!', 'error'); return; }
    if (!date)                   { UI.toast('Tanggal wajib diisi!', 'error'); return; }

    try {
      await DB.insertTx({ type: _type, amount, description: desc, category: cat || null, note: note || null, date });
      UI.toast('Transaksi tersimpan! 🎉', 'success');
      // Reset form fields without full re-render
      document.getElementById('f-amount').value = '';
      document.getElementById('f-desc').value   = '';
      document.getElementById('f-note').value   = '';
      document.getElementById('f-date').value   = UI.today();
      document.getElementById('f-cat').value    = '';
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    } catch(e) {
      UI.toast('Gagal simpan: ' + e.message, 'error');
    }
  }

  return { render, setType, highlightChip, save };
})();
