---
story_id: STORY-2.1
title: "Next.js API route GET /api/events — SSE proxy do Bridge event stream z reconnect i heartbeat"
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
tags: [sse, streaming, proxy, reconnect, heartbeat, next.js, api-route]
---

## 🎯 User Story

**Jako** dashboard Next.js (klient przeglądarkowy)
**Chcę** subskrybować strumień eventów stanu pipeline przez endpoint `/api/events`
**Żeby** otrzymywać aktualizacje w czasie rzeczywistym (< 5s opóźnienia) bez potrzeby pollowania REST API

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- **Plik do stworzenia:** `src/app/api/events/route.ts`
- **Framework:** Next.js App Router (nie Pages Router — ważne!)
- **Runtime:** Node.js (nie Edge Runtime — `child_process` / `fetch` do lokalnego Bridge)
- **Bridge SSE upstream:** `GET http://localhost:8199/events` (lub `${process.env.BRIDGE_URL}/events`)

### Powiązane pliki
- `src/app/api/events/route.ts` — do stworzenia (plik docelowy tej story)
- `.env.local` — musi zawierać `BRIDGE_URL=http://localhost:8199` (lub default)
- `src/types/sse.ts` — typy eventów SSE (opcjonalnie do stworzenia w tej story)

### Stan systemu przed tą story
- Projekt Next.js 15+ z App Router jest już skonfigurowany
- `src/app/api/` katalog istnieje (inne API routes mogą już być)
- Bridge server działa (lub może nie działać — stąd potrzeba fallback)
- Nie ma jeszcze żadnego SSE endpointu w projekcie

---

## ✅ Acceptance Criteria

### AC-1: Poprawne SSE headers przy połączeniu
GIVEN: Klient HTTP (przeglądarka lub curl) wysyła `GET /api/events`
WHEN: Handler odbiera request
THEN: Response zawiera dokładnie te headers:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no` (wyłącza buforowanie nginx/reverse proxy)
AND: Response status code to 200
AND: Połączenie pozostaje otwarte (nie zamyka się natychmiast)

### AC-2: Proxy eventów z Bridge SSE gdy Bridge działa
GIVEN: Bridge server działa na `BRIDGE_URL` (default: `http://localhost:8199`) i obsługuje `GET /events` jako SSE
WHEN: Klient połączy się do `/api/events`
THEN: Proxy nawiązuje upstream połączenie do `${BRIDGE_URL}/events`
AND: Każdy event odebrany z Bridge jest natychmiast forwarded do klienta w formacie:
  ```
  data: {"type":"story_advanced","story_id":"STORY-1.1","status":"REVIEW","model":"sonnet"}\n\n
  ```
AND: Opóźnienie między emisją eventu przez Bridge a dostarczeniem do klienta < 500ms

### AC-3: Fallback heartbeat gdy Bridge nie ma SSE lub nie działa
GIVEN: Bridge server nie istnieje, nie działa, lub nie zwraca SSE (np. zwraca 404 lub timeout w ciągu 3s)
WHEN: Klient połączy się do `/api/events`
THEN: Endpoint wysyła heartbeat co 15 sekund:
  ```
  data: {"type":"heartbeat"}\n\n
  ```
AND: Heartbeat jest wysyłany bez przerwy dopóki klient jest połączony
AND: Żaden błąd nie jest propagowany do klienta (połączenie trwa)

### AC-4: Reconnect logic po zerwaniu połączenia z Bridge
GIVEN: Proxy aktywnie proxuje eventy z Bridge (Bridge działa)
WHEN: Połączenie z Bridge zostaje zerwane (np. Bridge crash, network error)
THEN: Proxy NIE zamyka połączenia z klientem
AND: Proxy czeka 3 sekundy (dokładnie 3000ms)
AND: Proxy ponawia próbę połączenia z Bridge
AND: Proxy ponawia maksymalnie 5 razy (po 5. nieudanej próbie przełącza się na heartbeat fallback)
AND: Licznik retry resetuje się do 0 gdy połączenie z Bridge zostanie pomyślnie przywrócone

