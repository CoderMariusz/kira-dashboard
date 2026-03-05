---
story_id: STORY-4.8
title: "Mobile responsive — Home dashboard na telefonie (Tailwind breakpoints)"
epic: EPIC-4
module: home
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-4.3, STORY-4.6]
blocks: []
tags: [mobile, responsive, tailwind, bottom-nav, fab, touch, pwa]
---

## 🎯 User Story

**Jako** Angelika używająca KiraBoard głównie na telefonie (iPhone lub Android, 375-430px)
**Chcę** mieć pełen dostęp do Home Dashboard przez mobile-friendly interfejs z bottom navigation, dużymi touch targetami i FAB
**Żeby** sprawnie zarządzać zakupami i zadaniami jedną ręką bez powiększania ekranu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Pliki layout: `pages/home/HomeLayout.tsx`, `pages/_shared/BottomNavigation.tsx`
Pliki komponentów: wszystkie komponenty Home muszą być responsive
Breakpoints Tailwind: `sm` (640px+), `md` (768px+), `lg` (1024px+)
Target mobile: 375px (iPhone SE) i 430px (iPhone Pro Max)

### Powiązane pliki
- `pages/home/HomeLayout.tsx` — główny layout Home Dashboard
- `pages/_shared/BottomNavigation.tsx` — dolna nawigacja (nowy komponent)
- `pages/_shared/FAB.tsx` — Floating Action Button (nowy komponent)
- `pages/home/components/ShoppingList.tsx` — musi być responsive (STORY-4.3)
- `pages/home/components/TaskBoard.tsx` — musi być responsive (STORY-4.6)
- `tailwind.config.js` — sprawdzenie konfiguracji breakpoints

### Stan systemu przed tą story
- STORY-4.3: ShoppingList.tsx istnieje
- STORY-4.6: TaskBoard.tsx istnieje z dnd-kit
- Sidebar (desktop) istnieje w `_shared/Sidebar.tsx`
- Tailwind skonfigurowane

---

## ✅ Acceptance Criteria

### AC-1: Bottom navigation na mobile (< 768px)
GIVEN: Angelika otwiera KiraBoard na telefonie (viewport < 768px)
WHEN: Strona jest załadowana
THEN: Dolna nawigacja jest widoczna: 4 ikony — 🏠 Dom, 🛒 Zakupy, ✅ Zadania, 👤 Profil
AND: Desktop sidebar (lewy) jest ukryty na mobile (`hidden md:flex` lub `hidden md:block`)
AND: Aktywna sekcja jest wyróżniona w bottom nav (kolor primary + label pod ikoną)

### AC-2: FAB (Floating Action Button) na mobile
GIVEN: Angelika jest na Home Dashboard na telefonie
WHEN: Tapie "➕" button (floating, prawy dolny róg, ponad bottom nav)
THEN: Pojawia się menu z 2 opcjami: "🛒 Dodaj zakup" i "✅ Dodaj zadanie"
AND: "Dodaj zakup" otwiera AddShoppingItemForm jako bottom sheet
AND: "Dodaj zadanie" otwiera CardQuickAdd lub CardForm dla domyślnej kolumny "To Do"
AND: FAB NIE jest widoczny na desktopie (hidden na md+)

### AC-3: Touch targety minimum 44x44px
GIVEN: Angelika używa palcem (touch) zamiast myszki
WHEN: Przeglądam wszystkie interaktywne elementy w Shopping List i Kanban na mobile
THEN: Każdy przycisk, checkbox, chip filtra, element listy ma co najmniej 44x44px obszar dotyku
AND: Ikony kosza/edycji mają padding zapewniający min 44px touch zone

### AC-4: Shopping List na mobile — pełna szerokość, wiersze z kategoriami
GIVEN: Shopping List jest otwarta na telefonie 375px
WHEN: Angelika przegląda listę
THEN: Lista zajmuje pełną szerokość ekranu bez horizontal scroll
AND: Nagłówki kategorii (emoji + nazwa) są czytelne
AND: Każdy wiersz produktu (name + quantity + checkbox) ma min 48px wysokości
AND: Przycisk "Dodaj" u góry lub FAB dostępny

### AC-5: Kanban na mobile — single-column view lub horizontal scroll
GIVEN: Kanban Task Board jest otwarty na telefonie 375px
WHEN: Angelika patrzy na board
THEN: Widzi 1 kolumnę w pełnej szerokości z możliwością przełączenia (tabs/swipe) między kolumnami
LUB: Widzi horizontal scroll między kolumnami (snap scrolling) z wizualnym wskaźnikiem
AND: Drag & drop działa (long-press 300ms) lub dostępny jest tap-to-move jako alternatywa

### AC-6: Nawigacja klawiaturowa nie psuje mobile layoutu
GIVEN: Angelika używa wirtualnej klawiatury na telefonie (formularz dodawania)
WHEN: Klawiatura wysunie się z dołu ekranu
THEN: Bottom navigation schodzi za klawiaturą lub jest ukryta (nie blokuje formularza)
AND: Pole tekstowe jest widoczne ponad klawiaturą (viewport-fit: cover, scroll-into-view)

### AC-7: Layout desktopowy pozostaje niezmieniony
GIVEN: Mariusz używa KiraBoard na desktopie (1280px)
WHEN: Otwiera Home Dashboard
THEN: Sidebar lewy jest widoczny, bottom navigation NIE jest widoczna
AND: FAB NIE jest widoczny (przyciski dodawania są w samych komponentach)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home`
Komponent: `HomeLayout` + `BottomNavigation` + `FAB`
Pliki: `pages/home/HomeLayout.tsx`, `pages/_shared/BottomNavigation.tsx`, `pages/_shared/FAB.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| BottomNavigation | Nav | `activeTab`, `onTabChange` | hidden (md+), visible (mobile) |
| FAB | Button | `onShopping`, `onTask` | collapsed, expanded (menu open) |
| HomeLayout | Layout wrapper | `children` | mobile layout, desktop layout |

