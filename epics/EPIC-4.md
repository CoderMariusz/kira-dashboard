---
epic_id: EPIC-4
title: "Home Dashboard — Shopping, Kanban, Recurring Tasks, Activity Feed, Mobile"
module: home
status: draft
priority: must
estimated_size: XL
risk: medium
---

## 📋 OPIS

EPIC-4 buduje pełny Home Dashboard jako React page (`/pages/home/`) — mobilny interfejs dla całej rodziny Krawczyków. Obejmuje Shopping List z smart suggestions i offline cache, Kanban Tasks z drag-and-drop i multiple views, UI do zarządzania Recurring Tasks (engine z EPIC-0), Family Activity Feed łączący wszystkie zdarzenia domowe i pipeline, oraz Home Overview z summary cards i mobile FAB. Strona jest mobile-first (375px), z bottom navigation i touch-friendly UX — Angelika i Zuza używają jej głównie na telefonie.

## 🎯 CEL BIZNESOWY

Angelika dodaje "Mleko" do listy zakupów na telefonie w 3 kliknięcia, a Zuza widzi że Pranie zostało jej przypisane dzisiaj — oboje w tej samej aplikacji, bez instalacji czegokolwiek.

## 👤 PERSONA

**Angelika (home_plus)** — home manager. Zarządza zakupami, sprawdza zadania rodzinne, widzi aktywność. Używa głównie telefonu, potrzebuje prostego i szybkiego interfejsu z polskim tekstem.

**Zuza / Iza (home)** — sprawdzają swoje zadania, oznaczają jako done. Nie zarządzają ustawieniami.

**Mariusz (Admin)** — ma dostęp do Home Dashboard ale też widzi eventy pipeline i NightClaw w Activity Feed.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Tabele SQLite `kb_shopping_items`, `kb_tasks`, `kb_activity_log`, `kb_recurring_tasks`, `kb_shopping_history`; sync script (`sync_to_supabase.js`); Supabase tabele mirror
- EPIC-3: Auth UI + role-based redirect (Angelika ląduje tu po zalogowaniu); hook `useAuth` w `_shared/`
- EPIC-0: React Pages scaffold (`pages/_shared/`) z Vite build

### Blokuje (ten epic odblokowuje):
- EPIC-2: Family Activity Feed może odbierać real-time SSE eventy (EPIC-2 dostarcza SSE infrastructure)
- EPIC-10: Settings/Users page zarządza userami wyświetlanymi w assign_to w Tasks

## 📦 ZAKRES (In Scope)

