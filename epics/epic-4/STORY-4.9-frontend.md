---
story_id: STORY-4.9
title: "Home Overview — landing page /home z powitaniem, stat cards, quick actions, mini-shopping i mini-kanban"
epic: EPIC-4
module: home
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: epics/kira-home-dashboard-mockup.html → tab "🏠 Overview" (pane-overview); epics/kira-home-dashboard-mobile-mockup.html → tab "tab-home"
api_reference: useShoppingList, useTasks, useActivity, useHousehold (hooki z STORY-4.3)
priority: must
estimated_effort: 8 h
depends_on: STORY-4.1, STORY-4.2, STORY-4.3
blocks: none
tags: [home-overview, landing, stat-cards, quick-actions, mini-kanban, mini-shopping, activity]
---

## 🎯 User Story

**Jako** zalogowany użytkownik (HELPER, HELPER_PLUS lub ADMIN) w widoku Home
**Chcę** widzieć stronę `/home` z powitaniem, skrótami statystyk, szybkimi akcjami i podglądem listy zakupów, tablicy kanban i aktywności
**Żeby** w jednym miejscu zorientować się co się dzieje w rodzinie i szybko przejść do odpowiedniej sekcji bez szukania w menu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/home` (plik: `src/app/(home)/page.tsx`)
- Jest to strona domyślna po zalogowaniu dla wszystkich ról (HELPER, HELPER_PLUS, ADMIN)
- NIE ma role guard — widoczna dla wszystkich zalogowanych
- Mockup desktop: `epics/kira-home-dashboard-mockup.html` → sekcja `<div class="tab-pane active" id="pane-overview">`
- Mockup mobile: `epics/kira-home-dashboard-mobile-mockup.html` → sekcja `<div class="tab-pane active" id="tab-home">`

### Powiązane pliki
- `archive/src/lib/hooks/useHousehold.ts` → zmigrowany hook `useHousehold` (z STORY-4.3)
- `archive/src/lib/hooks/useShopping.ts` → zmigrowany hook `useShoppingList` (z STORY-4.3)
- `archive/src/lib/hooks/useTasks.ts` → zmigrowany hook `useTasks` (z STORY-4.3)
- `archive/src/lib/hooks/useActivity.ts` → zmigrowany hook `useActivity` (z STORY-4.3)
- Komponenty nowe (tworzone w tej story, NIE migrowane z archive): `GreetingBanner`, `StatCards`, `QuickActions`, `MiniShoppingList`, `MiniKanban`, `RecentActivity`

### Stan systemu przed tą story
- STORY-4.1 ukończona: tabele `shopping_items`, `tasks`, `columns`, `activity_log`, `households`, `household_members` istnieją
- STORY-4.2 ukończona: API endpointy działają
- STORY-4.3 ukończona: hooki `useShoppingList`, `useTasks`, `useActivity`, `useHousehold` działają i zwracają typed data
- Routing `/home` istnieje — layout `(home)` z boczną nawigacją
- Sesja użytkownika dostępna przez `useSession()` lub server-side `getServerSession()` — imię użytkownika pobrane z profilu

### Kluczowe kolory mockupu (do implementacji)
- Body background: `#13111c`
- Card/panel background: `#1a1730`
- Border: `#2a2540`
- Tekst główny: `#e6edf3`
- Tekst drugorzędny (subtext): `#4b4569`
- Tekst muted (etykiety): `#6b7280`
- Akcent purple: `#c4b5fd` (linki, active nav, badge text)
- Gradient powitania: `linear-gradient(135deg, #2d1b4a 0%, #1a2744 60%, #1a1a2e 100%)`
- Gradient avatar/GB-icon: `linear-gradient(135deg, #ec4899, #f97316)`
- Gradient primary button (Quick Actions): `linear-gradient(135deg, #7c3aed, #3b82f6)`
- Trend up (zielony): `#4ade80`
- Trend down (czerwony): `#f87171`
- Trend pink: `#f9a8d4`
- Checkbox filled gradient: `linear-gradient(135deg, #7c3aed, #3b82f6)`

---

## ✅ Acceptance Criteria

