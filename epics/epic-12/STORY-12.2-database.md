---
story_id: STORY-12.2
title: "Developer tworzy tabele nightclaw_digests, nightclaw_research i nightclaw_skills_diff w Supabase"
epic: EPIC-12
module: supabase-migration
domain: database
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: none
blocks: STORY-12.5, STORY-12.10
tags: [migration, supabase, database, nightclaw, rls]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby dane NightClaw (digest, research, skills-diff) były przechowywane w Supabase
**Żeby** dashboard /dashboard/nightclaw działał na Vercelu bez dostępu do lokalnych plików

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`supabase/migrations/[timestamp]_nightclaw_tables.sql`

### Aktualne dane (lokalne pliki)
- Digest: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/digest/YYYY-MM-DD.md`
- Research: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/solutions/`
- Skills-diff: generowane przez `git diff` na `/Users/mariuszkrawczyk/.openclaw/skills/`

### Stan systemu przed tą story
- Tabele NightClaw nie istnieją w Supabase
- Aktualne API endpoints czytają lokalne pliki przez `fs.readFile`

---

## ✅ Acceptance Criteria

### AC-1: Tabela nightclaw_digests istnieje
GIVEN: migracja uruchomiona
WHEN: sprawdzasz `nightclaw_digests`
THEN: kolumny: `id, run_date, content_md, summary, stories_done, stories_failed, models_used, created_at`

### AC-2: Tabela nightclaw_research istnieje
GIVEN: migracja uruchomiona
WHEN: sprawdzasz `nightclaw_research`
THEN: kolumny: `id, slug, title, problem, solution, source_url, status, created_at`

### AC-3: Tabela nightclaw_skills_diff istnieje
GIVEN: migracja uruchomiona
WHEN: sprawdzasz `nightclaw_skills_diff`
THEN: kolumny: `id, run_date, skill_name, skill_path, diff_content, lines_added, lines_removed, modified_at, created_at`

### AC-4: RLS — authenticated read, service_role write
GIVEN: zalogowany użytkownik
WHEN: SELECT na dowolną nightclaw tabelę
THEN: dane zwracane

GIVEN: authenticated user (nie service_role)
WHEN: INSERT do `nightclaw_digests`
THEN: błąd 403

---

## 🗄️ Szczegóły Database

```sql
-- ─── nightclaw_digests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nightclaw_digests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date      DATE NOT NULL UNIQUE,    -- jedna per dzień
  content_md    TEXT NOT NULL,           -- surowy markdown digest
  summary       TEXT,                   -- 3-5 zdań podsumowanie
  stories_done  INT  NOT NULL DEFAULT 0,
  stories_failed INT NOT NULL DEFAULT 0,
  models_used   TEXT[],                 -- ['kimi-k2.5', 'sonnet-4.6']
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── nightclaw_research ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nightclaw_research (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,     -- 'anti-pattern-date-extraction-research'
  title       TEXT NOT NULL,
  problem     TEXT NOT NULL,
  solution    TEXT,                     -- NULL jeśli pending
  source_url  TEXT,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|applied|skipped
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── nightclaw_skills_diff ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nightclaw_skills_diff (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date       DATE NOT NULL,
  skill_name     TEXT NOT NULL,         -- 'kira-orchestrator'
  skill_path     TEXT NOT NULL,         -- 'skills/kira-orchestrator/SKILL.md'
  diff_content   TEXT NOT NULL,         -- raw git diff
  lines_added    INT NOT NULL DEFAULT 0,
  lines_removed  INT NOT NULL DEFAULT 0,
  modified_at    TIMESTAMPTZ NOT NULL,  -- z git log
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_date, skill_name)
);
```

### Indeksy

```sql
CREATE INDEX IF NOT EXISTS idx_nightclaw_digests_date    ON nightclaw_digests(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_nightclaw_research_status ON nightclaw_research(status);
CREATE INDEX IF NOT EXISTS idx_nightclaw_skills_date     ON nightclaw_skills_diff(run_date DESC);
```

### RLS

```sql
ALTER TABLE nightclaw_digests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightclaw_research   ENABLE ROW LEVEL SECURITY;
ALTER TABLE nightclaw_skills_diff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_digests"     ON nightclaw_digests    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_research"    ON nightclaw_research   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_skills_diff" ON nightclaw_skills_diff FOR SELECT TO authenticated USING (true);
```

### Rollback Plan
```sql
DROP TABLE IF EXISTS nightclaw_digests;
DROP TABLE IF EXISTS nightclaw_research;
DROP TABLE IF EXISTS nightclaw_skills_diff;
```

---

## ⚠️ Edge Cases

### EC-1: Duplikat digest dla tej samej daty
Scenariusz: sync uruchomiony dwa razy tego samego dnia
Oczekiwane zachowanie: `UNIQUE(run_date)` + upsert: `INSERT ... ON CONFLICT (run_date) DO UPDATE SET content_md = EXCLUDED.content_md`

### EC-2: Brak digest dla ostatnich dni (NightClaw nie działał)
Scenariusz: API zwraca pustą listę
Oczekiwane zachowanie: frontend obsługuje `[]` — wyświetla "Brak danych z ostatnich dni"

### EC-3: Duże diff_content (SKILL.md po dużej edycji)
Scenariusz: diff ma >10KB
Oczekiwane zachowanie: `TEXT` w PostgreSQL nie ma limitu — OK. API powinien truncować do 5KB przy zwracaniu.

---

## 🚫 Out of Scope tej Story
- Sync script do wypełnienia tabel (STORY-12.5)
- API endpoints (STORY-12.10)

---

## ✔️ Definition of Done
- [ ] Plik migracji w `supabase/migrations/`
- [ ] Migracja uruchomiona na produkcyjnym Supabase
- [ ] Wszystkie 3 tabele istnieją z poprawnym schematem
- [ ] RLS włączone, authenticated read działa
- [ ] Indeksy dodane
- [ ] Rollback przetestowany
- [ ] Story review przez PO
