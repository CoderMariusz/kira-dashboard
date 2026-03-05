---
story_id: STORY-6.5
title: "Gate System UI — gate squares, compliance meter, override button"
epic: EPIC-6
module: pipeline
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 7h
depends_on: [STORY-6.4, STORY-6.2]
blocks: []
tags: [pipeline, gates, compliance, override, tooltip, filter, badge]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** widzieć 5 kolorowych kwadratów gate per story, compliance meter projektu i możliwość overridu gate z komentarzem
**Żeby** mieć pełną kontrolę nad jakością pipeline'u i widzieć które stories ominęły kroki

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Komponent `GateSquares` — 5 kwadracików wewnątrz `StoryRow` (STORY-6.2)
- Komponent `GateComplianceBanner` — baner na górze Pipeline page
- Komponent `GateOverrideDialog` — modal z komentarzem override
- Tab "Skipped Gates" — filtr w StatusFilterTabs
- Plik: `src/pages/pipeline/GateSquares.tsx`, `src/pages/pipeline/GateComplianceBanner.tsx`
- API: `GET /api/gates/status`, `POST /api/gates/override`

### Powiązane pliki
- `src/pages/pipeline/index.tsx` — PipelineView, tu montowane komponenty gate
- `src/_shared/lib/gatesApi.ts` — serwis API
- Endpoint z STORY-6.4: `/api/gates/status`, `/api/gates/override`
- `kiraboard-mockup-v5-all-pages.html` — sekcja Gate System

### Stan systemu przed tą story
- STORY-6.4 gotowe: gate API endpoints działają
- STORY-6.2 gotowe: PipelineView renderuje StoryRow, jest miejsce na gate squares
- StoryRow ma zarezerwowane miejsce (puste placeholder) na 5 gate squares

---

## ✅ Acceptance Criteria

### AC-1: 5 gate squares z kolorami per story
GIVEN: story `STORY-6.1` ma gaty: IMPLEMENT=pass, LINT=pass, TEST=fail, REVIEW=pending, MERGE=pending
WHEN: StoryRow jest wyrenderowany
THEN: widoczne są 5 kwadratów (10×10px każdy) w kolejności: IMPLEMENT(zielony), LINT(zielony), TEST(czerwony), REVIEW(szary), MERGE(szary)
AND: hover nad kwadratem pokazuje Tooltip z nazwą gate'a, statusem i timestamp (jeśli dostępny)

### AC-2: Kolory gate squares
GIVEN: gate ma różne statusy
WHEN: GateSquares jest wyrenderowany
THEN: kolory są: pending=`bg-gray-300`, active=`bg-blue-400`, pass=`bg-green-500`, fail=`bg-red-500`, skip=`bg-yellow-400`

### AC-3: Compliance banner
GIVEN: projekt `kira-dashboard` ma 10 stories, 8 z all gates pass (80%), 2 z skip
WHEN: Mariusz wchodzi na Pipeline page
THEN: na górze widoczny baner "Gate compliance: 80% (8/10 stories z all gates passed)"
AND: baner zawiera link/przycisk "⚠️ 2 stories z pominięte gaty → pokaż" który aktywuje filtr Skipped Gates

### AC-4: Tab "Skipped Gates" filtruje listę
GIVEN: lista stories jest wyświetlona
WHEN: Mariusz klika tab "Skipped Gates"
THEN: lista pokazuje tylko stories gdzie co najmniej jeden gate ma status `skip`
AND: licznik w tabie pokazuje liczbę stories (np. "Skipped Gates (2)")

### AC-5: Override gate z komentarzem
GIVEN: gate `LINT` dla `STORY-6.1` ma status `fail`
WHEN: Mariusz klika czerwony kwadrat LINT → otwiera się GateOverrideDialog → wpisuje "Lint pominięty — hotfix produkcyjny" → klika "Zastosuj override → skip"
THEN: system wysyła `POST /api/gates/override` z danymi override
AND: kwadrat LINT zmienia kolor na żółty (skip)
AND: toast "Gate LINT nadpisany → skip ✅" pojawia się

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/pipeline` (komponenty w obrębie PipelineView)
Pliki:
- `src/pages/pipeline/GateSquares.tsx`
- `src/pages/pipeline/GateComplianceBanner.tsx`
- `src/pages/pipeline/GateOverrideDialog.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `GateSquares` | Row of squares | `gates[]`, `onOverride` | per-gate: pending/active/pass/fail/skip |
| `GateSquare` | Button/div | `gate`, `onClick` | color based on status, hover tooltip |
| `GateTooltip` | Tooltip | `gate` | visible on hover |
| `GateComplianceBanner` | Banner/Alert | `compliance`, `skippedCount`, `onFilter` | green (>90%), yellow (70-90%), red (<70%) |
| `GateOverrideDialog` | Dialog/Modal | `gate`, `storyId`, `onConfirm` | idle, submitting, success, error |

