---
story_id: STORY-12.1
title: "Supabase schema migration — wszystkie tabele kb_* + bridge + nightclaw do Supabase"
epic: EPIC-12
module: sync
domain: database
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: none
priority: must
estimated_effort: 5h
depends_on: [STORY-0.5, STORY-0.3]
blocks: [STORY-12.2, STORY-12.3]
tags: [migration, supabase, schema, rls, indexes, sync]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć wszystkie tabele danych KiraBoard odwzorowane w Supabase PostgreSQL
**Żeby** synchronizacja lokalna ↔ cloud była możliwa i dane były dostępne zdalnie bez Bridge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Plik migracji: `supabase/migrations/[timestamp]_epic12_sync_tables.sql`
Supabase projekt: kira-dashboard (EPIC-0 setup)

### Powiązane pliki
- `supabase/migrations/` — katalog migracji
- `sync_to_supabase.js` — skeleton z EPIC-0 (będzie rozszerzony w STORY-12.2)
- `lib/supabase.ts` — klient Supabase (STORY-0.5)
- SQLite schema: `db/schema.sql` (STORY-0.3)

### Stan systemu przed tą story
- Supabase projekt jest skonfigurowany (STORY-0.5)
- SQLite baza lokalna istnieje z tabelami kb_* (STORY-0.3)
- Klient `@supabase/supabase-js` jest zainstalowany
- Mogą istnieć podstawowe tabele z EPIC-0; ta story je rozszerza/uzupełnia

---

## ✅ Acceptance Criteria

### AC-1: Tabele kb_* mirror w Supabase
GIVEN: Supabase projekt jest dostępny i połączony
WHEN: Uruchomię migrację `supabase db push` lub `supabase migration up`
THEN: W Supabase istnieją tabele: `kb_tasks`, `kb_shopping_items`, `kb_kanban_cards`, `kb_recurring_tasks`, `kb_story_gates`, `kb_settings`, `kb_dashboard_presets`
AND: Każda tabela ma kolumnę `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` i `synced_at TIMESTAMPTZ`

### AC-2: Tabele Bridge data w Supabase
GIVEN: Migracja jest uruchomiona
WHEN: Sprawdzę schemat Supabase
THEN: Istnieją tabele: `bridge_stories`, `bridge_runs`, `nightclaw_digests`
AND: `bridge_stories` ma kolumny: `id TEXT`, `project_key TEXT`, `title TEXT`, `status TEXT`, `size TEXT`, `dod TEXT`, `file_path TEXT`, `updated_at TIMESTAMPTZ`
AND: `bridge_runs` ma kolumny: `id TEXT`, `story_id TEXT`, `project_key TEXT`, `status TEXT`, `model TEXT`, `started_at TIMESTAMPTZ`, `finished_at TIMESTAMPTZ`
AND: `nightclaw_digests` ma kolumny: `id TEXT`, `content_md TEXT`, `status TEXT`, `run_date DATE`, `patterns_found_count INTEGER`, `skills_updated TEXT[]`, `synced_at TIMESTAMPTZ`

### AC-3: Tabela sync log
GIVEN: Migracja jest uruchomiona
WHEN: Sprawdzę schemat Supabase
THEN: Istnieje tabela `kb_sync_log` z kolumnami: `id SERIAL PRIMARY KEY`, `table_name TEXT`, `operation TEXT`, `record_id TEXT`, `status TEXT`, `error_message TEXT`, `synced_at TIMESTAMPTZ DEFAULT now()`
AND: Tabela ma indeks na `(table_name, synced_at DESC)` dla szybkich zapytań o ostatni sync

### AC-4: Compound keys dla bridge tables
GIVEN: Tabele `bridge_stories` i `bridge_runs` istnieją w Supabase
WHEN: Sprawdzę constraints
THEN: `bridge_stories` ma PRIMARY KEY na `(id, project_key)` — klucz złożony zapobiegający duplikatom między projektami
AND: `bridge_runs` ma PRIMARY KEY na `(id, project_key)`

