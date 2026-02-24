---
story_id: STORY-6.6
title: "Wizard 'Nowy projekt' — 3-krokowy modal (PRD → Pytania → Podgląd + Rejestracja)"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 8h
depends_on: [STORY-6.5]
blocks: [STORY-6.7]
tags: [modal, wizard, multi-step, ai, prd, project-registration, form, animation, frontend]
---

## 🎯 User Story

**Jako** Mariusz (admin / tech lead)
**Chcę** modal wizard "Nowy projekt" z 3 krokami: wklejam PRD → odpowiadam na pytania AI → przeglądam epiki i rejestruję
**Żeby** zarejestrować nowy projekt w Bridge w < 5 minut bez opuszczania dashboardu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
components/pipeline/NewProjectWizard.tsx
```

Używane przez: `ProjectSwitcher` (STORY-6.7) — prop `onNewProject` otwiera ten modal.

Stack:
- Next.js 16, React 18, `'use client'`
- Tailwind CSS + kolory projektu
- `sonner` (toast) — już zainstalowany
- `prdService` z `services/prdService.ts` (STORY-6.5)
- `useProjectStats` z `hooks/useProjectStats.ts` (STORY-6.5) — `mutate()` po rejestracji

### Powiązane pliki
- `services/prdService.ts` (STORY-6.5)
- `types/pipeline-prd.ts` (STORY-6.5)
- `components/models/ModelDetailPanel.tsx` — wzorzec modalnego overlay
- Kolory: tło `#0d0c1a`, karty `#1a1730`, akcent `#818cf8`, border `#2a2540`

### Stan systemu przed tą story
- STORY-6.5 zaimplementowana (typy + serwisy)
- Endpointy STORY-6.1 i STORY-6.2 działają

---

## ✅ Acceptance Criteria

### AC-1: Krok 1 — textarea PRD
GIVEN: modal jest otwarty (krok 1)
WHEN: użytkownik wchodzi w modal
THEN: widać textarea z placeholder "Opisz co ma robić Twój projekt..." i licznik znaków "0/20000"
AND: przycisk "Analizuj PRD →" jest disabled dopóki textarea ma < 50 znaków

### AC-2: Krok 1 → Krok 2 — loading i pytania
GIVEN: użytkownik wpisał 100+ znaków i kliknął "Analizuj PRD →"
WHEN: `prdService.getQuestions()` jest wywołany
THEN: spinner z tekstem "Kira analizuje PRD..." zastępuje zawartość kroku 1 (nie zamyka modalu)
AND: po sukcessie wyświetlony jest formularz z 3–5 pytaniami w języku polskim
AND: pytania `type: 'choice'` mają radio buttons, `type: 'text'` mają input pola

### AC-3: Krok 2 → Krok 3 — podgląd epików
GIVEN: użytkownik wypełnił min wymagane pytania i kliknął "Generuj projekt →"
WHEN: `prdService.createFromPrd()` jest wywołany (bez jeszcze `project_name` i `project_key`)
THEN: spinner z tekstem "Generuję strukturę projektu..."
AND: po sukcessie wyświetlona jest lista wygenerowanych epików z liczbą stories per epic
AND: widoczne są pola do wpisania `project_name` (input) i `project_key` (input z walidacją `/^[a-z0-9-]+$/`)

### AC-4: Krok 3 — rejestracja
GIVEN: użytkownik wypełnił `project_name` i `project_key` i kliknął "Zarejestruj w Bridge ✓"
WHEN: endpoint `create-from-prd` jest wywołany z kompletnym payload
THEN: spinner "Rejestruję projekt w Bridge..."
AND: po sukcesie: toast.success "Projekt {project_key} zarejestrowany ✓", modal się zamyka, `mutate()` odświeża project stats

### AC-5: Błąd na etapie 2 (409 — projekt już istnieje)
GIVEN: użytkownik podał `project_key` który już istnieje
WHEN: endpoint create-from-prd zwraca 409
THEN: inline error banner w kroku 3: "Projekt o tym kluczu już istnieje w Bridge — zmień klucz"
AND: modal pozostaje otwarty na kroku 3, użytkownik może zmienić klucz i spróbować ponownie

