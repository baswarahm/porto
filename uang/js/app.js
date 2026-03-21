/* ═══════════════════════════════════════════
   app.js — Bootstrap (personal, hardcoded)
   ═══════════════════════════════════════════

   ⚠️  GANTI DUA BARIS DI BAWAH INI DENGAN
       CREDENTIALS SUPABASE-MU SENDIRI
   ═══════════════════════════════════════════ */

const CONFIG = {
  SUPABASE_URL : 'https://uomdqxqljtjqpyumlmsv.supabase.co',   // ← ganti ini
  SUPABASE_KEY : 'sb_publishable_PJM-foSt5GMzresrh4W8oQ_kI5EdLRp',  // ← ganti ini
  USER_NAME    : 'Ibazz',                             // ← nama kamu
};

/* ─────────────────────────────────────────── */

const App = (() => {

  const state = {
    categories : [],
    userName   : CONFIG.USER_NAME,
  };

  async function _boot() {
    try {
      await DB.init(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
      state.categories = await DB.getCategories();

      document.getElementById('app').style.display = 'block';
      document.getElementById('sidebar-user').textContent = `Halo, ${CONFIG.USER_NAME}!`;

      UI.bindNav();
      UI.navigate('dashboard');
    } catch (e) {
      document.getElementById('app').innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;">
          <div style="text-align:center;max-width:400px;">
            <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
            <h2 style="margin-bottom:8px;color:#111;">Gagal terhubung ke Supabase</h2>
            <p style="color:#666;font-size:14px;margin-bottom:16px;">${e.message}</p>
            <p style="color:#999;font-size:13px;">Periksa SUPABASE_URL dan SUPABASE_KEY di <code>js/app.js</code></p>
          </div>
        </div>`;
      document.getElementById('app').style.display = 'block';
      console.error('Supabase init error:', e);
    }
  }

  async function reloadCategories() {
    state.categories = await DB.getCategories();
  }

  window.addEventListener('DOMContentLoaded', _boot);

  return { state, reloadCategories };
})();
