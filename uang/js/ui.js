/* ═══════════════════════════════════════════
   ui.js — UI utilities, router, toast, charts
   ═══════════════════════════════════════════ */
const UI = (() => {

  let _activeChart = {};

  // ── ROUTING ──
  function navigate(page) {
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });

    const pages = {
      dashboard:    Pages.Dashboard,
      transactions: Pages.Transactions,
      add:          Pages.Add,
      budget:       Pages.Budget,
      goals:        Pages.Goals,
      report:       Pages.Report,
      categories:   Pages.Categories,
    };

    const renderer = pages[page];
    if (!renderer) return;
    renderer.render();
    closeSidebar();
  }

  function bindNav() {
    document.querySelectorAll('.nav-link').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.page));
    });
  }

  // ── SIDEBAR ──
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-overlay').classList.toggle('open');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
  }

  // ── TOAST ──
  let _toastTimer = null;
  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast visible${type ? ' t-'+type : ''}`;
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
  }

  // ── RENDER ──
  function setMain(html) {
    document.getElementById('main-content').innerHTML = html;
  }

  // ── MODALS ──
  function openModal(id) { document.getElementById(id).style.display = 'flex'; }
  function closeModal(id) { document.getElementById(id).style.display = 'none'; }

  // Make clicking overlay close modal
  function bindModalOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) closeModal(id); });
  }

  // ── CHARTS ──
  function destroyChart(key) {
    if (_activeChart[key]) { _activeChart[key].destroy(); delete _activeChart[key]; }
  }

  function donutChart(canvasId, labels, data, colors) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx || !data.length) return;
    _activeChart[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'DM Sans', size: 11 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 }
          }
        }
      }
    });
  }

  function lineChart(canvasId, labels, datasets) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    _activeChart[canvasId] = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { font: { family: 'DM Sans', size: 11 }, padding: 12, usePointStyle: true } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxTicksLimit: 12 } },
          y: { grid: { color: '#F3F4F6' }, ticks: { callback: v => fmtK(v), font: { size: 11 } } }
        }
      }
    });
  }

  function barChart(canvasId, labels, datasets) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    _activeChart[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { font: { family: 'DM Sans', size: 11 }, padding: 12, usePointStyle: true } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { grid: { color: '#F3F4F6' }, ticks: { callback: v => fmtK(v), font: { size: 11 } } }
        }
      }
    });
  }

  // ── FORMAT HELPERS ──
  function fmt(n) {
    return 'Rp\u00A0' + Math.abs(Number(n)).toLocaleString('id-ID');
  }
  function fmtK(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' jt';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' rb';
    return n;
  }
  function fmtDate(d) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateShort(d) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
  function currentMonth() { return new Date().toISOString().slice(0, 7); }
  function today() { return new Date().toISOString().slice(0, 10); }

  // ── TX RENDER HELPER ──
  function txItemHtml(tx, cats, showDelete = false) {
    const cat = cats.find(c => c.name === tx.category) || { icon: tx.type === 'income' ? '💰' : '💸', color: '#9CA3AF' };
    const sign = tx.type === 'income' ? '+' : '−';
    const delBtn = showDelete
      ? `<button class="del-btn" onclick="Pages.Transactions.delete('${tx.id}')">🗑</button>`
      : '';
    return `
      <div class="tx-item">
        <div class="tx-icon" style="background:${cat.color}1A;">${cat.icon}</div>
        <div class="tx-body">
          <div class="tx-name">${tx.description || '—'}</div>
          <div class="tx-cat">${tx.category || '—'}</div>
        </div>
        <div class="tx-right">
          <div class="tx-amount ${tx.type}">${sign}${fmt(tx.amount)}</div>
          <div class="tx-date">${fmtDateShort(tx.date)}</div>
        </div>
        ${delBtn}
      </div>`;
  }

  function emptyHtml(icon, msg) {
    return `<div class="empty"><div class="empty-icon">${icon}</div><p>${msg}</p></div>`;
  }

  return {
    navigate, bindNav, toggleSidebar, closeSidebar,
    toast, setMain, openModal, closeModal, bindModalOverlay,
    donutChart, lineChart, barChart,
    fmt, fmtK, fmtDate, fmtDateShort, currentMonth, today,
    txItemHtml, emptyHtml
  };
})();
