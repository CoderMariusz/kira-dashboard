---
story_id: STORY-1.2
title: "Widget velocity-chart — endpoint + Chart.js line chart"
epic: EPIC-1
module: widgets
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: STORY-0.2
blocks: none
tags: widget, bridge, dashboard, velocity-chart, chartjs
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć wykres velocity na dashboardzie KiraBoard
**Żeby** śledzić trend ukończonych stories w czasie (7d / 30d) i oceniać tempo pracy pipeline'u

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` lub `widgets/velocity-chart.js`
- Endpoint: `GET /api/bridge/status/runs` — dane o ukończonych stories per dzień z Bridge
- Chart.js jest już załadowany w LobsterBoard — NIE dodawaj nowej biblioteki

### Powiązane pliki
- `server.cjs` — istniejące widgety z Chart.js (sprawdź `archive/` jak inne widgety używają Chart.js)
- Bridge CLI / Bridge HTTP API: tabela `bridge_runs` lub equivalent z datami zakończenia stories
- `archive/` — READ ONLY: wzorzec istniejących chart widgetów

### Stan systemu przed tą story
- STORY-0.2 gotowe: proxy `/api/bridge/*` działa
- Chart.js załadowany globalnie przez LobsterBoard engine
- Bridge przechowuje historię runów stories z timestampami

---

## ✅ Acceptance Criteria

### AC-1: Widget pojawia się w gallery
GIVEN: Mariusz jest zalogowany jako Admin
WHEN: Otwiera widget gallery w edit mode
THEN: Widget `velocity-chart` jest widoczny jako "Velocity Chart" z ikoną wykresu

### AC-2: Wykres renderuje dane 7d (domyślny widok)
GIVEN: Widget załadowany, Bridge ma dane z ostatnich 7 dni
WHEN: Widget renderuje się po raz pierwszy
THEN: Wyświetla Chart.js line chart z osią X = daty (ostatnie 7 dni, format "DD/MM") i osią Y = liczba ukończonych stories per dzień
AND: Linia jest płynna (tension: 0.3), obszar pod linią wypełniony z opacity 0.2

### AC-3: Toggle 7d / 30d działa
GIVEN: Widget wyświetla wykres 7d
WHEN: Mariusz klika przycisk "30d"
THEN: Wykres przeładowuje dane dla 30 dni bez przeładowania strony
AND: Aktywny przycisk (7d lub 30d) jest podświetlony

### AC-4: Endpoint zwraca dane per dzień
GIVEN: Bridge zawiera historię ukończonych stories
WHEN: `GET /api/bridge/status/runs?days=7` jest wywołane
THEN: Odpowiedź 200 z tablicą:
```json
{
  "days": 7,
  "data": [
    { "date": "2026-02-27", "completed": 3 },
    { "date": "2026-02-28", "completed": 1 },
    ...
  ],
  "total": 18,
  "avg_per_day": 2.57
}
```

### AC-5: Footer z podsumowaniem
GIVEN: Wykres załadowany z danymi
WHEN: Widoczny jest widget
THEN: Pod wykresem wyświetla się: "Total: N stories | Avg: X/day | [7d] [30d]"

---

## ⚙️ Szczegóły Backend

### Endpoint
```
GET /api/bridge/status/runs
Query params: days=7 (default) | days=30
Auth: sesja KiraBoard (PIN auth, tylko Admin)
Role: admin
```

### Response Schema
```typescript
interface RunsResponse {
  days: number       // 7 lub 30
  data: Array<{
    date: string     // "YYYY-MM-DD"
    completed: number // liczba stories ukończonych tego dnia
  }>
  total: number      // suma completed w zakresie
  avg_per_day: number // total / days, round 2 decimals
}
```

### Logika biznesowa
```
1. Parsuj query param `days` (default 7, max 30, min 1)
2. Oblicz date range: today - days → today
3. Zapytaj Bridge o historię ukończonych stories:
   - Bridge CLI: `python -m bridge.cli status --json` + filtruj po done_at
   - Lub Bridge HTTP API jeśli dostępne
4. Grupuj po dacie (truncate timestamp do YYYY-MM-DD)
5. Wypełnij brakujące dni zerami (każdy dzień w range musi być w tablicy)
6. Oblicz total + avg_per_day
7. Zwróć posortowane ASC po dacie
8. Bridge offline → 503 z { error: "Bridge offline" }
```

### Widget `generateHtml()`
```javascript
// Container div z canvasem Chart.js
// Header: "Velocity Chart" + toggle przyciski [7d] [30d]
// Canvas: id="velocityChart" z height=120px
// Footer: Total / Avg info + "Last updated HH:MM"
// Rozmiar widgetu: 2x2 lub 3x1 (szeroki, landscape)
```

### Widget `generateJs()`
```javascript
// Po załadowaniu: fetch /api/bridge/status/runs?days=7
// Inicjalizuj Chart.js line chart na canvasie
// Toggle 7d/30d: destroy old chart, fetch new data, init new chart
// Color scheme: KiraBoard theme (np. indigo/purple)
// Obsłuż loading state (spinner zamiast canvas podczas fetch)
// Cache last data w module variable (nie localStorage — chart nie persystuje)
```

---

## ⚠️ Edge Cases

### EC-1: Bridge offline
Scenariusz: Bridge niedostępny
Oczekiwane zachowanie: Widget pokazuje placeholder "Velocity data unavailable" + badge "Bridge offline"
Komunikat dla użytkownika: "Bridge offline — velocity data unavailable"

### EC-2: Brak historii (nowy deployment Bridge)
Scenariusz: Bridge działa, ale tabela runs jest pusta
Oczekiwane zachowanie: Chart renderuje się z zerami na wszystkich dniach — NIE crash
Komunikat dla użytkownika: (brak — zerowe wartości to prawidłowy stan)

### EC-3: Tylko 1-2 ukończone stories w zakresie
Scenariusz: Bardzo rzadkie ukończenia — linia jest prawie pozioma przy 0
Oczekiwane zachowanie: Wykres renderuje się poprawnie, oś Y zaczyna od 0
Komunikat dla użytkownika: (brak)

### EC-4: `days` poza zakresem
Scenariusz: `days=0` lub `days=100` lub `days=abc`
Oczekiwane zachowanie: Endpoint clampuje do min=1, max=30; walidacja zwraca 400 dla non-numeric

---

## 🚫 Out of Scope tej Story
- Filtrowanie per model (to STORY-1.3)
- Filtrowanie per projekt (to STORY-1.7)
- Eksport danych jako CSV
- Real-time SSE update (to EPIC-2)

---

## ✔️ Definition of Done
- [ ] Endpoint `GET /api/bridge/status/runs?days=7` i `?days=30` zwracają poprawny JSON
- [ ] Widget rejestruje się w gallery jako "Velocity Chart"
- [ ] Chart.js line chart renderuje się poprawnie z danymi z endpointu
- [ ] Toggle 7d/30d działa bez przeładowania strony
- [ ] Brakujące dni (bez ukończeń) wypełniane zerami
- [ ] Bridge offline → graceful fallback z komunikatem
- [ ] Endpoint zwraca 400 dla nieprawidłowego `days`
- [ ] Kod przechodzi linter bez błędów