### AC-5: Updated_at trigger
GIVEN: Dowolna tabela kb_* istnieje w Supabase
WHEN: Rekorд zostaje zaktualizowany
THEN: Kolumna `updated_at` jest automatycznie ustawiana na `NOW()` przez PostgreSQL trigger
AND: Trigger istnieje dla każdej z 7 tabel kb_*

### AC-6: RLS — service key dla write, anon dla read
GIVEN: RLS jest włączony na tabelach
WHEN: Zapytanie przychodzi z kluczem `anon`
THEN: SELECT jest dozwolony dla wszystkich kb_* tabel (dane nieosobowe)
AND: INSERT/UPDATE/DELETE wymaga klucza `service_role`
WHEN: Zapytanie przychodzi z kluczem `service_role` (backend serwer)
THEN: Wszystkie operacje są dozwolone

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `supabase/migrations/[timestamp]_epic12_sync_tables.sql`

```sql
-- Tabele mirror SQLite → Supabase

-- kb_tasks: zadania Mariusza i rodziny
-- Kolumny: id TEXT PK, title TEXT NOT NULL, status TEXT, priority TEXT,
--          due_date DATE, project TEXT, tags TEXT[], notes TEXT,
--          created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- kb_shopping_items: lista zakupów (kluczowe dla Realtime Angeliki)
-- Kolumny: id TEXT PK, name TEXT NOT NULL, quantity TEXT, category TEXT,
--          checked BOOLEAN DEFAULT false, added_by TEXT,
--          created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- kb_kanban_cards: karty kanban pipeline
-- Kolumny: id TEXT PK, title TEXT NOT NULL, column_id TEXT, position INTEGER,
--          assignee TEXT, tags TEXT[], description TEXT,
--          created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- kb_recurring_tasks: zadania cykliczne
-- Kolumny: id TEXT PK, title TEXT NOT NULL, cron_expression TEXT,
--          last_run TIMESTAMPTZ, next_run TIMESTAMPTZ, enabled BOOLEAN DEFAULT true,
--          created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- kb_story_gates: bramki jakości stories
-- Kolumny: id TEXT PK, story_id TEXT NOT NULL, gate_type TEXT,
--          status TEXT, reviewer TEXT, notes TEXT,
--          created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- kb_settings: ustawienia aplikacji (key-value)
-- Kolumny: key TEXT PK, value JSONB, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- kb_dashboard_presets: predefiniowane układy dashboardu
-- Kolumny: id TEXT PK, name TEXT NOT NULL, layout JSONB NOT NULL,
--          is_default BOOLEAN DEFAULT false,
--          created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ

-- bridge_stories: mirror Bridge stories per project
-- Kolumny: id TEXT, project_key TEXT, title TEXT, status TEXT, size TEXT,
--          dod TEXT, file_path TEXT, updated_at TIMESTAMPTZ, synced_at TIMESTAMPTZ
-- PRIMARY KEY: (id, project_key)

-- bridge_runs: historia wykonań stories
-- Kolumny: id TEXT, project_key TEXT, story_id TEXT, status TEXT, model TEXT,
--          started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, synced_at TIMESTAMPTZ
-- PRIMARY KEY: (id, project_key)

-- nightclaw_digests: dzienne podsumowania NightClaw
-- Kolumny: id TEXT PK, content_md TEXT, status TEXT, run_date DATE UNIQUE,
--          patterns_found_count INTEGER DEFAULT 0, skills_updated TEXT[],
--          synced_at TIMESTAMPTZ

-- kb_sync_log: log operacji sync
-- Kolumny: id SERIAL PK, table_name TEXT NOT NULL, operation TEXT NOT NULL,
--          record_id TEXT, status TEXT NOT NULL, error_message TEXT,
--          synced_at TIMESTAMPTZ DEFAULT now()
```

#### Indeksy

```sql
-- kb_shopping_items(updated_at DESC) — Realtime queries najnowszych zmian
-- kb_tasks(updated_at DESC) — sync polling
-- kb_kanban_cards(column_id, position) — sortowanie kanban
-- bridge_stories(project_key, status) — filtrowanie per projekt
-- bridge_runs(project_key, story_id) — historia per story
-- nightclaw_digests(run_date DESC) — najnowszy digest
-- kb_sync_log(table_name, synced_at DESC) — monitoring lag
```

