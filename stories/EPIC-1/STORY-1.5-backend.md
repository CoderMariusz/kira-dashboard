---
story_id: STORY-1.5
title: "Widget service-health — konsumuje /api/health-check (Dashy-inspired)"
epic: EPIC-1
module: widgets
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-0.11
blocks: none
tags: widget, dashboard, service-health, health-check, dashy
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć widget `service-health` na dashboardzie
**Żeby** natychmiast zobaczyć status Bridge, OpenClaw i Supabase z latency w ms — bez zaglądania do logów czy terminala

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` lub `widgets/service-health.js`
- Dane: `GET /api/health-check` (STORY-0.11) — już istniejący endpoint
- Widget NIE tworzy własnego endpointu — konsumuje `/api/health-check` bezpośrednio
- Inspiracja: **Dashy service health widget** — lista serwisów z badge up/down + latency

### Powiązane pliki
- `server.cjs` — rejestracja widgetu
- STORY-0.11: `/api/health-check` — musi być gotowe przed tą story
- `archive/` — READ ONLY: wzorzec list-style widgetów

### Stan systemu przed tą story
- STORY-0.11 gotowe: `/api/health-check` zwraca status per serwis z latency

### Format /api/health-check (oczekiwany):
```json
{
  "services": {
    "bridge": { "status": "up", "latency_ms": 12 },
    "openclaw": { "status": "up", "latency_ms": 8 },
    "supabase": { "status": "down", "latency_ms": null }
  },
  "overall": "degraded",
  "checked_at": "2026-03-05T16:00:00Z"
}
```

---

## ✅ Acceptance Criteria

### AC-1: Widget pojawia się w gallery
GIVEN: Mariusz zalogowany jako Admin
WHEN: Otwiera widget gallery
THEN: Widget `service-health` widoczny jako "Service Health" z ikoną serca / checkmark

### AC-2: Lista serwisów z badge up/down
GIVEN: `/api/health-check` zwraca dane dla Bridge (up), OpenClaw (up), Supabase (down)
WHEN: Widget załadowany
THEN: Wyświetla listę:
  - 🟢 Bridge — 12ms
  - 🟢 OpenClaw — 8ms
  - 🔴 Supabase — DOWN
AND: Kolory: zielony dla "up", czerwony dla "down", żółty dla "degraded"

### AC-3: Overall status w headerze
GIVEN: Co najmniej jeden serwis jest down
WHEN: Widget wyświetlony
THEN: Header widgetu pokazuje "Service Health ⚠️ DEGRADED" lub "Service Health ✅ ALL OK"
AND: Jeśli wszystkie up → header zielony; degraded → żółty; all down → czerwony

### AC-4: Auto-refresh co 30 sekund
GIVEN: Widget załadowany
WHEN: Mija 30 sekund
THEN: Widget cicho ponownie wywołuje `/api/health-check` i aktualizuje status + latency bez mignięcia (smooth update)

### AC-5: Latency w ms wyświetlana
GIVEN: Serwis odpowiada z measurable latency
WHEN: Widget wyświetlony
THEN: Latency formatowana jako "Xms" (np. "12ms"); jeśli null (serwis down) → pokaż "-"

---

## ⚙️ Szczegóły Backend

### Endpoint (REUSE — nie tworzy nowego)
```
GET /api/health-check   ← z STORY-0.11, konsumowany bezpośrednio przez widget JS
```
Widget `generateJs()` wywołuje `/api/health-check` z przeglądarki (client-side fetch).

### Widget `generateHtml()`
```javascript
// Layout: pionowa lista serwisów (3 wiersze)
// Każdy wiersz: [ikona statusu] [nazwa serwisu] [latency lub DOWN]
// Header: "Service Health" + overall status badge
// Footer: "Last checked: HH:MM:SS" (aktualizowany przy każdym refresh)
// Rozmiar: 1x2 (wąski, pionowy) lub 2x1
// Style: Dashy-inspired — minimalistyczne, czytelne, dense
```

### Widget `generateJs()`
```javascript
// Przy załadowaniu: fetch /api/health-check
// Render listy serwisów z badge + latency
// setInterval co 30 sekund → re-fetch + smooth DOM update (bez flash)
// Loading state: skeleton wiersze podczas pierwszego fetch
// Error state: jeśli /api/health-check sam jest niedostępny → "Health check unavailable"
// Transition: zmiana statusu → briefly flash badge (CSS transition)
```

### Konfiguracja (opcjonalna, hardcoded na start)
```javascript
const SERVICE_HEALTH_CONFIG = {
  refresh_interval_ms: 30 * 1000,  // 30s
  services_order: ["bridge", "openclaw", "supabase"],  // kolejność wyświetlania
}
```

---

## ⚠️ Edge Cases

### EC-1: `/api/health-check` niedostępny (server.cjs crash)
Scenariusz: Sam endpoint health-check jest down
Oczekiwane zachowanie: Widget pokazuje "Health check unavailable" z czerwonym badge
Komunikat dla użytkownika: "Cannot reach health check endpoint"

### EC-2: Nowy serwis w health-check (nie na liście)
Scenariusz: `/api/health-check` zwraca nowy serwis "redis"
Oczekiwane zachowanie: Widget renderuje go automatycznie poniżej znanych 3 serwisów (iteruje po wszystkich kluczach `services`)

### EC-3: Latency spike (np. 3000ms)
Scenariusz: Supabase odpowiada ale po 3000ms (timeout, nie down)
Oczekiwane zachowanie: Status = "up" ale latency = "3000ms" wyświetlone czerwono (latency > 1000ms → czerwony kolor tekstu)

### EC-4: Status zmienia się między refreshami
Scenariusz: Bridge był up, teraz jest down
Oczekiwane zachowanie: Badge płynnie zmienia kolor (CSS transition 0.3s), nie miga agresywnie

---

## 🚫 Out of Scope tej Story
- Konfiguracja listy serwisów z UI (poza scope — hardcoded)
- Historia uptime (% uptime per serwis) — to EPIC-7 lub EPIC-12
- Alert/notification gdy serwis spada (to oddzielny mechanizm)
- Ping custom URL z UI (to Dashy feature, nie nasz scope)

---

## ✔️ Definition of Done
- [ ] Widget rejestruje się w gallery jako "Service Health"
- [ ] Lista serwisów z badge (zielony/czerwony/żółty) i latency w ms
- [ ] Header z overall status (ALL OK / DEGRADED / ALL DOWN)
- [ ] Auto-refresh co 30s bez przeładowania widgetu
- [ ] Latency > 1000ms → czerwony kolor latency tekstu
- [ ] `/api/health-check` niedostępny → graceful "Health check unavailable"
- [ ] Nowe serwisy z endpointu renderują się automatycznie
- [ ] Kod przechodzi linter bez błędów
