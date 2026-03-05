---
story_id: STORY-10.7
title: "Role preset apply — załaduj preset przy logowaniu danej roli"
epic: EPIC-10
module: settings
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-10.5, STORY-3.1]
blocks: []
tags: [frontend, dashboard, presets, auth, jwt, role, auto-load]
---

## 🎯 User Story

**Jako** użytkownik KiraBoard logujący się PIN-em
**Chcę** żeby dashboard automatycznie załadował układ widgetów odpowiedni dla mojej roli
**Żeby** Mariusz widział Admin Dashboard (Pipeline + AI Usage + System Health), a Angelika Home Dashboard (Shopping + Calendar + Weather) — bez ręcznej konfiguracji przy każdym logowaniu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Integracja w `_shared/hooks/useDashboard.ts` (lub equivalent hook zarządzający layoutem dashboardu).
Po pomyślnym logowaniu (JWT otrzymany) → odczytaj `role` z JWT → pobierz preset z `/api/dashboard/presets/me` → zastosuj jako aktywny layout.

### Powiązane pliki
- `_shared/hooks/useDashboard.ts` — hook zarządzający stanem widgetów dashboardu
- `_shared/hooks/useAuth.ts` — hook z JWT i rolą (STORY-3.1)
- `_shared/lib/settings-api.ts` — funkcja `getMyPreset()` → `GET /api/dashboard/presets/me`
- `_shared/context/DashboardContext.tsx` — kontekst z listą widgetów (jeśli istnieje)
- `pages/index.tsx` — strona główna (dashboard) — używa hook/kontekstu

### Stan systemu przed tą story
- STORY-10.5: `GET /api/dashboard/presets/me` działa i zwraca preset per rola
- STORY-3.1: JWT po zalogowaniu PIN-em zawiera pole `role`; `useAuth` dostarcza `{ user, isAuthenticated, role }`
- Dashboard widgety są już renderowane warunkowo (na podstawie jakiegoś stanu lub listy)

---

## ✅ Acceptance Criteria

### AC-1: Po zalogowaniu ładowany jest preset dla roli zalogowanego usera
GIVEN: Angelika (rola `family`) zalogowała się PIN-em i JWT jest ważny
WHEN: dashboard (strona główna) się ładuje
THEN: `GET /api/dashboard/presets/me` jest wywołany automatycznie
AND: widgety są wyświetlane zgodnie z presetem: Shopping List, Calendar, Weather widoczne; Pipeline, AI Usage, System Health ukryte

### AC-2: Preset Mariusza (admin) pokazuje techniczne widgety
GIVEN: Mariusz (rola `admin`) zalogował się PIN-em
WHEN: dashboard się ładuje
THEN: widgety widoczne: Pipeline Status, AI Usage, System Health; widgety ukryte: Shopping List, Calendar, Weather

### AC-3: Preset jest ładowany tylko raz przy logowaniu (nie przy każdym render)
GIVEN: Mariusz jest zalogowany i jego preset jest już załadowany
WHEN: poruszanie się po aplikacji (np. nawigacja do /settings i z powrotem do /)
THEN: `GET /api/dashboard/presets/me` NIE jest ponownie wywoływany (preset w cache/state)
AND: layout dashboardu pozostaje niezmieniony

### AC-4: Fallback gdy preset niedostępny (sieciowy błąd)
GIVEN: `GET /api/dashboard/presets/me` zwraca błąd sieciowy (timeout/500)
WHEN: dashboard się ładuje
THEN: dashboard wyświetla domyślny layout (hardcoded fallback: wszystkie widgety widoczne w domyślnej kolejności)
AND: nie ma crash ani białej strony
AND: toast "Nie udało się załadować preferencji dashboardu — wyświetlono domyślny układ" (żółty, 4s)

### AC-5: Po wylogowaniu i zalogowaniu jako inna rola — nowy preset
GIVEN: Mariusz wylogował się, a Angelika zalogowała się PIN-em
WHEN: dashboard Angeliki się ładuje
THEN: poprzedni preset Mariusza jest wyczyszczony z pamięci
AND: ładowany jest preset dla roli `family` (nie admin)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Hook: `_shared/hooks/useDashboard.ts`
Plik strony: `pages/index.tsx` (lub `app/page.tsx`)

### Logika hooka useDashboard