### AC-1: Greeting Banner wyświetla powitanie z imieniem i datą po polsku
GIVEN: Zalogowany użytkownik Angelika (display_name: "Angelika") jest na stronie `/home`
AND: Aktualny dzień to środa, 19 lutego 2026
WHEN: Strona jest załadowana i dane profilu są dostępne
THEN: W górnej części strony widoczny jest banner z:
- Ikona (lewa): 👋 emoji w zaokrąglonym kwadracie (48×48px, gradient `#ec4899→#f97316`, border-radius: 12px)
- Tekst tytułu: "Cześć Angelika! 👋" (gradient tekst: `linear-gradient(135deg, #f9a8d4, #fed7aa)`, font-size: 20px, font-weight: 800)
- Subtext pod tytułem: dynamiczny — "Masz {N} zadań na dziś i {M} produktów do kupienia." (color: `#6b7280`, font-size: 12px)
- Prawa strona: data po polsku
  - Linia 1: "Środa, 19 lut" (font-size: 15px, font-weight: 700, color: `#e6edf3`)
  - Linia 2: "2026 · tydzień {nr_tygodnia}" (font-size: 11px, color: `#4b4569`)
AND: Banner ma background `linear-gradient(135deg, #2d1b4a 0%, #1a2744 60%, #1a1a2e 100%)`, border: `1px solid #4b3d7a`, border-radius: 12px, padding: 18px 22px

### AC-2: Data po polsku — dokładna implementacja
GIVEN: Aktualny timestamp to dowolna data
WHEN: GreetingBanner jest renderowany
THEN: Data jest wyświetlana po polsku (BEZ zewnętrznej biblioteki locale — użyj własnego mapowania):
```
Polska nazwy dni (pełne, dopełniacz): Poniedziałek, Wtorek, Środa, Czwartek, Piątek, Sobota, Niedziela
Polska nazwy miesięcy (skrócone, 3 litery): sty, lut, mar, kwi, maj, cze, lip, sie, wrz, paź, lis, gru
```
Przykłady:
- `new Date('2026-02-19')` → "Czwartek, 19 lut"
- `new Date('2026-01-01')` → "Czwartek, 01 sty"
- `new Date('2026-12-25')` → "Piątek, 25 gru"
AND: Numer tygodnia obliczony przez ISO week standard (getISOWeek lub własna implementacja)

### AC-3: 4 stat cards wyświetlają poprawne dane w układzie 4 kolumn (desktop) / 2×2 (mobile)
GIVEN: Dane z hooków są dostępne:
- `useTasks()` zwraca tasks dla bieżącego dnia (due_date = today) → 3 taski
- `useShoppingList()` zwraca 12 itemów z `is_bought=false`
- `useActivity()` zwraca 5 eventów za dziś
- `useHousehold()` zwraca household z 4 members
WHEN: Strona jest załadowana
THEN: Widoczne są 4 karty (`display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px`):

**Karta 1 — Zadania dziś:**
- Etykieta: "✅ ZADANIA DZIŚ" (font-size: 10px, color: `#4b4569`, uppercase, letter-spacing)
- Wartość: "3" (font-size: 26px, font-weight: 800, color: `#e6edf3`)
- Subtext: "2 nierozpoczęte · 1 w trakcie" (dynamiczny na podstawie column.name)
- Trend: "↑ +1 od wczoraj" (color: `#4ade80`) — jeśli brak danych wczorajszych: trend nie wyświetlany

**Karta 2 — Do kupienia:**
- Etykieta: "🛒 DO KUPIENIA"
- Wartość: "12"
- Subtext: "w {K} kategoriach" (liczba unikalnych kategorii)
- Trend: opcjonalny

**Karta 3 — Aktywność dziś:**
- Etykieta: "📡 AKTYWNOŚĆ DZIŚ"
- Wartość: "5"
- Subtext: "zdarzeń w tym dniu"
- Trend: "🔥 aktywny dzień" (color: `#f9a8d4`) jeśli > 3, lub "— brak aktywności" (color: `#4b4569`) jeśli 0

**Karta 4 — Rodzina:**
- Etykieta: "👥 CZŁONKOWIE RODZINY"
- Wartość: "4"
- Subtext: lista imion memberów (skrócona, max 3 imiona + "...")
- Trend: "wszyscy w rodzinie" (color: `#4b4569`) lub brak

AND: Każda karta ma background `#1a1730`, border `1px solid #2a2540`, border-radius: 10px, padding: 14px 16px
AND: Na hover: `border-color: #4b3d7a`, `transform: translateY(-1px)` (CSS transition 0.15s)

