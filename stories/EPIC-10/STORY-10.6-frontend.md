---
story_id: STORY-10.6
title: "Dashboard preset editor — drag & drop widget order per rola"
epic: EPIC-10
module: settings
domain: frontend
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: should
estimated_effort: 6h
depends_on: [STORY-10.5]
blocks: []
tags: [frontend, dashboard, presets, dnd-kit, drag-drop, admin, ui]
---

## 🎯 User Story

**Jako** administrator KiraBoard (Mariusz)
**Chcę** móc edytować układ widgetów per rola przez interfejs drag & drop w Settings
**Żeby** bez edytowania bazy danych dostosować co widzi admin, family i guest na swoim dashboardzie

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/settings` → zakładka "Dashboard Presets"
Komponent: `PresetEditor`
Plik: `components/settings/PresetEditor.tsx`

Strona Settings jest dostępna tylko dla roli `admin` (guard z STORY-3.3).
PresetEditor używa `@dnd-kit/core` + `@dnd-kit/sortable` do reorderu widgetów.

### Powiązane pliki
- `components/settings/PresetEditor.tsx` — główny komponent editora
- `components/settings/SortableWidget.tsx` — pojedynczy widget w liście drag & drop
- `_shared/lib/settings-api.ts` — funkcja `updatePreset(role, widgets)`
- `_shared/types/dashboard.ts` — typy `DashboardPreset`, `WidgetConfig`
- `pages/settings/index.tsx` — strona Settings (integracja zakładki)

### Stan systemu przed tą story
- STORY-10.5: `GET /api/dashboard/presets` i `POST /api/dashboard/presets/:role` działają
- `@dnd-kit/core` i `@dnd-kit/sortable` zainstalowane w projekcie
- shadcn/ui: `Tabs`, `Card`, `Button`, `Badge`, `Switch` dostępne

---

## ✅ Acceptance Criteria

### AC-1: PresetEditor ładuje i wyświetla presety dla 3 ról
GIVEN: Mariusz (admin) jest na `/settings`, zakładce "Dashboard Presets"
WHEN: strona się załaduje
THEN: widzi 3 sekcje (lub zakładki): Admin, Family, Guest — każda z listą widgetów z ikonką drag handle i switchem visible/hidden

### AC-2: Zmiana kolejności przez drag & drop działa
GIVEN: Mariusz jest w sekcji "Admin", lista widgetów: [Pipeline(1), AI Usage(2), System Health(3), ...]
WHEN: chwyci "AI Usage" za uchwyt i przeciągnie nad "Pipeline"
THEN: lista aktualizuje się natychmiast — "AI Usage" jest na pozycji 1, "Pipeline" na 2
AND: kolejność jest wizualnie poprawna (animacja smooth)

### AC-3: Toggle widoczności widgetu działa
GIVEN: Mariusz jest w sekcji "Family", widget "Pipeline Status" ma `visible=false`
WHEN: kliknie switch przy "Pipeline Status"
THEN: switch zmienia stan na `true`, widget jest oznaczony jako widoczny (np. bez opacity 50%)

### AC-4: Przycisk Zapisz wysyła zaktualizowany preset do API
GIVEN: Mariusz zmienił kolejność i widoczność widgetów w sekcji "Admin"
WHEN: kliknie przycisk "Zapisz preset Admin"
THEN: `POST /api/dashboard/presets/admin` jest wywołany z poprawną tablicą `widgets` (order i visible zgodne z UI)
AND: toast "Preset Admin zapisany" pojawia się na 3 sekundy
AND: przycisk "Zapisz" jest disabled podczas zapisu (spinner)

### AC-5: Błąd API podczas zapisu jest obsługiwany
GIVEN: serwer zwraca 500 przy POST /api/dashboard/presets/admin
WHEN: Mariusz kliknie "Zapisz preset Admin"
THEN: toast "Błąd zapisu presetu. Spróbuj ponownie." (czerwony)
AND: stan UI wraca do wartości przed próbą zapisu

### AC-6: Każda rola ma niezależny stan edycji
GIVEN: Mariusz edytuje preset "Admin" (bez zapisania) i przełączy na zakładkę "Family"
WHEN: wróci do zakładki "Admin"
THEN: zmiany w "Admin" są nadal niezapisane i widoczne w UI (lokalny stan nie jest resetowany przy zmianie zakładki)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/settings` → Tab "Dashboard Presets"
Komponent: `PresetEditor` (wewnątrz `SettingsPage`)
Plik: `components/settings/PresetEditor.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `PresetEditor` | Container | `presets: DashboardPreset[]` | loading, error, idle, saving |
| `RolePresetPanel` | Panel per rola | `role`, `widgets`, `onChange`, `onSave` | idle, dirty (niezapisane zmiany), saving |
| `SortableWidgetList` | dnd-kit SortableContext | `widgets`, `onReorder`, `onToggle` | - |
| `SortableWidget` | dnd-kit useSortable | `widget`, `onToggle` | dragging, visible, hidden |

### Struktura dnd-kit

```tsx
// Struktura komponentów
<DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
  <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
    {widgets.map(w => (
      <SortableWidget key={w.widget_id} widget={w} onToggle={handleToggle} />
    ))}
  </SortableContext>
