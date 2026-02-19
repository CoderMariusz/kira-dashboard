---
story_id: STORY-4.4
title: "Shopping List — migracja komponentów z archive/ i integracja z useShoppingList()"
epic: EPIC-4
module: home
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: /epics/kira-home-dashboard-mockup.html#pane-shopping
api_reference: /epics/EPIC-4-home-integration.md
priority: must
estimated_effort: 6h
depends_on: STORY-4.3
blocks: STORY-4.9
tags: [migration, shopping, dark-theme, shadcn, supabase, forms, categories]
---

## 🎯 User Story

**Jako** Angelika (HELPER+) zalogowana w kira-dashboard  
**Chcę** widzieć listę zakupów podzieloną na kategorie z możliwością zaznaczania produktów jako kupione, dodawania nowych produktów i zarządzania kategoriami  
**Żeby** sprawnie zarządzać zakupami rodziny bez konieczności instalowania osobnej aplikacji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `/home/shopping` → plik `src/app/home/shopping/page.tsx`
- Komponenty: `src/components/home/shopping/` (nowy katalog — tworzyć od zera przez migrację z archive/)
- Hook: `useShoppingList()` z STORY-4.3 (`src/lib/hooks/home/useShoppingList.ts`)
- Supabase client: `src/lib/supabase/client.ts` (nowy projekt — NIE archive/)

### Powiązane pliki
UX Ref: `/epics/kira-home-dashboard-mockup.html` — zakładka `🛒 Shopping` (pane-shopping) oraz mobile mockup zakładka Shopping  
Źródło migracji: `archive/src/components/shopping/` — ShoppingList.tsx, AddItemForm.tsx, CategoryGroup.tsx, BoughtSection.tsx, ShoppingItem.tsx, AddCategoryModal.tsx

### Stan systemu przed tą story
- STORY-4.1 (database) ukończona: tabele `shopping_items`, `shopping_categories` w Supabase z RLS
- STORY-4.3 (wiring) ukończona: hook `useShoppingList()` eksportuje `{ items, categories, addItem, toggleItem, deleteItem, addCategory, isLoading, error }` z Supabase real-time; typy `ShoppingItem`, `ShoppingCategory` zdefiniowane w `src/lib/types/home.ts`
- Projekt Next.js uruchomiony z `src/app/home/layout.tsx`
- shadcn/ui dostępne w nowym projekcie

---

## ✅ Acceptance Criteria

### AC-1: Strona `/home/shopping` renderuje się bez błędów
GIVEN: Użytkownik z rolą HELPER+ jest zalogowany i wchodzi na `/home/shopping`  
WHEN: Next.js renderuje `src/app/home/shopping/page.tsx`  
THEN: Strona ładuje się z nagłówkiem "🛒 Lista zakupów", licznikiem produktów do kupienia ("X produktów do kupienia"), przyciskiem "➕ Dodaj item"  
AND: Konsola przeglądarki nie zawiera żadnych `console.error` związanych z brakującymi komponentami lub importami

### AC-2: Stan ładowania — skeleton zamiast treści
GIVEN: `useShoppingList()` jest w stanie `isLoading: true` (żądanie do Supabase nie wróciło jeszcze)  
WHEN: Komponent `ShoppingList` montuje się  
THEN: Widoczne są 3 karty-szkielety (skeleton) symulujące kategorie — każda ma szarą belkę nagłówkową 44px i 3 szare linie-wiersze  
AND: Formularz `AddItemForm` jest widoczny nad skeletonem  
AND: Przycisk "Dodaj produkt" jest disabled z `opacity: 0.5`

