# KiraBoard — Master Checklist
## Weryfikacja kompletności projektu

**Cel:** Po napisaniu stories, przejdź ten checklist żeby upewnić się że nic nie brakuje.

---

## A. EPIC-0 Bootstrap — 14 stories

### Infrastructure
- [ ] **0.1** Fork + rebrand: repo istnieje, `node server.cjs` → "KiraBoard" w tytule
- [ ] **0.1** package.json: name=kira-board, version=1.0.0
- [ ] **0.1** Logo/favicon zmienione, stare mascoty usunięte/zarchiwizowane
- [ ] **0.8** Theme "kiraboard" w switcher, paleta #0d0c1a/#1a1730/#818cf8/#2a2540
- [ ] **0.8** Theme ustawiony jako default dla nowych instalacji

### Backend / API
- [ ] **0.2** `/api/bridge/*` proxy działa (GET/POST/PATCH/DELETE)
- [ ] **0.2** Timeout 5s, zwraca 503 JSON gdy Bridge offline
- [ ] **0.9** Env vars ładowane z `.env` (dotenv)
- [ ] **0.9** CORS headers dla mobile access
- [ ] **0.9** Pages auto-discovery: `pages/*/dist/` servowane automatycznie
- [ ] **0.9** Pages API: `pages/*/api.cjs` montowane na `/api/pages/*/`
- [ ] **0.11** `/api/health-check` zwraca status Bridge + OpenClaw + latency
- [ ] **0.11** Background pinging (nie per-request), konfiguracja w `healthchecks.json`

### Database
- [ ] **0.3** `kiraboard.db` tworzy się auto przy starcie
- [ ] **0.3** Tabele: kb_users, kb_shopping_items, kb_tasks, kb_activity_log, kb_sync_log
- [ ] **0.3** WAL mode + foreign keys ON
- [ ] **0.13** Tabele: kb_recurring_tasks, kb_shopping_history
- [ ] **0.13** Indeksy na: bought, category, column_id, assigned_to, created_at, buy_count

### Auth
- [ ] **0.4** `users-seed.js` generuje users.json z hashed PINs (nie plaintext)
- [ ] **0.4** `POST /api/auth/login` → JWT z name/role/avatar
- [ ] **0.4** `GET /api/auth/me` → zwraca user info z JWT
- [ ] **0.4** `requireRole()` middleware blokuje unauthorized
- [ ] **0.4** PAGE_ACCESS map: admin=9 pages, home_plus=2, home=1

### Supabase
- [ ] **0.5** Projekt Supabase utworzony
- [ ] **0.5** Tabele: shopping_items, tasks, activity_log, bridge_stories, bridge_runs
- [ ] **0.5** Indeksy i trigger updated_at
- [ ] **0.5** `.env.example` z SUPABASE_URL + SUPABASE_KEY + SUPABASE_SERVICE_KEY

### Sync
- [ ] **0.6** `sync_to_supabase.js` startuje cron co 60s
- [ ] **0.6** Bez SUPABASE_URL → warning log, nie crash
- [ ] **0.6** Z SUPABASE_URL → initial sync + cron
- [ ] **0.14** Recurring tasks engine: daily/weekly/biweekly/monthly
- [ ] **0.14** Rotation logic: assigned_to="rotate" + rotation_users + rotation_index
- [ ] **0.14** Auto-create task w kb_tasks + log w kb_activity_log
- [ ] **0.14** last_created_at update (nie tworzy duplikatów)

### React Pages
- [ ] **0.7** `pages/_shared/package.json` z React 19, Tailwind, shadcn/ui, lucide-react
- [ ] **0.7** Shared components: Button, Card, Input, Dialog, Badge, Toast
- [ ] **0.7** Shared hooks: useAuth (read JWT), useApi (fetch + Bearer)
- [ ] **0.7** Shared types: User, Role, ApiResponse
- [ ] **0.7** Tailwind config z KiraBoard theme colors
- [ ] **0.7** `pages/_example/` buduje się i serwuje poprawnie

### UX Foundation
- [ ] **0.12** Keyboard shortcuts: `/` = search, `?` = help, `Escape` = close
- [ ] **0.12** Shortcuts nie odpalają w input/textarea
- [ ] **0.12** Konfiguracja w `shortcuts.json`

### Documentation
- [ ] **0.10** README.md kompletny (setup, architecture, page dev guide)
- [ ] **0.10** `.env.example` ze wszystkimi zmiennymi
- [ ] **0.10** Architecture diagram (ASCII art)

---

## B. Design System — spójność

