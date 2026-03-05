---
story_id: STORY-2.4
title: "Write operations API — POST /api/bridge/advance, /start, /complete"
epic: EPIC-2
module: realtime
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-0.2]
blocks: []
tags: [api, bridge, write-ops, advance, start, complete, admin]
---

## 🎯 User Story

**Jako** Mariusz (Admin) korzystający z KiraBoard
**Chcę** móc zaawansować, uruchomić lub zakończyć story bezpośrednio z dashboardu przez kliknięcie przycisku
**Żeby** zarządzać pipeline bez przełączania się na terminal z Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Serwer: `server.cjs` — nowe endpointy proxy do Bridge CLI
- 3 endpointy write operations (ściśle powiązane, wszystkie jako proxy Bridge CLI)
- Auth: `requireRole('admin')` (istniejący middleware z STORY-0.9)
- Bridge CLI: `python -m bridge.cli <command>` przez `child_process.exec`
- EventEmitter: po każdej operacji emit event przez `bridgeEventEmitter` (z STORY-2.1) → SSE klienci dostają potwierdzenie

### Powiązane pliki
- `server.cjs` — dodaj 3 endpointy
- `bridge.yml` — konfiguracja Bridge (nie modyfikuj)
- `epics/EPIC-2.md` — specyfikacja
- STORY-2.1 wymagana: `bridgeEventEmitter` musi być dostępny

### Stan systemu przed tą story
- STORY-0.2 gotowa: Bridge CLI proxy działa, `requireRole` zaimplementowany
- Bridge CLI dostępny: `cd ~/codermariusz/kira && source .venv/bin/activate && python -m bridge.cli`
- STORY-2.1 (bridgeEventEmitter) może być gotowa lub nie — jeśli nie, emituj event bez błędu (optional chaining)

---

## ✅ Acceptance Criteria

### AC-1: POST /api/bridge/stories/:id/advance — zmiana statusu story
GIVEN: Mariusz wysyła `POST /api/bridge/stories/STORY-1.3/advance` z ważnym JWT (rola: admin) i body `{"status": "review"}`
WHEN: Serwer obsługuje żądanie
THEN: Serwer wykonuje `python -m bridge.cli advance STORY-1.3 review`
AND: Jeśli Bridge CLI zwraca sukces (exit code 0) → serwer zwraca `200 OK` z `{"success": true, "story_id": "STORY-1.3", "new_status": "review"}`
AND: `bridgeEventEmitter` emituje event `story_status_changed` z nowymi danymi → SSE klienci dostają aktualizację
AND: Czas odpowiedzi ≤ 10 sekund (Bridge CLI timeout)

### AC-2: POST /api/bridge/stories/:id/start — start story
GIVEN: Mariusz wysyła `POST /api/bridge/stories/STORY-1.3/start` z ważnym JWT (rola: admin)
WHEN: Serwer obsługuje żądanie
THEN: Serwer wykonuje `python -m bridge.cli start-story STORY-1.3`
AND: Jeśli sukces → serwer zwraca `200 OK` z `{"success": true, "story_id": "STORY-1.3", "status": "in_progress"}`
AND: `bridgeEventEmitter` emituje `run_started` event

### AC-3: POST /api/bridge/stories/:id/complete — complete story
GIVEN: Mariusz wysyła `POST /api/bridge/stories/STORY-1.3/complete` z ważnym JWT (rola: admin)
WHEN: Serwer obsługuje żądanie
THEN: Serwer wykonuje `python -m bridge.cli advance STORY-1.3 done`
AND: Jeśli sukces → `200 OK` z `{"success": true, "story_id": "STORY-1.3", "status": "done"}`

### AC-4: Brak autoryzacji — odrzucenie
GIVEN: Klient wysyła POST na dowolny z write ops endpointów bez tokena JWT lub z nieważnym tokenem
WHEN: Serwer obsługuje żądanie
THEN: Serwer zwraca `401 Unauthorized` z `{"error": "Unauthorized"}`
AND: Bridge CLI NIE jest wywołany

