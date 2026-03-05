---
epic_id: EPIC-2
title: "Real-time — SSE Bridge Stream, Toast Overlay, Write Operations"
module: realtime
status: draft
priority: should
estimated_size: M
risk: medium
---

## 📋 OPIS

EPIC-2 rozszerza istniejący SSE stream LobsterBoard (system monitoring) o nowy kanał zdarzeń z Bridge API — story status changes, gate pass/fail, NightClaw events. Dodaje toast overlay na dashboard (CSS overlay nad widgetami) do wyświetlania powiadomień w czasie rzeczywistym, oraz endpointy write operations umożliwiające Mariuszowi zaawansowanie story i triggerowanie eval bezpośrednio z dashboardu. Wszystkie React pages mogą subskrybować te eventy przez hook `useSSE`.

## 🎯 CEL BIZNESOWY

Mariusz widzi zmiany statusów stories i gate pass/fail na dashboardzie w czasie rzeczywistym — bez odświeżania strony — co eliminuje potrzebę monitorowania Bridge CLI w terminalu.

## 👤 PERSONA

**Mariusz (Admin)** — pracuje przy KiraBoard otwartym na drugim monitorze. Gdy Codex kończy story, chce zobaczyć toast "STORY-6.3 ✅ DONE" bez ręcznego sprawdzania. Gdy gate lint fail, chce red toast z detalami. Chce też móc kliknąć "Advance" na story bezpośrednio z widgetu pipeline-status.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Bridge API proxy, `kb_story_gates` tabela, server.cjs z SSE foundation (już istnieje w LobsterBoard dla system stats)
- EPIC-1: Widgety `pipeline-status` i `service-health` muszą istnieć jako UI targets dla live updates

### Blokuje (ten epic odblokowuje):
- EPIC-6: Pipeline page używa write operations (`/api/bridge/stories/:id/advance`) i SSE dla live updates
- EPIC-4: Home page może subskrybować eventy dot. shopping/tasks przez ten sam SSE channel

## 📦 ZAKRES (In Scope)

- **SSE Bridge event stream** — nowy endpoint `GET /api/bridge/stream` w `server.cjs`: proxy do Bridge event stream (jeśli Bridge ma SSE) lub polling Bridge API co 5s i emitowanie diff eventów; eventy: `story_status_changed`, `gate_updated`, `run_started`, `run_finished`, `nightclaw_started`, `nightclaw_finished`
- **Toast overlay system** — CSS overlay w `js/toast.js` widoczny nad wszystkimi widgetami: kolejka notyfikacji (max 3 jednocześnie), typy: success/error/info/warning, auto-dismiss 5s, kliknięcie = dismiss, przycisk "Clear All"
- **Client-side SSE subscription** — `js/sse-client.js`: połączenie do `/api/bridge/stream`, auto-reconnect (exponential backoff), dispatch event do DOM, aktualizacja widgetów `pipeline-status` i `service-health` bez pełnego reload
- **Write operations** — nowe proxy endpointy w `server.cjs` (requireRole admin): `POST /api/bridge/stories/:id/advance` → Bridge CLI; `POST /api/bridge/eval/trigger` → Bridge API; odpowiedź → toast success/error
- **Gate events** — `POST /api/gates/update` (z EPIC-0.16) emituje event do SSE klientów via EventEmitter; toast "Gate TEST ✅ PASS dla STORY-6.3"
- **Optimistic UI dla pipeline-status widget** — po write operation widget natychmiast aktualizuje liczniki (przed potwierdzeniem z Bridge), rollback jeśli error

## 🚫 POZA ZAKRESEM (Out of Scope)

- **WebSocket** — tylko SSE (one-way server → client); dwukierunkowa komunikacja przez HTTP POST
- **Push notifications (PWA/mobile)** — toast jest desktop only; mobile notifications to potencjalnie EPIC-4 lub future
- **Supabase Realtime** — Real-time przez Supabase to EPIC-12; tu focus na local SSE
- **Alert rules system** — konfiguracja alertów (threshold → email) to future; tu tylko wyświetlanie eventów

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Gdy Bridge zmienia status story, toast pojawia się na dashboardzie w ≤ 5 sekund bez odświeżania strony
- [ ] Toast overlay wyświetla się poprawnie nad widgetami na pełnym ekranie (z-index, positioning), auto-dismisses po 5s
- [ ] `POST /api/bridge/stories/:id/advance` z poprawnym JWT → story status zmienia się w Bridge, toast "Story advanced ✅"
- [ ] Po utraceniu połączenia SSE klient automatycznie próbuje reconnect (exponential backoff, max 30s)
- [ ] Widget `pipeline-status` aktualizuje liczniki po SSE event `story_status_changed` bez pełnego reload strony
- [ ] Gate event `gate_updated` generuje toast z nazwą gate, story ID i statusem (PASS/FAIL/SKIP)

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-2.1 | backend | SSE Bridge stream endpoint + event emitter | Endpoint `GET /api/bridge/stream` emitujący eventy z Bridge (polling diff lub proxy) + wewnętrzny EventEmitter do rozprowadzania eventów gate z EPIC-0.16 |
| STORY-2.2 | backend | Write operations proxy — advance story + trigger eval | Endpointy `POST /api/bridge/stories/:id/advance` i `POST /api/bridge/eval/trigger` z requireRole(admin), Bridge CLI wrapper, response → event emission |
| STORY-2.3 | frontend | Toast overlay system | CSS/JS toast overlay: kolejka notyfikacji, typy (success/error/info/warning), auto-dismiss 5s, stack max 3 |
| STORY-2.4 | frontend | SSE client + widget live update | `js/sse-client.js` z auto-reconnect, dispatch do DOM, aktualizacja widgetów `pipeline-status` i `service-health` bez reload |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | realtime |
| Priorytet | Should |
| Szacunek | M (3 dni) |
| Ryzyko | Średnie — SSE polling Bridge może być niestabilny jeśli Bridge nie ma własnego event stream; potrzeba fallback na polling |
| Domeny | backend, frontend |
| Stack | Node.js EventEmitter, SSE (Server-Sent Events native API), Vanilla JS (brak React w core LobsterBoard), CSS overlay |
| Uwagi | LobsterBoard już ma SSE `/api/stats/stream` dla system monitoring — wzoruj się na tej implementacji. Nowy endpoint to osobny stream tylko dla Bridge events. |
