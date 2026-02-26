---
story_id: STORY-12.1
title: "Developer tworzy tabele bridge_stories, bridge_epics i bridge_runs w Supabase"
epic: EPIC-12
module: supabase-migration
domain: database
status: ready
difficulty: moderate
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: none
blocks: STORY-12.4, STORY-12.7, STORY-12.8, STORY-12.9
tags: [migration, supabase, database, bridge, rls]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby dane z Bridge SQLite (stories, epics, runs) miały swoje tabele w Supabase
**Żeby** dashboard mógł je czytać na Vercelu bez dostępu do lokalnego Bridge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`supabase/migrations/[timestamp]_bridge_pipeline_tables.sql`

### Stan systemu przed tą story
- Tabela `bridge_runs` już częściowo istnieje (EPIC-5 — STORY-5.8/5.9 hybrid sync)
- Sprawdź aktualną strukturę: `SELECT column_name FROM information_schema.columns WHERE table_name='bridge_runs'`
- Tabele `bridge_stories` i `bridge_epics` nie istnieją

---

## ✅ Acceptance Criteria

### AC-1: Tabela bridge_stories istnieje z pełnym schematem
GIVEN: migracja uruchomiona na czystej bazie
WHEN: sprawdzasz tabelę `bridge_stories`
THEN: zawiera kolumny: `id, project_id, epic_id, title, status, difficulty, recommended_model, depends_on, blocks, priority, estimated_effort, domain, assigned_model, created_at, updated_at, synced_at`

### AC-2: Tabela bridge_epics istnieje z pełnym schematem
GIVEN: migracja uruchomiona
WHEN: sprawdzasz tabelę `bridge_epics`
THEN: zawiera kolumny: `id, project_id, title, status, total_stories, done_stories, created_at, updated_at, synced_at`

### AC-3: Tabela bridge_runs posiada kompletny schemat
GIVEN: tabela `bridge_runs` może już istnieć z EPIC-5
WHEN: migracja uruchomiona
THEN: tabela zawiera wszystkie kolumny z nowego schematu — migracja używa `ADD COLUMN IF NOT EXISTS` dla bezpieczeństwa

### AC-4: RLS blokuje anonimowy dostęp
GIVEN: request bez JWT tokena
WHEN: ktoś odpytuje `bridge_stories` przez Supabase API
THEN: zwracany jest błąd 401/403 — brak danych

### AC-5: RLS pozwala authenticated users czytać dane
GIVEN: zalogowany użytkownik (dowolna rola)
WHEN: SELECT na `bridge_stories`
THEN: zwracane są wszystkie rekordy (read-only dla wszystkich ról)

### AC-6: Tylko service_role może pisać (INSERT/UPDATE/DELETE)
GIVEN: zalogowany użytkownik z tokenem JWT (nie service_role)
WHEN: próbuje INSERT do `bridge_stories`
THEN: zwracany jest błąd 403 — zapis tylko przez sync script z service_role

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `supabase/migrations/[timestamp]_bridge_pipeline_tables.sql`

```sql
-- ─── bridge_epics ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bridge_epics (
  id            TEXT NOT NULL,           -- 'EPIC-1'
  project_id    TEXT NOT NULL,           -- 'kira-dashboard'
  title         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT|DONE
  total_stories INT  NOT NULL DEFAULT 0,
  done_stories  INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, project_id)
);

-- ─── bridge_stories ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bridge_stories (
  id                  TEXT NOT NULL,      -- 'STORY-1.1'
  project_id          TEXT NOT NULL,      -- 'kira-dashboard'
  epic_id             TEXT NOT NULL,      -- 'EPIC-1'
  title               TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'BACKLOG',
  -- BACKLOG|READY|TEST_RED|IN_PROGRESS|TEST_GREEN|REVIEW|REFACTOR|APPROVED|DONE|BLOCKED
  difficulty          TEXT,               -- trivial|simple|moderate|complex|expert
  recommended_model   TEXT,               -- kimi-k2.5|sonnet-4.6|etc
  assigned_model      TEXT,
  domain              TEXT,               -- database|auth|backend|wiring|frontend
  priority            TEXT,               -- must|should|could
  estimated_effort    TEXT,               -- '4h'
  depends_on          TEXT[],             -- ['STORY-1.1', 'STORY-1.2']
  blocks              TEXT[],
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, project_id)
);

-- ─── bridge_runs — extend istniejącej tabeli jeśli istnieje ──────────────────
CREATE TABLE IF NOT EXISTS bridge_runs (
  id            TEXT PRIMARY KEY,
  project_id    TEXT,
  story_id      TEXT,
  step          TEXT,   -- IMPLEMENT|REVIEW|REFACTOR|TEST_RED|TEST_GREEN
  worker        TEXT,
  model         TEXT,
  status        TEXT,   -- RUNNING|SUCCESS|FAILED|TIMEOUT
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  duration_ms   INT,
  tokens_in     INT,
  tokens_out    INT,
  cost_usd      NUMERIC(10,6),
  error_message TEXT,
  synced_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Dodaj brakujące kolumny jeśli tabela już istnieje (bezpieczna migracja)
ALTER TABLE bridge_runs ADD COLUMN IF NOT EXISTS project_id TEXT;
ALTER TABLE bridge_runs ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();
```

