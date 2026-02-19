---
story_id: STORY-2.3
title: "Next.js API endpoint POST /api/eval/run — async eval trigger z runId polling"
epic: EPIC-2
module: dashboard
domain: backend
status: ready
difficulty: complex
recommended_model: codex-5.3
ux_reference: none
api_reference: none
priority: must
estimated_effort: 8 h
depends_on: none
blocks: STORY-2.4
tags: [api-route, child-process, bridge-cli, async, polling, eval, uuid, state-management, next.js]
---

## 🎯 User Story

**Jako** dashboard Next.js (frontend panel Eval)
**Chcę** wywołać endpoint `POST /api/eval/run` i śledzić postęp przez polling `GET /api/eval/run/{runId}/status`
**Żeby** triggerować eval run w Bridge bez blokowania UI i widzieć wynik gdy eval się zakończy

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- **Pliki do stworzenia:**
  - `src/app/api/eval/run/route.ts` — POST handler (triggeruje run)
  - `src/app/api/eval/run/[runId]/status/route.ts` — GET handler (polling statusu)
  - `src/lib/eval-store.ts` — in-memory store dla stanów runów (singleton)
- **Framework:** Next.js App Router, runtime Node.js
- **Zewnętrzne zależności:** `child_process` (Node.js built-in), `crypto` (Node.js built-in — dla UUID), Bridge CLI

### Powiązane pliki
- `src/app/api/eval/run/route.ts` — do stworzenia
- `src/app/api/eval/run/[runId]/status/route.ts` — do stworzenia
- `src/lib/eval-store.ts` — do stworzenia (singleton state)
- `.env.local` — `BRIDGE_DIR=/Users/mariuszkrawczyk/codermariusz/kira`

### Stan systemu przed tą story
- Projekt Next.js z App Router jest skonfigurowany
- `src/app/api/` katalog istnieje
- Bridge CLI działa: `cd ${BRIDGE_DIR} && source .venv/bin/activate && python -m bridge.cli eval run`
- Nie ma jeszcze żadnego async run tracking w projekcie

---

## ✅ Acceptance Criteria

### AC-1: POST /api/eval/run — natychmiastowa odpowiedź z runId
GIVEN: `BRIDGE_DIR` jest ustawione i Bridge CLI jest dostępne
WHEN: Klient wysyła `POST /api/eval/run` (bez body lub z dowolnym body)
THEN: Handler uruchamia eval run w tle (nie czeka na zakończenie)
AND: Handler natychmiast zwraca `HTTP 202 Accepted` z body:
  ```json
  { "runId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }
  ```
AND: `runId` to poprawny UUID v4 (36 znaków, format z myślnikami)
AND: Czas odpowiedzi (do otrzymania 202) ≤ 200ms

### AC-2: GET /api/eval/run/{runId}/status — status "running"
GIVEN: Klient uruchomił `POST /api/eval/run` i otrzymał `runId = "abc-123"`
AND: Eval run jest w trakcie wykonania (trwa < 5 minut)
WHEN: Klient wysyła `GET /api/eval/run/abc-123/status`
THEN: Handler zwraca `HTTP 200` z body:
  ```json
  { "status": "running" }
  ```

### AC-3: GET /api/eval/run/{runId}/status — status "done"
GIVEN: Eval run o `runId = "abc-123"` zakończył się sukcesem (exit code 0)
WHEN: Klient wysyła `GET /api/eval/run/abc-123/status`
THEN: Handler zwraca `HTTP 200` z body:
  ```json
  {
    "status": "done",
    "result": {
      "output": "<stdout z bridge eval run>",
      "completedAt": "2024-01-15T14:30:00.000Z"
    }
  }
  ```

### AC-4: GET /api/eval/run/{runId}/status — status "error"
GIVEN: Eval run o `runId = "abc-123"` zakończył się błędem (exit code != 0 lub timeout)
WHEN: Klient wysyła `GET /api/eval/run/abc-123/status`
THEN: Handler zwraca `HTTP 200` z body:
  ```json
  {
    "status": "error",
    "result": {
      "error": "<stderr lub komunikat timeout>",
      "completedAt": "2024-01-15T14:30:00.000Z"
    }
  }
  ```

### AC-5: Timeout po 5 minutach
GIVEN: Eval run trwa dłużej niż 5 minut (300000ms)
WHEN: Upłynie dokładnie 5 minut od startu runu
THEN: Proces CLI jest zabijany (kill signal)
AND: Stan runu jest aktualizowany do:
  ```json
  {
    "status": "error",
    "result": {
      "error": "Eval run timeout po 5 minutach",
      "completedAt": "<ISO timestamp>"
    }
  }
  ```
AND: Następne wywołanie `GET /api/eval/run/{runId}/status` zwraca ten status error

