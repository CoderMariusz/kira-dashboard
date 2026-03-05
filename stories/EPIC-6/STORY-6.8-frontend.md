---
story_id: STORY-6.8
title: "Projects page — lista projektów Bridge, switch active, stats"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: [STORY-6.1]
blocks: []
tags: [projects, list, stats, switch-active, progress-bar, cards]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć dedykowaną stronę z listą wszystkich projektów Bridge z kartami, statystykami i możliwością przełączania aktywnego projektu
**Żeby** zarządzać wieloma projektami w jednym miejscu bez Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/projects`
- Komponent główny: `ProjectsPage`
- Plik: `src/pages/projects/index.tsx`
- API: `GET /api/pipeline/stories?project=all` (aggregate z STORY-6.1) lub dedykowany `GET /api/projects/list-detailed`

### Powiązane pliki
- `src/_shared/lib/projectsApi.ts` — serwis API
- `GET /api/pipeline/stories` — endpoint z STORY-6.1 (filtrowanie per projekt)
- Router: trasa `/projects` zdefiniowana
- `kiraboard-mockup-v5-all-pages.html` — sekcja Projects

### Stan systemu przed tą story
- STORY-6.1 gotowe: API `/api/pipeline/stories` zwraca stories z polem `epic_id` i `project`
- React router skonfigurowany, trasa `/projects` dostępna
- Sidebar ma link do `/projects`

---

## ✅ Acceptance Criteria

### AC-1: Lista projektów w kartach
GIVEN: Bridge ma 3 projekty: kira-dashboard (15 stories, 8 done), gym-tracker (5 stories, 2 done), monopilot (30 stories, 30 done)
WHEN: Mariusz wchodzi na `/projects`
THEN: strona wyświetla 3 karty projektów, każda z: nazwą, kluczem projektu, progress bar (X/Y done), procentem ukończenia, liczbą stories w IN_PROGRESS

### AC-2: Switch aktywnego projektu
GIVEN: aktywny projekt to `kira-dashboard`
WHEN: Mariusz klika "Ustaw jako aktywny" na karcie `gym-tracker`
THEN: serwer wywołuje Bridge CLI `set-active-project gym-tracker` lub zapisuje wybór w localStorage
AND: karta `gym-tracker` zyskuje badge "Aktywny"
AND: karta `kira-dashboard` traci badge "Aktywny"
AND: toast "Aktywny projekt: gym-tracker ✅"

### AC-3: Link do Pipeline per projekt
GIVEN: lista projektów jest wyświetlona
WHEN: Mariusz klika przycisk "Otwórz Pipeline" na karcie `gym-tracker`
THEN: navigacja do `/pipeline` z projektem `gym-tracker` jako aktywnym (query param lub context)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/projects`
Komponent: `ProjectsPage`
Plik: `src/pages/projects/index.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `ProjectsPage` | Page | — | loading, empty, error, filled |
| `ProjectCard` | Card | `project`, `isActive`, `onSwitch`, `onOpenPipeline` | active, inactive |
| `ProjectProgressBar` | Progress | `done`, `total` | — |
| `ActiveBadge` | Badge | — | visible/hidden |

### Stany widoku

**Loading:**
Grid z 3 skeleton cards (szare prostokąty, animacja pulse).

**Empty (brak projektów):**
Komunikat: "Brak zarejestrowanych projektów w Bridge. Utwórz pierwszy projekt przez PRD Wizard." z CTA button.

**Error (błąd API):**
Alert: "Nie można załadować projektów — sprawdź połączenie z Bridge" z przyciskiem "Spróbuj ponownie".

**Filled (normalny stan):**
Grid kart 1-3 kolumny (zależnie od screen size), każda z progress bar, stats, buttons.

### Flow interakcji

```
1. Mariusz wchodzi na /projects → skeleton loading
2. API zwraca listę projektów z aggregate stats → grid kart
3. Aktywny projekt (z localStorage lub Bridge) wyróżniony badge "Aktywny"
4. Mariusz klika "Ustaw jako aktywny" → API call/localStorage → badge przenosi się → toast
5. Mariusz klika "Otwórz Pipeline" → navigate("/pipeline?project=gym-tracker")
6. Mariusz klika "Nowy projekt" → otwiera PRD Wizard (STORY-6.7)
```

### Responsive / Dostępność
- Mobile (375px+): 1 kolumna kart, pełna szerokość
- Tablet (768px+): 2 kolumny
- Desktop (1280px+): 3 kolumny
- Keyboard navigation: Tab między kartami, Enter aktywuje "Ustaw jako aktywny"
- ARIA: karty z `role="article"`, aktywna karta z `aria-current="true"`

---

## ⚠️ Edge Cases

### EC-1: Tylko jeden projekt w Bridge
Scenariusz: Bridge ma jeden projekt, nie ma sensu "switch"
Oczekiwane zachowanie: karta tego projektu ma badge "Aktywny" bez możliwości switch (przycisk ukryty lub disabled z tooltip "Jedyny projekt")

### EC-2: Bridge projects list timeout
Scenariusz: Bridge CLI odpowiada po >10 sekund
Oczekiwane zachowanie: po 10s loading state przechodzi w error z przyciskiem retry

---

## 🚫 Out of Scope tej Story
- Archive projekt (zaznaczone jako out of scope EPIC-6 dla uproszczenia)
- Comparison table side-by-side (mogłoby być EPIC-7+ lub EPIC-6 extension)
- Gate compliance per projekt (wymaga danych z STORY-6.4 — do podłączenia po done)
- Tworzenie/usuwanie projektu poza PRD Wizard

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane
- [ ] Switch aktywnego projektu działa i persystuje (localStorage)
- [ ] "Otwórz Pipeline" naviguje z project query param
- [ ] Grid responsive: 1 kol mobile, 2 kol tablet, 3 kol desktop
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty po polsku
- [ ] Story review przez PO
