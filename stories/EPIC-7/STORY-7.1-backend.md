---
story_id: STORY-7.1
title: "Eval API — Bridge eval golden-tasks + run-eval proxy"
epic: EPIC-7
module: eval
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-7.2, STORY-7.4]
tags: [api, proxy, bridge, eval, golden-tasks]
---

## 🎯 User Story

**Jako** admin Kiry
**Chcę** mieć API endpoints proxy do Bridge eval subcommand
**Żeby** móc wyświetlać listę golden tasks, triggerować eval i pobierać historię runów z dashboardu bez CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/api/eval/tasks` — GET lista golden tasks
- Route: `/api/eval/trigger` — POST trigger nowego eval runu
- Route: `/api/eval/runs` — GET historia eval runów
- Plik: `/app/api/eval/tasks/route.ts`, `/app/api/eval/trigger/route.ts`, `/app/api/eval/runs/route.ts`

### Powiązane pliki
- Bridge proxy pattern: `/app/api/bridge/[...path]/route.ts` (z STORY-0.2)
- Bridge CLI: `python -m bridge.cli eval golden-tasks | eval run | eval history`
- Auth middleware: zaimplementowane w STORY-3.3

### Stan systemu przed tą story
- STORY-0.2 gotowe: Bridge proxy (`/api/bridge/...`) i helper do uruchamiania poleceń Bridge działa
- Auth middleware jest skonfigurowane — tylko rola `admin` może wywoływać te endpointy
- Bridge CLI komenda `eval` istnieje z subcommandami: `golden-tasks`, `run`, `history`

---

## ✅ Acceptance Criteria

### AC-1: GET /api/eval/tasks — lista golden tasks
GIVEN: admin jest zalogowany z ważnym JWT i Bridge jest dostępny
WHEN: wysyła `GET /api/eval/tasks`
THEN: system wywołuje `bridge.cli eval golden-tasks --format json`, zwraca 200 z tablicą obiektów `GoldenTask[]` zawierającą pola: `task_id`, `title`, `model_target`, `expected_output`, `scoring_rubric`, `created_at`
AND: Content-Type to `application/json`

### AC-2: POST /api/eval/trigger — start eval runu
GIVEN: admin jest zalogowany z ważnym JWT
WHEN: wysyła `POST /api/eval/trigger` z body `{ "task_ids": ["task-1", "task-2"] }` (lub pustą tablicą = wszystkie)
THEN: system wywołuje `bridge.cli eval run --task-ids <ids> --format json`, zwraca 202 z `{ "run_id": "<uuid>", "status": "running", "started_at": "<ISO8601>" }`
AND: eval jest triggerowany asynchronicznie — endpoint wraca od razu bez czekania na koniec runu

### AC-3: GET /api/eval/runs — historia runów
GIVEN: admin jest zalogowany z ważnym JWT
WHEN: wysyła `GET /api/eval/runs?limit=20&offset=0`
THEN: system wywołuje `bridge.cli eval history --limit 20 --format json`, zwraca 200 z tablicą `EvalRun[]` zawierającą: `run_id`, `started_at`, `completed_at`, `model`, `task_count`, `pass_count`, `fail_count`, `duration_ms`
AND: domyślny limit to 20, maksymalny to 100

### AC-4: GET /api/eval/runs/:run_id — szczegóły runu
GIVEN: admin jest zalogowany z ważnym JWT i run o podanym ID istnieje
WHEN: wysyła `GET /api/eval/runs/<run_id>`
THEN: system zwraca 200 z obiektem zawierającym pole `results: EvalResult[]`, gdzie każdy result ma: `task_id`, `task_title`, `expected_output`, `actual_output`, `score` (0-100), `passed` (boolean), `ac_results: {ac_id, passed, note}[]`

### AC-5: Autoryzacja — tylko admin
GIVEN: użytkownik z rolą `home` lub bez tokena próbuje wywołać dowolny z powyższych endpointów
WHEN: wysyła żądanie
THEN: system zwraca 401 (brak tokena) lub 403 (nieprawidłowa rola), bez wykonania Bridge CLI

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. GET /api/eval/tasks**
```
Method: GET
Path: /api/eval/tasks
Auth: Bearer token (Supabase JWT)
Role: admin
Query: none
```

**2. POST /api/eval/trigger**
```
Method: POST
Path: /api/eval/trigger
Auth: Bearer token (Supabase JWT)
Role: admin
```

**3. GET /api/eval/runs**
```
Method: GET
Path: /api/eval/runs
Auth: Bearer token (Supabase JWT)
Role: admin
Query: limit (default: 20, max: 100), offset (default: 0)
```

**4. GET /api/eval/runs/:run_id**
```
Method: GET
Path: /api/eval/runs/[run_id]
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Request Schema

```typescript
// POST /api/eval/trigger
interface TriggerEvalRequest {
  task_ids?: string[]  // opcjonalne — puste = wszystkie golden tasks
}

// GET /api/eval/runs
interface EvalRunsQuery {
  limit?:  number  // default: 20, max: 100
  offset?: number  // default: 0
}
```

