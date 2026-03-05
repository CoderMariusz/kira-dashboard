---
story_id: STORY-1.7
title: "Widget project-switcher — Bridge /api/projects/list + persystencja"
epic: EPIC-1
module: widgets
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: STORY-0.2
blocks: none
tags: widget, bridge, dashboard, project-switcher, projekty
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć widget `project-switcher` na dashboardzie
**Żeby** szybko przełączyć aktywny projekt Bridge (kira-dashboard, gym-tracker itp.) i zobaczyć statystyki done/total stories per projekt — bez otwierania terminala

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Plik: `server.cjs` lub `widgets/project-switcher.js`
- Endpointy:
  - `GET /api/bridge/projects/list` — lista projektów z statystykami
  - `POST /api/bridge/projects/switch` — zmiana aktywnego projektu (jeśli Bridge obsługuje)
- Persystencja wyboru: `localStorage` klucz `kira_active_project`
- Integracja z EPIC-6 (Pipeline page) — wybrany projekt filtruje pipeline view

### Powiązane pliki
- `server.cjs` — rejestracja widgetu + endpoint proxy
- Bridge `kira-projects.json` — lista projektów (odczytywana przez Bridge)
- `archive/` — READ ONLY: wzorzec widgetów z dropdown/select

### Stan systemu przed tą story
- STORY-0.2 gotowe: proxy `/api/bridge/*` działa
- Bridge ma zarejestrowane projekty (kira-dashboard, gym-tracker, itp.)

---

## ✅ Acceptance Criteria

### AC-1: Widget pojawia się w gallery
GIVEN: Mariusz zalogowany jako Admin
WHEN: Otwiera widget gallery
THEN: Widget `project-switcher` widoczny jako "Project Switcher" z ikoną folderu/switch

### AC-2: Dropdown z listą projektów
GIVEN: Bridge ma zarejestrowane 2+ projekty
WHEN: Widget załadowany
THEN: Wyświetla select dropdown z listą projektów
AND: Aktualny aktywny projekt (z localStorage lub Bridge) jest highlighted/selected
AND: Każdy projekt w dropdown pokazuje: `{project_key} — done/total stories` (np. "kira-dashboard — 12/45")

### AC-3: Zmiana projektu persystuje w localStorage
GIVEN: Mariusz wybiera "gym-tracker" z dropdown
WHEN: Kliknie lub zmieni select
THEN: `localStorage.setItem("kira_active_project", "gym-tracker")` — wybrany projekt saved
AND: Inne widgety zależne od projektu (np. pipeline-status) mogą odczytać tę wartość

### AC-4: Endpoint zwraca listę projektów ze statystykami
GIVEN: Bridge ma projekty kira-dashboard i gym-tracker
WHEN: `GET /api/bridge/projects/list` jest wywołane
THEN: Odpowiedź 200:
```json
{
  "active_project": "kira-dashboard",
  "projects": [
    {
      "key": "kira-dashboard",
      "name": "KiraBoard",
      "stories_done": 12,
      "stories_total": 45,
      "status": "active"
    },
    {
      "key": "gym-tracker",
      "name": "Gym Tracker",
      "stories_done": 3,
      "stories_total": 18,
      "status": "active"
    }
  ]
}
```

### AC-5: Statystyki per projekt pod dropdownem
GIVEN: Aktywny projekt "kira-dashboard"
WHEN: Widget wyświetlony
THEN: Pod dropdownem widoczne statystyki aktywnego projektu:
  - "Done: 12 / 45 (26.7%)"
  - Progress bar (szeroki, kolorowy, proporcjonalny)

---

## ⚙️ Szczegóły Backend

### Endpoint 1
```
GET /api/bridge/projects/list
Auth: sesja KiraBoard (PIN auth, tylko Admin)
Role: admin
```

```typescript
interface Project {
  key: string        // np. "kira-dashboard"
  name: string       // display name
  stories_done: number
  stories_total: number
  status: "active" | "archived"
}

interface ProjectsListResponse {
  active_project: string   // klucz aktywnego projektu
  projects: Project[]
}
```