### AC-6: Przycisk X / Escape zamyka modal
GIVEN: modal jest otwarty na dowolnym kroku
WHEN: użytkownik klika X lub naciska Escape
THEN: modal się zamyka, stan wizzarda jest resetowany do kroku 1

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
- Komponent: `NewProjectWizard` (samodzielny — zarządza własnym stanem kroków)
- Props: `isOpen: boolean`, `onClose: () => void`

### Stan wewnętrzny
```typescript
type WizardStep = 'prd-input' | 'analyzing' | 'questions' | 'generating' | 'preview' | 'registering' | 'error'

const [step, setStep] = useState<WizardStep>('prd-input')
const [prdText, setPrdText] = useState('')
const [questions, setQuestions] = useState<PrdQuestion[]>([])
const [answers, setAnswers] = useState<Record<string, string>>({})
const [generatedData, setGeneratedData] = useState<CreateFromPrdResponse | null>(null)
const [projectName, setProjectName] = useState('')
const [projectKey, setProjectKey] = useState('')
const [projectKeyError, setProjectKeyError] = useState('')
const [errorMessage, setErrorMessage] = useState('')
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| NewProjectWizard | Modal overlay | `isOpen`, `onClose` | closed, krok 1–3, loading, error |
| Textarea PRD | textarea | `value`, `onChange`, `maxLength=20000` | normal, char-count warning przy > 18000 |
| QuestionField | Input/RadioGroup | `question: PrdQuestion`, `value`, `onChange` | text / choice |
| EpicPreviewItem | div | `epic: GeneratedEpic` | collapsed (pokazuje tytuł + stories_count) |
| ProjectKeyInput | Input | `value`, `onChange`, `onValidate` | valid, invalid (red border + error msg) |

### Pola formularza — Krok 3

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| project_name | text | min 2, max 100 | "Nazwa projektu musi mieć min 2 znaki" | tak |
| project_key | text | `/^[a-z0-9-]+$/`, min 3, max 40 | "Tylko małe litery, cyfry i myślniki" | tak |

### Stany widoku

**Krok 1 (prd-input):**
Textarea z placeholderem, licznik znaków pod spodem (szary gdy < 18k, pomarańczowy gdy ≥ 18k), przycisk "Analizuj PRD →" disabled gdy < 50 znaków

**analyzing / generating / registering:**
Spinner + tekst informacyjny, bez możliwości kliknięcia czegokolwiek (disabled overlay)

**Krok 2 (questions):**
Lista pytań: każde z numerem "1.", "2." etc., `type: 'text'` → `<input>`, `type: 'choice'` → radio buttons z etykietami

**Krok 3 (preview):**
Lista `GeneratedEpic` items (collapsible lub plain), pola `project_name` + `project_key` z real-time walidacją

**error:**
Inline error banner (czerwony) z komunikatem i przyciskiem "Spróbuj ponownie"

### Flow interakcji (krok po kroku)
```
1. isOpen=true → modal otwiera się, krok=prd-input, state resetowany
2. Użytkownik wpisuje PRD (≥50 znaków) → "Analizuj PRD →" aktywny
3. Klik "Analizuj" → setStep('analyzing') → prdService.getQuestions()
4a. Sukces → setQuestions(data.questions), setStep('questions')
4b. Błąd → setErrorMessage(e.message), setStep('error')
5. Użytkownik wypełnia pytania → klik "Generuj projekt →"
6. setStep('generating') → prdService.createFromPrd({ prd_text, project_name: '', project_key: '', answers })
   UWAGA: Generowanie odbywa się przed wpisaniem project_name/key — w kroku 3 tylko te dwa pola
7a. Sukces → setGeneratedData(data), setStep('preview')
7b. Błąd → setErrorMessage, setStep('error')
8. Użytkownik wypełnia project_name i project_key → walidacja real-time
9. Klik "Zarejestruj w Bridge ✓" (enabled gdy oba pola valid)
   → setStep('registering')
   → prdService.createFromPrd({ prd_text, project_name, project_key, answers })
   (drugie wywołanie z pełnymi danymi — pierwsze w kroku 6 służyło tylko do podglądu)
