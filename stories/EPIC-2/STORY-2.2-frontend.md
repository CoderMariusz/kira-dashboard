---
story_id: STORY-2.2
title: "SSE client — EventSource hook + auto-reconnect + widget live update"
epic: EPIC-2
module: realtime
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-2.1]
blocks: [STORY-2.3]
tags: [sse, eventsource, auto-reconnect, vanilla-js, pipeline-status, widget]
---

## 🎯 User Story

**Jako** Mariusz patrzący na KiraBoard
**Chcę** żeby widgety `pipeline-status` i `service-health` automatycznie aktualizowały się gdy Bridge zmienia statusy stories
**Żeby** nie musieć odświeżać strony i mieć zawsze aktualny obraz pipeline

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `js/sse-client.js` (nowy plik w projekcie)
- Ładowany w: `index.html` (główna strona dashboardu) jako `<script src="js/sse-client.js">`
- Stack: Vanilla JS (brak React/Vue — LobsterBoard używa czystego JS)
- Endpoint który konsumuje: `GET /api/bridge/stream` (STORY-2.1)
- Widgety które aktualizuje: `#pipeline-status-widget`, `#service-health-widget`

### Powiązane pliki
- `js/sse-client.js` — NOWY plik (tworzony w tej story)
- `index.html` — dodaj `<script>` tag dla nowego pliku
- `js/widgets/pipeline-status.js` — istniejący widget, dodaj metodę `updateFromSSE(eventData)`
- `js/widgets/service-health.js` — istniejący widget, dodaj metodę `updateFromSSE(eventData)`
- `epics/EPIC-2.md` — specyfikacja

### Stan systemu przed tą story
- STORY-2.1 gotowa: `GET /api/bridge/stream` działa i emituje eventy SSE
- Widgety `pipeline-status` i `service-health` istnieją (EPIC-1) i renderują dane statycznie
- Użytkownik jest zalogowany — JWT token dostępny w `localStorage` lub cookie

---

## ✅ Acceptance Criteria

### AC-1: Automatyczne połączenie po załadowaniu strony
GIVEN: Użytkownik otwiera KiraBoard dashboard (`/`)
WHEN: Strona się ładuje (`DOMContentLoaded`)
THEN: `sse-client.js` automatycznie inicjuje `EventSource` do `/api/bridge/stream` z headerem Authorization (lub przez `?token=` query param jeśli EventSource nie wspiera headers)
AND: W konsoli przeglądarki pojawia się log `[SSE] Connected to /api/bridge/stream`
AND: Zielony wskaźnik "Live" pojawia się w nagłówku dashboardu (klasa CSS `sse-connected`)

### AC-2: Obsługa eventów — aktualizacja widgetów
GIVEN: Połączenie SSE jest aktywne
WHEN: Serwer wysyła event `story_status_changed` z `{"story_id": "STORY-1.3", "new_status": "review"}`
THEN: Widget `pipeline-status` natychmiast aktualizuje liczniki (np. IN_PROGRESS -1, REVIEW +1) bez pełnego reload
AND: DOM elementu `#pipeline-status-widget` jest aktualizowany (nie przeładowywany)
AND: Dispatch zdarzenia `CustomEvent('sse:story_status_changed', { detail: eventData })` na `document` — do konsumpcji przez inne komponenty (np. toast system)

### AC-3: Obsługa wszystkich typów eventów
GIVEN: Połączenie SSE jest aktywne
WHEN: Serwer wysyła dowolny z eventów: `story_status_changed`, `gate_updated`, `run_started`, `run_finished`, `nightclaw_started`, `nightclaw_finished`
THEN: Każdy event jest parsowany (JSON.parse) i dispatchowany jako `CustomEvent` na `document`
AND: Widget odpowiednio reaguje (patrz tabela mapowania niżej)
AND: Nieznany typ eventu jest logowany jako warning, nie crashuje klienta

### AC-4: Auto-reconnect z exponential backoff
GIVEN: Aktywne połączenie SSE zostaje przerwane (serwer restartuje, utrata sieci)
WHEN: `EventSource` emituje `onerror`
THEN: Klient próbuje reconnect po 2s (pierwsza próba)
AND: Kolejne próby: 4s, 8s, 16s, 30s (max), następnie co 30s aż do sukcesu
AND: Podczas prób reconnect wskaźnik "Live" zmienia się na żółty "Reconnecting..." (klasa `sse-reconnecting`)
AND: Po udanym reconnect wskaźnik wraca na zielony `sse-connected`, log `[SSE] Reconnected`

### AC-5: Wskaźnik stanu połączenia
GIVEN: Dashboard jest otwarty
WHEN: Stan połączenia SSE się zmienia
THEN: Element `#sse-status` w nagłówku wyświetla:
- 🟢 "Live" gdy połączono (`sse-connected`)
- 🟡 "Reconnecting..." gdy próba reconnect (`sse-reconnecting`)
- 🔴 "Offline" gdy brak połączenia po 3+ nieudanych próbach (`sse-disconnected`)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
```
Route: / (główna strona dashboardu)
Plik:  js/sse-client.js (NOWY)
Modyfikacje: index.html (script tag), js/widgets/pipeline-status.js, js/widgets/service-health.js
```

### Architektura `sse-client.js`

