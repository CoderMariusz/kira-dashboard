---
story_id: STORY-8.4
title: "Patterns page — szkielet strony, tabs, search bar, sidebar nav, URL state"
epic: EPIC-8
module: dashboard
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: [STORY-8.3]
blocks: [STORY-8.5, STORY-8.6, STORY-8.7]
tags: [page, layout, tabs, search, sidebar, url-state, navigation]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** wejść na `/dashboard/patterns` i zobaczyć stronę z zakładkami Patterns / Lessons i polem search
**Żeby** mieć centralny widok bazy wiedzy pipeline'u dostępny z sidebar

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/dashboard/patterns`
Plik strony: `app/dashboard/patterns/page.tsx`
Sidebar: komponent sidebar dashboardu (sprawdź istniejący plik — wzorzec z EPIC-1)
Sekcja Intelligence w sidebar: mockup v3 linia 363–364

### Powiązane pliki
- Istniejący layout: `app/dashboard/layout.tsx`
- Sidebar komponent (sprawdź lokalizację — prawdopodobnie `components/dashboard/Sidebar.tsx` lub `app/dashboard/components/`)
- `hooks/usePatternPage.ts` — z STORY-8.3
- Wzorzec page dla porównania: `app/dashboard/eval/page.tsx` (z EPIC-7)
- Kira Dashboard mockup v3: `epics/kira-dashboard-mockup-v3.html`

### Paleta kolorów (spójna z resztą dashboardu)
- Tło strony: `#0d0c1a`
- Karta/sekcja: `#1a1730`
- Border: `#2a2540`
- Accent / active tab: `#818cf8`
- Tekst główny: `#e2e8f0`
- Tekst secondary: `#94a3b8`

### Stan systemu przed tą story
- STORY-8.3 dostarcza `usePatternPage()` zwracający `{ patterns, lessons, isLoading, error }`
- Dashboard layout z sidebar istnieje i ma sekcję Intelligence (sprawdź istniejący sidebar)

---

## ✅ Acceptance Criteria

### AC-1: Strona dostępna pod `/dashboard/patterns`
GIVEN: Zalogowany użytkownik
WHEN: Przechodzi na `/dashboard/patterns`
THEN: Strona renderuje się bez błędu 404 lub 500
AND: Tytuł strony to „Patterns & Lessons" (np. w `<h1>` lub `<PageHeader>`)

### AC-2: Sidebar nav — pozycja „🧠 Patterns & Lessons" w sekcji Intelligence
GIVEN: Użytkownik jest na dowolnej stronie dashboardu
WHEN: Patrzy na sidebar
THEN: Widzi pozycję „🧠 Patterns & Lessons" w sekcji Intelligence
AND: Gdy jest na `/dashboard/patterns` — pozycja jest podświetlona kolorem `#818cf8`
AND: Klik w pozycję nawiguje do `/dashboard/patterns`

### AC-3: Tabs Patterns / Lessons z URL state
GIVEN: Użytkownik jest na `/dashboard/patterns`
WHEN: Klika tab „Lessons"
THEN: URL zmienia się na `/dashboard/patterns?tab=lessons`
AND: Aktywny tab jest podświetlony `#818cf8`; nieaktywny jest szary
WHEN: Użytkownik kopiuje URL i otwiera w nowej karcie
THEN: Otwiera się strona z aktywnym tabem Lessons

### AC-4: Globalny search bar filtruje obie sekcje w czasie rzeczywistym
GIVEN: Użytkownik wpisuje "GLM-5" w pole search (debounce 300ms)
WHEN: Dane są załadowane
THEN: Sekcja Patterns pokazuje tylko karty zawierające "GLM-5" (case-insensitive) w `text`, `model`, `domain`, `category` lub `tags`
AND: Sekcja Lessons pokazuje tylko lekcje zawierające "GLM-5" w `title`, `body`, `lesson` lub `tags`
AND: Stan search jest zapisany w URL query param `?q=GLM-5`

### AC-5: Dropdown filtr tagów
GIVEN: Dane załadowane, użytkownik otwiera dropdown tagów
WHEN: Wybiera tag "pipeline"
THEN: Obie sekcje filtrują do wpisów z tagiem "pipeline" (case-insensitive)
AND: Stan filtru tagów jest zapisany w URL: `?tag=pipeline`
AND: Można wybrać tylko jeden tag naraz (single-select)

