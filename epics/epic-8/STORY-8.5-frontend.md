---
story_id: STORY-8.5
title: "Sekcja Patterns — siatka kart PatternCard z tagami, typem i linkami"
epic: EPIC-8
module: dashboard
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: [STORY-8.4]
blocks: [STORY-8.7]
tags: [component, card, grid, patterns, tags, badge]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć wzorce pipeline'u jako siatka kart z typem, kategorią, tagami i linkami do stories
**Żeby** szybko przeglądać co działa (PATTERN) i czego unikać (ANTI_PATTERN) bez otwierania pliku

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Komponent: `PatternCard` (wariant karty na siatce)
Pliki:
- `components/patterns/PatternCard.tsx`
- `components/patterns/PatternGrid.tsx` (wrapper siatki z empty state)
Używane w: `app/dashboard/patterns/page.tsx` (STORY-8.4) → sekcja tab Patterns

### Powiązane pliki
- `types/patterns.ts` — typ `PatternCard` z STORY-8.3
- Wzorzec karty: `components/dashboard/StatCard.tsx` lub analogiczny (z EPIC-1)
- Paleta kolorów: EPIC-8 tech details (sekcja "Kolory kart Patterns")

### Stan systemu przed tą story
- STORY-8.4 dostarcza filtered `patterns: PatternCard[]` jako props do sekcji

---

## ✅ Acceptance Criteria

### AC-1: Siatka kart wyświetla wszystkie wzorce z danych
GIVEN: `patterns` zawiera 5 PatternCard (3 PATTERN + 2 ANTI_PATTERN)
WHEN: Użytkownik jest na tab Patterns
THEN: Widzi 5 kart w siatce (grid 3 kolumny desktop, 2 tablet, 1 mobile)
AND: Każda karta ma: badge typu, kategorię, tekst wzorca, datę (jeśli istnieje), tagi jako pill-y

### AC-2: Badge typ — PATTERN vs ANTI_PATTERN z różnymi kolorami
GIVEN: Karta z `type: "PATTERN"`
WHEN: Renderuje się
THEN: Badge z tekstem „✅ PATTERN", tło `#1e1b4b`, tekst `#818cf8`
GIVEN: Karta z `type: "ANTI_PATTERN"`
WHEN: Renderuje się
THEN: Badge z tekstem „❌ ANTI_PATTERN", tło `#2d0a0a`, tekst `#f87171`

### AC-3: Tagi są klikalne i filtrują siatkę
GIVEN: PatternCard ma `tags: ["pipeline", "glm-5"]`
WHEN: Użytkownik klika na tag „glm-5"
THEN: Tag jest wybrany (wywołuje `onTagFilter("glm-5")` props callback)
AND: URL aktualizuje się do `?tag=glm-5` (obsługiwane przez STORY-8.4)
AND: Tag pill wizualnie pokazuje stan „aktywny" gdy odpowiada URL ?tag=

### AC-4: model i domain wyświetlone jako secondary info
GIVEN: PatternCard ma `model: "GLM-5"` i `domain: "frontend"`
WHEN: Karta się renderuje
THEN: Widoczna linia `[GLM-5] [frontend]` pod tekstem wzorca, kolor `#94a3b8` (secondary)
AND: Jeśli model lub domain to null — ta linia nie jest wyświetlana (nie ma pustego nawiasu)

### AC-5: related_stories jako linki
GIVEN: PatternCard ma `related_stories: ["STORY-8.1", "STORY-8.3"]`
WHEN: Karta się renderuje
THEN: Pod tagami widoczna sekcja „Powiązane: STORY-8.1, STORY-8.3"
AND: Każde story ID to klikalne elementy (text-`#818cf8`); klik kopiuje ID do schowka z toast „Skopiowano!"
AND: Jeśli `related_stories` jest puste — sekcja jest ukryta

