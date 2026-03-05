---
story_id: STORY-6.4
title: "Gate System API — GET /api/gates/status, POST /api/gates/override"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.15, STORY-0.16]
blocks: [STORY-6.5]
tags: [api, gates, compliance, override, sqlite, kb_story_gates]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć API do odczytu statusów gate'ów per story i nadpisywania gate'ów z komentarzem
**Żeby** Pipeline page mogła wizualizować 5 kolorowych gate squares i pozwolić Mariuszowi overridować gate w uzasadnionych przypadkach

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `GET /api/gates/status` — status gate'ów dla projektu lub story
- Route: `POST /api/gates/override` — nadpisanie statusu gate'a z komentarzem
- Plik: `server/api.cjs` — nowe handlery
- Tabela SQLite: `kb_story_gates` (z STORY-0.15): `story_id`, `project_key`, `gate_name`, `status`, `started_at`, `finished_at`, `details`

### Powiązane pliki
- `server/db.js` — konekcja better-sqlite3
- Tabela `kb_story_gates` z STORY-0.15
- `gate_config.json` z STORY-0.16 — per project config (które gaty required/optional)

### Stan systemu przed tą story
- STORY-0.15 gotowe: tabela `kb_story_gates` istnieje w SQLite
- STORY-0.16 gotowe: `gate_config.json` sczytywany przez serwer, endpoint `GET /api/gates/config` dostępny
- Express serwer uruchomiony, auth middleware aktywny

---

## ✅ Acceptance Criteria

### AC-1: GET gate status dla projektu
GIVEN: tabela `kb_story_gates` ma wpisy dla projektu `kira-dashboard` z 10 stories
WHEN: klient wywołuje `GET /api/gates/status?project=kira-dashboard`
THEN: serwer zwraca 200 z obiektem mapującym story_id → tablica 5 gate obiektów
AND: każdy gate obiekt zawiera: `gate_name`, `status` (pending/active/pass/fail/skip), `started_at`, `finished_at`

### AC-2: GET gate status dla pojedynczej story
GIVEN: story `STORY-6.2` ma 5 wpisów w `kb_story_gates`
WHEN: klient wywołuje `GET /api/gates/status?story=STORY-6.2&project=kira-dashboard`
THEN: serwer zwraca 200 z tablicą 5 gate obiektów dla tej story w kolejności: IMPLEMENT → LINT → TEST → REVIEW → MERGE

### AC-3: POST override gate
GIVEN: gate `LINT` dla `STORY-6.1` ma status `fail`
WHEN: klient wysyła `POST /api/gates/override` z body `{ "story_id": "STORY-6.1", "project_key": "kira-dashboard", "gate_name": "LINT", "status": "skip", "comment": "Lint pominięty — hotfix" }`
THEN: serwer aktualizuje rekord w `kb_story_gates` ze statusem `skip` i zapisuje `details` z komentarzem + timestamp
AND: zwraca 200 z zaktualizowanym gate obiektem

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. GET /api/gates/status**
```
Method: GET
Path: /api/gates/status
Auth: Bearer token (Supabase JWT)
Role: admin
```

**2. POST /api/gates/override**
```
Method: POST
Path: /api/gates/override
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Request Schema

```typescript
// GET /api/gates/status — Query params
interface GatesStatusQueryParams {
  project: string  // wymagany: klucz projektu, np. "kira-dashboard"
  story?: string   // opcjonalny: filtr po jednej story
}

// POST /api/gates/override — Body
interface GateOverrideBody {
  story_id:    string  // np. "STORY-6.1"
  project_key: string  // np. "kira-dashboard"
  gate_name:   string  // IMPLEMENT | LINT | TEST | REVIEW | MERGE
  status:      string  // skip | pass | fail
  comment:     string  // wymagany komentarz, min 5 znaków
}
```

### Response Schema

```typescript
// GET /api/gates/status (dla projektu) — 200 OK
interface GatesProjectResponse {
  data: {
    [story_id: string]: GateStatus[]
  }
  meta: {
    project: string
    total_stories: number
    compliance_percent: number  // (stories z all gates pass) / total * 100
    skipped_count: number       // stories z co najmniej jednym skip
  }
}