### AC-4: Quick Actions — 3 przyciski nawigacji i akcji
GIVEN: Użytkownik jest zalogowany na stronie `/home`
WHEN: Strona jest załadowana
THEN: Sekcja Quick Actions wyświetla 3 przyciski:

**Przycisk 1 — "➕ Dodaj zadanie" (primary):**
- Styl: `background: linear-gradient(135deg, #7c3aed, #3b82f6)`, kolor tekstu `#fff`, box-shadow: `0 2px 10px rgba(124,58,237,.3)`
- Akcja po kliknięciu: nawiguje do `/home/tasks` (lub otwiera modal "Dodaj zadanie" jeśli modal istnieje w STORY-4.5)

**Przycisk 2 — "🛒 Dodaj zakup" (secondary):**
- Styl: `background: #2a2540`, border: `1px solid #3b3d7a`, kolor tekstu `#e6edf3`
- Akcja po kliknięciu: nawiguje do `/home/shopping` (lub otwiera modal "Dodaj produkt")

**Przycisk 3 — "👥 Zaproś osobę" (secondary):**
- Styl: jak przycisk 2
- Akcja po kliknięciu: nawiguje do `/home/household` (route z STORY-4.7)
- Jeśli zalogowany user ma rolę `HELPER` (nie może zapraszać): przycisk jest hidden (nie renderowany) — sprawdź rolę przed renderowaniem

AND: Sekcja Quick Actions jest opakowana w card (`bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-4`)
AND: Przyciski w flex-row z `gap: 8px`, zawijają się na mobile (`flex-wrap: wrap`)

### AC-5: Mini Shopping List wyświetla pierwsze 5 niekupionych produktów z checkboxami
GIVEN: `useShoppingList()` zwraca 12 itemów z `is_bought=false` + 3 z `is_bought=true`
WHEN: Strona `/home` jest załadowana
THEN: W sekcji "🛒 Lista zakupów" widoczne jest dokładnie 5 pierwszych itemów (sortowane po `created_at ASC` lub `position ASC` — produkty dodane jako pierwsze), każdy jako wiersz z:
- Checkbox (16×16px): pusty kwadrat z border `1.5px solid #3b3d7a`, border-radius 4px
- Nazwa produktu (font-size: 12px, color: `#e6edf3`)
- Tag kategorii (font-size: 9px, color: `#4b4569`, bg: `#13111c`, padding: 2px 6px, border-radius: 5px)
AND: Link "Pokaż wszystkie →" (font-size: 11px, color: `#c4b5fd`) w nagłówku karty — kliknięcie nawiguje do `/home/shopping`
AND: Produkty z `is_bought=true` NIE są wyświetlane (filtr: `is_bought = false`)

### AC-6: Checkbox w Mini Shopping List działa (optimistic toggle)
GIVEN: Widoczny jest item "Mleko 3.2%" w Mini Shopping List
WHEN: Użytkownik klika checkbox przy "Mleko 3.2%"
THEN: Checkbox natychmiast zmienia wygląd na zaznaczony (optimistic update): tło `linear-gradient(135deg, #7c3aed, #3b82f6)`, border transparent, checkmark "✓" (kolor `#fff`, font-size: 10px)
AND: System wysyła `PATCH /api/home/shopping/{item_id}` z body `{ "is_bought": true }`
AND: Po sukcesie API: lista odświeżona — "Mleko 3.2%" znika z Mini Shopping List (gdyż jest teraz `is_bought=true`)
AND: Po błędzie API: optimistic update jest cofany — checkbox wraca do stanu pustego + toast error: "Nie udało się oznaczyć produktu"

### AC-7: Mini Kanban Preview wyświetla 3 kolumny z max 2 kartami (read-only)
GIVEN: `useTasks()` zwraca tasks posortowane per kolumna:
- "Do zrobienia": 5 tasków (pokazuj pierwsze 2)
- "W trakcie": 3 taski (pokazuj pierwsze 2)
- "Gotowe": 7 tasków (pokazuj pierwsze 2)
WHEN: Strona `/home` jest załadowana
THEN: W sekcji "📋 Zadania — podgląd" widoczna jest mini-kanban siatka z 3 kolumnami:

**Kolumna 1 — "Do zrobienia":**
- Nagłówek: szara kropka (6×6px, `#6b7280`) + tekst "DO ZROBIENIA" (10px, uppercase)
- Dwa pierwsze taski jako karty

