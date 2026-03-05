---
story_id: STORY-0.3
title: "Local SQLite setup — better-sqlite3 + auto-migration"
epic: EPIC-0
module: infrastructure
domain: database
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.1]
blocks: [STORY-0.6, STORY-0.9, STORY-0.13, STORY-0.15]
tags: [sqlite, database, migration, infrastructure]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć lokalną bazę SQLite inicjalizowaną automatycznie przy starcie serwera
**Żeby** dane aplikacji (shopping, tasks, users, activity) były persystowane lokalnie bez zewnętrznych zależności

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Nowy plik: `db/init.js` — moduł inicjalizacji bazy
- Modyfikacja: `server.cjs` — import i wywołanie `initDatabase()` przy starcie
- Baza danych: `kiraboard.db` w katalogu projektu (lub `KB_DB_PATH` z env)

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo istnieje, `npm install` możliwy
- `package.json` gotowy do dodania dependency

---

## ✅ Acceptance Criteria

### AC-1: Baza tworzy się automatycznie
GIVEN: `kiraboard.db` nie istnieje w katalogu projektu
WHEN: Uruchomisz `node server.cjs`
THEN: Plik `kiraboard.db` zostaje utworzony automatycznie, serwer startuje bez błędów

### AC-2: Wszystkie 5 tabel istnieje
GIVEN: `kiraboard.db` utworzony
WHEN: Wykonasz `sqlite3 kiraboard.db ".tables"`
THEN: Wyświetlają się: `kb_users`, `kb_shopping_items`, `kb_tasks`, `kb_activity_log`, `kb_sync_log`

### AC-3: Auto-migration jest idempotentna
GIVEN: Serwer uruchomiony raz (baza istnieje)
WHEN: Uruchomisz serwer ponownie
THEN: Serwer startuje bez błędów (CREATE TABLE IF NOT EXISTS — nie duplikuje)

### AC-4: WAL mode i foreign keys włączone
GIVEN: Baza zainicjalizowana
WHEN: Wykonasz `sqlite3 kiraboard.db "PRAGMA journal_mode; PRAGMA foreign_keys;"`
THEN: Wyniki to `wal` i `1`

---

## 🗄️ Szczegóły Database

### Tabele

```sql
CREATE TABLE IF NOT EXISTS kb_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','home_plus','home')),
  avatar TEXT DEFAULT '👤',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kb_shopping_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Inne',
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  bought INTEGER DEFAULT 0,
  bought_at TEXT,
  added_by TEXT REFERENCES kb_users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kb_tasks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT DEFAULT 'todo' CHECK (column_id IN ('todo','doing','done')),
  assigned_to TEXT REFERENCES kb_users(id),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  due_date TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kb_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES kb_users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('shopping','task','user','system')),
  entity_id TEXT,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kb_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  direction TEXT DEFAULT 'up' CHECK (direction IN ('up','down')),
  records_synced INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('success','error','skipped')),
  error_message TEXT,
  synced_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shopping_bought ON kb_shopping_items(bought);
CREATE INDEX IF NOT EXISTS idx_shopping_category ON kb_shopping_items(category);
CREATE INDEX IF NOT EXISTS idx_tasks_column ON kb_tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON kb_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activity_created ON kb_activity_log(created_at);
```

### Moduł `db/init.js`

```javascript
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.KB_DB_PATH || path.join(__dirname, '..', 'kiraboard.db');

function initDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  db.exec(`/* wszystkie CREATE TABLE IF NOT EXISTS powyżej */`);
  
  return db;
}

module.exports = { initDatabase, DB_PATH };
```

### Integracja z server.cjs

```javascript
const { initDatabase, DB_PATH } = require('./db/init');
const db = initDatabase();
console.log(`📦 KiraBoard DB initialized: ${DB_PATH}`);
```

### Rollback Plan
Usuń plik `kiraboard.db` — baza odtworzy się przy następnym starcie (dane utracone, tylko schema).

---

## ⚠️ Edge Cases

### EC-1: Brak uprawnień zapisu
Scenariusz: Katalog projektu jest read-only (np. system files)
Oczekiwane zachowanie: `better-sqlite3` rzuca błąd z czytelnym komunikatem o uprawnieniach; serwer nie startuje i loguje błąd
Komunikat: `❌ Cannot create database at [path]: EACCES permission denied`

### EC-2: Stara wersja bazy (brak kolumny)
Scenariusz: Plik `kiraboard.db` istnieje z poprzedniej wersji bez nowej kolumny
Oczekiwane zachowanie: `CREATE TABLE IF NOT EXISTS` nie zmienia istniejących tabel — nie ma auto-migration dla column changes (to osobna story w EPIC-12)

---

## 🚫 Out of Scope tej Story
- Dane seedowe (users) — to STORY-0.4 (users.json + auth)
- Tabele recurring_tasks i shopping_history — STORY-0.13
- Tabela kb_story_gates — STORY-0.15
- Supabase sync — STORY-0.5/0.6
- Column migrations (ALTER TABLE) — EPIC-12

---

## ✔️ Definition of Done
- [ ] `npm install better-sqlite3` dodane do `package.json`
- [ ] Plik `db/init.js` istnieje z funkcją `initDatabase()`
- [ ] 5 tabel tworzy się automatycznie przy starcie: `kb_users`, `kb_shopping_items`, `kb_tasks`, `kb_activity_log`, `kb_sync_log`
- [ ] WAL mode włączony (`PRAGMA journal_mode = WAL`)
- [ ] Foreign keys włączone (`PRAGMA foreign_keys = ON`)
- [ ] `node server.cjs` loguje `📦 KiraBoard DB initialized: [path]`
- [ ] Drugie uruchomienie serwera nie rzuca błędów (idempotentne)
- [ ] `KB_DB_PATH` konfigurowalne przez zmienną środowiskową
