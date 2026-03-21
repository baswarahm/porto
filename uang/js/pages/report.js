/* ═══════════════════════════════════════════
   pages/report.js
   ═══════════════════════════════════════════ */
Pages = window.Pages || {};

Pages.Report = (() => {
  let _month = UI.currentMonth();

  async function render() {
    UI.setMain(`
      <div class="page-header">
        <div>
          <div class="page-title">Laporan Keuangan 📈</div>
          <div class="page-sub">Analisis mendalam keuangan bulananmu</div>
        </div>
        <div class="page-actions">
          <div class="month-picker">
            <input type="month" id="rep-month" value="${_month}" onchange="Pages.Report.changeMonth(this.value)">
          </div>
        </div>
      </div>

      <div class="stat-row" id="rep-stats"></div>

      <div class="panel" style="margin-bottom:18px;">
        <div class="panel-title">Grafik Harian</div>
        <canvas id="daily-chart" height="150"></canvas>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-title">Top 5 Pengeluaran Terbesar</div>
          <div id="top-exp" class="tx-list"></div>
        </div>
        <div class="panel">
          <div class="panel-title">Top 5 Pemasukan Terbesar</div>
          <div id="top-inc" class="tx-list"></div>
        </div>
      </div>

      <div class="panel" style="margin-top:18px;">
        <div class="panel-title">Pengeluaran per Kategori</div>
        <div id="cat-table"></div>
      </div>
    `);

    await _load();
  }

  async function _load() {
    const { start, end } = DB.monthRange(_month);
    const txs = await DB.getTx(start, end);
    const cats = App.state.categories;

    const income  = txs.filter(t=>t.type==='income').reduce((s,t)=>s + +t.amount, 0);
    const expense = txs.filter(t=>t.type==='expense').reduce((s,t)=>s + +t.amount, 0);
    const balance = income - expense;
    const [y, m]  = _month.split('-');
    const days    = new Date(y, m, 0).getDate();
    const avgDay  = days > 0 ? expense / days : 0;
    const txCount = txs.length;
    const savRate = income > 0 ? Math.round((balance/income)*100) : 0;

    document.getElementById('rep-stats').innerHTML = `
      <div class="stat-box"><div class="sb-val" style="color:var(--green);">${UI.fmt(income)}</div><div class="sb-lbl">Total Pemasukan</div></div>
      <div class="stat-box"><div class="sb-val" style="color:var(--red);">${UI.fmt(expense)}</div><div class="sb-lbl">Total Pengeluaran</div></div>
      <div class="stat-box"><div class="sb-val" style="color:${balance>=0?'var(--green)':'var(--red)'};">${balance<0?'−':''}${UI.fmt(balance)}</div><div class="sb-lbl">Saldo Bersih</div></div>
      <div class="stat-box"><div class="sb-val">${txCount}</div><div class="sb-lbl">Total Transaksi</div></div>
      <div class="stat-box"><div class="sb-val" style="color:var(--amber);">${UI.fmt(avgDay)}</div><div class="sb-lbl">Rata-rata/Hari</div></div>
      <div class="stat-box"><div class="sb-val" style="color:var(--violet);">${savRate}%</div><div class="sb-lbl">Saving Rate</div></div>
    `;

    // Daily bar chart
    const incDay = new Array(days).fill(0);
    const expDay = new Array(days).fill(0);
    txs.forEach(t => {
      const d = new Date(t.date).getDate() - 1;
      if (t.type==='income') incDay[d] += +t.amount; else expDay[d] += +t.amount;
    });
    UI.barChart('daily-chart',
      Array.from({length:days},(_,i)=>i+1),
      [
        { label:'Pemasukan',   data:incDay, backgroundColor:'#10B98166', borderRadius:4 },
        { label:'Pengeluaran', data:expDay, backgroundColor:'#EF444466', borderRadius:4 },
      ]
    );

    // Top transactions
    const topExp = [...txs.filter(t=>t.type==='expense')].sort((a,b)=>b.amount-a.amount).slice(0,5);
    const topInc = [...txs.filter(t=>t.type==='income')].sort((a,b)=>b.amount-a.amount).slice(0,5);
    document.getElementById('top-exp').innerHTML = topExp.length
      ? topExp.map(t=>UI.txItemHtml(t,cats)).join('') : UI.emptyHtml('📭','Tidak ada pengeluaran');
    document.getElementById('top-inc').innerHTML = topInc.length
      ? topInc.map(t=>UI.txItemHtml(t,cats)).join('') : UI.emptyHtml('📭','Tidak ada pemasukan');

    // Category breakdown table
    const catMap = {};
    txs.filter(t=>t.type==='expense').forEach(t => {
      const k = t.category||'Lainnya';
      catMap[k] = (catMap[k]||0) + +t.amount;
    });
    const sorted = Object.entries(catMap).sort((a,b)=>b[1]-a[1]);
    const total  = expense || 1;

    document.getElementById('cat-table').innerHTML = sorted.length ? `
      <table style="width:100%;border-collapse:collapse;font-size:13.5px;">
        <thead>
          <tr style="border-bottom:1.5px solid var(--line);">
            <th style="text-align:left;padding:8px 4px;font-weight:600;color:var(--ink-3);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Kategori</th>
            <th style="text-align:right;padding:8px 4px;font-weight:600;color:var(--ink-3);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">Jumlah</th>
            <th style="text-align:right;padding:8px 4px;font-weight:600;color:var(--ink-3);font-size:11px;text-transform:uppercase;letter-spacing:.5px;">%</th>
            <th style="padding:8px 4px;width:120px;"></th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(([cat, amt]) => {
            const pct = Math.round((amt/total)*100);
            const c   = cats.find(c=>c.name===cat)||{icon:'💸',color:'#9CA3AF'};
            return `
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:10px 4px;">${c.icon} ${cat}</td>
                <td style="padding:10px 4px;text-align:right;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;">${UI.fmt(amt)}</td>
                <td style="padding:10px 4px;text-align:right;color:var(--ink-3);">${pct}%</td>
                <td style="padding:10px 4px;">
                  <div style="height:6px;background:var(--bg-2);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${pct}%;background:${c.color||'var(--amber)'};border-radius:99px;"></div>
                  </div>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>` : UI.emptyHtml('📊', 'Tidak ada data pengeluaran');
  }

  function changeMonth(val) { _month = val; _load(); }

  return { render, changeMonth };
})();
