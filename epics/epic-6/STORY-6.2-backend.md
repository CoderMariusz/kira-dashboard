---
story_id: STORY-6.2
title: "POST /api/pipeline/create-from-prd — AI generuje epiki i rejestruje projekt w Bridge"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: complex
recommended_model: codex-5.3
priority: must
estimated_effort: 8h
depends_on: [STORY-6.1]
blocks: [STORY-6.5, STORY-6.6]
tags: [api, anthropic, sonnet, bridge-cli, prd, ai, project-registration, next.js, typescript]
---

## 🎯 User Story

**Jako** aplikacja frontendowa kira-dashboard
**Chcę** endpoint `POST /api/pipeline/create-from-prd` który na podstawie PRD + odpowiedzi generuje strukturę epików przez Claude Sonnet i rejestruje projekt w Bridge CLI
**Żeby** użytkownik mógł zarejestrować nowy projekt jednym kliknięciem bez opuszczania dashboardu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
app/api/pipeline/create-from-prd/route.ts  → eksportuj POST
```

Stack:
- Next.js 16 App Router, `export const runtime = 'nodejs'`
- Anthropic SDK (`@anthropic-ai/sdk`) — Claude Sonnet do generowania struktury
- `child_process.execSync` / `exec` — do wywołań Bridge CLI
- `fs.writeFileSync` / `unlinkSync` — temp files dla `plan-epic`
- `requireAdmin()` z `lib/utils/require-admin.ts`

Bridge CLI (dostępne lokalnie gdy dev):
```bash
cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate && python -m bridge.cli <cmd>
```

Na Vercel Bridge CLI NIE jest dostępne → endpoint zwraca 503 z komunikatem "Bridge CLI niedostępne w trybie production".
Sprawdź: `process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline'` → 503.

### Powiązane pliki
- `lib/utils/require-admin.ts`
- `app/api/pipeline/prd-questions/route.ts` (STORY-6.1) — wzorzec Anthropic SDK
- `lib/bridge.ts` — `fetchBridge()` (do inspiracji, ale tutaj potrzebny CLI nie HTTP)

### Stan systemu przed tą story
- STORY-6.1 zaimplementowana (Anthropic SDK skonfigurowany)
- Bridge CLI działa lokalnie: `bridge projects add`, `bridge plan-epic`
- `ANTHROPIC_API_KEY` w envach

---

## ✅ Acceptance Criteria

### AC-1: Walidacja project_key
GIVEN: request z `project_key` zawierającym wielkie litery lub spacje (np. "My Project")
WHEN: `POST /api/pipeline/create-from-prd` jest wywołany
THEN: endpoint zwraca `400 Bad Request` z body `{ "error": "Klucz projektu może zawierać tylko małe litery, cyfry i myślniki (a-z, 0-9, -)" }`

### AC-2: Happy path — rejestracja projektu
GIVEN: zalogowany admin, prawidłowy `prd_text` (200+ znaków), `project_name: "Gym Tracker"`, `project_key: "gym-tracker"`, `answers: { q1: "...", q2: "..." }`
WHEN: `POST /api/pipeline/create-from-prd` jest wywołany
THEN: Claude Sonnet generuje strukturę JSON z 1–5 epikami
AND: wywołany jest `bridge projects add --key gym-tracker --name "Gym Tracker"`
AND: dla każdego epiku wywołany jest `bridge plan-epic` z plikiem stories (JSON)
AND: zwrócone jest `200 OK` z `{ project_key, epics, epics_count, stories_count, bridge_output }`

### AC-3: Projekt już istnieje (409)
GIVEN: `project_key: "kira-dashboard"` który już istnieje w Bridge
WHEN: `POST /api/pipeline/create-from-prd` jest wywołany
THEN: Bridge CLI zwraca błąd duplikatu
AND: endpoint zwraca `409 Conflict` z body `{ "error": "Projekt o tym kluczu już istnieje w Bridge" }`

### AC-4: AI generuje nieprawidłowy JSON (422)
GIVEN: Claude Sonnet zwraca odpowiedź której nie można sparsować jako JSON z epics
WHEN: endpoint próbuje przetworzyć odpowiedź AI
THEN: endpoint zwraca `422 Unprocessable Entity` z body `{ "error": "AI nie zdołało wygenerować struktury projektu — spróbuj ponownie" }`

### AC-5: Tryb offline (Vercel)
GIVEN: `process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline'`
WHEN: `POST /api/pipeline/create-from-prd` jest wywołany
THEN: endpoint zwraca `503 Service Unavailable` z body `{ "error": "Rejestracja projektów wymaga lokalnego Bridge CLI — niedostępne w trybie production" }`

