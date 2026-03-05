---
story_id: STORY-6.6
title: "PRD Wizard API — upload PRD, Claude parse → epic draft"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: complex
recommended_model: codex-5.3
priority: must
estimated_effort: 10h
depends_on: [STORY-0.2]
blocks: [STORY-6.7]
tags: [api, prd-wizard, anthropic, claude, epic-draft, bridge-cli, ai-integration]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** wgrać PRD (markdown) przez API, a serwer przetworzy go przez Claude i wygeneruje draft epiców
**Żeby** tworzyć nowe projekty i epics przez UI KiraBoard bez ręcznego pisania przez Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `POST /api/pipeline/prd-questions` — Anthropic API → 5 pytań clarifying
- Route: `POST /api/pipeline/create-from-prd` — Anthropic API → epics draft → Bridge CLI
- Plik: `server/api.cjs` — nowe handlery + Anthropic SDK integration
- Plik: `server/anthropic-client.js` — wrapper na `@anthropic-ai/sdk`

### Powiązane pliki
- `server/api.cjs` — Express serwer
- `server/bridge-runner.js` — Bridge CLI wrapper (z STORY-0.2)
- `@anthropic-ai/sdk` — Anthropic Node SDK (musi być zainstalowany: `npm install @anthropic-ai/sdk`)
- `ANTHROPIC_API_KEY` — env var (z `.env` lub system env)
- Referencja: PRD sekcja EPIC-6 — PRD Wizard 3-step modal

### Stan systemu przed tą story
- STORY-0.2 gotowe: Bridge CLI wrapper (`bridge-runner.js`) działa dla `plan-epic` i `plan-story`
- Express serwer działa, auth middleware aktywny
- `@anthropic-ai/sdk` zainstalowany
- `ANTHROPIC_API_KEY` ustawiony w środowisku

---

## ✅ Acceptance Criteria

### AC-1: POST prd-questions — generowanie pytań clarifying
GIVEN: klient wysyła `POST /api/pipeline/prd-questions` z body zawierającym tekst PRD (~2000 znaków)
WHEN: serwer przetwarza request
THEN: serwer wywołuje Anthropic API (claude-haiku-4) z PRD jako context i promptem generującym pytania
AND: zwraca 200 z tablicą 5 pytań clarifying w języku polskim
AND: czas odpowiedzi < 30 sekund

### AC-2: Cachowanie pytań
GIVEN: klient wysyła identyczny PRD text dwa razy w ciągu 5 minut
WHEN: drugi request trafia na serwer
THEN: serwer zwraca cached odpowiedź (bez nowego API call do Anthropic)
AND: response header zawiera `X-Cache: HIT`

### AC-3: POST create-from-prd — generowanie i rejestracja epiców
GIVEN: klient wysyła `POST /api/pipeline/create-from-prd` z body zawierającym PRD text, odpowiedzi na pytania i project_key
WHEN: serwer przetwarza request
THEN: serwer wywołuje Anthropic API (claude-sonnet) z PRD + answers → generuje tablicę epics draft
AND: dla każdego epica wywołuje `bridge-runner.run("plan-epic", [...args])`
AND: zwraca 200 z listą stworzonych epiców i ich story counts

### AC-4: Obsługa błędu Anthropic API
GIVEN: ANTHROPIC_API_KEY jest nieprawidłowy lub Anthropic API niedostępne
WHEN: klient wysyła POST prd-questions
THEN: serwer zwraca 503 z `{ "error": "AI service niedostępny — spróbuj ponownie za chwilę" }`
AND: błąd jest logowany do konsoli serwera z pełnym komunikatem z Anthropic

### AC-5: Walidacja PRD input
GIVEN: klient wysyła POST prd-questions z pustym body lub body < 100 znaków
WHEN: serwer waliduje input
THEN: serwer zwraca 400 z `{ "error": "PRD jest za krótki — minimum 100 znaków" }`
AND: Anthropic API nie jest wywoływane

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. POST /api/pipeline/prd-questions**
```
Method: POST
Path: /api/pipeline/prd-questions
Auth: Bearer token (Supabase JWT)
Role: admin
```

**2. POST /api/pipeline/create-from-prd**
```
Method: POST
Path: /api/pipeline/create-from-prd
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Request Schema

```typescript
// POST /api/pipeline/prd-questions
interface PRDQuestionsBody {
  prd_text: string  // tekst PRD, min 100 znaków, max 50000 znaków
}

// POST /api/pipeline/create-from-prd
interface CreateFromPRDBody {
  prd_text:    string              // pełny tekst PRD
  answers:     Record<string, string>  // { "q1": "odpowiedź", "q2": "..." }
  project_key: string              // np. "nowy-projekt", slug
  project_name: string             // pełna nazwa projektu
}
```

### Response Schema

```typescript
// POST /api/pipeline/prd-questions — 200 OK
interface PRDQuestionsResponse {
  questions: Array<{
    id:       string  // "q1" ... "q5"
    question: string  // treść pytania po polsku
  }>
  cache_key: string   // hash PRD do re-użycia w create-from-prd
}