10a. Sukces → toast.success(`Projekt ${project_key} zarejestrowany ✓`), mutate(), onClose()
10b. Błąd 409 → setErrorMessage("Projekt o tym kluczu już istnieje — zmień klucz"), setStep('preview')
10c. Inne błędy → setErrorMessage, setStep('error')
```

### Responsive / Dostępność
- Desktop (1280px+): modal wycentrowany `width: 560px`, `max-height: 80vh`, scrollable
- Mobile (375px+): `width: calc(100vw - 32px)`, `max-height: 90vh`
- Keyboard: Escape zamyka modal, Tab nawiguje po formularzu, Enter w textareas nie submituje (tylko Shift+Enter)
- ARIA: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="wizard-title"`, backdrop `aria-hidden="true"`
- Focus trap wewnątrz modalu gdy otwarty

### Styl komponentu
```
Backdrop: bg-black/70 + backdrop-blur-sm, fixed inset-0 z-50
Container:
  - background: #1a1730
  - border: 1px solid #3b3d7a
  - border-radius: 16px
  - width: 560px (desktop), 100%-32px (mobile)
  - padding: 24px

Header:
  - Ikona gradientowa: linear-gradient(135deg, #7c3aed, #3b82f6), 32×32px rounded-lg
  - Tytuł: text-lg font-semibold text-white
  - X button: text-slate-400 hover:text-white

Progress dots (3 kropki):
  - Aktywna: bg-[#818cf8], w-6 h-2 rounded-full
  - Nieaktywna: bg-[#2a2540], w-2 h-2 rounded-full
  - Animacja scale przy zmianie kroku

Textarea:
  - background: #0d0c1a
  - border: 1px solid #2a2540
  - focus: border-color: #818cf8, ring-1 ring-[#818cf8]
  - min-height: 160px

Primary CTA:
  - background: linear-gradient(135deg, #7c3aed, #3b82f6)
  - hover: opacity-90
  - disabled: opacity-40 cursor-not-allowed
```

---

## ⚠️ Edge Cases

### EC-1: Użytkownik zamyka modal podczas loading (analyzing/generating)
Scenariusz: Klik X gdy trwa wywołanie AI
Oczekiwane zachowanie: modal zamknięty, in-flight request jest porzucony (nie cancelowany — React unmount wystarczy); stan zresetowany; żaden toast nie wyskakuje

### EC-2: AI generuje 0 pytań
Scenariusz: `questions: []` z API
Oczekiwane zachowanie: pomiń krok 2 (pytania), przejdź od razu do kroku 3 z `answers: {}`; pokaż toast.info "Kira nie potrzebuje dodatkowych pytań — przejdź do generowania"

### EC-3: project_key auto-generowany z project_name
Scenariusz: Użytkownik wpisuje `project_name: "Gym Tracker"`
Oczekiwane zachowanie: `project_key` input automatycznie wypełniany jako `"gym-tracker"` (lowercase, spacje → myślniki, usuń znaki specjalne); użytkownik może edytować ręcznie

### EC-4: Bardzo długa lista epików (5 × 5 = 25 stories)
Scenariusz: AI generuje maksymalną liczbę items
Oczekiwane zachowanie: lista epików jest scrollowalna wewnątrz modalu (`max-height: 40vh, overflow-y: auto`); nie wychodzi poza okno

---

## 🚫 Out of Scope tej Story
- Edycja pojedynczych stories wewnątrz wizard
- Persystowanie stanu wizard między sesjami
- Import PRD z URL lub pliku
- RBAC na wizard (tylko Mariusz — ADMIN)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów — zero `any`
- [ ] Wszystkie 8 stanów (`prd-input`, `analyzing`, `questions`, `generating`, `preview`, `registering`, `error`, closed) są obsłużone
- [ ] Walidacja project_key real-time z komunikatem po polsku
- [ ] Auto-generowanie project_key z project_name (EC-3)
- [ ] Focus trap działa (Tab nie wychodzi z modalu)
- [ ] Escape zamyka modal
- [ ] Toast.success po sukcesie + onClose() wywoływane
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Widok działa na mobile 375px bez horizontal scroll
