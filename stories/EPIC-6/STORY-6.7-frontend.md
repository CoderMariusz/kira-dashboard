---
story_id: STORY-6.7
title: "PRD Wizard UI — multi-step form, preview, submit to Bridge"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 7h
depends_on: [STORY-6.6]
blocks: []
tags: [pipeline, prd-wizard, multi-step, form, ai-integration, epic-preview]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć 3-krokowy wizard do wgrywania PRD i automatycznego tworzenia epiców przez AI
**Żeby** tworzyć nowe projekty bez ręcznego pisania epiców w Bridge CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Komponent: `PRDWizard` — 3-step Dialog/Modal
- Trigger: przycisk "Nowy projekt przez PRD Wizard" na Pipeline page lub Projects page
- Plik: `src/pages/pipeline/PRDWizard.tsx`
- API: `POST /api/pipeline/prd-questions` (krok 2), `POST /api/pipeline/create-from-prd` (krok 3)

### Powiązane pliki
- `src/pages/pipeline/index.tsx` — trigger button otwierający Wizard
- `src/pages/projects/index.tsx` — alternatywny trigger
- `src/_shared/lib/pipelineApi.ts` — `getPRDQuestions`, `createFromPRD`
- Endpoints z STORY-6.6: `/api/pipeline/prd-questions`, `/api/pipeline/create-from-prd`

### Stan systemu przed tą story
- STORY-6.6 gotowe: oba API endpointy działają i zwracają poprawne dane
- React router skonfigurowany
- shadcn/ui Dialog, Textarea, Input, Button, Progress zainstalowane

---

## ✅ Acceptance Criteria

### AC-1: Krok 1 — PRD textarea
GIVEN: Mariusz klika "Nowy projekt przez PRD Wizard" na Pipeline page
WHEN: otwiera się dialog
THEN: widoczny jest Step 1 z: nagłówek "Krok 1 z 3 — Wklej PRD", duży Textarea (min 300px high), counter znaków "1234 / 50000", pole "Nazwa projektu" (input), pole "Klucz projektu" (input, auto-slug z nazwy)
AND: przycisk "Dalej →" jest disabled kiedy textarea < 100 znaków

### AC-2: Krok 2 — pytania AI
GIVEN: Mariusz wkleił PRD (>100 znaków) i kliknął "Dalej"
WHEN: serwer przetwarza PRD przez Claude
THEN: widoczny jest Step 2 z loading "AI analizuje PRD..." (spinner + komunikat)
AND: po załadowaniu (< 30s) pojawia się 5 pytań clarifying z polami textarea odpowiedzi
AND: każde pytanie ma krótką instrukcję "Odpowiedź opcjonalna — pomiń jeśli niezatem"

### AC-3: Krok 3 — preview epiców
GIVEN: Mariusz odpowiedział na pytania i kliknął "Dalej"
WHEN: serwer generuje epics draft przez Claude
THEN: widoczny jest Step 3 z listą wygenerowanych epiców: tytuł, opis jednym zdaniem, liczba stories (preview)
AND: przycisk "Zarejestruj w Bridge" jest aktywny
AND: przycisk "← Wróć" pozwala wrócić do kroku 2

### AC-4: Submit do Bridge
GIVEN: Mariusz przegląda preview epiców w kroku 3 i klika "Zarejestruj w Bridge"
WHEN: serwer wywołuje Bridge CLI dla każdego epica
THEN: pojawia się progress "Rejestruję EPIC-1... (1/5)", "Rejestruję EPIC-2... (2/5)" itd.
AND: po zakończeniu dialog zamyka się i pojawia toast "5 epiców zarejestrowanych w Bridge ✅ — wróć do Pipeline"

### AC-5: Walidacja klucza projektu
GIVEN: Mariusz wpisał nazwę projektu "Mój Nowy Projekt" w kroku 1
WHEN: focus opuszcza pole "Klucz projektu" (auto-wypełniony jako "moj-nowy-projekt")
THEN: klucz jest auto-slugify (małe litery, myślniki) z możliwością ręcznej edycji
AND: walidacja: tylko `[a-z0-9-]`, min 3 znaki, max 30; błąd "Klucz może zawierać tylko małe litery, cyfry i myślniki"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: modal otwarty z `/pipeline` lub `/projects`
Komponent: `PRDWizard`
Plik: `src/pages/pipeline/PRDWizard.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PRDWizard` | Dialog | `isOpen`, `onClose`, `onSuccess` | step1, step2-loading, step2-questions, step3-loading, step3-preview, step3-submitting, done |
| `WizardStepIndicator` | Progress/Steps | `currentStep`, `totalSteps` | step 1/2/3 |
| `PRDTextarea` | Textarea | `value`, `onChange`, `charCount` | empty, typing, valid |
| `AIQuestionsForm` | Form | `questions[]`, `answers`, `onChange` | loading, filled |
| `EpicPreviewList` | List | `epics[]` | loading, filled |
| `EpicPreviewCard` | Card | `epic` | — |

