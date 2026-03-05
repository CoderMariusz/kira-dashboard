---
story_id: STORY-6.3
title: "Story detail panel — advance story, assign model, view AC"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-6.2]
blocks: []
tags: [pipeline, story-detail, modal, advance, assign-model, acceptance-criteria]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** kliknąć story w Pipeline page i zobaczyć pełny panel z detalami, akcjami advance i assignment modelu
**Żeby** zarządzać pojedynczą story bez wychodzenia ze strony pipeline

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Komponent: `StoryDetailPanel` — slide-over panel (prawy sidebar) lub Modal
- Trigger: kliknięcie StoryRow w PipelineView (STORY-6.2)
- Plik: `src/pages/pipeline/StoryDetailPanel.tsx`
- API: `GET /api/pipeline/stories/:id` (szczegóły), `POST /api/pipeline/stories/:id/advance`, `POST /api/pipeline/stories/:id/assign-model`

### Powiązane pliki
- `src/pages/pipeline/index.tsx` — parent który zarządza `selectedStory` stanem
- `src/_shared/lib/pipelineApi.ts` — metody `getStoryDetail`, `advanceStory`, `assignModel`
- `POST /api/pipeline/stories/:id/advance` — endpoint z STORY-6.1
- Mockup: sekcja "Story Detail modal" w `kiraboard-mockup-v5-all-pages.html`

### Stan systemu przed tą story
- STORY-6.2 gotowe: PipelineView renderuje rows, kliknięcie row emituje `onSelect(story_id)`
- STORY-6.1 gotowe: advance endpoint działa
- Auth guard aktywny (wymagana rola admin)

---

## ✅ Acceptance Criteria

### AC-1: Otwarcie panelu po kliknięciu story
GIVEN: Pipeline page wyświetla listę stories
WHEN: Mariusz klika wiersz story `STORY-6.2`
THEN: otwiera się slide-over panel z prawej strony z tytułem "STORY-6.2 — Pipeline page — epic/story list..."
AND: panel zawiera sekcje: Metadata, Acceptance Criteria, Assigned Model, Akcje

### AC-2: Wyświetlenie metadanych story
GIVEN: panel jest otwarty dla story z domain=frontend, status=IN_PROGRESS, model=sonnet-4.6
WHEN: panel jest wyrenderowany
THEN: widoczne są: Story ID, Tytuł, Domena (badge), Status (kolorowy badge), Przypisany model, Estimated effort, depends_on lista

### AC-3: Wyświetlenie Acceptance Criteria
GIVEN: story ma 5 AC z formatem GIVEN/WHEN/THEN
WHEN: Mariusz scrolluje do sekcji "Acceptance Criteria"
THEN: wyświetlone są wszystkie AC z numeracją i pełną treścią GIVEN/WHEN/THEN
AND: każde AC jest collapsible (domyślnie zwinięte poza pierwszym)

### AC-4: Advance story
GIVEN: story ma status `IN_PROGRESS`
WHEN: Mariusz klika przycisk "Zaawansuj → REVIEW" i potwierdza
THEN: system wywołuje `POST /api/pipeline/stories/STORY-6.2/advance` z `{ status: "REVIEW" }`
AND: po sukcesie status w panelu zmienia się na REVIEW (badge żółty)
AND: toast "Story zaawansowana do REVIEW ✅" pojawia się przez 3 sekundy

### AC-5: Assign model
GIVEN: panel jest otwarty dla story z modelem `kimi-k2.5`
WHEN: Mariusz klika dropdown "Zmień model" i wybiera `sonnet-4.6`
THEN: system wysyła `POST /api/pipeline/stories/STORY-6.2/assign-model` z `{ model: "sonnet-4.6" }`
AND: model w panelu aktualizuje się na `sonnet-4.6`
AND: toast "Model zaktualizowany ✅" pojawia się

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/pipeline` (panel side-over, nie osobna route)
Komponent: `StoryDetailPanel`
Plik: `src/pages/pipeline/StoryDetailPanel.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `StoryDetailPanel` | SlideOver/Sheet | `storyId`, `isOpen`, `onClose` | closed, loading, filled, error |
| `MetadataGrid` | Grid | `story` | — |
| `ACList` | List | `criteria[]` | all-collapsed, first-expanded |
| `ACItem` | Collapsible | `ac`, `index` | collapsed, expanded |
| `AdvanceButton` | Button | `currentStatus`, `onAdvance` | idle, loading, disabled |
| `ModelSelector` | Select | `current`, `options`, `onChange` | idle, loading |
| `StatusBadge` | Badge | `status` | BACKLOG, IN_PROGRESS, REVIEW, DONE |

