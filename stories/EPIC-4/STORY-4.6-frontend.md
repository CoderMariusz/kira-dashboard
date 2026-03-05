---
story_id: STORY-4.6
title: "Kanban board UI — dnd-kit drag & drop, card CRUD"
epic: EPIC-4
module: home
domain: frontend
status: draft
difficulty: complex
recommended_model: codex-5.3
priority: must
estimated_effort: 10h
depends_on: [STORY-4.5]
blocks: [STORY-4.8]
tags: [react, kanban, dnd-kit, drag-drop, touch, mobile, crud]
---

## 🎯 User Story

**Jako** Angelika lub Zuza zalogowana na telefonie lub laptopie
**Chcę** widzieć Kanban board z 3 kolumnami, przenosić karty przez drag & drop (palcem na telefonie) i dodawać/edytować/usuwać zadania
**Żeby** cała rodzina miała czytelny widok co kto ma do zrobienia i mogła aktualizować status zadań bez wysiłku

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/home` (tab/sekcja Kanban)
Komponent główny: `pages/home/components/TaskBoard.tsx`
Hooks: `pages/home/hooks/useKanban.ts`
Biblioteka DnD: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`

### Powiązane pliki
- `pages/home/components/TaskBoard.tsx` — Kanban board z kolumnami
- `pages/home/components/KanbanColumn.tsx` — single kolumna z kartami
- `pages/home/components/KanbanCard.tsx` — karta z drag handle
- `pages/home/components/CardForm.tsx` — formularz add/edit karty (modal/sheet)
- `pages/home/hooks/useKanban.ts` — fetch, mutations, optimistic updates
- `_shared/lib/home-api.ts` — API client

### Stan systemu przed tą story
- STORY-4.5: API `/api/home/kanban` działa (GET columns+cards, POST/PATCH/DELETE cards)
- `@dnd-kit/core`, `@dnd-kit/sortable` zainstalowane (`npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`)
- Tailwind + shadcn/ui dostępne

---

## ✅ Acceptance Criteria

### AC-1: Wyświetlenie 3 kolumn z kartami
GIVEN: API zwraca 3 kolumny (To Do, Doing, Done) z kartami
WHEN: Użytkownik otwiera sekcję Kanban na Home
THEN: Widzi 3 kolumny z tytułami i kartami posortowanymi po `position`
AND: Każda karta pokazuje: tytuł, assigned_to (inicjały lub avatar), due_date (jeśli ustawiona, czerwona gdy przeszłości)
AND: Nad kolumną widoczna liczba kart (np. "To Do (3)")

### AC-2: Drag & drop karty między kolumnami — desktop
GIVEN: Karta "Odkurzyć" jest w kolumnie "To Do" na desktopie
WHEN: Użytkownik przeciąga kartę i upuszcza ją w kolumnie "Doing"
THEN: Karta natychmiast pojawia się w "Doing" (optimistic update)
AND: API `PATCH /api/home/kanban/cards/:id/move` zostaje wywołane z `{ column_id: "col-doing", position: <obliczona> }`
AND: Pozycja jest wyliczana między sąsiednimi kartami (midpoint gap strategy)
AND: Po reload karta nadal jest w "Doing"

### AC-3: Drag & drop na urządzeniu touch (mobile)
GIVEN: Angelika używa telefonu (375px viewport)
WHEN: Długo przytrzymuje kartę (long press ~300ms) i przesuwa palcem do innej kolumny
THEN: Karta podąża za palcem, kolumna pod palcem jest podświetlona
AND: Upuszczenie przenosi kartę (ta sama logika co desktop)
AND: Dnd-kit `TouchSensor` obsługuje gest bez konfliktu ze scrollem strony

### AC-4: Dodanie nowej karty — quick-add
GIVEN: Użytkownik tapie "➕" u dołu kolumny "To Do"
WHEN: Wpisuje "Odkurzyć jutro" i tapie Enter/Dodaj
THEN: System parsuje datę: "jutro" → `due_date = tomorrow ISO date`, tytuł = "Odkurzyć"
AND: Karta pojawia się na dole kolumny "To Do" natychmiast (optimistic)
AND: API `POST /api/home/kanban/cards` zostaje wywołane

