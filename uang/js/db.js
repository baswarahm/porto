/* ═══════════════════════════════════════════
   db.js — Supabase database layer
   ═══════════════════════════════════════════ */
const DB = (() => {
  let client = null;

  const DEFAULT_CATEGORIES = [
    { name:'Gaji',            type:'income',  icon:'💼', color:'#10B981' },
    { name:'Freelance',       type:'income',  icon:'💻', color:'#3B82F6' },
    { name:'Investasi',       type:'income',  icon:'📈', color:'#8B5CF6' },
    { name:'Bisnis',          type:'income',  icon:'🏪', color:'#F59E0B' },
    { name:'Lainnya (masuk)', type:'income',  icon:'💰', color:'#06B6D4' },
    { name:'Makan & Minum',   type:'expense', icon:'🍜', color:'#EF4444' },
    { name:'Transportasi',    type:'expense', icon:'🚗', color:'#F97316' },
    { name:'Belanja',         type:'expense', icon:'🛍️', color:'#EC4899' },
    { name:'Kesehatan',       type:'expense', icon:'💊', color:'#10B981' },
    { name:'Tagihan',         type:'expense', icon:'📄', color:'#3B82F6' },
    { name:'Hiburan',         type:'expense', icon:'🎬', color:'#8B5CF6' },
    { name:'Pendidikan',      type:'expense', icon:'📚', color:'#F59E0B' },
    { name:'Tabungan',        type:'expense', icon:'🐷', color:'#14B8A6' },
    { name:'Lainnya (keluar)',type:'expense', icon:'💸', color:'#6B7280' },
  ];

  async function init(url, key) {
    client = supabase.createClient(url, key);
    await _ensureTables();
  }

  async function _ensureTables() {
    // Check if categories exist; if not, seed defaults
    const { data, error } = await client.from('categories').select('id').limit(1);
    if (error) {
      console.warn('Categories table issue, attempting seed:', error.message);
    }
    if (!data || data.length === 0) {
      await client.from('categories').insert(DEFAULT_CATEGORIES);
    }
  }

  // ── TRANSACTIONS ──
  async function getTx(startDate, endDate) {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function insertTx(tx) {
    const { data, error } = await client.from('transactions').insert(tx).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteTx(id) {
    const { error } = await client.from('transactions').delete().eq('id', id);
    if (error) throw error;
  }

  // ── CATEGORIES ──
  async function getCategories() {
    const { data, error } = await client.from('categories').select('*').order('name');
    if (error) throw error;
    return data || [];
  }

  async function insertCategory(cat) {
    const { data, error } = await client.from('categories').insert(cat).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteCategory(id) {
    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) throw error;
  }

  // ── BUDGETS ──
  async function getBudgets(month) {
    const { data, error } = await client.from('budgets').select('*').eq('month', month);
    if (error) throw error;
    return data || [];
  }

  async function upsertBudget(budget) {
    const { data, error } = await client
      .from('budgets')
      .upsert(budget, { onConflict: 'category,month' })
      .select().single();
    if (error) throw error;
    return data;
  }

  async function deleteBudget(id) {
    const { error } = await client.from('budgets').delete().eq('id', id);
    if (error) throw error;
  }

  // ── GOALS ──
  async function getGoals() {
    const { data, error } = await client.from('goals').select('*').order('created_at');
    if (error) throw error;
    return data || [];
  }

  async function insertGoal(goal) {
    const { data, error } = await client.from('goals').insert(goal).select().single();
    if (error) throw error;
    return data;
  }

  async function updateGoal(id, updates) {
    const { data, error } = await client.from('goals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteGoal(id) {
    const { error } = await client.from('goals').delete().eq('id', id);
    if (error) throw error;
  }

  // ── HELPERS ──
  function monthRange(ym) {
    const [y, m] = ym.split('-');
    const last = new Date(y, m, 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${String(last).padStart(2,'0')}` };
  }

  return { init, getTx, insertTx, deleteTx, getCategories, insertCategory, deleteCategory,
           getBudgets, upsertBudget, deleteBudget, getGoals, insertGoal, updateGoal, deleteGoal, monthRange };
})();
