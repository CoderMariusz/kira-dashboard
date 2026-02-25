---
story_id: STORY-8.7
title: "Modale: Dodaj Pattern + Dodaj Lesson z walidacją Zod i optymistycznym append"
epic: EPIC-8
module: dashboard
domain: frontend
status: draft
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-8.5, STORY-8.6, STORY-8.3]
blocks: none
tags: [modal, form, zod, rhf, optimistic, toast, validation]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** móc dodać nowy wzorzec lub lekcję z poziomu UI przez modal z formularzem
**Żeby** nie otwierać edytora tekstu — wpis zapisuje się do pliku `.kira/` z poziomu dashboardu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Pliki:
- `components/patterns/AddPatternModal.tsx` — modal z formularzem dodawania wzorca/anty-wzorca
- `components/patterns/AddLessonModal.tsx` — modal z formularzem dodawania lekcji
- Triggery: przyciski „+ Dodaj Pattern" i „+ Dodaj Lesson" w headerze strony (STORY-8.4)

### Powiązane pliki
- `types/patterns.ts` — `AddPatternDTO`, `AddLessonDTO` z STORY-8.3
- `hooks/useAddPattern.ts`, `hooks/useAddLesson.ts` — z STORY-8.3
- shadcn/ui: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` — sprawdź czy zainstalowane
- `react-hook-form` + `zod` + `@hookform/resolvers/zod` — sprawdź czy zainstalowane; jeśli nie → zainstaluj

### Stan systemu przed tą story
- STORY-8.3 dostarcza useAddPattern() i useAddLesson()
- STORY-8.5 i STORY-8.6 renderują listy (widoczny efekt po dodaniu)
- shadcn Dialog lub natywny modal dostępny w projekcie

---

## ✅ Acceptance Criteria

### AC-1: Modal "Dodaj Pattern" — otwarcie i domyślne wartości
GIVEN: Użytkownik klika „+ Dodaj Pattern" w headerze strony Patterns
WHEN: Modal się otwiera
THEN: Widoczny Dialog/Modal z tytułem „Dodaj nowy wpis"
AND: Formularz ma: dropdown Type (PATTERN/ANTI_PATTERN, default: PATTERN), pole Kategoria, textarea Treść wzorca, pola opcjonalne Model i Domena, date picker (default: dzisiejsza data), tagi related_stories (text input z multi-tag)

### AC-2: Walidacja Zod przed submitem — pola wymagane
GIVEN: Użytkownik kliknie „Zapisz" z pustymi polami Type, Kategoria lub Treść
WHEN: Formularz jest submitowany
THEN: Pola pokazują błędy walidacji pod polami (nie toast):
- Kategoria: „Kategoria jest wymagana (max 50 znaków)"
- Treść: „Treść wzorca jest wymagana (min 3, max 500 znaków)"
AND: Request POST NIE jest wysyłany

### AC-3: Submit — zapis do pliku + invalidacja cache + toast
GIVEN: Użytkownik wypełnił wszystkie wymagane pola w modalu Dodaj Pattern
WHEN: Klika „Zapisz"
THEN: Przycisk „Zapisz" jest disabled (loading spinner) podczas requestu
AND: Po sukcesie: modal się zamyka; pojawia się toast „✅ Wzorzec zapisany do pliku" (3 sekundy)
AND: Siatka kart odświeża się automatycznie (SWR invalidate → refetch)
AND: Nowy wpis jest widoczny na liście

### AC-4: Modal "Dodaj Lesson" — pola i walidacja
GIVEN: Użytkownik klika „+ Dodaj Lesson" w headerze strony Lessons
WHEN: Modal się otwiera
THEN: Formularz ma: pole ID (np. BUG-004), pole Tytuł, select Severity (info/warning/critical, default: warning), pole Kategoria, textarea „Co poszło nie tak" (body), textarea „Root cause" (opcjonalne), textarea „Fix" (opcjonalne), textarea „Lekcja" (wymagane), tagi (tekst z przecinkiem), date (default: dziś)

GIVEN: Użytkownik klika „Zapisz" bez wypełnienia ID, Tytułu, Body lub Lekcji
WHEN: Formularz jest submitowany
THEN: Błędy walidacji pod polami:
- ID: „ID jest wymagany (np. BUG-004)"
- Tytuł: „Tytuł jest wymagany"
- Lekcja: „Lekcja jest wymagana (min 10 znaków)"

### AC-5: Błąd API — formularz pozostaje otwarty z komunikatem
GIVEN: POST /api/patterns zwraca 500 (np. Bridge offline)
WHEN: Użytkownik submituje formularz
THEN: Modal NIE zamyka się
AND: Przycisk „Zapisz" wraca do stanu aktywnego
AND: Toast „❌ Błąd zapisu — Bridge może być offline" (5 sekund, czerwony)

### AC-6: Zamknięcie modalu — reset formularza
GIVEN: Użytkownik otworzył modal i częściowo wypełnił formularz
WHEN: Klika „Anuluj" lub X (zamknięcie) lub Escape
THEN: Modal się zamyka
AND: Formularz jest zresetowany (puste pola przy ponownym otwarciu)
AND: Żaden request NIE jest wysyłany

### AC-7: Przyciski „+ Dodaj" widoczne tylko dla admina
GIVEN: Zalogowany użytkownik bez roli admin
WHEN: Wchodzi na `/dashboard/patterns`
THEN: Przyciski „+ Dodaj Pattern" i „+ Dodaj Lesson" są ukryte
AND: Strona (read-only) nadal wyświetla wzorce i lekcje

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/dashboard/patterns` (overlay modal)
Komponenty: `AddPatternModal`, `AddLessonModal`
Pliki: `components/patterns/AddPatternModal.tsx`, `components/patterns/AddLessonModal.tsx`

