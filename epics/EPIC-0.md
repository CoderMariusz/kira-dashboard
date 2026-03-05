---
epic_id: EPIC-0
title: "KiraBoard Bootstrap — Fork LobsterBoard + Rebrand + Foundation"
module: infrastructure
status: ready
priority: must
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-0 przygotowuje fundamenty projektu KiraBoard: fork LobsterBoard jako core, pełny rebrand na KiraBoard, konfiguracja Bridge API proxy, inicjalizacja lokalnej bazy SQLite (better-sqlite3), seed systemu auth (users.json z PIN hashami), setup infrastruktury Supabase sync, przygotowanie scaffoldu React Pages z Vite build, oraz foundation features z researchu open source — service health checking (Dashy), keyboard shortcuts (Dashy), recurring tasks engine (Grocy) i shopping history tracking (KitchenOwl). Po tym epicu serwer startuje, dashboard działa z istniejącymi widgetami pod nową marką, auth rozpoznaje użytkowników po PIN, recurring tasks auto-generują się z crona, a struktura pages/ jest gotowa na React pages z Fazy 2+.

## 🎯 CEL BIZNESOWY

`node server.cjs` startuje KiraBoard z pełnym rebrandem, PIN auth dla 4 userów, Bridge API proxy i gotową infrastrukturą pages/ — Kira może od razu budować kolejne EPICi na solidnym fundamencie.

## 👤 PERSONA

**Kira (Pipeline)** — AI agent budujący projekt. Potrzebuje czystego repo z działającym serwerem, skonfigurowanymi zależnościami i jasnymi konwencjami żeby natychmiast przejść do EPIC-1 (widgety) i EPIC-3 (auth).

**Mariusz (Admin)** — po tym epicu otwiera `http://localhost:8080`, widzi KiraBoard z nowym brandem, wszystkie 50 widgetów LobsterBoard działają, OpenClaw widgets odpytują lokalne ścieżki.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- Konto GitHub z dostępem do fork
- Node.js ≥ 16 na Mac Mini
- OpenClaw zainstalowany (najnowsza wersja)
- Bridge API działający na `localhost:8199`
- Konto Supabase (darmowy tier wystarczy)

### Blokuje (ten epic odblokowuje):
- EPIC-1: Dashboard Widgets — wymaga Bridge API proxy i działającego serwera
- EPIC-3: Auth — wymaga users.json i JWT infrastructure
- EPIC-4: Home — wymaga local SQLite i Supabase tables
- EPIC-5-9: React Pages — wymaga pages/_shared scaffold i Vite build infra
- EPIC-12: Supabase Sync — wymaga sync script foundation

## 📦 ZAKRES (In Scope)

