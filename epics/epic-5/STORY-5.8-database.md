---
story_id: STORY-5.8
title: "Supabase migration — tabele bridge_sync (epics, stories, runs, projects)"
epic: EPIC-5
module: sync
domain: database
status: draft
difficulty: simple
recommended_model: haiku-4-5
priority: must
estimated_effort: 2h
depends_on: none
blocks: [STORY-5.9]
tags: [database, supabase, migration, bridge, sync, rls, postgresql]
---

## 🎯 User Story

**Jako** kira-dashboard deployed na Vercel
**Chcę** mieć w Supabase tabele z danymi pipeline (epics, stories, runs, projects)
**Żeby** aplikacja mogła wyświetlać dane pipeline gdy Bridge (localhost) jest niedostępny

---

## 📐 Kontekst implementacyjny

### Problem do rozwiązania

Bridge działa lokalnie (`localhost:8199`) i używa SQLite (`data/bridge.db`).
Vercel nie ma dostępu do localhost → dashboard na produkcji nie ma danych pipeline.

Rozwiązanie: **Hybrid Mode**
- **W domu** → dashboard czyta z Bridge API (real-time, localhost)
- **Poza domem** → dashboard czyta z Supabase (sync z SQLite co ~5 min)

Ta story tworzy **warstwę danych w Supabase** — tabele są read-only dla aplikacji,
write-only dla skryptu sync (STORY-5.9).

### Gdzie w systemie

```
supabase/migrations/20260223200000_bridge_sync_tables.sql  → nowa migracja
```

### Schemat źródłowy (SQLite bridge.db)

Tabele do zsynchronizowania (uproszczone, read-only widok):

**projects** (klucz: `key`)
```sql
key TEXT, name TEXT, path TEXT, type TEXT, description TEXT,
bridge_project INTEGER, is_current INTEGER, created_at TEXT, updated_at TEXT
```

**epics** (klucz: `project_id + id`)
```sql
project_id TEXT, id TEXT, title TEXT, file_path TEXT,
status TEXT CHECK IN ('DRAFT','PLANNED','IN_PROGRESS','DONE'),
created_at TEXT, org_id TEXT, workspace_id TEXT
```

**stories** (klucz: `project_id + id`)
```sql
project_id TEXT, id TEXT, epic_id TEXT, title TEXT, file_path TEXT,
status TEXT CHECK IN ('BACKLOG','READY','IN_PROGRESS','REVIEW','REFACTOR','DONE','FAILED','BLOCKED'),
size TEXT, expected_duration_min INTEGER, depends_on TEXT (JSON array),
parallel_with TEXT (JSON array), assigned_worker TEXT, branch TEXT,
definition_of_done TEXT, model TEXT, created_at TEXT, updated_at TEXT,
started_at TEXT
```

**runs** (klucz: `id`)
```sql
id TEXT, story_id TEXT, project_id TEXT, step TEXT, worker TEXT,
model TEXT, status TEXT, attempt_number INTEGER,
started_at TEXT, ended_at TEXT, duration_ms INTEGER, error_message TEXT
```

---

## ✅ Acceptance Criteria

### AC-1: Migracja tworzy 4 tabele

GIVEN: `supabase/migrations/20260223200000_bridge_sync_tables.sql` istnieje
WHEN: `supabase db push` jest uruchomiony
THEN: w Supabase istnieją tabele: `bridge_projects`, `bridge_epics`, `bridge_stories`, `bridge_runs`
AND: `supabase migration list` pokazuje migrację jako applied

### AC-2: Struktura tabeli bridge_projects

GIVEN: migracja zastosowana
THEN: `bridge_projects` ma kolumny:
- `key TEXT PRIMARY KEY`
- `name TEXT NOT NULL`
- `path TEXT NOT NULL`
- `type TEXT NOT NULL DEFAULT 'other'`
- `description TEXT DEFAULT ''`
- `bridge_project BOOLEAN NOT NULL DEFAULT false`
- `is_current BOOLEAN NOT NULL DEFAULT false`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`
- `synced_at TIMESTAMPTZ NOT NULL DEFAULT now()` — kiedy ostatnio zsynchronizowano

### AC-3: Struktura tabeli bridge_epics

GIVEN: migracja zastosowana
THEN: `bridge_epics` ma kolumny:
- `project_id TEXT NOT NULL`
- `id TEXT NOT NULL`
- `title TEXT NOT NULL`
- `file_path TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'DRAFT'` z CHECK constraint
- `created_at TIMESTAMPTZ`
- `synced_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- PRIMARY KEY: `(project_id, id)`
- FOREIGN KEY: `project_id` → `bridge_projects(key)` ON DELETE CASCADE

### AC-4: Struktura tabeli bridge_stories

