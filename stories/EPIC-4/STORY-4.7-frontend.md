---
story_id: STORY-4.7
title: "Activity feed — ostatnie Bridge eventy + family actions"
epic: EPIC-4
module: home
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 3h
depends_on: [STORY-2.2]
blocks: []
tags: [react, activity-feed, sse, polling, family, events]
---

## 🎯 User Story

**Jako** Angelika lub Mariusz zalogowani na Home Dashboard
**Chcę** widzieć feed ostatnich aktywności rodzinnych i systemowych (zakupy, zadania, pipeline)
**Żeby** być na bieżąco co się dzieje w domu i w projekcie Kira bez otwierania osobnych sekcji

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: `/home` (sekcja Activity Feed)
Komponent: `pages/home/components/ActivityFeed.tsx`
Hook: `pages/home/hooks/useActivityFeed.ts`
Dane: polling `GET /api/home/activity` co 30s lub SSE z EPIC-2

### Powiązane pliki
- `pages/home/components/ActivityFeed.tsx` — komponent feedu
- `pages/home/hooks/useActivityFeed.ts` — polling lub SSE subscription
- `_shared/lib/home-api.ts` — API client
- `_shared/hooks/useSSE.ts` (STORY-2.2) — SSE hook jeśli dostępny

### Stan systemu przed tą story
- STORY-2.2: hook `useSSE` dostępny, Bridge SSE stream działa
- Tabela `kb_activity_log` istnieje (EPIC-0) z polami: `id`, `type`, `message`, `actor`, `role`, `created_at`
- Endpoint `GET /api/home/activity` istnieje (STORY-4.3 backend) — zwraca ostatnie 20 wpisów

---

## ✅ Acceptance Criteria

### AC-1: Feed pokazuje ostatnie 20 eventów
GIVEN: W `kb_activity_log` są wpisy różnych typów (shopping, task, pipeline, nightclaw)
WHEN: Angelika otwiera Home Dashboard i scrolluje do Activity Feed
THEN: Widzi maksymalnie 20 ostatnich eventów posortowanych od najnowszego do najstarszego
AND: Każdy event ma: czas (relatywny: "przed chwilą", "5 min temu", "wczoraj 14:30"), ikonę/emoji i opis w języku polskim

### AC-2: Filtrowanie eventów według roli użytkownika
GIVEN: Zuza (role: home) i Mariusz (role: admin) patrzą na Activity Feed
WHEN: Oboje mają otwartą stronę Home
THEN: Zuza NIE widzi eventów typu `pipeline` (story_started, story_done) ani `nightclaw`
AND: Mariusz widzi WSZYSTKIE typy eventów
AND: Angelika (home_plus) widzi: shopping, task, pipeline — NIE widzi nightclaw

### AC-3: Automatyczne odświeżanie (polling 30s lub SSE)
GIVEN: Angelika ma otwartą stronę Home z Activity Feed
WHEN: Mariusz dodaje produkt do Shopping List (nowy event pojawia się w `kb_activity_log`)
THEN: W ciągu 30 sekund (polling) lub natychmiast (SSE) feed Angeliki aktualizuje się
AND: Nowy event pojawia się na górze listy z animacją slide-in

### AC-4: Typy eventów z czytelnym opisem po polsku
GIVEN: Feed zawiera różne typy eventów
WHEN: Angelika patrzy na feed
THEN: Shopping event: "🛒 Angelika dodała Mleko do listy zakupów"
AND: Task event: "✅ Zuza oznaczyła Odkurzanie jako Done"
AND: Pipeline event (tylko dla admin/home_plus): "🤖 Kira zakończyła STORY-3.2"
AND: Family event (generic): "👨‍👩‍👧 Mariusz zalogował się do systemu"

### AC-5: Stan ładowania i błędu
GIVEN: API `/api/home/activity` jest niedostępne
WHEN: Hook próbuje pobrać dane
THEN: Widoczny jest spinner/skeleton przez czas ładowania
AND: Przy błędzie API wyświetla się komunikat "Nie udało się załadować aktywności" bez crashowania reszty Dashboard

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/home` (sekcja po prawej stronie lub poniżej Shopping/Kanban)
Komponent: `ActivityFeed`
Plik: `pages/home/components/ActivityFeed.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| ActivityFeed | Section | `userRole`, `maxItems=20` | loading, empty, error, filled |
| ActivityItem | List item | `event` (type, message, actor, created_at) | default, new (animacja) |