- **Fork i rebrand** — fork Curbob/LobsterBoard → kira-board repo, zmiana logo/title/favicon/branding na "KiraBoard 🦊", aktualizacja package.json (name, version, description, author)
- **Bridge API proxy** — nowe route `/api/bridge/*` w server.cjs proxy'ujące requesty do `BRIDGE_URL` (default `http://localhost:8199`); obsługa timeout i offline state
- **Local SQLite setup** — `better-sqlite3` dependency, inicjalizacja bazy `kiraboard.db` z tabelami: `kb_users`, `kb_shopping_items`, `kb_tasks`, `kb_activity_log`, `kb_sync_log`; auto-migration przy starcie serwera
- **Auth foundation** — `users.json` z 4 userami (Mariusz/admin, Angelika/home_plus, Zuza/home, Iza/home); PIN hash utility; `POST /api/auth/login` → JWT; `requireRole()` middleware; PAGE_ACCESS map
- **Supabase foundation** — Supabase projekt setup; tabele mirror: `shopping_items`, `tasks`, `activity_log`, `bridge_stories`, `bridge_runs`; `.env` z `SUPABASE_URL` + `SUPABASE_KEY`; `@supabase/supabase-js` dependency
- **Sync script skeleton** — `sync_to_supabase.js` z node-cron (co 60s), logika: read local SQLite → upsert Supabase; na start obsługuje tylko ping/health check (pełna logika w EPIC-12)
- **React Pages scaffold** — `pages/_shared/` z package.json (React 19, Tailwind, shadcn/ui, lucide-react), shared components (Button, Card, Input, Dialog), hooks (useAuth, useApi), types, tailwind.config; example page `pages/_example/` z working Vite build
- **KiraBoard theme** — CSS custom properties w `css/builder.css` mapujące paletę KiraBoard (#0d0c1a, #1a1730, #818cf8, #2a2540) jako nowy wbudowany theme "KiraBoard" w theme switcher
- **Server.cjs rozszerzenia** — auto-discovery pages z dist/, smart data routing (local vs supabase), env vars: `BRIDGE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `OPENCLAW_DIR`
- **Dokumentacja** — README.md z setup instructions, architecture overview, page development guide
- **Service health check** — endpoint `/api/health-check` z background pinging (Bridge, OpenClaw, Supabase), cached results, konfiguracja w `healthchecks.json`; inspiracja: Dashy status checking
- **Keyboard shortcuts** — globalny handler w `js/shortcuts.js` z konfiguracją w `shortcuts.json`; `/` = search, `?` = help, `Ctrl+1-9` = switch page, `Escape` = close; inspiracja: Dashy
- **Recurring tasks infra** — tabele SQLite `kb_recurring_tasks` + `kb_shopping_history` + cron logic auto-generująca zadania z harmonogramu z rotation między userami; inspiracja: Grocy chores + KitchenOwl smart suggestions

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Nowe widgety** — żadne nowe widgety (EPIC-1)
- **React pages content** — tylko scaffold i example, zero pipeline/home/chat stron (EPIC-2-9)
- **Full Supabase sync** — tylko skeleton script, pełna logika w EPIC-12
- **Mobile responsive** — zero zmian CSS dla mobile (EPIC-4)
- **CI/CD** — zero GitHub Actions (EPIC-11)
- **Modyfikacja istniejących widgetów** — wszystkie 50 widgetów LobsterBoard działają bez zmian

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] `git clone` + `npm install` + `node server.cjs` startuje KiraBoard na `localhost:8080` bez błędów
- [ ] Dashboard wyświetla "KiraBoard" w title, nowe logo, nowy favicon
- [ ] Wszystkie 50 widgetów LobsterBoard działają bez zmian (CPU, Docker, Clock, etc.)
- [ ] OpenClaw widgets (Auth Status, Cron, Activity) odpytują lokalne ścieżki OpenClaw
- [ ] PIN auth działa: wpisanie PIN Mariusza → JWT z role:admin, PIN Angeliki → role:home_plus
- [ ] `/api/bridge/status` proxy'uje do Bridge API i zwraca dane (lub offline state gdy Bridge nie działa)
- [ ] `kiraboard.db` tworzy się automatycznie przy pierwszym starcie z pustymi tabelami
- [ ] Theme switcher zawiera nowy theme "KiraBoard" z paletą #0d0c1a/#818cf8
- [ ] `pages/_example/` buduje się `npm run build` → `dist/index.html` z React componentem
- [ ] `sync_to_supabase.js` startuje cron, loguje "sync check" co 60s (bez actual sync — to EPIC-12)
- [ ] `users.json` zawiera 4 userów z hashami PIN (nie plaintext)
- [ ] Environment variables konfigurowane przez `.env` file (z `.env.example` template)
- [ ] `GET /api/health-check` zwraca status Bridge (up/down + latency) i OpenClaw (up/down + latency)
- [ ] Keyboard shortcut `/` focusuje search input, `?` otwiera help overlay, `Escape` zamyka
- [ ] Tabele `kb_recurring_tasks` i `kb_shopping_history` istnieją w kiraboard.db po starcie
- [ ] Recurring task "Test" (daily) auto-tworzy task w `kb_tasks` przy następnym cyklu crona
- [ ] `kb_story_gates` tabela istnieje z kolumnami: story_id, project_key, gate_name, status
- [ ] `gate_config.json` zawiera 5 gate'ów (implement/lint/test/review/merge) z required/optional flags
- [ ] `POST /api/gates/update` zmienia gate status (pending→active→pass/fail/skip)
- [ ] `GET /api/gates/compliance?project=kira-board` zwraca compliance_pct

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-0.1 | infrastructure | Fork LobsterBoard + rebrand na KiraBoard | Fork repo, zmiana branding (logo, title, favicon, package.json), cleanup README, initial commit |
| STORY-0.2 | backend | Bridge API proxy w server.cjs | Route `/api/bridge/*` proxy'ujące do BRIDGE_URL z timeout handling, offline detection i JSON error responses |
| STORY-0.3 | database | Local SQLite setup — better-sqlite3 + auto-migration | Dependency better-sqlite3, init script tworzący kiraboard.db z tabelami kb_users/shopping/tasks/activity/sync_log |
| STORY-0.4 | auth | Users.json + PIN auth + JWT system | Plik users.json z 4 userami (hashed PINs), endpoint POST /api/auth/login, JWT generation, requireRole() middleware |
| STORY-0.5 | database | Supabase projekt setup + tabele mirror | Utworzenie projektu Supabase, SQL migration z tabelami shopping_items/tasks/activity_log/bridge_stories/bridge_runs, .env config |
| STORY-0.6 | backend | Sync script skeleton — node-cron + Supabase client | Plik sync_to_supabase.js z node-cron co 60s, Supabase client init, health check ping, logging — pełna logika sync w EPIC-12 |
| STORY-0.7 | infrastructure | React Pages scaffold — _shared + Vite build infra | Katalog pages/_shared z React/Tailwind/shadcn dependencies, shared components/hooks/types, example page z działającym Vite build |
| STORY-0.8 | frontend | KiraBoard theme — CSS custom properties + theme entry | Nowy theme "KiraBoard" w css/builder.css z paletą #0d0c1a/#1a1730/#818cf8/#2a2540, wpis w theme switcher, default dla nowych instalacji |
| STORY-0.9 | backend | Server.cjs rozszerzenia — pages auto-build, env vars, smart routing | Auto-discovery pages/*/dist/, smart routing (local vs supabase), env vars loading z .env, CORS config dla mobile |
| STORY-0.10 | documentation | README + .env.example + architecture doc | README z setup, architecture diagram, page development guide, .env.example ze wszystkimi zmiennymi |
| STORY-0.11 | backend | Service health check endpoint + konfiguracja | Endpoint `/api/health-check` pingujący listę URL-i z `healthchecks.json` (Bridge, OpenClaw, Supabase, dowolne URL) i zwracający status/latency per serwis — fundament dla widgetu health w EPIC-1 |
| STORY-0.12 | frontend | Keyboard shortcuts foundation — globalny handler | Globalny listener klawiaturowy: `/` = focus search, `Ctrl+E` = edit mode (już istnieje), `Ctrl+1-9` = switch page, `Escape` = close modal; config w `shortcuts.json`, nie odpala gdy focus w input |
| STORY-0.13 | database | Rozszerzenie SQLite — tabele recurring_tasks + shopping_history | Tabele `kb_recurring_tasks` (title, recurrence, assigned_to, last_created) i `kb_shopping_history` (name, category, buy_count, last_bought) — fundament dla smart suggestions i auto-tasków |
| STORY-0.14 | backend | Recurring tasks cron — auto-generowanie tasków z harmonogramu | Logika w sync_to_supabase.js: co 60s sprawdza `kb_recurring_tasks`, jeśli termin minął → tworzy nowy task w `kb_tasks` z auto-assign (rotate logic); sync do Supabase |
| STORY-0.15 | database | Gate system foundation — kb_story_gates + gate_config.json | Tabela `kb_story_gates` (story_id, project_key, gate_name, status, started_at, finished_at, details) + plik `gate_config.json` z 5 gate'ami (IMPL/LINT/TEST/REVIEW/MERGE) i required/optional per gate |
| STORY-0.16 | backend | Gate tracking API — CRUD endpoints + Bridge integration hook | Endpoint `POST /api/gates/update` (story_id, project_key, gate, status) + `GET /api/gates/story/:id` + `GET /api/gates/compliance?project=` zwracający % stories z all gates passed; hook do Bridge event stream |

---

## 🔧 SZCZEGÓŁY IMPLEMENTACJI (per story)

### STORY-0.1 — Fork + Rebrand

**Kroki:**
1. Fork `github.com/Curbob/LobsterBoard` → `github.com/[your-org]/kira-board`
2. `git clone` + nowy branch `main`
3. Pliki do zmiany:
   - `package.json`: name → `kira-board`, version → `1.0.0`, description, author
   - `index.html`: title → `KiraBoard`, meta tags
   - `app.html`: title → `KiraBoard`
   - `server.cjs`: header logo text → `KiraBoard 🦊`
   - `css/builder.css`: domyślny theme → kiraboard (STORY-0.8)
4. Logo files: zastąpić `lobsterboard-logo-*.png` nowym logo KiraBoard (lub tymczasowo rename)
5. `favicon.png` → nowy favicon
6. Cleanup: usunąć `lobsterboard-mascot-*.png` (lub zachować jako heritage)
7. `README.md`: nowa treść z KiraBoard branding i linkami
8. Initial commit: `feat: fork LobsterBoard → KiraBoard rebrand`

**DoD:** `node server.cjs` → przeglądarka pokazuje "KiraBoard" w tytule i headerze.

---

### STORY-0.2 — Bridge API Proxy

**Lokalizacja:** `server.cjs` — nowa sekcja routes

```javascript
// server.cjs — Bridge API proxy
const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8199';
const BRIDGE_TIMEOUT = 5000; // 5s timeout

app.all('/api/bridge/*', async (req, res) => {
  const bridgePath = req.params[0]; // everything after /api/bridge/
  const url = `${BRIDGE_URL}/api/${bridgePath}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT);
    
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST','PATCH','PUT'].includes(req.method) ? JSON.stringify(req.body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'Bridge API timeout', bridge_url: BRIDGE_URL });
    } else {
      res.status(503).json({ error: 'Bridge API offline', bridge_url: BRIDGE_URL, detail: err.message });
    }
  }
});
```

**DoD:** `curl localhost:8080/api/bridge/status` → zwraca dane z Bridge API (lub 503 offline JSON).

---

### STORY-0.3 — Local SQLite Setup

**Dependency:** `npm install better-sqlite3`

**Lokalizacja:** `db/init.js`

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.KB_DB_PATH || path.join(__dirname, '..', 'kiraboard.db');

function initDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');       // Better concurrent read performance
  db.pragma('foreign_keys = ON');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','home_plus','home')),
      avatar TEXT DEFAULT '👤',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_shopping_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Inne',
      quantity INTEGER DEFAULT 1,
      unit TEXT,
      bought INTEGER DEFAULT 0,
      bought_at TEXT,
      added_by TEXT REFERENCES kb_users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      title TEXT NOT NULL,
      description TEXT,
      column_id TEXT DEFAULT 'todo' CHECK (column_id IN ('todo','doing','done')),
      assigned_to TEXT REFERENCES kb_users(id),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      due_date TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES kb_users(id),
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT CHECK (entity_type IN ('shopping','task','user','system')),
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      direction TEXT DEFAULT 'up' CHECK (direction IN ('up','down')),
      records_synced INTEGER DEFAULT 0,
      status TEXT CHECK (status IN ('success','error','skipped')),
      error_message TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shopping_bought ON kb_shopping_items(bought);
    CREATE INDEX IF NOT EXISTS idx_shopping_category ON kb_shopping_items(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_column ON kb_tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON kb_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON kb_activity_log(created_at);
  `);
  
  return db;
}