### AC-6: Empty state — brak wzorców po filtracji
GIVEN: Filtr search/tag daje 0 wyników
WHEN: `patterns` jest pusta tablicą
THEN: Widoczny komunikat „Brak wzorców pasujących do filtrów 🔍" wyśrodkowany w obszarze siatki
AND: Brak pustego gridu (nie ma phantom elementów)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/dashboard/patterns` (tab Patterns)
Komponent: `PatternCard`, `PatternGrid`
Pliki: `components/patterns/PatternCard.tsx`, `components/patterns/PatternGrid.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PatternGrid` | div | `patterns: PatternCard[]`, `activeTag: string \| null`, `onTagFilter: (tag: string) => void` | empty, filled |
| `PatternCard` | article | `pattern: PatternCard`, `activeTag: string \| null`, `onTagFilter: (tag: string) => void` | statyczny |
| `PatternTypeBadge` | span | `type: PatternType` | PATTERN \| ANTI_PATTERN |
| `TagPill` | button | `tag: string`, `active: boolean`, `onClick: () => void` | active, inactive |

### Stany widoku

**Loading:** Nie obsługiwany tutaj — skeleton w STORY-8.4 (PatternGrid renderuje się dopiero po załadowaniu)

**Empty (brak wyników):**
Tekst: „Brak wzorców pasujących do filtrów 🔍"
Umieszczony: wyśrodkowany, kolor `#94a3b8`, padding py-12

**Filled:**
Grid 3 kolumny na desktop; karty z tłem `#1a1730`, border `#2a2540` (hover: `#3b3d7a`), rounded-xl, p-4

### Layout karty

```
┌────────────────────────────────────┐
│ [✅ PATTERN]  [kategoria]          │  ← górny rząd
├────────────────────────────────────┤
│ Tekst wzorca (max 3 linie, clamp) │  ← główna treść
├────────────────────────────────────┤
│ [GLM-5] [frontend]                │  ← secondary text
├────────────────────────────────────┤
│ [tag1] [tag2] [tag3]              │  ← tagi pill-y
├────────────────────────────────────┤
│ Powiązane: STORY-8.1 STORY-8.3   │  ← opcjonalne
│ 📅 2026-02-17              1×     │  ← data + occurrences
└────────────────────────────────────┘
```

### Responsive / Dostępność
- Mobile (375px+): 1 kolumna, full-width karty
- Tablet (768px+): 2 kolumny
- Desktop (1280px+): 3 kolumny (CSS grid `grid-cols-3`)
- Keyboard: TagPill fokusowalne; Enter = klik tagu; Tab przez karty
- ARIA: `<article aria-label="Wzorzec: {text.slice(0,50)}">`, tagi `<button aria-pressed={active}>`

---

## ⚠️ Edge Cases

### EC-1: Bardzo długi tekst wzorca
Scenariusz: `text` ma 400 znaków
Oczekiwane zachowanie: Tekst jest ucięty po 3 liniach (`line-clamp-3`) z `...`; pełny tekst w `title` atrybucie (hover tooltip)

### EC-2: Dużo tagów (>6)
Scenariusz: PatternCard ma 8 tagów
Oczekiwane zachowanie: Pierwsze 5 tagów widoczne; badge „+3" oznacza resztę; klik na „+3" nie robi nic (tylko informacyjny)

### EC-3: related_stories zawiera nieistniejące ID
Scenariusz: `related_stories: ["STORY-99.99"]`
Oczekiwane zachowanie: ID wyświetlone jako tekst z opcją kopii do schowka; NIE ma external link (nie ma routingu do story page)

---

## 🚫 Out of Scope tej Story
- Edycja i usuwanie kart
- Sekcja Lessons (STORY-8.6)
- Modal dodawania (STORY-8.7)

---

## ✔️ Definition of Done
- [ ] PatternGrid wyświetla karty w grid 1/2/3 kolumny (mobile/tablet/desktop)
- [ ] Badge PATTERN (indigo) i ANTI_PATTERN (red) są poprawnie ostylowane
- [ ] Tagi są klikalne i wywołują callback onTagFilter
- [ ] Aktywny tag (z URL ?tag=) jest wizualnie wyróżniony
- [ ] model i domain są wyświetlone, `null` jest ukryty
- [ ] related_stories jako tekst z kopiowaniem do schowka
- [ ] Empty state: „Brak wzorców pasujących do filtrów 🔍"
- [ ] Tekst wzorca ucięty po 3 liniach
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Story review przez PO
