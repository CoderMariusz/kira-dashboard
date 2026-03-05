---
story_id: STORY-8.3
title: "Pattern detail — pełny opis, przykłady, powiązane anti-patterns"
epic: EPIC-8
module: patterns
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 2h
depends_on: [STORY-8.2]
blocks: []
tags: [detail-view, markdown-render, related-items, shadcn, react-markdown]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** kliknąć kartę pattern/anti-pattern na liście i zobaczyć pełną treść z wyrenderowanym Markdown
**Żeby** przeczytać kompletny opis wzorca, zrozumieć kontekst i zobaczyć powiązane anti-patterns

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/patterns/[id]` (lub modal/sheet na `/patterns` — patrz AC-1)
Komponent: `PatternDetail`
Plik: `/components/patterns/PatternDetail.tsx` (jako Sheet/Dialog) LUB `/app/patterns/[id]/page.tsx`

**Preferowane podejście:** Slide-over Sheet (shadcn `Sheet`) wysuniętny z prawej strony — bez pełnej nawigacji; URL nie zmienia się. Czytelne i szybkie dla browsera.

### Powiązane pliki
- Dane już załadowane na poziomie `PatternsBrowser` (STORY-8.2) — `PatternEntry` z API
- `react-markdown` + `remark-gfm` do renderowania Markdown

### Stan systemu przed tą story
- STORY-8.2 gotowa: lista kart wyświetlona, dane załadowane, `PatternEntry[]` dostępne w state
- `react-markdown` i `remark-gfm` zainstalowane jako zależności

---

## ✅ Acceptance Criteria

### AC-1: Klik w kartę otwiera detail view (Sheet)
GIVEN: użytkownik widzi listę pattern cards na `/patterns`
WHEN: klika w kartę (tytuł lub obszar karty, poza tagami)
THEN: otwiera się shadcn `Sheet` z prawej strony; w Sheet: pełny tytuł, category badge, severity badge, data (jeśli dostępna), pełna treść wyrenderowana przez `react-markdown`

### AC-2: Pełna treść wyrenderowana z Markdown
GIVEN: Sheet jest otwarty z PatternEntry
WHEN: Sheet się renderuje
THEN: pole `content` renderowane przez `react-markdown` z `remark-gfm`; kod inline (`\`kodu\``) ma monospace styling; listy punktowane renderują się poprawnie; nagłówki (#) mają odpowiedni rozmiar

### AC-3: Powiązane anti-patterns wyświetlone
GIVEN: Sheet otwarty dla wpisu typu "pattern"
WHEN: renderuje się sekcja "Powiązane anti-patterns"
THEN: jeśli istnieją anti-patterns z tą samą kategorią lub wspólnym tagiem → wyświetlone jako lista linków/kart pod treścią; klik → otwiera Sheet dla powiązanego anti-pattern; jeśli brak powiązanych → sekcja ukryta

### AC-4: Zamknięcie Sheet
GIVEN: Sheet z detail view jest otwarty
WHEN: użytkownik klika "×", poza Sheetem lub wciska Escape
THEN: Sheet zamyka się; lista patterns w tle widoczna i w tym samym stanie filtrowania

### AC-5: Tagi w detail view są klikalne
GIVEN: Sheet z PatternEntry jest otwarty i entry ma tagi
WHEN: użytkownik klika tag w detail view
THEN: Sheet zamyka się; lista w tle filtruje się po klikniętym tagu (ten sam mechanizm co STORY-8.2)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Komponent: `PatternDetail` (Sheet wysuniętny z prawej)
Plik: `/components/patterns/PatternDetail.tsx`
Użycie: renderowany w `PatternsBrowser` z `selectedPattern` state

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PatternDetail` | Sheet (shadcn) | `entry: PatternEntry \| null`, `relatedEntries: PatternEntry[]`, `onClose`, `onTagClick` | open, closed |
| `MarkdownRenderer` | div z react-markdown | `content: string` | — |
| `RelatedPatternsList` | List | `entries: PatternEntry[]`, `onSelect` | empty, filled |

### Stany widoku

**Loading:**
Nie dotyczy — dane już załadowane z listy (PatternEntry przekazany jako prop)

**Empty (brak powiązanych):**
Sekcja "Powiązane anti-patterns" ukryta — nie wyświetlamy pustego bloku

**Error:**
Nie dotyczy — dane renderowane lokalnie bez API call

**Filled (normalny stan):**
Sheet z: nagłówkiem (tytuł + severity badge), metadanymi (kategoria, data, tagi), pełną treścią Markdown, sekcją powiązanych anti-patterns (jeśli istnieją)

### Pola formularza
Nie dotyczy — widok read-only

### Flow interakcji (krok po kroku)

```
1. Użytkownik klika kartę na liście → PatternsBrowser ustawia selectedPattern = PatternEntry
2. PatternDetail Sheet otwiera się z prawej (animate: slide-in)
3. Sheet renderuje: tytuł, category badge, severity badge, datę, pełną treść (react-markdown)
4. Poniżej treści: sekcja "Powiązane anti-patterns" — filtrowna po tej samej kategorii
5. Użytkownik klika powiązany anti-pattern → selectedPattern zmienia się na kliknięty
6. Użytkownik klika tag → Sheet zamyka się, lista filtruje po tagu
7. Użytkownik klika Escape lub × → Sheet zamyka się (selectedPattern = null)
```

### Responsive / Dostępność
- Mobile (375px+): Sheet zajmuje 100% szerokości (full-screen drawer)
- Tablet (768px+): Sheet szerokość 480px
- Desktop (1280px+): Sheet szerokość 560px; lista patterns widoczna w tle
- Keyboard navigation: Escape zamyka Sheet; Tab po linkowaniu powiązanych; Enter/Space na tagu → toggle
- ARIA: `role="dialog"`, `aria-label="Szczegóły wzorca: [tytuł]"` na Sheet; `aria-label="Zamknij szczegóły"` na przycisku ×

---

## ⚠️ Edge Cases

### EC-1: Treść zawiera HTML lub potencjalnie niebezpieczne tagi
Scenariusz: pole `content` parsowane z Markdown zawiera surowy HTML lub JavaScript
Oczekiwane zachowanie: `react-markdown` z domyślnymi ustawieniami sanityzuje HTML; NIE przekazuj `dangerouslySetInnerHTML`; użyj `rehype-sanitize` jeśli potrzeba

### EC-2: Bardzo długa treść (scrollowanie)
Scenariusz: wpis w patterns.md ma 500+ znaków
Oczekiwane zachowanie: Sheet ma `overflow-y: auto` i scrolluje wewnętrznie; nagłówek Sheeta pozostaje przyklejony (sticky header z tytułem i ×)

### EC-3: Brak powiązanych anti-patterns
Scenariusz: wybrany pattern ma unikalną kategorię bez pasujących anti-patterns
Oczekiwane zachowanie: sekcja "Powiązane anti-patterns" jest ukryta; brak pustego bloku; nie ma komunikatu "brak powiązanych"

### EC-4: Pattern i anti-pattern z tą samą nazwą kategorii
Scenariusz: pattern z kategorią "Pipeline" ma wiele powiązanych anti-patterns tej samej kategorii
Oczekiwane zachowanie: lista powiązanych pokazuje max 5 pozycji; jeśli więcej → "Pokaż więcej (X)" link/button

---

## 🚫 Out of Scope tej Story
- Edycja treści patterns z widoku detail
- Usuwanie patterns
- Full-text search — to STORY-8.4
- Osobna strona `/patterns/[id]` z własnym URL — Sheet wystarczy
- Historia zmian wpisu (git log)

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading N/A, empty hidden, error N/A, filled)
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Klik w kartę otwiera Sheet z pełną treścią (react-markdown)
- [ ] Zamknięcie Sheeta (×, Escape, click outside) przywraca listę bez utraty filtrów
- [ ] Powiązane anti-patterns wyświetlane gdy istnieją (same category/tag match)
- [ ] Tagi w detail view triggerują filtr na liście
- [ ] Treść Markdown wyrenderowana poprawnie (listy, kod inline, nagłówki)
- [ ] Story review przez PO
