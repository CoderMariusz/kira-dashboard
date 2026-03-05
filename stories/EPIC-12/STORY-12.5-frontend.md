---
story_id: STORY-12.5
title: "Sync status widget — online/offline indicator, last sync time, realtime badge"
epic: EPIC-12
module: sync
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
ux_reference: none
api_reference: /api/sync/status
priority: should
estimated_effort: 3h
depends_on: [STORY-12.2, STORY-2.2]
blocks: []
tags: [widget, status, realtime, sse, frontend, react, indicator]
---

## 🎯 User Story

**Jako** Mariusz (Admin) patrząc na KiraBoard
**Chcę** widzieć status synchronizacji z Supabase i połączenia SSE w jednym małym widgecie
**Żeby** od razu wiedzieć czy dane są aktualne i czy Realtime działa

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Route: Widoczny globalnie — w nagłówku lub footer layoutu (`app/layout.tsx` lub `_shared/components/`)
Komponent: `SyncStatusWidget`
Plik: `app/_shared/components/SyncStatusWidget.tsx`

### Powiązane pliki
- `app/_shared/hooks/useSSE.ts` lub odpowiednik (STORY-2.2) — SSE connection state
- `/api/sync/status` endpoint (STORY-12.2) — polling
- `app/_shared/components/` — katalog shared komponentów

### Stan systemu przed tą story
- SSE klient działa (STORY-2.2) — hook udostępnia `connected: boolean` i listens do eventów
- `/api/sync/status` endpoint istnieje i zwraca `status`, `lagSeconds`, `lastSync` (STORY-12.2)
- Layout aplikacji ma miejsce na globalny widget (header/footer)

---

## ✅ Acceptance Criteria

### AC-1: Wskaźnik online/offline
GIVEN: Użytkownik jest na dowolnej stronie KiraBoard
WHEN: SSE połączenie jest aktywne (heartbeat OK)
THEN: Widget pokazuje zielona kropka + tekst "Live" (lub ikonę ✓)
WHEN: SSE połączenie jest rozłączone (STORY-2.2 reconnecting)
THEN: Widget pokazuje szara/czerwona kropka + tekst "Offline" lub "Connecting..."

### AC-2: Czas ostatniej synchronizacji
GIVEN: Sync engine działa (STORY-12.2)
WHEN: Widget renderuje się
THEN: Wyświetla "Sync: 45s ago" (lub "Sync: 2m ago", "Sync: just now" jeśli < 10s)
AND: Czas aktualizuje się co 30 sekund (polling `/api/sync/status`) lub przy SSE evencie

### AC-3: Status sync (ok/degraded/error)
GIVEN: `/api/sync/status` zwraca `status: "degraded"` (lag > 5 min)
WHEN: Widget polling odpytuje endpoint
THEN: Widget zmienia kolor na żółty/pomarańczowy i pokazuje "Sync delayed"
GIVEN: `/api/sync/status` zwraca `status: "error"` (lag > 10 min)
THEN: Widget zmienia kolor na czerwony i pokazuje "Sync error"

### AC-4: Realtime badge gdy odebrany event
GIVEN: Widget jest widoczny
WHEN: SSE event (`shopping_update` lub `task_update`) zostaje odebrany
THEN: Widget przez 2 sekundy pokazuje animowany puls/flash "↑ Live update" — wizualne potwierdzenie że Realtime działa
AND: Po 2 sekundach wraca do normalnego stanu