### Response Schema

```typescript
// GET /api/eval/tasks → 200
interface GoldenTask {
  task_id:         string
  title:           string
  model_target:    string
  expected_output: string  // markdown
  scoring_rubric:  string
  created_at:      string  // ISO 8601
}
type TasksResponse = GoldenTask[]

// POST /api/eval/trigger → 202
interface TriggerResponse {
  run_id:     string
  status:     "running"
  started_at: string  // ISO 8601
}

// GET /api/eval/runs → 200
interface EvalRun {
  run_id:       string
  started_at:   string
  completed_at: string | null
  model:        string
  task_count:   number
  pass_count:   number
  fail_count:   number
  duration_ms:  number | null
}
type RunsResponse = EvalRun[]

// GET /api/eval/runs/:run_id → 200
interface EvalResult {
  task_id:         string
  task_title:      string
  expected_output: string
  actual_output:   string
  score:           number  // 0-100
  passed:          boolean
  ac_results:      { ac_id: string; passed: boolean; note: string }[]
}
interface RunDetailResponse extends EvalRun {
  results: EvalResult[]
}

// Błędy
// 400 → nieprawidłowe query params (limit > 100 itp.)
// 401 → brak lub wygasły token
// 403 → rola nie ma uprawnień
// 404 → run o podanym ID nie istnieje
// 502 → Bridge CLI nie odpowiedział lub zwrócił błąd
// 500 → nieoczekiwany błąd serwera
```

### Logika biznesowa (krok po kroku)

```
GET /api/eval/tasks:
1. Sprawdź token JWT → brak? 401
2. Sprawdź rolę → nie admin? 403
3. Uruchom: bridge.cli eval golden-tasks --format json
4. Parse JSON output → błąd parsowania? log + 502
5. Zwróć 200 z tablicą GoldenTask[]

POST /api/eval/trigger:
1. Sprawdź token JWT → brak? 401
2. Sprawdź rolę → nie admin? 403
3. Parsuj body → task_ids (opcjonalne)
4. Uruchom: bridge.cli eval run [--task-ids id1,id2] --format json --async
5. Parse JSON → wyciągnij run_id i started_at
6. Zwróć 202 z TriggerResponse (NIE czekaj na koniec eval)

GET /api/eval/runs:
1. Sprawdź token JWT → brak? 401
2. Sprawdź rolę → nie admin? 403
3. Parsuj i waliduj query params (limit ≤ 100) → błąd? 400
4. Uruchom: bridge.cli eval history --limit <limit> --offset <offset> --format json
5. Parse JSON → błąd? 502
6. Zwróć 200 z EvalRun[]

GET /api/eval/runs/:run_id:
1. Sprawdź token JWT → brak? 401
2. Sprawdź rolę → nie admin? 403
3. Uruchom: bridge.cli eval history --run-id <run_id> --detail --format json
4. Parse JSON → brak wyników? 404; błąd parsowania? 502
5. Zwróć 200 z RunDetailResponse
```

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI niedostępny lub timeout
Scenariusz: Bridge process nie odpowiada (np. dead lock, restarting)
Oczekiwane zachowanie: endpoint zwraca 502 z `{ "error": "Bridge unavailable", "detail": "<stderr>" }` po 10s timeout; NIE crashuje Next.js server

### EC-2: Bridge zwraca pustą listę golden tasks
Scenariusz: `bridge.cli eval golden-tasks` zwraca `[]`
Oczekiwane zachowanie: endpoint zwraca 200 z pustą tablicą `[]` — nie 404

### EC-3: eval trigger gdy inny run jest aktywny
Scenariusz: POST /api/eval/trigger gdy Bridge już ma eval w toku
Oczekiwane zachowanie: Bridge CLI powinien obsłużyć — jeśli zwróci błąd "eval already running", endpoint zwraca 409 z `{ "error": "Eval already in progress", "run_id": "<aktywny_run_id>" }`

### EC-4: task_ids zawierają nieistniejące ID
Scenariusz: POST z `task_ids: ["fake-id-999"]`
Oczekiwane zachowanie: Bridge CLI filtruje/ignoruje nieznane IDs i uruchamia eval dla tych które istnieją; jeśli Bridge zwróci błąd walidacji → 422 z komunikatem

---

## 🚫 Out of Scope tej Story
- Golden tasks CRUD (add/edit/delete) — to osobna story (wg. EPIC-7.md STORY-7.1 oryginalne)
- Streaming SSE statusu eval runu — polling wystarczy dla MVP
- Konfiguracja metryk eval (exact match, BLEU) — konfiguracja przez bridge.yml
- Frontend — to STORY-7.2 i STORY-7.3

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na pustej bazie / pustej liście golden tasks
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z rolą `home` zwraca 403
- [ ] Bridge timeout (>10s) zwraca 502 bez crasha serwera
- [ ] Story review przez PO