### Tailwind Breakpoints Strategy

```
Mobile first — base styles dla 375px:
- Sidebar: `hidden md:flex` (ukryty < 768px)
- BottomNavigation: `flex md:hidden` (widoczny < 768px)
- FAB: `fixed md:hidden` (widoczny < 768px)
- Shopping items: `flex-col w-full` (pełna szerokość)
- Kanban columns: `flex-row overflow-x-auto snap-x` (horizontal scroll)
  lub `flex-col` z tabs (alternatywa)
- Touch targets: `min-h-[44px] min-w-[44px]` na każdym przycisku
- Padding dla safe area iOS: `pb-safe` lub `padding-bottom: env(safe-area-inset-bottom)`
```

### Bottom Navigation Tabs

```typescript
const TABS = [
  { id: 'home',     icon: '🏠', label: 'Dom',     href: '/home' },
  { id: 'shopping', icon: '🛒', label: 'Zakupy',  href: '/home?tab=shopping' },
  { id: 'tasks',    icon: '✅', label: 'Zadania', href: '/home?tab=tasks' },
  { id: 'profile',  icon: '👤', label: 'Profil',  href: '/profile' },
];
// Active state: tab odpowiadający aktualnemu ?tab= query param lub pathowi
```

### FAB Menu (Speed Dial)

```
➕ button (56x56px, shadow-lg, rounded-full, bg-primary)
  → onClick → expand menu:
    ├── "🛒 Dodaj zakup" (button + label, slide-up animation)
    └── "✅ Dodaj zadanie" (button + label, slide-up animation)
Klik poza menu → zamknij (backdrop)
Position: fixed, bottom: 80px (ponad bottom nav), right: 16px
```

### Stany widoku

**Mobile loading:**
Bottom nav widoczna od razu (static), treść główna z skeleton.

**Mobile filled:**
Home Overview na górze → Shopping List → Kanban (jako tabs lub horizontal scroll) → Activity Feed.

**Desktop:**
Sidebar + główna treść w grid. Bottom nav, FAB ukryte.

### Flow interakcji

```
Mobile — Dodawanie zakupu:
1. Angelika tapie FAB "➕"
2. Menu wysuwa się (2 opcje)
3. Tapie "🛒 Dodaj zakup"
4. AddShoppingItemForm wysuwa się od dołu (bottom sheet, 50vh)
5. Angelika wpisuje "Mleko", wybiera kategorię "Nabiał"
6. Tapie "Dodaj" → formularz zamknięty → item na liście
Całość: ≤ 3 tapy ✓ (FAB → Zakup → Dodaj)

Mobile — Nawigacja:
1. Bottom nav aktywna tab = bieżący widok
2. Tap na "✅ Zadania" → sekcja Kanban w view
3. Tap na "👤 Profil" → /profile
```

### Responsive / Dostępność
- Mobile (375px+): single column layout, bottom nav, FAB, horizontal scroll dla Kanban, bottom sheets zamiast modali
- Tablet (768px+): 2-kolumnowy layout (Shopping | Kanban), sidebar pojawia się, bottom nav znika
- Desktop (1280px+): pełny grid z sidebar + 3 sekcje widoczne jednocześnie
- Keyboard navigation: Tab przez bottom nav ikony, Enter/Space aktywuje tab
- ARIA: `role="navigation"` na bottom nav, `aria-label="Nawigacja mobilna"`, `aria-current="page"` na aktywnym tabie

---

## ⚠️ Edge Cases

### EC-1: iPhone z notchem i safe area (iOS)
Scenariusz: iPhone 14/15 Pro z dynamic island — bottom nav nachodzi na home indicator
Oczekiwane zachowanie: `padding-bottom: env(safe-area-inset-bottom)` zastosowane na bottom nav → min 20px bottom padding na iOS
Komunikat dla użytkownika: (brak — kwestia CSS)

### EC-2: Klawiatura systemowa zasłania formularz na Android
Scenariusz: Angelika tapie pole "Dodaj zakup" na Android, klawiatura wysuwa się i zasłania input
Oczekiwane zachowanie: `scrollIntoView({ behavior: 'smooth', block: 'center' })` wywoływane na focus inputu → pole widoczne
Komunikat dla użytkownika: (brak — auto-scroll)

### EC-3: Landscape orientation na małym telefonie
Scenariusz: Telefon obrócony poziomo (667px × 375px)
Oczekiwane zachowanie: Layout dostosowuje się — bottom nav może być cieńsza (32px), Shopping List i Kanban w układzie 2-kolumn
Komunikat dla użytkownika: (brak)

---

## 🚫 Out of Scope tej Story
- PWA instalacja (Add to Home Screen) — EPIC-11 CI/CD
- Push notifications — poza scope
- Offline PWA cache service worker — EPIC-0/11
- Gesture navigation (swipe left/right między tabami) — nice-to-have, nie MVP

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Bottom navigation widoczna TYLKO na mobile (< 768px), sidebar TYLKO na desktop (768px+)
- [ ] FAB widoczny TYLKO na mobile, poprawnie otwiera ShoppingForm i TaskForm
- [ ] Wszystkie touch targety min 44x44px (sprawdzone Chrome DevTools mobile)
- [ ] Shopping List: brak horizontal scroll na 375px
- [ ] Kanban: dostępny na mobile (horizontal scroll lub tab-based columns)
- [ ] iOS safe area: bottom nav ma odpowiedni padding (test na simulatorze lub Safari DevTools)
- [ ] Desktop layout nienaruszona przez zmiany mobile
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
