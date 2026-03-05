---
story_id: STORY-4.4
title: "Kanban schema — kb_kanban_cards + kb_kanban_columns"
epic: EPIC-4
module: home
domain: database
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.3]
blocks: [STORY-4.5]
tags: [migration, sqlite, schema, kanban]
---

## 🎯 User Story

**Jako** system KiraBoard
**Chcę** mieć tabele `kb_kanban_columns` i `kb_kanban_cards` w SQLite z odpowiednią strukturą, indeksami i danymi początkowymi
**Żeby** Kanban Tasks mógł przechowywać karty i kolumny z obsługą drag & drop i persystencją kolejności

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Plik migracji: `server/db/migrations/005_kanban.sql`
Schemat SQLite: `server/db/schema.sql` (aktualizacja)
Tabele: `kb_kanban_columns`, `kb_kanban_cards`

### Powiązane pliki
- `server/db/database.js` — better-sqlite3 init
- `server/db/migrations/` — katalog migracji
- `server/db/seeds/kanban_columns.sql` — seed dla domyślnych kolumn

### Stan systemu przed tą story
- STORY-0.3 ukończona: baza `kira.db` zainicjowana, mechanizm migracji działa
- Tabela `kb_users` istnieje (FK dla `assigned_to`)

---

## ✅ Acceptance Criteria

### AC-1: Tabela kb_kanban_columns istnieje po migracji
GIVEN: Baza `kira.db` istnieje i mechanizm migracji działa
WHEN: Uruchamiam migrację `005_kanban.sql`
THEN: Tabela `kb_kanban_columns` istnieje z kolumnami: `id`, `title`, `position`, `color`, `created_at`
AND: Seed wypełnia 3 domyślne kolumny: `{ id: 'col-todo', title: 'To Do', position: 0 }`, `{ id: 'col-doing', title: 'Doing', position: 1 }`, `{ id: 'col-done', title: 'Done', position: 2 }`

### AC-2: Tabela kb_kanban_cards istnieje po migracji
GIVEN: Tabela `kb_kanban_columns` istnieje
WHEN: Sprawdzam strukturę bazy po migracji
THEN: Tabela `kb_kanban_cards` istnieje z kolumnami: `id`, `column_id`, `title`, `description`, `assigned_to`, `due_date`, `position`, `created_by`, `created_at`, `updated_at`
AND: `column_id` jest FK do `kb_kanban_columns(id)` z ON DELETE SET NULL
AND: `assigned_to` jest FK do `kb_users(id)` z ON DELETE SET NULL (nullable)

### AC-3: Kolumna position umożliwia reorder
GIVEN: Tabela `kb_kanban_cards` istnieje z kartami w kolumnie
WHEN: Aktualizuję `position` kart w transakcji (reorder po drag & drop)
THEN: Wartości `position` mogą być dowolnymi liczbami INTEGER (nie wymagają ciągłości — gap strategy)

### AC-4: Indeksy poprawiające wydajność
GIVEN: Obie tabele istnieją
WHEN: Sprawdzam strukturę bazy
THEN: Istnieje indeks na `kb_kanban_cards(column_id, position)` — dla pobierania kart kolumny posortowanych
AND: Istnieje indeks na `kb_kanban_cards(assigned_to)` — dla filtrowania po osobie

### AC-5: Migracja jest idempotentna i posiada rollback
GIVEN: Migracja `005_kanban.sql` została już uruchomiona raz
WHEN: Uruchamiam ją ponownie lub uruchamiam down migrację
THEN: Ponowne uruchomienie nie generuje błędów (`IF NOT EXISTS`)
AND: Down migracja usuwa obie tabele w odwrotnej kolejności (najpierw cards, potem columns)

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `server/db/migrations/005_kanban.sql`

