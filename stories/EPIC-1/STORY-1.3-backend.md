---
story_id: STORY-1.3
title: "Widget model-agents — endpoint + sparkline 4 modeli AI"
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
tags: widget, bridge, dashboard, model-agents, sparkline
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć widget `model-agents` na dashboardzie
**Żeby** monitorować success rate, średni czas i trend ostatnich 10 runów dla każdego modelu AI (Codex, Kimi, GLM, Haiku) bez zaglądania do Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` lub `widgets/model-agents.js`
- Endpoint: `GET /api/bridge/status/models` — dane per model z Bridge (success rate, avg duration, ostatnie 10 runów)
- Sparkline: mini Chart.js line chart (bez osi, bez tooltipów — tylko linia trendu), lub inline SVG path

### Powiązane pliki
- `server.cjs` — rejestracja widgetu
- Bridge CLI / Bridge DB: tabela runs z kolumnami `model`, `status` (success/fail), `duration_ms`, `started_at`
- `archive/` — READ ONLY: wzorzec dla widgetów z wieloma kartami (np. Docker multi-container widget)

### Stan systemu przed tą story
- STORY-0.2 gotowe: proxy `/api/bridge/*` działa
- Bridge przechowuje historię runów z danymi per model
- Chart.js dostępny globalnie (lub użyj SVG sparkline — mniejszy narzut)

---

## ✅ Acceptance Criteria

### AC-1: Widget pojawia się w gallery
GIVEN: Mariusz zalogowany jako Admin
WHEN: Otwiera widget gallery
THEN: Widget `model-agents` widoczny jako "Model Agents" z ikoną AI/robot

### AC-2: 4 karty per model z key metrics
GIVEN: Bridge ma dane dla modeli Codex, Kimi, GLM, Haiku
WHEN: Widget załadowany
THEN: Wyświetla 4 karty w grid 2x2 (lub horizontal scroll na wąskim widgecie):
  - Każda karta: **nazwa modelu** + **success rate %** (duży, kolorowy) + **avg duration** (np. "4m 32s") + sparkline trendu ostatnich 10 runów
AND: Success rate ≥ 80% = zielony, 50-79% = żółty, <50% = czerwony

### AC-3: Sparkline pokazuje trend ostatnich 10 runów
GIVEN: Model ma ≥ 3 runów w historii
WHEN: Karta modelu wyświetlona
THEN: Sparkline pokazuje mini linię z punktami odpowiadającymi: 1 = success, 0 = fail dla ostatnich 10 runów
AND: Linia jest czytelna na karcie (max height ~30px)

### AC-4: Endpoint zwraca dane per model
GIVEN: Bridge zawiera historię runów
WHEN: `GET /api/bridge/status/models` jest wywołane
THEN: Odpowiedź 200:
```json
{
  "models": [
    {
      "name": "codex-5.3",
      "display_name": "Codex",
      "total_runs": 45,
      "success_rate": 91.1,
      "avg_duration_ms": 272000,
      "last_10_runs": [1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
      "last_run_at": "2026-03-05T14:30:00Z"
    },
    ...
  ],
  "updated_at": "2026-03-05T16:00:00Z"
}
```

### AC-5: Model bez historii wyświetla "No data"
GIVEN: Model (np. GLM) nie ma żadnych runów w Bridge
WHEN: Widget wyświetla kartę tego modelu
THEN: Karta pokazuje nazwę modelu + "No runs yet" zamiast metryki + pusta sparkline (flat line)

---

## ⚙️ Szczegóły Backend

### Endpoint
```
GET /api/bridge/status/models
Auth: sesja KiraBoard (PIN auth, tylko Admin)
Role: admin
```

### Response Schema
```typescript
interface ModelStats {
  name: string           // "codex-5.3" | "kimi-k2.5" | "glm-5" | "haiku-4.5"
  display_name: string   // "Codex" | "Kimi" | "GLM" | "Haiku"
  total_runs: number
  success_rate: number   // 0-100, round 1 decimal
  avg_duration_ms: number
  last_10_runs: number[] // array 0/1, length ≤ 10, najstarsze → najnowsze
  last_run_at: string | null // ISO 8601
}

interface ModelsResponse {
  models: ModelStats[]
  updated_at: string
}
```

### Logika biznesowa
```
1. Pobierz historię runów z Bridge (CLI lub HTTP API)
2. Filtruj per model: iteruj przez ["codex-5.3", "kimi-k2.5", "glm-5", "haiku-4.5"]
3. Dla każdego modelu:
   a. total_runs = count wszystkich runów tego modelu
   b. success_rate = (count successful / total_runs) * 100
   c. avg_duration_ms = avg(duration_ms) gdzie status = success
   d. last_10_runs = ostatnie 10 runów posortowane ASC: 1=success, 0=fail/error
   e. last_run_at = timestamp ostatniego runa
4. Jeśli model nie ma runów → ModelStats z zerami + last_run_at: null
5. Bridge offline → 503 z { error: "Bridge offline" }
6. Zwróć 200 z ModelsResponse
```

### Widget `generateHtml()`
```javascript
// Grid 2x2 kart (lub flex-wrap 2 cols)
// Każda karta:
//   - Header: ikona modelu + display_name
//   - Metric 1: success_rate% (duży font, kolor per próg)
//   - Metric 2: avg_duration w formacie "Xm Ys"
//   - Sparkline container: div#sparkline-{modelName} (height: 32px)
//   - Footer: "N runs total | Last: HH:MM"
// Obsłuż stan "No runs yet" gdy last_10_runs jest puste
```

### Widget `generateJs()`
```javascript
// Fetch /api/bridge/status/models
// Dla każdej karty renderuj sparkline:
//   Opcja A: mini Chart.js line (type: "line", no axes, no legend, no tooltips)
//   Opcja B: inline SVG path (lżejszy, brak zależności)
// Refresh co 120 sekund
// Loading state: skeleton cards podczas fetch
// Error state: overlay "Bridge offline" na wszystkich kartach
```

---

## ⚠️ Edge Cases

### EC-1: Bridge offline
Scenariusz: Bridge CLI nie odpowiada
Oczekiwane zachowanie: Widget pokazuje 4 karty z "Bridge offline" overlay + ostatnie znane wartości (localStorage per model)
Komunikat dla użytkownika: "Bridge offline — dane z HH:MM"

### EC-2: Model z 1-2 runami
Scenariusz: Haiku ma tylko 2 runy w historii — sparkline ma za mało punktów
Oczekiwane zachowanie: Sparkline renderuje 2 punkty; success_rate obliczony z tych 2; avg_duration z dostępnych
Komunikat dla użytkownika: (brak)

### EC-3: avg_duration undefined (wszystkie runy to fail)
Scenariusz: Model ma runy ale wszystkie zakończyły się failem (duration_ms = null lub 0)
Oczekiwane zachowanie: Wyświetl "N/A" dla avg duration, success_rate = 0% (czerwony)

### EC-4: Nowy model w Bridge (nie na liście 4)
Scenariusz: Bridge ma runy dla modelu "opus-4.6" — nie jest na predefiniowanej liście
Oczekiwane zachowanie: Endpoint ignoruje nieznane modele (nie zwraca ich), widget pokazuje tylko 4 znane

---

## 🚫 Out of Scope tej Story
- Szczegółowy widok runa (lista runów — to Pipeline page EPIC-6)
- Konfiguracja progu success_rate przez UI
- Filtrowanie per projekt
- Real-time SSE update (to EPIC-2)

---

## ✔️ Definition of Done
- [ ] Endpoint `GET /api/bridge/status/models` zwraca dane dla 4 modeli
- [ ] Widget rejestruje się w gallery jako "Model Agents"
- [ ] Grid 2x2 kart renderuje się z success_rate, avg_duration, sparkline
- [ ] Kolory success_rate: zielony/żółty/czerwony per progi (80/50)
- [ ] Sparkline renderuje trend ostatnich 10 runów (0/1)
- [ ] Model bez historii wyświetla "No runs yet" zamiast błędu
- [ ] Bridge offline → graceful fallback per karta
- [ ] avg_duration formatowany jako "Xm Ys" (nie raw ms)
- [ ] Kod przechodzi linter bez błędów
