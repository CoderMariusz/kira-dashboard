---
story_id: STORY-4.9
title: "Home overview widget — upcoming tasks + shopping count + calendar events"
epic: EPIC-4
module: home
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-4.2, STORY-0.2]
blocks: []
tags: [react, overview, widget, summary, dashboard, sticky-header]
---

## 🎯 User Story

**Jako** Angelika lub Mariusz wchodzący na Home Dashboard
**Chcę** widzieć u góry strony podsumowanie w formie kart-liczników (zakupy do kupienia, nadchodzące zadania, najbliższe wydarzenie)
**Żeby** jednym rzutem oka wiedzieć co jest do zrobienia bez wchodzenia w szczegóły każdej sekcji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/home` (sticky header lub top section)
Komponent: `pages/home/components/HomeOverview.tsx`
Hook: `pages/home/hooks/useHomeOverview.ts`
Dane: agregacja z kilku API calls (shopping count + tasks + upcoming events)

### Powiązane pliki
- `pages/home/components/HomeOverview.tsx` — komponent overview
- `pages/home/hooks/useHomeOverview.ts` — multi-fetch hook
- `_shared/lib/home-api.ts` — API client dla shopping i tasks
- `pages/home/HomePage.tsx` — montuje HomeOverview na górze

### Stan systemu przed tą story
- STORY-4.2: `GET /api/home/shopping` zwraca listę z polem `bought`
- STORY-0.2: React scaffold istnieje, strona `/home` załadowuje się
- Tailwind + shadcn/ui dostępne (Card, Badge)

---

## ✅ Acceptance Criteria

### AC-1: Widget "Zakupy" — liczba niekupionych itemów
GIVEN: W Shopping List jest 5 itemów, z czego 2 bought=true
WHEN: Angelika otwiera Home Dashboard
THEN: Widget "🛒 Zakupy" pokazuje liczbę **3** (niekupione) i label "do kupienia"
AND: Kliknięcie/tapnięcie widgetu scrolluje lub nawiguje do sekcji Shopping List

### AC-2: Widget "Zadania" — liczba kart w To Do i Doing
GIVEN: Kanban ma 4 karty w "To Do" i 2 w "Doing", 5 w "Done"
WHEN: Angelika patrzy na Home Overview
THEN: Widget "✅ Zadania" pokazuje **6** (To Do + Doing) i label "aktywnych"
AND: Kliknięcie nawiguje do sekcji Kanban

### AC-3: Widget "Następne wydarzenie" (jeśli dostępne)
GIVEN: EPIC-0 dostarcza `GET /api/home/events?upcoming=1` lub dane z Supabase
WHEN: Jest zaplanowane wydarzenie w ciągu 7 dni
THEN: Widget "📅 Następne" pokazuje tytuł i datę (np. "Urodziny Zuzy — w środę")
AND: Gdy brak wydarzeń w ciągu 7 dni: widget pokazuje "Brak wydarzeń"

### AC-4: Sticky header na mobile
GIVEN: Angelika scrolluje stronę Home na telefonie
WHEN: Scrolluje poniżej widgetu Overview
THEN: Sticky header z mini-licznikami (🛒 3 | ✅ 6) pozostaje widoczny u góry ekranu
AND: Full overview znika poniżej linii sticky i jest dostępny po scroll na górę

### AC-5: Odświeżanie danych po akcji użytkownika
GIVEN: Angelika ma otwarte Home Overview z "🛒 3 do kupienia"
WHEN: Oznacza 1 produkt jako kupiony w Shopping List (bez reloadu strony)
THEN: Widget Shopping automatycznie aktualizuje się do "🛒 2 do kupienia" (reaktywność przez wspólny state lub event)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home` — sekcja na samej górze strony
Komponent: `HomeOverview`
Plik: `pages/home/components/HomeOverview.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| HomeOverview | Section | `shoppingCount`, `taskCount`, `nextEvent` | loading, filled |
| OverviewCard | Card | `icon`, `count`, `label`, `onClick` | loading (skeleton), filled |
| StickyMiniBar | Sticky div | `shoppingCount`, `taskCount` | hidden (top), visible (scrolled) |

### Layout Overview

```
┌──────────────────────────────────────┐
│  🛒 Zakupy        ✅ Zadania    📅 Wkrótce │
│  [  3  ]         [  6  ]      [ Śr ]  │
│ do kupienia     aktywnych    Urodziny  │
└──────────────────────────────────────┘
         ↕ tapnięcie → scroll do sekcji