```sql
-- Tabela 1: kb_kanban_columns
-- Kolumny:
--   id          TEXT PRIMARY KEY  (np. 'col-todo', 'col-doing', 'col-done' — stable IDs)
--   title       TEXT NOT NULL     (np. 'To Do', 'Doing', 'Done')
--   position    INTEGER NOT NULL DEFAULT 0  (kolejność kolumn, gap strategy)
--   color       TEXT DEFAULT '#6b7280'      (opcjonalny kolor nagłówka kolumny, hex)
--   created_at  TEXT NOT NULL DEFAULT (datetime('now'))

-- Tabela 2: kb_kanban_cards
-- Kolumny:
--   id          TEXT PRIMARY KEY  (UUID v4)
--   column_id   TEXT REFERENCES kb_kanban_columns(id) ON DELETE SET NULL
--   title       TEXT NOT NULL  (max 500 znaków, tytuł zadania)
--   description TEXT DEFAULT ''  (opis, markdown obsługiwany na froncie)
--   assigned_to TEXT REFERENCES kb_users(id) ON DELETE SET NULL  (nullable)
--   due_date    TEXT  (ISO 8601 date 'YYYY-MM-DD', nullable)
--   position    INTEGER NOT NULL DEFAULT 0  (kolejność w kolumnie, gap strategy)
--   created_by  TEXT REFERENCES kb_users(id) ON DELETE SET NULL
--   created_at  TEXT NOT NULL DEFAULT (datetime('now'))
--   updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

#### Indeksy

```sql
-- Indeks 1: idx_kanban_cards_column_position na kb_kanban_cards(column_id, position)
--   Powód: główne zapytanie → SELECT karty kolumny ORDER BY position ASC
-- Indeks 2: idx_kanban_cards_assigned na kb_kanban_cards(assigned_to)
--   Powód: filtrowanie kart przypisanych do konkretnego usera
-- Indeks 3: idx_kanban_cards_due_date na kb_kanban_cards(due_date)
--   Powód: widok kalendarza — karty z due_date
```

#### Dane seedowe
```sql
-- Seed: 3 domyślne kolumny
INSERT OR IGNORE INTO kb_kanban_columns (id, title, position) VALUES
  ('col-todo',  'To Do',  0),
  ('col-doing', 'Doing',  1),
  ('col-done',  'Done',   2);
```

### Row Level Security (RLS)
Tabele są w SQLite (lokalna). Dostęp kontrolowany przez Express middleware.

Odpowiednik Supabase:

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| kanban_read | SELECT | authenticated | `true` |
| kanban_insert | INSERT | authenticated | `auth.uid() IS NOT NULL` |
| kanban_update | UPDATE | authenticated | `true` |
| kanban_delete_plus | DELETE kb_kanban_cards | home_plus, admin | `role IN ('home_plus','admin')` |
| kanban_columns_manage | ALL kb_kanban_columns | admin | `role = 'admin'` |

### Rollback Plan
```sql
-- Down:
DROP TABLE IF EXISTS kb_kanban_cards;
DROP TABLE IF EXISTS kb_kanban_columns;
```
Bezpieczne — seed ponownie wykonywany przy up migracji.

---

## ⚠️ Edge Cases

### EC-1: Karta z column_id wskazującym na nieistniejącą kolumnę
Scenariusz: `column_id` ustawiony na NULL (po ON DELETE SET NULL gdy kolumna usunięta)
Oczekiwane zachowanie: Karta nadal istnieje, `column_id = NULL` — frontend wyświetla ją w specjalnej sekcji "Bez kolumny" lub ukrywa
Komunikat dla użytkownika: (obsługa po stronie frontendu w STORY-4.6)

### EC-2: Dwa inserty seed jednocześnie
Scenariusz: Seed uruchomiony dwa razy (restart serwera)
Oczekiwane zachowanie: `INSERT OR IGNORE` zapobiega duplikatom — kolumny pozostają bez zmian

---

## 🚫 Out of Scope tej Story
- Tabela `kb_tasks` i `kb_recurring_tasks` — EPIC-0 (osobna migracja)
- API endpoints — to STORY-4.5
- Label/tagi dla kart — przyszła funkcjonalność
- Supabase sync — EPIC-0

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Migracja przechodzi na czystej bazie (up i down)
- [ ] Obie tabele istnieją z poprawnymi typami i relacjami FK
- [ ] Seed: 3 domyślne kolumny (To Do, Doing, Done) istnieją po migracji
- [ ] Indeksy dodane na column_id+position, assigned_to, due_date
- [ ] Rollback przetestowany
- [ ] Story review przez PO