### AC-3: Produkty wyświetlają się pogrupowane po kategorii
GIVEN: `useShoppingList()` zwraca `items` (tablica `ShoppingItem[]`) i `categories` (tablica `ShoppingCategory[]`)  
WHEN: Dane załadują się (isLoading: false)  
THEN: Dla każdej kategorii, która ma przynajmniej 1 produkt z `is_bought: false`, renderuje się komponent `CategoryGroup` z:
- nagłówkiem: `{category.icon}` + `{category.name}` + badge z liczbą aktywnych itemów (`cat-count`) — styl: `background:#13111c; color:#4b4569; border-radius:8px; padding:2px 8px`
- listą wierszy `ShoppingItem` z checkboxem, nazwą i ilością  
AND: Produkty z `is_bought: true` NIE pojawiają się w `CategoryGroup` (są w `BoughtSection`)  
AND: Produkty bez `category_id` (null) grupowane są w kategorię "📦 Inne" na końcu listy aktywnych produktów

### AC-4: Oznaczanie produktu jako kupionego przenosi go do BoughtSection
GIVEN: Użytkownik widzi produkt "Mleko 3.2%" w kategorii "🥛 Nabiał" z `is_bought: false`  
WHEN: Użytkownik klika checkbox przy "Mleko 3.2%"  
THEN: Checkbox wypełnia się gradientem `linear-gradient(135deg, #7c3aed, #3b82f6)` z checkmarkiem `✓` w kolorze `#fff`  
AND: `toggleItem(item.id, false)` jest wywołane z `useShoppingList()`  
AND: Optymistycznie (przed odpowiedzią API) produkt znika z `CategoryGroup` i pojawia się w `BoughtSection` ze stylami: tekst przekreślony (`text-decoration: line-through`), kolor tekstu `#4b4569`  
AND: Jeśli wszystkie produkty kategorii są kupione, cały `CategoryGroup` znika  
AND: Licznik w nagłówku strony aktualizuje się natychmiastowo (np. "11 produktów do kupienia")

### AC-5: BoughtSection — zwinięta sekcja kupionych produktów
GIVEN: W liście jest przynajmniej 1 produkt z `is_bought: true`  
WHEN: Użytkownik widzi stronę  
THEN: Pod listą kategorii wyświetla się sekcja `BoughtSection` z nagłówkiem "✅ Kupione (N)" gdzie N to liczba kupionych produktów — domyślnie zwinięta  
AND: Po kliknięciu nagłówka sekcja się rozwija/zwija (toggle)  
AND: Wewnątrz sekcji produkty mają przekreślony tekst i checkbox z gradientem  
AND: Widoczny jest przycisk "Wyczyść kupione" — po kliknięciu i potwierdzeniu (`window.confirm`: "Usunąć wszystkie kupione produkty?") wywołuje `deleteItem(id)` dla każdego kupionego produktu, a po zakończeniu lista kupionych jest pusta

### AC-6: Dodawanie nowego produktu przez formularz
GIVEN: Użytkownik klika przycisk "➕ Dodaj item" w nagłówku strony LUB przycisk "➕ Dodaj item" w formularzu  
WHEN: Otwiera się modal "Dodaj produkt" z polami: `Nazwa produktu` (tekst), `Kategoria` (select), `Ilość` (tekst)  
THEN: Modal ma tło `#1a1730`, border `1px solid #3b3d7a`, border-radius 14px, backdrop-filter: blur(4px)  
AND: Input focus ma border-color `#7c3aed`  
AND: Po wypełnieniu nazwy i kliknięciu "➕ Dodaj do listy" wywołuje się `addItem({ name, quantity, category_id })` z `useShoppingList()`  
AND: Podczas zapisywania przycisk pokazuje tekst "Dodawanie..." i jest disabled  
AND: Po sukcesie modal zamyka się, produkt pojawia się w odpowiedniej kategorii, formularz resetuje się do stanu pustego

### AC-7: Walidacja formularza AddItemForm
GIVEN: Modal "Dodaj produkt" jest otwarty  
WHEN: Użytkownik klika "Dodaj do listy" z pustym polem "Nazwa produktu"  
THEN: Przycisk submit jest disabled (atrybut `disabled`) — użytkownik nie może wysłać pustego formularza  
AND: Pole "Nazwa produktu" ma atrybut `required`  
AND: Pole "Ilość" ma wartość domyślną "1" i jest typu text (np. "2 szt", "1 kg")  
AND: Maksymalna długość nazwy to 200 znaków (atrybut `maxLength={200}`)

