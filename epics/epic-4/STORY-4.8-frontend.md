---
story_id: STORY-4.8
title: "Home Analytics — migracja wykresów z archive/ do /home/analytics z role guard PermissionGate"
epic: EPIC-4
module: home
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: epics/kira-home-dashboard-mockup.html → tab "📊 Analytics", sidebar "Analytics > Analytics [HELPER+]"
api_reference: /api/home/analytics (GET — dane do wykresów)
priority: should
estimated_effort: 7 h
depends_on: STORY-4.1, STORY-4.2, STORY-4.3
blocks: none
tags: [migration, analytics, charts, recharts, role-guard, permission-gate, dark-theme]
---

## 🎯 User Story

**Jako** użytkownik z rolą HELPER_PLUS lub ADMIN
**Chcę** widzieć stronę `/home/analytics` z wykresami aktywności rodziny (zakupy, zadania, priorytety, heatmap)
**Żeby** monitorować wzorce aktywności household na przestrzeni czasu i podejmować lepsze decyzje

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/home/analytics` (plik: `src/app/(home)/analytics/page.tsx`)
- Komponenty: `src/components/home/analytics/{ShoppingChart,CompletionChart,PriorityChart,ActivityHeatmap,OverviewCards,ChartCard}.tsx`
- Źródło migracji: `archive/src/components/analytics/*.tsx`
- Biblioteka wykresów: **Recharts** (już w archive/package.json jako `"recharts": "^3.7.0"` — użyj tej samej wersji w nowym projekcie)

### Powiązane pliki
- `archive/src/components/analytics/ShoppingChart.tsx` — bar chart
- `archive/src/components/analytics/CompletionChart.tsx` — line chart
- `archive/src/components/analytics/PriorityChart.tsx` — pie/doughnut chart
- `archive/src/components/analytics/ActivityHeatmap.tsx` — CSS grid heatmap
- `archive/src/components/analytics/OverviewCards.tsx` — 4 stat cards (redesign na 3 karty per brief)
- `archive/src/components/analytics/ChartCard.tsx` — wrapper card (zmigruj bez zmian logiki, tylko restyling)
- `archive/src/lib/hooks/useAnalytics.ts` — hook do zmigrowania
- `archive/src/app/(dashboard)/analytics/AnalyticsContent.tsx` — strona źródłowa
- Mockup desktop: `epics/kira-home-dashboard-mockup.html` → pane `#pane-analytics`
- Mockup mobile: `epics/kira-home-dashboard-mobile-mockup.html` → pane `#tab-analytics`

### Stan systemu przed tą story
- STORY-4.1 ukończona: tabele `shopping_items`, `tasks`, `activity_log`, `household_members` istnieją z RLS
- STORY-4.2 ukończona: endpoint `GET /api/home/analytics` istnieje i zwraca dane do wykresów
- STORY-4.3 ukończona: hook `useAnalytics` (lub odpowiednik) jest zmigrowany i zwraca typed data
- `<PermissionGate>` komponent istnieje z EPIC-3 — sprawdź import path i dostępne propsy
- Recharts jest zainstalowany w nowym projekcie (lub dodaj do package.json: `"recharts": "^3.7.0"`)

---

## ✅ Acceptance Criteria

### AC-1: HELPER widzi stronę zablokowaną przez PermissionGate (nie blank, nie redirect — komunikat)
GIVEN: Zalogowany użytkownik z rolą `HELPER` wchodzi na `/home/analytics`
WHEN: Strona jest załadowana
THEN: Widoczny jest komponent `<PermissionGate require="canAccessAnalytics">`, który renderuje zamiast wykresów sekcję z tekstem:
- Ikona: 📊 (font-size: 32px)
- Nagłówek: "Analytics dostępne dla HELPER+ i Admin" (color: `#e6edf3`, font-size: 16px, font-weight: 700)
- Podtytuł: "Skontaktuj się z administratorem household, aby uzyskać dostęp do analityki." (color: `#6b7280`, font-size: 13px)
AND: Żadne wykresy ani karty statystyk nie są renderowane ani nie wykonują requestów HTTP

### AC-2: HELPER_PLUS i ADMIN widzą pełną stronę analytics z wszystkimi komponentami
GIVEN: Zalogowany użytkownik z rolą `HELPER_PLUS` lub `ADMIN` wchodzi na `/home/analytics`
WHEN: Strona jest załadowana i dane zostały pobrane z API
THEN: Widoczne są w kolejności od góry:
1. Sekcja nagłówka: "📊 Analytics" (font-size: 18px, font-weight: 800, color: `#e6edf3`) + badge "👑 HELPER+ only" (background: `#2d1b4a`, border: `#5b21b6`, color: `#c4b5fd`, font-size: 11px)
2. `OverviewCards` — 3 karty statystyk w jednym rzędzie
3. Siatka 2 kolumn z wykresami: `ShoppingChart` (lewa), `CompletionChart` (prawa)
4. Poniżej: `PriorityChart` (lewa) i `ActivityHeatmap` (prawa, spanning)

### AC-3: OverviewCards wyświetla 3 karty z poprawnymi danymi
GIVEN: API zwraca dane: `{ completedTasks: 28, shoppingBought: 45, mostActiveUser: { name: "Angelika", count: 32 } }`
WHEN: Strona jest załadowana
THEN: Widoczne są 3 karty w gridzie 3 kolumn (`grid-template-columns: repeat(3, 1fr)`):

**Karta 1 — Ukończone zadania:**
- Label: "✅ Ukończone zadania" (font-size: 10px, color: `#4b4569`, uppercase)
- Wartość: "28" (font-size: 26px, font-weight: 800, color: `#e6edf3`)
- Subtext: "w tym miesiącu" (font-size: 10px, color: `#4b4569`)
- Trend: "↑ +8 vs poprzedni miesiąc" (color: `#4ade80`)
- Lewa krawędź (border-left: 3px solid `#10B981`) lub border-l-[#10B981]

**Karta 2 — Zakupione produkty:**
- Label: "🛒 Zakupione produkty"
- Wartość: "45"
- Subtext: "w tym miesiącu"
- Lewa krawędź: `#3B82F6`

**Karta 3 — Najaktywniejszy:**
- Label: "🏆 Najaktywniejszy"
- Wartość: "Angelika" (font-size: 20px — mniejszy niż liczba bo to tekst)
- Subtext: "32 akcje w tym miesiącu"
- Trend: "🔥 +15% vs poprzedni" (color: `#f9a8d4`)
- Lewa krawędź: `#8B5CF6`

### AC-4: ShoppingChart wyświetla bar chart (ile zakupionych produktów per dzień, 7 dni)
GIVEN: API zwraca dane ostatnich 7 dni: `[{ date: "2026-02-13", count: 5 }, { date: "2026-02-14", count: 3 }, ..., { date: "2026-02-19", count: 8 }]`
WHEN: Komponent `ShoppingChart` jest zamontowany z tymi danymi
THEN: Renderuje `<BarChart>` z Recharts z:
- Os X: daty (format "Pn", "Wt", "Śr", "Czw", "Pt", "So", "Nd" dla polskich skrótów dni tygodnia, obliczone z `date`)
- Os Y: liczba produktów (0 do max+padding)
- Słupki: kolor `#10B981` (emerald)
- Tooltip: po najechaniu na słupek wyświetla "Poniedziałek: 5 produktów" (lub pełna nazwa dnia + liczba)
- Tytuł karty ChartCard: "🛒 Zakupy — częstotliwość"
- Podtytuł ChartCard: "Liczba zakupionych produktów per dzień · ostatnie 7 dni"
AND: Wykres ma height: 180px (lub odpowiadający rozmiar z ChartCard wrapper)

### AC-5: CompletionChart wyświetla line chart (% ukończonych zadań, 14 dni)
GIVEN: API zwraca dane: `[{ date: "2026-02-06", percentage: 60 }, ..., { date: "2026-02-19", percentage: 85 }]`
WHEN: Komponent `CompletionChart` jest zamontowany
THEN: Renderuje `<LineChart>` z Recharts z:
- Os X: daty (format "06 Lut", "07 Lut" ... "19 Lut" — polska lokalizacja)
- Os Y: procenty (0–100, YAxis domain [0, 100])
- Linia: kolor `#3B82F6` (blue), strokeWidth: 2, dot: false (bez punktów — gładka linia)
- Tooltip: "6 Lut: 60%" 
- Tytuł: "✅ Task completion rate"
- Podtytuł: "% ukończonych zadań · ostatnie 14 dni"

### AC-6: PriorityChart wyświetla doughnut (rozkład per priorytet)
GIVEN: API zwraca: `[{ name: "HIGH", value: 8, color: "#f85149" }, { name: "MEDIUM", value: 15, color: "#e3b341" }, { name: "LOW", value: 5, color: "#3fb950" }]`
WHEN: Komponent `PriorityChart` jest zamontowany
THEN: Renderuje `<PieChart>` z Recharts z:
- Typ: PieChart z outerRadius 80, innerRadius 40 (doughnut — innerRadius tworzy dziurę)
- Kolory: HIGH = `#f85149`, MEDIUM = `#e3b341`, LOW = `#3fb950`
- Label: procentowy (np. "HIGH: 28.6%")
- Legend: wyświetla nazwy priorytetów z kolorami
- Tytuł: "📊 Podział zadań wg priorytetu"
AND: Jeśli wszystkie wartości są 0 — wyświetla empty state z tekstem "Brak aktywnych zadań"

### AC-7: ActivityHeatmap wyświetla siatkę aktywności lub fallback
GIVEN: API zwraca tablicę `HeatmapData[]` z min. 49 wpisami (7 tygodni × 7 dni):
```
[{ date: "2026-01-01", count: 0, intensity: 0 }, { date: "2026-01-02", count: 3, intensity: 2 }, ...]
```
WHEN: Komponent `ActivityHeatmap` jest zamontowany z danymi
THEN: Renderuje siatkę komórek (grid) gdzie:
- Każda komórka ma `width: 16px`, `height: 16px`, `border-radius: 2px`
- Kolor komórki zależy od intensity: 0=`#EBEDF0`, 1=`#C6E48B`, 2=`#7BC96F`, 3=`#239A3B`, 4=`#196127`
- Tytuł wyświetlony przez `title` attribute: "{date}: {count} aktywności"
- Legenda na dole: "Mniej [■■■■■] Więcej"
AND: Gdy tablica `data` jest pusta lub ma < 7 elementów — fallback: `<p className="text-[#4b4569] text-sm text-center py-8">Brak danych aktywności za ostatnie tygodnie</p>` (NIE crash, NIE pusta siatka ze znakami zapytania)

### AC-8: Wszystkie karty ChartCard mają dark-theme styling
GIVEN: Komponent `ChartCard` jest renderowany w dowolnym miejscu strony Analytics
WHEN: Brak specjalnych warunków
THEN: ChartCard ma:
- Background: `#1a1730`
- Border: `1px solid #2a2540`
- Border-radius: `10px`
- Padding: `16px`
- Tytuł: `color: #e6edf3`, `font-size: 13px`, `font-weight: 700`
- Podtytuł (subtitle): `color: #4b4569`, `font-size: 11px`
AND: Brak `bg-white`, `shadow`, `border-gray-*` z archiwum (light theme usunięty)

### AC-9: Stany loading i error dla całej strony analytics
GIVEN: Hook useAnalytics jest w stanie `isLoading: true`
WHEN: Strona `/home/analytics` się ładuje
THEN: W miejscu OverviewCards widoczne 3 skeleton karty (animate-pulse, `h-24 bg-[#2a2540] rounded-lg`)
AND: W miejscu każdego wykresu widoczny skeleton: `<div className="animate-pulse h-44 bg-[#2a2540] rounded-lg" />`
GIVEN: Hook useAnalytics zwraca `isError: true`
WHEN: Dane nie mogły być załadowane
THEN: Wyświetlony baner błędu: "Nie udało się załadować danych analytics. Spróbuj ponownie." + przycisk "Odśwież" (wywołuje `refetch()`)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home/analytics`
Komponent główny: `src/app/(home)/analytics/page.tsx`
Pliki docelowe:
- `src/components/home/analytics/ShoppingChart.tsx`
- `src/components/home/analytics/CompletionChart.tsx`
- `src/components/home/analytics/PriorityChart.tsx`
- `src/components/home/analytics/ActivityHeatmap.tsx`
- `src/components/home/analytics/OverviewCards.tsx`
- `src/components/home/analytics/ChartCard.tsx`

### Instrukcja migracji (krok po kroku)

1. Skopiuj wszystkie pliki z `archive/src/components/analytics/` do `src/components/home/analytics/`
2. Zweryfikuj czy `recharts` jest w `package.json` nowego projektu — jeśli nie, dodaj: `npm install recharts@^3.7.0`
3. Zaktualizuj import paths wewnątrz komponentów (np. `./ChartCard` pozostaje relatywny — bez zmian)
4. `OverviewCards.tsx` — **przepisz** z 4 kart na 3 karty per brief (Ukończone zadania, Zakupy, Najaktywniejszy). Zmień interfejs `OverviewData` i prop `data`:
   ```ts
   interface OverviewData {
     completedTasks: number;
     shoppingBought: number;
     mostActiveUser: { name: string; count: number } | null;
   }
   ```
5. `ShoppingChart.tsx` — zmień dane wejściowe z `{ category, count }[]` na `{ date, count }[]` per brief; zmień oś X z kategorii na dni tygodnia
6. `CompletionChart.tsx` — zmień `completed: number` na `percentage: number` per brief; oś Y 0–100%
7. `PriorityChart.tsx` — dodaj `innerRadius={40}` do `<Pie>` (doughnut zamiast pie)
8. `ChartCard.tsx` — restyling dark theme (patrz tabela poniżej)
9. `ActivityHeatmap.tsx` — dodaj fallback dla `data.length < 7`; zmień kolory intensity (zostają te same z archive — są OK)
10. Stwórz `src/app/(home)/analytics/page.tsx` z `<PermissionGate>` opakowującym całą zawartość

### Restyling ChartCard dark theme

| Archive (light) | Nowy (dark) |
|-----------------|-------------|
| `bg-white rounded-lg shadow p-6` | `bg-[#1a1730] border border-[#2a2540] rounded-[10px] p-4` |
| `text-gray-500` (empty state) | `text-[#4b4569]` |
| `bg-white p-2 border rounded shadow` (Tooltip) | `bg-[#13111c] border border-[#2a2540] rounded p-2 text-[#e6edf3]` |
| `text-gray-900` lub domyślne | `text-[#e6edf3]` |
| Brak | `border-l-4 border-l-[kolor]` dla OverviewCards |

### Recharts dark theme — globalne ustawienia osi i grid

W każdym wykresie (ShoppingChart, CompletionChart) zaktualizuj kolory osi i siatki:
```tsx
// XAxis i YAxis — ciemny tekst
<XAxis dataKey="..." tick={{ fontSize: 10, fill: '#6b7280' }} />
<YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />

// CartesianGrid — ciemne linie
<CartesianGrid strokeDasharray="3 3" stroke="#2a2540" />

// Tooltip — ciemne tło
<Tooltip
  contentStyle={{
    background: '#13111c',
    border: '1px solid #2a2540',
    borderRadius: '6px',
    color: '#e6edf3',
    fontSize: '12px',
  }}
/>
```

### PermissionGate — implementacja

```tsx
// src/app/(home)/analytics/page.tsx
import { PermissionGate } from '@/components/auth/PermissionGate'; // z EPIC-3
// LUB jeśli PermissionGate nie jest dostępny — sprawdź nazwę i path komponentu z EPIC-3

export default function AnalyticsPage() {
  return (
    <PermissionGate
      require="canAccessAnalytics"
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
          <span className="text-5xl mb-4">📊</span>
          <h2 className="text-[#e6edf3] text-lg font-bold mb-2">
            Analytics dostępne dla HELPER+ i Admin
          </h2>
          <p className="text-[#6b7280] text-sm max-w-sm">
            Skontaktuj się z administratorem household, aby uzyskać dostęp do analityki.
          </p>
        </div>
      }
    >
      <AnalyticsContent />
    </PermissionGate>
  );
}
```

**Uwaga**: Sprawdź w kodzie EPIC-3 jak jest zdefiniowane `canAccessAnalytics`. Jeśli `PermissionGate` używa innego mechanizmu (np. `roles={['ADMIN', 'HELPER_PLUS']}` zamiast `require="canAccessAnalytics"`), dostosuj prop. Nie zmieniaj mechanizmu PermissionGate — tylko użyj poprawnych propów.

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `OverviewCards` | Grid kart | `data: OverviewData \| null` | null→skeleton, filled |
| `ShoppingChart` | Recharts BarChart | `data: {date: string, count: number}[]` | empty→komunikat, filled |
| `CompletionChart` | Recharts LineChart | `data: {date: string, percentage: number}[]` | empty→komunikat, filled |
| `PriorityChart` | Recharts PieChart (doughnut) | `data: {name, value, color}[]` | empty→komunikat, filled |
| `ActivityHeatmap` | CSS Grid | `data: HeatmapData[]` | empty→fallback text, filled |
| `ChartCard` | Card wrapper | `title`, `subtitle?`, `empty?`, `emptyMessage?`, `children` | empty, filled |

### Struktura strony `/home/analytics`

```tsx
// src/components/home/analytics/AnalyticsContent.tsx (Client Component)
'use client';

import { useAnalytics } from '@/lib/hooks/home/useAnalytics';
import { OverviewCards } from './OverviewCards';
import { ShoppingChart } from './ShoppingChart';
import { CompletionChart } from './CompletionChart';
import { PriorityChart } from './PriorityChart';
import { ActivityHeatmap } from './ActivityHeatmap';

export function AnalyticsContent() {
  const { data, isLoading, isError, refetch } = useAnalytics();

  if (isError) {
    return (
      <div className="flex flex-col items-center py-12 gap-4">
        <p className="text-[#f85149]">Nie udało się załadować danych analytics.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#2a2540] text-[#e6edf3] rounded-lg text-sm"
        >
          Odśwież
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-[#e6edf3] text-xl font-extrabold flex-1">📊 Analytics</h1>
        <span className="text-xs px-3 py-1 bg-[#2d1b4a] border border-[#5b21b6] text-[#c4b5fd] rounded-full font-semibold">
          👑 HELPER+ only
        </span>
      </div>

      {/* Overview Cards */}
      <OverviewCards data={isLoading ? null : data?.overview ?? null} />

      {/* Charts row 1: Shopping + Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ShoppingChart data={isLoading ? [] : data?.shopping ?? []} />
        <CompletionChart data={isLoading ? [] : data?.completion ?? []} />
      </div>

      {/* Charts row 2: Priority + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PriorityChart data={isLoading ? [] : data?.priority ?? []} />
        <ActivityHeatmap data={isLoading ? [] : data?.heatmap ?? []} />
      </div>
    </div>
  );
}
```

### Dane z API — oczekiwana struktura

Endpoint `GET /api/home/analytics` zwraca:
```ts
interface AnalyticsResponse {
  overview: {
    completedTasks: number;        // zadania ukończone w tym miesiącu
    completedTasksTrend: number;   // różnica vs poprzedni miesiąc
    shoppingBought: number;        // produkty kupione w tym miesiącu
    shoppingBoughtTrend: number;   // różnica vs poprzedni miesiąc
    mostActiveUser: {
      name: string;
      count: number;
      trendPercent: number;
    } | null;
  };
  shopping: Array<{
    date: string;   // ISO date "2026-02-13"
    count: number;  // ile produktów oznaczono is_bought=true tego dnia
  }>;   // max 7 elementów (ostatnie 7 dni)
  completion: Array<{
    date: string;       // ISO date
    percentage: number; // 0-100, % ukończonych tasks tego dnia
  }>;   // max 14 elementów (ostatnie 14 dni)
  priority: Array<{
    name: 'HIGH' | 'MEDIUM' | 'LOW';
    value: number;  // liczba aktywnych zadań
    color: string;  // hex color
  }>;
  heatmap: Array<{
    date: string;
    count: number;
    intensity: 0 | 1 | 2 | 3 | 4;
  }>;   // zalecane: ostatnie 10 tygodni (70 elementów)
}
```

### Stany widoku

**Loading (isLoading: true):**
- OverviewCards: 3 skeleton `div` (animate-pulse, `h-24 bg-[#2a2540] rounded-lg`)
- Każdy chart: skeleton `div` (`h-[280px] bg-[#2a2540] animate-pulse rounded-lg`)

**Empty (dane załadowane, tablica pusta):**
- ShoppingChart z `data=[]`: "Brak danych zakupów za ostatnie 7 dni" (wewnątrz ChartCard empty state)
- CompletionChart z `data=[]`: "Brak danych zadań za ostatnie 14 dni"
- PriorityChart: "Brak aktywnych zadań"
- ActivityHeatmap z `data.length < 7`: "Brak danych aktywności za ostatnie tygodnie"

**Error:** Baner z przyciskiem "Odśwież" (patrz kod powyżej)

**Filled (normalny stan):** Wykresy z danymi, karty statystyk

### Flow interakcji (krok po kroku)

```
1. HELPER wchodzi na /home/analytics
   → PermissionGate sprawdza rolę → renderuje fallback z komunikatem
   → Żaden request HTTP do /api/home/analytics nie jest wykonywany

2. HELPER_PLUS wchodzi na /home/analytics
   → PermissionGate przepuszcza
   → AnalyticsContent mountuje
   → useAnalytics() wywołuje GET /api/home/analytics
   → Skeleton loading przez ~200-800ms
   → Dane załadowane → wszystkie komponenty re-renderują z danymi

3. User najeżdża na słupek wykresu ShoppingChart (Recharts onMouseOver)
   → Tooltip wyświetla datę i liczbę zakupów w dark-theme stylu

4. User najeżdża na sektor PriorityChart
   → Tooltip wyświetla "HIGH: 8 zadań (28.6%)"

5. User najeżdża na komórkę ActivityHeatmap
   → HTML title attribute wyświetla "2026-02-13: 3 aktywności"

6. API zwraca błąd (sieć pada)
   → useAnalytics isError: true
   → Baner błędu z przyciskiem "Odśwież"
   → User klika "Odśwież" → refetch() → loading ponownie
```

### Responsive / Dostępność
- Mobile (375px+): Wszystkie komponenty w jednej kolumnie (`grid-cols-1`). OverviewCards: 1 karta per wiersz lub scroll. ChartCard height: 180px.
- Tablet (768px+): OverviewCards grid 3 kolumn (małe karty). Wykresy w jednej kolumnie.
- Desktop (1280px+): Grid 2 kolumn dla wykresów (`lg:grid-cols-2`). OverviewCards 3 kolumny.
- Keyboard navigation: Strona jest read-only (brak form). Tab przechodzi przez karty.
- ARIA: Każdy `<canvas>` (Recharts) powinien mieć `role="img"` i `aria-label="Wykres zakupów — ostatnie 7 dni"` (analogicznie dla innych). Heatmap komórki mają `title` attribute.

---

## ⚠️ Edge Cases

### EC-1: Recharts nie jest zainstalowany w nowym projekcie
Scenariusz: `npm run dev` crashuje z błędem `Cannot find module 'recharts'`
Oczekiwane zachowanie: Przed kodowaniem — sprawdź `cat package.json | grep recharts`. Jeśli brak: `npm install recharts@^3.7.0`. NIE używaj Chart.js (archive używa Recharts — bibliotekę musi być spójna).
Komunikat dla użytkownika: n/d (błąd build-time)

### EC-2: ActivityHeatmap z danymi <7 elementów nie crashuje
Scenariusz: API zwraca tylko 3 wpisy heatmapy (np. nowy household z 3 dniami historii)
Oczekiwane zachowanie: Komponent renderuje fallback text zamiast siatki. NIE próbuje renderować `Array.from({ length: Math.ceil(3/7) })` — to zwróci 1 kolumnę ale z brakującymi wierszami.
Warunek: `if (!data || data.length < 7) return <fallback />`
Komunikat dla użytkownika: "Brak danych aktywności za ostatnie tygodnie"

### EC-3: mostActiveUser null (household nie ma aktywności)
Scenariusz: Nowe household, 0 aktywności — API zwraca `mostActiveUser: null`
Oczekiwane zachowanie: Karta 3 w OverviewCards wyświetla: wartość "—" (myślnik), subtext "Brak aktywności w tym miesiącu"
Komunikat dla użytkownika: "Brak aktywności w tym miesiącu"

### EC-4: CompletionChart z percentage > 100 lub < 0 (błąd danych)
Scenariusz: API zwraca `percentage: 105` przez błąd obliczeń w backend
Oczekiwane zachowanie: Komponent clampuje wartość: `Math.min(100, Math.max(0, item.percentage))` przed renderingiem. YAxis domain pozostaje `[0, 100]`.
Komunikat dla użytkownika: n/d (dane naprawiane silently)

---

## 🚫 Out of Scope tej Story
- Eksport CSV/PDF danych analytics — ExportButton komponent istnieje w archive/ ale nie jest w scope tej story
- Filtry zakresu dat (np. "ostatnie 30 dni" selector) — nie w MVP
- Analytics per user (filtr po osobie) — nie w MVP
- Porównanie z poprzednim miesiącem w wykresy (tylko w kartach statystyk) — dane przychodzą z API
- Real-time aktualizacja wykresów (Supabase subscription) — wystarczy refetch przy wejściu na stronę
- PriorityChart z priorytetem 'urgent' — schema ma 4 wartości (`low`, `medium`, `high`, `urgent`) ale UI pokazuje 3 (`LOW`, `MEDIUM`, `HIGH`); jeśli API zwróci `urgent`, traktuj jak `HIGH`

---

## ✔️ Definition of Done
- [ ] Pliki docelowe istnieją w `src/components/home/analytics/`
- [ ] `src/app/(home)/analytics/page.tsx` istnieje z `<PermissionGate>`
- [ ] HELPER widzi fallback z komunikatem (nie blank, nie redirect, nie crash)
- [ ] HELPER_PLUS i ADMIN widzą wszystkie 5 komponentów z danymi
- [ ] `recharts` jest w package.json i wykresy renderują się (brak "No chart" error w console)
- [ ] OverviewCards ma 3 karty (nie 4 jak w archive) z poprawnymi labelami po polsku
- [ ] ShoppingChart: os X shows dni tygodnia po polsku, kolor słupka `#10B981`
- [ ] CompletionChart: oś Y domain [0, 100], linia `#3B82F6`
- [ ] PriorityChart: doughnut (innerRadius > 0), kolory HIGH/MEDIUM/LOW
- [ ] ActivityHeatmap: fallback gdy `data.length < 7` (brak crash)
- [ ] ChartCard: dark theme (bg `#1a1730`, border `#2a2540`) — brak `bg-white` w nowych komponentach
- [ ] Recharts Tooltip dark theme (bg `#13111c`, border `#2a2540`)
- [ ] Wszystkie 4 stany widoku zaimplementowane: loading (skeleton), empty, error (retry), filled
- [ ] Widok działa na mobile 375px bez horizontal scroll (wykresy responsywne przez `ResponsiveContainer`)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty po polsku
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
