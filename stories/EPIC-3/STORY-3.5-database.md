---
story_id: STORY-3.5
title: "Users + roles table — kb_users, PIN hash storage"
epic: EPIC-3
module: auth
domain: database
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.3]
blocks: [STORY-3.1]
tags: [database, sqlite, users, roles, migration, seed]
---

## 🎯 User Story

**Jako** system KiraBoard
**Chcę** przechowywać użytkowników i ich PIN hashe w tabeli SQLite `kb_users`
**Żeby** serwer mógł weryfikować logowania i zwracać odpowiednie role JWT bez dependency na zewnętrzne serwisy

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Baza danych: SQLite przez `better-sqlite3`
- Plik bazy: `data/kiraboard.db` (ścieżka ustalona w STORY-0.3)
- Migracja: `db/migrations/003_create_kb_users.sql` (lub skrypt JS)
- Seed: `db/seeds/003_seed_users.js` — tworzy 4 domyślnych użytkowników z PIN hashami
- Odczyt w `server.cjs`: `db.prepare('SELECT * FROM kb_users WHERE pin_hash = ?').get(hash)`

### Powiązane pliki
- `db/migrations/003_create_kb_users.sql` — nowy plik
- `db/seeds/003_seed_users.js` — nowy plik
- `server.cjs` — używa tabeli przy `POST /api/auth/login`
- `.env` — nie przechowuje PINów; PINy są w seed skrypcie (development) lub ustawiane przez admina

### Stan systemu przed tą story
- STORY-0.3 gotowa: SQLite jest skonfigurowany, `data/kiraboard.db` istnieje, `better-sqlite3` jest zainstalowany
- Projekt ma strukturę `db/migrations/` i `db/seeds/` (lub odpowiednik)

---

## ✅ Acceptance Criteria

### AC-1: Tabela kb_users jest tworzona przez migrację
GIVEN: Baza `data/kiraboard.db` istnieje (STORY-0.3 gotowa)
WHEN: Migracja `003_create_kb_users.sql` jest wykonana (lub skrypt migracji uruchomiony)
THEN: W bazie istnieje tabela `kb_users` z kolumnami: `id` (INTEGER PRIMARY KEY AUTOINCREMENT), `name` (TEXT NOT NULL UNIQUE), `pin_hash` (TEXT NOT NULL), `role` (TEXT NOT NULL), `avatar` (TEXT), `created_at` (TEXT DEFAULT CURRENT_TIMESTAMP)
AND: Migracja jest idempotentna (`CREATE TABLE IF NOT EXISTS`)

### AC-2: Dozwolone role są walidowane przez constraint
GIVEN: Tabela `kb_users` istnieje
WHEN: Próba wstawienia rekordu z `role = 'superuser'` (nieznana rola)
THEN: Baza rzuca błąd constraint violation (lub aplikacja waliduje przed insertem)
AND: Dozwolone wartości to: `'admin'`, `'home_plus'`, `'home'`

### AC-3: Seed script tworzy 4 domyślnych użytkowników
GIVEN: Migracja wykonana, baza pusta
WHEN: Seed script `003_seed_users.js` jest uruchomiony
THEN: W tabeli `kb_users` są 4 rekordy:
  - `{ name: "Mariusz", role: "admin", avatar: "🦊", pin_hash: SHA256("1234") }`
  - `{ name: "Angelika", role: "home_plus", avatar: "🌸", pin_hash: SHA256("2468") }`
  - `{ name: "Zuza", role: "home", avatar: "⭐", pin_hash: SHA256("1357") }`
  - `{ name: "Iza", role: "home", avatar: "🌙", pin_hash: SHA256("9876") }`
AND: Seed jest idempotentny (INSERT OR IGNORE lub sprawdzenie przed insertem)

### AC-4: Query po pin_hash działa poprawnie
GIVEN: Tabela z zaseedowanymi użytkownikami
WHEN: `db.prepare('SELECT id, name, role, avatar FROM kb_users WHERE pin_hash = ?').get(sha256("1234"))`
THEN: Zwraca `{ id: 1, name: "Mariusz", role: "admin", avatar: "🦊" }`
AND: Dla nieznanego hasha zwraca `undefined` (nie rzuca błędu)

### AC-5: PIN hash jest SHA-256 (nie jest przechowywany plaintext)
GIVEN: Rekord w tabeli `kb_users`
WHEN: Inspektujemy kolumnę `pin_hash` bezpośrednio w SQLite (np. przez `sqlite3` CLI)
THEN: Wartość to 64-znakowy hex string (SHA-256), np. `"03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"` (dla "1234")
AND: Kolumna `pin` (plaintext) NIE ISTNIEJE w tabeli

---

## 🗄️ Szczegóły Database

### Schema tabeli

