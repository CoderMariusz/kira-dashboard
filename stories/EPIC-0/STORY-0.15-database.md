---
story_id: STORY-0.15
title: "Gate system foundation — kb_story_gates + gate_config.json"
epic: EPIC-0
module: infrastructure
domain: database
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.3]
blocks: [STORY-0.16]
tags: [gates, pipeline, database, quality-gates, bridge]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć tabelę `kb_story_gates` i plik `gate_config.json` z 5 gate'ami jakości
**Żeby** każda story w pipeline miała trackowany postęp przez bramy: IMPLEMENT → LINT → TEST → REVIEW → MERGE

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Modyfikacja: `db/init.js` — dodanie tabeli `kb_story_gates`
- Nowy plik: `gate_config.json` — definicja 5 gate'ów
- Powiązanie: Bridge API stories → `kb_story_gates` records (inicjowane przez STORY-0.16)

### Stan systemu przed tą story
- STORY-0.3 ukończona — `db/init.js` istnieje z 5 tabelami
- `better-sqlite3` zainstalowane

---

## ✅ Acceptance Criteria

### AC-1: Tabela kb_story_gates istnieje po starcie
GIVEN: `db/init.js` zaktualizowany
WHEN: Uruchomisz serwer lub `node -e "require('./db/init').initDatabase()"`
THEN: `SELECT name FROM sqlite_master WHERE type='table' AND name='kb_story_gates'` zwraca 1 rekord

### AC-2: UNIQUE constraint na (story_id, project_key, gate_name)
GIVEN: Tabela istnieje z rekordem `(story_id='S1', project_key='kira-board', gate_name='lint', status='pending')`
WHEN: Próbujesz INSERT tego samego (story_id, project_key, gate_name)
THEN: SQLite zwraca błąd UNIQUE constraint — użyj `INSERT OR IGNORE` lub `INSERT OR REPLACE`

### AC-3: gate_config.json zawiera 5 gate'ów
GIVEN: `gate_config.json` istnieje w root projektu
WHEN: Wykonasz `node -e "const c=require('./gate_config.json'); console.log(c.gates.length)"`
THEN: Wyświetla `5`

### AC-4: Status CHECK constraint
GIVEN: Tabela istnieje
WHEN: INSERT z `status='invalid'`
THEN: SQLite rzuca `CHECK constraint failed: kb_story_gates`

---

## 🗄️ Szczegóły Database

### Tabela — dodaj do `db/init.js`:

```javascript
db.exec(`
  CREATE TABLE IF NOT EXISTS kb_story_gates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_id TEXT NOT NULL,
    project_key TEXT NOT NULL,
    gate_name TEXT NOT NULL CHECK (gate_name IN ('implement','lint','test','review','merge')),
    status TEXT NOT NULL DEFAULT 'pending' 
      CHECK (status IN ('pending','active','pass','fail','skip')),
    started_at TEXT,
    finished_at TEXT,
    details TEXT,  -- JSON: { error_message, reviewer_model, test_count, etc. }
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(story_id, project_key, gate_name)
  );

  CREATE INDEX IF NOT EXISTS idx_gates_story ON kb_story_gates(story_id, project_key);
  CREATE INDEX IF NOT EXISTS idx_gates_status ON kb_story_gates(status);
  CREATE INDEX IF NOT EXISTS idx_gates_project ON kb_story_gates(project_key);
`);
```

### `gate_config.json` — nowy plik w root projektu:

```json
{
  "gates": [
    { 
      "name": "implement", 
      "label": "IMPLEMENT", 
      "order": 1, 
      "required": true,
      "description": "Story branch created, code written and committed" 
    },
    { 
      "name": "lint", 
      "label": "LINT", 
      "order": 2, 
      "required": false,
      "description": "ESLint + TypeCheck pass (skippable for config changes)" 
    },
    { 
      "name": "test", 
      "label": "TEST", 
      "order": 3, 
      "required": true,
      "description": "Vitest unit tests + Playwright e2e pass" 
    },
    { 
      "name": "review", 
      "label": "REVIEW", 
      "order": 4, 
      "required": true,
      "description": "Cross-model code review approved (Sonnet reviews Codex/Kimi output)" 
    },
    { 
      "name": "merge", 
      "label": "MERGE", 
      "order": 5, 
      "required": true,
      "description": "Branch merged to main via PR or direct merge" 
    }
  ],
  "enforcement": "report",
  "skip_allowed_for": ["lint"],
  "version": "1.0"
}
```

### Helper function — dodaj do `db/init.js` lub `server.cjs`:

```javascript
function initGatesForStory(db, storyId, projectKey) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'gate_config.json'), 'utf8'));
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO kb_story_gates (story_id, project_key, gate_name, status) VALUES (?, ?, ?, ?)'
  );
  config.gates.forEach(g => stmt.run(storyId, projectKey, g.name, 'pending'));
  console.log(`🔲 Gates initialized for ${storyId} (${projectKey}): 5 gates pending`);
}

module.exports = { initDatabase, DB_PATH, initGatesForStory };
```

### Rollback Plan
```sql
DROP TABLE IF EXISTS kb_story_gates;
```
Usuń `gate_config.json` z projektu.

---

## ⚠️ Edge Cases

### EC-1: `gate_config.json` zmieniona po inicjalizacji bazy
Scenariusz: Dodano nowy gate typ — CHECK constraint nie pasuje do nowych wartości
Oczekiwane zachowanie: EPIC-0 nie obsługuje migracji schema — gate_name CHECK constraint jest hardcoded. Zmiana wymaga `ALTER TABLE` (EPIC-12).

### EC-2: `gate_config.json` nie istnieje
Scenariusz: Plik skasowany przez przypadek
Oczekiwane zachowanie: `initGatesForStory()` rzuca błąd `ENOENT` — serwer działa, tylko gate initialization nie jest możliwa. Endpoint `/api/gates/*` powinien gracefully zwrócić 503 z `{ error: "gate_config.json not found" }`

---

## 🚫 Out of Scope tej Story
- Endpointy API do zarządzania gates (STORY-0.16)
- Auto-inicjalizacja gates przy rejestracji story przez Bridge (STORY-0.16)
- Supabase sync dla gates (EPIC-12)
- UI dla gate tracking (EPIC-5)

---

## ✔️ Definition of Done
- [ ] `db/init.js` zawiera `CREATE TABLE IF NOT EXISTS kb_story_gates`
- [ ] Tabela ma: `story_id`, `project_key`, `gate_name` (CHECK), `status` (CHECK), `started_at`, `finished_at`, `details`
- [ ] UNIQUE(story_id, project_key, gate_name) constraint
- [ ] 3 indeksy: `idx_gates_story`, `idx_gates_status`, `idx_gates_project`
- [ ] `gate_config.json` z 5 gate'ami: implement, lint, test, review, merge
- [ ] `initGatesForStory()` helper dostępny z `db/init.js`
- [ ] Serwer startuje bez błędów po aktualizacji