#### Dane seedowe
Brak — tabele wypełniane przez sync engine z SQLite

### Row Level Security (RLS)

#### Polityki (wspólne dla wszystkich kb_* tabel)

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| allow_anon_read | SELECT | anon | true (dane nieosobowe) |
| allow_service_write | INSERT | service_role | true |
| allow_service_update | UPDATE | service_role | true |
| allow_service_delete | DELETE | service_role | true |

```sql
-- Przykład dla kb_shopping_items (analogicznie dla pozostałych):
-- ALTER TABLE kb_shopping_items ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_anon_read" ON kb_shopping_items FOR SELECT TO anon USING (true);
-- CREATE POLICY "allow_service_write" ON kb_shopping_items FOR ALL TO service_role USING (true);
```

### Rollback Plan
Migracja down: `DROP TABLE IF EXISTS [tabela] CASCADE` dla każdej nowej tabeli.
Trigger drop: `DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`.
Nie dotyczy istniejących tabel z EPIC-0 — tylko nowe.

---

## ⚠️ Edge Cases

### EC-1: Tabela już istnieje z EPIC-0
Scenariusz: EPIC-0 stworzył już podstawowe tabele (np. `kb_shopping_items`) z inną strukturą
Oczekiwane zachowanie: Migracja używa `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` — nie crashuje, uzupełnia brakujące kolumny
Komunikat dla użytkownika: Brak (migracja automatyczna)

### EC-2: Supabase projekt niedostępny podczas migracji
Scenariusz: `supabase db push` kończy się błędem połączenia
Oczekiwane zachowanie: Rollback automatyczny, żadna tabela nie jest w stanie częściowym; błąd jest wyraźnie zalogowany
Komunikat dla użytkownika: "Migration failed: Supabase connection error. Check SUPABASE_URL and SUPABASE_SERVICE_KEY."

### EC-3: Konflikt nazw z istniejącymi tabelami Supabase
Scenariusz: Supabase ma już tabelę `kb_tasks` z innym schematem (np. brakuje kolumny `synced_at`)
Oczekiwane zachowanie: `ALTER TABLE ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ` — bezpieczne dodanie brakującej kolumny
Komunikat dla użytkownika: Brak (autofix w migracji)

### EC-4: Updated_at trigger konflikt
Scenariusz: Funkcja `update_updated_at_column()` już istnieje z EPIC-0
Oczekiwane zachowanie: `CREATE OR REPLACE FUNCTION` — bezpieczne nadpisanie
Komunikat dla użytkownika: Brak

---

## 🚫 Out of Scope tej Story
- Wypełnienie tabel danymi (STORY-12.2 — sync engine)
- Supabase Realtime subscriptions (STORY-12.3)
- Migracje do lokalnego SQLite (tu tylko Supabase)
- RLS per-user (zbyt złożone dla tego projektu — patrz EPIC-12 out of scope)

---

## ✔️ Definition of Done
- [ ] Plik migracji `supabase/migrations/[timestamp]_epic12_sync_tables.sql` istnieje i jest poprawny
- [ ] `supabase db push` przechodzi bez błędów na czystym projekcie
- [ ] Wszystkie 7 tabel kb_* istnieją w Supabase z kolumnami `updated_at` i `synced_at`
- [ ] Tabele `bridge_stories`, `bridge_runs`, `nightclaw_digests`, `kb_sync_log` istnieją
- [ ] RLS jest włączony dla wszystkich tabel — anon może SELECT, service_role może ALL
- [ ] Indeksy istnieją dla kluczowych kolumn (updated_at, project_key, run_date)
- [ ] Updated_at trigger działa — UPDATE rekordu aktualizuje timestamp automatycznie
- [ ] Migracja down (rollback) jest zdefiniowana i przetestowana
- [ ] Migracja jest idempotentna — można uruchomić dwukrotnie bez błędów
- [ ] Story review przez PO
