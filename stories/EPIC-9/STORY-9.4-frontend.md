---
story_id: STORY-9.4
title: "Lessons learned browser — lista lekcji, filtrowanie, severity badge"
epic: EPIC-9
module: nightclaw
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 3h
depends_on: [STORY-9.1]
blocks: []
tags: [list, filter, badge, markdown-parse, nightclaw, lessons]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** przeglądać lekcje z LESSONS_LEARNED.md w formie listy z filtrami i severity badge'ami
**Żeby** szybko znaleźć konkretne błędy lub wzorce bez czytania całego pliku Markdown od góry do dołu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/nightclaw/lessons` (podstrona NightClaw module)
- Plik: `/app/nightclaw/lessons/page.tsx`
- Komponenty: `/components/nightclaw/LessonsBrowser.tsx`, `/components/nightclaw/LessonCard.tsx`

### Powiązane pliki
- API: `GET /api/nightclaw/lessons` → `{ content: string, last_updated: string }`
- Content do sparsowania: surowy Markdown z LESSONS_LEARNED.md
- Auth guard: dziedziczony z `/app/nightclaw/layout.tsx`
- Przykładowa struktura pliku:
  ```markdown
  ## 1. BUGS WE HIT
  ### BUG-001: Tytuł buga
  **What went wrong:** ...
  **Root cause:** ...
  **Lesson:** ...
  ---
  ```

### Stan systemu przed tą story
- STORY-9.1 dostarcza endpoint `GET /api/nightclaw/lessons`
- shadcn/ui Badge, Input, Select, Card dostępne
- Auth guard na poziomie layout.tsx działa

---

## ✅ Acceptance Criteria

### AC-1: Lista lekcji sparsowana z Markdown
GIVEN: admin wchodzi na `/nightclaw/lessons`, API zwraca Markdown z LESSONS_LEARNED.md
WHEN: strona załaduje dane
THEN: widoczna lista lekcji gdzie każda pozycja pokazuje: ID/numer sekcji, tytuł (nagłówek H3), krótki opis (pierwsze zdanie sekcji), badge z kategorią

### AC-2: Filtrowanie po kategorii
GIVEN: lista lekcji jest załadowana, widoczne są kategorie (np. BUGS, PROCESS, PATTERNS)
WHEN: admin klika/wybiera kategorię w filterze
THEN: lista natychmiast (bez reload) filtruje się i pokazuje tylko lekcje z wybranej kategorii
AND: przycisk "Wyczyść filtr" pojawia się gdy filtr jest aktywny
AND: przy braku wyników w danej kategorii: "Brak lekcji dla wybranej kategorii."

### AC-3: Wyszukiwanie tekstowe
GIVEN: lista lekcji jest załadowana, admin wpisuje tekst w polu wyszukiwania
WHEN: admin wpisuje ≥2 znaki
THEN: lista filtruje się w czasie rzeczywistym (debounce 300ms) i pokazuje tylko lekcje zawierające tekst w tytule lub opisie
AND: dopasowane fragmenty są wyróżnione (highlight) — owinięte w `<mark>` lub span z żółtym tłem
AND: debounce 300ms — nie filtruje przy każdym znaku

### AC-4: Kliknięcie lekcji — rozwinięcie szczegółów
GIVEN: lista lekcji jest załadowana, admin klika na kartę lekcji
WHEN: klik następuje
THEN: karta rozszerza się (accordion) i pokazuje pełną treść lekcji — wyrenderowany Markdown sekcji
AND: ponowne kliknięcie zwija kartę
AND: możliwe jest rozwinięcie wielu kart jednocześnie

### AC-5: Severity badge
GIVEN: lekcja zawiera słowa kluczowe wskazujące na wagę (heurystyka parsowania)
WHEN: karta lekcji jest renderowana
THEN: widoczny kolorowy badge: 
  - 🔴 `CRITICAL` — gdy tytuł/opis zawiera: "CRITICAL", "BLOKUJE", "crash", "data loss"
  - 🟡 `WARNING` — gdy zawiera: "WARNING", "⚠️", "PONIŻEJ PROGU", "problem"
  - 🟢 `INFO` — domyślnie dla pozostałych lekcji

### AC-6: Licznik i informacja o last_updated
GIVEN: lekcje są załadowane
WHEN: strona jest w stanie filled
THEN: widoczny nagłówek "📚 Lekcje ([N] łącznie)" gdzie N = liczba sparsowanych lekcji
AND: pod nagłówkiem widoczne "Ostatnia aktualizacja: [DD.MM.YYYY HH:MM]"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/nightclaw/lessons`
Komponent: `LessonsBrowserPage` (`/app/nightclaw/lessons/page.tsx`)
Pliki komponentów:
- `/components/nightclaw/LessonsBrowser.tsx` — kontener z search/filter i listą
- `/components/nightclaw/LessonCard.tsx` — pojedyncza karta z accordion

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `LessonsBrowser` | Container | `lessons: Lesson[]` | empty/filled |
| `LessonCard` | Card+Accordion | `lesson: Lesson`, `searchQuery: string` | collapsed/expanded |
| `LessonsBrowserPage` | Page | — | loading/error/filled |