### Kolory (z mockup-v3.html)
- [ ] Background primary: #0d0c1a (body) / #13111c (content)
- [ ] Background card: #1a1730
- [ ] Border: #2a2540 (hover: #3b3d7a)
- [ ] Accent: #818cf8 (indigo)
- [ ] Accent gradient: linear-gradient(135deg, #7c3aed, #3b82f6)
- [ ] Text primary: #e6edf3 / #e2e8f0
- [ ] Text secondary: #6b7280
- [ ] Text muted: #4b4569 / #3d3757
- [ ] Success: #4ade80
- [ ] Warning: #fbbf24
- [ ] Danger: #f87171

### Typography
- [ ] Font: Inter, -apple-system, sans-serif
- [ ] Stat values: 25px, 800 weight
- [ ] Card headers: 13px, 700 weight
- [ ] Labels: 10px, uppercase, letter-spacing 0.07em
- [ ] Body: 12px regular

### Components (z mockup)
- [ ] Stat cards: #1a1730 bg, border #2a2540, hover border #3b3d7a
- [ ] Model cards: sparkline + 3 metrics + action buttons
- [ ] Pipeline rows: #13111c bg, status badges (IP=#1a3a5c, RV=#2d1b4a, DONE=#1a3a1a)
- [ ] Activity feed: timeline dots + vertical line + event text
- [ ] Sidebar: icon rail 54px + text nav 198px

---

## C. Data Flow — kompletność

### Local-first (Mariusz na laptopie)
- [ ] Dashboard widgets → server.cjs → systeminformation (SSE)
- [ ] Pipeline data → server.cjs → Bridge API :8199
- [ ] Home data → server.cjs → local SQLite (kiraboard.db)
- [ ] Chat → server.cjs → OpenClaw gateway

### Remote (Angelika na telefonie)
- [ ] Home data → server.cjs → Supabase (fallback gdy nie local)
- [ ] Smart routing: isLocal() → SQLite, else → Supabase
- [ ] Pipeline data → Supabase bridge_stories/bridge_runs (po full sync)

### Sync direction
- [ ] Local → Supabase: kb_shopping → shopping_items (every 60s)
- [ ] Local → Supabase: kb_tasks → tasks (every 60s)
- [ ] Local → Supabase: kb_activity_log → activity_log (every 60s)
- [ ] Bridge → Supabase: stories/runs (EPIC-12, Faza 6)
- [ ] Sync log: kb_sync_log tracks last sync per table

---

## D. Open Source Inspiracje — weryfikacja wbudowania

### Faza 0 (EPIC-0)
- [ ] **Dashy** → health check endpoint z background pinging ✓ STORY-0.11
- [ ] **Dashy** → keyboard shortcuts foundation ✓ STORY-0.12
- [ ] **Grocy** → recurring tasks DB schema ✓ STORY-0.13
- [ ] **Grocy** → recurring tasks cron engine z rotation ✓ STORY-0.14
- [ ] **KitchenOwl** → shopping_history table (fundament smart suggestions) ✓ STORY-0.13

### Faza 1 (EPIC-1)
- [ ] **Morning Briefing** widget (unikalne) → agregat NightClaw+tasks+shopping+weather+status
- [ ] **Service Health** widget → konsumuje /api/health-check
- [ ] **Dashy** → service health pattern zaimplementowany w widget

### Faza 2
- [ ] **Beszel** → time-series charts z zoom/range w /pages/models/

### Faza 3 (EPIC-4)
- [ ] **KitchenOwl** → emoji categories w shopping list (🥬🥛🍞🧴🥩🧊)
- [ ] **KitchenOwl** → smart suggestions "najczęściej kupowane" (SQL count z kb_shopping_history)
- [ ] **KitchenOwl** → offline PWA cache (localStorage + sync)
- [ ] **Vikunja** → multiple views toggle (Lista/Kanban/Kalendarz)
- [ ] **Vikunja** → quick-add z inline date parsing
- [ ] **Grocy** → recurring tasks UI (lista reguł, add/edit/toggle)
- [ ] **Planka** → real-time sync kanban (Supabase Realtime)
- [ ] **Nullboard** → simplicity-first kanban (zero-onboarding UX)
- [ ] **KiraBoard unique** → Family Activity Feed (shopping+tasks+pipeline+NightClaw)
- [ ] **KiraBoard unique** → Mobile FAB Quick Actions

### Faza 4
- [ ] **KiraBoard unique** → Dashboard Presets per Role

### Faza 5
- [ ] **Beszel** → Alert rules (threshold config → notification)

---

## E. Pliki projektu — co powinno być w repo

### Root
- [ ] EPIC-0-kiraboard-bootstrap.md (14 stories, dependency graph, implementation details)
- [ ] KiraBoard-PRD-v3-Implementation.md (architektura, roadmap, all decisions)
- [ ] KiraBoard-Inspiracje-OpenSource.md (research reference)
- [ ] KiraBoard-Master-Checklist.md (ten plik)

### Istniejące EPICi (reference)
- [ ] EPIC-1 through EPIC-12 — zachowane jako reference (API specs, types, implementation details)
- [ ] kira-dashboard-mockup-v3.html — design system reference (CSS, layouts, components)

### Weryfikacja per-story
Po napisaniu każdego story sprawdź:
- [ ] Czy ma jasne DoD (Definition of Done)?
- [ ] Czy ma określoną domenę (infrastructure/database/auth/backend/wiring/frontend)?
- [ ] Czy ma dependency na inne stories?
- [ ] Czy error handling jest opisany?
- [ ] Czy lokalizacja pliku jest podana?
- [ ] Czy ma kod implementacji (snippet lub pseudokod)?

---

## F. Ryzyka — monitoring

| Ryzyko | Status | Mitygacja |
|--------|--------|-----------|
| Dwa światy UI (vanilla widgets + React pages) | 🟡 Monitoruj | Shared CSS vars, KiraBoard theme, test _example page |
| Mobile Home UX na dotyk | 🟡 Monitoruj | Mobile-first design, dnd-kit touch, bottom nav, FAB |
| SQLite → Supabase sync conflicts | 🟡 Monitoruj | Last-write-wins, updated_at timestamps, sync_log |
| LobsterBoard upstream breaking changes | 🟢 Niskie | Fork, nasze zmiany w pages/auth/db/sync — nie konfliktują |
| OpenClaw gateway exposure for remote | 🟡 Monitoruj | Reverse proxy + auth, nie wystawiamy bezpośrednio |
| Recurring tasks spam (wrong config) | 🟢 Niskie | last_created_at guard, active toggle, max 1 task/day per rule |
| Health check false positives | 🟢 Niskie | Timeout config per service, cached results, retry logic |

---

*Checklist version: v1.0 — zsynchronizowany z EPIC-0 (14 stories) i PRD v3*