```typescript
// Pseudokod hooka
function useDashboard() {
  const { isAuthenticated, role } = useAuth();
  const [widgets, setWidgets]     = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setWidgets(DEFAULT_WIDGETS);  // reset przy wylogowaniu
      return;
    }

    // Pobierz preset tylko raz (gdy auth zmienia się na true)
    setLoading(true);
    getMyPreset()
      .then(preset => setWidgets(preset.widgets))
      .catch(() => {
        // fallback — DEFAULT_WIDGETS, toast warning
        toast.warning("Nie udało się załadować preferencji dashboardu — wyświetlono domyślny układ");
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);  // uruchom gdy zmienia się stan auth

  return { widgets, loading };
}
```

### Domyślny fallback layout (DEFAULT_WIDGETS)

```typescript
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { widget_id: 'pipeline_status', visible: true,  order: 1 },
  { widget_id: 'ai_usage',        visible: true,  order: 2 },
  { widget_id: 'system_health',   visible: true,  order: 3 },
  { widget_id: 'shopping_list',   visible: true,  order: 4 },
  { widget_id: 'calendar',        visible: true,  order: 5 },
  { widget_id: 'weather',         visible: true,  order: 6 },
];
```

### Komponenty

| Komponent | Typ | Kluczowe props / hooks | Stany |
|-----------|-----|------------------------|-------|
| `Dashboard` (strona) | Page | `useDashboard()` | loading, filled |
| `WidgetGrid` | Grid | `widgets: WidgetConfig[]` | - |
| Każdy widget | Widget | `visible` → renderuj lub `display: none` | visible, hidden |

### Stany widoku dashboardu

**Loading (preset się ładuje):**
Spinner lub skeleton widgetów — trwa max 2 sekundy. Widgety nie renderowane (nie flash starych danych).

**Filled:**
Widgety posortowane wg `order`, tylko te z `visible=true` są widoczne (widgety z `visible=false` są pomijane w renderze lub mają `display: none`).

**Error/Fallback:**
DEFAULT_WIDGETS — wszystkie widgety widoczne. Toast warning (żółty).

### Flow (przy logowaniu)

```
1. User wpisuje PIN → STORY-3.1 → JWT z { role: 'family' } zapisany
2. Redirect na / (dashboard)
3. useDashboard() wykrywa isAuthenticated=true → wywołuje getMyPreset()
4. Loading state → skeleton dashboardu
5. GET /api/dashboard/presets/me → 200 z preset dla family
6. setWidgets(preset.widgets) → render: Shopping(1), Calendar(2), Weather(3)
7. Pipeline, AI Usage, System Health — hidden (visible=false)
```

### Responsive / Dostępność
- Mobile (375px+): widgety w kolumnie 1 (każdy full-width)
- Desktop (1280px+): grid 2-3 kolumn (zgodnie z istniejącym layoutem)
- Widgety z visible=false: nie renderowane (nie `display:none` — nie zajmują miejsca)
- ARIA: brak specjalnych wymagań dla tej story (logika load, nie UI)

---

## ⚠️ Edge Cases

### EC-1: JWT wygasł podczas ładowania presetu
Scenariusz: GET /api/dashboard/presets/me zwraca 401 (token wygasł)
Oczekiwane zachowanie: `useAuth` wykrywa 401 → wylogowanie → redirect do strony logowania; dashboard nie jest wyświetlany

### EC-2: Użytkownik otwiera dashboard w nowej zakładce przeglądarki (SSR/SSG)
Scenariusz: JWT jest w cookie/localStorage → nowa zakładka ładuje / → hydration
Oczekiwane zachowanie: `useDashboard` wywołuje GET /api/dashboard/presets/me przy hydration → preset załadowany poprawnie

### EC-3: Preset zmieniony przez admina podczas sesji innego usera
Scenariusz: Mariusz edytuje preset `family` przez PresetEditor (STORY-10.6) podczas gdy Angelika jest zalogowana
Oczekiwane zachowanie: Angelika widzi stary preset do wylogowania — preset jest ładowany raz przy logowaniu, bez live-sync (akceptowalny UX dla MVP)

---

## 🚫 Out of Scope tej Story
- Live-sync presetów (real-time update podczas sesji) — future
- Indywidualne presety per user (override roli) — future
- Możliwość zmiany presetu przez usera z UI dashboardu — future (drag & drop na dashboardzie)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] GET /api/dashboard/presets/me wywołany przy każdym logowaniu (zmiana isAuthenticated na true)
- [ ] Preset nie jest ponownie pobierany przy nawigacji (cache w state)
- [ ] Po wylogowaniu state wraca do DEFAULT_WIDGETS
- [ ] Widgety renderowane zgodnie z `visible` i posortowane wg `order`
- [ ] Fallback (DEFAULT_WIDGETS + toast) gdy API niedostępne
- [ ] 401 z API → wylogowanie → redirect
- [ ] Brak flash starych danych podczas ładowania
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Story review przez PO