```sql
-- db/migrations/003_create_kb_users.sql
CREATE TABLE IF NOT EXISTS kb_users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  pin_hash   TEXT    NOT NULL,
  role       TEXT    NOT NULL CHECK(role IN ('admin', 'home_plus', 'home')),
  avatar     TEXT    DEFAULT '👤',
  created_at TEXT    DEFAULT (datetime('now'))
);

-- Indeks na pin_hash (lookup po hash przy logowaniu)
CREATE INDEX IF NOT EXISTS idx_kb_users_pin_hash ON kb_users(pin_hash);
```

### Seed script

```javascript
// db/seeds/003_seed_users.js
const crypto = require('crypto');
const Database = require('better-sqlite3');

const db = new Database('./data/kiraboard.db');

function sha256(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

// Seed PIN-y dla development — w produkcji zmienić przez Settings
const SEED_USERS = [
  { name: 'Mariusz',  pin: '1234', role: 'admin',     avatar: '🦊' },
  { name: 'Angelika', pin: '2468', role: 'home_plus', avatar: '🌸' },
  { name: 'Zuza',     pin: '1357', role: 'home',      avatar: '⭐' },
  { name: 'Iza',      pin: '9876', role: 'home',      avatar: '🌙' },
];

const insert = db.prepare(`
  INSERT OR IGNORE INTO kb_users (name, pin_hash, role, avatar)
  VALUES (@name, @pin_hash, @role, @avatar)
`);

const runSeed = db.transaction(() => {
  for (const user of SEED_USERS) {
    insert.run({ name: user.name, pin_hash: sha256(user.pin), role: user.role, avatar: user.avatar });
  }
});

runSeed();
console.log('✅ Seed kb_users: 4 users inserted (or already exist)');
db.close();
```

### Zapytania używane w server.cjs

```javascript
// Lookup użytkownika po PIN hash (przy logowaniu)
const findByPin = db.prepare(
  'SELECT id, name, role, avatar FROM kb_users WHERE pin_hash = ?'
);

// Użycie:
const hash = crypto.createHash('sha256').update(pin).digest('hex');
const user = findByPin.get(hash); // undefined jeśli nie znaleziono
```

### Uwagi bezpieczeństwa
- SHA-256 bez soli jest wystarczający dla 4-cyfrowego PIN w środowisku domowym (zakres ataku offline jest mały, a system nie jest eksponowany publicznie)
- W EPIC-10 (Settings): zmiana PIN-u przez admina będzie generować nowy hash
- Nie przechowujemy plaintext PIN w żadnym pliku aplikacji (seed script jest tylko na development)

---

## ⚠️ Edge Cases

### EC-1: Duplikat nazwy użytkownika przy seedowaniu
Scenariusz: Seed jest uruchamiany ponownie (np. po restarcie w development)
Oczekiwane zachowanie: `INSERT OR IGNORE` pomija duplikaty bez błędu; liczba rekordów pozostaje 4
Komunikat dla użytkownika: (brak — log w konsoli serwera: "Seed kb_users: 4 users inserted (or already exist)")

### EC-2: Tabela kb_users nie istnieje gdy server.cjs uruchamia się
Scenariusz: Migracja nie była uruchomiona przed startem serwera
Oczekiwane zachowanie: `server.cjs` przy starcie wywołuje migrację inline (lub sprawdza istnienie tabeli i tworzy jeśli brak); serwer nie startuje z błędem SQLite "no such table"
Komunikat dla użytkownika: (brak — serwer obsługuje to automatycznie)

### EC-3: PIN hash kolizja (teoretyczna)
Scenariusz: Dwa różne PINy generują ten sam SHA-256 hash (kolizja SHA-256)
Oczekiwane zachowanie: SHA-256 jest collision-resistant — prawdopodobieństwo praktycznie zerowe dla 4-cyfrowych PINów (zakres 0000-9999); system loguje pierwszego znalezionego usera (LIMIT 1 domyślnie w SQLite `.get()`)

---

## 🚫 Out of Scope tej Story
- Tabela sesji / token blacklist — JWT jest stateless, nie potrzebujemy persystencji tokenów
- Tabela ról (`kb_roles`) — role są enum w CHECK constraint, nie osobna tabela (prostsze dla MVP)
- CRUD userów przez API — to EPIC-10 (Settings/Users tab)
- Reset PIN przez email/OTP — poza scope projektu
- Szyfrowanie bazy SQLite — out of scope (lokalne środowisko domowe)
- Audit log logowań — EPIC-10

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Tabela `kb_users` tworzona przez `CREATE TABLE IF NOT EXISTS` (idempotentna migracja)
- [ ] CHECK constraint na kolumnie `role` blokuje nieznane wartości
- [ ] INDEX na `pin_hash` istnieje
- [ ] Seed script wstawia 4 użytkowników z poprawnymi SHA-256 hashami
- [ ] Seed jest idempotentny (`INSERT OR IGNORE`)
- [ ] Query `SELECT WHERE pin_hash = ?` zwraca rekord dla poprawnego hasha
- [ ] Query zwraca undefined (nie rzuca błędu) dla nieznanego hasha
- [ ] `pin_hash` przechowuje SHA-256 hex (64 znaki), nie plaintext
- [ ] Story review przez PO