### Logika biznesowa
```
1. Wywołaj Bridge CLI: `python -m bridge.cli status --json` lub odczytaj kira-projects.json
2. Dla każdego projektu: policz stories done/total z Bridge
3. Zidentyfikuj aktywny projekt (Bridge config lub ostatnio używany)
4. Zwróć posortowaną listę (active first, reszta alfabetycznie)
5. Bridge offline → 503
```

### Endpoint 2 (opcjonalny — jeśli Bridge obsługuje zmianę projektu przez API)
```
POST /api/bridge/projects/switch
Body: { "project_key": "gym-tracker" }
Response: { "success": true, "active_project": "gym-tracker" }
```
Jeśli Bridge nie obsługuje switch przez API → widget zapisuje TYLKO do localStorage (client-side only).

### Widget `generateHtml()`
```javascript
// Header: "Project Switcher 📁"
// Select dropdown: <select id="projectSelect"> z <option> per projekt
// Stats section: done/total + progress bar (HTML progress element lub div)
// Footer: "Last synced: HH:MM" + link "Refresh"
// Rozmiar: 1x2 (compact) lub 2x1
```

### Widget `generateJs()`
```javascript
// Fetch /api/bridge/projects/list przy załadowaniu
// Populate select z projektami
// Odczytaj localStorage["kira_active_project"] → pre-select właściwy
// onChange select:
//   1. Zapisz do localStorage
//   2. Opcjonalnie: POST /api/bridge/projects/switch jeśli endpoint istnieje
//   3. Update stats section dla wybranego projektu (bez re-fetch)
//   4. Dispatch custom event "kira:project-changed" → inne widgety mogą nasłuchiwać
// Refresh co 5 minut (statystyki mogą się zmieniać)
```

---

## ⚠️ Edge Cases

### EC-1: Bridge offline
Scenariusz: `/api/bridge/projects/list` niedostępny
Oczekiwane zachowanie: Widget pokazuje ostatnią listę z localStorage + "Bridge offline — dane mogą być nieaktualne"
Komunikat dla użytkownika: "Bridge offline — project list may be outdated"

### EC-2: Tylko 1 projekt w Bridge
Scenariusz: Jedyny projekt = "kira-dashboard"
Oczekiwane zachowanie: Dropdown z 1 opcją (disabled/readonly) + statystyki per projekt widoczne
Komunikat dla użytkownika: (brak — stan prawidłowy)

### EC-3: Zmiana projektu przez POST nie powiodła się (404 — endpoint nie istnieje)
Scenariusz: Bridge nie obsługuje switch przez HTTP API
Oczekiwane zachowanie: Widget ignoruje błąd POST, zapisuje do localStorage i kontynuuje — client-side switch
Komunikat dla użytkownika: (brak)

### EC-4: localStorage niedostępny (private mode)
Scenariusz: Przeglądarka blokuje localStorage (rare)
Oczekiwane zachowanie: Widget działa normalnie bez persystencji, switch działa do następnego odświeżenia
Komunikat dla użytkownika: (brak — silent fallback)

---

## 🚫 Out of Scope tej Story
- Tworzenie nowych projektów z UI (to EPIC-6)
- Archiwizacja projektów z UI (to EPIC-6)
- Filtrowanie innych widgetów po wybranym projekcie (to EPIC-6 — nasłuchiwanie na "kira:project-changed")
- Historia zmian projektu

---

## ✔️ Definition of Done
- [ ] Endpoint `GET /api/bridge/projects/list` zwraca projekty z done/total
- [ ] Widget rejestruje się w gallery jako "Project Switcher"
- [ ] Dropdown z listą projektów, aktywny projekt pre-selected
- [ ] Każda opcja w dropdown: "key — done/total"
- [ ] Stats section: done/total + progress bar dla aktywnego projektu
- [ ] Zmiana projektu → localStorage persists + event `kira:project-changed` dispatched
- [ ] Bridge offline → fallback z localStorage + komunikat
- [ ] 1 projekt: dropdown disabled, statystyki widoczne
- [ ] Refresh co 5 minut
- [ ] Kod przechodzi linter bez błędów