GIVEN: migracja zastosowana
THEN: `bridge_stories` ma kolumny:
- `project_id TEXT NOT NULL`
- `id TEXT NOT NULL`
- `epic_id TEXT NOT NULL`
- `title TEXT NOT NULL`
- `file_path TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'BACKLOG'` z CHECK constraint (wszystkie 8 statusów)
- `size TEXT NOT NULL DEFAULT 'short'` z CHECK ('short','medium','long')
- `expected_duration_min INTEGER NOT NULL DEFAULT 30`
- `depends_on JSONB NOT NULL DEFAULT '[]'`
- `parallel_with JSONB NOT NULL DEFAULT '[]'`
- `assigned_worker TEXT`
- `branch TEXT`
- `definition_of_done TEXT NOT NULL DEFAULT ''`
- `model TEXT`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`
- `started_at TIMESTAMPTZ`
- `synced_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- PRIMARY KEY: `(project_id, id)`
- FOREIGN KEY: `(project_id, epic_id)` → `bridge_epics(project_id, id)` ON DELETE CASCADE

### AC-5: Struktura tabeli bridge_runs

GIVEN: migracja zastosowana
THEN: `bridge_runs` ma kolumny:
- `id TEXT PRIMARY KEY`
- `project_id TEXT`
- `story_id TEXT NOT NULL`
- `step TEXT NOT NULL` z CHECK ('IMPLEMENT','REVIEW','REFACTOR','LESSONS')
- `worker TEXT NOT NULL`
- `model TEXT NOT NULL`
- `status TEXT NOT NULL DEFAULT 'RUNNING'` z CHECK ('RUNNING','DONE','FAILED','TIMEOUT')
- `attempt_number INTEGER NOT NULL DEFAULT 1`
- `started_at TIMESTAMPTZ`
- `ended_at TIMESTAMPTZ`
- `duration_ms INTEGER`
- `error_message TEXT`
- `synced_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### AC-6: RLS policies — ADMIN read, service_role write

GIVEN: RLS włączony na wszystkich 4 tabelach
THEN: użytkownik z rolą ADMIN może SELECT z wszystkich 4 tabel
AND: użytkownik bez roli ADMIN nie może SELECT (zwraca 0 wierszy)
AND: service_role (klucz `SUPABASE_SERVICE_KEY`) może INSERT/UPDATE/DELETE (do zapisu przez sync script)
AND: authenticated user nie może INSERT/UPDATE/DELETE

Policy pattern (analogiczny do innych tabel w projekcie):
```sql
-- select: tylko ADMIN
CREATE POLICY "bridge_sync_select_admin" ON bridge_stories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'ADMIN'
    )
  );
```

### AC-7: Indeksy dla wydajności

GIVEN: migracja zastosowana
THEN: istnieją indeksy:
- `bridge_stories(project_id, epic_id)` — dla JOIN z epics
- `bridge_stories(status)` — dla filtrowania po statusie
- `bridge_runs(story_id)` — dla lookup runów per story
- `bridge_runs(status)` — dla filtrowania po statusie
- `bridge_epics(project_id, status)` — dla filtrowania po statusie

### AC-8: Migracja jest idempotentna

GIVEN: migracja uruchomiona po raz drugi (lub na czystej bazie)
THEN: nie rzuca błędu (użyj `CREATE TABLE IF NOT EXISTS`)
AND: nie duplikuje danych ani policies

### AC-9: Veryfikacja skryptem

GIVEN: migracja zastosowana
WHEN: `./scripts/verify-migrations.sh` uruchomiony
THEN: skrypt nie raportuje błędów dla nowych tabel

---

## 🚫 Edge Cases

### EC-1: Kolizja nazw z istniejącymi tabelami
- Tabele mają prefix `bridge_` — nie kolidują z `households`, `tasks`, `shopping_items` itd.
- Sprawdź `pg_tables WHERE schemaname = 'public'` przed committem

### EC-2: Pole `depends_on` i `parallel_with` — JSON string w SQLite, JSONB w Postgres
- SQLite przechowuje jako TEXT `'["STORY-1.1"]'`
- Postgres `JSONB` — sync script musi parsować string → JSON przed insertem

### EC-3: Timestamps — TEXT w SQLite, TIMESTAMPTZ w Postgres
- SQLite: `"2026-02-19T10:00:00Z"` (ISO string)
- Postgres: sync script musi rzutować przez `::TIMESTAMPTZ` lub `CAST`

### EC-4: NULL vs empty string
- SQLite może mieć `""` (empty string) zamiast NULL w polach opcjonalnych
- Sync script powinien normalizować: `"" → NULL` dla pól tekstowych opcjonalnych

---

## 📋 Definition of Done

- [ ] Plik migracji `20260223200000_bridge_sync_tables.sql` stworzony
- [ ] `supabase db push` przechodzi bez błędów
- [ ] `supabase migration list` pokazuje migrację jako applied
- [ ] Wszystkie 4 tabele widoczne w Supabase Dashboard
- [ ] RLS włączony — weryfikacja query: `SELECT * FROM bridge_stories` jako anon zwraca 0 wierszy
- [ ] `./scripts/verify-migrations.sh` przechodzi
- [ ] Commit: `feat(db): bridge_sync tables migration — STORY-5.8`

---

## 🔗 Zależności i kolejność

```
STORY-5.8 (database) → STORY-5.9 (backend: sync script + hybrid API)
```

STORY-5.8 musi być DONE zanim zaczniemy STORY-5.9.