### AC-6: Polling nieistniejącego runId
GIVEN: Klient wysyła `GET /api/eval/run/nieistniejacy-uuid/status`
WHEN: `runId` nie istnieje w store (nigdy nie był uruchomiony lub już wyczyszczony)
THEN: Handler zwraca `HTTP 404` z body:
  ```json
  { "error": "Run nie znaleziony. Może być za stary lub nie istnieje." }
  ```

### AC-7: Cleanup starych runów
GIVEN: W store istnieje run który zakończył się (status "done" lub "error") ponad 1 godzinę temu
WHEN: Dowolne nowe żądanie trafia do serwera Next.js (lazy cleanup przy każdym request)
OR: Uruchamia się dedykowany cleanup (np. setInterval lub przy starcie store)
THEN: Stare runy są usuwane z Map w pamięci
AND: `GET /api/eval/run/{staryRunId}/status` zwraca 404

### AC-8: BRIDGE_DIR nie jest ustawione
GIVEN: `BRIDGE_DIR` NIE jest ustawione
WHEN: Klient wysyła `POST /api/eval/run`
THEN: Handler zwraca `HTTP 500` z body:
  ```json
  { "ok": false, "error": "Konfiguracja serwera: brak BRIDGE_DIR w zmiennych środowiskowych" }
  ```

---

## ⚙️ Szczegóły Backend

### Endpoint 1 — Trigger Eval Run
```
METHOD: POST
Path: /api/eval/run
Auth: brak (MVP)
Body: brak (ignoruj)
Runtime: nodejs
Response: 202 Accepted
```

### Endpoint 2 — Polling Status
```
METHOD: GET
Path: /api/eval/run/[runId]/status
Auth: brak (MVP)
Runtime: nodejs
Response: 200 | 404
```

### Response Schema

```typescript
// POST /api/eval/run → 202
interface TriggerResponse {
  runId: string  // UUID v4
}

// GET /api/eval/run/{runId}/status → 200 (running)
interface RunningStatusResponse {
  status: "running"
}

// GET /api/eval/run/{runId}/status → 200 (done)
interface DoneStatusResponse {
  status: "done"
  result: {
    output: string        // stdout z eval run
    completedAt: string   // ISO 8601
  }
}

// GET /api/eval/run/{runId}/status → 200 (error)
interface ErrorStatusResponse {
  status: "error"
  result: {
    error: string         // komunikat błędu
    completedAt: string   // ISO 8601
  }
}

// GET /api/eval/run/{runId}/status → 404
interface NotFoundResponse {
  error: string
}
```

### Zmienne środowiskowe

```bash
BRIDGE_DIR=/Users/mariuszkrawczyk/codermariusz/kira
# WYMAGANE. Ścieżka do katalogu Bridge.
```

### `src/lib/eval-store.ts` — In-Memory Store

```typescript
// WAŻNE: W Next.js dev mode (z hot reload) moduły mogą być przeładowywane.
// Użyj global object aby store przeżył hot reload.
// W produkcji moduł jest załadowany raz — singleton jest stabilny.

interface EvalRunState {
  status: 'running' | 'done' | 'error'
  startedAt: number      // Date.now() timestamp
  completedAt?: number   // Date.now() timestamp gdy zakończone
  result?: {
    output?: string      // stdout (gdy done)
    error?: string       // error message (gdy error)
  }
}

// Singleton Map — przeżywa między requestami w tym samym procesie Node.js
// W Next.js App Router każdy worker process ma swój store — akceptowalne dla MVP
declare global {
  var __evalRunStore: Map<string, EvalRunState> | undefined
}

export const evalStore: Map<string, EvalRunState> =
  global.__evalRunStore ?? (global.__evalRunStore = new Map())

// Cleanup funkcja — usuwa runy starsze niż 1 godzinę (3600000ms)
export function cleanupOldRuns(): void {
  const oneHourAgo = Date.now() - 3600000
  for (const [runId, state] of evalStore.entries()) {
    if (state.completedAt && state.completedAt < oneHourAgo) {
      evalStore.delete(runId)
    }
    // Usuń też running runy starsze niż 10 minut (stuck/zombie)
    if (state.status === 'running' && state.startedAt < Date.now() - 600000) {
      evalStore.delete(runId)
    }
  }
}
```

### Logika biznesowa (krok po kroku)

#### POST /api/eval/run — pełny flow