### Parsowanie Markdown → lista lekcji

```typescript
interface Lesson {
  id: string       // "BUG-001" lub "PROCESS-001" — z nagłówka H3
  title: string    // tekst nagłówka H3 po id (np. "EPIC-1 Full Suite Failed")
  category: string // "BUGS" | "PROCESS" | "PATTERNS" | "OTHER" — z nagłówka H2 sekcji
  summary: string  // pierwsze zdanie / pierwsze 200 znaków treści po nagłówku
  fullContent: string // pełna treść sekcji (aż do następnego H3 lub ---)
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
}

// Parser: split po `---` separatorach, grupuj po H2 (kategoria), identyfikuj H3 (lekcje)
// Jeśli struktura nie pasuje → traktuj cały plik jako jedna lekcja w stanie "OTHER"
```

### Filtr i search UI

```
┌─────────────────────────────────────┐
│ 🔍 [   Szukaj w lekcjach...       ] │
│                                     │
│ Kategoria: [Wszystkie ▾]            │
│ Severity:  [Wszystkie ▾]            │
└─────────────────────────────────────┘
Wyniki: 12 z 45 lekcji
```

### Stany widoku

**Loading:**
- 3 Skeleton karty (animowane, symulujące LessonCard z badge i tytułem)

**Empty (brak danych / brak wyników filtrowania):**
- Brak lekcji: "Brak lekcji do wyświetlenia. Plik LESSONS_LEARNED.md jest pusty lub ma nieoczekiwany format."
- Brak wyników filtrowania: "Brak lekcji dla wybranych filtrów. [Wyczyść filtry]"

**Error (błąd serwera/sieci):**
- "Nie udało się załadować lekcji. [Spróbuj ponownie]"

**Filled (normalny stan):**
- Header: "📚 Lekcje (N łącznie) — ostatnia aktualizacja [data]"
- Search + filter controls
- Lista LessonCard z accordion
- Link "← Powrót do NightClaw"

### Flow interakcji

```
1. Admin wchodzi na /nightclaw/lessons → fetch GET /api/nightclaw/lessons (Skeleton)
2. Markdown załadowany → parsowanie client-side → stan filled
3. Admin wpisuje w search → debounce 300ms → filtrowanie listy
4. Admin wybiera kategorię → natychmiastowe filtrowanie
5. Admin klika kartę → accordion expand → pełna treść lekcji (Markdown rendered)
6. Admin klika kartę ponownie → accordion collapse
7. Admin klika "Wyczyść filtry" → reset search + kategoria → pełna lista
```

### Responsive / Dostępność
- Mobile (375px+): jedna kolumna, search/filter w kolumnie, karty pełna szerokość
- Desktop (1280px+): max-w-3xl mx-auto, search + filter w jednym wierszu
- Keyboard: Tab przez karty, Enter/Space toggle accordion, Tab przez filtry
- ARIA: `aria-expanded` na kartach accordion; `aria-label` na input search ("Szukaj w lekcjach")

---

## ⚠️ Edge Cases

### EC-1: LESSONS_LEARNED.md ma nieoczekiwany format (brak standardowych H2/H3)
Scenariusz: plik istnieje i ma treść, ale bez struktury `## SEKCJA` → `### ID: Tytuł`
Oczekiwane zachowanie: parser fallback — cały plik jako jedna lekcja "Lekcje ogólne" z kategorią "OTHER" i severity "INFO"; użytkownik widzi treść zamiast pustej listy

### EC-2: Bardzo duży plik LESSONS_LEARNED.md (>50 lekcji)
Scenariusz: plik rośnie przez wiele miesięcy — 50+ sekcji
Oczekiwane zachowanie: lista renderuje się bez zawieszenia; jeśli > 50 lekcji → virtual scroll (lub simple: paginacja 20 per page z "Pokaż więcej")

### EC-3: Wyszukiwanie XSS — wpisanie `<script>` w pole search
Scenariusz: admin wpisuje złośliwy HTML w pole wyszukiwania
Oczekiwane zachowanie: React automatycznie escape'uje output; highlight dopasowania używa `dangerouslySetInnerHTML` tylko dla sparsowanego tekstu (nie inputu użytkownika) — lub alternatywnie używa css background zamiast innerHTML dla highlight

---

## 🚫 Out of Scope tej Story
- Edycja lekcji z poziomu UI (read-only)
- Eksport lekcji do PDF/CSV
- Digest history list — to STORY-9.3
- NightClaw main dashboard — to STORY-9.2
- Full-text search z backendem (tu: client-side filtering)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] Wszystkie stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Parser Markdown → Lesson[] działa dla standardowej struktury pliku
- [ ] Parser ma fallback dla nieoczekiwanego formatu
- [ ] Search (debounce 300ms) i filtrowanie kategorii działa bez reload
- [ ] Accordion expand/collapse działa, wiele kart może być otwartych jednocześnie
- [ ] Severity badges renderują się z poprawnym kolorem
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] XSS safe — brak dangerouslySetInnerHTML na danych z inputu użytkownika
- [ ] Story review przez PO
