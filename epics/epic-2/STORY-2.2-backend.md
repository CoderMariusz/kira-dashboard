---
story_id: STORY-2.2
title: "Next.js API routes POST /api/stories/[id]/start i /advance — Write operations przez Bridge CLI"
epic: EPIC-2
module: dashboard
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: none
priority: must
estimated_effort: 6 h
depends_on: none
blocks: STORY-2.4
tags: [api-route, child-process, bridge-cli, validation, timeout, write-operations, next.js]
---

## 🎯 User Story

**Jako** dashboard Next.js (frontend komponent)
**Chcę** wywoływać endpointy `POST /api/stories/[id]/start` i `POST /api/stories/[id]/advance`
**Żeby** startować i przesuwać story w pipeline Bridge CLI bez bezpośredniego dostępu do terminala

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- **Pliki do stworzenia:**
  - `src/app/api/stories/[id]/start/route.ts` — endpoint POST dla start-story
  - `src/app/api/stories/[id]/advance/route.ts` — endpoint POST dla advance
- **Framework:** Next.js App Router, runtime Node.js
- **Zewnętrzne zależności:** `child_process` (Node.js built-in), Bridge CLI (Python)
- **Bridge CLI lokalizacja:** konfigurowana przez `BRIDGE_DIR` env var

### Powiązane pliki
- `src/app/api/stories/[id]/start/route.ts` — do stworzenia
- `src/app/api/stories/[id]/advance/route.ts` — do stworzenia
- `src/lib/bridge-cli.ts` — helper do uruchamiania Bridge CLI (opcjonalnie wyekstrahować)
- `.env.local` — `BRIDGE_DIR=/Users/mariuszkrawczyk/codermariusz/kira`

### Stan systemu przed tą story
- Projekt Next.js z App Router jest skonfigurowany
- `src/app/api/` katalog istnieje
- Bridge Python project istnieje pod `BRIDGE_DIR`
- W `BRIDGE_DIR` istnieje `.venv/bin/activate` (Python virtual environment)
- Bridge CLI działa: `cd ${BRIDGE_DIR} && source .venv/bin/activate && python -m bridge.cli start-story STORY-1.1`

---

## ✅ Acceptance Criteria

### AC-1: POST /api/stories/[id]/start — sukces
GIVEN: Story o ID `STORY-1.1` istnieje w stanie READY w Bridge pipeline
AND: `BRIDGE_DIR=/Users/mariuszkrawczyk/codermariusz/kira` jest ustawione w środowisku
WHEN: Klient wysyła `POST /api/stories/STORY-1.1/start` (bez body)
THEN: Handler wykonuje polecenie: `cd /Users/mariuszkrawczyk/codermariusz/kira && source .venv/bin/activate && python -m bridge.cli start-story STORY-1.1`
AND: Gdy CLI zwróci exit code 0 — response to `HTTP 200` z body:
  ```json
  { "ok": true, "output": "<stdout z Bridge CLI>" }
  ```
AND: Czas odpowiedzi ≤ 30 sekund

### AC-2: POST /api/stories/[id]/advance — sukces
GIVEN: Story o ID `STORY-1.1` istnieje w stanie IN_PROGRESS
AND: `BRIDGE_DIR` jest ustawione
WHEN: Klient wysyła `POST /api/stories/STORY-1.1/advance` z body `{"status": "REVIEW"}`
THEN: Handler wykonuje: `cd ${BRIDGE_DIR} && source .venv/bin/activate && python -m bridge.cli advance STORY-1.1 REVIEW`
AND: Gdy CLI zwróci exit code 0 — response to `HTTP 200`:
  ```json
  { "ok": true, "output": "<stdout z Bridge CLI>" }
  ```
AND: Poprawne wartości `status` to dokładnie: `"REVIEW"`, `"DONE"`, `"REFACTOR"`

### AC-3: Walidacja — niepoprawny format story ID
GIVEN: Klient wysyła request z dowolnym endpointem (start lub advance)
WHEN: Parametr `[id]` z URL NIE pasuje do regex `/^STORY-\d+\.\d+$/` (np. `abc`, `STORY-1`, `1.1`, `STORY-1.1.1`, `; rm -rf`)
THEN: Handler zwraca `HTTP 400` z body:
  ```json
  { "ok": false, "error": "Nieprawidłowy format story ID. Oczekiwany format: STORY-N.N (np. STORY-1.1)" }
  ```