### AC-5: Cleanup gdy klient rozłączy się
GIVEN: Klient jest połączony do `/api/events` i proxy aktywnie strumieniuje eventy
WHEN: Klient rozłączy się (zamknięcie karty, nawigacja away, `EventSource.close()`)
THEN: `request.signal` emituje zdarzenie `abort`
AND: Handler wykrywa `request.signal.aborted === true`
AND: Upstream fetch do Bridge jest przerywany (jeśli aktywny)
AND: Heartbeat interval jest czyszczony (jeśli aktywny)
AND: Retry timeout jest czyszczony (jeśli oczekujący)
AND: Żadne zasoby (timery, open connections) nie pozostają po cleanup — brak memory leak

### AC-6: Format eventów zgodny ze specyfikacją SSE
GIVEN: Bridge emituje dowolny event JSON
WHEN: Proxy forwarduje event do klienta
THEN: Każdy event jest zakończony dokładnie `\n\n` (dwa newline)
AND: Format każdego eventu to `data: {JSON}\n\n`
AND: Żadnych dodatkowych pól SSE (`id:`, `event:`, `retry:`) nie jest dodawanych (chyba że Bridge je emituje)
AND: Wieloliniowe JSON payloady NIE są splitowane — cały JSON w jednej linii `data:`

---

## ⚙️ Szczegóły Backend

### Endpoint
```
METHOD: GET
Path: /api/events
Auth: brak (endpoint publiczny w fazie MVP — auth dodane w EPIC-3)
Runtime: nodejs (NIE edge — dodaj export const runtime = 'nodejs' na górze pliku)
```

### Request Schema
Brak body. Brak query params. Endpoint nie wymaga żadnych danych wejściowych.

### Response Schema

```typescript
// Strumień SSE — nie ma jednego response body
// Każdy event to linia w strumieniu:
// data: {JSON payload}\n\n

// Typy eventów które mogą pojawić się w strumieniu:
interface StoryAdvancedEvent {
  type: "story_advanced"
  story_id: string    // format: "STORY-N.N"
  status: "IN_PROGRESS" | "REVIEW" | "DONE" | "REFACTOR"
  model: string       // np. "sonnet", "codex"
}

interface HeartbeatEvent {
  type: "heartbeat"
}

// HTTP kody:
// 200 — połączenie SSE otwarte (jedyny możliwy)
// Błędy nie są zwracane przez HTTP status — połączenie trwa lub się zamyka
```

### Zmienne środowiskowe
```bash
BRIDGE_URL=http://localhost:8199  # default gdy nie ustawione
# Endpoint upstream: ${BRIDGE_URL}/events
```

### Logika biznesowa (krok po kroku)