### AC-5: Bridge CLI error — propagacja błędu
GIVEN: Mariusz wysyła `POST /api/bridge/stories/STORY-NONEXISTENT/advance` z body `{"status": "done"}`
WHEN: Bridge CLI zwraca błąd (exit code != 0, np. "Story not found")
THEN: Serwer zwraca `422 Unprocessable Entity` z `{"error": "Bridge CLI error", "details": "<stderr output z CLI>"}`
AND: Klient dostaje czytelną informację co poszło nie tak

---

## ⚙️ Szczegóły Backend

### Endpointy (3 ściśle powiązane write ops)

```
POST /api/bridge/stories/:id/advance
Auth: Bearer JWT, Role: admin
Body: { "status": "todo|in_progress|review|done|blocked" }

POST /api/bridge/stories/:id/start
Auth: Bearer JWT, Role: admin
Body: {} (pusty lub opcjonalnie { "model": "sonnet-4.6" })

POST /api/bridge/stories/:id/complete
Auth: Bearer JWT, Role: admin
Body: {} (pusty)
```

### Request Schema

```typescript
// POST /api/bridge/stories/:id/advance
interface AdvanceBody {
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
}

// POST /api/bridge/stories/:id/start
interface StartBody {
  model?: string  // opcjonalne, np. "sonnet-4.6"
}

// POST /api/bridge/stories/:id/complete
// body puste
```

### Response Schema

```typescript
// 200 OK — sukces
interface SuccessResponse {
  success: true
  story_id: string   // np. "STORY-1.3"
  new_status: string // aktualny status po operacji
  message?: string   // opcjonalnie: "Story STORY-1.3 advanced to review"
}

// 400 Bad Request — walidacja
{ "error": "Invalid status value. Allowed: todo, in_progress, review, done, blocked" }

// 401 Unauthorized
{ "error": "Unauthorized" }

// 403 Forbidden
{ "error": "Forbidden — admin role required" }

// 404 Not Found (story ID nie istnieje wg Bridge — opcjonalne, jeśli CLI to zwraca)
{ "error": "Story not found", "story_id": "STORY-99.99" }

// 422 Unprocessable Entity — Bridge CLI error
{ "error": "Bridge CLI error", "details": "<stderr>" }

// 408 / 504 — timeout Bridge CLI
{ "error": "Bridge CLI timeout — operation may still be in progress" }

// 500 — nieoczekiwany błąd
{ "error": "Internal server error" }
```

### Logika biznesowa (krok po kroku)

```
Dla POST /api/bridge/stories/:id/advance:

1. Sprawdź JWT → brak/nieważny? zwróć 401
2. Sprawdź rolę admin → brak? zwróć 403
3. Parsuj :id z params → walidacja (niepusty string, format STORY-X.Y)
4. Parsuj body.status → walidacja whitelist (todo|in_progress|review|done|blocked)
   → nieprawidłowy? zwróć 400 z dozwolonymi wartościami
5. Wyślij do Bridge CLI:
   exec(`python -m bridge.cli advance ${story_id} ${status}`, {
     cwd: BRIDGE_DIR,
     timeout: 10000,  // 10 sekund
     env: { ...process.env, VIRTUAL_ENV: VENV_PATH, PATH: `${VENV_PATH}/bin:${process.env.PATH}` }
   })
6. exit code 0? → idź do 7. Exit code != 0? → zwróć 422 z stderr
7. Emit bridgeEventEmitter?.emit('bridge_event', {
     type: 'story_status_changed',
     story_id, old_status: null, new_status: status,
     timestamp: new Date().toISOString(), id: ++eventCounter
   })
8. Zwróć 200 { success: true, story_id, new_status: status }

Analogicznie dla /start i /complete (inne CLI komendy, inne event types)
```