### AC-6: Stany loading i error
GIVEN: Dane są pobierane (isLoading=true)
WHEN: Strona się renderuje
THEN: Widoczny skeleton loader (np. 3 prostokąty animowane pulse) zamiast treści
GIVEN: API zwróciło błąd (error != null)
WHEN: Strona się renderuje
THEN: Widoczny komunikat "Nie można załadować danych — Bridge może być offline. Spróbuj ponownie." z przyciskiem „Odśwież"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/dashboard/patterns`
Komponent główny: `PatternsPage` (Server Component wrapper → Client Component dla interaktywności)
Plik: `app/dashboard/patterns/page.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PatternsPage` | Client Page | — | loading, error, filled |
| `PatternsHeader` | div/section | `totalPatterns, totalLessons` | statyczny |
| `PatternsTabs` | Tabs (shadcn) | `activeTab, onTabChange` | patterns, lessons |
| `PatternsSearchBar` | Input | `value, onChange, tagOptions, selectedTag, onTagChange` | — |
| `PatternsContent` | div | `tab, patterns, lessons, search, tag, isLoading` | loading, empty, filled |

### Pola formularza (search)

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| search | text | max 100 znaków | — | nie |
| tag | select | jeden z dostępnych tagów | — | nie |

### Stany widoku

**Loading:**
3 skeleton cards animowane (`animate-pulse`, tło `#2a2540`, rounded-lg) rozmieszczone w gridzie

**Empty (brak danych po filtracji):**
Tekst: „Brak wyników dla „{query}" — spróbuj innego wyszukiwania" z ikoną 🔍

**Error (błąd sieci/Bridge offline):**
Komunikat: „Nie można załadować danych — Bridge może być offline"
Przycisk: „Odśwież" → wywołuje `refresh()` z hooka

**Filled (normalny stan):**
Tabs Patterns / Lessons z treścią (komponenty z STORY-8.5 i STORY-8.6)

### Flow interakcji

```
1. Użytkownik wchodzi na /dashboard/patterns → czyta ?tab, ?q, ?tag z URL
2. usePatternPage() pobiera dane → isLoading=true → skeleton
3. Dane załadowane → wypełniony widok z obu sekcji
4. Użytkownik wpisuje w search → debounce 300ms → filtrowanie w pamięci → URL update
5. Użytkownik wybiera tag z dropdown → filtrowanie → URL update
6. Użytkownik klika tab Lessons → URL: ?tab=lessons → sekcja Lessons widoczna
7. Co 60 sekund SWR auto-odświeża dane w tle (bez skeleton — stare dane nadal widoczne)
```

### URL state management

```typescript
// Czytaj z URL: useSearchParams()
// Zapisuj do URL: useRouter().replace() z nowym search string (NIE push — nie zaśmiecaj historii)
// Params: tab=patterns|lessons, q=string, tag=string
```

### Responsive / Dostępność
- Mobile (375px+): Tabs jako full-width; search bar pod headerem; sidebar zwinięty
- Desktop (1280px+): Layout normalny dashboardu (sidebar visible, content area)
- Keyboard: Tab przełącza zakładki; Escape czyści search
- ARIA: `<input aria-label="Szukaj we wzorcach i lekcjach">`, tabs z `role="tablist"` i `aria-selected`

---

## ⚠️ Edge Cases

### EC-1: URL z nieprawidłowym tab param
Scenariusz: URL `/dashboard/patterns?tab=invalid`
Oczekiwane zachowanie: Domyślnie wyświetla tab Patterns (fallback); bez błędu

### EC-2: Search query z regex-alnymi znakami
Scenariusz: Użytkownik wpisuje `[GLM-5]` (nawiasy kwadratowe)
Oczekiwane zachowanie: Filtrowanie używa prostego `string.includes()` (nie RegExp) — nie crashuje

### EC-3: Brak tagów w danych
Scenariusz: Wszystkie PatternCard i Lesson mają `tags: []`
Oczekiwane zachowanie: Dropdown tagów jest pusty lub ukryty; search nadal działa

---

## 🚫 Out of Scope tej Story
- Komponenty PatternCard i LessonItem (STORY-8.5, STORY-8.6)
- Modale dodawania (STORY-8.7)
- Real-time WebSocket

---

## ✔️ Definition of Done
- [ ] Strona `/dashboard/patterns` renderuje się bez błędów dla zalogowanego usera
- [ ] Sidebar ma pozycję „🧠 Patterns & Lessons" podświetloną na aktywnej stronie
- [ ] Tabs Patterns/Lessons przełączają się i zapisują stan w URL (?tab=)
- [ ] Search bar filtruje dane w czasie rzeczywistym (debounce 300ms) i zapisuje ?q= w URL
- [ ] Dropdown tagów filtruje i zapisuje ?tag= w URL
- [ ] Stany loading (skeleton), error (komunikat + Odśwież), empty (komunikat) zaimplementowane
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