```
KROK 1 — Inicjalizacja ReadableStream i response
  1a. Utwórz ReadableStream z kontrolerem: new ReadableStream({ start(controller) { ... } })
  1b. W funkcji start() zdefiniuj encoder = new TextEncoder()
  1c. Zdefiniuj helper sendEvent(data: string):
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))
  1d. Zdefiniuj zmienne stanu:
        let retryCount = 0
        const MAX_RETRIES = 5
        const RETRY_DELAY_MS = 3000
        const HEARTBEAT_INTERVAL_MS = 15000
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null
        let aborted = false

KROK 2 — Obsługa abort sygnału klienta
  2a. request.signal.addEventListener('abort', () => {
        aborted = true
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        try { controller.close() } catch (_) {}
      })

KROK 3 — Próba połączenia z Bridge (funkcja connectToBridge)
  3a. Zdefiniuj async function connectToBridge():
        if (aborted) return  // klient już odłączony
  3b. Wywołaj fetch(`${BRIDGE_URL}/events`, {
          signal: request.signal,
          headers: { Accept: 'text/event-stream' }
        })
  3c. Jeśli fetch rzuci błąd (ConnectError, ECONNREFUSED, timeout) LUB response.ok === false:
        → przejdź do KROK 5 (retry logic)
  3d. Jeśli response.ok === true i Content-Type zawiera 'text/event-stream':
        → przejdź do KROK 4 (streaming z Bridge)
  3e. Jeśli response.ok === true ale Content-Type NIE zawiera 'text/event-stream':
        → Bridge nie obsługuje SSE → przejdź do KROK 6 (heartbeat fallback)

KROK 4 — Streaming eventów z Bridge
  4a. Pobierz reader = response.body!.getReader()
  4b. Pętla:
        const { done, value } = await reader.read()
        if (done || aborted) break
        Dekoduj value (Uint8Array) do string przez TextDecoder
        Dla każdej linii w zdekodowanym stringu:
          - Jeśli linia zaczyna się od 'data: ' → przekaż cały surowy string do klienta
            (NIE parsuj i NIE re-serialize — forward 1:1)
          - Jeśli linia to '\n' lub pusta → forward do klienta (SSE delimiter)
  4c. Gdy reader zwróci done=true (Bridge zamknął połączenie):
        reader.releaseLock()
        retryCount = 0  // reset retry counter — Bridge był dostępny
        → przejdź do KROK 5 (retry po rozłączeniu)

  UWAGA: Jeśli Bridge wysyła eventy jako pełne "data: JSON\n\n" chunki,
  możesz je forwardować bezpośrednio bez parsowania linii po linii.
  Jeśli Bridge wysyła inaczej — zbuduj bufor i emituj pełne eventy.

KROK 5 — Retry logic
  5a. if (aborted) return  // klient odłączony w międzyczasie
  5b. if (retryCount >= MAX_RETRIES):
        → przejdź do KROK 6 (heartbeat fallback — Bridge niedostępny)
  5c. retryCount++
  5d. Poczekaj RETRY_DELAY_MS (3000ms): await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
  5e. if (aborted) return  // sprawdź ponownie po wait
  5f. → wróć do KROK 3 (connectToBridge)

KROK 6 — Heartbeat fallback
  6a. if (aborted) return
  6b. Wyślij natychmiast pierwszy heartbeat:
        sendEvent(JSON.stringify({ type: 'heartbeat' }))
  6c. Uruchom interval:
        heartbeatTimer = setInterval(() => {
          if (aborted) { clearInterval(heartbeatTimer!); return }
          try {
            sendEvent(JSON.stringify({ type: 'heartbeat' }))
          } catch (_) {
            clearInterval(heartbeatTimer!)
          }
        }, HEARTBEAT_INTERVAL_MS)

KROK 7 — Uruchomienie
  7a. W funkcji start() wywołaj connectToBridge() (bez await — async fire-and-forget)
  7b. Funkcja start() zwraca synchronicznie

KROK 8 — Return Response
  8a. Poza ReadableStream, zbuduj Response:
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          }
        })
```

### Pełna struktura pliku `src/app/api/events/route.ts`

```typescript
// Na górze pliku — WYMAGANE dla Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BRIDGE_URL = process.env.BRIDGE_URL ?? 'http://localhost:8199'

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // ... cała logika z kroków 1-7
    }
  })
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }
  })
}
```

---

## ⚠️ Edge Cases

### EC-1: Bridge startuje w trakcie heartbeat fallback
Scenariusz: Klient połączył się gdy Bridge był niedostępny → fallback heartbeat aktywny → Bridge startuje
Oczekiwane zachowanie: Ta story NIE wymaga automatycznego przełączenia z heartbeat do SSE. Heartbeat trwa do momentu odłączenia klienta. Klient (EventSource w przeglądarce) można skonfigurować żeby reconnectował się, co spowoduje nowe połączenie które już trafi na działający Bridge. Upgrade fallback→SSE jest w STORY-2.4 (wiring).