// GET /api/gates/status (dla story) — 200 OK
interface GatesStoryResponse {
  data: GateStatus[]
  story_id: string
}

interface GateStatus {
  gate_name:   string   // IMPLEMENT | LINT | TEST | REVIEW | MERGE
  status:      string   // pending | active | pass | fail | skip
  started_at:  string | null  // ISO 8601
  finished_at: string | null  // ISO 8601
  details:     object | null  // JSON z detalami (komentarz override, błędy linta etc.)
}

// POST /api/gates/override — 200 OK
interface OverrideResponse {
  success: boolean
  gate: GateStatus
}
```

### Logika biznesowa

```
GET /api/gates/status:
1. Parsuj query: project (wymagany), story (opcjonalny)
2. Brak project? zwróć 400 "Parametr project jest wymagany"
3. Sprawdź JWT → brak? 401; zła rola? 403
4. Zapytaj SQLite:
   - Jeśli story podane: SELECT * FROM kb_story_gates WHERE project_key=? AND story_id=? ORDER BY gate order
   - Jeśli tylko project: SELECT * FROM kb_story_gates WHERE project_key=? GROUP BY story_id
5. Dla wyników projektu: oblicz compliance_percent = (stories z all 5 gates = pass) / total stories * 100
6. Zwróć 200 z response schema

POST /api/gates/override:
1. Waliduj body: wszystkie pola wymagane, gate_name ∈ [IMPLEMENT, LINT, TEST, REVIEW, MERGE]
2. Waliduj status ∈ [skip, pass, fail]
3. Waliduj comment.length >= 5
4. Sprawdź JWT → brak? 401; zła rola? 403
5. UPDATE kb_story_gates SET status=?, details=JSON_with_comment WHERE story_id=? AND project_key=? AND gate_name=?
6. Brak rekordu (0 rows affected)? zwróć 404
7. Zwróć 200 z zaktualizowanym gate obiektem
```

### Zapytania do bazy

```
-- Gate order mapping (hardcoded w server)
const GATE_ORDER = ['IMPLEMENT', 'LINT', 'TEST', 'REVIEW', 'MERGE']

-- Compliance count:
SELECT story_id, COUNT(*) as pass_count
FROM kb_story_gates
WHERE project_key = ? AND status = 'pass'
GROUP BY story_id
HAVING pass_count = 5
-- stories_with_all_pass.length / total_stories * 100
```

---

## ⚠️ Edge Cases

### EC-1: Story bez żadnych gate wpisów
Scenariusz: nowa story zarejestrowana w Bridge ale jeszcze nie ma wpisów w `kb_story_gates`
Oczekiwane zachowanie: dla tej story zwracana jest tablica 5 gate obiektów ze statusem `pending` i `null` timestamps (generowane on-the-fly z GATE_ORDER)

### EC-2: Override dla nieistniejącej story/gate combo
Scenariusz: POST override dla story_id który nie istnieje w kb_story_gates
Oczekiwane zachowanie: serwer zwraca 404 z `{ "error": "Gate nie znaleziony dla story STORY-99.1, gate LINT" }`

### EC-3: Zbyt krótki komentarz override
Scenariusz: POST override z `comment: "ok"`
Oczekiwane zachowanie: serwer zwraca 400 z `{ "error": "Komentarz musi mieć min 5 znaków" }`

---

## 🚫 Out of Scope tej Story
- SSE emit przy gate change (EPIC-2)
- Gate config edycja z UI (STORY-0.16)
- Bulk gate override
- Historia zmian gate (audit log)

---

## ✔️ Definition of Done
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Compliance percent obliczany poprawnie (testy z różnymi danymi)
- [ ] Stories bez gate wpisów zwracają 5× `pending` (nie pusty array)
- [ ] Override zapisuje komentarz w polu `details` jako JSON
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] Story review przez PO