### Pola formularza — Krok 1

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| prd_text | textarea | min 100, max 50000 znaków | "PRD musi mieć minimum 100 znaków" | tak |
| project_name | text | min 3, max 100 znaków | "Nazwa projektu min 3 znaki" | tak |
| project_key | text | `[a-z0-9-]`, min 3, max 30 | "Klucz: tylko małe litery, cyfry, myślniki" | tak (auto) |

### Stany widoku

**Step 1 (idle):**
Dialog z 3-step indicator → Textarea z count → project name + key inputs → "Dalej →" button disabled/enabled.

**Step 2 — loading:**
Spinner + "AI analizuje PRD... (może zająć do 30 sekund)" — przycisk Back aktywny, Dalej disabled.

**Step 2 — questions:**
5 pytań z textarea odpowiedzi (opcjonalne). Przycisk "← Wróć" i "Dalej →".

**Step 3 — loading:**
"AI generuje epics draft..." — animacja skeleton cards.

**Step 3 — preview:**
Lista EpicPreviewCard (tytuł, opis, stories preview). Buttons: "← Wróć", "Zarejestruj w Bridge".

**Step 3 — submitting:**
Progress "Rejestruję EPIC-1... (1/N)" inline w dialogu. Buttons disabled.

**Done:**
Dialog zamyka się, toast sukcesu.

### Flow interakcji

```
1. Mariusz klika "Nowy projekt przez PRD Wizard" → dialog otwiera się na Step 1
2. Wkleja PRD, wpisuje nazwę → "Dalej →" aktywuje się
3. Klika "Dalej" → Step 2 loading (AI call) → po odpowiedzi: 5 pytań
4. Opcjonalnie odpowiada na pytania → "Dalej"
5. Step 3 loading (AI generuje epics) → po odpowiedzi: EpicPreviewList
6. Mariusz przegląda epics → klika "Zarejestruj w Bridge"
7. Progress per epic → zamknięcie dialogu → toast
8. Opcjonalnie: "← Wróć" w każdym kroku cofa do poprzedniego
9. Zamknięcie X → confirm dialog "Przerwać wizard? Dane nie zostaną zapisane." → Yes zamyka
```

### Responsive / Dostępność
- Mobile (375px+): dialog fullscreen, textarea 150px high, questions lista pionowa
- Desktop (1280px+): dialog 640px szeroki, textarea 250px high
- Keyboard navigation: Tab między polami, Escape otwiera confirm "czy przerwać?", Enter w ostatnim polu = "Dalej"
- ARIA: Dialog `aria-labelledby="prd-wizard-title"`, step indicator `aria-current="step"`, textarea `aria-describedby="char-count"`

---

## ⚠️ Edge Cases

### EC-1: AI timeout (>30 sekund)
Scenariusz: Anthropic API odpowiada po 35 sekundach
Oczekiwane zachowanie: po 30s loading state zmienia się na error "AI nie odpowiedziało w czasie — spróbuj ponownie" z przyciskiem retry (ponawia request bez wracania do Step 1)

### EC-2: Bridge rejestracja częściowo fails (207)
Scenariusz: 5 epiców do rejestracji, 3 sukces, 2 błąd (duplikat)
Oczekiwane zachowanie: dialog zamyka się, toast "3/5 epiców zarejestrowanych ✅ — 2 błędy (kliknij by zobaczyć)" z expandable error details

### EC-3: Zamknięcie dialogu w trakcie Step 3 submitting
Scenariusz: Mariusz klika X w trakcie rejestracji epiców w Bridge
Oczekiwane zachowanie: X jest disabled w czasie submitting — nie można zamknąć. Po zakończeniu (sukces lub błąd) X się odblokowuje.

---

## 🚫 Out of Scope tej Story
- Edycja epiców w Step 3 (tylko preview, nie edytor)
- Automatyczne tworzenie stories z epiców (ręczny krok po wyjściu z wizarda)
- Upload pliku .md (tylko paste text)
- Historia poprzednich PRD runs

---

## ✔️ Definition of Done
- [ ] Wszystkie kroki wizarda renderują się poprawnie (step 1, 2-loading, 2-questions, 3-loading, 3-preview, submitting)
- [ ] Walidacja klucza projektu działa (slug auto-fill + regex validation)
- [ ] AI loading states mają czytelne komunikaty z timeoutem 30s
- [ ] Submit do Bridge pokazuje progress per epic
- [ ] Zamknięcie wizarda w trakcie submitting jest zablokowane
- [ ] Widok działa na mobile 375px
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty po polsku
- [ ] Story review przez PO
