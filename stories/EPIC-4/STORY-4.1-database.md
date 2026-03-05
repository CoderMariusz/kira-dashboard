---
story_id: STORY-4.1
title: "Shopping list schema — tabela kb_shopping_items + indexes"
epic: EPIC-4
module: home
domain: database
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.3]
blocks: [STORY-4.2]
tags: [migration, sqlite, schema, shopping]
---

## 🎯 User Story

**Jako** system KiraBoard
**Chcę** mieć tabelę `kb_shopping_items` w lokalnej SQLite z odpowiednią strukturą i indeksami
**Żeby** Shopping List mógł przechowywać i efektywnie pobierać elementy listy zakupów rodziny

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Plik migracji: `server/db/migrations/004_shopping_items.sql`
Schemat SQLite: `server/db/schema.sql` (aktualizacja)
Tabela lokalna: `kb_shopping_items` (sync → Supabase w EPIC-0)

### Powiązane pliki
- `server/db/database.js` — better-sqlite3 init
- `server/db/migrations/` — katalog migracji
- `server/db/schema.sql` — pełny schemat

### Stan systemu przed tą story
- STORY-0.3 ukończona: better-sqlite3 zainstalowane, baza `kira.db` zainicjowana, mechanizm migracji działa
- Tabele `kb_users`, `kb_sessions` istnieją

---

## ✅ Acceptance Criteria

### AC-1: Tabela kb_shopping_items istnieje po migracji
GIVEN: Baza `kira.db` istnieje i mechanizm migracji działa (STORY-0.3)
WHEN: Uruchamiam migrację `004_shopping_items.sql`
THEN: Tabela `kb_shopping_items` istnieje w bazie SQLite
AND: Tabela zawiera kolumny: `id`, `name`, `quantity`, `unit`, `category`, `bought`, `bought_at`, `created_at`, `created_by`

### AC-2: Typy danych i ograniczenia
GIVEN: Tabela `kb_shopping_items` istnieje
WHEN: Próbuję wstawić rekord z prawidłowymi danymi
THEN: Rekord zostaje zapisany z poprawnymi typami: `id` jako TEXT (UUID), `bought` jako INTEGER (0/1), `created_at` jako TEXT (ISO 8601)
AND: Kolumna `category` akceptuje tylko wartości: `warzywa`, `mieso`, `nabiał`, `chemia`, `inne`, `pieczywo`, `mrozonki`
AND: Kolumna `name` ma ograniczenie NOT NULL i max 255 znaków

### AC-3: Indeksy poprawiające wydajność
GIVEN: Tabela `kb_shopping_items` istnieje
WHEN: Sprawdzam strukturę bazy
THEN: Istnieje indeks na `(bought, created_at)` — dla listowania aktywnych/kupionych
AND: Istnieje indeks na `category` — dla filtrowania po kategorii

### AC-4: Migracja jest idempotentna
GIVEN: Migracja `004_shopping_items.sql` została już uruchomiona
WHEN: Uruchamiam ją ponownie
THEN: System nie zwraca błędu (użycie `CREATE TABLE IF NOT EXISTS`)
AND: Dane w tabeli pozostają niezmienione

### AC-5: Rollback możliwy
GIVEN: Tabela `kb_shopping_items` istnieje
WHEN: Uruchamiam plik down migracji
THEN: Tabela `kb_shopping_items` zostaje usunięta bez błędów

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `server/db/migrations/004_shopping_items.sql`

```sql
-- Tabela: kb_shopping_items
-- Kolumny:
--   id          TEXT PRIMARY KEY (UUID v4, generowany po stronie serwera)
--   name        TEXT NOT NULL  (max 255 znaków, nazwa produktu np. "Mleko")
--   quantity    REAL DEFAULT 1 (ilość, np. 2.5)
--   unit        TEXT DEFAULT '' (jednostka: 'kg', 'szt', 'l', '' gdy brak)
--   category    TEXT NOT NULL DEFAULT 'inne'
--                  CHECK category IN ('warzywa','mieso','nabiał','chemia','inne','pieczywo','mrozonki')
--   bought      INTEGER NOT NULL DEFAULT 0  (0 = nie kupione, 1 = kupione)
--   bought_at   TEXT  (ISO 8601, NULL gdy nie kupione)
--   created_by  TEXT  (FK → kb_users.id, NULL = system)
--   created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

#### Indeksy

```sql
-- Indeks 1: idx_shopping_bought_created na kb_shopping_items(bought, created_at DESC)
--   Powód: główne zapytanie listy → WHERE bought=0 ORDER BY created_at DESC
-- Indeks 2: idx_shopping_category na kb_shopping_items(category)
--   Powód: filtrowanie po kategorii (sekcje listy zakupów)
```

#### Dane seedowe
Tabela startuje pusta — brak seedów.

### Row Level Security (RLS)
Tabela jest w SQLite (lokalna) — brak RLS. Dostęp kontrolowany przez middleware Express (STORY-3.3).

Odpowiednik Supabase (sync w EPIC-0) będzie miał RLS:

| Policy | Operacja | Rola | Warunek |
|--------|----------|------|---------|
| home_users_select | SELECT | authenticated | `true` (wszyscy zalogowani widzą zakupy) |
| home_users_insert | INSERT | authenticated | `auth.uid() IS NOT NULL` |
| home_users_update | UPDATE | authenticated | `true` |
| home_users_delete | home_plus, admin | authenticated | `role IN ('home_plus','admin')` |

### Rollback Plan
`DROP TABLE IF EXISTS kb_shopping_items;` — bezpieczne, dane testowe odtwarzalne.

---

## ⚠️ Edge Cases

### EC-1: Pusta nazwa produktu
Scenariusz: Próba wstawienia rekordu z `name = ''` lub NULL
Oczekiwane zachowanie: SQLite zwraca błąd naruszenia constraint NOT NULL lub CHECK
Komunikat dla użytkownika: "Nazwa produktu jest wymagana"

### EC-2: Nieprawidłowa kategoria
Scenariusz: Wstawienie rekordu z `category = 'beverages'` (nieznana wartość)
Oczekiwane zachowanie: SQLite zwraca błąd CHECK constraint
Komunikat dla użytkownika: "Nieprawidłowa kategoria produktu"

---

## 🚫 Out of Scope tej Story
- Tabela `kb_shopping_history` (smart suggestions) — osobna migracja w EPIC-0
- Tabela kanban (STORY-4.4)
- Sync do Supabase — to EPIC-0 zadanie
- API endpoints — to STORY-4.2

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Migracja przechodzi na czystej bazie (up i down)
- [ ] Tabela `kb_shopping_items` istnieje z poprawną strukturą i indeksami
- [ ] CHECK constraint na `category` działa (test ręczny: INSERT z nieprawidłową kategorią → błąd)
- [ ] Rollback przetestowany (`DROP TABLE` wykonuje się bez błędu)
- [ ] Story review przez PO
