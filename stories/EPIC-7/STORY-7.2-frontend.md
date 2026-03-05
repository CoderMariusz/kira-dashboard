---
story_id: STORY-7.2
title: "Eval dashboard — lista golden tasks, run button, score history"
epic: EPIC-7
module: eval
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-7.1, STORY-3.3]
blocks: [STORY-7.3]
tags: [dashboard, table, eval, golden-tasks, recharts, polling]
---

## 🎯 User Story

**Jako** admin Kiry
**Chcę** widzieć listę golden tasks i historię eval runów na stronie `/eval`
**Żeby** w jednym miejscu ocenić stan jakości modeli i triggerować nowy eval bez CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/eval` (lub `/pages/eval/index.tsx` w strukturze Next.js projektu)
- Komponent główny: `EvalDashboard`
- Plik: `/app/eval/page.tsx` + `/app/eval/_components/`
- Auth guard: middleware przekierowuje role `home`/`home_plus` na `/dashboard`

### Powiązane pliki
- API: `GET /api/eval/tasks` (STORY-7.1)
- API: `GET /api/eval/runs` (STORY-7.1)
- API: `POST /api/eval/trigger` (STORY-7.1)
- Typy: `GoldenTask`, `EvalRun` (z STORY-7.1 response schema)
- Auth context: z STORY-3.3

### Stan systemu przed tą story
- STORY-7.1 gotowe: wszystkie 4 endpointy eval API działają
- STORY-3.3 gotowe: auth guard i hook `useAuth()` dostępny
- shadcn/ui zainstalowane: Table, Badge, Button, Skeleton, Toast
- Recharts zainstalowane (z poprzednich epiców lub tu dodane)

---

## ✅ Acceptance Criteria

### AC-1: Strona /eval dostępna tylko dla admina
GIVEN: użytkownik z rolą `home` jest zalogowany
WHEN: wchodzi na `/eval`
THEN: middleware przekierowuje go na `/dashboard` bez pokazywania treści eval

### AC-2: Lista golden tasks ładuje się i wyświetla
GIVEN: admin jest zalogowany i Bridge zwraca 3+ golden tasks
WHEN: wchodzi na `/eval`
THEN: wyświetla się tabela z kolumnami: `Task ID`, `Tytuł`, `Model docelowy`, `Ostatni wynik`, `Ostatnie uruchomienie`; każdy wiersz ma przycisk „Szczegóły" prowadzący do `/eval/runs/<last_run_id>`
AND: podczas ładowania wyświetlają się Skeleton rows (nie pusty ekran)

### AC-3: Historia eval runów wyświetla się pod tabelą tasks
GIVEN: admin jest zalogowany i istnieje historia 5+ runów
WHEN: sekcja „Historia runów" jest widoczna na stronie
THEN: wyświetla się tabela runów z kolumnami: `Run ID (skrócony)`, `Data`, `Model`, `Tasks`, `Pass`, `Fail`, `Czas`; każdy wiersz klikalny → `/eval/runs/<run_id>`
AND: domyślnie pokazuje 20 ostatnich runów

### AC-4: Przycisk „Uruchom Eval" triggeruje eval runu
GIVEN: admin jest na stronie `/eval` i żaden eval nie jest w toku
WHEN: klika przycisk „Uruchom Eval teraz"
THEN: pojawia się modal potwierdzenia z tekstem „Uruchomić eval dla wszystkich golden tasks?", przyciskami „Tak, uruchom" i „Anuluj"
AND: po kliknięciu „Tak, uruchom" — przycisk zmienia się na disabled z spinnerem i etykietą „Trwa eval…"
AND: system wywołuje `POST /api/eval/trigger`, po 202 toast „✅ Eval uruchomiony — wyniki pojawią się za chwilę"
AND: strona odświeża listę runów po 5 sekundach (polling — jeden refresh)

### AC-5: Score history — sparkline trend w tabeli golden tasks
GIVEN: golden task ma historię ≥2 runów z wynikami score (0-100)
WHEN: admin patrzy na kolumnę „Trend" w tabeli golden tasks
THEN: wyświetla się mini sparkline (Recharts LineChart bez osi, szerokość 80px) z ostatnimi 5 wynikami; kolor zielony jeśli ostatni score ≥70, czerwony jeśli <70

### AC-6: Bar chart — pass rate per model
GIVEN: historia eval zawiera wyniki dla ≥2 modeli
WHEN: sekcja „Wizualizacja" jest widoczna pod tabelami
THEN: wyświetla się Recharts BarChart z osią X = modele, osią Y = pass rate (0-100%), legend; dane z ostatnich 5 runów per model

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/eval`
Komponent: `EvalDashboard`
Plik: `/app/eval/page.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `EvalDashboard` | Page | — | loading, error, filled |
| `GoldenTasksTable` | Table | `tasks: GoldenTask[]`, `loading: boolean` | loading (skeleton), empty, filled |
| `EvalRunsTable` | Table | `runs: EvalRun[]`, `loading: boolean` | loading (skeleton), empty, filled |
| `RunEvalButton` | Button+Modal | `onTrigger: () => Promise<void>` | idle, confirming, running |
| `TrendSparkline` | Chart | `scores: number[]` | filled (min 2 punkty), empty (0-1 punktów) |
| `PassRateChart` | BarChart | `runs: EvalRun[]` | loading, empty (brak danych), filled |

### Stany widoku

**Loading:**
- GoldenTasksTable: 5 skeleton rows (shimmer animation, szare prostokąty w każdej komórce)
- EvalRunsTable: 5 skeleton rows
- PassRateChart: szary prostokąt 300px × 200px z animacją pulse
- RunEvalButton: aktywny (NIE disabled podczas ładowania danych)

**Empty (brak danych):**
- GoldenTasksTable: komunikat „Brak golden tasks. Dodaj pierwszy task przez Bridge CLI."
- EvalRunsTable: komunikat „Brak historii runów. Uruchom pierwszy eval."
- PassRateChart: ukryty (nie renderuj pustego wykresu)

**Error (błąd serwera/sieci):**
- Komunikat: „Nie udało się załadować danych eval. Sprawdź czy Bridge jest dostępny." + przycisk „Spróbuj ponownie"
- Toast z błędem: „❌ Błąd połączenia z Bridge API"

**Filled (normalny stan):**
- GoldenTasksTable z danymi + kolumna Trend (sparkline)
- EvalRunsTable z 20 ostatnimi runami
- RunEvalButton aktywny
- PassRateChart z danymi z ostatnich 5 runów

### Pola formularza
*(Brak formularza w tej story — tylko trigger button)*

### Flow interakcji (krok po kroku)

```
1. Admin wchodzi na /eval → middleware sprawdza rolę → ok: renderuje stronę
2. EvalDashboard montuje się → równocześnie fetch GET /api/eval/tasks i GET /api/eval/runs
3. Podczas fetch → loading skeletons w obu tabelach
4. Dane załadowane → tabele wypełniają się; PassRateChart renderuje się
5. Admin klika „Uruchom Eval teraz" → pojawia się modal z potwierdzeniem
6. Admin klika „Anuluj" → modal się zamyka, nic się nie dzieje
7. Admin klika „Tak, uruchom" → modal zamyka się, button zmienia na "Trwa eval…" (disabled)
8. POST /api/eval/trigger → 202 → toast "✅ Eval uruchomiony"
9. Po 5 sekundach → automatyczny refetch GET /api/eval/runs → lista runów aktualizuje się
10. Button wraca do stanu "Uruchom Eval teraz" (aktywny)
11. Admin klika wiersz w EvalRunsTable → nawiguje do /eval/runs/<run_id>
12. Admin klika "Szczegóły" w GoldenTasksTable → nawiguje do /eval/runs/<last_run_id>
```

### Responsive / Dostępność
- Mobile (375px+): tabele scrollują poziomo (`overflow-x: auto`); PassRateChart ukryty na mobile; RunEvalButton pełna szerokość
- Tablet (768px+): tabele bez scroll, PassRateChart wyświetlony
- Desktop (1280px+): docelowy layout — dwie sekcje z tabelami + wykres obok
- Keyboard navigation: Tab przez tabele (focus na wierszach), Enter = klik na wiersz; Escape zamyka modal potwierdzenia
- ARIA: button "Uruchom Eval teraz" ma `aria-label="Uruchom eval wszystkich golden tasks"`, modal ma `role="dialog"` i `aria-labelledby`

---

## ⚠️ Edge Cases

### EC-1: Eval trigger gdy Bridge jest niedostępny
Scenariusz: POST /api/eval/trigger zwraca 502
Oczekiwane zachowanie: toast „❌ Nie udało się uruchomić eval — Bridge niedostępny"; button wraca do stanu aktywnego natychmiast
Komunikat dla użytkownika: „Nie udało się uruchomić eval. Sprawdź czy Bridge jest aktywny."

### EC-2: Eval trigger gdy eval już jest w toku (409)
Scenariusz: POST /api/eval/trigger zwraca 409
Oczekiwane zachowanie: toast „⚠️ Eval jest już w toku"; button wraca do stanu aktywnego; lista runów odświeża się żeby pokazać aktywny run

### EC-3: Golden task bez historii runów (brak danych sparkline)
Scenariusz: nowy task nigdy nie był uruchamiany — brak scores
Oczekiwane zachowanie: komórka Trend pokazuje „—" zamiast sparkline

### EC-4: Bardzo długa lista runów (100+)
Scenariusz: historia eval zawiera 100+ wpisów
Oczekiwane zachowanie: tabela pokazuje max 20 i nie ma lazy load w MVP; użytkownik widzi "Pokazuję 20 z 143 runów"

---

## 🚫 Out of Scope tej Story
- Diff viewer (expected vs actual output) — to STORY-7.3
- Dodawanie/edycja/usuwanie golden tasks z UI — poza zakresem MVP (EPIC-7.md Out of Scope)
- SSE / real-time polling statusu runu — polling jednorazowy po 5s wystarczy
- Export CSV/JSON — to STORY-7.4
- Heatmap per task × model — poza MVP, PassRateChart (bar) wystarczy

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Walidacja flow trigger działa: modal → potwierdzenie → loading → toast → refresh
- [ ] Widok działa na mobile 375px bez horizontal scroll (tabele scrollują wewnętrznie)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Strona niedostępna dla roli `home` — redirect działa
- [ ] Story review przez PO