</DndContext>
```

Każdy `SortableWidget` używa `useSortable({ id: widget.widget_id })` i renderuje:
- `GripVertical` ikona (chwyt drag)
- Nazwa widgetu (user-friendly, np. "Status Pipeline" zamiast `pipeline_status`)
- Switch (shadcn) → visible/hidden
- Opacity 50% gdy `visible=false` (wizualna różnica)

### Mapowanie widget_id → nazwy wyświetlane

```typescript
const WIDGET_LABELS: Record<string, string> = {
  pipeline_status: "Status Pipeline",
  ai_usage:        "Zużycie AI",
  system_health:   "Zdrowie Systemu",
  shopping_list:   "Lista Zakupów",
  calendar:        "Kalendarz",
  weather:         "Pogoda",
};
```

### Stany widoku

**Loading:**
3 panele (Admin/Family/Guest) z skeletonami — każdy: tytuł skeleton + 6 wierszy skeleton listy

**Error (błąd GET /api/dashboard/presets):**
Komunikat "Nie udało się załadować presetów dashboardu." + przycisk "Spróbuj ponownie"

**Filled — bez zmian (idle):**
3 zakładki. Aktywna zakładka: lista widgetów z drag handles, switche. Przycisk "Zapisz preset [Rola]" disabled lub z oznaczeniem "Brak zmian".

**Filled — z niezapisanymi zmianami (dirty):**
Przycisk "Zapisz preset [Rola]" jest aktywny, zakładka ma badge "●" informujący o niezapisanych zmianach.

**Saving:**
Przycisk "Zapisz preset [Rola]" → spinner + "Zapisywanie…", lista widgetów disabled (pointer-events: none).

### Flow interakcji (krok po kroku)

```
1. Mariusz wchodzi na /settings → Tab "Dashboard Presets"
2. GET /api/dashboard/presets → skeleton → załadowane presety dla 3 ról
3. Mariusz wybiera zakładkę "Family"
4. Chwyci widget "Pipeline Status" za uchwyty → przeciągnie na dół listy
5. Lista aktualizuje się animowanie → order zmieniony lokalnie
6. Mariusz włącza switch "Pogoda" (visible: false → true)
7. Przycisk "Zapisz preset Family" staje się aktywny (dirty state)
8. Mariusz klika "Zapisz preset Family" → spinner, lista disabled
9. POST /api/dashboard/presets/family → 200 OK
10. Toast "Preset Family zapisany" (zielony, 3s), przycisk wraca do "Brak zmian"
```

### Responsive / Dostępność
- Mobile (375px+): lista widgetów w pełnej szerokości, drag & drop działa na touch (dnd-kit wspiera touch)
- Desktop (1280px+): max-width 600px dla panelu presetów
- Keyboard navigation: drag & drop NIE musi działać przez klawiaturę (nice-to-have); Tab → Switch → Space toggle
- ARIA: każdy SortableWidget ma `aria-label="Przesuń [nazwa widgetu]"` na uchwycie
- Drag handle: `role="button"` z `aria-label` i `tabIndex={0}`

---

## ⚠️ Edge Cases

### EC-1: Drag na to samo miejsce (brak zmiany kolejności)
Scenariusz: Mariusz chwyci widget i upuści go z powrotem na tę samą pozycję
Oczekiwane zachowanie: `onDragEnd` wykrywa brak zmiany (`active.id === over.id` lub ten sam index) → stan nie jest oznaczony jako dirty, przycisk "Zapisz" pozostaje nieaktywny

### EC-2: Jednoczesne zapisywanie dwóch ról
Scenariusz: Mariusz modyfikuje preset Admin i Family, klika "Zapisz Admin" a zanim odpowiedź wróci klika "Zapisz Family"
Oczekiwane zachowanie: każdy panel ma niezależny stan saving — oba zapisania mogą działać równolegle; każdy pokazuje własny spinner i toast

### EC-3: Brak widgetów w presecie (edge case danych)
Scenariusz: API zwraca `widgets: []` dla jednej z ról (zepsuty rekord w bazie)
Oczekiwane zachowanie: panel dla tej roli pokazuje komunikat "Brak widgetów — preset pusty" z przyciskiem "Resetuj do domyślnych" (POST z seed widgetami dla tej roli)

### EC-4: Wyłączenie wszystkich widgetów (visible=false)
Scenariusz: Mariusz wyłączy wszystkie switche dla roli "Guest"
Oczekiwane zachowanie: UI pozwala to zrobić (nie blokuje), ale przy zapisie pojawia się warning toast "Uwaga: żaden widget nie będzie widoczny dla roli Guest" — zapis nadal przechodzi

---

## 🚫 Out of Scope tej Story
- Ładowanie presetu po logowaniu — to STORY-10.7
- Presety per użytkownik (indywidualna customizacja) — future
- Dodawanie nowych widget_id przez UI — future
- Undo/redo historii zmian — future

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] dnd-kit działa — drag & drop reorderuje listę z animacją
- [ ] Toggle visible/hidden zmienia wygląd wiersza (opacity 50% dla hidden)
- [ ] Dirty state (niezapisane zmiany) oznaczony na zakładce
- [ ] Przycisk "Zapisz" → spinner → toast sukcesu / błędu
- [ ] Każda rola ma niezależny stan edycji
- [ ] EC-1 (drag bez zmiany) nie oznacza dirty
- [ ] EC-3 (pusta lista) wyświetla komunikat z przyciskiem reset
- [ ] EC-4 (wszystkie hidden) wyświetla warning toast (nie blokuje)
- [ ] Widok działa na mobile 375px (touch drag)
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Komunikaty po polsku
- [ ] Story review przez PO
