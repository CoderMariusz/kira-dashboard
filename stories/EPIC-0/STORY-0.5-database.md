---
story_id: STORY-0.5
title: "Supabase projekt setup + tabele mirror"
epic: EPIC-0
module: infrastructure
domain: database
status: ready
difficulty: moderate
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: [STORY-0.1]
blocks: [STORY-0.6]
tags: [supabase, database, migration, cloud, sync]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć projekt Supabase z tabelami mirror dla danych KiraBoard
**Żeby** dane były dostępne zdalnie (mobilnie, z innych urządzeń) przez Supabase i gotowe na EPIC-12 sync

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Zewnętrzny serwis: Supabase (supabase.com — darmowy tier)
- Lokalne pliki:
  - `supabase/migrations/001_initial_tables.sql` — migracja SQL
  - `.env` — credentials Supabase
  - `.env.example` — template
- Modyfikacja: `package.json` — `@supabase/supabase-js`

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo istnieje
- Konto Supabase założone (darmowy tier)
- Nowy projekt Supabase utworzony

---

## ✅ Acceptance Criteria

### AC-1: Tabele istnieją w Supabase Dashboard
GIVEN: Migracja SQL wykonana w Supabase SQL editor
WHEN: Otworzysz Supabase Dashboard → Table Editor
THEN: Widoczne 5 tabel: `shopping_items`, `tasks`, `activity_log`, `bridge_stories`, `bridge_runs`

### AC-2: Indeksy i triggery działają
GIVEN: Tabele utworzone
WHEN: Wykonasz SQL `SELECT indexname FROM pg_indexes WHERE tablename = 'shopping_items'`
THEN: Wyniki zawierają `idx_shopping_bought`

### AC-3: .env skonfigurowany
GIVEN: `.env.example` istnieje w projekcie
WHEN: Skopiujesz go do `.env` i wypełnisz wartościami z Supabase Dashboard
THEN: `node -e "require('dotenv').config(); console.log(process.env.SUPABASE_URL)"` zwraca URL projektu

### AC-4: @supabase/supabase-js zainstalowany
GIVEN: `.env` z credentials
WHEN: Wykonasz `node -e "const {createClient}=require('@supabase/supabase-js'); console.log('ok')"`
THEN: Wyświetla `ok` bez błędów

---

## 🗄️ Szczegóły Database (Supabase/PostgreSQL)

### SQL Migration — `supabase/migrations/001_initial_tables.sql`

```sql
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

-- Bridge sync tables
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

-- Updated_at auto-trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_updated BEFORE UPDATE ON shopping_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### `.env.example`

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

### Rollback Plan
Usuń tabele w Supabase SQL Editor: `DROP TABLE IF EXISTS bridge_runs, bridge_stories, activity_log, tasks, shopping_items CASCADE;`

---

## ⚠️ Edge Cases

### EC-1: Supabase projekt na darmowym tierze — limity
Scenariusz: Darmowy tier: 500MB storage, 2GB bandwidth/miesiąc
Oczekiwane zachowanie: Wystarczające dla KiraBoard (nie sync binarnych danych) — monitoruj w Dashboard

### EC-2: SUPABASE_SERVICE_KEY vs SUPABASE_KEY
Scenariusz: Anon key (SUPABASE_KEY) ma ograniczone uprawnienia — do czytania
Oczekiwane zachowanie: Sync script używa `SUPABASE_SERVICE_KEY` (service role) do upsert; anon key dla read-only operacji w przeglądarce

---

## 🚫 Out of Scope tej Story
- Row Level Security (RLS) policies — EPIC-12
- Pełna logika sync (SQLite → Supabase) — STORY-0.6 (skeleton) + EPIC-12 (pełna)
- Supabase Auth (nie używamy — mamy własny PIN auth)
- Supabase Edge Functions

---

## ✔️ Definition of Done
- [ ] Projekt Supabase utworzony
- [ ] `supabase/migrations/001_initial_tables.sql` istnieje w repo
- [ ] 5 tabel widocznych w Supabase Dashboard: `shopping_items`, `tasks`, `activity_log`, `bridge_stories`, `bridge_runs`
- [ ] Indeksy i updated_at trigger działają
- [ ] `.env.example` w repo z wszystkimi zmiennymi
- [ ] `.env` (lokalny, w .gitignore) z prawdziwymi credentials
- [ ] `npm install @supabase/supabase-js` dodane do `package.json`
- [ ] `.gitignore` zawiera `.env` (nie commituj secrets!)