module.exports = { initDatabase, DB_PATH };
```

**W server.cjs:**
```javascript
const { initDatabase } = require('./db/init');
const db = initDatabase();
console.log(`📦 KiraBoard DB initialized: ${DB_PATH}`);
```

**DoD:** Przy starcie serwera tworzy się `kiraboard.db`, `SELECT name FROM sqlite_master WHERE type='table'` zwraca 5 tabel.

---

### STORY-0.4 — Auth (users.json + PIN + JWT)

**Dependency:** `npm install jsonwebtoken`

**Lokalizacja:** `auth/` folder

**`auth/users-seed.js`** — jednorazowy script:
```javascript
const crypto = require('crypto');
const fs = require('fs');

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

// URUCHOM RAZ: node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>
const [,, p1, p2, p3, p4] = process.argv;
if (!p1 || !p2 || !p3 || !p4) {
  console.log('Usage: node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>');
  process.exit(1);
}

const users = [
  { name: 'Mariusz', pin_hash: hashPin(p1), role: 'admin', avatar: '🦊' },
  { name: 'Angelika', pin_hash: hashPin(p2), role: 'home_plus', avatar: '🌸' },
  { name: 'Zuza', pin_hash: hashPin(p3), role: 'home', avatar: '⭐' },
  { name: 'Iza', pin_hash: hashPin(p4), role: 'home', avatar: '🌙' },
];

fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
console.log('✅ users.json created with hashed PINs');
```

**`auth/middleware.js`:**
```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'kiraboard-dev-secret-change-in-prod';
const JWT_EXPIRY = '7d';

let users = [];
try { users = JSON.parse(fs.readFileSync('users.json', 'utf8')); } catch {}

const PAGE_ACCESS = {
  admin:     ['dashboard','pipeline','models','eval','nightclaw','patterns','chat','home','settings'],
  home_plus: ['home','chat'],
  home:      ['home']
};

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function authenticate(pin) {
  const hash = hashPin(pin);
  const user = users.find(u => u.pin_hash === hash);
  if (!user) return null;
  
  const token = jwt.sign(
    { name: user.name, role: user.role, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  return { token, user: { name: user.name, role: user.role, avatar: user.avatar } };
}

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(auth.slice(7), JWT_SECRET);
  } catch { return null; }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const user = verifyToken(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  };
}

function canAccessPage(role, page) {
  return (PAGE_ACCESS[role] || []).includes(page);
}

module.exports = { authenticate, verifyToken, requireRole, canAccessPage, PAGE_ACCESS };
```

**W server.cjs:**
```javascript
const { authenticate, requireRole } = require('./auth/middleware');

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });
  const result = authenticate(pin);
  if (!result) return res.status(401).json({ error: 'Invalid PIN' });
  res.json(result);
});

app.get('/api/auth/me', (req, res) => {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ user });
});

// Example protected route:
// app.get('/api/settings/*', requireRole('admin'), (req, res) => { ... });
```

**DoD:** `POST /api/auth/login` z PIN Mariusza → JWT z `role:admin`. Użycie tego JWT w `Authorization: Bearer <token>` na `/api/auth/me` → zwraca user info.

---

### STORY-0.5 — Supabase Setup

**Supabase SQL migration:**
```sql
-- 001_initial_tables.sql