### Indeksy

```sql
CREATE INDEX IF NOT EXISTS idx_bridge_stories_project  ON bridge_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_bridge_stories_epic     ON bridge_stories(project_id, epic_id);
CREATE INDEX IF NOT EXISTS idx_bridge_stories_status   ON bridge_stories(status);
CREATE INDEX IF NOT EXISTS idx_bridge_epics_project    ON bridge_epics(project_id);
CREATE INDEX IF NOT EXISTS idx_bridge_runs_project     ON bridge_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_bridge_runs_story       ON bridge_runs(story_id);
CREATE INDEX IF NOT EXISTS idx_bridge_runs_started_at  ON bridge_runs(started_at DESC);
```

### Row Level Security (RLS)

```sql
ALTER TABLE bridge_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_epics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_runs    ENABLE ROW LEVEL SECURITY;

-- Read: każdy zalogowany użytkownik
CREATE POLICY "authenticated_read_stories" ON bridge_stories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_epics" ON bridge_epics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_runs" ON bridge_runs
  FOR SELECT TO authenticated USING (true);

-- Write: tylko service_role (sync script)
-- service_role omija RLS domyślnie — brak dodatkowych polis potrzebnych
```

### Rollback Plan
```sql
DROP TABLE IF EXISTS bridge_stories;
DROP TABLE IF EXISTS bridge_epics;
-- bridge_runs: usuń tylko dodane kolumny (nie całą tabelę — może mieć dane)
ALTER TABLE bridge_runs DROP COLUMN IF EXISTS synced_at;
```

---

## ⚠️ Edge Cases

### EC-1: Tabela bridge_runs już istnieje z innym schematem (EPIC-5)
Scenariusz: migracja failuje na `CREATE TABLE bridge_runs` — tabela istnieje
Oczekiwane zachowanie: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` — bezpieczne

### EC-2: TEXT[] (arrays) nie obsługiwane przez sync script
Scenariusz: `depends_on TEXT[]` powoduje problemy przy INSERT z Python
Oczekiwane zachowanie: sync script konwertuje Python list → PostgreSQL array syntax: `'{STORY-1.1,STORY-1.2}'`

### EC-3: Duplikaty przy wielokrotnym sync
Scenariusz: sync script uruchamiany co 5 min — te same rekordy wstawiane wielokrotnie
Oczekiwane zachowanie: używaj `INSERT ... ON CONFLICT (id, project_id) DO UPDATE SET ...` (upsert)

### EC-4: Stary RLS na bridge_runs (z EPIC-5) jest zbyt permisywny
Scenariusz: istniejąca polityka pozwala na write przez authenticated
Oczekiwane zachowanie: sprawdź i usuń stare polityki: `DROP POLICY IF EXISTS "..." ON bridge_runs`

---

## 🚫 Out of Scope tej Story
- Sync script (STORY-12.4)
- API routes używające tych tabel (STORY-12.7, 12.8)
- Tabele NightClaw (STORY-12.2)
- Tabele patterns/lessons (STORY-12.3)

---

## ✔️ Definition of Done
- [ ] Plik migracji w `supabase/migrations/`
- [ ] Migracja uruchomiona na produkcyjnym Supabase (`supabase db push`)
- [ ] Tabele `bridge_stories`, `bridge_epics` istnieją
- [ ] `bridge_runs` ma pełny schemat z `project_id` i `synced_at`
- [ ] RLS włączone — anonimowy dostęp zablokowany
- [ ] Authenticated SELECT działa
- [ ] Indeksy dodane
- [ ] Rollback przetestowany na lokalnym Supabase
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
