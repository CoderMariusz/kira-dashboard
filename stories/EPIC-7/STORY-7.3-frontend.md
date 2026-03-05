---
story_id: STORY-7.3
title: "Eval result detail — diff view, pass/fail per AC, score breakdown"
epic: EPIC-7
module: eval
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-7.2]
blocks: []
tags: [diff-viewer, eval, detail, recharts, markdown, pass-fail]
---

## 🎯 User Story

**Jako** admin Kiry
**Chcę** widzieć szczegóły konkretnego eval runu z diff viewerem dla każdego golden task
**Żeby** dokładnie wiedzieć gdzie model odbiega od oczekiwanego outputu i które kryteria akceptacji nie przeszły

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/eval/runs/[run_id]`
- Komponent główny: `EvalRunDetail`
- Pliki: `/app/eval/runs/[run_id]/page.tsx` + `/app/eval/runs/[run_id]/_components/`
- Link z: EvalRunsTable (STORY-7.2) → klik na wiersz → ta strona

### Powiązane pliki
- API: `GET /api/eval/runs/[run_id]` → `RunDetailResponse` (STORY-7.1, AC-4)
- Typy: `EvalResult`, `RunDetailResponse` (z STORY-7.1)
- Biblioteki: `diff-match-patch` (line diff), `react-markdown` (renderowanie markdown)
- Nawigacja: Breadcrumb `Eval → Historia runów → Run #<short_id>`

### Stan systemu przed tą story
- STORY-7.2 gotowe: strona `/eval` i link do `/eval/runs/<run_id>` działają
- `GET /api/eval/runs/[run_id]` z STORY-7.1 zwraca `RunDetailResponse` z `results[]`
- `diff-match-patch` lub `jsdiff` zainstalowane w projekcie
- `react-markdown` zainstalowane

---

## ✅ Acceptance Criteria

### AC-1: Nagłówek runu z podsumowaniem
GIVEN: admin jest na stronie `/eval/runs/<run_id>` i run istnieje
WHEN: strona się ładuje
THEN: wyświetla się nagłówek z: Run ID (skrócony 8 znaków), data uruchomienia, model, łączna liczba tasks, liczba PASS (zielony badge), liczba FAIL (czerwony badge), czas trwania runu
AND: breadcrumb „Eval → Szczegóły runu" z powrotem do `/eval`

### AC-2: Lista wyników per golden task
GIVEN: run ma wyniki dla 5 golden tasks
WHEN: strona jest załadowana
THEN: wyświetla się lista kart (lub sekcji accordion), jedna per golden task, zawierająca: tytuł tasku, badge PASS/FAIL, score (0-100 jako procent), przycisk rozwinięcia diff viewera

### AC-3: Diff viewer — expected vs actual output
GIVEN: admin klika „Pokaż diff" przy konkretnym golden task
WHEN: diff viewer się otwiera (expand/collapse)
THEN: wyświetla się side-by-side (desktop) lub stacked (mobile) panel:
  - lewy panel: „Oczekiwany output" z wyrenderowanym markdown
  - prawy panel: „Rzeczywisty output" z wyrenderowanym markdown
AND: linie które są różne są podświetlone żółtym tłem; dodane linie — zielonym; usunięte linie — czerwonym
AND: jeśli outputy są identyczne — badge „✅ Identyczne outputy" bez diff

### AC-4: Per-AC pass/fail breakdown
GIVEN: golden task ma pole `ac_results` z co najmniej 3 wpisami
WHEN: diff viewer jest rozwinięty
THEN: pod diff viewerem wyświetla się tabela `AC Results` z kolumnami: `AC ID`, `Status` (zielony ✅ / czerwony ❌), `Notatka`
AND: każdy wiersz wyświetla treść notatki (note) z Bridge eval