```
KROK 1 — Walidacja środowiska
  1a. const bridgeDir = process.env.BRIDGE_DIR
  1b. if (!bridgeDir):
        return Response.json({ ok: false, error: "Konfiguracja serwera: brak BRIDGE_DIR..." }, { status: 500 })

KROK 2 — Generowanie runId
  2a. import { randomUUID } from 'crypto'
  2b. const runId = randomUUID()
      // Daje UUID v4, np. "550e8400-e29b-41d4-a716-446655440000"

KROK 3 — Zapis initial state do store
  3a. evalStore.set(runId, {
        status: 'running',
        startedAt: Date.now()
      })

KROK 4 — Uruchomienie eval w tle (fire-and-forget)
  4a. Zbuduj komendę:
        const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli eval run`
  4b. Wywołaj exec ASYNCHRONICZNIE ale NIE czekaj na wynik:
        runEvalAsync(runId, command, bridgeDir)
        // Ta funkcja jest void — nie awaitujesz jej w POST handlerze

KROK 5 — Lazy cleanup
  5a. cleanupOldRuns()  // Wyczyść stare runy przy każdym nowym POST

KROK 6 — Natychmiastowa odpowiedź
  6a. return Response.json({ runId }, { status: 202 })

---

FUNKCJA runEvalAsync (asynchroniczna, poza handlem requestu):

async function runEvalAsync(runId: string, command: string): Promise<void> {
  const EVAL_TIMEOUT_MS = 300000  // 5 minut

  return new Promise<void>((resolve) => {
    const child = exec(
      command,
      {
        timeout: EVAL_TIMEOUT_MS,
        shell: '/bin/bash',
        env: { ...process.env }
      },
      (error, stdout, stderr) => {
        const completedAt = Date.now()
        
        if (error) {
          const isTimeout = error.killed || error.signal === 'SIGTERM'
          evalStore.set(runId, {
            status: 'error',
            startedAt: evalStore.get(runId)!.startedAt,
            completedAt,
            result: {
              error: isTimeout
                ? 'Eval run timeout po 5 minutach'
                : (stderr?.trim() || stdout?.trim() || 'Bridge CLI zwróciło błąd')
            }
          })
        } else {
          evalStore.set(runId, {
            status: 'done',
            startedAt: evalStore.get(runId)!.startedAt,
            completedAt,
            result: {
              output: stdout.trim()
            }
          })
        }
        
        resolve()
      }
    )
    
    // Jeśli child nie istnieje (exec error) — obsłuż
    if (!child.pid) {
      evalStore.set(runId, {
        status: 'error',
        startedAt: evalStore.get(runId)!.startedAt,
        completedAt: Date.now(),
        result: { error: 'Nie można uruchomić Bridge CLI' }
      })
      resolve()
    }
  })
}
```

#### GET /api/eval/run/[runId]/status — pełny flow

```
KROK 1 — Lazy cleanup (opcjonalnie przy każdym pollu, lub tylko przy POST)
  1a. cleanupOldRuns()

KROK 2 — Lookup w store
  2a. const state = evalStore.get(params.runId)
  2b. if (!state):
        return Response.json(
          { error: "Run nie znaleziony. Może być za stary lub nie istnieje." },
          { status: 404 }
        )

KROK 3 — Budowanie response
  3a. if (state.status === 'running'):
        return Response.json({ status: 'running' })
  
  3b. if (state.status === 'done'):
        return Response.json({
          status: 'done',
          result: {
            output: state.result!.output ?? '',
            completedAt: new Date(state.completedAt!).toISOString()
          }
        })
  
  3c. if (state.status === 'error'):
        return Response.json({
          status: 'error',
          result: {
            error: state.result!.error ?? 'Nieznany błąd',
            completedAt: new Date(state.completedAt!).toISOString()
          }
        })
```

### Pełna struktura pliku `src/app/api/eval/run/route.ts`

```typescript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { exec } from 'child_process'
import { randomUUID } from 'crypto'
import { evalStore, cleanupOldRuns } from '@/lib/eval-store'

async function runEvalAsync(runId: string, command: string): Promise<void> { ... }

