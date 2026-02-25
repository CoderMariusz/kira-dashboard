---
story_id: STORY-8.6
title: "Sekcja Lessons — timeline view z severity pills i rozwijalnymi wpisami"
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
tags: [component, timeline, lessons, severity, accordion, pills]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć lekcje pipeline'u jako timeline z severity pills, z możliwością rozwijania każdego wpisu
**Żeby** szybko zidentyfikować krytyczne błędy (czerwony) od obserwacji (niebieski) i rozumieć co poszło nie tak

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Komponenty:
- `components/patterns/LessonItem.tsx` — jeden wpis timeline
- `components/patterns/LessonsTimeline.tsx` — lista z empty state i filtrem severity
Używane w: `app/dashboard/patterns/page.tsx` (STORY-8.4) → sekcja tab Lessons

### Powiązane pliki
- `types/patterns.ts` — typ `Lesson`, `LessonSeverity` z STORY-8.3
- Wzorzec accordion: shadcn/ui `Accordion` lub własna implementacja (sprawdź co już jest w projekcie)
- Paleta kolorów severity: critical=`#f87171`, warning=`#fbbf24`, info=`#818cf8`

### Stan systemu przed tą story
- STORY-8.4 dostarcza filtered `lessons: Lesson[]` jako props do sekcji

---

## ✅ Acceptance Criteria

### AC-1: Lista lessons renderuje się jako timeline z lewą linią
GIVEN: `lessons` zawiera 3 wpisy (1 critical, 1 warning, 1 info)
WHEN: Użytkownik jest na tab Lessons
THEN: Widzi timeline — pionowa linia po lewej, każdy wpis to „node" na linii
AND: Kolor lewej linii i kółka node'a odpowiada severity: critical=`#f87171`, warning=`#fbbf24`, info=`#818cf8`

### AC-2: Severity pill na każdym wpisie
GIVEN: Lesson z `severity: "critical"`
WHEN: Karta się renderuje
THEN: Pill z tekstem „🔴 CRITICAL", tło `#2d0a0a`, tekst `#f87171`
GIVEN: Lesson z `severity: "warning"`
THEN: Pill z tekstem „🟡 WARNING", tło `#2d2000`, tekst `#fbbf24`
GIVEN: Lesson z `severity: "info"`
THEN: Pill z tekstem „🔵 INFO", tło `#1e1b4b`, tekst `#818cf8`

### AC-3: Rozwijany body (accordion)
GIVEN: LessonItem jest zwinięty (domyślnie)
WHEN: Użytkownik klika nagłówek lekcji (tytuł lub chevron)
THEN: Wpis rozszerza się i pokazuje: `body` (What went wrong), `root_cause`, `fix`, wyróżniony blok `lesson`
AND: Chevron rotate 180° animowany
AND: Kliknięcie ponownie zwija wpis

### AC-4: Lesson highlight block
GIVEN: LessonItem jest rozwinięty
WHEN: Sekcja `lesson` jest widoczna
THEN: Tekst lekcji wyświetlony w wyróżnionym bloku z lewym borderem `#818cf8`, tło `#1a1730`
AND: Prefix „💡 Lekcja:" pogrubiony

### AC-5: Filtr severity nad listą
GIVEN: Użytkownik klika przycisk „🔴 Critical" w filterze nad listą
WHEN: Lista się aktualizuje
THEN: Widoczne są tylko lekcje z severity=critical
AND: Aktywny filtr jest podświetlony; klik ponownie → reset filtra (wszystkie severity widoczne)
AND: Stan filtru severity zapisany w URL param `?severity=critical|warning|info|all`

### AC-6: Empty state po filtracji
GIVEN: Filtr search/severity daje 0 wyników
WHEN: `lessons` jest pusta (po filtracji)
THEN: Komunikat „Brak lekcji pasujących do filtrów ⚠️" wyśrodkowany

