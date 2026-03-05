---
story_id: STORY-1.1
title: "Widget pipeline-status — endpoint + generateHtml/Js"
epic: EPIC-1
module: widgets
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-0.2, STORY-0.11
blocks: none
tags: widget, bridge, dashboard, pipeline-status
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć widget `pipeline-status` na dashboardzie KiraBoard
**Żeby** w jednym rzucie oka zobaczyć ile stories jest IN_PROGRESS / REVIEW / DONE / BLOCKED bez otwierania Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik główny: `server.cjs` — nowa sekcja widgetów Kira (wydzielona przez komentarz `// === KIRA WIDGETS ===`)
- Opcjonalnie: `widgets/pipeline-status.js` (jeśli server.cjs zbyt duży — apply pattern z istniejących widgetów)
- Endpoint danych: `GET /api/bridge/status/pipeline` — proxy do Bridge CLI `status` z agregacją counts

### Powiązane pliki
- `server.cjs` — rejestracja widgetu w obiekcie `widgetMap` (lub analogiczna struktura LobsterBoard)
- `archive/` — READ ONLY: sprawdź jak istniejące widgety implementują `generateHtml()` + `generateJs()`
- Bridge CLI: `bridge.cli status --json` → parsuj counts per status

### Stan systemu przed tą story
- STORY-0.2 gotowe: proxy `/api/bridge/*` działa, Bridge CLI dostępne
- STORY-0.11 gotowe: endpoint `/api/health-check` działa
- LobsterBoard widget engine działa i obsługuje `generateHtml()` + `generateJs()` pattern

---

## ✅ Acceptance Criteria

### AC-1: Widget pojawia się w gallery
GIVEN: Mariusz jest zalogowany jako Admin na KiraBoard
WHEN: Otwiera widget gallery (edit mode dashboardu)
THEN: Widget `pipeline-status` jest widoczny na liście dostępnych widgetów z nazwą "Pipeline Status" i ikoną

### AC-2: Widget wyświetla liczniki stories per status
GIVEN: Bridge API zwraca dane z co najmniej 1 story per status
WHEN: Widget `pipeline-status` jest załadowany na dashboardzie
THEN: Wyświetla 4 liczniki z etykietami:
  - 🟡 IN_PROGRESS: N
  - 🔵 REVIEW: N
  - ✅ DONE: N
  - 🔴 BLOCKED: N
AND: Każda liczba pochodzi z `GET /api/bridge/status/pipeline`

### AC-3: Link do Pipeline page
GIVEN: Widget `pipeline-status` jest widoczny na dashboardzie
WHEN: Mariusz klika na dowolny licznik lub link "View Pipeline"
THEN: Przeglądarka nawiguje do `/pages/pipeline/` (lub external link do Pipeline page EPIC-6)

### AC-4: Endpoint zwraca poprawne dane
GIVEN: Bridge CLI działa i zwraca status stories
WHEN: `GET /api/bridge/status/pipeline` jest wywołane
THEN: Odpowiedź ma status 200 i format:
```json
{
  "in_progress": 2,
  "review": 1,
  "done": 45,
  "blocked": 0,
  "total": 48,
  "updated_at": "2026-03-05T16:00:00Z"
}
```

---

## ⚙️ Szczegóły Backend

### Endpoint
```
GET /api/bridge/status/pipeline
Auth: sesja KiraBoard (PIN auth, tylko Admin)
Role: admin
```

### Response Schema
```typescript
interface PipelineStatusResponse {
  in_progress: number   // stories ze statusem IN_PROGRESS
  review: number        // stories ze statusem REVIEW
  done: number          // stories ze statusem DONE
  blocked: number       // stories ze statusem BLOCKED
  total: number         // suma wszystkich
  updated_at: string    // ISO 8601, czas pobrania danych
}
```

### Logika biznesowa
```
1. Wywołaj Bridge CLI: `python -m bridge.cli status --json` (lub odpowiedni endpoint Bridge HTTP API)
2. Parsuj output → zlicz stories per status
3. Zbuduj response z counts + timestamp
4. Obsłuż błąd jeśli Bridge offline → zwróć 503 z { error: "Bridge offline", cached: {...} }
5. Zwróć 200 z PipelineStatusResponse
```

### Widget `generateHtml()`
```javascript
// Zwraca HTML string dla widgetu
// Layout: 2x2 grid lub 4-kolumnowy flex z kartami
// Każda karta: duża liczba (bold, kolorowa) + etykieta statusu + ikona
// Footer: "Last updated: HH:MM" + link "View Pipeline →"
// Kolory: IN_PROGRESS=yellow, REVIEW=blue, DONE=green, BLOCKED=red
// Rozmiar: standardowy tile LobsterBoard (np. 2x1 lub 2x2)
```

### Widget `generateJs()`
```javascript
// Fetch /api/bridge/status/pipeline co 60 sekund (lub na demand)
// Update DOM elementów per status bez przeładowania całego widgetu
// Obsłuż stan loading (spinner) i error (badge "Bridge offline")
// Zapisz last known values w localStorage jako fallback
```

---

## ⚠️ Edge Cases

### EC-1: Bridge offline
Scenariusz: Bridge CLI nie odpowiada lub zwraca błąd
Oczekiwane zachowanie: Widget pokazuje ostatnie znane wartości z localStorage + badge "Bridge offline" (czerwony)
Komunikat dla użytkownika: "Bridge offline — dane z HH:MM"

### EC-2: Brak stories w Bridge (pusta baza)
Scenariusz: Bridge CLI działa ale nie ma żadnych stories
Oczekiwane zachowanie: Widget pokazuje 0/0/0/0 — NIE pokazuje błędu
Komunikat dla użytkownika: (brak — zerowe liczby są prawidłowym stanem)

### EC-3: Bridge zwraca timeout
Scenariusz: Bridge CLI nie odpowiada przez >5 sekund
Oczekiwane zachowanie: Endpoint zwraca 503 po timeout=5s, widget pokazuje fallback z localStorage

---

## 🚫 Out of Scope tej Story
- Real-time SSE update (to EPIC-2)
- Filtrowanie per projekt (to STORY-1.7 project-switcher)
- Wyświetlanie konkretnych story IDs (to Pipeline page, EPIC-6)
- Konfiguracja widgetu z UI (poza scope EPIC-1)

---

## ✔️ Definition of Done
- [ ] Endpoint `GET /api/bridge/status/pipeline` działa i zwraca poprawny JSON
- [ ] Widget rejestruje się w LobsterBoard widget gallery jako "Pipeline Status"
- [ ] `generateHtml()` zwraca poprawny HTML z 4 licznikami i kolorami per status
- [ ] `generateJs()` odpytuje endpoint co 60s i aktualizuje DOM
- [ ] Fallback na Bridge offline: localStorage + badge "Bridge offline"
- [ ] Endpoint zwraca 503 gdy Bridge offline (nie 500)
- [ ] Kod przechodzi linter bez błędów
- [ ] Widget działa na standardowym dashboardzie LobsterBoard (drag-and-drop)
