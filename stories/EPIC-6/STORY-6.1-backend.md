---
story_id: STORY-6.1
title: "Pipeline API — Bridge status/advance/start proxy endpoints"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-6.2, STORY-6.8]
tags: [api, bridge-proxy, pipeline, stories, advance, start]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć endpointy API proxy do Bridge'a dla operacji pipeline
**Żeby** Pipeline page mogła wyświetlać stories z statusami, startować i zaawansowywać stories bez bezpośredniego dostępu do Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/api/pipeline/stories` (GET)
- Route: `/api/pipeline/stories/:id/advance` (POST)
- Route: `/api/pipeline/stories/:id/start` (POST)
- Plik: `server/api.cjs` — nowe handlery w Express

### Powiązane pliki
- `server/api.cjs` — główny plik Express serwera
- `server/bridge-runner.js` — wrapper na Bridge CLI (z STORY-0.2)
- Bridge CLI: `python -m bridge.cli status --json`, `bridge.cli start-story`, `bridge.cli advance`

### Stan systemu przed tą story
- STORY-0.2 gotowe: Bridge CLI proxy wrapper (`bridge-runner.js`) działa, `/api/bridge/*` endpointy zarejestrowane
- Bridge CLI dostępny i autoryzowany (`cd ~/codermariusz/kira && source .venv/bin/activate`)
- Express serwer uruchomiony na porcie 3001

---

## ✅ Acceptance Criteria

### AC-1: GET stories z filtrem projektu
GIVEN: Bridge ma zarejestrowane stories dla projektu `kira-dashboard`
WHEN: klient wywołuje `GET /api/pipeline/stories?project=kira-dashboard`
THEN: serwer zwraca 200 z tablicą stories zawierającą pola: `story_id`, `title`, `domain`, `status`, `model`, `epic_id`
AND: odpowiedź zawiera tylko stories należące do podanego projektu

### AC-2: GET stories z filtrem statusu
GIVEN: Bridge ma stories w różnych statusach (BACKLOG, IN_PROGRESS, REVIEW, DONE)
WHEN: klient wywołuje `GET /api/pipeline/stories?project=kira-dashboard&status=IN_PROGRESS`
THEN: serwer zwraca 200 z tablicą zawierającą wyłącznie stories o statusie `IN_PROGRESS`

### AC-3: POST advance story
GIVEN: story `STORY-6.2` ma status `IN_PROGRESS`
WHEN: klient wysyła `POST /api/pipeline/stories/STORY-6.2/advance` z body `{ "status": "REVIEW" }`
THEN: serwer wywołuje `bridge.cli advance STORY-6.2 REVIEW`, zwraca 200 z `{ "success": true, "story_id": "STORY-6.2", "new_status": "REVIEW" }`

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. GET /api/pipeline/stories**
```
Method: GET
Path: /api/pipeline/stories
Auth: Bearer token (Supabase JWT)
Role: admin
```

**2. POST /api/pipeline/stories/:id/advance**
```
Method: POST
Path: /api/pipeline/stories/:id/advance
Auth: Bearer token (Supabase JWT)
Role: admin
```

**3. POST /api/pipeline/stories/:id/start**
```
Method: POST
Path: /api/pipeline/stories/:id/start
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Request Schema

```typescript
// GET /api/pipeline/stories — Query params
interface StoriesQueryParams {
  project?: string  // klucz projektu Bridge, np. "kira-dashboard"
  status?: string   // BACKLOG | IN_PROGRESS | REVIEW | DONE
  epic?: string     // np. "EPIC-6", filtruje per epic
}

// POST .../advance — Body
interface AdvanceBody {
  status: string  // docelowy status: REVIEW | DONE | BACKLOG
}
```

### Response Schema

```typescript
// GET /api/pipeline/stories — 200 OK
interface StoriesResponse {
  data: Array<{
    story_id: string    // np. "STORY-6.1"
    title: string
    domain: string      // backend | frontend | wiring | database
    status: string      // BACKLOG | IN_PROGRESS | REVIEW | DONE
    model: string       // kimi-k2.5 | sonnet-4.6 | codex-5.3
    epic_id: string     // np. "EPIC-6"
    difficulty: string
    depends_on: string[]
  }>
  meta: {
    total: number
    project: string
  }
}

// POST .../advance — 200 OK
interface AdvanceResponse {
  success: boolean
  story_id: string
  new_status: string
}

// POST .../start — 200 OK
interface StartResponse {
  success: boolean
  story_id: string
  status: string  // "IN_PROGRESS"
}
```

### Logika biznesowa

```
GET /api/pipeline/stories:
1. Parsuj query params: project, status, epic
2. Sprawdź JWT → brak? zwróć 401
3. Sprawdź rolę → nie admin? zwróć 403
4. Wywołaj: bridge-runner.run("status", ["--json"])
5. Parsuj JSON output z Bridge CLI
6. Filtruj stories po project (jeśli podano), status (jeśli podano), epic (jeśli podano)
7. Zwróć 200 z przefiltrowaną tablicą + meta

POST /api/pipeline/stories/:id/advance:
1. Parsuj body: { status }
2. Waliduj status ∈ [REVIEW, DONE, BACKLOG] → błąd? zwróć 400
3. Sprawdź JWT → brak? zwróć 401
4. Sprawdź rolę → nie admin? zwróć 403
5. Wywołaj: bridge-runner.run("advance", [story_id, status])
6. Bridge error? zwróć 422 z komunikatem z Bridge
7. Zwróć 200 z { success: true, story_id, new_status: status }

POST /api/pipeline/stories/:id/start:
1. Sprawdź JWT → brak? zwróć 401
2. Sprawdź rolę → nie admin? zwróć 403
3. Wywołaj: bridge-runner.run("start-story", [story_id])
4. Bridge error? zwróć 422 z komunikatem z Bridge
5. Zwróć 200 z { success: true, story_id, status: "IN_PROGRESS" }
```

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI niedostępny / crash
Scenariusz: Bridge CLI nie startuje (brak venv, błąd importu)
Oczekiwane zachowanie: endpoint zwraca 503 z `{ "error": "Bridge CLI niedostępny", "detail": "<stderr>" }`
Komunikat dla użytkownika: "Bridge CLI niedostępny — sprawdź logi serwera"

### EC-2: Nieistniejące story_id
Scenariusz: klient wysyła `/advance` dla story_id który nie istnieje w Bridge
Oczekiwane zachowanie: Bridge zwraca błąd → serwer zwraca 404 z `{ "error": "Story nie znaleziona: STORY-99.99" }`

### EC-3: Brak projektu w query
Scenariusz: GET bez parametru `project=`
Oczekiwane zachowanie: serwer zwraca wszystkie stories ze wszystkich projektów (brak filtrowania po projekcie)

---

## 🚫 Out of Scope tej Story
- Bulk actions (osobna story — STORY-6.4)
- Gate data join (gates to osobne endpointy — STORY-6.4)
- PRD Wizard endpointy (STORY-6.6)
- Assign model endpoint

---

## ✔️ Definition of Done
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem
- [ ] Endpoint nie crashuje na pustej bazie / pustym Bridge output
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] Manualne testy curl dla GET, POST advance, POST start — wszystkie przechodzą
- [ ] Story review przez PO