**Kolumna 2 — "W trakcie":**
- Nagłówek: pomarańczowa kropka (`#f97316`) + "W TRAKCIE"

**Kolumna 3 — "Gotowe":**
- Nagłówek: zielona kropka (`#4ade80`) + "GOTOWE"

AND: Każda mini-karta task zawiera:
- Tytuł zadania (font-size: 11px, color: `#e6edf3`, max 2 linie, overflow hidden)
- Priorytet emoji: 🔴 HIGH, 🟡 MEDIUM, 🟢 LOW (font-size: 9px)
- Avatar assignee (16×16px, inicjały, gradient kolor deterministyczny)
AND: Mini Kanban jest **read-only** — brak drag & drop, brak przycisków edycji, brak klikalnych kart (lub klik nawiguje do `/home/tasks`)
AND: Link "Otwórz tablicę →" w nagłówku sekcji — nawiguje do `/home/tasks`
AND: Jeśli kolumna ma 0 tasków — widoczny tekst "Brak zadań" (color: `#4b4569`, font-size: 10px)

### AC-8: Recent Activity wyświetla 4 ostatnie eventy z timeline
GIVEN: `useActivity()` zwraca ostatnie 20 eventów (posortowane `created_at DESC`)
WHEN: Strona `/home` jest załadowana
THEN: W sekcji "📡 Ostatnia aktywność" widoczne są dokładnie 4 pierwsze (najnowsze) eventy, każdy jako wiersz z:
- Avatar aktora (22×22px, inicjały lub emoji ikona, gradient kolor): dla shopping=`#1a3a1a→green dot`, tasks=`#1a2744→blue dot`, household=`#3a2a00→yellow dot`
- Pionowa linia łącząca elementy (width: 1px, bg: `#2a2540`); ostatni element bez linii
- Tekst eventu: "{imię} {akcja} '{nazwa}'" — format: `<strong>Angelika</strong> dodała "Mleko" do listy`
- Tag kategori: "zakupy" (bg: `#1a3a1a`, color: `#4ade80`) / "zadanie" (bg: `#1a2744`, color: `#60a5fa`) / "household" (bg: `#3a2a00`, color: `#fbbf24`)
- Timestamp relatywny: "10 min temu", "1h temu", "3h temu" (color: `#4b4569`, font-size: 10px)
AND: Link "Pełny feed →" (color: `#c4b5fd`) nawiguje do `/home/activity`
AND: Jeśli brak aktywności — tekst "Brak aktywności w tym dniu" (color: `#4b4569`)

### AC-9: Loading states — skeleton dla każdej sekcji
GIVEN: Dowolny hook (useShoppingList, useTasks, useActivity, useHousehold) jest w stanie `isLoading: true`
WHEN: Strona się ładuje (zwykle ~200–800ms przy pierwszym wejściu)
THEN: Każda sekcja pokazuje własny skeleton:
- Greeting Banner: nie skeleton — wyświetla dane z sesji (imię) bez czekania na API; data obliczona lokalnie (new Date()) — oba dostępne natychmiast
- StatCards: 4 prostokąty `h-[88px] animate-pulse bg-[#2a2540] rounded-[10px]` w siatce
- MiniShoppingList: 5 wierszy skeleton `h-8 bg-[#2a2540] animate-pulse rounded`
- MiniKanban: 3 kolumny z 2 skeleton kartami każda
- RecentActivity: 4 wiersze skeleton `h-12 bg-[#2a2540] animate-pulse rounded`
AND: Quick Actions NIE ma skeleton — renderuje się natychmiast (nie zależy od API)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home`
Komponent główny: `src/app/(home)/page.tsx` (Server Component) + `src/components/home/overview/HomeOverview.tsx` (Client Component)
Podkomponenty (nowe, nie migrowane):
- `src/components/home/overview/GreetingBanner.tsx`
- `src/components/home/overview/StatCards.tsx`
- `src/components/home/overview/QuickActions.tsx`
- `src/components/home/overview/MiniShoppingList.tsx`
- `src/components/home/overview/MiniKanban.tsx`
- `src/components/home/overview/RecentActivity.tsx`

### Narzędzia i biblioteki
- Hooki: `useShoppingList`, `useTasks`, `useActivity`, `useHousehold` (z STORY-4.3, dostępne w `src/lib/hooks/home/`)
- Routing: `next/navigation` → `useRouter()` dla Quick Actions
- Data/czas: `new Date()` + własne mapowania polskie (NIE `date-fns/locale/pl` jeśli nie jest w projekcie)
- Optimistic updates: React Query `useMutation` z `onMutate` callback dla checkboxa

### Polska lokalizacja daty — implementacja

```typescript
// src/lib/utils/datePolish.ts