### AC-5: Edycja karty (pełny formularz)
GIVEN: Użytkownik klika/tapie kartę (nie drag handle)
WHEN: Otwiera się Card Detail modal/sheet z polami: tytuł, opis, assigned_to (dropdown userów), due_date (date picker)
THEN: Użytkownik może edytować pola i zapisać → API `PATCH /api/home/kanban/cards/:id`
AND: Zmiany odzwierciedlone w board po zapisaniu

### AC-6: Usunięcie karty (home_plus/admin)
GIVEN: Angelika (home_plus) otwiera Card Detail modal karty "Odkurzyć"
WHEN: Tapie "Usuń zadanie" (czerwony przycisk)
THEN: Pojawia się potwierdzenie "Czy na pewno chcesz usunąć to zadanie?"
AND: Po potwierdzeniu: karta znika z board, API `DELETE /api/home/kanban/cards/:id` wywołane
AND: Zuza (role: home) NIE widzi przycisku "Usuń zadanie"

### AC-7: Views toggle — Lista i Kanban
GIVEN: Użytkownik jest na sekcji Kanban
WHEN: Tapie ikonę toggle widoku (📋 Lista / 📊 Kanban)
THEN: Widok Lista pokazuje wszystkie karty jako flat list pogrupowane po kolumnie (bez drag & drop)
AND: Widok Kanban pokazuje 3 kolumny z drag & drop

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home` (tab Zadania)
Komponent: `TaskBoard`
Plik: `pages/home/components/TaskBoard.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| TaskBoard | Board wrapper | `columns`, `onCardMove`, `onCardAdd` | loading, empty, filled |
| KanbanColumn | Column | `column`, `cards`, `onAdd`, `onCardClick` | default, drag-over (highlighted) |
| KanbanCard | Draggable card | `card`, `onClick`, `isDragging` | default, dragging (ghost), dropped |
| CardQuickAdd | Inline input | `columnId`, `onAdd` | idle, focused, submitting |
| CardDetailModal | Modal/Sheet | `card`, `onSave`, `onDelete`, `canDelete` | viewing, editing, saving |
| ViewToggle | Button group | `view`, `onChange` | 'kanban' \| 'list' |

### Pola formularza (CardDetailModal)

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| title | text | min 1, max 500 | "Tytuł jest wymagany" | tak |
| description | textarea | max 2000 | "Opis za długi" | nie |
| assigned_to | select | z listy kb_users | — | nie |
| due_date | date | format YYYY-MM-DD | "Nieprawidłowa data" | nie |

### Stany widoku

**Loading:**
Skeleton columns — 3 wąskie prostokąty (placeholder kolumny) z 2-3 szarymi kartami w każdej. Animacja pulse.

**Empty (brak kart):**
Każda kolumna pokazuje komunikat "Brak zadań" + przycisk "➕ Dodaj pierwsze zadanie".

**Error (błąd API):**
Banner: "Nie udało się załadować zadań. Spróbuj ponownie." + przycisk "Odśwież".

**Filled (normalny stan):**
3 kolumny z kartami, drag handles, liczniki nad kolumnami, floating "➕" button na mobile.

### dnd-kit Setup

```typescript
// Sensory do obsługi mouse + touch:
const sensors = useSensors(
  useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
  useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } })
);

// DndContext + SortableContext per column
// onDragEnd:
//   1. Oblicz nową pozycję (midpoint między kartami przed/po)
//   2. Optimistic update stanu
//   3. Call PATCH /move API
//   4. Na błąd: rollback optimistic state, toast "Błąd przeniesienia zadania"

// Pozycja gap strategy:
// Karta przed: positionBefore, karta po: positionAfter
// newPosition = (positionBefore + positionAfter) / 2
// Gdy za mała różnica (<1): refetch i renormalize positions (1000, 2000, 3000...)
```

### Quick-add date parsing

```typescript
// Prosta, deterministyczna funkcja — bez AI/NLP library
// parseTaskInput("Odkurzyć jutro") → { title: "Odkurzyć", due_date: "2026-03-06" }
// parseTaskInput("Pranie w piątek") → { title: "Pranie", due_date: "2026-03-07" }
// parseTaskInput("Kupić mleko") → { title: "Kupić mleko", due_date: null }

// Słowa kluczowe PL: jutro, pojutrze, w poniedziałek..., dziś, dzisiaj
// Jeśli brak słowa kluczowego → due_date = null, całość = tytuł
```

### Flow interakcji

