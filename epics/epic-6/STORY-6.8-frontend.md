---
story_id: STORY-6.8
title: "Bulk selection checkboxy i BulkActionBar w PipelinePanel — masowe operacje na stories"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 8h
depends_on: [STORY-6.5, STORY-6.7]
blocks: none
tags: [checkbox, bulk-actions, pipeline, toolbar, animation, confirmation-dialog, frontend]
---

## 🎯 User Story

**Jako** Mariusz (admin / tech lead)
**Chcę** móc zaznaczyć wiele stories checkboxami w PipelinePanel i wykonać na nich masową operację (advance / assign model) jednym kliknięciem
**Żeby** zamiast klikać advance na każdej story z osobna po sesji review, przesunąć wszystkie naraz

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Pliki do stworzenia:
```
components/pipeline/BulkActionBar.tsx     → sticky bottom toolbar
```

Pliki do modyfikacji:
```
components/pipeline/PipelineRow.tsx       → dodaj checkbox (hover-reveal)
components/pipeline/PipelinePanel.tsx     → stan selekcji + render BulkActionBar
```

Stack:
- Next.js 16, React 18, `'use client'`
- Tailwind CSS + CSS modules dla checkbox styling
- `sonner` — toasty
- `projectsService.bulkAction` z `services/projectsService.ts` (STORY-6.5)
- shadcn `AlertDialog` — confirmation dialog przed advance
- `useSWRConfig().mutate` do odświeżania pipeline po bulk action

### Powiązane pliki
- `components/pipeline/PipelinePanel.tsx` — istniejący, do modyfikacji
- `components/pipeline/PipelineRow.tsx` — istniejący, do modyfikacji
- `services/projectsService.ts` (STORY-6.5)
- `types/pipeline-prd.ts` (STORY-6.5) — `BulkActionRequest`, `BulkActionResponse`
- Kolory: tło `#0d0c1a`, karty `#1a1730`, akcent `#818cf8`, border `#2a2540`

### Stan systemu przed tą story
- PipelinePanel i PipelineRow istnieją i działają
- STORY-6.5 zaimplementowana (serwisy + typy)

---

## ✅ Acceptance Criteria

### AC-1: Checkbox hover-reveal na PipelineRow
GIVEN: użytkownik jest na `/dashboard/pipeline` z listą stories
WHEN: użytkownik najeżdża kursorem na PipelineRow
THEN: checkbox pojawia się po lewej stronie row (opacity 0 → 1, transition 150ms)
WHEN: użytkownik nie najeżdża na żaden row i żaden row nie jest zaznaczony
THEN: żaden checkbox nie jest widoczny

### AC-2: Zaznaczenie pierwszego checkboxa ujawnia wszystkie
GIVEN: żadna story nie jest zaznaczona
WHEN: użytkownik zaznacza jeden checkbox
THEN: checkboxy stają się widoczne (permanentnie) na wszystkich wierszach do czasu odznaczenia wszystkich
AND: zaznaczony row ma tło `#1e1b38` i border `1px solid #818cf8`

### AC-3: BulkActionBar slide-up
GIVEN: co najmniej 1 story jest zaznaczona
WHEN: selectedIds.size > 0
THEN: BulkActionBar pojawia się na dole PipelinePanel z animacją slide-up (translateY 100% → 0, 200ms ease)
AND: toolbar pokazuje "☑ N zaznaczone" gdzie N to liczba zaznaczonych stories

### AC-4: Bulk Advance — flow z confirmation
GIVEN: 3 stories zaznaczone, użytkownik klika "Advance ▼" → wybiera "REVIEW"
WHEN: pojawia się AlertDialog: "Czy chcesz przesunąć 3 stories do statusu REVIEW? Tej operacji nie można cofnąć."
AND: użytkownik klika "Potwierdź"
THEN: BulkActionBar pokazuje spinner + "Przetwarzanie 3 stories..."
AND: wywołany `POST /api/stories/bulk-action` z `{ story_ids: [...], action: "advance", payload: { status: "REVIEW" } }`
AND: toast.success "3/3 stories przesunięte do REVIEW"
AND: `clearSelection()` + SWR mutate pipeline