const DAYS_PL = [
  'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa',
  'Czwartek', 'Piątek', 'Sobota'
];

const MONTHS_SHORT_PL = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'
];

export function formatPolishDate(date: Date): { dayLine: string; yearLine: string } {
  const dayName = DAYS_PL[date.getDay()];         // "Czwartek"
  const day = String(date.getDate()).padStart(2, '0');    // "19"
  const month = MONTHS_SHORT_PL[date.getMonth()]; // "lut"
  const year = date.getFullYear();                 // 2026
  const week = getISOWeek(date);                   // 8

  return {
    dayLine: `${dayName}, ${day} ${month}`,        // "Czwartek, 19 lut"
    yearLine: `${year} · tydzień ${week}`,         // "2026 · tydzień 8"
  };
}

// ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
}
```

### Relatywny czas aktywności — implementacja

```typescript
// src/lib/utils/timeAgo.ts
export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'przed chwilą';
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours}h temu`;
  if (diffDays === 1) return 'wczoraj';
  return `${diffDays} dni temu`;
}
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `GreetingBanner` | Prezentacyjny | `userName: string`, `tasksToday: number`, `shoppingCount: number` | filled (brak loading — dane z sesji + Date()) |
| `StatCards` | Grid kart | `tasks`, `shopping`, `activityCount`, `members`, `isLoading` | loading (skeleton), filled |
| `QuickActions` | Przyciski | `userRole: string` | filled (brak loading) |
| `MiniShoppingList` | Lista checkboxów | `items: ShoppingItem[]`, `isLoading`, `onToggle` | loading (skeleton), empty, filled |
| `MiniKanban` | Grid 3 kolumn | `columns: Column[]`, `tasks: Task[]`, `isLoading` | loading (skeleton), empty, filled |
| `RecentActivity` | Lista timeline | `events: ActivityEvent[]`, `isLoading` | loading (skeleton), empty, filled |

### Struktura strony `/home` (page.tsx)

```tsx
// src/app/(home)/page.tsx — Server Component
import { getServerSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { HomeOverview } from '@/components/home/overview/HomeOverview';

export default async function HomePage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  return (
    <HomeOverview
      initialUserName={session.user.displayName ?? session.user.email?.split('@')[0] ?? 'Użytkowniku'}
      userRole={session.user.role}
    />
  );
}
```

```tsx
// src/components/home/overview/HomeOverview.tsx — Client Component
'use client';

import { useShoppingList } from '@/lib/hooks/home/useShoppingList';
import { useTasks } from '@/lib/hooks/home/useTasks';
import { useActivity } from '@/lib/hooks/home/useActivity';
import { useHousehold } from '@/lib/hooks/home/useHousehold';
import { GreetingBanner } from './GreetingBanner';
import { StatCards } from './StatCards';
import { QuickActions } from './QuickActions';
import { MiniShoppingList } from './MiniShoppingList';
import { MiniKanban } from './MiniKanban';
import { RecentActivity } from './RecentActivity';

interface HomeOverviewProps {
  initialUserName: string;
  userRole: string;
}

