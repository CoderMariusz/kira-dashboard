---
story_id: STORY-9.3
title: "Digest history — lista digestów z daty, klikalny podgląd"
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
tags: [list, modal, markdown, history, nightclaw]
---

## 🎯 User Story

**Jako** Mariusz (admin)
**Chcę** widzieć historię wszystkich digestów NightClaw posortowaną od najnowszego
**Żeby** móc cofnąć się do dowolnego dnia i sprawdzić co Kira robiła tamtej nocy

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/nightclaw/history` (podstrona NightClaw module)
- Plik: `/app/nightclaw/history/page.tsx`
- Komponenty: `/components/nightclaw/DigestHistoryList.tsx`, `/components/nightclaw/DigestModal.tsx`

### Powiązane pliki
- API: `GET /api/nightclaw/digest?list=true` → lista `[{ date, filename }]`
- API: `GET /api/nightclaw/digest?date=YYYY-MM-DD` → treść konkretnego digestu
- Auth guard: dziedziczony z `/app/nightclaw/layout.tsx` (STORY-3.3)

### Stan systemu przed tą story
- STORY-9.1 dostarcza endpoint `GET /api/nightclaw/digest?list=true` i `?date=YYYY-MM-DD`
- STORY-9.2 dostarcza `DigestViewer` komponent który może być reużyty w modal
- Auth guard na poziomie layout.tsx już działa
- shadcn/ui `Dialog` (Modal), `Table` lub `List`, `Badge` dostępne

---

## ✅ Acceptance Criteria

### AC-1: Lista digestów posortowana desc
GIVEN: admin wchodzi na `/nightclaw/history`, endpoint `GET /api/nightclaw/digest?list=true` zwraca listę
WHEN: strona się załaduje
THEN: widoczna lista kart/wierszy gdzie każdy element pokazuje datę w formacie `DD.MM.YYYY (Dzień tygodnia)` (np. "03.03.2026 (Wtorek)")
AND: lista jest posortowana malejąco — najnowszy digest na górze
AND: każda pozycja ma przycisk/link "Podgląd"

### AC-2: Kliknięcie "Podgląd" otwiera modal z digestem
GIVEN: lista digestów jest załadowana, admin klika "Podgląd" przy wybranej dacie
WHEN: klik następuje
THEN: otwiera się shadcn/ui Dialog (modal) z tytułem "Digest NightClaw — [DD.MM.YYYY]"
AND: modal wyświetla Skeleton podczas ładowania contentu
AND: po załadowaniu (`GET /api/nightclaw/digest?date=YYYY-MM-DD`) — renderuje Markdown (react-markdown + remark-gfm)
AND: modal jest zamykalny przez X, Escape, klik poza modałem

### AC-3: Loading state listy
GIVEN: admin wchodzi na `/nightclaw/history`, fetch listy jest w toku
WHEN: trwa ładowanie
THEN: widoczna lista 5 Skeleton placeholderów (animowane, pełna szerokość, różne długości dat)

### AC-4: Empty state — brak digestów
GIVEN: katalog digest/ jest pusty, endpoint zwraca `{ digests: [] }`
WHEN: strona załaduje odpowiedź
THEN: widoczny komunikat "Brak historii digestów. NightClaw jeszcze nie uruchamiał się." z ikoną 🌙

### AC-5: Link powrotu do NightClaw dashboard
GIVEN: admin jest na stronie `/nightclaw/history`
WHEN: strona jest załadowana
THEN: widoczny link/przycisk "← Powrót do NightClaw" który przekierowuje na `/nightclaw`

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/nightclaw/history`
Komponent: `DigestHistoryPage` (`/app/nightclaw/history/page.tsx`)
Pliki komponentów:
- `/components/nightclaw/DigestHistoryList.tsx` — lista z kartami/wierszami
- `/components/nightclaw/DigestModal.tsx` — modal z pełnym podglądem digestu

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `DigestHistoryList` | List/Table | `digests: DigestMeta[]` | loading/empty/filled |
| `DigestModal` | Dialog | `date: string \| null`, `onClose: () => void` | loading/error/filled |
| `DigestHistoryPage` | Page | — | loading/error/filled |

