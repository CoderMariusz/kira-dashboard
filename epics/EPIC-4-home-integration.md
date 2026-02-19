---
epic_id: EPIC-4
title: "Home Dashboard Integration"
module: home
status: draft
priority: should
estimated_size: L
risk: low
---

## 📋 OPIS

EPIC-4 integruje komponenty ze starego projektu kira-dashboard (teraz w `archive/`) do nowego dashboardu — tworząc widok Home Dashboard dla rodziny. Obejmuje listę zakupów, kanban board zadań domowych, feed aktywności, analytics i zarządzanie household. Cel: jeden dashboard, dwa widoki — Pipeline (Mariusz, ADMIN) i Home (Angelika, HELPER+; Zuza/Iza, HELPER).

## 🎯 CEL BIZNESOWY

Angelika otwiera dashboard i w jednym widoku widzi listę zakupów, zadania domowe i aktywność rodziny — bez instalowania osobnej aplikacji.

## 👤 PERSONA

**Angelika (HELPER+)** — zarządza domem: lista zakupów, zadania do wykonania, planowanie. Potrzebuje jednego miejsca z przeglądem wszystkiego. Nie interesuje ją pipeline developerski.
**Zuza / Iza (HELPER)** — nastolatki, sprawdzają swoje zadania i listę zakupów. Prosty, szybki widok.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-1: Dashboard foundation — layout, sidebar, routing
- EPIC-3: Auth + RBAC — role-based routing do widoku Home, Supabase auth
- Supabase DB: tabele z archive/ (shopping_items, tasks, activity_log, households) — migracja lub reuse

### Blokuje (ten epic odblokowuje):
- Brak — to finalny epic w roadmapie v1

## 📦 ZAKRES (In Scope)

- **Shopping List** — migracja komponentów z `archive/src/components/shopping/` (ShoppingList, AddItemForm, CategoryGroup, BoughtSection, ShoppingItem, AddCategoryModal); Supabase real-time subscriptions na shopping_items
- **Kanban Tasks Board** — migracja z `archive/src/components/kanban/` (Board, Column, TaskCard, TaskModal, TaskForm, QuickAddTask, FilterSidebar, drag & drop); per-user task filtering
- **Activity Feed** — migracja z `archive/src/components/activity/` (ActivityFeed, ActivityItem, ActivityAvatar, ActivityFilters); pokazuje zmiany w shopping/tasks/household
- **Home Analytics** — migracja z `archive/src/components/analytics/` (ShoppingChart, CompletionChart, PriorityChart, ActivityHeatmap, OverviewCards); widoczne dla ADMIN i HELPER+
- **Household Management** — migracja z `archive/src/components/household/` (HouseholdMembers, InviteForm, PendingInvites); zarządzanie członkami rodziny
- **Home Overview page** — strona `/home` jako landing page dla HELPER+: summary cards (pending tasks, shopping items, recent activity) z quick links do sekcji
- **Supabase tables migration** — migracja/weryfikacja tabel z archive/ do nowego projektu Supabase; schema alignment z nowymi rolami

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Kalendarz / planner** — nie istnieje w archive/; osobny epic w przyszłości
- **Push notifications (mobile)** — PWA push w osobnym epicu; na razie in-app toasts (z EPIC-2)
- **Redesign komponentów Home** — reuse istniejących komponentów z minimalnym restylingiem do dark theme; pełny redesign w przyszłości

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Angelika po zalogowaniu widzi Home Overview z summary cards: pending tasks count, shopping items count, ostatnia aktywność
- [ ] Shopping list działa end-to-end: dodaj item → pojawia się w liście → oznacz jako kupiony → przenosi do BoughtSection
- [ ] Kanban board pozwala tworzyć, przesuwać (drag & drop), edytować i usuwać zadania; zmiany zapisywane w Supabase
- [ ] Activity feed pokazuje ostatnie 20 zdarzeń (shopping/tasks changes) z poprawnym avatarem i timestampem
- [ ] Home Analytics wyświetla charts (shopping frequency, task completion rate) dla ADMIN i HELPER+ — HELPER nie widzi
- [ ] Wszystkie komponenty z archive/ działają w dark theme consistent z resztą dashboardu

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-4.1 | database | Supabase tables migration — shopping, tasks, activity, households | Migracja/utworzenie tabel (shopping_items, tasks, columns, activity_log, households, household_members) z RLS policies per rola |
| STORY-4.2 | backend | Home data API — CRUD endpoints for shopping + tasks | Endpointy Next.js API: `GET/POST/PATCH/DELETE /api/home/shopping`, `GET/POST/PATCH/DELETE /api/home/tasks` z Supabase client i walidacją roli |
| STORY-4.3 | wiring | Home hooks + types — useShoppingList, useTasks, useActivity | React hooks z Supabase real-time subscriptions, TypeScript typy (ShoppingItem, Task, ActivityEvent), optimistic updates |
| STORY-4.4 | frontend | Shopping List — migracja i integracja z nowym layout | Migracja ShoppingList, AddItemForm, CategoryGroup, BoughtSection, ShoppingItem z archive/; dostosowanie do dark theme i shadcn/ui |
| STORY-4.5 | frontend | Kanban Tasks Board — migracja z drag & drop | Migracja Board, Column, TaskCard, TaskModal, QuickAddTask, FilterSidebar z archive/; integracja dnd-kit, per-user filtering |
| STORY-4.6 | frontend | Activity Feed — migracja i real-time updates | Migracja ActivityFeed, ActivityItem, ActivityFilters z archive/; real-time updates via Supabase subscriptions |
| STORY-4.7 | frontend | Household Management — zarządzanie członkami rodziny | Migracja HouseholdMembers, InviteForm, PendingInvites z archive/; zapraszanie i zarządzanie członkami household |
| STORY-4.8 | frontend | Home Analytics — charts migracja | Migracja ShoppingChart, CompletionChart, PriorityChart, ActivityHeatmap, OverviewCards z archive/; role guard (ADMIN/HELPER+ only) |
| STORY-4.9 | frontend | Home Overview page — landing page `/home` | Strona `/home` z summary cards (tasks pending, shopping count, recent activity), quick action buttons, links do sekcji |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | home |
| Priorytet | Should |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Niskie — komponenty z archive/ są sprawdzone i przetestowane; głównie migracja i restyling |
| Domeny | database, backend, wiring, frontend |
| Stack | Next.js 16, Supabase (DB + Realtime), shadcn/ui, Tailwind CSS, dnd-kit, Recharts, TypeScript |
| DB | Supabase — tabele: shopping_items, tasks, columns, activity_log, households, household_members |
| Archive source | `archive/src/components/{shopping,kanban,activity,analytics,household}/` |
| Uwagi | Priorytet migracji: Shopping List → Kanban → Activity Feed → Analytics → Household. Komponenty z archive/ mają testy — przenieść je również. |