### AC-6: Cleanup plików tymczasowych
GIVEN: jakikolwiek scenariusz (sukces lub błąd)
WHEN: endpoint kończy pracę
THEN: pliki `/tmp/stories-{epic_id}-{timestamp}.json` są usunięte

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: POST
Path:   /api/pipeline/create-from-prd
Auth:   Supabase JWT (requireAdmin)
Role:   ADMIN
```

### Request Schema
```typescript
interface RequestBody {
  prd_text: string          // min 50, max 20 000 znaków
  project_name: string      // min 2, max 100 znaków
  project_key: string       // regex: /^[a-z0-9-]+$/, min 3, max 40 znaków
  answers: Record<string, string>  // { "q1": "...", "q2": "..." }
}
```

### Response Schema
```typescript
// 200 OK
interface SuccessResponse {
  project_key: string
  epics: Array<{
    epic_id: string       // "EPIC-1", "EPIC-2", ...
    title: string
    stories_count: number
    stories: Array<{
      id: string          // "STORY-1.1", ...
      title: string
      domain: string      // "database" | "backend" | "wiring" | "frontend"
    }>
  }>
  epics_count: number
  stories_count: number
  bridge_output: string   // surowy output CLI do debugowania
}
```

### System prompt dla Claude Sonnet
```
Jesteś architektem oprogramowania. Na podstawie PRD i odpowiedzi na pytania wygeneruj strukturę projektu.

ZASADY:
- Max 5 epików, max 5 stories per epic
- Każdy epic ma: epic_id ("EPIC-1" itd.), title (po polsku lub angielsku), stories[]
- Każda story ma: id ("STORY-1.1" itd.), title (konkretna akcja), domain ("database"|"auth"|"backend"|"wiring"|"frontend"), size ("short"|"medium"|"long"), dod (definicja ukończenia, 1 zdanie)
- Zacznij od domeny database/auth, potem backend, wiring, frontend
- Nie generuj story dla funkcji poza zakresem PRD

Zwróć WYŁĄCZNIE poprawny JSON:
{
  "epics": [
    {
      "epic_id": "EPIC-1",
      "title": "Auth & Onboarding",
      "stories": [
        { "id": "STORY-1.1", "title": "...", "domain": "database", "size": "short", "dod": "..." }
      ]
    }
  ]
}
```

### Logika biznesowa (krok po kroku)
```
1. requireAdmin() → 401
2. Sprawdź NEXT_PUBLIC_BRIDGE_MODE === 'offline' → 503
3. Parsuj body → waliduj wszystkie pola
   - project_key: /^[a-z0-9-]+$/, min 3, max 40 → 400
   - project_name: min 2, max 100 → 400
   - prd_text: min 50, max 20 000 → 400
4. Wywołaj Claude Sonnet (claude-sonnet-4-5 lub claude-sonnet-4-6):
   - system prompt powyżej
   - user: "PRD:\n{prd_text}\n\nOdpowiedzi na pytania:\n{JSON.stringify(answers, null, 2)}"
   - max_tokens: 4000
5. Parsuj odpowiedź AI → wyciągnij JSON (obsłuż markdown code block)
   → błąd parsowania? 422
6. Waliduj strukturę: epics[] z 1-5 elementami, każdy ma epic_id, title, stories[]
7. Wywołaj Bridge CLI: `bridge projects add --key {key} --name "{name}"`
   → "already exists" w output? 409
   → inny błąd CLI? 500
8. Dla każdego epiku:
   a. Zapisz stories do `/tmp/stories-{epic_id}-{Date.now()}.json`
   b. Wywołaj: `bridge plan-epic --epic-id {epic_id} --title "{title}" --project {key} --stories-file /tmp/...`
   c. Zbierz output
9. Cleanup: usuń wszystkie pliki tymczasowe (try/catch — nie blokuj response)
10. Zwróć 200 z podsumowaniem
```

### Bridge CLI — format pliku stories
```json
[
  { "id": "STORY-1.1", "title": "...", "domain": "database", "size": "short", "dod": "..." }
]
```

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI niedostępne (Python nie zainstalowany)
Scenariusz: `execSync` rzuca wyjątek ENOENT lub kod wyjścia != 0
Oczekiwane zachowanie: złap błąd, zaloguj do `console.error`, zwróć 500 z "Błąd serwera — sprawdź logi Bridge CLI"

### EC-2: Błąd podczas rejestracji jednego z epików
Scenariusz: `bridge plan-epic` kończy się błędem dla EPIC-2 (z 3)
Oczekiwane zachowanie: kontynuuj dla pozostałych epików, zbierz wszystkie outputy, zwróć 200 z `bridge_output` zawierającym błąd — częściowy sukces jest akceptowalny

### EC-3: AI generuje ponad 5 epików
Scenariusz: Claude ignoruje limit i generuje 7 epików
Oczekiwane zachowanie: przytnij do pierwszych 5 przed wywołaniem Bridge CLI

### EC-4: Crash podczas cleanup pliku tymczasowego
Scenariusz: `unlinkSync` rzuca błąd (plik nie istnieje)
Oczekiwane zachowanie: ignoruj błąd cleanup (try/catch bez re-throw), nie blokuj odpowiedzi

---

## 🚫 Out of Scope tej Story
- Edycja wygenerowanej struktury przez użytkownika przed rejestracją
- Rollback w przypadku częściowego błędu (usunięcie projektu z Bridge)
- Wywoływanie Bridge CLI na Vercel / remote
- Persystowanie sesji PRD w bazie danych

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Walidacja project_key odrzuca wielkie litery, spacje, znaki specjalne
- [ ] Pliki tymczasowe są usuwane po zakończeniu (sukces i błąd)
- [ ] Tryb offline (`NEXT_PUBLIC_BRIDGE_MODE=offline`) zwraca 503
- [ ] Wywołanie bez auth zwraca 401
- [ ] Bridge CLI wywołania są sekwencyjne (nie równoległe)
- [ ] Nowy projekt pojawia się w `bridge projects list` po sukcesie
