/* ═══════════════════════════════════════════
   pages/dashboard.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Dashboard = (() => {

  let _month = UI.currentMonth();

  async function render() {
    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-sub" id="dash-date"></div>
        </div>
        <div class="page-actions">
          <div class="month-picker">
            <input type="month" id="dash-month" value="${_month}" onchange="Pages.Dashboard.changeMonth(this.value)">
          </div>
        </div>
      </div>

      <div class="stat-grid" id="stat-grid">
        ${_skeletonCards()}
      </div>

      <div class="grid-65">
        <div class="panel">
          <div class="panel-title">
            Transaksi Terbaru
            <span class="link-sm" onclick="UI.navigate('transactions')">Lihat semua →</span>
          </div>
          <div id="recent-list"><div class="empty">${_spin()}</div></div>
        </div>
        <div class="panel">
          <div class="panel-title">Pengeluaran per Kategori</div>
          <canvas id="cat-chart" height="240"></canvas>
          <div id="cat-empty" style="display:none;" class="empty"><div class="empty-icon">📊</div><p>Belum ada pengeluaran</p></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-title">Tren Bulan Ini</div>
          <canvas id="trend-chart" height="175"></canvas>
        </div>
        <div class="panel">
          <div class="panel-title">Ringkasan Cepat ✨</div>
          <div id="quick-summary" style="display:flex;flex-direction:column;gap:12px;"></div>
        </div>
      </div>
    `);

    document.getElementById('dash-date').textContent =
      new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    await _load();
  }

  async function changeMonth(val) {
    _month = val;
    await _load();
  }

  async function _load() {
    const { start, end } = DB.monthRange(_month);
    const txs = await DB.getTx(start, end);

    const income  = txs.filter(t => t.type === 'income').reduce((s,t) => s + +t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((s,t) => s + +t.amount, 0);
    const balance = income - expense;
    const rate    = income > 0 ? Math.round((balance / income) * 100) : 0;

    // Stat cards
    document.getElementById('stat-grid').innerHTML = `
      <div class="stat-card c-green">
        <div class="sc-label">Pemasukan</div>
        <div class="sc-amount">${UI.fmt(income)}</div>
        <div class="sc-meta">${txs.filter(t=>t.type==='income').length} transaksi</div>
      </div>
      <div class="stat-card c-red">
        <div class="sc-label">Pengeluaran</div>
        <div class="sc-amount">${UI.fmt(expense)}</div>
        <div class="sc-meta">${txs.filter(t=>t.type==='expense').length} transaksi</div>
      </div>
      <div class="stat-card c-amber">
        <div class="sc-label">Saldo Bersih</div>
        <div class="sc-amount" style="color:${balance>=0?'var(--green)':'var(--red)'};">${balance<0?'−':''}${UI.fmt(balance)}</div>
        <div class="sc-meta">${balance >= 0 ? '✅ Surplus' : '⚠️ Defisit'}</div>
      </div>
      <div class="stat-card c-violet">
        <div class="sc-label">Saving Rate</div>
        <div class="sc-amount" style="color:var(--violet);">${rate}%</div>
        <div class="sc-meta">dari total pemasukan</div>
      </div>`;

    // Recent transactions
    const recent = txs.slice(0, 6);
    const cats = App.state.categories;
    document.getElementById('recent-list').innerHTML = recent.length
      ? `<div class="tx-list">${recent.map(t => UI.txItemHtml(t, cats)).join('')}</div>`
      : UI.emptyHtml('📭', 'Belum ada transaksi bulan ini');

    // Category donut
    const expTxs = txs.filter(t => t.type === 'expense');
    const catMap = {};
    expTxs.forEach(t => { catMap[t.category||'Lainnya'] = (catMap[t.category||'Lainnya']||0) + +t.amount; });
    const catLabels = Object.keys(catMap);
    const catVals   = Object.values(catMap);
    const palette   = ['#EF4444','#F97316','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

    if (catLabels.length) {
      document.getElementById('cat-empty').style.display = 'none';
      UI.donutChart('cat-chart', catLabels, catVals, palette);
    } else {
      document.getElementById('cat-chart').style.display = 'none';
      document.getElementById('cat-empty').style.display = 'block';
    }

    // Trend line chart
    const [y, m] = _month.split('-');
    const days   = new Date(y, m, 0).getDate();
    const incDay = new Array(days).fill(0);
    const expDay = new Array(days).fill(0);
    txs.forEach(t => {
      const d = new Date(t.date).getDate() - 1;
      if (t.type === 'income') incDay[d] += +t.amount;
      else expDay[d] += +t.amount;
    });
    UI.lineChart('trend-chart',
      Array.from({length: days}, (_,i) => i+1),
      [
        { label: 'Pemasukan',   data: incDay, borderColor: '#10B981', backgroundColor: '#10B98115', fill: true, tension: .4, pointRadius: 2 },
        { label: 'Pengeluaran', data: expDay, borderColor: '#EF4444', backgroundColor: '#EF444415', fill: true, tension: .4, pointRadius: 2 },
      ]
    );

    // Quick summary
    const topCat = catLabels.reduce((a,b) => (catMap[a]||0) > (catMap[b]||0) ? a : b, catLabels[0]);
    const avgDaily = days > 0 ? expense / days : 0;
    document.getElementById('quick-summary').innerHTML = `
      ${_summaryRow('📅', 'Rata-rata pengeluaran/hari', UI.fmt(avgDaily))}
      ${_summaryRow('🏆', 'Kategori terbesar', topCat || '—')}
      ${_summaryRow('🧾', 'Total transaksi', txs.length + ' transaksi')}
      ${_summaryRow('💹', 'Rasio pengeluaran', income > 0 ? Math.round((expense/income)*100)+'%' : '—')}
    `;
  }

  function _summaryRow(icon, label, val) {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--bg-2);border-radius:9px;">
        <div style="display:flex;align-items:center;gap:9px;font-size:13px;color:var(--ink-3);">
          <span>${icon}</span><span>${label}</span>
        </div>
        <span style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:13.5px;">${val}</span>
      </div>`;
  }

  function _skeletonCards() {
    return Array(4).fill(0).map(() => `
      <div class="stat-card" style="opacity:.4;">
        <div style="height:11px;width:60%;background:var(--bg-2);border-radius:4px;margin-bottom:12px;"></div>
        <div style="height:22px;width:80%;background:var(--bg-2);border-radius:6px;"></div>
      </div>`).join('');
  }

  function _spin() {
    return '<div style="padding:24px;text-align:center;color:var(--ink-4);font-size:13px;">Memuat...</div>';
  }

  return { render, changeMonth };
})();
