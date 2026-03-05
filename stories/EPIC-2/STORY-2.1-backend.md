---
story_id: STORY-2.1
title: "SSE endpoint /api/bridge/stream — Bridge event broadcast"
epic: EPIC-2
module: realtime
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-0.2, STORY-0.9]
blocks: [STORY-2.2, STORY-2.4]
tags: [sse, realtime, bridge, event-emitter, node]
---

## 🎯 User Story

**Jako** Mariusz (Admin) patrzący na KiraBoard na drugim monitorze
**Chcę** żeby dashboard automatycznie otrzymywał zdarzenia z Bridge w czasie rzeczywistym
**Żeby** widzieć zmiany statusów stories, gate pass/fail i uruchomienia pipeline bez odświeżania strony

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Serwer: `server.cjs` (Node.js/Express, już istniejący)
- Nowy endpoint: `GET /api/bridge/stream`
- Istniejący wzorzec SSE: `GET /api/stats/stream` (system monitoring — wzoruj się na tej implementacji)
- EventEmitter: nowy globalny `bridgeEventEmitter` w `server.cjs` — współdzielony z endpointami gate (`/api/gates/update` z EPIC-0.16)

### Powiązane pliki
- `server.cjs` — główny plik serwera, tu dodajemy endpoint
- `bridge.yml` — konfiguracja Bridge CLI (URL base, auth)
- `epics/EPIC-2.md` — pełna specyfikacja

### Stan systemu przed tą story
- STORY-0.2 gotowa: `/api/bridge/*` proxy działa, `bridge.yml` skonfigurowany
- STORY-0.9 gotowa: `server.cjs` ma rozszerzenia (requireRole, middleware)
- Istniejący `/api/stats/stream` działa — jest wzorzec SSE w kodzie

---

## ✅ Acceptance Criteria

### AC-1: Połączenie SSE ustanawiane poprawnie
GIVEN: Klient wysyła `GET /api/bridge/stream` z ważnym JWT (rola: admin)
WHEN: Serwer obsługuje żądanie
THEN: Serwer zwraca odpowiedź z nagłówkami `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
AND: Połączenie pozostaje otwarte (długotrwałe)
AND: Serwer wysyła co 30s heartbeat `event: ping\ndata: {}\n\n` żeby utrzymać połączenie przez proxy

### AC-2: Bridge polling i emisja eventów
GIVEN: Endpoint `/api/bridge/stream` jest aktywny i ma co najmniej jednego klienta
WHEN: Upływa 5 sekund od ostatniego pobrania statusu z Bridge
THEN: Serwer wywołuje Bridge API (`GET /api/status` lub Bridge CLI) i wykrywa zmiany statusów stories/epiców
AND: Dla każdej zmiany emituje event SSE w formacie:
```
event: story_status_changed
data: {"story_id": "STORY-1.3", "old_status": "in_progress", "new_status": "review", "timestamp": "2026-03-05T16:00:00Z"}
```
AND: Eventy różnicowe (tylko zmiany, nie cały stan)

### AC-3: Typy eventów — pełna lista
GIVEN: Bridge API zwraca dane o zmianie
WHEN: Serwer wykrywa zmianę
THEN: Serwer emituje jeden z eventów:
- `story_status_changed` — zmiana statusu story (data: story_id, old_status, new_status)
- `gate_updated` — zmiana statusu gate (data: gate_name, story_id, status: PASS|FAIL|SKIP)
- `run_started` — start agenta (data: story_id, agent, model)
- `run_finished` — koniec agenta (data: story_id, agent, result: success|error)
- `nightclaw_started` / `nightclaw_finished` — NightClaw events (data: timestamp)

### AC-4: Brak autoryzacji — odrzucenie
GIVEN: Klient wysyła `GET /api/bridge/stream` bez tokena JWT lub z nieważnym tokenem
WHEN: Serwer obsługuje żądanie
THEN: Serwer zwraca `401 Unauthorized` z body `{"error": "Unauthorized"}`
AND: Połączenie SSE NIE jest ustanawiane

### AC-5: Cleanup po rozłączeniu klienta
GIVEN: Klient SSE jest podłączony i pobiera eventy
WHEN: Klient rozłącza połączenie (zamknięcie karty, reload)
THEN: Serwer wykrywa rozłączenie przez `req.on('close', ...)`
AND: Klient jest usuwany z listy aktywnych klientów
AND: Jeśli nie ma żadnych klientów — polling Bridge jest pauzowany (nie wykonuje zbędnych wywołań)

---

## ⚙️ Szczegóły Backend

### Endpoint(y)
```
METHOD: GET
Path:   /api/bridge/stream
Auth:   Bearer token (JWT)
Role:   admin
```

### Request Schema
```typescript
// Brak body — to GET z long-lived connection
// Headers:
// Authorization: Bearer <jwt>
// Accept: text/event-stream
```

### Response Schema
```
// Nagłówki:
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no