AND: Bridge CLI NIE jest wywoływane (walidacja przed exec)

### AC-4: Walidacja — niepoprawny status w advance
GIVEN: Klient wysyła `POST /api/stories/STORY-1.1/advance`
WHEN: Body zawiera `{"status": "INVALID"}` (wartość spoza dopuszczalnych: `REVIEW`, `DONE`, `REFACTOR`)
OR: Body jest puste lub nie zawiera pola `status`
THEN: Handler zwraca `HTTP 400` z body:
  ```json
  { "ok": false, "error": "Nieprawidłowy status. Dozwolone wartości: REVIEW, DONE, REFACTOR" }
  ```
AND: Bridge CLI NIE jest wywoływane

### AC-5: Timeout — Bridge CLI nie odpowiada w 30 sekund
GIVEN: Wywołanie Bridge CLI trwa dłużej niż 30 sekund (Bridge zawiesił się)
WHEN: Upływa dokładnie 30000ms od wywołania `exec()`
THEN: Handler przerywa (kill) proces CLI
AND: Zwraca `HTTP 504 Gateway Timeout` z body:
  ```json
  { "ok": false, "error": "Bridge CLI timeout po 30 sekundach" }
  ```

### AC-6: Bridge CLI zwraca błąd (exit code != 0)
GIVEN: Bridge CLI zwraca niezerowy exit code (np. story nie istnieje, niepoprawny stan, Bridge error)
WHEN: `exec()` wywołuje callback z `error !== null`
THEN: Handler zwraca `HTTP 400` z body:
  ```json
  { "ok": false, "error": "<stderr lub stdout z Bridge CLI jeśli stderr puste>" }
  ```
AND: Log błędu (stderr) jest widoczny w konsoli serwera (console.error)

### AC-7: BRIDGE_DIR nie jest ustawione
GIVEN: Zmienna środowiskowa `BRIDGE_DIR` NIE jest ustawiona (brak w `.env.local` i process.env)
WHEN: Klient wysyła dowolny request (start lub advance)
THEN: Handler zwraca `HTTP 500` z body:
  ```json
  { "ok": false, "error": "Konfiguracja serwera: brak BRIDGE_DIR w zmiennych środowiskowych" }
  ```
AND: Bridge CLI NIE jest wywoływane

---

## ⚙️ Szczegóły Backend

### Endpoint 1 — Start Story
```
METHOD: POST
Path: /api/stories/[id]/start
Auth: brak (MVP)
Body: brak (ignoruj body jeśli przesłane)
Runtime: nodejs
```

### Endpoint 2 — Advance Story
```
METHOD: POST
Path: /api/stories/[id]/advance
Auth: brak (MVP)
Content-Type: application/json
Body: { "status": "REVIEW" | "DONE" | "REFACTOR" }
Runtime: nodejs
```

### Request Schema — advance

```typescript
interface AdvanceRequestBody {
  status: "REVIEW" | "DONE" | "REFACTOR"
}
```

### Response Schema

```typescript
// HTTP 200 — sukces
interface SuccessResponse {
  ok: true
  output: string  // stdout z Bridge CLI
}

// HTTP 400 — błąd walidacji lub błąd CLI
interface ErrorResponse {
  ok: false
  error: string  // czytelny komunikat błędu
}

// HTTP 500 — błąd konfiguracji serwera
interface ServerErrorResponse {
  ok: false
  error: string
}

// HTTP 504 — timeout
interface TimeoutResponse {
  ok: false
  error: "Bridge CLI timeout po 30 sekundach"
}
```

### Zmienne środowiskowe

```bash
BRIDGE_DIR=/Users/mariuszkrawczyk/codermariusz/kira
# WYMAGANE. Ścieżka do katalogu projektu kira (gdzie jest .venv i bridge.cli).
# Bez tego env var endpoint zwraca 500.
```

### Logika biznesowa (krok po kroku)

#### Krok 1 — Walidacja wejścia (identyczna dla obu endpointów na początku)

