---
story_id: STORY-4.3
title: "Shopping list UI — items, add/bought/delete, categories"
epic: EPIC-4
module: home
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-4.2, STORY-3.3]
blocks: [STORY-4.8]
tags: [react, shopping, ui, tailwind, mobile-first, offline]
---

## 🎯 User Story

**Jako** Angelika (home_plus) lub Zuza (home) zalogowana na telefonie
**Chcę** widzieć listę zakupów z podziałem na kategorie, móc dodawać produkty jednym tapem i oznaczać je jako kupione
**Żeby** sprawnie zrobić zakupy bez pomyłek i bez potrzeby pamiętania co kupić

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/home` (sekcja Shopping List na Home Dashboard)
Komponent: `pages/home/components/ShoppingList.tsx`
Hooks: `pages/home/hooks/useShoppingList.ts`
Plik styli: Tailwind inline classes

### Powiązane pliki
- `pages/home/components/ShoppingList.tsx` — główny komponent
- `pages/home/hooks/useShoppingList.ts` — logika fetch/mutate + offline cache
- `pages/home/components/AddShoppingItemForm.tsx` — formularz dodawania
- `_shared/lib/home-api.ts` — API client (z STORY-4.4 wiring)

### Stan systemu przed tą story
- STORY-4.2: API `/api/home/shopping` CRUD działa
- STORY-3.3: `useAuth` hook dostępny, JWT w cookie/localStorage
- Tailwind + shadcn/ui skonfigurowane

---

## ✅ Acceptance Criteria

### AC-1: Lista produktów pogrupowana po kategoriach
GIVEN: W bazie są produkty z różnymi kategoriami (`nabiał`, `warzywa`, `inne`)
WHEN: Angelika otwiera sekcję Shopping List na Home
THEN: Widzi produkty pogrupowane w sekcje z emoji i nazwą kategorii (np. "🥛 Nabiał", "🥬 Warzywa")
AND: Niekupione produkty są wyświetlane przed kupionymi
AND: Kupione produkty są wyszarzone ze strikethrough na nazwie

### AC-2: Dodanie nowego produktu przez formularz
GIVEN: Angelika jest na ekranie Shopping List
WHEN: Tapie przycisk "➕ Dodaj" (floating lub u dołu listy) i wpisuje "Mleko", wybiera kategorię "Nabiał", tapie "Dodaj"
THEN: Produkt "Mleko" pojawia się na liście natychmiast (optimistic update)
AND: API `POST /api/home/shopping` zostaje wywołane w tle
AND: W przypadku błędu API — produkt znika z listy i pojawia się toast "Błąd dodania produktu"

### AC-3: Oznaczenie produktu jako kupiony (toggle bought)
GIVEN: Angelika widzi na liście "Mleko" (niekupione)
WHEN: Tapie checkbox lub kafelek obok "Mleko"
THEN: "Mleko" natychmiast zostaje przeniesione do sekcji "Kupione" z przekreślonym tekstem (optimistic update)
AND: API `PATCH /api/home/shopping/:id` z `{ bought: true }` zostaje wywołane
AND: Można odwrócić: tapnięcie kupionego produktu przywraca go do aktywnych

### AC-4: Usunięcie produktu (tylko home_plus/admin)
GIVEN: Angelika (home_plus) tapie ikonę kosza obok produktu
WHEN: Produkt zostaje usunięty po potwierdzeniu lub bez (swipe-to-delete)
THEN: API `DELETE /api/home/shopping/:id` zostaje wywołane
AND: Produkt znika z listy
AND: Zuza (home) NIE widzi ikony kosza — może tylko toggle bought

### AC-5: Filtrowanie po kategorii
GIVEN: Lista zawiera produkty z kilku kategorii
WHEN: Angelika tapie chip "🥛 Nabiał" u góry listy
THEN: Lista pokazuje tylko produkty z kategorii `nabiał`
AND: Tapnięcie "Wszystkie" przywraca pełną listę

### AC-6: Stan pusty
GIVEN: Lista zakupów jest pusta (brak itemów w bazie)
WHEN: Angelika otwiera Shopping List
THEN: Widzi komunikat "Lista zakupów jest pusta 🛒" i przycisk "Dodaj pierwszy produkt"

### AC-7: Stan offline (localStorage cache)
GIVEN: Angelika nie ma połączenia z internetem
WHEN: Otwiera Shopping List
THEN: Widzi ostatnią zapisaną listę z localStorage (cache)
AND: Widzi baner "Tryb offline — zmiany będą zsynchronizowane po powrocie sieci"
AND: Dodane offline produkty są kolejkowane i wysyłane gdy sieć wróci

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home` (tab/sekcja Shopping)
Komponent: `ShoppingList`
Plik: `pages/home/components/ShoppingList.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| ShoppingList | Page section | `userId`, `userRole` | loading, empty, error, filled |
| ShoppingItem | List item | `item`, `onToggle`, `onDelete`, `canDelete` | default, bought, deleting |
| CategoryGroup | Group wrapper | `category`, `items`, `emoji` | collapsed, expanded |
| AddShoppingItemForm | Form | `onAdd`, `isLoading` | idle, submitting, error |
| CategoryFilterChips | Filter bar | `selected`, `onChange` | none selected, one selected |

### Pola formularza

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| name | text | min 1, max 255 znaków | "Wpisz nazwę produktu" | tak |
| quantity | number | > 0, max 999 | "Podaj prawidłową ilość" | nie (default: 1) |
| unit | select | szt, kg, l, g, opak | — | nie |
| category | select | z enumy kategorii | "Wybierz kategorię" | nie (default: inne) |

### Stany widoku

**Loading:**
Skeleton list — 3-5 szarych prostokątów (placeholder items) z animacją pulse. Przycisk "Dodaj" zablokowany.

**Empty (brak danych):**
Ilustracja koszyka + tekst "Lista zakupów jest pusta 🛒" + przycisk "Dodaj pierwszy produkt" (otwiera formularz).

**Error (błąd serwera/sieci):**
Banner ostrzegawczy u góry: "Nie udało się załadować listy zakupów. Spróbuj ponownie." + przycisk "Odśwież". Ostatni cache z localStorage wyświetlany jeśli dostępny.

**Filled (normalny stan):**
Sekcje kategorii z ikonami emoji. W każdej sekcji lista itemów z checkbox/toggle. Wyszarzone kupione poniżej aktywnych. Filter chips u góry. Floating "➕ Dodaj" button na mobile.

### Flow interakcji

```
1. Użytkownik wchodzi na /home (sekcja Shopping) → hook useShoppingList wywołuje GET /api/home/shopping
2. Loading: skeleton list widoczny przez max 300ms
3. Dane załadowane → lista wyrenderowana, cache zapisany w localStorage
4. Użytkownik tapie "➕ Dodaj" → forma wysuwa się od dołu (slide-up sheet na mobile)
5. Wypełnia formularz → tapie "Dodaj"
6. Optimistic update: item natychmiast na liście z `opacity-50` (pending)
7. API POST sukces: item zaktualizowany (opacity-100), cache zaktualizowany
8. API POST błąd: item usunięty z listy, toast "Błąd: produkt nie został dodany"
9. Użytkownik tapie checkbox/item → toggle bought (optimistic + API PATCH)
10. Użytkownik (home_plus) tapie kosz → confirm dialog lub swipe → API DELETE
```

### Responsive / Dostępność
- Mobile (375px+): lista full-width, itemy jako duże wiersze (min 48px touch target), floating ➕ button prawym dolnym rogu, formularz jako bottom sheet (slide-up)
- Tablet (768px+): layout z sidebar lub dwukolumnowy — zakupy po lewej, kupione po prawej
- Desktop (1280px+): kolumna Shopping w grid Home Dashboard
- Keyboard navigation: Tab przez listę, Space toggleuje bought, Delete usuwa (z potwierdzeniem)
- ARIA: `aria-checked` na toggle, `aria-label="Usuń {name}"` na przycisku kosza, `role="list"` na liście

---

## ⚠️ Edge Cases

### EC-1: Produkt dodany przez innego użytkownika w trakcie sesji
Scenariusz: Mariusz dodał "Chleb" na swoim laptopie podczas gdy Angelika ma otwartą listę
Oczekiwane zachowanie: Po 30s lub przy następnym otwarciu (polling lub refetch on focus) lista się odświeży i "Chleb" pojawi się
Komunikat dla użytkownika: (brak — cicha aktualizacja)

### EC-2: Przywrócenie sieci po trybie offline
Scenariusz: Angelika dodała "Ser" offline, sieć wróciła
Oczekiwane zachowanie: Kolejka offline itemów zostaje wysłana automatycznie, baner "offline" znika, lista odświeżona
Komunikat dla użytkownika: Toast "Lista zsynchronizowana ✓"

### EC-3: Bardzo długa nazwa produktu
Scenariusz: Wpisanie 300-znakowej nazwy w formularzu
Oczekiwane zachowanie: Walidacja blokuje submit, komunikat "Nazwa za długa (max 255 znaków)"

---

## 🚫 Out of Scope tej Story
- Auto-suggest top 5 z `kb_shopping_history` — EPIC-0 feature, osobna story
- Swipe-to-delete gesture — można dodać jako enhancement, nie wymagane MVP
- Udostępnianie listy zewnętrznie (share link) — poza scope
- Barcode scanner — poza scope

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Walidacja formularza działa przed submitem
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Optimistic updates działają dla toggle bought i dodawania
- [ ] Offline cache: lista wyświetla się bez sieci z ostatnich danych
- [ ] Rola `home` nie widzi przycisku Delete
- [ ] Story review przez PO
