---
epic_id: EPIC-2
title: "Dashboard v2: Real-time + Write Operations"
module: dashboard
status: draft
priority: must
estimated_size: L
risk: medium
---

## 📋 OPIS

EPIC-15 rozbudowuje dashboard Kira o komunikację w czasie rzeczywistym (SSE) oraz operacje zapisu — użytkownik nie tylko widzi pipeline, ale może aktywnie nim zarządzać z poziomu UI. Dodaje system notyfikacji, filtrowanie pipeline view, pełną stronę Story Detail oraz możliwość triggerowania eval runów i zarządzania story lifecycle bezpośrednio z dashboardu. Dashboard przestaje być pasywnym monitorem i staje się centrum kontroli pipeline'u.

## 🎯 CEL BIZNESOWY

Mariusz zarządza pipeline'm (start/advance story, trigger eval) bezpośrednio z dashboardu — bez przełączania do CLI/WhatsApp — a zmiany stanu pojawiają się w UI w < 3 sekundy dzięki SSE.

## 👤 PERSONA

**Mariusz (Admin)** — jedyny użytkownik pipeline dashboard. Potrzebuje natychmiastowego feedbacku o zmianach stanu stories, możliwości startu i przesuwania stories z UI, oraz triggerowania eval runów bez otwierania terminala. Chce widzieć live updates podczas aktywnej sesji pipeline'u.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-14: Dashboard foundation — podstawowy UI, Bridge API client, wszystkie widoki read-only
- Bridge API: endpointy `POST /api/projects/switch`, `GET /api/status/*` — wymagane do write operations

### Blokuje (ten epic odblokowuje):
- EPIC-16: Auth + Multi-User — write operations wymagają RBAC (kto może startować stories)
- EPIC-17: Home Dashboard Integration — notifications/toast system reuse

## 📦 ZAKRES (In Scope)

- **SSE (Server-Sent Events) dla live updates** — Bridge API emituje eventy state change, dashboard subskrybuje i aktualizuje UI bez pollingu; fallback do polling 30s gdy SSE niedostępne
- **Write operations: Start/Advance story** — przyciski "Start Story" (READY→IN_PROGRESS) i "Advance" (IN_PROGRESS→REVIEW→DONE) wywołujące Bridge CLI przez dedykowany backend endpoint
- **Trigger eval run z UI** — przycisk "Run Eval Now" w Eval panel wywołuje `bridge eval run` i wyświetla progress/wynik
- **Story Detail page** — pełna strona `/story/[id]` z metadata, DoD, lista runów, lekcje, timeline, akcje (advance/retry); zastępuje modal z EPIC-14
- **Notifications/toast system** — toast notifications (shadcn/sonner) dla state changes: story started, review complete, failure detected, eval finished
- **Filtrowanie i search w pipeline view** — filtr po statusie (IN_PROGRESS/REVIEW/REFACTOR/DONE), model, projekcie; text search po story ID i tytule
- **Optimistic UI dla write operations** — natychmiastowa zmiana stanu w UI z rollback przy błędzie

## 🚫 POZA ZAKRESEM (Out of Scope)

- **WebSocket (pełny duplex)** — SSE wystarczy dla jednokierunkowego strumienia eventów; WebSocket niepotrzebny
- **Tworzenie nowych stories/epiców z UI** — tylko operacje na istniejących (start, advance); tworzenie przez CLI/WhatsApp
- **Mobile responsive** — desktop-first; responsywność w osobnym epicu
- **Batch operations** — masowe startowanie/przesuwanie stories; pojedyncze operacje wystarczą dla MVP

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Zmiana stanu story w Bridge pojawia się w dashboardzie w < 5 sekund bez ręcznego odświeżania
- [ ] Użytkownik może kliknąć "Start Story" na READY story i widzi natychmiastową zmianę stanu w pipeline view
- [ ] Kliknięcie "Run Eval" triggeruje eval run w Bridge i wyświetla toast z wynikiem po zakończeniu
- [ ] Story Detail page (`/story/[id]`) wyświetla pełne dane: metadata, runów historię, lekcje i timeline
- [ ] Pipeline view pozwala filtrować po statusie i szukać po ID/tytule — wyniki aktualizują się natychmiast
- [ ] System toast notifications informuje o zmianach stanu bez potrzeby patrzenia na pipeline view

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-2.1 | backend | SSE endpoint w Next.js — Bridge event stream proxy | Endpoint `/api/events` jako SSE proxy do Bridge event stream z reconnect logic i heartbeat co 15s |
| STORY-2.2 | backend | Write operations API — start/advance story endpoints | Endpointy `POST /api/stories/[id]/start` i `POST /api/stories/[id]/advance` wywołujące Bridge CLI z walidacją stanu |
| STORY-2.3 | backend | Eval trigger endpoint — run eval z UI | Endpoint `POST /api/eval/run` triggerujący `bridge eval run` z progress tracking i zwracający wynik |
| STORY-2.4 | wiring | SSE client hook + write operation services | Hook `useSSE()` z auto-reconnect, `useStoryActions()` z optimistic updates i rollback, typy eventów SSE |
| STORY-2.5 | frontend | Toast notification system — Sonner integration | Globalny system notyfikacji z Sonner: toast dla story state changes, eval results, errors; konfiguracja severity levels |
| STORY-2.6 | frontend | Story Detail page — pełna strona `/story/[id]` | Strona z metadata, DoD, timeline runów, wyekstrahowane lekcje, action buttons (Start/Advance/Retry), breadcrumb navigation |
| STORY-2.7 | frontend | Pipeline view v2 — filtrowanie, search, live updates | Rozbudowa pipeline view: filter bar (status/model/project), search input, live SSE updates, optimistic UI dla akcji |
| STORY-2.8 | frontend | Eval panel v2 — trigger run + progress indicator | Rozbudowa eval panel: przycisk "Run Eval Now" z loading state, progress bar, wynik inline + toast notification |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | dashboard |
| Priorytet | Must |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Średnie — SSE wymaga Bridge-side event emission (może wymagać nowego endpointu w Bridge) |
| Domeny | backend, wiring, frontend |
| Stack | Next.js 16, shadcn/ui, Sonner, Tailwind CSS, TypeScript |
| DB | Brak własnej — dane z Bridge API |
| Bridge API | http://localhost:8199 + nowe SSE endpoint (do potwierdzenia) |
| Uwagi | SSE fallback do polling zapewnia działanie bez modyfikacji Bridge API. Write operations wymagają bridge.cli dostępnego na serwerze Next.js. |