### Formatowanie daty
```typescript
// "2026-03-03" → "03.03.2026 (Wtorek)"
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const day = date.toLocaleDateString('pl-PL', { weekday: 'long' })
  return `${date.toLocaleDateString('pl-PL')} (${day.charAt(0).toUpperCase() + day.slice(1)})`
}
```

### Stany widoku

**Loading:**
- Lista: 5 Skeleton kart (animowane, każda z placeholder daty i przycisku)

**Empty (brak danych):**
- Wyśrodkowany tekst z ikoną: `🌙 Brak historii digestów. NightClaw jeszcze nie uruchamiał się.`

**Error (błąd serwera/sieci):**
- Komunikat: "Nie udało się załadować listy digestów. [Spróbuj ponownie]" z przyciskiem retry

**Filled (normalny stan):**
- Lista kart: każda karta zawiera datę (bold) + przycisk "Podgląd" po prawej stronie
- Header strony: "🦇 Historia Digestów" + link "← Powrót do NightClaw"

### Flow interakcji

```
1. Admin wchodzi na /nightclaw/history → strona ładuje listę (Skeleton)
2. GET /api/nightclaw/digest?list=true → lista digestów
3. Lista renderuje karty z datami (desc)
4. Admin klika "Podgląd" przy dacie X → otwiera DigestModal (date = X)
5. Modal pokazuje Skeleton → fetch GET /api/nightclaw/digest?date=X
6. Markdown załadowany → modal renderuje DigestViewer
7. Admin zamyka modal (X / Escape / klik poza) → modal znika, lista widoczna
8. Admin klika "← Powrót do NightClaw" → navigate /nightclaw
```

### Responsive / Dostępność
- Mobile (375px+): lista w jednej kolumnie, przycisk "Podgląd" pełna szerokość
- Desktop (1280px+): lista zajmuje 2/3 szerokości, wyśrodkowana (max-w-2xl mx-auto)
- Modal: maksymalna szerokość 700px, max-height 80vh, wewnętrzny scroll
- Keyboard: "Podgląd" dostępny z Tab, Enter otwiera; Escape zamyka modal
- ARIA: `aria-label="Otwórz digest z [data]"` na przyciskach Podgląd; `role="dialog"` na modalu (shadcn/ui dostarcza automatycznie)

---

## ⚠️ Edge Cases

### EC-1: Bardzo dużo digestów (>100 plików)
Scenariusz: NightClaw uruchamiał się codziennie przez wiele miesięcy
Oczekiwane zachowanie: endpoint domyślnie zwraca max 100 najnowszych (lub wszystkie — frontend paginuje wirtualnie); lista nie zawiesza przeglądarki. Implement: `limit` query param jeśli potrzeba, lub windowing z `react-window`

### EC-2: Modal — błąd ładowania konkretnego digestu
Scenariusz: plik digestu istnieje na liście, ale między listą a fetch treści został usunięty
Oczekiwane zachowanie: modal pokazuje błąd "Nie udało się załadować digestu z tej daty." z przyciskiem "Zamknij"

### EC-3: Szybkie klikanie różnych digestów (race condition)
Scenariusz: użytkownik klika "Podgląd" dla daty A, potem szybko dla daty B — oba fetch w locie
Oczekiwane zachowanie: modal pokazuje dane dla ostatnio klikniętej daty; poprzedni fetch jest anulowany (AbortController) lub ignorowany (check czy date nie zmieniła się w stateie)

---

## 🚫 Out of Scope tej Story
- Wyszukiwanie w historii digestów (full-text search)
- Usuwanie digestów
- Eksport digestów (PDF/email)
- Lessons Learned browser — to STORY-9.4
- Calendar heatmap (to EPIC-9.md zakres, poza task brief)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] Wszystkie stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Modal otwiera się i zamyka poprawnie (X, Escape, klik poza)
- [ ] Markdown rendering w modal działa (code blocks, listy, nagłówki)
- [ ] Formatowanie daty po polsku z dniem tygodnia
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