```
1. Użytkownik wchodzi na /home (tab Zadania) → useKanban hook fetchuje GET /api/home/kanban/columns
2. Loading: skeleton board widoczny
3. Board wyrenderowany z dnd-kit DndContext owijającym kolumny
4. Użytkownik chwyta kartę (mouse/touch) → karta podnosi się (shadow, scale 1.05, z-index wysoki)
5. Drag nad kolumną → kolumna podświetlona (ring border)
6. Drop → onDragEnd: optimistic move, API call
7. API sukces: nic (stan już poprawny)
8. API błąd: rollback, toast "Nie udało się przenieść zadania"
9. Klik karty (nie drag) → CardDetailModal otwiera się
10. Edycja + Zapisz → PATCH API → modal zamknięty, karta zaktualizowana
11. Usuń (home_plus) → confirm dialog → DELETE API → karta znika
```

### Responsive / Dostępność
- Mobile (375px+): 3 kolumny = horizontal scroll (snap scroll) lub tylko 1 kolumna widoczna z tab switcher między nimi; karty pełnej szerokości; touch drag (long press 300ms); FAB "➕" otwiera bottom sheet z wyborem kolumny
- Tablet (768px+): 3 kolumny obok siebie (flex row), każda ~33% szerokości
- Desktop (1280px+): 3 kolumny z max-width, karty mają hover state
- Keyboard navigation: Tab przez kolumny i karty, Enter otwiera card detail, Escape zamyka modal
- ARIA: `role="list"` na liście kart, `role="listitem"` na kartach, `aria-label="Przenieś kartę: {title}"` na drag handle, `aria-live="polite"` na komunikaty błędów

---

## ⚠️ Edge Cases

### EC-1: Drop poza obszar kolumny (nieprawidłowy drop zone)
Scenariusz: Użytkownik upuszcza kartę poza obszarem kolumny (np. na navigation bar)
Oczekiwane zachowanie: Dnd-kit resetuje drag — karta wraca na oryginalne miejsce z animacją
Komunikat dla użytkownika: (brak — karta wraca bez komunikatu)

### EC-2: Sieć padła podczas drag & drop
Scenariusz: Angelika przesuwa kartę, sieć pada przed zakończeniem API call
Oczekiwane zachowanie: Optimistic update pokazuje kartę w nowym miejscu; API call failuje; toast "Brak połączenia — zmiany nie zostały zapisane"; karta wraca na oryginalne miejsce
Komunikat dla użytkownika: "Brak połączenia — zadanie nie zostało przeniesione"

### EC-3: Position overflow (zbyt wiele kart, pozycja <1)
Scenariusz: Bardzo wiele drag & drop operacji spowodowało, że midpoint < 1
Oczekiwane zachowanie: Automatyczna renormalizacja — refetch kolumny, przypisanie nowych pozycji (1000, 2000...) w transakcji, kontynuacja bez ingerencji użytkownika

### EC-4: Touch drag vs. page scroll conflict
Scenariusz: Użytkownik scrolluje stronę na mobile, przypadkowo aktywując drag
Oczekiwane zachowanie: Dnd-kit TouchSensor `delay: 300ms` zapobiega — scroll poniżej 300ms nie aktywuje drag; powyżej 300ms = drag mode (brak scrollu)

### EC-5: Card Detail modal na bardzo małym ekranie (375px)
Scenariusz: CardDetailModal z dużą ilością pól na iPhonie SE
Oczekiwane zachowanie: Modal wyświetla się jako bottom sheet z scrollem wewnątrz (max-height 85vh, overflow-y scroll)

---

## 🚫 Out of Scope tej Story
- Widok Kalendarz (📅) z kartami po due_date — EPIC-4 v2
- Reorder kolumn — poza scope MVP
- Subtaski i checklists w kartach — przyszła feature
- Etykiety/tagi kart — przyszła feature
- Komentarze do kart — przyszła feature

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Drag & drop działa na desktopie (mouse) i mobile (touch, long-press 300ms)
- [ ] Widok działa na mobile 375px (horizontal column scroll lub single-column tabs)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów po polsku
- [ ] Optimistic updates + rollback przy błędzie API
- [ ] Rola `home` nie widzi przycisku "Usuń"
- [ ] Quick-add parsuje "jutro", "pojutrze", "w piątek" poprawnie
- [ ] Po reload — karty w poprawnych kolumnach (persystencja)
- [ ] Story review przez PO