export function HomeOverview({ initialUserName, userRole }: HomeOverviewProps) {
  const { data: shoppingItems = [], isLoading: shoppingLoading } = useShoppingList();
  const { data: tasksData, isLoading: tasksLoading } = useTasks();
  const { data: activityEvents = [], isLoading: activityLoading } = useActivity({ limit: 4 });
  const { data: household, isLoading: householdLoading } = useHousehold();

  // Dane do stat cards
  const tasksToday = tasksData?.todayTasks ?? [];
  const shoppingPending = shoppingItems.filter(i => !i.is_bought);
  const activityToday = activityEvents.filter(e => {
    const today = new Date().toDateString();
    return new Date(e.created_at).toDateString() === today;
  });
  const memberCount = household?.members?.length ?? 0;

  return (
    <div className="space-y-4 p-6 max-w-5xl mx-auto">
      {/* 1. Greeting */}
      <GreetingBanner
        userName={initialUserName}
        tasksToday={tasksToday.length}
        shoppingCount={shoppingPending.length}
      />

      {/* 2. Stat Cards */}
      <StatCards
        tasksToday={tasksToday}
        shoppingPending={shoppingPending}
        activityCount={activityToday.length}
        members={household?.members ?? []}
        isLoading={tasksLoading || shoppingLoading || activityLoading || householdLoading}
      />

      {/* 3. Quick Actions */}
      <QuickActions userRole={userRole} />

      {/* 4. Bottom grid: Mini Shopping + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MiniShoppingList
          items={shoppingPending.slice(0, 5)}
          isLoading={shoppingLoading}
        />
        <RecentActivity
          events={activityEvents.slice(0, 4)}
          isLoading={activityLoading}
        />
      </div>

      {/* 5. Mini Kanban */}
      <MiniKanban
        columns={tasksData?.columns ?? []}
        tasks={tasksData?.tasks ?? []}
        isLoading={tasksLoading}
      />
    </div>
  );
}
```

### MiniKanban — logika wycinania danych

```tsx
// W MiniKanban.tsx
// Kolumny: weź PIERWSZE 3 kolumny (position 0, 1, 2)
// Taski: per kolumna — posortuj po position ASC, weź pierwsze 2

const first3Columns = [...columns]
  .sort((a, b) => a.position - b.position)
  .slice(0, 3);

const tasksByColumn = (columnId: string) =>
  tasks
    .filter(t => t.column_id === columnId)
    .sort((a, b) => a.position - b.position)
    .slice(0, 2);