export async function POST(request: Request): Promise<Response> {
  // Walidacja BRIDGE_DIR
  // Generuj runId
  // Zapisz initial state
  // Fire-and-forget runEvalAsync
  // Cleanup
  // Return 202
}
```

### Pełna struktura pliku `src/app/api/eval/run/[runId]/status/route.ts`

```typescript
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { evalStore, cleanupOldRuns } from '@/lib/eval-store'
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
): Promise<Response> {
  // Cleanup
  // Lookup state
  // Return odpowiedni status
}
```

---

## ⚠️ Edge Cases

### EC-1: Wiele równoczesnych eval runów
Scenariusz: Użytkownik kliknie "Run Eval" wielokrotnie zanim pierwszy się skończy
Oczekiwane zachowanie: Każdy POST tworzy nowy niezależny runId i uruchamia osobny proces CLI. Store przechowuje wszystkie. Nie ma limitu równoczesnych runów na poziomie Next.js (Bridge CLI może narzucić własne ograniczenia). Frontend (STORY-2.4) powinien wyłączyć przycisk po pierwszym kliknięciu — ale backend akceptuje wielokrotne requesty.

### EC-2: Next.js worker restart (np. deploy) w trakcie eval runu
Scenariusz: Eval run trwa 3 minuty, w tym czasie Next.js jest restartowany (np. nowy deploy na Vercel lub PM2 restart)
Oczekiwane zachowanie: In-memory store jest utracony. Child process prawdopodobnie też zostaje zabity. Klient polując po restart dostanie 404 (runId nie istnieje w nowym procesie). Frontend (STORY-2.4) powinien obsłużyć 404 jako "run utracony — spróbuj ponownie". NIE implementować persistent store (plik/baza) w tej story — to przyszły refactor.

### EC-3: Bridge CLI eval run produkuje bardzo duży stdout (np. 10MB raport)
Scenariusz: Eval generuje obszerny raport JSON
Oczekiwane zachowanie: `exec()` buforuje cały stdout w pamięci. Limit Node.js `exec` to domyślnie 1MB → zwiększ `maxBuffer` do 50MB:
  ```typescript
  exec(command, { timeout, shell: '/bin/bash', maxBuffer: 50 * 1024 * 1024, env: {...} }, callback)
  ```
Jeśli output przekracza maxBuffer — callback dostaje error → status "error" z komunikatem.

### EC-4: Polling z niepoprawnym UUID format (nie-UUID string)
Scenariusz: Klient wysyła `GET /api/eval/run/not-a-uuid/status`
Oczekiwane zachowanie: Store lookup po dowolnym stringu (Map.get) zwróci undefined → 404. Brak potrzeby walidacji UUID formatu — 404 jest poprawną odpowiedzią.

### EC-5: runId race condition — `runEvalAsync` kończy się przed cleanup store
Scenariusz: Eval kończy się w < 1ms (teoretyczne), status jest zapisany poprawnie
Oczekiwane zachowanie: Brak problemu — store.set() w callback exec nadpisuje initial 'running' state atomicznie (single-threaded JS event loop). Nie ma race condition w single-threaded Node.js.

### EC-6: Server ma wiele worker procesów (Next.js z PM2 cluster mode)
Scenariusz: Next.js działa z wieloma workerami (np. 4 CPU cores) — każdy ma własny in-memory store
Oczekiwane zachowanie: Jeśli POST trafi do worker A i GET do worker B — store lookup zwróci 404. To znane ograniczenie in-memory store. Akceptowalne dla MVP (single process deployment). W TOOLS.md jest info że używamy Vercel (single process) lub lokalnie (single process).

---

## 🚫 Out of Scope tej Story
- Persistent storage runów (baza danych, Redis) — MVP używa in-memory Map
- WebSocket / SSE dla real-time progress eval runu — klient poluje (polling pattern)
- Streaming output z eval runu w czasie rzeczywistym — cały output dostępny po zakończeniu
- Autentykacja i autoryzacja — EPIC-3
- Anulowanie (cancel) aktywnego eval runu — osobna story
- Limitowanie liczby równoczesnych eval runów
- Parsowanie i interpretacja output z eval runu — frontend (STORY-2.4) wyświetla raw output

---

## ✔️ Definition of Done
- [ ] Plik `src/app/api/eval/run/route.ts` istnieje z `export const runtime = 'nodejs'`
- [ ] Plik `src/app/api/eval/run/[runId]/status/route.ts` istnieje z `export const runtime = 'nodejs'`
- [ ] Plik `src/lib/eval-store.ts` istnieje z global singleton `__evalRunStore`
- [ ] `curl -X POST http://localhost:3000/api/eval/run` → 202 z `{"runId":"<uuid>"}`
- [ ] `curl http://localhost:3000/api/eval/run/<runId>/status` → 200 `{"status":"running"}` podczas trwania
- [ ] Po zakończeniu eval: `GET /status` → 200 `{"status":"done","result":{...}}`
- [ ] Po błędzie eval: `GET /status` → 200 `{"status":"error","result":{...}}`
- [ ] `curl http://localhost:3000/api/eval/run/fake-uuid/status` → 404
- [ ] Brak BRIDGE_DIR → 500 z komunikatem konfiguracyjnym
- [ ] Symulowany timeout (Bridge śpi >5min) → status "error" z "timeout po 5 minutach"
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Endpoint nie crashuje przy niedostępnym Bridge
- [ ] Runy starsze niż 1h są usuwane z pamięci
- [ ] `maxBuffer: 50 * 1024 * 1024` ustawione dla exec (50MB)
- [ ] Shell ustawiony na `/bin/bash`
- [ ] `BRIDGE_DIR` z `process.env` (brak hardcoded path)
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] TypeScript kompiluje bez błędów (`tsc --noEmit`)
- [ ] Story review przez PO