```
1a. Pobierz params.id z URL (Next.js App Router: params z funkcji handler)
    Przykład: dla URL /api/stories/STORY-1.1/start → params.id = "STORY-1.1"

1b. Sprawdź BRIDGE_DIR:
    const bridgeDir = process.env.BRIDGE_DIR
    if (!bridgeDir) return Response.json({ ok: false, error: "Konfiguracja serwera: brak BRIDGE_DIR..." }, { status: 500 })

1c. Waliduj format story ID:
    const STORY_ID_REGEX = /^STORY-\d+\.\d+$/
    if (!STORY_ID_REGEX.test(params.id)):
      return Response.json({ ok: false, error: "Nieprawidłowy format story ID..." }, { status: 400 })

(Tylko dla /advance):
1d. Parsuj body:
    const body = await request.json().catch(() => null)
    if (!body || !body.status) return Response.json({ ok: false, error: "Nieprawidłowy status..." }, { status: 400 })

1e. Waliduj status:
    const ALLOWED_STATUSES = ['REVIEW', 'DONE', 'REFACTOR']
    if (!ALLOWED_STATUSES.includes(body.status)):
      return Response.json({ ok: false, error: "Nieprawidłowy status. Dozwolone wartości: REVIEW, DONE, REFACTOR" }, { status: 400 })
```

#### Krok 2 — Budowanie komendy CLI

```
Dla /start:
  const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli start-story ${params.id}`

Dla /advance:
  const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli advance ${params.id} ${body.status}`

UWAGA: params.id przeszedł już walidację regex, więc jest bezpieczny.
UWAGA: body.status przeszedł enum validation — tylko REVIEW/DONE/REFACTOR.
UWAGA: bridgeDir może zawierać spacje w ścieżce — owiń w podwójne cudzysłowy.
```

#### Krok 3 — Wywołanie exec z timeoutem

```typescript
import { exec } from 'child_process'

function runBridgeCLI(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const timeout = 30000  // 30 sekund
    
    const child = exec(
      command,
      {
        timeout,
        shell: '/bin/bash',  // WAŻNE: source wymaga bash, nie sh
        env: { ...process.env }  // przekaż env vars do child process
      },
      (error, stdout, stderr) => {
        if (error) {
          // error.killed === true gdy timeout
          reject({ error, stdout, stderr })
          return
        }
        resolve({ stdout, stderr })
      }
    )
  })
}
```

#### Krok 4 — Obsługa wyniku

```
try {
  const { stdout } = await runBridgeCLI(command)
  return Response.json({ ok: true, output: stdout.trim() })
} catch ({ error, stdout, stderr }) {
  if (error.killed || error.signal === 'SIGTERM') {
    // Timeout
    return Response.json(
      { ok: false, error: "Bridge CLI timeout po 30 sekundach" },
      { status: 504 }
    )
  }
  
  console.error('[Bridge CLI error]', { command, stderr, stdout })
  
  // Błąd CLI — użyj stderr, fallback do stdout, fallback do generic message
  const errorMessage = (stderr?.trim() || stdout?.trim() || "Bridge CLI zwróciło błąd")
  return Response.json({ ok: false, error: errorMessage }, { status: 400 })
}
```

### Pełna struktura plików

#### `src/app/api/stories/[id]/start/route.ts`
```typescript
export const runtime = 'nodejs'

import { exec } from 'child_process'
import { NextRequest } from 'next/server'

function runBridgeCLI(command: string): Promise<{ stdout: string; stderr: string }> { ... }

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  // Walidacja BRIDGE_DIR
  // Walidacja params.id (STORY-N.N regex)
  // Zbuduj komendę
  // Wywołaj runBridgeCLI
  // Zwróć odpowiedź
}
```

#### `src/app/api/stories/[id]/advance/route.ts`
```typescript
export const runtime = 'nodejs'

import { exec } from 'child_process'
import { NextRequest } from 'next/server'

function runBridgeCLI(command: string): Promise<{ stdout: string; stderr: string }> { ... }

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  // Walidacja BRIDGE_DIR
  // Walidacja params.id (STORY-N.N regex)
  // Parsuj i waliduj body.status
  // Zbuduj komendę
  // Wywołaj runBridgeCLI
  // Zwróć odpowiedź
}
```

**Opcjonalnie:** Wyekstrahuj `runBridgeCLI` do `src/lib/bridge-cli.ts` i importuj w obu plikach (DRY).

---

## ⚠️ Edge Cases