### AC-7: Sortowanie — najnowsze na górze
GIVEN: Lessons mają różne daty
WHEN: Lista się renderuje
THEN: Posortowana chronologicznie malejąco (najnowsza data na górze); wpisy bez daty na końcu

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/dashboard/patterns` (tab Lessons)
Komponenty: `LessonsTimeline`, `LessonItem`
Pliki: `components/patterns/LessonsTimeline.tsx`, `components/patterns/LessonItem.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `LessonsTimeline` | div | `lessons: Lesson[]`, `activeSeverity: LessonSeverity \| null`, `onSeverityChange: (s) => void` | empty, filled |
| `LessonItem` | article | `lesson: Lesson`, `defaultOpen?: boolean` | collapsed, expanded |
| `SeverityPill` | span | `severity: LessonSeverity`, `size?: 'sm' \| 'md'` | — |
| `SeverityFilter` | div | `active: LessonSeverity \| null`, `onChange: (s) => void` | — |

### Stany widoku

**Loading:** Obsługiwane przez STORY-8.4 — tu się nie pojawia

**Empty:**
Tekst: „Brak lekcji pasujących do filtrów ⚠️"
Kolor: `#94a3b8`, wyśrodkowany, py-12

**Filled:** Timeline z wpisami posortowanymi newest first

### Layout LessonItem (zwinięty)

```
 ●────────────────────────────────────────
 │  [🔴 CRITICAL]  BUG-003: Tytuł lekcji
 │  [kategoria]  📅 2026-02-25  [tag1][tag2]   ▼
 ●────────────────────────────────────────
```

### Layout LessonItem (rozwinięty)

```
 ●────────────────────────────────────────
 │  [🔴 CRITICAL]  BUG-003: Tytuł lekcji
 │  [kategoria]  📅 2026-02-25  [tag1][tag2]   ▲
 │
 │  Co poszło nie tak:
 │  {body}
 │
 │  Root cause: {root_cause}
 │
 │  Fix: {fix}
 │
 │  ┃ 💡 Lekcja: {lesson}
 │  ┃ (wyróżniony blok, border-left #818cf8)
 │
 ●────────────────────────────────────────
```

### Filtr severity (nad listą)

```
Filtruj:  [Wszystkie]  [🔴 Critical]  [🟡 Warning]  [🔵 Info]
```

Przyciski toggle; aktywny = wypełniony (background severity color); nieaktywny = outlined

### Responsive / Dostępność
- Mobile (375px+): Timeline linia ukryta (tylko pionowy stack); severity pills pod tytułem
- Desktop (1280px+): Pełny timeline z lewą linią i kółkami
- Keyboard: Enter/Space na nagłówku LessonItem = toggle; Tab przez filtry severity
- ARIA: `<article aria-expanded={isOpen}>`, `<button aria-label="Rozwiń lekcję {title}">`

---

## ⚠️ Edge Cases

### EC-1: root_cause lub fix jest null
Scenariusz: Lesson ma `root_cause: null` i `fix: null`
Oczekiwane zachowanie: Sekcje „Root cause:" i „Fix:" są ukryte; wyświetlany jest tylko `body` i `lesson`; NIE ma pustych nagłówków

### EC-2: Bardzo długi body (>500 słów)
Scenariusz: Sekcja body z LESSONS_LEARNED.md jest bardzo długa
Oczekiwane zachowanie: Body wyświetlone w pełni (brak truncate — to dane techniczne do przeczytania)

### EC-3: Brak daty
Scenariusz: `lesson.date = null`
Oczekiwane zachowanie: Data nie jest wyświetlana; wpis trafia na koniec listy przy sortowaniu

---

## 🚫 Out of Scope tej Story
- Sekcja Patterns (STORY-8.5)
- Modal dodawania lekcji (STORY-8.7)
- Edycja/usuwanie wpisów

---

## ✔️ Definition of Done
- [ ] Timeline renderuje się z pionową linią i kółkami kolorowanymi per severity
- [ ] Severity pills: critical (red), warning (amber), info (indigo) — kolory zgodne ze specą
- [ ] LessonItem jest domyślnie zwinięty; klik → expand z animacją chevron
- [ ] Rozwinięty wpis pokazuje body, root_cause (jeśli != null), fix (jeśli != null), lesson w highlight bloku
- [ ] Filtr severity zapisuje ?severity= w URL i filtruje listę
- [ ] Posortowane newest first (null date na końcu)
- [ ] Empty state: „Brak lekcji pasujących do filtrów ⚠️"
- [ ] Mobile: działa bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
