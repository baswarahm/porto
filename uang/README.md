# 💛 Dompetku — Pencatat Keuangan Pribadi

Aplikasi pencatat keuangan pribadi berbasis web. Data tersimpan di Supabase milikmu.

---

## ⚡ Setup (3 langkah)

### 1. Buat tabel di Supabase

Login ke [supabase.com](https://supabase.com) → SQL Editor → jalankan:

```sql
CREATE TABLE transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('income','expense')),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category text,
  note text,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income','expense','both')),
  icon text DEFAULT '💰',
  color text DEFAULT '#888888',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  month text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, month)
);

CREATE TABLE goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  target_amount numeric NOT NULL CHECK (target_amount > 0),
  current_amount numeric DEFAULT 0,
  deadline date,
  created_at timestamptz DEFAULT now()
);

-- RLS (izinkan akses penuh karena personal)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON categories   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON budgets      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON goals        FOR ALL USING (true) WITH CHECK (true);
```

### 2. Isi credentials di `js/app.js`

```js
const CONFIG = {
  SUPABASE_URL : 'https://XXXX.supabase.co',   // ← Project URL
  SUPABASE_KEY : 'eyJhbGci...',                 // ← anon/public key
  USER_NAME    : 'Baswara',                     // ← nama kamu
};
```

Credentials ada di: **Supabase → Project Settings → API**

### 3. Push ke GitHub & aktifkan Pages

```bash
git init
git add .
git commit -m "init dompetku"
git branch -M main
git remote add origin https://github.com/USERNAME/dompetku.git
git push -u origin main
```

GitHub → **Settings → Pages → Source: main** → Save

---

## 🗂️ Struktur

```
dompetku/
├── index.html
├── css/style.css
├── js/
│   ├── app.js          ← credentials ada di sini
│   ├── db.js
│   ├── ui.js
│   └── pages/
│       ├── dashboard.js
│       ├── transactions.js
│       ├── add.js
│       ├── budget.js
│       ├── goals.js
│       ├── report.js
│       └── categories.js
└── README.md
```

---

> ⚠️ **Catatan keamanan**: Karena ini repo personal, pastikan repo GitHub-mu **Private** agar credentials Supabase tidak terekspos publik.