### EC-1: Story ID z path traversal lub command injection
Scenariusz: Klient wysyła `POST /api/stories/../../../etc/passwd/start` lub `STORY-1.1;rm -rf /`
Oczekiwane zachowanie: Regex `/^STORY-\d+\.\d+$/` odrzuca wszystko co nie pasuje do formatu `STORY-N.N`. Znaki specjalne (`;`, `/`, `.`, spacje) nie przejdą walidacji → 400. Bridge CLI NIE jest wywoływane.

### EC-2: Bridge CLI nie istnieje pod podanym BRIDGE_DIR
Scenariusz: `BRIDGE_DIR` jest ustawione ale ścieżka nie istnieje lub `.venv` nie ma `activate`
Oczekiwane zachowanie: `exec()` zwraca error z komunikatem w stderr, np. `bash: /Users/.../kira/.venv/bin/activate: No such file or directory`. Handler zwraca 400 z tym komunikatem. Serwer nie crashuje.

### EC-3: Żądanie advance ze statusem "IN_PROGRESS" (próba ustawienia niedozwolonego statusu)
Scenariusz: Klient wysyła `{"status": "IN_PROGRESS"}` do `/advance`
Oczekiwane zachowanie: `ALLOWED_STATUSES` nie zawiera `"IN_PROGRESS"` → 400 z komunikatem o dozwolonych wartościach. Bridge CLI nie jest wywoływane.

### EC-4: Równoczesne wywołania tego samego story
Scenariusz: Frontend przypadkowo wysyła dwa identyczne requesty start jednocześnie
Oczekiwane zachowanie: Oba requesty wywołują Bridge CLI. Bridge CLI powinno być idempotentne lub zwrócić błąd na drugi request (np. "Story już jest IN_PROGRESS"). Handler zwróci 400 z komunikatem z Bridge. Brak obsługi na poziomie Next.js — deduplikacja to odpowiedzialność Bridge.

### EC-5: Bardzo długi stdout z Bridge CLI (np. logi debug)
Scenariusz: Bridge CLI wypluwa 100KB stdout przy sukcesie
Oczekiwane zachowanie: stdout.trim() jest zwracany w polu `output`. Response JSON może być duży (MB) — akceptowalne dla endpoint write operation. Brak truncation na poziomie Next.js route.

---

## 🚫 Out of Scope tej Story
- Sprawdzanie aktualnego stanu story przed wywołaniem CLI (np. walidacja "czy story jest READY przed start") — Bridge CLI zwróci błąd jeśli stan jest niepoprawny
- Historia wywołań / audit log write operations — osobna story
- Autentykacja i autoryzacja — EPIC-3
- Wsparcie dla innych komend Bridge CLI (poza start-story i advance) — oddzielne stories
- Retry logic po stronie Next.js gdy Bridge CLI zawiedzie — frontend (STORY-2.4) obsługuje retry
- Rate limiting endpointów

---

## ✔️ Definition of Done
- [ ] Plik `src/app/api/stories/[id]/start/route.ts` istnieje z `export const runtime = 'nodejs'`
- [ ] Plik `src/app/api/stories/[id]/advance/route.ts` istnieje z `export const runtime = 'nodejs'`
- [ ] `curl -X POST http://localhost:3000/api/stories/STORY-1.1/start` — gdy Bridge działa: 200 `{ok:true}`
- [ ] `curl -X POST http://localhost:3000/api/stories/STORY-1.1/advance -d '{"status":"REVIEW"}'` — gdy Bridge działa: 200 `{ok:true}`
- [ ] `curl -X POST http://localhost:3000/api/stories/invalid/start` → 400 z komunikatem o formacie
- [ ] `curl -X POST http://localhost:3000/api/stories/STORY-1.1/advance -d '{"status":"BAD"}'` → 400
- [ ] Brak BRIDGE_DIR → 500 z komunikatem konfiguracyjnym
- [ ] Symulowany timeout (Bridge śpi >30s) → 504
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem po polsku
- [ ] Endpoint nie crashuje na niedostępnym Bridge
- [ ] Wywołanie bez tokena zwraca 401 (gdy auth zostanie dodane w EPIC-3 — na razie endpoint jest publiczny)
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] TypeScript kompiluje bez błędów (`tsc --noEmit`)
- [ ] `BRIDGE_DIR` jest pobierane z `process.env` (brak hardcoded path w kodzie)
- [ ] Shell ustawiony na `/bin/bash` (bo `source` nie działa w `sh`)
- [ ] Story review przez PO