### AC-5: Partial success toast
GIVEN: bulk action z 3 story IDs, 1 kończy się błędem
WHEN: endpoint zwraca `{ success_count: 2, failure_count: 1, results: [...] }`
THEN: toast.warning "2/3 sukces, 1 błąd: STORY-X.X — {error message}"
AND: `clearSelection()` + SWR mutate pipeline

### AC-6: Assign Model — bez confirmation
GIVEN: 2 stories zaznaczone, użytkownik klika "Assign Model ▼" → wybiera "sonnet"
WHEN: użytkownik klika model
THEN: BEZ confirmation dialog — natychmiastowe wywołanie `bulkAction` z `{ action: "assign_model", payload: { model: "sonnet" } }`
AND: toast.success "2/2 stories przypisane do sonnet"

### AC-7: "Zaznacz wszystko" / odznaczenie wszystkich
GIVEN: BulkActionBar jest widoczny
WHEN: użytkownik klika "Zaznacz wszystko"
THEN: wszystkie visible stories w PipelinePanel są zaznaczone
WHEN: użytkownik klika ✕ w BulkActionBar
THEN: `clearSelection()` → selekcja pusta, BulkActionBar znika (slide-down)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
- Route: `/dashboard/pipeline`
- Nowe pliki: `BulkActionBar.tsx`
- Modyfikacje: `PipelineRow.tsx`, `PipelinePanel.tsx`

### Stan selekcji w `PipelinePanel`
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const isSelecting = selectedIds.size > 0

const toggleSelect = (id: string) =>
  setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

const selectAll = () =>
  setSelectedIds(new Set(filteredStories.map(s => s.id)))