### Mapowanie typów eventów → opis

```typescript
const EVENT_ICONS: Record<string, string> = {
  shopping_added:   '🛒',
  shopping_bought:  '✓',
  shopping_deleted: '🗑️',
  task_created:     '📋',
  task_done:        '✅',
  task_moved:       '↔️',
  story_started:    '🤖',  // tylko admin, home_plus
  story_done:       '🎉',  // tylko admin, home_plus
  nightclaw_run:    '🌙',  // tylko admin
  user_login:       '👤',
  default:          '📌',
};

// Filtr per rola:
const ROLE_VISIBLE_EVENTS = {
  home:      ['shopping_*', 'task_*', 'user_login'],
  home_plus: ['shopping_*', 'task_*', 'story_*', 'user_login'],
  admin:     ['*'],  // wszystkie
};
```

### Stany widoku

**Loading:**
3-5 skeleton wierszy — szary prostokąt (ikona) + 2 linie tekstu, animacja pulse.

**Empty (brak eventów):**
Tekst "Brak aktywności — zacznij od dodania produktu do listy zakupów 🛒".

**Error (błąd API):**
Komunikat "Nie udało się załadować aktywności. Spróbuj ponownie." + mały przycisk "↻ Odśwież".

**Filled (normalny stan):**
Lista eventów z ikoną, opisem po polsku, relatywnym czasem. Najnowszy na górze.

### Flow interakcji

```
1. Komponent mountuje → useActivityFeed hook wywołuje GET /api/home/activity
2. Loading: skeleton widoczny
3. Dane załadowane → lista eventów wyrenderowana, zapisany timestamp ostatniego fetcha
4. Polling: co 30s GET /api/home/activity → jeśli są nowe eventy (nowszy created_at niż ostatni znany)
   → nowe eventy dodawane na górze listy z animacją slide-in (np. framer-motion lub CSS transition)
5. SSE (jeśli STORY-2.2 gotowe): nasłuchuje event 'activity_update' z useSSE hook
   → nowy event natychmiast dodawany na górze listy
6. Filtrowanie po roli: przed renderowaniem filtruj eventy przez ROLE_VISIBLE_EVENTS
7. Max 20 eventów: lista trimuje się do 20 po dodaniu nowych
```

### Responsive / Dostępność
- Mobile (375px+): sekcja pod Shopping i Kanban; max-height: 300px z overflow-y scroll; każdy event to 1 wiersz (44px min)
- Tablet (768px+): panel boczny lub sekcja w grid layoutu
- Desktop (1280px+): sidebar panel "Aktywność rodziny" po prawej stronie
- ARIA: `role="log"` na liście eventów (semantyczny odpowiednik dla live feed), `aria-live="polite"` na kontenerze, `aria-label="Feed aktywności rodziny"`

---

## ⚠️ Edge Cases

### EC-1: Bridge SSE niedostępny (STORY-2.2 nie wdrożona)
Scenariusz: SSE nie działa — fallback na polling
Oczekiwane zachowanie: `useActivityFeed` automatycznie wykrywa brak SSE → włącza polling co 30s bez błędu dla użytkownika

### EC-2: Bardzo dużo eventów w `kb_activity_log` (tysiące wpisów)
Scenariusz: Po miesiącach użytkowania w bazie jest 10 000 eventów
Oczekiwane zachowanie: API zawsze zwraca tylko 20 najnowszych (ORDER BY created_at DESC LIMIT 20) — brak problemu z wydajnością

---

## 🚫 Out of Scope tej Story
- Paginacja lub "załaduj więcej" — EPIC-4 v2
- Filtrowanie per typ eventu przez użytkownika (manual filters) — przyszła feature
- Push notifications na telefon — EPIC-9 (NightClaw) lub poza scope
- Home Analytics (wykresy) — STORY-4.9

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Filtrowanie po roli działa (Zuza nie widzi pipeline eventów)
- [ ] Polling co 30s lub SSE aktualizuje feed
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Opisy eventów po polsku z właściwymi ikonami emoji
- [ ] Story review przez PO
