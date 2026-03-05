---
story_id: STORY-1.4
title: "Widget morning-briefing — agregat NightClaw+tasks+shopping+weather"
epic: EPIC-1
module: widgets
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: STORY-0.2, STORY-0.3
blocks: none
tags: widget, bridge, dashboard, morning-briefing, nightclaw, agregat
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć widget `morning-briefing` na dashboardzie po porannym zalogowaniu
**Żeby** w jednym rzucie oka zobaczyć: co NightClaw zrobił w nocy, ile mam tasks na dziś, ile pozycji na liście zakupów, jaka jest pogoda i czy wszystkie serwisy działają — bez otwierania 5 różnych widgetów

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` lub `widgets/morning-briefing.js`
- Endpoint agregujący: `GET /api/bridge/morning-briefing` — wywołuje kilka źródeł równolegle
- **Unikalne dla KiraBoard** — ten widget nie istnieje w LobsterBoard

### Źródła danych (wszystkie przez istniejące proxy):
1. **NightClaw summary**: `GET /api/bridge/nightclaw/summary` (ostatni digest)
2. **Tasks today**: `GET /api/bridge/status/pipeline` (lub dedykowany endpoint tasks count)
3. **Shopping count**: `GET /api/bridge/shopping/count` (liczba pozycji na liście zakupów Angeliki)
4. **Weather**: `https://wttr.in/?format=j1` (lub cached lokalnie)
5. **System status**: `GET /api/health-check` (Bridge/OpenClaw/Supabase up/down)

### Powiązane pliki
- `server.cjs` — rejestracja widgetu + endpoint agregujący
- STORY-0.3 — endpoint `/api/health-check` (używany przez service-health i morning-briefing)
- `archive/` — READ ONLY: wzorzec multi-source widgetów

### Stan systemu przed tą story
- STORY-0.2 gotowe: proxy `/api/bridge/*` działa
- STORY-0.3 gotowe: `/api/health-check` działa

---

## ✅ Acceptance Criteria

### AC-1: Widget pojawia się w gallery
GIVEN: Mariusz zalogowany jako Admin
WHEN: Otwiera widget gallery
THEN: Widget `morning-briefing` widoczny jako "Morning Briefing" z ikoną słońca/poranku

### AC-2: Widget wyświetla kompletny briefing
GIVEN: Wszystkie źródła danych dostępne
WHEN: Widget załadowany
THEN: Wyświetla sekcje:
  - **🌙 NightClaw**: "Last night: N patterns found. [Pierwsze 2 bullet points skrócone do 80 znaków]" + link "Details →"
  - **📋 Tasks today**: "N tasks in pipeline today" (IN_PROGRESS count)
  - **🛒 Shopping**: "N items on shopping list"
  - **🌤️ Weather**: temperatura + opis (np. "12°C, Cloudy in London")
  - **⚡ System**: Bridge ✅ | OpenClaw ✅ | Supabase ✅ (lub ❌ per serwis)

### AC-3: Endpoint agreguje równolegle
GIVEN: Wszystkie upstream serwisy działają
WHEN: `GET /api/bridge/morning-briefing` jest wywołane
THEN: Odpowiedź w <3 sekundy (parallel fetch wszystkich źródeł z timeout=2.5s per source)
AND: Format:
```json
{
  "nightclaw": {
    "last_run_at": "2026-03-05T03:00:00Z",
    "patterns_found": 3,
    "key_lessons": ["Lesson 1 truncated to 80 chars", "Lesson 2..."],
    "available": true
  },
  "tasks": { "in_progress": 2, "available": true },
  "shopping": { "count": 7, "available": true },
  "weather": {
    "temp_c": 12,
    "description": "Cloudy",
    "location": "London",
    "available": true
  },
  "system": {
    "bridge": "up",
    "openclaw": "up",
    "supabase": "up",
    "available": true
  },
  "generated_at": "2026-03-05T08:00:00Z"
}
```

### AC-4: Partial failure — graceful degradation
GIVEN: NightClaw endpoint offline (ale reszta działa)
WHEN: Widget załadowany
THEN: Sekcja NightClaw pokazuje "NightClaw data unavailable" — reszta widgetu działa normalnie
AND: Widget NIE pokazuje błędu dla całego widgetu — tylko dla niedostępnej sekcji

### AC-5: Timestamp "Last updated"
GIVEN: Widget załadowany z danymi
WHEN: Mariusz patrzy na widget
THEN: Na dole widgetu widoczny timestamp "Generated at: 08:00 AM"

---