```javascript
// Klasa SSEClient — główna klasa zarządzająca połączeniem
class SSEClient {
  constructor(url, options = {})  // url: /api/bridge/stream
  connect()                        // inicjuje EventSource
  disconnect()                     // zamyka połączenie
  reconnect()                      // z backoff
  handleEvent(event)               // router do handlerów eventów
  dispatch(type, data)             // CustomEvent na document
  updateStatus(state)              // aktualizuje #sse-status
}

// Mapowanie eventów do handlerów:
const EVENT_HANDLERS = {
  story_status_changed: handleStoryStatusChanged,
  gate_updated:         handleGateUpdated,
  run_started:          handleRunEvent,
  run_finished:         handleRunEvent,
  nightclaw_started:    handleNightclawEvent,
  nightclaw_finished:   handleNightclawEvent,
  ping:                 () => {},  // heartbeat — ignoruj cicho
  bridge_error:         handleBridgeError,
};
```

### Mapowanie eventów → widget updates

| Event | Widget | Co robi |
|-------|--------|---------|
| `story_status_changed` | `pipeline-status` | Aktualizuje liczniki statusów, przesuwa story między kolumnami |
| `gate_updated` | `pipeline-status` | Aktualizuje badge gate dla danej story |
| `run_started` | `pipeline-status` | Dodaje spinner "running" przy story |
| `run_finished` | `pipeline-status`, `service-health` | Usuwa spinner, aktualizuje ostatnią aktywność |
| `nightclaw_started/finished` | `service-health` | Aktualizuje status NightClaw |

### Problem z EventSource i Authorization header
```
// EventSource API NIE obsługuje custom headers w przeglądarce
// Rozwiązania (do wyboru, preferowane pierwsze):
// 1. Token w query param: /api/bridge/stream?token=<jwt>
//    → Serwer (STORY-2.1) musi obsługiwać ?token= jako alternatywę dla Bearer
// 2. Cookie httpOnly — serwer sprawdza cookie zamiast header
// 3. Dedykowany endpoint bez auth (tylko dla localhost) — NIE zalecane

// W sse-client.js:
const token = localStorage.getItem('kira_jwt') || getCookie('kira_session');
const sseUrl = `/api/bridge/stream?token=${encodeURIComponent(token)}`;
const es = new EventSource(sseUrl);
```

### Stany wskaźnika `#sse-status`

**Connected:** `<span id="sse-status" class="sse-connected">🟢 Live</span>`
**Reconnecting:** `<span id="sse-status" class="sse-reconnecting">🟡 Reconnecting...</span>`
**Disconnected:** `<span id="sse-status" class="sse-disconnected">🔴 Offline</span>`

### Flow interakcji
```
1. DOMContentLoaded → SSEClient.connect()
2. EventSource otwiera połączenie → onerror lub onopen
3. onopen → updateStatus('connected'), log [SSE] Connected
4. onerror → updateStatus('reconnecting'), scheduleReconnect(backoff)
5. onmessage/addEventListener(type) → handleEvent(event)
6. handleEvent → dispatch CustomEvent na document
7. Widget listener → aktualizacja DOM
8. Komponent toast (STORY-2.3) nasłuchuje CustomEvent i wyświetla toast
```

### Responsive / Dostępność
- Wskaźnik `#sse-status`: widoczny w nagłówku na wszystkich rozdzielczościach
- Mobile (375px+): wskaźnik jako ikona (bez tekstu), tooltip z pełnym stanem
- Desktop (1280px+): ikona + tekst
- Nie blokuje interakcji gdy SSE offline — strona działa statycznie

---

## ⚠️ Edge Cases

### EC-1: Token JWT wygasł podczas połączenia SSE
Scenariusz: Połączenie trwa długo, token wygasł, serwer zwraca 401 przy próbie reconnect
Oczekiwane zachowanie: Klient wykrywa 401 (EventSource nie zamknie się automatycznie, ale serwer przerwie stream), ustawia stan `sse-disconnected`, wyświetla komunikat "Session expired — please refresh"
Komunikat: alert lub toast "Sesja wygasła. Odśwież stronę."

### EC-2: Błędny JSON w danych eventu
Scenariusz: Serwer wysyła event z nieprawidłowym JSON (bug w serialization)
Oczekiwane zachowanie: `try/catch` w handleEvent, log `[SSE] Parse error: <event>`, event pominięty, połączenie NIE zerwane

### EC-3: Brak elementu widgetu w DOM
Scenariusz: Widget `pipeline-status` nie jest na bieżącej stronie (inna podstrona dashboardu)
Oczekiwane zachowanie: SSE client działa na wszystkich stronach, ale aktualizuje tylko widgety które są w DOM; `document.querySelector('#pipeline-status-widget')` returns null → handler pomija update, brak błędów

### EC-4: Przeglądarka nie wspiera EventSource
Scenariusz: Stara przeglądarka bez EventSource API (rzadkie, ale możliwe)
Oczekiwane zachowanie: `if (!window.EventSource)` → wyświetl `#sse-status` jako `sse-disconnected` z tekstem "SSE not supported", graceful degradation (widgety działają bez live updates)

---

## 🚫 Out of Scope tej Story
- Toast notifications (to STORY-2.3 — ta story tylko emituje CustomEvent)
- SSE endpoint server-side (to STORY-2.1)
- Write operations (to STORY-2.4)
- Aktualizacja widgetów z EPIC-1 wewnątrz tej story (tylko metoda `updateFromSSE` — nie full refactor)

---

## ✔️ Definition of Done
- [ ] `js/sse-client.js` istnieje i jest ładowany przez `index.html`
- [ ] Połączenie SSE nawiązywane automatycznie po załadowaniu strony
- [ ] Auto-reconnect z exponential backoff (2s → 4s → 8s → 16s → 30s max) działa
- [ ] Wskaźnik `#sse-status` zmienia kolor/tekst przy każdej zmianie stanu połączenia
- [ ] Widget `pipeline-status` aktualizuje liczniki po `story_status_changed` bez reload
- [ ] CustomEvent dispatchowany na `document` dla każdego odebranego eventu
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Graceful degradation gdy EventSource niedostępny
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