### Pola formularza — AddPatternModal

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| type | select (PATTERN/ANTI_PATTERN) | enum | — | tak |
| category | text | min 1, max 50 | „Kategoria jest wymagana (max 50 znaków)" | tak |
| text | textarea | min 3, max 500 | „Treść wzorca jest wymagana (min 3, max 500 znaków)" | tak |
| model | text | max 30 | — | nie |
| domain | text | max 30 | — | nie |
| date | date input | format YYYY-MM-DD | „Podaj poprawną datę" | nie (default: dziś) |
| related_stories | tag input | max 10 pozycji, format STORY-X.Y | „Nieprawidłowy format (oczekiwano STORY-X.Y)" | nie |

### Pola formularza — AddLessonModal

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| id | text | min 1, max 20, pattern BUG/LESSON/OBS-NNN | „ID jest wymagany (np. BUG-004)" | tak |
| title | text | min 3, max 200 | „Tytuł jest wymagany" | tak |
| severity | select (info/warning/critical) | enum | — | tak |
| category | text | min 1, max 50 | „Kategoria jest wymagana" | tak |
| body | textarea | min 10 | „Opis musi mieć co najmniej 10 znaków" | tak |
| root_cause | textarea | max 500 | — | nie |
| fix | textarea | max 500 | — | nie |
| lesson | textarea | min 10, max 500 | „Lekcja jest wymagana (min 10 znaków)" | tak |
| tags | text (comma-separated) | max 10 tagów | — | nie |
| date | date input | YYYY-MM-DD | „Podaj poprawną datę" | nie (default: dziś) |

### Schematy Zod

```typescript
// AddPatternModal
const addPatternSchema = z.object({
  type:             z.enum(['PATTERN', 'ANTI_PATTERN']),
  category:         z.string().min(1).max(50),
  text:             z.string().min(3).max(500),
  model:            z.string().max(30).optional(),
  domain:           z.string().max(30).optional(),
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  related_stories:  z.array(z.string().regex(/^STORY-\d+\.\d+$/)).max(10).optional(),
})

// AddLessonModal
const addLessonSchema = z.object({
  id:          z.string().min(1).max(20).regex(/^(BUG|LESSON|OBS)-\d+$/),
  title:       z.string().min(3).max(200),
  severity:    z.enum(['info', 'warning', 'critical']),
  category:    z.string().min(1).max(50),
  body:        z.string().min(10),
  root_cause:  z.string().max(500).optional(),
  fix:         z.string().max(500).optional(),
  lesson:      z.string().min(10).max(500),
  tags:        z.array(z.string()).max(10).optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
```

### Stany widoku

**Idle (modal zamknięty):** Widoczne buttony „+ Dodaj Pattern" i „+ Dodaj Lesson" w headerze (tylko dla admina)