### Pola formularza — GateOverrideDialog

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| comment | textarea | min 5 znaków, max 500 | "Komentarz musi mieć minimum 5 znaków" | tak |
| target_status | radio | ENUM: skip/pass | — | tak (domyślnie skip) |

### Stany widoku

**Loading:**
GateSquares pokazuje 5 szarych skeleton kwadratów (animacja pulse). Compliance banner pokazuje "Ładowanie..."

**Empty (brak gate danych):**
GateSquares renderuje 5 szarych kwadratów ze statusem `pending` (story nie ma wpisów w gate table).

**Error (błąd API gates):**
Compliance banner zastąpiony błędem "Nie można załadować gate status". GateSquares w status `pending` (szare).

**Filled (normalny stan):**
5 kolorowych kwadratów per story, compliance banner z procentem i linkiem.

### Flow interakcji

```
1. PipelineView ładuje stories → równolegle fetch GET /api/gates/status?project=X
2. GateSquares renderują się per story po załadowaniu gates data
3. Mariusz hover nad kwadratem → Tooltip animuje się (fade-in) z: "LINT — fail — 2026-03-05 18:00"
4. Mariusz klika czerwony kwadrat (fail) → otwiera GateOverrideDialog
5. Dialog: "Nadpisz gate LINT dla STORY-6.1" → radio: skip/pass → textarea komentarz
6. Klika "Zastosuj" → loading spinner → API call
7. Sukces → dialog zamknięty, kwadrat zmienia kolor, toast
8. Compliance banner re-fetch po override dla aktualizacji %
```

### Responsive / Dostępność
- Mobile (375px+): GateSquares ukryte na mobile (zastąpione compact badge "3/5 gates")
- Desktop (1280px+): 5 kwadratów 10×10px z 2px gap między nimi
- Keyboard navigation: focus na kwadrat → Enter otwiera override dialog; dialog ma focus trap
- ARIA: każdy kwadrat ma `aria-label="Gate LINT — fail"`, Tooltip `role="tooltip"`, Dialog `role="dialog"`

---

## ⚠️ Edge Cases

### EC-1: Gate squares kiedy brak danych gate (story nowa)
Scenariusz: story zarejestrowana przed wdrożeniem gate systemu — brak wpisów w kb_story_gates
Oczekiwane zachowanie: 5 szarych kwadratów (pending) — API zwraca pending jako default (z STORY-6.4 EC-1)
Komunikat dla użytkownika: brak komunikatu, szare kwadraty są oczekiwanym widokiem

### EC-2: Override API error
Scenariusz: POST override zwraca 400 (komentarz za krótki — edge case po stronie frontu)
Oczekiwane zachowanie: dialog pozostaje otwarty, pod textarea pojawia się komunikat błędu walidacji, przycisk odblokowany

### EC-3: Compliance banner przy 0 stories
Scenariusz: projekt bez żadnych stories (nowy projekt)
Oczekiwane zachowanie: compliance banner nie wyświetla się (lub pokazuje "Brak stories — brak danych gate")

---

## 🚫 Out of Scope tej Story
- SSE auto-refresh gate squares po zmianie (EPIC-2)
- Historia gate audit log
- Gate config edycja z UI
- Bulk override wielu gate'ów naraz

---

## ✔️ Definition of Done
- [ ] 5 gate squares z poprawnymi kolorami per status (wszystkie 5 stanów: pending/active/pass/fail/skip)
- [ ] Tooltip widoczny na hover z nazwą, statusem i timestampem
- [ ] Compliance banner z poprawnym procentem i linkiem do filtra Skipped
- [ ] Tab "Skipped Gates" filtruje stories lokalnie
- [ ] Override dialog: walidacja komentarza, submit → kolor kwadratu zmienia się
- [ ] GateSquares ukryte na mobile (nie powodują horizontal scroll)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów po polsku
- [ ] Story review przez PO