// POST /api/pipeline/create-from-prd — 200 OK
interface CreateFromPRDResponse {
  project_key: string
  epics: Array<{
    epic_id:    string  // np. "EPIC-1"
    title:      string
    story_count: number
    stories:    Array<{ story_id: string, title: string, domain: string }>
  }>
  bridge_results: Array<{
    epic_id: string
    success: boolean
    error?:  string
  }>
}
```

### Logika biznesowa

```
POST /api/pipeline/prd-questions:
1. Parsuj body: prd_text
2. Waliduj: prd_text.length >= 100, <= 50000 → błąd? 400
3. Sprawdź JWT → brak? 401; zła rola? 403
4. Oblicz cache_key = SHA256(prd_text)
5. Sprawdź in-memory cache (Map): cache_key istnieje i nie wygasł (<5min)? zwróć cached + X-Cache: HIT
6. Wywołaj Anthropic API:
   - Model: claude-haiku-4-5 (tani, szybki)
   - System prompt: "Jesteś analitykiem produktowym. Na podstawie PRD wygeneruj 5 pytań clarifying..."
   - User: prd_text
   - Max tokens: 500
7. Parsuj odpowiedź → tablica 5 pytań
8. Zapisz do cache z TTL 5 minut
9. Zwróć 200 z questions + cache_key

POST /api/pipeline/create-from-prd:
1. Parsuj body: prd_text, answers, project_key, project_name
2. Waliduj: project_key alfanumeryczny+myślnik, min 3 znaki → 400 jeśli błąd
3. Sprawdź JWT → brak? 401; zła rola? 403
4. Wywołaj Anthropic API:
   - Model: claude-sonnet-4-5
   - Prompt: PRD + answers → "Wygeneruj listę epiców w formacie JSON: [{epic_id, title, description, stories:[{story_id, title, domain, difficulty}]}]"
   - Max tokens: 4000
5. Parsuj JSON z odpowiedzi Anthropic (safety: JSON.parse w try/catch)
6. Dla każdego epica: bridge-runner.run("plan-epic", ["--epic-id", epic.epic_id, "--title", epic.title, "--project", project_key])
7. Zbierz wyniki (sukces/błąd per epic)
8. Zwróć 200 z summary
```

---

## ⚠️ Edge Cases

### EC-1: Anthropic zwraca nieprawidłowy JSON
Scenariusz: Claude generuje epics ale w formacie nieczytelnym dla JSON.parse
Oczekiwane zachowanie: serwer loguje oryginalną odpowiedź, zwraca 422 z `{ "error": "AI wygenerowało nieczytelny format — spróbuj ponownie", "raw": "[pierwsze 500 znaków odpowiedzi]" }`

### EC-2: Bridge plan-epic częściowo fails
Scenariusz: create-from-prd generuje 5 epiców, 3 rejestrowane poprawnie, 2 failują (duplikat ID)
Oczekiwane zachowanie: serwer zwraca 207 Multi-Status z listą epiców i statusem (success/error) per epic, nie rollbackuje sukcesów

### EC-3: PRD zbyt długi (>50000 znaków)
Scenariusz: Mariusz wkleja cały PRD + kody i notatki — łącznie 80000 znaków
Oczekiwane zachowanie: 400 z `{ "error": "PRD jest za długi — maksimum 50000 znaków (wklejono: 80000)" }`

### EC-4: Rate limit Anthropic
Scenariusz: w ciągu minuty wysłano 20 requestów — Anthropic zwraca 429
Oczekiwane zachowanie: serwer zwraca 429 do klienta z `{ "error": "Przekroczony limit AI — poczekaj 60 sekund" }` i `Retry-After: 60`

---

## 🚫 Out of Scope tej Story
- UI PRD Wizard (STORY-6.7)
- Streaming SSE odpowiedzi Anthropic (przyszłość)
- PRD history / zapisywanie wersji
- Automatyczne tworzenie stories z epiców (user robi to ręcznie po review)

---

## ✔️ Definition of Done
- [ ] prd-questions zwraca 5 pytań po polsku dla przykładowego PRD
- [ ] Cachowanie działa (drugi identyczny request zwraca X-Cache: HIT)
- [ ] create-from-prd tworzy epics w Bridge (weryfikacja przez `bridge.cli status`)
- [ ] Błędy Anthropic API obsłużone (503, 422, 429)
- [ ] Walidacja PRD length (min 100, max 50000)
- [ ] ANTHROPIC_API_KEY nie pojawia się w logach ani response body
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] Story review przez PO
