---
story_id: STORY-12.3
title: "Developer tworzy tabele kira_patterns i kira_lessons w Supabase"
epic: EPIC-12
module: supabase-migration
domain: database
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: none
blocks: STORY-12.6, STORY-12.11
tags: [migration, supabase, database, patterns, lessons, rls]
---

## 🎯 User Story

**Jako** developer
**Chcę** żeby patterns i lessons były w Supabase zamiast lokalnych plików markdown
**Żeby** strona /dashboard/patterns działała na Vercelu i wspierała write operations przez API

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`supabase/migrations/[timestamp]_kira_patterns_lessons.sql`

### Aktualne dane (lokalne pliki)
- Patterns: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/patterns.md`
- Anti-patterns: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/anti-patterns.md`
- Lessons: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/LESSONS_LEARNED.md`

### Typy z istniejącego kodu (STORY-8.1)
```typescript
interface PatternCard {
  id, source, type, category, date, model, domain,
  text, tags, related_stories, occurrences
}
interface Lesson {
  id, source, title, date, severity, description,
  root_cause, fix, story_id, tags
}
```

---

## ✅ Acceptance Criteria

### AC-1: Tabela kira_patterns istnieje ze schematem z PatternCard
GIVEN: migracja uruchomiona
WHEN: sprawdzasz `kira_patterns`
THEN: kolumny odpowiadają polom PatternCard + `project_id, created_at, updated_at`

### AC-2: Tabela kira_lessons istnieje ze schematem z Lesson
GIVEN: migracja uruchomiona
WHEN: sprawdzasz `kira_lessons`
THEN: kolumny odpowiadają polom Lesson + `project_id, created_at, updated_at`

### AC-3: RLS — authenticated read, ADMIN write
GIVEN: zalogowany użytkownik (dowolna rola)
WHEN: SELECT na `kira_patterns`
THEN: dane zwracane

GIVEN: zalogowany użytkownik z rolą HELPER (nie ADMIN)
WHEN: INSERT do `kira_patterns`
THEN: błąd 403 (write tylko dla ADMIN lub service_role)

### AC-4: Dane z lokalnych plików zaimportowane
GIVEN: tabele istnieją, sync script uruchomiony (STORY-12.6)
WHEN: SELECT z `kira_patterns`
THEN: dane z `patterns.md` i `anti-patterns.md` są w bazie

---

## 🗄️ Szczegóły Database

```sql
-- ─── kira_patterns ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kira_patterns (
  id              TEXT PRIMARY KEY,      -- np. hash lub 'pattern-001'
  project_id      TEXT NOT NULL DEFAULT 'kira-dashboard',
  source          TEXT NOT NULL,         -- 'patterns.md' | 'anti-patterns.md'
  type            TEXT NOT NULL,         -- 'PATTERN' | 'ANTI_PATTERN'
  category        TEXT NOT NULL,
  date            DATE,
  model           TEXT,
  domain          TEXT,
  text            TEXT NOT NULL,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  related_stories TEXT[] NOT NULL DEFAULT '{}',
  occurrences     INT  NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── kira_lessons ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kira_lessons (
  id          TEXT PRIMARY KEY,          -- 'OPS-001', 'OPS-002' itd.
  project_id  TEXT NOT NULL DEFAULT 'kira-dashboard',
  source      TEXT NOT NULL DEFAULT 'LESSONS_LEARNED.md',
  title       TEXT NOT NULL,
  date        DATE,
  severity    TEXT NOT NULL DEFAULT 'LOW', -- CRITICAL|HIGH|MEDIUM|LOW
  description TEXT NOT NULL,
  root_cause  TEXT,
  fix         TEXT,
  story_id    TEXT,                       -- powiązana story np. 'STORY-7.1'
  tags        TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indeksy

```sql
CREATE INDEX IF NOT EXISTS idx_kira_patterns_project  ON kira_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_kira_patterns_type     ON kira_patterns(type);
CREATE INDEX IF NOT EXISTS idx_kira_patterns_tags     ON kira_patterns USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kira_lessons_project   ON kira_lessons(project_id);
CREATE INDEX IF NOT EXISTS idx_kira_lessons_severity  ON kira_lessons(severity);
```

### RLS

```sql
ALTER TABLE kira_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kira_lessons  ENABLE ROW LEVEL SECURITY;

-- Read: wszyscy zalogowani
CREATE POLICY "auth_read_patterns" ON kira_patterns FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_lessons"  ON kira_lessons  FOR SELECT TO authenticated USING (true);

-- Write: ADMIN (sprawdzamy przez user_roles) lub service_role
CREATE POLICY "admin_write_patterns" ON kira_patterns
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "admin_write_lessons" ON kira_lessons
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );
```

### Rollback Plan
```sql
DROP TABLE IF EXISTS kira_patterns;
DROP TABLE IF EXISTS kira_lessons;
```

---

## ⚠️ Edge Cases

### EC-1: `id` dla patterns — brak naturalnego klucza w markdown
Scenariusz: patterns.md nie ma ID — jak generować `id`
Oczekiwane zachowanie: sync script generuje ID jako `MD5(text)[0:8]` lub sekwencyjne `pattern-001`

### EC-2: Duplikaty przy imporcie z pliku
Scenariusz: ten sam pattern w patterns.md i anti-patterns.md
Oczekiwane zachowanie: `INSERT ... ON CONFLICT (id) DO NOTHING` — stary rekord nie nadpisany

### EC-3: tags jako TEXT[] vs JSONB
Scenariusz: GIN index na TEXT[] może być wolny przy >1000 patterns
Oczekiwane zachowanie: TEXT[] wystarczy przy <500 patterns — możliwa migracja na JSONB w EPIC-13

---

## 🚫 Out of Scope tej Story
- Sync script (STORY-12.6)
- API endpoints (STORY-12.11)
- Import historycznych danych (STORY-12.6)

---

## ✔️ Definition of Done
- [ ] Plik migracji w `supabase/migrations/`
- [ ] Migracja uruchomiona na produkcyjnym Supabase
- [ ] Tabele `kira_patterns` i `kira_lessons` istnieją
- [ ] RLS włączone — ADMIN write, authenticated read
- [ ] GIN index na tags
- [ ] Rollback przetestowany
- [ ] Story review przez PO