### AC-8: Modal AddCategoryModal — tworzenie nowej kategorii
GIVEN: Użytkownik jest w formularzu AddItemForm i wybiera z selecta "➕ Dodaj kategorię"  
WHEN: Otwiera się modal `AddCategoryModal`  
THEN: Modal ma pola: "Nazwa kategorii" (text, maxLength 100, required), "Ikona" (text, maxLength 2, default "📦"), "Kolor" (input type color + text hex, default "#6B7280")  
AND: Modal jest zamykany klawiszem Escape  
AND: Po zapisaniu wywołuje `addCategory({ name, icon, color })` z `useShoppingList()`  
AND: Po sukcesie nowa kategoria pojawia się w selectie kategorii w formularzu i jest automatycznie wybrana

### AC-9: Stan pusty — brak produktów
GIVEN: `useShoppingList()` zwraca `items: []` i `isLoading: false`  
WHEN: Komponent `ShoppingList` renderuje się  
THEN: Wyświetla się komponent EmptyState z ikoną 🛒, tytułem "Brak produktów na liście", opisem "Dodaj pierwszy produkt do listy zakupów"  
AND: Formularz AddItemForm jest widoczny nad EmptyState  
AND: Nie renderuje się żaden CategoryGroup ani BoughtSection

### AC-10: Stan błędu — problem z Supabase
GIVEN: `useShoppingList()` zwraca `error: Error` (np. utrata połączenia)  
WHEN: Komponent `ShoppingList` renderuje się  
THEN: Wyświetla się komunikat "⚠️ Nie udało się załadować listy zakupów" + "Sprawdź połączenie i spróbuj ponownie"  
AND: Widoczny jest przycisk "Spróbuj ponownie" który wywołuje `refetch()` z hooka

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home/shopping`  
Komponent strony: `src/app/home/shopping/page.tsx`  
Katalog komponentów: `src/components/home/shopping/`

### Krok po kroku — co stworzyć

**Krok 1: Utwórz katalog i przenieś pliki z archive/**
```bash
mkdir -p src/components/home/shopping
# Skopiuj i zmodyfikuj:
# archive/src/components/shopping/ShoppingList.tsx     → src/components/home/shopping/ShoppingList.tsx
# archive/src/components/shopping/AddItemForm.tsx      → src/components/home/shopping/AddItemForm.tsx
# archive/src/components/shopping/CategoryGroup.tsx    → src/components/home/shopping/CategoryGroup.tsx
# archive/src/components/shopping/BoughtSection.tsx    → src/components/home/shopping/BoughtSection.tsx
# archive/src/components/shopping/ShoppingItem.tsx     → src/components/home/shopping/ShoppingItem.tsx
# archive/src/components/shopping/AddCategoryModal.tsx → src/components/home/shopping/AddCategoryModal.tsx
```

**Krok 2: Zastąp stare importy nowymi**

W każdym migrowanym pliku usuń/zastąp:
- `import { useShopping } from '@/lib/hooks/useShopping'` → importy z `useShoppingList()` z STORY-4.3
- `import { useCategories } from '@/lib/hooks/useCategories'` → z `useShoppingList()`
- `import { useAddItem } from '@/lib/hooks/useAddItem'` → z `useShoppingList()`
- `import { useToggleItem } from '@/lib/hooks/useToggleItem'` → z `useShoppingList()`
- `import { useAddCategory } from '@/lib/hooks/useAddCategory'` → z `useShoppingList()`
- Typy: `import type { ShoppingItem, ShoppingCategory } from '@/lib/types/database'` → `import type { ShoppingItem, ShoppingCategory } from '@/lib/types/home'`
- Stary Supabase client (jeśli używany bezpośrednio) → `import { createClient } from '@/lib/supabase/client'`
- Stare shadcn komponenty z archive/ → importuj z `@/components/ui/...` (nowy projekt)

**Krok 3: Zrestylinguj do dark theme**

Wszystkie Tailwind klasy light-theme zastąp dark-theme:
```
bg-white          → bg-[#1a1730]
bg-gray-50        → bg-[#13111c]
border-gray-200   → border-[#2a2540]
text-gray-500     → text-[#6b7280]
text-gray-900     → text-[#e6edf3]
text-muted-foreground → text-[#4b4569]
rounded-md        → rounded-lg (border-radius ~8-10px)
bg-blue-600       → bg-gradient-to-br from-[#7c3aed] to-[#3b82f6]
border-blue-500   → border-[#7c3aed]
bg-red-50         → bg-[#3a1a1a]
text-red-700      → text-[#f87171]
ring-blue-200     → ring-[#4b3d7a]
```

**Krok 4: ShoppingList.tsx — nowy hook API**

Stara sygnatura: `useShopping(listId)` + `useCategories()`  
Nowa sygnatura: `useShoppingList()` (bez parametru — zwraca dane dla aktualnego household)

```tsx
// src/components/home/shopping/ShoppingList.tsx
'use client';
import { useMemo } from 'react';
import { useShoppingList } from '@/lib/hooks/home/useShoppingList';
import { CategoryGroup } from './CategoryGroup';
import { BoughtSection } from './BoughtSection';
import { AddItemForm } from './AddItemForm';

export function ShoppingList() {
  const { items, categories, isLoading, error, refetch } = useShoppingList();

  const { activeItems, boughtItems, progressPercent } = useMemo(() => {
    if (!items) return { activeItems: [], boughtItems: [], progressPercent: 0 };
    const active = items.filter(i => !i.is_bought);
    const bought = items.filter(i => i.is_bought);
    const pct = items.length > 0 ? (bought.length / items.length) * 100 : 0;
    return { activeItems: active, boughtItems: bought, progressPercent: pct };
  }, [items]);

  if (isLoading) return <ShoppingListSkeleton />;
  if (error) return <ShoppingErrorState onRetry={refetch} />;
  if (!items || items.length === 0) return (
    <div>
      <AddItemForm />
      <EmptyState />
    </div>
  );

  return (
    <div>
      <AddItemForm />
      <ProgressBar bought={boughtItems.length} total={items.length} percent={progressPercent} />
      {categories?.map(cat => {
        const catItems = activeItems.filter(i => i.category_id === cat.id);
        return <CategoryGroup key={cat.id} category={cat} items={catItems} />;
      })}
      {/* Uncategorized */}
      {(() => {
        const uncategorized = activeItems.filter(i => !i.category_id);
        if (!uncategorized.length) return null;
        return <CategoryGroup key="other" category={{ id: 'other', name: 'Inne', icon: '📦' } as any} items={uncategorized} />;
      })()}
      <BoughtSection items={boughtItems} />
    </div>
  );
}
```

**Krok 5: ShoppingItem.tsx — toggle przez useShoppingList()**

```tsx
// src/components/home/shopping/ShoppingItem.tsx
'use client';
import { useShoppingList } from '@/lib/hooks/home/useShoppingList';

export function ShoppingItem({ item }: { item: ShoppingItem }) {
  const { toggleItem, isToggling } = useShoppingList();

  const handleToggle = () => {
    toggleItem(item.id, item.is_bought);
  };

  return (
    <div className="flex items-center gap-[10px] py-[7px] border-b border-[#1f1c2e] last:border-b-0">
      <button
        role="checkbox"
        aria-checked={item.is_bought}
        aria-label={`Oznacz ${item.name} jako ${item.is_bought ? 'niekupiony' : 'kupiony'}`}
        onClick={handleToggle}
        disabled={isToggling === item.id}
        className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all ${
          item.is_bought
            ? 'bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] border-transparent'
            : 'border-[#3b3d7a] bg-transparent hover:border-[#c4b5fd]'
        }`}
      >
        {item.is_bought && <span className="text-white text-[10px]">✓</span>}
      </button>
      <span className={`text-[12px] flex-1 ${item.is_bought ? 'line-through text-[#4b4569]' : 'text-[#e6edf3]'}`}>
        {item.name}
      </span>
      {item.quantity && item.quantity !== '1' && (
        <span className="text-[11px] text-[#4b4569]">{item.quantity}</span>
      )}
    </div>
  );
}
```

**Krok 6: CategoryGroup.tsx — collapsible z dark theme**

```tsx
// src/components/home/shopping/CategoryGroup.tsx
'use client';
import { memo, useState, useMemo } from 'react';
import { ShoppingItem } from './ShoppingItem';
import type { ShoppingCategory, ShoppingItem as ShoppingItemType } from '@/lib/types/home';

export const CategoryGroup = memo(function CategoryGroup({
  category,
  items,
}: {
  category: ShoppingCategory;
  items: ShoppingItemType[];
}) {
  const [isOpen, setIsOpen] = useState(true);
  const activeItems = useMemo(() => items.filter(i => !i.is_bought), [items]);

  if (activeItems.length === 0) return null;

  return (
    <div className="mb-[10px] bg-[#1a1730] border border-[#2a2540] rounded-[10px] overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-[10px] px-[14px] py-[11px] w-full hover:bg-[#2a2540] transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-[16px]">{category.icon}</span>
        <span className="text-[13px] font-semibold text-[#e6edf3] flex-1 text-left">{category.name}</span>
        <span className="text-[11px] text-[#4b4569] bg-[#13111c] px-2 py-[2px] rounded-[8px]">
          {activeItems.length} items
        </span>
        <span className={`text-[10px] text-[#4b4569] transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
      </button>
      {isOpen && (
        <div className="px-[14px] pb-[10px] border-t border-[#2a2540]">
          {activeItems.map(item => <ShoppingItem key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
});
```

**Krok 7: BoughtSection.tsx — refactor usedelete z useShoppingList()**

Usuń bezpośrednie `fetch(API_ENDPOINTS...)` z archive/  
Zastąp: `const { deleteItem } = useShoppingList()`  
Wywołanie: `deleteItem(item.id)` zamiast fetch DELETE

**Krok 8: AddItemForm.tsx — modal zamiast inline form**

Desktop: renderuj jako modal (`.modal-overlay.open` gdy otwarty)  
Mobile: renderuj jako bottom sheet (position: fixed, bottom: 0)  
Wykrywanie: użyj `useMediaQuery('(max-width: 768px)')` lub Tailwind breakpoints

**Krok 9: Strona `/home/shopping/page.tsx`**

```tsx
// src/app/home/shopping/page.tsx
import { ShoppingList } from '@/components/home/shopping/ShoppingList';

export default function ShoppingPage() {
  return (
    <div className="p-[18px]">
      <div className="flex items-center gap-[10px] mb-[18px]">
        <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">🛒 Lista zakupów</h2>
        {/* Przycisk "Dodaj item" — otwiera AddItemForm modal */}
      </div>
      <ShoppingList />
    </div>
  );
}
```

### Komponenty

| Komponent | Typ | Kluczowe props/źródło | Stany |
|-----------|-----|----------------------|-------|
| `ShoppingList` | Container | `useShoppingList()` hook | loading, empty, error, filled |
| `CategoryGroup` | Accordion | `category: ShoppingCategory`, `items: ShoppingItem[]` | open/closed, empty (null) |
| `ShoppingItem` | Row z checkboxem | `item: ShoppingItem` | default, is_bought, toggling |
| `BoughtSection` | Accordion | `items: ShoppingItem[]` (filtered is_bought) | closed (default), open, clearing |
| `AddItemForm` | Modal/BottomSheet | onClose, onSuccess | idle, submitting, error |
| `AddCategoryModal` | Modal | isOpen, onClose, onSuccess | idle, submitting, error |

### Pola formularza AddItemForm

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| Nazwa produktu | text | min 1 znak, max 200 | (przycisk disabled) | tak |
| Kategoria | select | — | — | nie |
| Ilość | text | — | — | nie |

### Pola formularza AddCategoryModal

| Pole | Typ | Walidacja | Komunikat błędu | Wymagane |
|------|-----|-----------|-----------------|----------|
| Nazwa kategorii | text | min 1 znak, max 100 | (przycisk disabled) | tak |
| Ikona | text | max 2 znaki | — | nie (default: 📦) |
| Kolor | color + hex text | — | — | nie (default: #6B7280) |

### Stany widoku

**Loading:**  
3 karty-szkielety: belka nagłówkowa `bg-[#2a2540] h-[44px] rounded-[10px] animate-pulse` + 3 linie `h-[28px] bg-[#1f1c2e] rounded mx-[14px] animate-pulse` w środku. AddItemForm widoczny (przycisk disabled).

**Empty (brak danych):**  
Emoji 🛒 (text-5xl), tytuł "Brak produktów na liście" (text-[#e6edf3] font-bold), opis "Dodaj pierwszy produkt do listy zakupów" (text-[#6b7280]).

**Error (błąd serwera/sieci):**  
"⚠️ Nie udało się załadować listy zakupów" + "Sprawdź połączenie i spróbuj ponownie" + przycisk "Spróbuj ponownie" (bg-[#2a2540] hover:bg-[#3b3d7a]).

**Filled (normalny stan):**  
Pasek postępu (`ProgressBar`): `Kupione: N / TOTAL (XX%)` — progress bar `h-2 rounded-full bg-[#2a2540]`, fill `bg-gradient-to-r from-[#7c3aed] to-[#3b82f6]`. Poniżej accordion-y kategorii, na dole BoughtSection.

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na /home/shopping → ShoppingList montuje się → useShoppingList() triggeruje fetch
2. isLoading: true → wyświetla ShoppingListSkeleton (3 karty-szkielety)
3. Dane załadowane (isLoading: false) → renderuje AddItemForm + ProgressBar + CategoryGroup x N + BoughtSection (jeśli kupione > 0)
4. Użytkownik klika checkbox → toggleItem(id, currentIsBought) → optimistic update → karta przechodzi do BoughtSection
5. Użytkownik klika "➕ Dodaj item" → otwiera się modal AddItemForm
6. Użytkownik wypełnia "Nazwa" → przycisk "Dodaj do listy" staje się aktywny
7. Użytkownik klika "Dodaj do listy" → addItem({name, quantity, category_id}) → isPending: true → przycisk disabled "Dodawanie..."
8. Supabase zwraca sukces → modal zamknięty, produkt dodany do CategoryGroup, formularz zresetowany
9. Supabase zwraca błąd → modal pozostaje otwarty, `role="alert"`: "Nie udało się dodać produktu. Spróbuj ponownie."
10. Użytkownik klika "Wyczyść kupione" w BoughtSection → window.confirm → deleteItem() dla każdego → lista kupionych pusta
```

### Responsive / Dostępność

- Mobile (375px+): CategoryGroup ma min-height 44px na header (touch targets), ShoppingItem ma min-height 44px, AddItemForm jako bottom sheet (position: fixed, bottom: 0, border-radius 24px 24px 0 0, border-top: 1px solid #3b3d7a), FAB "+" sticky bottom-[80px] right-[16px] dla otwierania formularza
- Desktop (1280px+): AddItemForm jako centered modal (max-width: 480px), lista zajmuje pełną szerokość content area
- Keyboard navigation: Tab — checkbox → nazwa → akcje edycji/usunięcia; Escape — zamyka modal; Enter na formularzu — submit
- ARIA: checkbox ma `role="checkbox"` + `aria-checked={is_bought}` + `aria-label="Oznacz {name} jako {kupiony/niekupiony}"`, modal ma `role="dialog"` + `aria-modal="true"` + `aria-labelledby="modal-title"`, BoughtSection toggle ma `aria-expanded={isOpen}`

---

## ⚠️ Edge Cases

### EC-1: Zmiana kategorii usuwa produkt z widoku a nie z bazy
Scenariusz: Użytkownik zmienił kategorię produktu przez edycję — produkt znika z jednej CategoryGroup i pojawia w innej  
Oczekiwane zachowanie: UI aktualizuje się natychmiastowo przez re-render listy opartej na `category_id`; API call PATCH wysyłany przez `updateItem(id, { category_id: newCategoryId })`  
Komunikat dla użytkownika: Toast (sonner): "Kategoria zaktualizowana"

### EC-2: Toggle się nie powiódł — rollback optymistyczny
Scenariusz: Użytkownik kliknął checkbox, optimistic update przeniósł produkt do BoughtSection, ale API zwróciło 500  
Oczekiwane zachowanie: Produkt wraca do CategoryGroup z `is_bought: false`; checkbox nieaktywny; toast błędu  
Komunikat dla użytkownika: "Nie udało się zaznaczyć produktu. Spróbuj ponownie."

### EC-3: Realtime — inny użytkownik (Mariusz) dodaje produkt
Scenariusz: Angelika i Mariusz mają otwartą listę jednocześnie; Mariusz dodaje "Chleb"  
Oczekiwane zachowanie: Supabase real-time subscription (z STORY-4.3) wywołuje refetch/update; "Chleb" pojawia się w liście Angeliki bez odświeżania strony  
Komunikat dla użytkownika: brak (update cichosty)

### EC-4: Pusta kategoria po oznaczeniu ostatniego produktu
Scenariusz: Kategoria "🥛 Nabiał" ma 1 produkt "Mleko"; użytkownik go oznacza jako kupione  
Oczekiwane zachowanie: `CategoryGroup` dla "Nabiał" znika (activeItems.length === 0 → return null); produkt pojawia się w BoughtSection  
Komunikat dla użytkownika: brak

---

## 🚫 Out of Scope tej Story
- Edycja nazwy/ilości produktu (można to odkłada do STORY-4.7 lub osobnej story)
- Usuwanie pojedynczego produktu z listy aktywnych (tylko "Wyczyść kupione" dla bought)
- Sortowanie produktów w obrębie kategorii (drag & drop — osobna story)
- Udostępnianie listy poza household (osobny epic)
- Powiadomienia push o zmianach na liście (EPIC-2)
- Analytics: ile produktów kupiono w tym miesiącu (STORY-4.8)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter (`next lint`) bez błędów
- [ ] Katalog `src/components/home/shopping/` istnieje z 6 plikami: ShoppingList.tsx, AddItemForm.tsx, CategoryGroup.tsx, BoughtSection.tsx, ShoppingItem.tsx, AddCategoryModal.tsx
- [ ] Strona `/home/shopping` renderuje się bez `console.error`
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading: skeleton, empty: EmptyState, error: ErrorState, filled: lista kategorii)
- [ ] Toggle produktu działa z optimistic update i rollback przy błędzie
- [ ] Modal AddItemForm otwiera się, zamyka (Escape + Anuluj), wysyła dane
- [ ] Modal AddCategoryModal działa i nowa kategoria pojawia się w selectie
- [ ] BoughtSection: toggle, "Wyczyść kupione" z confirm
- [ ] Dark theme: bg #13111c, surface #1a1730, border #2a2540, accent gradient from-[#7c3aed] to-[#3b82f6]
- [ ] Widok działa na mobile 375px bez horizontal scroll (min-height 44px na elementy klikalne)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe
- [ ] Story review przez PO