### AC-5: Tooltip z detalami
GIVEN: Użytkownik hover nad widgetem
WHEN: Tooltip się pojawia
THEN: Tooltip zawiera szczegóły:
- "SSE: Connected / Disconnected"
- "Last sync: [dokładny timestamp ISO]"
- "Synced tables: bridge_stories, kb_shopping_items, ..."
- "Lag: 45s"

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: Globalny (nagłówek lub status bar u dołu)
Komponent: `SyncStatusWidget`
Plik: `app/_shared/components/SyncStatusWidget.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| SyncStatusWidget | status bar | `compact?: boolean` | online/offline/degraded/error/live-flash |
| StatusDot | indicator dot | `status: 'ok'\|'degraded'\|'error'\|'offline'` | colored dot z CSS animation |
| SyncTooltip | tooltip | `syncData: SyncStatus` | hover overlay |

### Stany widoku

**Loading (initial fetch):**
Mała szara kropka + tekst "Checking..." (spinner opcjonalny)

**Online + ok:**
Zielona kropka (pulsująca animacja co 3s) + "Live · Sync: 45s ago"

**Online + degraded:**
Żółta kropka + "Sync delayed · 8m ago"

**Online + error:**
Czerwona kropka + "Sync error · 15m ago"

**Offline (SSE disconnected):**
Szara kropka + "Offline · Reconnecting..." (animowany)

**Live flash (po odebranym event):**
Zielona kropka + tekst "↑ Live update" przez 2s, potem powrót

### Flow interakcji (krok po kroku)

```
1. Komponent montuje się → natychmiast fetch GET /api/sync/status
2. Dane załadowane → render odpowiedniego stanu (ok/degraded/error)
3. Co 30 sekund → refresh GET /api/sync/status
4. SSE hook emituje event connected/disconnected → widget aktualizuje dot
5. SSE hook emituje `shopping_update` lub `task_update` → 2s flash "↑ Live update"
6. Użytkownik hover → pojawia się tooltip z detalami
7. Okno traci focus → polling pauzuje (visibility API), wznawia po powrocie
```

### Responsive / Dostępność
- Mobile (375px+): tylko icon-dot bez tekstu (compact mode) — tooltip na long-press
- Tablet (768px+): dot + krótki tekst "Live" lub "Sync: 2m ago"
- Desktop (1280px+): pełny tekst "Live · Sync: 45s ago" + hover tooltip
- Keyboard navigation: focusable, Enter otwiera tooltip; Escape zamyka
- ARIA: `role="status"`, `aria-label="Sync status: live, last synced 45 seconds ago"`

---

## ⚠️ Edge Cases

### EC-1: /api/sync/status niedostępny (serwer down)
Scenariusz: Fetch do `/api/sync/status` zwraca network error lub 500
Oczekiwane zachowanie: Widget pokazuje szara kropka + "Status unavailable"; nie crashuje aplikacji; retry po 60s
Komunikat dla użytkownika: (w tooltipie) "Cannot reach sync status endpoint"

### EC-2: SSE połączone ale bez eventów przez >5 min
Scenariusz: Supabase Realtime nie emituje nic — może być problem
Oczekiwane zachowanie: Widget nie wie o tym — pokazuje normalny stan; `/api/sync/status` jest source of truth dla sync health
Komunikat dla użytkownika: Brak (degraded pojawi się przez `/api/sync/status` polling)

### EC-3: Widget na mobile — tooltip nie pojawia się na hover
Scenariusz: Mobile nie ma hover — tooltip niedostępny
Oczekiwane zachowanie: Kliknięcie/tap na widget otwiera modal/sheet z pełnymi detalami; lub disabled (tylko compact dot)
Komunikat dla użytkownika: Brak (info dostępna przez Settings/Admin)

---

## 🚫 Out of Scope tej Story
- Historia sync logów w UI (osobny admin panel — przyszły epic)
- Push notifications gdy sync error (osobna story)
- Możliwość manualnego triggera sync z UI (przyszły epic)
- Szczegółowe per-table status w UI (tylko summary)

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 stany widoku zaimplementowane: online/offline/degraded/error
- [ ] Live flash działa gdy SSE event odebrany (2s animacja)
- [ ] Polling `/api/sync/status` co 30s (pauzuje gdy niewidoczny — visibility API)
- [ ] Tooltip z detalami na hover (desktop) i tap (mobile)
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] `aria-label` dynamicznie opisuje aktualny status
- [ ] Brak console.error podczas normalnego użytkowania
- [ ] Brak crashy gdy `/api/sync/status` niedostępny
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Story review przez PO