### EC-2: Bardzo duże eventy z Bridge (payload > 64KB)
Scenariusz: Bridge emituje event z dużym payload JSON
Oczekiwane zachowanie: Stream nie buforuje — forward chunkami przez ReadableStream. TextDecoder może otrzymać niepełny chunk → należy akumulować bufor stringowy i emitować dopiero po `\n\n` delimiter.
Implementacja: `let buffer = ''` → dodawaj zdekodowane chunki → split na `\n\n` → emituj kompletne eventy → resztę trzymaj w buforze.

### EC-3: Bridge wysyła keep-alive komentarze (`:heartbeat`)
Scenariusz: Bridge wysyła SSE komentarze (linie zaczynające się od `:`) jako keep-alive
Oczekiwane zachowanie: Komentarze są forwardowane 1:1 do klienta (to poprawny SSE — przeglądarka je ignoruje). NIE interpretuj komentarzy jako eventów.

### EC-4: Wielokrotne równoczesne połączenia klientów
Scenariusz: Wielu użytkowników (w praktyce jeden — ale testy mogą otwierać więcej) połączy się równocześnie
Oczekiwane zachowanie: Każde połączenie tworzy niezależny proxy do Bridge. Każde ma własny retryCount, heartbeatTimer. Rozłączenie jednego klienta NIE wpływa na inne. Brak shared state między requestami.

### EC-5: Next.js hot reload podczas development
Scenariusz: Developer zapisuje plik → Next.js hot reload → stary handler jest niszczony
Oczekiwane zachowanie: Eventy `abort` są emitowane na request.signal podczas hot reload → cleanup uruchamia się poprawnie → brak zombie connections. W production nie dotyczy.

### EC-6: Bridge odpowiada wolno (np. 10s zanim zacznie streamować)
Scenariusz: Fetch do Bridge `GET /events` nie zwraca pierwszego chunka przez 10s
Oczekiwane zachowanie: Przez te 10s klient widzi otwarte połączenie ale bez danych. To akceptowalne. Opcjonalnie: timeout 5s na pierwsze dane → przejście do fallback. Decyzja implementacyjna — dodaj AbortController z timeoutem 5s dla initial fetch jeśli UX wymaga.

---

## 🚫 Out of Scope tej Story
- Parsowanie i interpretacja eventów SSE po stronie klienta — to STORY-2.4 (wiring hook)
- Autentykacja / autoryzacja endpointu — to EPIC-3
- Automatyczne przełączenie z heartbeat fallback z powrotem do SSE gdy Bridge wróci — to STORY-2.4
- Testowanie z prawdziwym Bridge SSE endpointem (Bridge może go jeszcze nie mieć) — ta story działa niezależnie dzięki fallback
- Filtrowanie eventów po typie — endpoint proxuje wszystko
- Zapisywanie historii eventów do bazy danych

---

## ✔️ Definition of Done
- [ ] Plik `src/app/api/events/route.ts` istnieje
- [ ] `export const runtime = 'nodejs'` i `export const dynamic = 'force-dynamic'` są na górze pliku
- [ ] `curl -N http://localhost:3000/api/events` zwraca 200 z poprawnym `Content-Type: text/event-stream`
- [ ] Gdy Bridge nie działa: po max 5 retry (łącznie ~15s oczekiwania) endpoint wysyła heartbeat co 15s
- [ ] Gdy Bridge działa i ma SSE `/events`: eventy są forwardowane 1:1
- [ ] Rozłączenie klienta (Ctrl+C w curl) nie zostawia zombie timerów ani unclosed streams
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem
- [ ] Endpoint nie crashuje na pustej bazie / niedostępnym Bridge
- [ ] Kod przechodzi linter bez błędów (`npm run lint` bez błędów)
- [ ] TypeScript kompiluje bez błędów (`tsc --noEmit`)
- [ ] `BRIDGE_URL` env var jest używane (brak hardcoded URL)
- [ ] Story review przez PO