### AC-5: Score breakdown — ogólny wynik tasku
GIVEN: task ma `score` (0-100)
WHEN: karta tasku jest widoczna
THEN: wyświetla się progress bar (shadcn/ui Progress) z wartością score; kolor zielony ≥70, żółty 40-69, czerwony <40
AND: wartość numeryczna (np. „73/100") jest widoczna obok progress bara

### AC-6: Run nie istnieje — 404
GIVEN: admin wchodzi na `/eval/runs/nieistniejace-id`
WHEN: fetch do API zwraca 404
THEN: wyświetla się strona 404 z komunikatem „Run ewaluacji o tym ID nie istnieje" i przyciskiem „Wróć do Eval"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/eval/runs/[run_id]`
Komponent: `EvalRunDetail`
Plik: `/app/eval/runs/[run_id]/page.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `EvalRunDetail` | Page | `params: { run_id: string }` | loading, error, 404, filled |
| `RunSummaryHeader` | Card | `run: EvalRun` | filled |
| `TaskResultCard` | Accordion | `result: EvalResult` | collapsed, expanded |
| `DiffViewer` | Panel | `expected: string`, `actual: string` | identical, has-diff |
| `AcResultsTable` | Table | `acResults: AcResult[]` | filled, empty |
| `ScoreBar` | Progress | `score: number` | filled (color-coded) |

### Stany widoku

**Loading:**
- Nagłówek: skeleton rectangle (wysoki 80px)
- Lista tasków: 3 skeleton cards (po ~120px wysokości), shimmer animation

**Empty (run bez wyników):**
- Komunikat: „Ten run nie zawiera wyników dla żadnego golden task."
- Nie powinno się zdarzyć w normalnym działaniu (run zawsze ma wyniki)

**Error (błąd serwera):**
- Komunikat: „Nie udało się załadować szczegółów runu. Spróbuj odświeżyć stronę."
- Przycisk „Odśwież" (window.location.reload)

**404 (run nie istnieje):**
- Komunikat: „Run ewaluacji o tym ID nie istnieje."
- Przycisk: „← Wróć do Eval" → `/eval`

**Filled (normalny stan):**
- RunSummaryHeader z danymi runu
- Lista TaskResultCard, pierwsza rozwinięta domyślnie
- Każda karta: score bar + PASS/FAIL badge + przycisk diff

### Flow interakcji (krok po kroku)

```
1. Admin klika wiersz runu w EvalRunsTable na /eval → nawiguje na /eval/runs/<run_id>
2. Strona montuje się → fetch GET /api/eval/runs/<run_id>
3. Podczas fetch → loading skeletons (nagłówek + 3 karty)
4. Dane załadowane → RunSummaryHeader renderuje się z danymi runu
5. Lista TaskResultCard renderuje się, pierwsza karta rozwinięta (diff viewerw domyślnie zwinięty)
6. Admin klika „Pokaż diff" przy tasku → DiffViewer expanduje się w tej karcie
7. DiffViewer renderuje markdown po lewej i prawej stronie; diff linie podświetlone
8. Pod DiffViewer pojawia się AcResultsTable z per-AC pass/fail
9. Admin klika „Ukryj diff" → DiffViewer zwija się
10. Admin klika inną kartę tasku → ta karta expanduje się (accordion może mieć wiele otwartych naraz)
11. Admin klika breadcrumb „Eval" → nawiguje z powrotem na /eval
```

### Responsive / Dostępność
- Mobile (375px+): DiffViewer stacked (expected na górze, actual na dole); każdy panel pełna szerokość; AcResultsTable scrolluje poziomo
- Tablet (768px+): DiffViewer side-by-side z flex; każdy panel 50% szerokości
- Desktop (1280px+): side-by-side, max-width 1200px, wyśrodkowane
- Keyboard navigation: karty taskResultCard mają `role="button"`, Tab focus, Enter/Space toggle; DiffViewer przycisk ma aria-expanded
- ARIA: DiffViewer panels mają `aria-label="Oczekiwany output"` / `aria-label="Rzeczywisty output"`; badge PASS/FAIL ma `role="status"`

---

## ⚠️ Edge Cases

### EC-1: Bardzo długi diff (1000+ linii)
Scenariusz: expected output to 2000 linii markdown, actual jest podobny z drobnymi różnicami
Oczekiwane zachowanie: DiffViewer pokazuje TYLKO zmieniione linie ± 3 linie kontekstu (collapsed context); przycisk „Pokaż pełny diff" ekspanduje całość; bez tego widok byłby nieczytelny

### EC-2: Output nie jest markdown — plain text lub kod
Scenariusz: `expected_output` lub `actual_output` zawiera blok kodu lub plain text bez markdown
Oczekiwane zachowanie: react-markdown renderuje poprawnie (kod w code block, plain text jako paragraf); diff działa na poziomie linii (nie charów)

### EC-3: Run w trakcie (completed_at = null)
Scenariusz: admin wchodzi na `/eval/runs/<run_id>` dla runu który właśnie trwa
Oczekiwane zachowanie: nagłówek pokazuje badge „🔄 W toku" zamiast czasu trwania; wyniki tasków które są gotowe wyświetlają się normalnie; reszta pokazuje „Oczekiwanie na wynik…"

### EC-4: ac_results puste (Bridge nie zwrócił per-AC breakdown)
Scenariusz: Bridge eval nie zwrócił `ac_results` dla danego tasku (starsza wersja Bridge)
Oczekiwane zachowanie: sekcja AcResultsTable jest ukryta; wyświetla się jedynie score i overall PASS/FAIL; brak błędu JS

---

## 🚫 Out of Scope tej Story
- Edycja golden task z poziomu detail page — poza zakresem (Out of Scope EPIC-7)
- Re-run tylko jednego konkretnego tasku — trigger całościowy w STORY-7.2
- Export wyników do CSV — to STORY-7.4
- Komentarze / adnotacje do runów — poza zakresem MVP
- Semantic diff (AI-based comparison) — tylko line-diff przez diff-match-patch

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie stany widoku zaimplementowane (loading, error, 404, filled)
- [ ] DiffViewer renderuje markdown i podświetla różnice linii
- [ ] AcResultsTable wyświetla per-AC pass/fail poprawnie
- [ ] ScoreBar zmienia kolor na zielony/żółty/czerwony według progu
- [ ] Widok działa na mobile 375px — DiffViewer stacked bez overflow
- [ ] Run w trakcie (completed_at=null) obsłużony poprawnie
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