// Format eventów SSE:
event: <typ_eventu>
data: <JSON string>
id: <inkrementalne ID>

\n\n (double newline kończy każdy event)

// Heartbeat co 30s:
event: ping
data: {}

// Błędy:
HTTP/1.1 401 Unauthorized
{ "error": "Unauthorized" }
```

### Logika biznesowa (krok po kroku)
```
1. Sprawdź JWT → brak/nieważny? zwróć 401 i zakończ
2. Sprawdź rolę → nie admin? zwróć 403
3. Ustaw nagłówki SSE (Content-Type, Cache-Control, Connection, X-Accel-Buffering)
4. Dodaj klienta do globalnej listy `sseClients[]`
5. Zarejestruj nasłuchiwanie na bridgeEventEmitter('bridge_event') → write to client
6. Zarejestruj cleanup: req.on('close') → usuń klienta z listy
7. Jeśli nie ma polling interval → uruchom Bridge polling (co 5s)
8. [Polling loop]:
   a. Pobierz aktualny stan z Bridge CLI: `python -m bridge.cli status --json`
   b. Porównaj z poprzednim stanem (zapisanym w pamięci)
   c. Dla każdej zmiany → emit event przez bridgeEventEmitter
   d. Zaktualizuj snapshot poprzedniego stanu
9. Heartbeat: co 30s wysyłaj `event: ping\ndata: {}\n\n` do każdego klienta
10. Gdy last client rozłączony → clearInterval(pollingInterval)
```

### Implementacja bridgeEventEmitter
```javascript
// W server.cjs — globalny EventEmitter do współdzielenia z gate endpoints
const { EventEmitter } = require('events');
const bridgeEventEmitter = new EventEmitter();

// Obsługa eventu 'bridge_event':
bridgeEventEmitter.on('bridge_event', (eventData) => {
  // Rozsyłaj do wszystkich połączonych klientów SSE
  sseClients.forEach(client => {
    client.write(`event: ${eventData.type}\ndata: ${JSON.stringify(eventData)}\nid: ${eventData.id}\n\n`);
  });
});
```

### Porównanie stanu Bridge (diff algorithm)
```
// Snapshot = mapa { story_id → status }
// Przy każdym pollingu:
// - nowe story? → emit run_started lub story_status_changed z old_status: null
// - story zniknęła? → emit story_status_changed z new_status: null (rzadkie)
// - zmieniony status? → emit story_status_changed z old i new status
// - zmieniony gate status? → emit gate_updated
```

---

## ⚠️ Edge Cases

### EC-1: Bridge CLI niedostępny
Scenariusz: Bridge proces jest zatrzymany lub zwraca błąd podczas pollingu
Oczekiwane zachowanie: Serwer loguje błąd do konsoli, emituje event `{"type": "bridge_error", "message": "Bridge unreachable"}` do klientów SSE, retry po 15s (zamiast 5s)
Komunikat dla klienta SSE: `event: bridge_error\ndata: {"message": "Bridge temporarily unavailable"}`

### EC-2: Wielu klientów jednocześnie
Scenariusz: 3+ klientów SSE podłączonych jednocześnie (np. Mariusz ma 2 okna)
Oczekiwane zachowanie: Każdy event wysyłany do wszystkich klientów; polling działa JEDEN raz (nie per klient); usunięcie jednego klienta nie przerywa pozostałych

### EC-3: Restart serwera z aktywnymi klientami
Scenariusz: Serwer restartuje się gdy klienci są podłączeni
Oczekiwane zachowanie: Połączenia są rozrywane; klienci (STORY-2.2) wykrywają disconnect i próbują reconnect z exponential backoff

### EC-4: Brak zmian przez długi czas
Scenariusz: Bridge nie raportuje żadnych zmian przez 10+ minut (pipeline idle)
Oczekiwane zachowanie: Polling kontynuuje w tle (co 5s), heartbeat `ping` wysyłany co 30s utrzymuje połączenie, brak zbędnych eventów

---

## 🚫 Out of Scope tej Story
- Client-side EventSource / hook (to STORY-2.2)
- Toast overlay (to STORY-2.3)
- Write operations (to STORY-2.4)
- WebSocket (out of scope całego EPIC-2)
- Supabase Realtime integration (EPIC-12)

---

## ✔️ Definition of Done
- [ ] Endpoint `GET /api/bridge/stream` zwraca SSE headers i utrzymuje długotrwałe połączenie
- [ ] `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/bridge/stream` wyświetla eventy w terminalu
- [ ] 401 zwracane dla żądań bez tokena
- [ ] Polling Bridge co 5s (nie częściej), pauzowany gdy brak klientów
- [ ] Heartbeat `ping` co 30s na każde połączenie
- [ ] Cleanup klientów przy disconnect (brak memory leak)
- [ ] `bridgeEventEmitter` wyeksportowany/dostępny dla endpointów gate
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