-- Home module tables
CREATE TABLE shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Inne',
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  bought BOOLEAN DEFAULT FALSE,
  bought_at TIMESTAMPTZ,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT DEFAULT 'todo' CHECK (column_id IN ('todo','doing','done')),
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date DATE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activity_log (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('shopping','task','user','system')),
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bridge sync tables (for remote access to pipeline data)
CREATE TABLE bridge_stories (
  id TEXT PRIMARY KEY,
  epic_id TEXT,
  title TEXT,
  status TEXT,
  domain TEXT,
  model TEXT,
  project_key TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bridge_runs (
  id TEXT PRIMARY KEY,
  story_id TEXT REFERENCES bridge_stories(id),
  model TEXT,
  status TEXT,
  duration_seconds REAL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shopping_bought ON shopping_items(bought);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_activity_created ON activity_log(created_at DESC);
CREATE INDEX idx_bridge_stories_project ON bridge_stories(project_key);
CREATE INDEX idx_bridge_runs_story ON bridge_runs(story_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_updated BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**`.env.example`:**
```env
# KiraBoard Configuration
BRIDGE_URL=http://localhost:8199
OPENCLAW_DIR=~/.openclaw
JWT_SECRET=change-this-to-random-string-in-production
KB_DB_PATH=./kiraboard.db

# Supabase (for remote sync)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional
PORT=8080
HOST=127.0.0.1
```

**DoD:** Supabase dashboard pokazuje 5 tabel z indeksami. `.env` file z credentials.

---

### STORY-0.6 — Sync Script Skeleton

**Dependency:** `npm install node-cron @supabase/supabase-js dotenv`

**Lokalizacja:** `sync_to_supabase.js`

```javascript
// sync_to_supabase.js — Supabase sync daemon
// Uruchamiany: node sync_to_supabase.js (standalone)
// LUB: require'd w server.cjs
// Zero tokenów AI — to czysty DB sync (SQLite → Supabase)

require('dotenv').config();
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');

const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '*/60 * * * * *'; // co 60s
const db = new Database(process.env.KB_DB_PATH || './kiraboard.db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key for writes
);

async function syncTable(tableName, localTable, remoteTable) {
  // Pobierz last sync timestamp
  const lastSync = db.prepare(
    'SELECT synced_at FROM kb_sync_log WHERE table_name = ? ORDER BY synced_at DESC LIMIT 1'
  ).get(tableName);
  
  const since = lastSync?.synced_at || '1970-01-01T00:00:00Z';
  
  // Pobierz zmodyfikowane rekordy z local SQLite
  const rows = db.prepare(
    `SELECT * FROM ${localTable} WHERE updated_at > ? OR created_at > ?`
  ).all(since, since);
  
  if (rows.length === 0) {
    // Nic do synca
    db.prepare(
      'INSERT INTO kb_sync_log (table_name, direction, records_synced, status) VALUES (?, ?, ?, ?)'
    ).run(tableName, 'up', 0, 'skipped');
    return { synced: 0, status: 'skipped' };
  }
  
  // Upsert do Supabase
  const { error } = await supabase.from(remoteTable).upsert(rows, { onConflict: 'id' });
  
  const status = error ? 'error' : 'success';
  db.prepare(
    'INSERT INTO kb_sync_log (table_name, direction, records_synced, status, error_message) VALUES (?, ?, ?, ?, ?)'
  ).run(tableName, 'up', rows.length, status, error?.message || null);
  
  return { synced: rows.length, status, error: error?.message };
}

async function runSync() {
  console.log(`🔄 [${new Date().toISOString()}] Sync starting...`);
  
  try {
    const results = {
      shopping: await syncTable('shopping', 'kb_shopping_items', 'shopping_items'),
      tasks: await syncTable('tasks', 'kb_tasks', 'tasks'),
      activity: await syncTable('activity', 'kb_activity_log', 'activity_log'),
    };
    
    const total = Object.values(results).reduce((s, r) => s + r.synced, 0);
    console.log(`✅ Sync complete: ${total} records`, results);
  } catch (err) {
    console.error('❌ Sync error:', err.message);
  }
}

// Start cron
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  cron.schedule(SYNC_INTERVAL, runSync);
  console.log(`📡 Supabase sync cron active (every 60s)`);
  runSync(); // initial sync on start
} else {
  console.log('⚠️ Supabase not configured — sync disabled (set SUPABASE_URL + SUPABASE_SERVICE_KEY in .env)');
}

module.exports = { runSync, syncTable };
```

**Kluczowe: ZERO tokenów AI.** To jest czysty database sync — SQLite read → Supabase upsert. Jedyne koszty to Supabase bandwidth (darmowy tier: 500MB/miesiąc, więcej niż wystarczy).

**DoD:** `node sync_to_supabase.js` loguje "Sync starting..." co 60s. Bez SUPABASE_URL loguje warning i nie crashuje.

---

### STORY-0.7 — React Pages Scaffold

**Struktura:**
```
pages/
├── _shared/
│   ├── package.json          # dependencies shared across pages
│   ├── tsconfig.json
│   ├── tailwind.config.ts    # KiraBoard theme
│   ├── postcss.config.js
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── dialog.tsx
│   │       ├── badge.tsx
│   │       └── toast.tsx
│   ├── hooks/
│   │   ├── useAuth.ts        # Read JWT from localStorage, decode role
│   │   └── useApi.ts         # fetch() wrapper with Bearer token
│   ├── lib/
│   │   └── cn.ts             # clsx + tailwind-merge
│   └── types/
│       └── index.ts          # User, Role, ApiResponse, etc.
│
├── _example/
│   ├── page.json             # { "title": "Example", "icon": "🧪", "order": 99 }
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx          # React entry: createRoot + render
│   │   └── App.tsx           # Simple "Hello KiraBoard" component
│   ├── vite.config.ts
│   ├── package.json
│   └── dist/                 # Built output (after npm run build)
│       └── index.html
│
└── README.md                 # Page development guide
```

**`pages/_shared/package.json`:**
```json
{
  "name": "@kiraboard/shared",
  "private": true,
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.460.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

**`pages/_example/vite.config.ts`:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/pages/_example/dist/',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../_shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
```

**DoD:** `cd pages/_example && npm install && npm run build` generuje `dist/index.html`. LobsterBoard server serwuje go na `/pages/_example/`.

---

### STORY-0.8 — KiraBoard Theme

**Lokalizacja:** `css/builder.css` — nowy theme block

```css
/* KiraBoard Theme — dodane na końcu builder.css */
[data-theme="kiraboard"] {
  --bg-primary: #0d0c1a;
  --bg-secondary: #1a1730;
  --bg-card: #1a1730;
  --bg-input: #151326;
  --bg-hover: #252040;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --accent: #818cf8;
  --accent-hover: #6366f1;
  --accent-dim: rgba(129, 140, 248, 0.15);
  --border: #2a2540;
  --border-hover: #3b3d7a;
  --success: #4ade80;
  --warning: #fbbf24;
  --danger: #f87171;
  --info: #38bdf8;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  --radius: 12px;
  --sidebar-bg: #0a0918;
  --header-bg: #0d0c1a;
}
```

**W `js/builder.js`** — dodać "kiraboard" do listy themes:
```javascript
const THEMES = ['default', 'feminine', 'feminine-dark', 'terminal', 'paper', 'kiraboard'];
```

**DoD:** Theme switcher pokazuje "KiraBoard" jako opcję. Po wybraniu dashboard ma paletę #0d0c1a.

---

### STORY-0.9 — Server.cjs Extensions

**Zmiany w server.cjs:**

1. **Dotenv loading:**
```javascript
require('dotenv').config();
```

2. **Pages auto-discovery z dist/ support:**
```javascript
// Extend existing pages discovery
const pagesDir = path.join(__dirname, 'pages');
if (fs.existsSync(pagesDir)) {
  fs.readdirSync(pagesDir).forEach(dir => {
    if (dir.startsWith('_')) return; // skip _shared, _example
    const pageDir = path.join(pagesDir, dir);
    const distDir = path.join(pageDir, 'dist');
    const pageJson = path.join(pageDir, 'page.json');
    
    // Serve built React page from dist/
    if (fs.existsSync(distDir)) {
      app.use(`/pages/${dir}`, express.static(distDir));
    }
    
    // Load page API if exists
    const apiFile = path.join(pageDir, 'api.cjs');
    if (fs.existsSync(apiFile)) {
      const pageApi = require(apiFile);
      if (typeof pageApi === 'function') {
        app.use(`/api/pages/${dir}`, pageApi);
      }
    }
  });
}
```

3. **CORS config dla mobile:**
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');  // TODO: restrict in production
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

4. **Sync startup (optional):**
```javascript
if (process.env.SUPABASE_URL) {
  require('./sync_to_supabase');
}
```

**DoD:** Server auto-discovers pages, serves dist/ folders, loads api.cjs routes, sync starts if Supabase configured.

---

### STORY-0.10 — Documentation

**`README.md`** — pełna treść:
- What is KiraBoard (1 paragraph)
- Quick Start (npm install, node server.cjs, set PIN)
- Architecture diagram (ASCII art z PRD v2)
- Configuration (.env variables)
- Page Development Guide (jak zrobić nową React page)
- Upgrading from LobsterBoard (upstream merge strategy)

**DoD:** README na GitHub repo jest kompletny i czytelny.

---

### STORY-0.11 — Service Health Check

**Lokalizacja:** `server.cjs` + `healthchecks.json`

**`healthchecks.json`:**
```json
{
  "checks": [
    { "name": "Bridge API", "url": "http://localhost:8199/api/health", "interval": 30, "timeout": 5000 },
    { "name": "OpenClaw", "url": "http://localhost:3578/health", "interval": 30, "timeout": 5000 },
    { "name": "Supabase", "url": "$SUPABASE_URL/rest/v1/", "interval": 60, "timeout": 8000, "headers": { "apikey": "$SUPABASE_KEY" } }
  ]
}
```

**Endpoint `GET /api/health-check`:**
```javascript
// Zwraca cached results (nie pinguje na każdy request)
// Background job pinguje co `interval` sekund, zapisuje do memory
app.get('/api/health-check', (req, res) => {
  res.json({
    checks: healthResults, // { name, status: 'up'|'down'|'degraded', latency_ms, last_check, error? }
    overall: healthResults.every(c => c.status === 'up') ? 'healthy' : 'degraded'
  });
});
```

**Inspiracja:** Dashy status checking — kluczowe: background checking z cache, nie per-request pinging.

**DoD:** `GET /api/health-check` zwraca status Bridge i OpenClaw. Widget w EPIC-1 będzie to konsumował.

---

### STORY-0.12 — Keyboard Shortcuts

**Lokalizacja:** `js/shortcuts.js` + `shortcuts.json`

**`shortcuts.json`:**
```json
{
  "shortcuts": [
    { "key": "/", "action": "focusSearch", "label": "Focus search" },
    { "key": "Escape", "action": "closeModal", "label": "Close modal/overlay" },
    { "key": "Ctrl+1", "action": "navigatePage", "target": "dashboard", "label": "Go to Dashboard" },
    { "key": "Ctrl+2", "action": "navigatePage", "target": "pipeline", "label": "Go to Pipeline" },
    { "key": "Ctrl+3", "action": "navigatePage", "target": "home", "label": "Go to Home" },
    { "key": "?", "action": "showShortcuts", "label": "Show shortcuts help" }
  ]
}
```

**`js/shortcuts.js`:**
```javascript
// Globalny handler — nie odpala gdy focus w input/textarea/contenteditable
document.addEventListener('keydown', (e) => {
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
  if (e.target.isContentEditable) return;
  
  const key = [
    e.ctrlKey ? 'Ctrl' : '', e.shiftKey ? 'Shift' : '', e.key
  ].filter(Boolean).join('+');
  
  const shortcut = shortcuts.find(s => s.key === key);
  if (!shortcut) return;
  
  e.preventDefault();
  executeAction(shortcut.action, shortcut.target);
});
```

**Inspiracja:** Dashy keyboard shortcuts + LobsterBoard Ctrl+E pattern (już istnieje).

**DoD:** `/` focusuje search, `?` pokazuje modal z listą skrótów, `Escape` zamyka modal.

---

### STORY-0.13 — Rozszerzenie SQLite (recurring + shopping history)

**Dodaj do `db/init.js`:**
```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS kb_recurring_tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
    title TEXT NOT NULL,
    description TEXT,
    recurrence TEXT NOT NULL CHECK (recurrence IN ('daily','weekly','biweekly','monthly')),
    day_of_week INTEGER,              -- 0-6 dla weekly (0=poniedziałek)
    day_of_month INTEGER,             -- 1-31 dla monthly
    assigned_to TEXT,                  -- user_id lub 'rotate'
    rotation_index INTEGER DEFAULT 0, -- który user w kolejce (dla rotate)
    rotation_users TEXT,               -- JSON array user_ids ["zuza","iza"]
    priority TEXT DEFAULT 'medium',
    active INTEGER DEFAULT 1,
    last_created_at TEXT,             -- kiedy ostatnio auto-stworzono task
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kb_shopping_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT NOT NULL,
    category TEXT DEFAULT 'Inne',
    buy_count INTEGER DEFAULT 1,
    last_bought_at TEXT DEFAULT (datetime('now')),
    UNIQUE(item_name, category)
  );

  CREATE INDEX IF NOT EXISTS idx_recurring_active ON kb_recurring_tasks(active);
  CREATE INDEX IF NOT EXISTS idx_shopping_hist_count ON kb_shopping_history(buy_count DESC);
`);
```

**Trigger — auto-fill shopping_history przy bought:**
```javascript
// W API /api/home/shopping (EPIC-4) — gdy item oznaczony jako bought:
// INSERT OR REPLACE INTO kb_shopping_history (item_name, category, buy_count, last_bought_at)
// VALUES ($name, $cat, COALESCE((SELECT buy_count FROM kb_shopping_history WHERE item_name=$name), 0) + 1, datetime('now'))
```

**Inspiracja:** KitchenOwl (smart suggestions) + Grocy (chores/recurring). Zero AI, prosty SQL count.

**DoD:** Tabele istnieją po starcie, `SELECT * FROM kb_recurring_tasks` i `kb_shopping_history` nie rzucają błędu.

---

### STORY-0.14 — Recurring Tasks Cron

**Lokalizacja:** `sync_to_supabase.js` — dodaj do istniejącego cron

```javascript
function processRecurringTasks() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const dayOfWeek = (now.getDay() + 6) % 7;    // 0=Pon, 6=Niedz
  const dayOfMonth = now.getDate();
  
  const tasks = db.prepare(`
    SELECT * FROM kb_recurring_tasks 
    WHERE active = 1 
    AND (last_created_at IS NULL OR last_created_at < ?)
  `).all(today);
  
  for (const task of tasks) {
    let shouldCreate = false;
    
    if (task.recurrence === 'daily') shouldCreate = true;
    if (task.recurrence === 'weekly' && dayOfWeek === (task.day_of_week || 0)) shouldCreate = true;
    if (task.recurrence === 'biweekly') {
      const weekNum = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 604800000);
      shouldCreate = weekNum % 2 === 0 && dayOfWeek === (task.day_of_week || 0);
    }
    if (task.recurrence === 'monthly' && dayOfMonth === (task.day_of_month || 1)) shouldCreate = true;
    
    if (!shouldCreate) continue;
    
    // Resolve assigned_to
    let assignedTo = task.assigned_to;
    if (assignedTo === 'rotate' && task.rotation_users) {
      const users = JSON.parse(task.rotation_users);
      assignedTo = users[task.rotation_index % users.length];
      db.prepare('UPDATE kb_recurring_tasks SET rotation_index = rotation_index + 1 WHERE id = ?').run(task.id);
    }
    
    // Create task
    const taskId = require('crypto').randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO kb_tasks (id, title, description, column_id, assigned_to, priority, due_date)
      VALUES (?, ?, ?, 'todo', ?, ?, ?)
    `).run(taskId, task.title, task.description, assignedTo, task.priority, today);
    
    // Log
    db.prepare(`
      INSERT INTO kb_activity_log (user_name, action, entity_type, entity_id, details)
      VALUES ('System', 'auto_created', 'task', ?, ?)
    `).run(taskId, JSON.stringify({ recurring_id: task.id, recurrence: task.recurrence }));
    
    // Update last_created
    db.prepare('UPDATE kb_recurring_tasks SET last_created_at = ? WHERE id = ?').run(today, task.id);
    
    console.log(`🔄 Auto-created task: "${task.title}" → ${assignedTo || 'unassigned'}`);
  }
}

// Dodaj do głównego crona:
// cron.schedule(SYNC_INTERVAL, async () => {
//   processRecurringTasks();  // ← NOWE
//   await runSync();
// });
```

**Inspiracja:** Grocy chores system — automatyczne generowanie zadań z rotation między userami.

**DoD:** Dodanie recurring task "Pranie" (weekly, day_of_week=0, rotate=["zuza","iza"]) → w poniedziałek automatycznie tworzy się task "Pranie" assigned do Zuzy, następny poniedziałek do Izy.

---

### STORY-0.15 — Gate System Foundation

**Lokalizacja:** `db/init.js` (tabela) + `gate_config.json` (config)

**Dodaj do `db/init.js`:**
```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS kb_story_gates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id TEXT NOT NULL,
    project_key TEXT NOT NULL,
    gate_name TEXT NOT NULL CHECK (gate_name IN ('implement','lint','test','review','merge')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','pass','fail','skip')),
    started_at TEXT,
    finished_at TEXT,
    details TEXT,                    -- JSON: { error_message, reviewer_model, test_count, etc. }
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(story_id, project_key, gate_name)
  );

  CREATE INDEX IF NOT EXISTS idx_gates_story ON kb_story_gates(story_id, project_key);
  CREATE INDEX IF NOT EXISTS idx_gates_status ON kb_story_gates(status);
  CREATE INDEX IF NOT EXISTS idx_gates_project ON kb_story_gates(project_key);
`);
```

**`gate_config.json`:**
```json
{
  "gates": [
    { "name": "implement", "label": "IMPLEMENT", "order": 1, "required": true, "description": "Story branch created, code written" },
    { "name": "lint", "label": "LINT", "order": 2, "required": false, "description": "ESLint + TypeCheck pass" },
    { "name": "test", "label": "TEST", "order": 3, "required": true, "description": "Vitest + Playwright pass" },
    { "name": "review", "label": "REVIEW", "order": 4, "required": true, "description": "Cross-model review approved" },
    { "name": "merge", "label": "MERGE", "order": 5, "required": true, "description": "Branch merged to main" }
  ],
  "enforcement": "report",
  "skip_allowed_for": ["lint"]
}
```

**Auto-initialization:** Kiedy Bridge zgłasza nową story (via sync lub API), auto-insert 5 pending gate records:
```javascript
function initGatesForStory(storyId, projectKey) {
  const gates = JSON.parse(fs.readFileSync('gate_config.json')).gates;
  const stmt = db.prepare('INSERT OR IGNORE INTO kb_story_gates (story_id, project_key, gate_name, status) VALUES (?, ?, ?, ?)');
  gates.forEach(g => stmt.run(storyId, projectKey, g.name, 'pending'));
}
```

**DoD:** Tabela `kb_story_gates` istnieje. `gate_config.json` z 5 gate'ami. Query `SELECT * FROM kb_story_gates WHERE project_key='kira-board'` zwraca wyniki po zainicjowaniu.

---

### STORY-0.16 — Gate Tracking API

**Lokalizacja:** `server.cjs` — nowe routes

```javascript
// Update gate status
app.post('/api/gates/update', requireRole('admin'), (req, res) => {
  const { story_id, project_key, gate_name, status, details } = req.body;
  const now = new Date().toISOString();
  
  const updates = { status };
  if (status === 'active') updates.started_at = now;
  if (['pass','fail','skip'].includes(status)) updates.finished_at = now;
  
  db.prepare(`
    UPDATE kb_story_gates 
    SET status = ?, started_at = COALESCE(?, started_at), finished_at = COALESCE(?, finished_at), details = ?
    WHERE story_id = ? AND project_key = ? AND gate_name = ?
  `).run(status, updates.started_at || null, updates.finished_at || null, 
         details ? JSON.stringify(details) : null, story_id, project_key, gate_name);
  
  res.json({ success: true });
});

// Get gates for a story
app.get('/api/gates/story/:projectKey/:storyId', (req, res) => {
  const gates = db.prepare(
    'SELECT * FROM kb_story_gates WHERE story_id = ? AND project_key = ? ORDER BY CASE gate_name WHEN "implement" THEN 1 WHEN "lint" THEN 2 WHEN "test" THEN 3 WHEN "review" THEN 4 WHEN "merge" THEN 5 END'
  ).all(req.params.storyId, req.params.projectKey);
  res.json({ gates });
});

// Gate compliance per project
app.get('/api/gates/compliance', (req, res) => {
  const projectKey = req.query.project;
  const where = projectKey ? 'WHERE project_key = ?' : '';
  const params = projectKey ? [projectKey] : [];
  
  const total = db.prepare(`SELECT COUNT(DISTINCT story_id || project_key) as cnt FROM kb_story_gates ${where}`).get(...params).cnt;
  
  const allPassed = db.prepare(`
    SELECT COUNT(*) as cnt FROM (
      SELECT story_id, project_key FROM kb_story_gates ${where}
      GROUP BY story_id, project_key
      HAVING SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) = 0
        AND SUM(CASE WHEN status = 'skip' THEN 1 ELSE 0 END) = 0
    )
  `).get(...params).cnt;
  
  const skipped = db.prepare(`
    SELECT COUNT(DISTINCT story_id || project_key) as cnt FROM kb_story_gates 
    ${where ? where + ' AND' : 'WHERE'} status = 'skip'
  `).get(...params).cnt;
  
  const failed = db.prepare(`
    SELECT COUNT(DISTINCT story_id || project_key) as cnt FROM kb_story_gates 
    ${where ? where + ' AND' : 'WHERE'} status = 'fail'
  `).get(...params).cnt;
  
  res.json({
    total, all_passed: allPassed, skipped, failed,
    compliance_pct: total > 0 ? Math.round(allPassed / total * 100) : 100
  });
});
```

**DoD:** `POST /api/gates/update` zmienia gate status. `GET /api/gates/compliance?project=kira-board` zwraca { total, all_passed, skipped, failed, compliance_pct }.

---

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | infrastructure |
| Priorytet | Must (blokuje wszystkie inne EPICi) |
| Szacunek | M-L (4-6 dni) |
| Ryzyko | Niskie — fork + konfiguracja, foundation features z researchu |
| Domeny | infrastructure, database, auth, backend, frontend, documentation |
| Stack | Node.js, better-sqlite3, jsonwebtoken, @supabase/supabase-js, node-cron, dotenv, Vite, React 19, Tailwind CSS |
| DB | Local: kiraboard.db (SQLite) · Remote: Supabase (PostgreSQL) |
| Dependencies | LobsterBoard v0.3.1, Bridge API, OpenClaw |
| Inspiracje | Dashy (health checks, shortcuts), Grocy (recurring tasks), KitchenOwl (shopping history) |
| Uwagi | Ten epic NIE dodaje żadnych nowych widgetów ani pages z treścią. To pure infrastructure + fundament pod smart features. Po nim Kira może od razu budować EPIC-1 (widgety) i EPIC-3 (auth UI). |

---

## ⚡ DEPENDENCY GRAPH

```
STORY-0.1 (fork + rebrand)
    │
    ├── STORY-0.8 (theme)         ← wymaga zmodyfikowanego css/builder.css
    ├── STORY-0.2 (bridge proxy)  ← wymaga server.cjs
    ├── STORY-0.3 (sqlite)        ← wymaga npm install
    ├── STORY-0.4 (auth)          ← wymaga server.cjs + npm install
    ├── STORY-0.5 (supabase)      ← niezależne (zewnętrzne)
    ├── STORY-0.11 (health check) ← wymaga 0.2 (bridge proxy w server.cjs)
    ├── STORY-0.12 (shortcuts)    ← wymaga 0.1 (repo structure)
    │
    ├── STORY-0.13 (sqlite ext)   ← wymaga 0.3 (sqlite base)
    ├── STORY-0.6 (sync script)   ← wymaga 0.3 (sqlite) + 0.5 (supabase)
    ├── STORY-0.14 (recurring)    ← wymaga 0.13 (sqlite ext) + 0.6 (sync script)
    ├── STORY-0.15 (gate tables)  ← wymaga 0.3 (sqlite base)
    ├── STORY-0.16 (gate API)     ← wymaga 0.15 (gate tables) + 0.4 (auth/requireRole)
    ├── STORY-0.7 (pages scaffold)← wymaga 0.1 (repo structure)
    ├── STORY-0.9 (server extend) ← wymaga 0.2 + 0.3 + 0.4 + 0.7 + 0.11
    │
    └── STORY-0.10 (docs)         ← wymaga wszystkie poprzednie
```

**Sugerowana kolejność wykonania:**
1. STORY-0.1 (fork + rebrand)
2. STORY-0.3 (sqlite) + STORY-0.5 (supabase) ← parallel
3. STORY-0.2 (bridge proxy) + STORY-0.4 (auth) + STORY-0.12 (shortcuts) ← parallel
4. STORY-0.8 (theme) + STORY-0.7 (pages scaffold) + STORY-0.11 (health check) ← parallel
5. STORY-0.13 (sqlite extensions) + STORY-0.15 (gate tables) ← parallel
6. STORY-0.6 (sync script) + STORY-0.14 (recurring tasks) + STORY-0.16 (gate API) ← parallel
7. STORY-0.9 (server extensions)
8. STORY-0.10 (docs)
