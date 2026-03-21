/* ═══════════════════════════════════════════
   pages/goals.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Goals = (() => {

  async function render() {
    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Target Menabung 🎯</div>
          <div class="page-sub">Lacak progress menuju tujuan keuanganmu</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="Pages.Goals.openModal()">+ Target Baru</button>
        </div>
      </div>

      <div id="goals-wrap">${_spin()}</div>

      <!-- Modal -->
      <div id="modal-goal" class="modal-overlay" style="display:none;">
        <div class="modal">
          <div class="modal-title">Target Menabung Baru</div>
          <div class="form-grid">
            <div>
              <label class="field-label">Nama Target</label>
              <input type="text" class="field-input" id="g-name" placeholder="Contoh: Beli motor, Liburan Bali..." />
            </div>
            <div class="form-row">
              <div>
                <label class="field-label">Target Jumlah (Rp)</label>
                <input type="number" class="field-input" id="g-target" placeholder="10000000" min="1" />
              </div>
              <div>
                <label class="field-label">Sudah Terkumpul (Rp)</label>
                <input type="number" class="field-input" id="g-current" placeholder="0" value="0" min="0" />
              </div>
            </div>
            <div>
              <label class="field-label">Target Tanggal (opsional)</label>
              <input type="date" class="field-input" id="g-deadline" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" onclick="Pages.Goals.closeModal()">Batal</button>
            <button class="btn btn-primary" onclick="Pages.Goals.save()">Simpan</button>
          </div>
        </div>
      </div>
    `);

    UI.bindModalOverlay('modal-goal');
    await _load();
  }

  async function _load() {
    const goals = await DB.getGoals();
    const el    = document.getElementById('goals-wrap');

    if (!goals.length) {
      el.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <div style="font-size:56px;margin-bottom:14px;">🎯</div>
          <div style="font-family:'Bricolage Grotesque',sans-serif;font-size:18px;font-weight:700;margin-bottom:6px;">Belum ada target</div>
          <div style="font-size:13px;color:var(--ink-4);margin-bottom:20px;">Buat target pertamamu dan mulai menabung!</div>
          <button class="btn btn-primary" onclick="Pages.Goals.openModal()">+ Buat Target Pertama</button>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
        ${goals.map(g => _goalCard(g)).join('')}
      </div>`;
  }

  function _goalCard(g) {
    const pct       = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100);
    const remaining = Math.max(g.target_amount - g.current_amount, 0);
    const deadline  = g.deadline ? new Date(g.deadline).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : null;
    const done      = pct >= 100;

    return `
      <div class="goal-card" style="${done?'border-color:#10B981;background:linear-gradient(135deg,#D1FAE5,#fff)':''}">
        <div class="goal-top">
          <div>
            <div class="goal-name">${done?'✅ ':''} ${g.name}</div>
            ${deadline ? `<div class="goal-deadline">📅 Target: ${deadline}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="goal-pct" style="${done?'color:var(--green)':''}">${pct}%</div>
            <button class="del-btn" onclick="Pages.Goals.delete('${g.id}')">🗑</button>
          </div>
        </div>
        <div class="goal-bar-wrap">
          <div class="goal-fill" style="width:${pct}%;${done?'background:var(--green);':''}"></div>
        </div>
        <div class="goal-foot">
          <span>${UI.fmt(g.current_amount)} / ${UI.fmt(g.target_amount)} — Kurang ${UI.fmt(remaining)}</span>
        </div>
        ${!done ? `
          <div style="display:flex;gap:8px;margin-top:12px;">
            <input type="number" placeholder="Tambah tabungan (Rp)..." class="field-input"
              style="flex:1;padding:8px 12px;font-size:13px;" id="gadd-${g.id}" min="1" />
            <button class="btn btn-green btn-sm" onclick="Pages.Goals.addAmount('${g.id}',${g.current_amount},${g.target_amount})">+ Tabung</button>
          </div>` : `
          <div style="margin-top:10px;background:var(--green-soft);color:var(--green);border-radius:8px;padding:8px 12px;font-size:13px;font-weight:600;text-align:center;">
            🎉 Target tercapai!
          </div>`}
      </div>`;
  }

  function openModal()  { UI.openModal('modal-goal'); }
  function closeModal() { UI.closeModal('modal-goal'); }

  async function save() {
    const name    = document.getElementById('g-name').value.trim();
    const target  = parseFloat(document.getElementById('g-target').value);
    const current = parseFloat(document.getElementById('g-current').value) || 0;
    const deadline= document.getElementById('g-deadline').value || null;

    if (!name)             { UI.toast('Nama target wajib diisi!', 'error'); return; }
    if (!target || target <= 0) { UI.toast('Target jumlah tidak valid!', 'error'); return; }

    try {
      await DB.insertGoal({ name, target_amount: target, current_amount: current, deadline });
      closeModal();
      UI.toast('Target disimpan! 🎯', 'success');
      await _load();
    } catch(e) { UI.toast('Gagal simpan: ' + e.message, 'error'); }
  }

  async function addAmount(id, current, target) {
    const input = document.getElementById('gadd-' + id);
    const amount = parseFloat(input.value);
    if (!amount || amount <= 0) { UI.toast('Masukkan jumlah yang valid!', 'error'); return; }
    const newAmount = Math.min(current + amount, target);
    try {
      await DB.updateGoal(id, { current_amount: newAmount });
      UI.toast('Tabungan ditambahkan! 🐷', 'success');
      await _load();
    } catch(e) { UI.toast('Gagal update: ' + e.message, 'error'); }
  }

  async function del(id) {
    if (!confirm('Hapus target ini?')) return;
    try {
      await DB.deleteGoal(id);
      UI.toast('Target dihapus.', 'success');
      await _load();
    } catch(e) { UI.toast('Gagal hapus: ' + e.message, 'error'); }
  }

  function _spin() {
    return '<div style="padding:32px;text-align:center;color:var(--ink-4);font-size:13px;">Memuat...</div>';
  }

  return { render, openModal, closeModal, save, addAmount, delete: del };
})();