### Stany widoku

**Loading:**
Panel jest otwarty z skeleton: szare prostokąty w miejscu metadanych i AC. Przyciski disabled.

**Empty (brak AC):**
Komunikat w sekcji AC: "Brak zdefiniowanych Acceptance Criteria dla tej story."

**Error (błąd ładowania):**
"Nie można załadować szczegółów story — spróbuj ponownie." z przyciskiem retry.

**Filled (normalny stan):**
Header z Story ID + tytuł, badges Domain i Status. Grid metadanych (6 pól). Sekcja AC z listą. Sekcja Akcje: AdvanceButton (disabled jeśli DONE) + ModelSelector.

### Flow interakcji

```
1. Klik row story → StoryDetailPanel otwiera się jako slide-over z prawej (animacja)
2. Loading state: skeleton w miejscu treści
3. Dane załadowane → renderuje MetadataGrid, ACList, sekcję Akcji
4. Mariusz klika "Zaawansuj → REVIEW" → pojawia się confirm dialog "Czy na pewno?"
5. Potwierdza → przycisk przechodzi w loading → API call
6. Sukces → status badge zmienia kolor → toast 3s
7. Błąd → toast error "Błąd zaawansowania: [detail]" → przycisk odblokowany
8. Mariusz klika X lub Escape → panel zamyka się (animacja slide-out)
```

### Responsive / Dostępność
- Mobile (375px+): panel zajmuje 100% width (full-screen modal zamiast slide-over)
- Desktop (1280px+): panel zajmuje 480px z prawej, reszta strony przyciemniona overlay
- Keyboard navigation: Escape zamyka panel, Tab między polami, Enter na AdvanceButton otwiera confirm
- ARIA: `role="dialog"`, `aria-labelledby` na title panelu, focus trap wewnątrz panelu

---

## ⚠️ Edge Cases

### EC-1: Story ze statusem DONE — advance niedostępne
Scenariusz: otwarto panel dla story w statusie DONE
Oczekiwane zachowanie: przycisk "Zaawansuj" jest disabled z tooltip "Story jest już ukończona"
Komunikat dla użytkownika: "Story jest już w statusie DONE"

### EC-2: Advance endpoint zwraca błąd Bridge
Scenariusz: Bridge CLI odpowiada błędem "Cannot advance — story not started"
Oczekiwane zachowanie: toast error z komunikatem z Bridge, status story nie zmienia się w UI

### EC-3: Bardzo długa lista AC (>10 AC)
Scenariusz: story ma 12 acceptance criteria
Oczekiwane zachowanie: lista scrollable wewnątrz panelu, wszystkie poza pierwszym zwinięte, nie powoduje overflow panelu

---

## 🚫 Out of Scope tej Story
- Gate timeline (STORY-6.5)
- Run history tabela (osobna scope do EPIC-7)
- Lessons learned rendering (EPIC-8)
- Bulk actions (STORY-6.3)
- Edycja treści story (out of scope całego EPIC-6)

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading/skeleton, empty AC, error, filled)
- [ ] Advance działa i aktualizuje status w panelu bez przeładowania strony
- [ ] Model selector aktualizuje model w panelu po sukcesie API
- [ ] Panel zamyka się Escapem i przyciskiem X
- [ ] Focus trap działa w panelu (Tab nie wychodzi za panel)
- [ ] Widok działa na mobile 375px (full-screen modal)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe
- [ ] Story review przez PO
