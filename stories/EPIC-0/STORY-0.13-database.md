---
story_id: STORY-0.13
title: "Rozszerzenie SQLite — tabele recurring_tasks + shopping_history"
epic: EPIC-0
module: infrastructure
domain: database
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.3]
blocks: [STORY-0.14]
tags: [sqlite, database, recurring, shopping, migration]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć tabele `kb_recurring_tasks` i `kb_shopping_history` w SQLite
**Żeby** recurring tasks mogły być auto-generowane przez cron (STORY-0.14) i shopping history wspierała smart suggestions (EPIC-4)

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Modyfikacja: `db/init.js` — dodanie 2 nowych tabel do `db.exec()`
- Tabele: `kb_recurring_tasks`, `kb_shopping_history`
- Inspiracja: Grocy (chores z recurrence) + KitchenOwl (shopping history smart suggestions)

### Stan systemu przed tą story
- STORY-0.3 ukończona — `db/init.js` istnieje, `kiraboard.db` z 5 tabelami
- `better-sqlite3` zainstalowane

---

## ✅ Acceptance Criteria

### AC-1: Tabele istnieją po starcie serwera
GIVEN: `db/init.js` zaktualizowany z nowymi CREATE TABLE
WHEN: Uruchomisz `node server.cjs` (lub `node -e "require('./db/init').initDatabase()"`)
THEN: `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kb_%'` zwraca 7 tabel (5 istniejących + 2 nowe)

### AC-2: kb_recurring_tasks akceptuje poprawne dane
GIVEN: Tabela istnieje
WHEN: Wykonasz INSERT z recurrence='weekly', day_of_week=0, assigned_to='rotate'
THEN: Rekord zapisany bez błędów

### AC-3: kb_shopping_history ma UNIQUE constraint
GIVEN: Tabela istnieje z rekordem (item_name='Mleko', category='Nabiał')
WHEN: Spróbujesz INSERT OR REPLACE z tym samym (item_name, category)
THEN: Rekord zaktualizowany (upsert), nie zduplikowany — `SELECT COUNT(*) FROM kb_shopping_history WHERE item_name='Mleko'` = 1

### AC-4: CHECK constraint na recurrence
GIVEN: Tabela istnieje
WHEN: Wykonasz INSERT z `recurrence='invalid_value'`
THEN: SQLite rzuca `CHECK constraint failed: kb_recurring_tasks`

---

## 🗄️ Szczegóły Database

### Nowe tabele — dodaj do `db/init.js`:

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
    rotation_users TEXT,               -- JSON array user_ids np. '["zuza","iza"]'
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
    active INTEGER DEFAULT 1,
    last_created_at TEXT,             -- kiedy ostatnio auto-stworzono task (YYYY-MM-DD)
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

### Rollback Plan
```sql
DROP TABLE IF EXISTS kb_recurring_tasks;
DROP TABLE IF EXISTS kb_shopping_history;
```

### Dane seedowe — przykładowy recurring task (opcjonalnie)
```sql
-- Test recurring task: "Test" (daily) — sprawdza STORY-0.14
INSERT OR IGNORE INTO kb_recurring_tasks (title, recurrence, active) 
VALUES ('Test Daily Task', 'daily', 1);
```

---

## ⚠️ Edge Cases

### EC-1: rotation_users jako JSON string
Scenariusz: `rotation_users = '["zuza","iza"]'` — SQLite nie ma natywnego JSON array type
Oczekiwane zachowanie: Przechowywane jako TEXT, parsowane w JS: `JSON.parse(task.rotation_users)`. Jeśli NULL → brak rotacji.

### EC-2: Migracja na istniejącej bazie
Scenariusz: `kiraboard.db` już istnieje (STORY-0.3), nowe tabele dodawane
Oczekiwane zachowanie: `CREATE TABLE IF NOT EXISTS` — bezpieczne, idempotentne. Drugie uruchomienie serwera nie rzuca błędów.

---

## 🚫 Out of Scope tej Story
- API endpoints do zarządzania recurring tasks (EPIC-4)
- UI dla recurring tasks
- Auto-generowanie tasków z recurring_tasks (STORY-0.14)
- Smart suggestions algorytm (EPIC-4)
- Seed danych produkcyjnych

---

## ✔️ Definition of Done
- [ ] `db/init.js` zawiera `CREATE TABLE IF NOT EXISTS kb_recurring_tasks` i `kb_shopping_history`
- [ ] Tabele tworzone automatycznie przy starcie serwera
- [ ] `kb_recurring_tasks`: recurrence CHECK constraint (daily/weekly/biweekly/monthly)
- [ ] `kb_shopping_history`: UNIQUE(item_name, category) — INSERT OR REPLACE działa jako upsert
- [ ] Indeksy dodane: `idx_recurring_active`, `idx_shopping_hist_count`
- [ ] Istniejące 5 tabel (STORY-0.3) nadal działają bez zmian
- [ ] Serwer startuje bez błędów po aktualizacji `db/init.js`