const clearSelection = () => setSelectedIds(new Set())
```

### Props modyfikacje `PipelineRow`
```typescript
interface PipelineRowProps {
  // ... istniejące props
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  showCheckbox?: boolean    // true gdy isSelecting lub hover
}
```

### Props `BulkActionBar`
```typescript
interface BulkActionBarProps {
  selectedIds: string[]
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkAction: (action: BulkActionRequest) => Promise<void>
  isLoading: boolean
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| PipelineRow | tr/div | `isSelected`, `onToggleSelect`, `showCheckbox` | normal, hover (checkbox visible), selected |
| BulkActionBar | sticky div | `selectedIds`, `onSelectAll`, `onClearSelection`, `onBulkAction` | idle, loading, dropdown-open |
| AdvanceDropdown | Dropdown menu | statusy do wyboru | closed, open |
| ModelDropdown | Dropdown menu | modele do wyboru | closed, open |
| AlertDialog | shadcn | `open`, `onConfirm`, `onCancel`, message | closed, open |

### Stany widoku

**Brak selekcji:**
PipelinePanel wygląda normalnie; checkboxy niewidoczne; BulkActionBar nieobecny w DOM

**Aktywna selekcja (isSelecting=true):**
BulkActionBar wjedzie slide-up; checkboxy widoczne na wszystkich rowach; zaznaczone rowy wyróżnione

**Loading (bulk action in progress):**
BulkActionBar: spinner + "Przetwarzanie N stories..."; przyciski disabled; checkboxy locked

### Styl checkboxa
```css
/* Własny checkbox — appearance: none */
.bulk-checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid #3b3d7a;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  transition: all 150ms ease;
  flex-shrink: 0;
}
.bulk-checkbox:hover { border-color: #818cf8; }
.bulk-checkbox:checked {
  background: #818cf8;
  border-color: #818cf8;
  /* biały checkmark przez SVG background-image lub after pseudo-element */
}
```

### Styl zaznaczonego row
```
background: #1e1b38 (normalny: #13111c lub transparent)
border-left: 2px solid #818cf8 (normalny: transparent)
transition: background 100ms ease, border 100ms ease
```

### Styl BulkActionBar
```
position: sticky
bottom: 0
left: 0
right: 0
background: #1a1730
border-top: 1px solid #818cf8
padding: 10px 16px
display: flex
align-items: center
gap: 8px
z-index: 10

// Animacja:
animation: slideUp 200ms ease forwards
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
```

### Statusy w Advance dropdown
```
"REVIEW"    — "Do Review"
"DONE"      — "Oznacz jako Done"
"MERGE"     — "Merge"
"REFACTOR"  — "Do Refaktor"
```

### Modele w Assign Model dropdown
```
"kimi"    — "Kimi K2.5"
"glm"     — "GLM-5"
"sonnet"  — "Sonnet 4.6"
"codex"   — "Codex 5.3"
"haiku"   — "Haiku 4.5"
"opus"    — "Opus 4.6"
```

### Flow interakcji (krok po kroku)
```
1. Hover na PipelineRow → checkbox pojawia się (opacity 1)
2. Klik checkbox → toggleSelect(id) → isSelecting=true → BulkActionBar slide-up
3. Klik "Zaznacz wszystko" → selectAll()
4. Klik "Advance ▼" → AdvanceDropdown otwiera się
5. Klik status (np. "REVIEW") → AlertDialog otwiera się z potwierdzeniem
6. Klik "Potwierdź" → setIsLoading(true) → bulkAction({ story_ids: [...], action: 'advance', payload: { status: 'REVIEW' } })
7a. Sukces (success_count === total) → toast.success `${n}/${n} stories do REVIEW` → clearSelection() → mutate()
7b. Partial failure → toast.warning z detalami → clearSelection() → mutate()
7c. Błąd (500) → toast.error "Błąd serwera" → setIsLoading(false), selekcja zostaje
8. Klik ✕ w BulkActionBar → clearSelection() → BulkActionBar slide-down
```

### Responsive / Dostępność
- Desktop (1280px+): checkbox po lewej stronie row, BulkActionBar szerokości panelu
- Mobile (375px+): BulkActionBar fixed bottom, checkboxy zawsze widoczne (nie hover-only)
- Keyboard: Space toggleuje checkbox fokusowanego row, checkboxy dostępne przez Tab
- ARIA: checkbox `role="checkbox"`, `aria-checked`, `aria-label="Zaznacz {story_id}"`;
  BulkActionBar `role="toolbar"`, `aria-label="Masowe operacje — N zaznaczonych"`

---

## ⚠️ Edge Cases

### EC-1: Zaznaczone story znika z listy (np. filter zmieniony)
Scenariusz: Użytkownik zaznaczył STORY-1.1, potem zmienił filtr który ją ukrywa
Oczekiwane zachowanie: STORY-1.1 pozostaje w `selectedIds` (Set) ale niewidoczna; bulk action działa na niej mimo to; po bulk action clearSelection + mutate pokażą aktualny stan

### EC-2: Klik w checkbox zatrzymuje propagację do wiersza
Scenariusz: PipelineRow ma `onClick` otwierający modal szczegółów; checkbox kliknięty
Oczekiwane zachowanie: `event.stopPropagation()` w onChange checkboxa — klik checkbox nie otwiera modal

### EC-3: Bulk action dla > 20 stories (API limit)
Scenariusz: Użytkownik zaznaczył 25 stories przez "Zaznacz wszystko"
Oczekiwane zachowanie: BulkActionBar pokazuje warning inline "Max 20 stories na raz — odznacz kilka"; przyciski Advance/Assign disabled; licznik czerwony

### EC-4: Zamknięcie AlertDialog przez Escape
Scenariusz: Dialog potwierdzenia jest otwarty, użytkownik naciska Escape
Oczekiwane zachowanie: Dialog zamknięty, bulk action NIE wywołana, selekcja pozostaje

---

## 🚫 Out of Scope tej Story
- Bulk delete stories
- Drag & drop reorder stories
- Undo bulk action
- Keyboard shortcut Ctrl+A do zaznaczania wszystkich

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów — zero `any`
- [ ] Checkbox hover-reveal działa (opacity 0 → 1 na hover)
- [ ] BulkActionBar slide-up animacja działa
- [ ] AlertDialog przed Advance (shadcn AlertDialog), bez dla Assign Model
- [ ] Partial success toast z detalami błędu per story
- [ ] Max 20 stories guard w UI (EC-3) — warning + disabled buttons
- [ ] `event.stopPropagation()` w checkbox onClick (EC-2)
- [ ] Keyboard: Space toggleuje checkbox, Escape zamyka dialog
- [ ] ARIA: `role="checkbox"` z `aria-checked` i `aria-label` na każdym checkboxie
- [ ] Brak console.error podczas normalnego użytkowania