```

Mobile: 3 karty w row (flex), każda ~33% szerokości
Desktop: 3 karty w grid cols-3, większe z opisem

### Dane i API

```typescript
// useHomeOverview hook:
// 1. GET /api/home/shopping → count items where bought=false
// 2. GET /api/home/kanban/columns → count cards where column_id != 'col-done'
// 3. GET /api/home/events?upcoming=1&limit=1 → next event (opcjonalne, graceful 404)
// Wszystkie 3 fetche równolegle (Promise.all)
// Loading: wszystkie muszą się załadować (lub timeout 3s → show partial)
```

### Stany widoku

**Loading:**
3 skeleton cards z animacją pulse — szary prostokąt zamiast liczby.

**Empty (wszystko = 0):**
Karty widoczne z `0` — "🛒 0 do kupienia", "✅ 0 aktywnych", "📅 Brak wydarzeń".
Komunikat pod kartami: "Wszystko ogarnięte! 🎉 Dodaj zakupy lub zadania."

**Error:**
Jeśli API failuje → karta pokazuje "—" zamiast liczby, mały tooltip "Błąd ładowania"
Reszta strony (Shopping List, Kanban) działa normalnie.

**Filled:**
Liczby z poprawnymi wartościami, widgety klikalny do nawigacji.

### Flow interakcji

```
1. HomePage mountuje → useHomeOverview wywołuje 3 API calls równolegle
2. Loading: 3 skeleton cards widoczne
3. Dane załadowane → karty wypełnione liczbami
4. Użytkownik tapie kartę "🛒 Zakupy" → smooth scroll do sekcji Shopping lub zmiana taba
5. Użytkownik scrolluje stronę → po przejściu 100px: StickyMiniBar pojawia się (CSS sticky + JS IntersectionObserver)
6. Użytkownik wraca na górę → StickyMiniBar znika (full Overview widoczny)
7. Po akcji (toggle bought) → useShoppingList invaliduje cache → useHomeOverview re-fetchuje count
   → count aktualizuje się bez reload (shared state lub refetch trigger)
```

### Responsive / Dostępność
- Mobile (375px+): 3 karty w row (flex-1 each), liczba jako duże cyfry (text-3xl), label jako small text; sticky mini bar: `position: sticky, top: 0, z-index: 10`
- Tablet (768px+): karty z więcej opisem, większy padding
- Desktop (1280px+): wide cards, może być 4 karta (quick action)
- Keyboard navigation: Tab przez karty, Enter aktywuje nawigację do sekcji
- ARIA: `role="region"`, `aria-label="Podsumowanie Home"`, `aria-live="polite"` na liczbach (aktualizują się)

---

## ⚠️ Edge Cases

### EC-1: API events nie istnieje (EPIC-0 nie gotowe)
Scenariusz: `GET /api/home/events` zwraca 404
Oczekiwane zachowanie: Widget "📅 Następne" pokazuje "Brak wydarzeń" — brak błędu w konsoli
Komunikat dla użytkownika: "📅 Brak wydarzeń"

### EC-2: Liczba zakupów = 0 (lista pusta)
Scenariusz: Wszystko kupione lub lista pusta
Oczekiwane zachowanie: Widget pokazuje "🛒 0 do kupienia" (nie chowa się)
Komunikat dla użytkownika: (liczba 0 widoczna)

---

## 🚫 Out of Scope tej Story
- Widget "Pogoda" — osobna story lub EPIC-1 Widgets
- Quick Action button w widgecie (np. dodaj bezpośrednio z overview) — FAB w STORY-4.8
- Home Analytics (wykresy) — osobna story lub EPIC-7
- Widget customizacja (drag & drop widgetów) — EPIC-6

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] 3 widgety (Zakupy, Zadania, Następne wydarzenie) wyświetlają poprawne wartości
- [ ] Sticky header działa na mobile po scroll
- [ ] Kliknięcie widgetu nawiguje do odpowiedniej sekcji
- [ ] Widget Events gracefully obsługuje 404 z API
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