// Fallback nazwy kolumn jeśli brak danych columns:
const DEFAULT_COLUMN_NAMES = ['Do zrobienia', 'W trakcie', 'Gotowe'];
const DEFAULT_COLUMN_DOTS = ['#6b7280', '#f97316', '#4ade80'];
```

### MiniShoppingList — optimistic toggle

```tsx
// W MiniShoppingList.tsx
const toggleMutation = useMutation({
  mutationFn: (itemId: string) =>
    fetch(`/api/home/shopping/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_bought: true }),
    }).then(r => { if (!r.ok) throw new Error('Failed'); }),
  
  onMutate: async (itemId) => {
    // Optimistic: usuń item z cache natychmiast
    await queryClient.cancelQueries({ queryKey: ['shopping'] });
    const previous = queryClient.getQueryData(['shopping']);
    queryClient.setQueryData(['shopping'], (old: ShoppingItem[]) =>
      old.map(i => i.id === itemId ? { ...i, is_bought: true } : i)
    );
    return { previous };
  },
  
  onError: (err, itemId, context) => {
    // Rollback optimistic update
    queryClient.setQueryData(['shopping'], context?.previous);
    toast.error('Nie udało się oznaczyć produktu');
  },
  
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['shopping'] });
  },
});
```

### Stany widoku

**Loading:**
- GreetingBanner: renderuje się natychmiast z `initialUserName` z sesji + `new Date()`; wartości tasksToday i shoppingCount pokazują "–" (myślnik) podczas ładowania
- StatCards: 4 skeleton cards
- MiniShoppingList: 5 skeleton wierszy
- MiniKanban: 3 kolumny ze skeleton kartami
- RecentActivity: 4 skeleton wiersze

**Empty (wszystkie hooki zwróciły [], household brak):**
- StatCards: wartości "0" — wszystkie
- MiniShoppingList: "Brak produktów do kupienia 🎉" (emoji zachęcające)
- MiniKanban: każda kolumna z "Brak zadań"
- RecentActivity: "Brak aktywności w tym dniu"

**Error (dowolny hook zwrócił isError: true):**
Każda sekcja obsługuje błąd niezależnie — pokazuje tekst "Nie udało się załadować. Spróbuj ponownie." z lokalnym przyciskiem "Odśwież" (refetch tylko tego hooka, nie całej strony)

**Filled (normalny stan):** Wszystkie sekcje z danymi per AC-1 do AC-8

### Flow interakcji (krok po kroku)

```
1. User po zalogowaniu jest przekierowany na /home (z EPIC-3 auth routing)

2. Strona mountuje HomeOverview — wszystkie 4 hooki równocześnie (parallel):
   - useShoppingList() → GET /api/home/shopping
   - useTasks() → GET /api/home/tasks
   - useActivity({ limit: 4 }) → GET /api/home/activity?limit=4
   - useHousehold() → GET /api/home/household

3. Podczas ładowania (wszystkie hooki isLoading):
   - GreetingBanner: wyświetla imię z sesji, aktualną datę (lokalnie), "–" dla count
   - Pozostałe sekcje: skeletony animate-pulse

4. Dane załadowane (każdy hook niezależnie, w miarę nadchodzenia):
   → StatCards → filled (z pierwszymi dostępnymi danymi)
   → MiniShoppingList → lista 5 itemów
   → MiniKanban → 3 kolumny 2 karty
   → RecentActivity → 4 eventy

5. User klika checkbox przy "Mleko 3.2%":
   → Optimistic: checkbox zaznaczony natychmiast
   → PATCH /api/home/shopping/{id} z { is_bought: true }
   → Sukces: invalidateQueries → item znika z listy; następny item (6.) pojawia się jeśli istnieje
   → Błąd: rollback + toast error

6. User klika "➕ Dodaj zadanie":
   → router.push('/home/tasks') LUB otwiera modal (jeśli modal jest dostępny z STORY-4.5)

7. User klika "👥 Zaproś osobę":
   → router.push('/home/household')

8. User klika "Pokaż wszystkie →" w MiniShoppingList:
   → router.push('/home/shopping')

9. User klika "Otwórz tablicę →" w MiniKanban:
   → router.push('/home/tasks')

10. User klika "Pełny feed →" w RecentActivity:
    → router.push('/home/activity')
```

### Responsive / Dostępność
- Mobile (375px+): 
  - StatCards: `grid-cols-2` (2×2 layout) — per mobile mockup `kira-home-dashboard-mobile-mockup.html` `#tab-home → .stats-grid`
  - Quick Actions: `flex-wrap: wrap`, 3 przyciski na 1 wierszu (375px wystarczy)
  - MiniShoppingList + RecentActivity: `grid-cols-1` (stacked)
  - MiniKanban: horizontal scroll (`overflow-x: auto`) z `min-width: 120px` per kolumna
  - GreetingBanner: data po prawej stronie pojawia się pod tytułem (flex-col na mobile)
- Tablet (768px+): StatCards `grid-cols-4`, Layout jak desktop
- Desktop (1280px+): Pełny layout 4-kolumnowy dla stat cards, 2-kolumnowy dla Shopping+Activity
- Keyboard navigation: Checkboxy dostępne przez Tab + Space/Enter; Quick Action buttons Tab-accessible; Linki "Pokaż wszystkie" mają focus ring `ring-2 ring-[#7c3aed]`
- ARIA:
  - `<main>` wrapper z `aria-label="Strona główna household"` 
  - Checkbox: `<button role="checkbox" aria-checked={isChecked} aria-label={`Oznacz "${item.name}" jako kupione`}>`
  - Stat cards: `<article aria-label="Zadania dziś: {N}">`
  - Mini Kanban: `aria-label="Podgląd tablicy zadań (tylko do odczytu)"`
  - Activity feed: `<section aria-label="Ostatnia aktywność">`

---

## ⚠️ Edge Cases

### EC-1: Brak household — user nie należy do żadnego household
Scenariusz: Nowo zarejestrowany użytkownik, `useHousehold()` zwraca `null`
Oczekiwane zachowanie: Stat card "Rodzina" wyświetla "0" + subtext "Utwórz lub dołącz do household". Przycisk "👥 Zaproś osobę" jest hidden. MiniShoppingList, MiniKanban, RecentActivity wyświetlają empty states (hooki zwracają puste tablice przez RLS — user bez household nie widzi żadnych danych).
Komunikat dla użytkownika: Banner informacyjny nad StatCards: "Nie należysz jeszcze do żadnego household. Poproś administratora o zaproszenie." (color: `#e3b341`, bg: `#3a2a00`, border: `1px solid #e3b341`)

### EC-2: Brak danych tasksData.columns (STORY-4.3 nie zwraca columns)
Scenariusz: Hook `useTasks` nie zawiera pola `columns` w zwracanych danych (np. zmigrowany inaczej)
Oczekiwane zachowanie: MiniKanban używa fallback `DEFAULT_COLUMN_NAMES` (`['Do zrobienia', 'W trakcie', 'Gotowe']`) zamiast nazw z API. Taski są przypisane do kolumn przez `column_id` — bez nazw te karty nie mogą być pogrupowane. W tym przypadku MiniKanban wyświetla empty state: "Otwórz tablicę, aby zobaczyć zadania →"
Komunikat dla użytkownika: "Otwórz tablicę, aby zobaczyć zadania →" (link do `/home/tasks`)

### EC-3: shoppingPending.slice(0,5) — mniej niż 5 niekupionych itemów
Scenariusz: Household ma tylko 2 niekupione produkty (10 jest `is_bought=true`)
Oczekiwane zachowanie: MiniShoppingList wyświetla 2 wiersze — NIE pokazuje pustych placeholderów. Karta nie "rośnie" do stałej wysokości. "Pokaż wszystkie →" link jest widoczny.
Komunikat dla użytkownika: n/d (2 wiersze to poprawny stan)

### EC-4: Activity event z actor_id=null (systemowa akcja bez usera)
Scenariusz: Event w `activity_log` ma `actor_id=null` i `actor_name=null` (np. automatyczne zdarzenie lub import)
Oczekiwane zachowanie: Avatar wyświetla "?" lub "🤖". Tekst eventu: "System {akcja} '{nazwa}'" (lub `actor_name ?? 'System'`). NIE crash przez `actor_name.charAt(0)`.
Komunikat dla użytkownika: "System dodał…" lub "Nieznany użytkownik dodał…"

---

## 🚫 Out of Scope tej Story
- Pełna strona Shopping List `/home/shopping` — STORY-4.4
- Pełna strona Kanban `/home/tasks` — STORY-4.5
- Pełny feed aktywności `/home/activity` — STORY-4.6
- Strona Household Management `/home/household` — STORY-4.7
- Strona Analytics `/home/analytics` — STORY-4.8
- Real-time aktualizacja stat cards (Supabase subscription) — wystarczy refetch przy focus windowu przez React Query
- Edycja zadań z poziomu MiniKanban — read-only preview
- Drag & drop w MiniKanban — pełna tablica w STORY-4.5
- Wyszukiwanie na stronie głównej — topbar search to osobny komponent (layout)
- Push notifications / toast dla nowej aktywności w real-time — EPIC-2 lub osobny epic
- Ustawienia preferowanego view (np. czy pokazywać MiniKanban) — nie w MVP

---

## ✔️ Definition of Done
- [ ] `src/app/(home)/page.tsx` istnieje jako Server Component z getServerSession i przekazaniem userName + role
- [ ] `src/components/home/overview/HomeOverview.tsx` istnieje jako Client Component z 4 hookami
- [ ] `GreetingBanner` wyświetla imię z sesji + datę po polsku (format: "Czwartek, 19 lut" + "2026 · tydzień 8")
- [ ] Funkcja `formatPolishDate` używa własnych polskich mapowań (nie zakłada dostępności date-fns locale/pl)
- [ ] `StatCards` — 4 karty: Zadania dziś, Do kupienia, Aktywność dziś, Rodzina; `grid-cols-4` desktop, `grid-cols-2` mobile
- [ ] `QuickActions` — 3 przyciski z poprawnymi nawigacjami; przycisk "Zaproś osobę" ukryty dla HELPER
- [ ] `MiniShoppingList` — max 5 itemów z `is_bought=false`; checkbox z optimistic toggle (PATCH /api/home/shopping/{id})
- [ ] Optimistic update działa: checkbox zaznaczony natychmiast → item znika po sukcesie → rollback po błędzie
- [ ] `MiniKanban` — 3 pierwsze kolumny, max 2 karty per kolumna, read-only
- [ ] `RecentActivity` — 4 najnowsze eventy z relatywnym czasem po polsku
- [ ] Linki "Pokaż wszystkie →", "Otwórz tablicę →", "Pełny feed →" nawigują do poprawnych routes
- [ ] Wszystkie 4 stany widoku: loading (skeleton animate-pulse), empty, error (retry), filled
- [ ] Mobile 375px: StatCards 2×2, MiniKanban scroll poziomy, bez horizontal overflow
- [ ] Dark theme: bg `#13111c`/`#1a1730`, border `#2a2540`, tekst `#e6edf3`
- [ ] GreetingBanner gradient tło i gradient tekst tytułu (per mockup)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów, empty states i timestamp są po polsku
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