### Konfiguracja Bridge CLI w server.cjs

```javascript
// Stałe konfiguracyjne (z bridge.yml lub hardcoded):
const BRIDGE_DIR = process.env.BRIDGE_DIR || '/Users/mariuszkrawczyk/codermariusz/kira';
const VENV_PATH  = path.join(BRIDGE_DIR, '.venv');
const BRIDGE_CMD = `source ${VENV_PATH}/bin/activate && python -m bridge.cli`;

// Helper:
function runBridgeCLI(args, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    exec(`${BRIDGE_CMD} ${args}`, {
      cwd: BRIDGE_DIR, timeout: timeoutMs,
      shell: '/bin/zsh',
      env: { ...process.env, PATH: `${VENV_PATH}/bin:${process.env.PATH}` }
    }, (err, stdout, stderr) => {
      if (err) reject({ exitCode: err.code, stderr: stderr.trim() });
      else resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}
```

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI timeout (> 10 sekund)
Scenariusz: Bridge proces jest przeciążony lub zablokowany, CLI nie odpowiada w 10 sekund
Oczekiwane zachowanie: Serwer zwraca `408 Request Timeout` z `{"error": "Bridge CLI timeout"}`, operacja może być w trakcie — klient powinien sprawdzić status ręcznie
Komunikat: "Operacja może być w toku. Sprawdź status story za chwilę."

### EC-2: Nieprawidłowy story_id format
Scenariusz: Klient wysyła `POST /api/bridge/stories/../../etc/passwd/advance` (path traversal attempt)
Oczekiwane zachowanie: Walidacja `story_id` regexem `^STORY-\d+\.\d+$` przed przekazaniem do CLI; nie pasuje → 400 Bad Request, CLI NIE wywołany

### EC-3: Concurrent requests — dwie operacje na tej samej story jednocześnie
Scenariusz: Mariusz szybko klika "Advance" dwa razy na tej samej story
Oczekiwane zachowanie: Obie komendy trafiają do Bridge CLI sekwencyjnie (Bridge CLI nie jest thread-safe); brak blokady w API — Bridge sam powinien obsłużyć drugi request jako no-op lub błąd; serwer zwraca odpowiedź niezależnie dla każdego requestu

### EC-4: Brak Bridge virtual environment
Scenariusz: `.venv` nie istnieje lub `python -m bridge.cli` fails z "ModuleNotFoundError"
Oczekiwane zachowanie: stderr zawiera błąd Python, serwer zwraca 422 z detalami, log błędu w konsoli serwera z pełnym stderr dla debugowania

---

## 🚫 Out of Scope tej Story
- UI przyciski "Advance"/"Start"/"Complete" w frontendzie (to EPIC-6 — Pipeline page)
- SSE endpoint (to STORY-2.1)
- Gate triggerowanie przez UI (to EPIC-6)
- Eval triggering (`POST /api/bridge/eval/trigger`) — jeśli EPIC-2 to wymagało, wróć z nową story
- Bulk operations (advance multiple stories) — future

---

## ✔️ Definition of Done
- [ ] 3 endpointy zaimplementowane w `server.cjs`: `/advance`, `/start`, `/complete`
- [ ] `requireRole('admin')` chroni wszystkie 3 endpointy (401/403 bez tokena/złej roli)
- [ ] Walidacja story_id regexem `^STORY-\d+\.\d+$` — path traversal uniemożliwiony
- [ ] Walidacja body.status whitelist dla `/advance`
- [ ] Bridge CLI wywoływany przez `runBridgeCLI` helper z timeout 10s
- [ ] `bridgeEventEmitter` emituje event po udanej operacji (optional chaining — graceful jeśli emitter nie istnieje)
- [ ] 422 + stderr details zwracane przy Bridge CLI error
- [ ] Endpoint nie crashuje na pustej bazie / braku Bridge
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