**Modal otwarty (formularz):**
- Formularz z polami; wymagane oznaczone `*`
- Przyciski: „Anuluj" (secondary) + „Zapisz" (primary, `#818cf8` background)

**Submitting:**
- Przycisk „Zapisz": disabled + spinner (animate-spin)
- Pola formularza: disabled (pointer-events: none)

**Sukces:**
- Modal zamknięty; toast z zielonym tłem przez 3 sekundy

**Błąd API:**
- Modal otwarty; toast czerwony przez 5 sekund; formularz re-enabled

### Flow interakcji

```
1. User klika „+ Dodaj Pattern" → modal się otwiera z pustym formularzem (default: type=PATTERN, date=dziś)
2. User wypełnia pola → real-time walidacja przy blur (nie onChange — nie irytuj)
3. User klika „Zapisz" → Zod validate całość:
   a. Błędy → pokazuje pod polami; NIE wysyła request
   b. OK → wywołuje addPattern(dto)
4. useAddPattern() wysyła POST /api/patterns:
   a. isLoading=true → button disabled + spinner
   b. 201 OK → modal zamknięty; SWR mutate; toast sukcesu
   c. Błąd → modal otwarty; toast błędu; button re-enabled
5. User klika „Anuluj" lub Escape → modal zamknięty; form reset
```

### Related stories — tag input
Implementacja: zwykły `<input>` z placeholder „STORY-8.1, STORY-8.2"; split po przecinku/spacji;
walidacja każdego tokenu pattern `/^STORY-\d+\.\d+$/`; wizualizacja jako chip-y (pill) nad inputem

### Responsive / Dostępność
- Mobile (375px+): Modal pełna szerokość, scroll wewnątrz modalu jeśli za długi
- Desktop: Modal `max-w-lg`, wyśrodkowany
- Keyboard: Tab przez pola; Enter submit; Escape zamknięcie
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`, focus trap

---

## ⚠️ Edge Cases

### EC-1: Duplicate ID lekcji
Scenariusz: User wpisuje ID `BUG-001` który już istnieje w pliku
Oczekiwane zachowanie: API (STORY-8.2) nie sprawdza duplikatów — wpis zostanie dodany jako nowy blok w pliku. Frontend nie waliduje duplikatu (poza zakresem MVP). Toast sukcesu.

### EC-2: Modal otwarty gdy Bridge offline
Scenariusz: User otwiera modal i próbuje zapisać gdy Bridge nie działa
Oczekiwane zachowanie: POST zwraca błąd sieci; toast „❌ Błąd zapisu — Bridge może być offline"; modal pozostaje otwarty z danymi

### EC-3: related_stories input z nieprawidłowym formatem
Scenariusz: User wpisuje „STORY-abc" (brak numerów)
Oczekiwane zachowanie: Walidacja Zod odrzuca przy submit; komunikat „Nieprawidłowy format (oczekiwano STORY-X.Y)" pod polem; token NIE jest dodany jako chip

### EC-4: tags jako comma-separated string z whitespace
Scenariusz: User wpisuje „  pipeline , glm-5 , "
Oczekiwane zachowanie: Parseowane jako `["pipeline", "glm-5"]` (trim, filter puste stringi)

---

## 🚫 Out of Scope tej Story
- Edycja istniejących wpisów
- Usuwanie wpisów
- Auto-suggest kategorii lub tagów
- Rich text / markdown preview w formularzu

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] AddPatternModal otwiera się z kliknięcia przycisku; zamyka Escape / Anuluj
- [ ] Formularz AddPattern: Zod validation przed submit, błędy pod polami po polsku
- [ ] AddLessonModal otwiera się z kliknięcia; formularz z Zod validation
- [ ] Submit: button disabled podczas requestu; toast sukcesu po 201; toast błędu po fail
- [ ] Po sukcesie: modal zamknięty, SWR refetch, nowy wpis widoczny
- [ ] Zamknięcie modalu resetuje formularz
- [ ] Przyciski „+ Dodaj" ukryte dla non-admin
- [ ] Keyboard navigation: Tab, Enter, Escape działają
- [ ] Focus trap w modalu (Escape zamyka)
- [ ] Mobile: modal full-width, scroll wewnętrzny
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