- **Shopping List** — CRUD items z emoji kategoriami (🥬 Warzywa, 🥛 Nabiał, 🍞 Pieczywo, 🧴 Higiena, 🥩 Mięso, 🧊 Mrożonki, 🍭 Inne); bought toggle ze swipe-to-mark; floating add button z auto-suggest top 5 z `kb_shopping_history`; offline PWA cache (localStorage fallback + sync when online, KitchenOwl-inspired); data: local SQLite → sync → Supabase
- **Kanban Tasks** — 3 kolumny (To Do / Doing / Done), drag & drop (`@dnd-kit/core`, touch-friendly); multiple views toggle: 📋 Lista | 📊 Kanban | 📅 Kalendarz (Vikunja-inspired); quick-add z inline parsing "Odkurzyć jutro" → task + due_date; assign_to dropdown (lista userów z `kb_users`); mobile: stacked columns (vertical scroll), tap-to-move zamiast drag
- **Recurring Tasks UI** — lista aktywnych recurring rules z `kb_recurring_tasks`; add/edit/delete/toggle active; pola: tytuł, recurrence (daily/weekly/biweekly/monthly), assigned_to, rotation; preview "następne uruchomienie: poniedziałek 10.03"; engine z EPIC-0.14 (cron)
- **Family Activity Feed** — stream eventów z `kb_activity_log`: shopping changes ("Angelika dodała Mleko"), task changes ("Zuza oznaczyła Odkurzanie jako Done"), pipeline events ("Kira zakończyła STORY-8.3" — tylko admin/home_plus), NightClaw events ("NightClaw znalazł 2 nowe patterns" — tylko admin); polling co 30s (lub SSE z EPIC-2)
- **Home Overview** — landing section z summary cards: pending tasks count, shopping items count (not bought), recent activity preview, next recurring task; quick actions: "Dodaj do zakupów" (z auto-suggest), "Szybkie zadanie"
- **Mobile FAB** — floating action button na Home mobile: ➕ z 2 opcjami (🛒 Zakupy / ✅ Zadanie), otwiera mini-formularz
- **Mobile bottom navigation** — na viewport < 768px: dolny nav z ikonami (🏠 Home | 🛒 Zakupy | ✅ Zadania | 👤 Profil); zastępuje sidebar
- **Home Analytics** — sekcja z chartami (Recharts): shopping frequency per kategoria, task completion rate per tydzień; dostępna tylko dla `admin` i `home_plus`

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Chat / AI assistant** — wbudowany chat to ClawX port w EPIC-4 (Faza 4); na Home page jest tylko link do /pages/chat/
- **Calendar integration (iCal)** — widok kalendarza w Tasks może pokazywać due dates ale bez importu zewnętrznych kalendarzy (to future)
- **OCR scan (📸)** — skanowanie paragonu → auto-dodanie do shopping; PRD wspomina jako "opcjonalnie", poza scope obecnego epiku
- **Push notifications (PWA)** — offline cache tak, ale push notifications na telefon to infrastruktura poza scope tego epiku

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Angelika loguje się na telefonie (375px), widzi Home Overview z poprawnymi counts, dodaje item do Shopping w ≤ 3 kliknięcia
- [ ] Shopping List: auto-suggest pokazuje top 5 najczęściej kupowanych (z `kb_shopping_history`) po wpisaniu 2 liter
- [ ] Shopping List: oznaczenie item jako bought bez internetu (offline cache) → sync gdy internet wraca
- [ ] Kanban: drag & drop tasks między kolumnami działa na touch (mobile); zmiana kolumny persystuje po reload
- [ ] Kanban: quick-add "Odkurzyć jutro" → tworzy task z due_date = jutrzejsza data i tytułem "Odkurzyć"
- [ ] Recurring Tasks UI: Angelika dodaje "Pranie" (weekly, poniedziałek, Zuza↔Iza), zapisuje → w następny poniedziałek task auto-tworzy się przez cron
- [ ] Family Activity Feed pokazuje akcje wszystkich userów (shopping + tasks) z poprawnymi nazwami i timestampami
- [ ] Mobile bottom navigation pojawia się na < 768px, górny sidebar jest ukryty; FAB "➕" otwiera wybór Zakupy/Zadanie

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-4.1 | backend | Shopping CRUD API — endpoints + shopping history | Endpointy `GET/POST /api/home/shopping`, `PATCH /api/home/shopping/:id` (bought toggle), `DELETE /api/home/shopping/:id` + auto-update `kb_shopping_history` przy bought |
| STORY-4.2 | backend | Tasks CRUD API + Kanban move endpoint | Endpointy `GET/POST /api/home/tasks`, `PATCH /api/home/tasks/:id` (column_id, assigned_to, due_date), `DELETE /api/home/tasks/:id`; walidacja column_id |
| STORY-4.3 | backend | Activity Feed API + Recurring Tasks CRUD | Endpoint `GET /api/home/activity?limit=50`, `GET/POST/PATCH/DELETE /api/home/recurring` — recurring rules management |
| STORY-4.4 | wiring | Typy TypeScript + API client dla Home module | Typy `ShoppingItem`, `Task`, `RecurringTask`, `ActivityEntry`; serwisy `shoppingApi`, `tasksApi`, `activityApi` w `_shared/lib/home-api.ts` |
| STORY-4.5 | frontend | Home Overview + Mobile shell + bottom navigation | Komponent `HomeOverview` z summary cards, mobile shell (`pages/home/`), bottom nav (< 768px), FAB z akcjami Zakupy/Zadanie |
| STORY-4.6 | frontend | Shopping List — komponent z CRUD i auto-suggest | Komponent `ShoppingList`: lista items z emoji kategoriami, bought toggle, add form z auto-suggest top 5, swipe gesture (mobile), offline localStorage cache |
| STORY-4.7 | frontend | Kanban Tasks — drag & drop + multiple views | Komponent `TaskBoard`: 3 kolumny z dnd-kit (touch), views toggle Lista/Kanban/Kalendarz, quick-add z date parsing, assign_to dropdown |
| STORY-4.8 | frontend | Recurring Tasks UI — lista i formularz | Komponent `RecurringTasksManager`: lista reguł, formularz add/edit (recurrence, rotation users, day_of_week), preview następnego uruchomienia, toggle active |
| STORY-4.9 | frontend | Family Activity Feed + Home Analytics | Komponent `ActivityFeed` z polling co 30s, role-filtered events; komponent `HomeAnalytics` (Recharts) z shopping frequency + task completion — role guard admin/home_plus |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | home |
| Priorytet | Must |
| Szacunek | XL (10-14 dni) |
| Ryzyko | Średnie — mobile UX, dnd-kit touch, offline cache wymagają testowania na prawdziwym telefonie; Angelika musi zaakceptować UX |
| Domeny | backend, wiring, frontend |
| Stack | React 19, @dnd-kit/core, Recharts, Tailwind, shadcn/ui, better-sqlite3, @supabase/supabase-js |
| Inspiracje | KitchenOwl (smart suggestions, emoji kategorie, offline), Grocy (recurring z rotation), Vikunja (views toggle, quick-add NLP), Planka (kanban card detail), Nullboard (offline fallback) |
| Uwagi | Mobile-first — zaczyn od 375px, potem 768px+. Testuj na prawdziwym iPhonie/Android. Wszystkie touch targets minimum 44x44px. Używaj dnd-kit nie react-beautiful-dnd (lepsza obsługa touch). |
