---
story_id: STORY-6.2
title: "Pipeline page — epic/story list z statusami i progress bars"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-6.1, STORY-3.3, STORY-2.2]
blocks: [STORY-6.3, STORY-6.5]
tags: [pipeline, stories, status-badge, progress-bar, epic-tree, project-switcher]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć listę epics i stories Pipeline page z kolorowymi statusami i progress barami
**Żeby** mieć jedyny widok zarządzania pipeline'm Kiry — co jest w toku, co czeka, co jest done

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/pipeline`
- Komponent główny: `PipelineView`
- Plik: `src/pages/pipeline/index.tsx` (lub `src/pages/pipeline/PipelinePage.tsx`)
- Layout: sidebar + main content (jak inne pages)

### Powiązane pliki
- `src/_shared/lib/pipelineApi.ts` — serwis API (z STORY-6.4 wiring)
- `src/_shared/components/StatusBadge.tsx` — badge statusu (z EPIC-3)
- `GET /api/pipeline/stories` — endpoint z STORY-6.1
- Mockup: `kiraboard-mockup-v5-all-pages.html` — sekcja Pipeline

### Stan systemu przed tą story
- STORY-6.1 gotowe: API endpoint `/api/pipeline/stories` działa
- STORY-3.3 gotowe: auth guard, strona wymaga roli `admin`
- STORY-2.2 gotowe: SSE hook dostępny (opcjonalne: auto-refresh po SSE event)
- React router skonfigurowany, trasa `/pipeline` zdefiniowana

---

## ✅ Acceptance Criteria

### AC-1: Wyświetlenie epics z stories
GIVEN: Bridge ma EPIC-6 z 10 stories w różnych statusach
WHEN: Mariusz wchodzi na `/pipeline`
THEN: strona wyświetla sekcje per epic (np. "EPIC-6 — Pipeline + Gate"), każda z listą stories
AND: każda sekcja epic zawiera progress bar z liczbą `X/Y done` i procentem ukończenia

### AC-2: Kolory statusów
GIVEN: stories mają statusy BACKLOG, IN_PROGRESS, REVIEW, DONE
WHEN: lista stories jest wyrenderowana
THEN: każda story row pokazuje badge statusu: BACKLOG=szary, IN_PROGRESS=niebieski, REVIEW=żółty, DONE=zielony

### AC-3: Project switcher
GIVEN: Bridge ma 3 zarejestrowane projekty (kira-dashboard, gym-tracker, monopilot)
WHEN: Mariusz klika dropdown "Projekt" na górze strony i wybiera "gym-tracker"
THEN: lista stories przeładowuje się i pokazuje tylko stories projektu `gym-tracker`
AND: progress bary epics aktualizują się dla nowego projektu

### AC-4: Filtr statusu
GIVEN: lista stories jest wyświetlona
WHEN: Mariusz klika tab "In Progress"
THEN: lista pokazuje tylko stories ze statusem `IN_PROGRESS`

### AC-5: Stan loading i empty
GIVEN: API jest w trakcie ładowania
WHEN: strona się otwiera
THEN: widoczne są skeleton loadery zamiast wierszy stories (min 5 wierszy placeholder)
AND: gdy brak stories dla projektu, widać komunikat "Brak stories dla tego projektu — dodaj nowy projekt przez PRD Wizard"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/pipeline`
Komponent: `PipelineView`
Plik: `src/pages/pipeline/index.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PipelineView` | Page | `activeProject` | loading, empty, error, filled |
| `ProjectSwitcher` | Select/Dropdown | `projects`, `active`, `onChange` | idle, loading-projects |
| `EpicSection` | Card | `epic`, `stories[]` | collapsed, expanded |
| `EpicProgressBar` | Progress | `done`, `total` | — |
| `StoryRow` | TableRow | `story`, `onSelect` | hover, selected |
| `StatusBadge` | Badge | `status` | BACKLOG, IN_PROGRESS, REVIEW, DONE |
| `StatusFilterTabs` | Tabs | `active`, `onChange` | All, Backlog, InProgress, Review, Done |

### Stany widoku

**Loading:**
Skeleton loader: 2 sekcje EpicSection z 5 skeleton rows każda. Spinner w ProjectSwitcher. Status tabs disabled.

**Empty (brak danych):**
Komunikat: "Brak stories dla projektu [nazwa]. Utwórz nowy projekt przez PRD Wizard." z przyciskiem CTA "Otwórz PRD Wizard".

**Error (błąd serwera/sieci):**
Alert baner na górze: "Nie można załadować pipeline — sprawdź połączenie z Bridge" z przyciskiem "Spróbuj ponownie".

**Filled (normalny stan):**
Project switcher na górze → sekcje per epic z progress barem → tabela stories z badge statusu, domeną, modelem, 5 gate squares (placeholder szare jeśli gates nie załadowane).

### Flow interakcji

```
1. Mariusz wchodzi na /pipeline → system pokazuje skeleton loader
2. API zwraca stories → grupuje po epic_id → renderuje EpicSection per epic
3. EpicSection: progress bar (done/total), lista StoryRow
4. Mariusz klika tab "In Progress" → lista filtruje się lokalnie (bez nowego API call)
5. Mariusz zmienia projekt w ProjectSwitcher → API call z nowym project param → lista odświeża się
6. Mariusz klika story row → otwiera StoryDetailPanel (STORY-6.3)
7. SSE event "story_advanced" → auto-refresh listy stories (jeśli STORY-2.2 ready)
```

### Responsive / Dostępność
- Mobile (375px+): jedna kolumna, story rows zwijają się do kart, gate squares ukryte (pokazuje tylko status badge)
- Desktop (1280px+): tabela z kolumnami: Story ID | Tytuł | Domena | Model | Status | Gates
- Keyboard navigation: Tab między rows, Enter otwiera detail panel, Escape zamyka panel
- ARIA: tabela z `role="table"`, statusy z `aria-label="Status: IN_PROGRESS"`, EpicSection z `aria-expanded`

---

## ⚠️ Edge Cases

### EC-1: Bridge zwraca puste stories dla wybranego projektu
Scenariusz: projekt istnieje w Bridge ale nie ma zarejestrowanych stories
Oczekiwane zachowanie: empty state z komunikatem "Brak stories" i CTA do PRD Wizard

### EC-2: SSE niedostępne (STORY-2.2 nie gotowe)
Scenariusz: SSE hook nie jest dostępny w tym etapie implementacji
Oczekiwane zachowanie: strona działa normalnie bez auto-refresh; pojawia się przycisk "Odśwież" w headerze strony

### EC-3: Projekt z bardzo długą listą stories (>100)
Scenariusz: Bridge zwraca 150 stories dla projektu
Oczekiwane zachowanie: lista działa bez freeze; opcjonalnie: virtualizacja wierszy lub paginacja po 50

---

## 🚫 Out of Scope tej Story
- Gate squares z prawdziwymi kolorami (STORY-6.5)
- Bulk actions toolbar (STORY-6.3)
- Story detail panel (STORY-6.3)
- Gate compliance banner (STORY-6.5)
- PRD Wizard modal (STORY-6.7)

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading/skeleton, empty, error, filled)
- [ ] Project switcher zmienia projekt i przeładowuje stories
- [ ] Status tabs filtrują lokalnie bez dodatkowego API call
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Story review przez PO
