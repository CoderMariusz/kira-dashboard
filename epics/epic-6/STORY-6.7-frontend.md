---
story_id: STORY-6.7
title: "Multi-project switcher i stats bar w nagłówku Pipeline — przełączanie projektów"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-6.5, STORY-6.6]
blocks: [STORY-6.8]
tags: [dropdown, project-switcher, stats, pipeline-header, swr, frontend, animation]
---

## 🎯 User Story

**Jako** Mariusz (admin / tech lead)
**Chcę** dropdown w nagłówku Pipeline z listą projektów, mini stats per projekt i przyciskiem "Nowy projekt"
**Żeby** przełączać kontekst między projektami i widzieć postęp każdego jednym spojrzeniem bez wchodzenia w szczegóły

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Pliki do stworzenia:
```
components/pipeline/ProjectSwitcher.tsx   → dropdown z stats
```

Plik do modyfikacji:
```
app/dashboard/pipeline/page.tsx           → dodaj ProjectSwitcher do nagłówka
```

Stack:
- Next.js 16, React 18, `'use client'`
- Tailwind CSS + kolory projektu
- `useProjectStats` z `hooks/useProjectStats.ts` (STORY-6.5)
- `useModels` lub dedykowany hook do switch projektu (`POST /api/projects/switch` — istniejący endpoint z EPIC-2)
- `useSWR` `mutate()` do odświeżania pipeline po switch

### Powiązane pliki
- `hooks/useProjectStats.ts` (STORY-6.5)
- `components/pipeline/NewProjectWizard.tsx` (STORY-6.6) — uruchamiany z CTA
- `app/dashboard/pipeline/page.tsx` — istniejący plik do modyfikacji
- Kolory: tło `#0d0c1a`, karty `#1a1730`, akcent `#818cf8`, border `#2a2540`

### Stan systemu przed tą story
- STORY-6.5 i STORY-6.6 zaimplementowane
- `GET /api/projects/stats` działa (STORY-6.4)
- `POST /api/projects/switch` istnieje (EPIC-2 lub wcześniejszy)

---

## ✅ Acceptance Criteria

### AC-1: Dropdown pokazuje listę projektów
GIVEN: użytkownik jest na `/dashboard/pipeline`
WHEN: nagłówek się ładuje
THEN: widoczny jest przycisk ProjectSwitcher z nazwą aktywnego projektu i ikonką `▼`
WHEN: użytkownik klika przycisk
THEN: dropdown pokazuje listę wszystkich projektów z Bridge z mini stats per projekt

### AC-2: Mini stats per projekt w dropdown
GIVEN: dropdown jest otwarty, projekty załadowane
WHEN: użytkownik widzi listę
THEN: każdy projekt ma: nazwę, completion bar (4px wysokości), "X done / Y active" liczniki
AND: aktywny projekt jest wyróżniony checkmarkiem lub innym wizualnym wskaźnikiem
AND: ikony `done` (zielone `#4ade80`), `in_progress` (niebieskie `#60a5fa`) są poprawnie pokolorowane

### AC-3: Przełączenie projektu
GIVEN: dropdown jest otwarty
WHEN: użytkownik kliknie inny projekt (np. "kira")
THEN: dropdown zamknięty, optimistic UI — nazwa w przycisku zmienia się natychmiast
AND: wywołany `POST /api/projects/switch` z `{ project_key: "kira" }`
AND: toast.success "Przełączono na projekt: kira"
AND: `mutate()` odświeża pipeline view do nowego projektu

### AC-4: CTA "Nowy projekt" w dropdown
GIVEN: dropdown jest otwarty
WHEN: użytkownik klika "+ Nowy projekt" na dole listy
THEN: dropdown zamknięty, `NewProjectWizard` otwiera się (modal)

### AC-5: Loading state
GIVEN: `useProjectStats` jest w stanie `isLoading: true`
WHEN: nagłówek renderuje ProjectSwitcher
THEN: wyświetlony jest skeleton placeholder zamiast projektu (pulse animation)
AND: dropdown nie otwiera się podczas loading

### AC-6: Offline state (Vercel)
GIVEN: `stats.offline === true` lub `stats.projects` jest pusta tablica
WHEN: nagłówek renderuje ProjectSwitcher
THEN: przycisk pokazuje "kira-dashboard" (hardcoded fallback), dropdown jest disabled z tooltip "Bridge offline"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
- Route: `/dashboard/pipeline`
- Nowy komponent: `components/pipeline/ProjectSwitcher.tsx`
- Modyfikacja: nagłówek w `app/dashboard/pipeline/page.tsx`