## ⚙️ Szczegóły Backend

### Endpoint
```
GET /api/bridge/morning-briefing
Auth: sesja KiraBoard (PIN auth, tylko Admin)
Role: admin
```

### Logika biznesowa
```
1. Uruchom równolegle (Promise.allSettled) z timeout=2500ms per source:
   a. fetch /api/bridge/nightclaw/summary
   b. fetch /api/bridge/status/pipeline
   c. fetch /api/bridge/shopping/count
   d. fetch https://wttr.in/London?format=j1  (lub skonfigurowany location)
   e. fetch /api/health-check
2. Dla każdego source który failed/timed-out → ustaw available: false, dane = null
3. Parsuj weather z wttr.in format j1 → wyciągnij temp_c i description
4. Wyciągnij pierwsze 2 bullet points z NightClaw summary (truncate do 80 znaków)
5. Zbuduj i zwróć agregowany response
6. Cache response na 5 minut (morning-briefing nie musi być real-time)
```

### Konfiguracja
```javascript
// W server.cjs lub config.json:
const MORNING_BRIEFING_CONFIG = {
  weather_location: "London",     // lub z env KIRA_WEATHER_LOCATION
  cache_ttl_ms: 5 * 60 * 1000,  // 5 minut
  source_timeout_ms: 2500,
}
```

### Widget `generateHtml()`
```javascript
// Sekcyjny layout: każda sekcja = row z ikoną + treścią
// Kolory: NightClaw=purple, Tasks=blue, Shopping=green, Weather=sky, System=depends on status
// System section: per-serwis badge (zielony UP / czerwony DOWN)
// Footer: "Generated at HH:MM AM/PM" + link "Refresh"
// Rozmiar: 2x3 lub 3x2 (jeden z większych widgetów)
```

### Widget `generateJs()`
```javascript
// Fetch /api/bridge/morning-briefing przy załadowaniu
// NIE auto-refresh (briefing jest poranny — manual refresh via footer link)
// Loading state: skeleton per sekcja
// "Refresh" button: re-fetch i przerenduj
// localStorage cache: jeśli cache świeży (<5min) → pokaż od razu, fetch w tle
```

---

## ⚠️ Edge Cases

### EC-1: Wszystkie źródła offline
Scenariusz: Bridge offline, wttr.in niedostępny
Oczekiwane zachowanie: Widget pokazuje "Morning Briefing unavailable" + przycisk "Retry"
Komunikat dla użytkownika: "Unable to load briefing — check your connection"

### EC-2: NightClaw nie uruchomił się w nocy
Scenariusz: Brak rekordu NightClaw z ostatnich 12 godzin
Oczekiwane zachowanie: Sekcja NightClaw: "No NightClaw run last night"
Komunikat dla użytkownika: "No NightClaw run last night"

### EC-3: Weather API timeout
Scenariusz: wttr.in nie odpowiada w 2.5s
Oczekiwane zachowanie: Sekcja Weather: "Weather data unavailable" — reszta briefingu OK

### EC-4: Shopping endpoint nie istnieje (EPIC-0 bez tego endpointu)
Scenariusz: `/api/bridge/shopping/count` zwraca 404
Oczekiwane zachowanie: Sekcja Shopping: "N/A" lub ukryta — nie crash
Implementacja: obsłuż 404 jako available: false gracefully

---

## 🚫 Out of Scope tej Story
- Konfiguracja location weather z UI (hardcoded "London" lub env var)
- Pełna lista tasks (to Pipeline page)
- Pełna lista zakupów (to Home Dashboard EPIC-4)
- Real-time SSE update sekcji systemu (to EPIC-2)
- Konfiguracja sekcji briefingu (co pokazywać) — to EPIC-10

---

## ✔️ Definition of Done
- [ ] Endpoint `GET /api/bridge/morning-briefing` agreguje 5 źródeł równolegle
- [ ] Timeout per source = 2.5s, całkowity czas odpowiedzi < 3s
- [ ] Cache 5 minut po stronie serwera
- [ ] Partial failure: każda sekcja pokazuje own fallback, nie blokuje reszty
- [ ] Widget rejestruje się w gallery jako "Morning Briefing"
- [ ] Wszystkie 5 sekcji renderuje się (nawet z placeholderami gdy unavailable)
- [ ] System section pokazuje per-serwis UP/DOWN badge
- [ ] Footer z timestampem + "Refresh" button który re-fetchuje
- [ ] Widget działa jako standalone (nie wymaga innych widgetów aktywnych)
- [ ] Kod przechodzi linter bez błędów
