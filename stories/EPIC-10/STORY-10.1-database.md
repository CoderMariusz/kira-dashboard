---
story_id: STORY-10.1
title: "Settings schema — kb_settings tabela (key/value/user_id)"
epic: EPIC-10
module: settings
domain: database
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.3]
blocks: [STORY-10.2]
tags: [migration, schema, settings, sqlite]
---

## 🎯 User Story

**Jako** system KiraBoard
**Chcę** mieć tabelę `kb_settings` przechowującą ustawienia per użytkownik (key/value)
**Żeby** każdy użytkownik mógł mieć niezależne preferencje UI (motyw, język, powiadomienia, auto-refresh)

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Baza danych SQLite — plik `kiraboard.db` (lub ścieżka z env `DB_PATH`).
Migracja tworzy tabelę `kb_settings` z unikalnym indeksem na `(user_id, key)`.

### Powiązane pliki
- `db/migrations/010_kb_settings.sql` — plik migracji
- `db/seed.sql` — dane seedowe z domyślnymi ustawieniami
- `lib/db.ts` — inicjalizacja better-sqlite3

### Stan systemu przed tą story
- STORY-0.3 ukończona: baza SQLite istnieje, `better-sqlite3` skonfigurowany, `db/migrations/` ma runner
- Tabela `kb_users` istnieje z kolumną `id` (TEXT, PRIMARY KEY)

---

## ✅ Acceptance Criteria

### AC-1: Tabela kb_settings zostaje utworzona przez migrację
GIVEN: czysta baza SQLite bez tabeli `kb_settings`
WHEN: runner migracji wykona plik `010_kb_settings.sql`
THEN: tabela `kb_settings` istnieje z kolumnami: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `user_id TEXT NOT NULL`, `key TEXT NOT NULL`, `value TEXT NOT NULL`, `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`
AND: unikalny indeks na `(user_id, key)` istnieje

### AC-2: Indeks zapewnia unikalność ustawień per użytkownik
GIVEN: tabela `kb_settings` istnieje i ma rekord `(user_id='u1', key='theme', value='dark')`
WHEN: próba INSERT kolejnego rekordu `(user_id='u1', key='theme', value='light')`
THEN: SQLite zwraca błąd UNIQUE constraint — nie duplikuje rekordu

### AC-3: Seed data tworzy domyślne ustawienia dla istniejących użytkowników
GIVEN: tabela `kb_users` ma co najmniej jednego użytkownika
WHEN: `db/seed.sql` zostanie wykonany
THEN: każdy istniejący użytkownik ma rekordy w `kb_settings` dla kluczy: `theme` (wartość: `system`), `language` (wartość: `pl`), `notifications` (wartość: `true`), `auto_refresh_interval` (wartość: `30`)

### AC-4: Migracja jest idempotentna (CREATE TABLE IF NOT EXISTS)
GIVEN: migracja już była wykonana (tabela istnieje)
WHEN: runner migracji wykona ją ponownie
THEN: brak błędu — tabela pozostaje niezmieniona, dane nie są tracone

---

## 🗄️ Szczegóły Database

### Tabele i migracja

Plik migracji: `db/migrations/010_kb_settings.sql`

```sql
CREATE TABLE IF NOT EXISTS kb_settings (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  key        TEXT    NOT NULL,
  value      TEXT    NOT NULL,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES kb_users(id) ON DELETE CASCADE
);
```

#### Indeksy

```sql
-- Indeks unikalny: (user_id, key) — każdy user ma max 1 wartość per klucz
CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_settings_user_key
  ON kb_settings (user_id, key);

-- Indeks na user_id — szybkie pobranie wszystkich ustawień danego użytkownika
CREATE INDEX IF NOT EXISTS idx_kb_settings_user_id
  ON kb_settings (user_id);
```

#### Dane seedowe

```sql
-- Seed: domyślne ustawienia dla wszystkich istniejących użytkowników
-- Używa INSERT OR IGNORE żeby nie nadpisywać istniejących
INSERT OR IGNORE INTO kb_settings (user_id, key, value)
  SELECT id, 'theme',                'system' FROM kb_users;
INSERT OR IGNORE INTO kb_settings (user_id, key, value)
  SELECT id, 'language',             'pl'     FROM kb_users;
INSERT OR IGNORE INTO kb_settings (user_id, key, value)
  SELECT id, 'notifications',        'true'   FROM kb_users;
INSERT OR IGNORE INTO kb_settings (user_id, key, value)
  SELECT id, 'auto_refresh_interval','30'     FROM kb_users;
```

#### Dozwolone klucze (dokumentacja, nie constraint DB)
| Klucz | Typ wartości | Dozwolone wartości |
|-------|--------------|--------------------|
| `theme` | string | `light`, `dark`, `system` |
| `language` | string | `pl`, `en` |
| `notifications` | string (boolean) | `true`, `false` |
| `auto_refresh_interval` | string (number) | `10`, `30`, `60`, `300` (sekundy) |

### Row Level Security (RLS)
Nie dotyczy — SQLite bez RLS. Dostęp kontrolowany przez middleware na poziomie API.

### Rollback Plan
```sql
-- Down migration
DROP INDEX IF EXISTS idx_kb_settings_user_key;
DROP INDEX IF EXISTS idx_kb_settings_user_id;
DROP TABLE IF EXISTS kb_settings;
```

---

## ⚠️ Edge Cases

### EC-1: Migracja gdy kb_users jeszcze nie istnieje
Scenariusz: runner migracji wywołuje `010_kb_settings.sql` przed `001_kb_users.sql`
Oczekiwane zachowanie: runner migracji respektuje kolejność numeryczną — pliki wykonywane rosnąco; FK constraint nie może być spełniony bez `kb_users`, więc runner MUSI uruchamiać migracje w kolejności

### EC-2: Seed na pustej tabeli kb_users
Scenariusz: `kb_users` jest pusta w momencie seedowania
Oczekiwane zachowanie: seed wykona się bez błędu, INSERT OR IGNORE nie wstawi żadnych rekordów (SELECT zwraca 0 wierszy)

### EC-3: Klucz ustawień spoza listy dozwolonych
Scenariusz: zewnętrzny INSERT wstawia klucz np. `hacked_setting`
Oczekiwane zachowanie: baza przyjmie rekord (brak CHECK constraint na klucze) — walidacja dozwolonych kluczy odbywa się na poziomie API (STORY-10.2)

---

## 🚫 Out of Scope tej Story
- Walidacja wartości kluczy (to STORY-10.2 — backend API)
- Odczyt/zapis ustawień przez aplikację (to STORY-10.2)
- UI do zarządzania ustawieniami (to STORY-10.3)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Migracja przechodzi na czystej bazie (up i down)
- [ ] Unikalny indeks na (user_id, key) istnieje i blokuje duplikaty
- [ ] Indeks na user_id istnieje
- [ ] Seed tworzy 4 domyślne ustawienia per użytkownik
- [ ] Rollback (down migration) usuwa tabelę i indeksy bez błędów
- [ ] Story review przez PO