### Props `ProjectSwitcher`
```typescript
interface ProjectSwitcherProps {
  onNewProject: () => void   // otwiera NewProjectWizard
}
// Stats pobiera wewnętrznie przez useProjectStats()
// Switch wywołuje wewnętrznie przez fetch POST /api/projects/switch
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| ProjectSwitcher | Button + Dropdown | `onNewProject` | closed, open, loading, switching, offline |
| ProjectListItem | div | `project: ProjectStats`, `isActive`, `onClick` | normal, active (checked), hover |
| CompletionBar | div | `pct: number` | filled (gradient) |
| StatsChips | div | `done`, `in_progress` | normal |

### Stany widoku

**Loading:**
Skeleton `w-32 h-8 bg-[#2a2540] animate-pulse rounded-lg` w miejscu przycisku

**Offline:**
Przycisk z nazwą "kira-dashboard", ikonka offline, `cursor-not-allowed opacity-60`

**Closed (normal):**
```
[kira-dashboard ▼]
```
Tło `#1a1730`, border `1px solid #2a2540`, border-radius 8px, padding `8px 12px`

**Open (dropdown):**
```
┌────────────────────────────────┐
│  ✓ kira-dashboard              │
│    ████████░░  72%  12✓ 2↔    │
│                                │
│    kira                        │
│    ████░░░░  45%   8✓ 3↔      │
│  ──────────────────────────    │
│  + Nowy projekt                │
└────────────────────────────────┘
```

### Flow interakcji (krok po kroku)
```
1. Komponent montuje się → useProjectStats() fetches /api/projects/stats
2. Loading → skeleton
3. Dane załadowane → przycisk z nazwą aktywnego projektu (is_current=true)
4. Klik przycisku → isOpen=true, dropdown rendered
5. Klik ProjectListItem (inny projekt):
   a. setOptimisticCurrent(project.key) — natychmiastowa zmiana UI
   b. fetch POST /api/projects/switch { project_key }
   c. Toast: "Przełączono na projekt: {name}"
   d. mutate() — SWR revalidate pipeline + project stats
   e. isOpen=false
6. Klik "+ Nowy projekt" → isOpen=false, onNewProject()
7. Klik poza dropdown → isOpen=false (useEffect + document click listener)
8. Stats auto-refresh co 60s przez useProjectStats (refreshInterval)
```

### Styl dropdown
```
position: absolute, top: calc(100% + 8px), left: 0, z-index: 50
background: #1a1730
border: 1px solid #3b3d7a
border-radius: 12px
padding: 8px
min-width: 280px
max-height: 400px
overflow-y: auto
box-shadow: 0 8px 32px rgba(0,0,0,0.5)

ProjectListItem (active):
  background: #252040
  border-radius: 8px

CompletionBar:
  height: 4px
  background: #2a2540 (track)
  fill: linear-gradient(90deg, #818cf8, #3b82f6)
  border-radius: 2px

Separator przed "Nowy projekt":
  border-top: 1px solid #2a2540
  margin: 4px 0

"+ Nowy projekt":
  color: #818cf8
  hover: bg-[#252040]
```

### Responsive / Dostępność
- Desktop (1280px+): dropdown jak powyżej
- Mobile (375px+): dropdown `width: calc(100vw - 16px)`, left: -8px
- Keyboard: dropdown otwiera się na Enter/Space, nawigacja strzałkami, Escape zamyka
- ARIA: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, items: `role="option"`, `aria-selected`

---

## ⚠️ Edge Cases

### EC-1: Tylko 1 projekt w Bridge
Scenariusz: `projects: [{ key: "kira-dashboard", ... }]` — jeden element
Oczekiwane zachowanie: dropdown pokazuje jeden projekt (aktywny) + separator + "Nowy projekt"; nie ukrywaj dropdown

### EC-2: Błąd switch projektu (Bridge offline)
Scenariusz: `POST /api/projects/switch` zwraca 503
Oczekiwane zachowanie: rollback optimistic UI (przywróć poprzedni projekt), toast.error "Nie można przełączyć projektu — Bridge niedostępny"

### EC-3: `is_current` brak (żaden projekt nie ma `is_current: true`)
Scenariusz: Bridge nie raportuje aktywnego projektu
Oczekiwane zachowanie: przycisk pokazuje "Wybierz projekt", pierwszy projekt na liście jest wyróżniony

---

## 🚫 Out of Scope tej Story
- Edycja nazwy projektu z UI
- Usuwanie projektu z dropdown
- Stats per epic w dropdown (tylko per projekt)
- Drag & drop reorder projektów

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów
- [ ] Dropdown zamyka się przy kliknięciu poza (document click listener cleanup w useEffect)
- [ ] Optimistic UI rollback przy błędzie switch (EC-2)
- [ ] Loading skeleton w miejscu przycisku
- [ ] Offline state: przycisk disabled z fallback nazwą
- [ ] `+ Nowy projekt` otwiera `NewProjectWizard`
- [ ] Completion bar wyrenderowana (gradient, proporcjonalna do `completion_pct`)
- [ ] Keyboard navigation: strzałki, Enter, Escape
- [ ] Brak console.error podczas normalnego użytkowania
