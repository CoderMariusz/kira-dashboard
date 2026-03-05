# KiraBoard — Technical PRD v3
## LobsterBoard Core + ClawX Features + EPIC Integration + Open Source Inspiracje
## ✅ Decyzje zatwierdzone + Research wbudowany

**Autor:** Claude (Analiza techniczna)  
**Data:** 2026-03-05  
**Status:** v3 — decyzje zatwierdzone, research zintegrowany, gotowe do implementacji

---

## 0. Zatwierdzone decyzje

| # | Decyzja | Wynik |
|---|---------|-------|
| 1 | Deployment | **Hybryda**: local Bridge + SQLite local + sync script → Supabase → remote access |
| 2 | Auth | **PIN+users** (LobsterBoard PIN, rozszerzony o role) |
| 3 | Pages tech | **React build w pages** (Podejście B — Vite bundle per page) |
| 4 | Home Dashboard | **Pełny priorytet** — Shopping, Kanban, Activity, mobile-responsive |
| 5 | Chat interface | **Tak** — AI chat wbudowany w dashboard |
| 6 | Mobile | **Tak** — Home Dashboard mobile-first dla rodziny |
| 7 | Branding | **KiraBoard** |
| 8 | OpenClaw | Zainstalowany, najnowsza wersja, widgety zostają |

---

## 1. Architektura KiraBoard

### 1.1 High-level overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          KiraBoard                                   │
│                                                                      │
│  ┌──────────────────────┐     ┌──────────────────────────────────┐  │
│  │   LobsterBoard Core  │     │     React Pages (Vite build)     │  │
│  │                       │     │                                  │  │
│  │  • Widget engine      │     │  /pages/pipeline/  (EPIC-6)     │  │
│  │  • Drag-drop editor   │     │  /pages/home/      (EPIC-4)     │  │
│  │  • SSE real-time      │     │  /pages/chat/      (ClawX)      │  │
│  │  • PIN auth + roles   │     │  /pages/models/    (EPIC-5)     │  │
│  │  • Theme system       │     │  /pages/eval/      (EPIC-7)     │  │
│  │  • Config persistence │     │  /pages/nightclaw/ (EPIC-9)     │  │
│  │  • 50 widgetów        │     │  /pages/patterns/  (EPIC-8)     │  │
│  │  • Template gallery   │     │  /pages/settings/  (EPIC-10)    │  │
│  └──────────┬───────────┘     └──────────┬───────────────────────┘  │
│             │                             │                          │
│             └──────────┬──────────────────┘                          │
│                        │                                             │
│              server.cjs (Node.js)                                    │
│              ┌─────────┴──────────┐                                  │
│              │  API Layer         │                                   │
│              │                    │                                   │
│              │  /api/bridge/*     │← proxy do Bridge API :8199       │
│              │  /api/home/*       │← Supabase (shopping/tasks)       │
│              │  /api/chat/*       │← OpenClaw gateway                │
│              │  /api/sync/*       │← SQLite ↔ Supabase sync         │
│              │  /config           │← config.json (widgety)           │
│              │  /api/stats/stream │← SSE system stats                │
│              └────────────────────┘                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────────┐  ┌───────────┐
   │  Bridge   │    │   Supabase   │  │  OpenClaw  │
   │  API      │    │   (remote)   │  │  Gateway   │
   │  :8199    │    │              │  │            │
   │           │    │  • stories   │  │  • Chat    │
   │  SQLite   │    │  • tasks     │  │  • Skills  │
   │  (local)  │    │  • shopping  │  │  • Channels│
   │           │    │  • users     │  │  • Cron    │
   └──────────┘    └──────────────┘  └───────────┘
```

### 1.2 Dual data layer — local-first z sync

**Zasada: Bridge i dashboard działają lokalnie nawet bez internetu. Supabase to sync target, nie primary storage.**

```
ZAPIS (local → remote):
  Bridge SQLite  ──┐
  LobsterBoard     │── sync_to_supabase.js (cron co 60s) ──→ Supabase
  config.json    ──┘

ODCZYT (zależy od kontekstu):
  Mariusz (local network) → server.cjs → Bridge API + local SQLite
  Angelika (mobile/remote) → server.cjs → Supabase (fallback)
  Zuza/Iza (mobile/remote) → server.cjs → Supabase (fallback)
```

**Local SQLite** (nowa baza w KiraBoard, niezależna od Bridge SQLite):
```sql
-- KiraBoard local DB (better-sqlite3)
CREATE TABLE kb_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,     -- SHA-256
  role TEXT NOT NULL,          -- 'admin' | 'home_plus' | 'home'
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE kb_shopping_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  bought INTEGER DEFAULT 0,
  added_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE kb_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  column_id TEXT DEFAULT 'todo',  -- 'todo' | 'doing' | 'done'
  assigned_to TEXT,
  priority TEXT DEFAULT 'medium',
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE kb_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,            -- 'shopping' | 'task' | 'system'
  entity_id TEXT,
  details TEXT,                -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE kb_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT,
  last_synced_at TEXT,
  records_synced INTEGER,
  status TEXT                  -- 'success' | 'error'
);
```

### 1.3 Sync script design

```javascript
// sync_to_supabase.js — uruchamiany przez node-cron co 60s
// Logika:
// 1. Czytaj kb_sync_log → last_synced_at per tabela
// 2. SELECT * FROM kb_shopping_items WHERE updated_at > last_synced_at
// 3. UPSERT do Supabase (on conflict → update)
// 4. Analogicznie: kb_tasks, kb_activity_log
// 5. Bridge sync: odpytaj Bridge /api/status/runs → upsert do supabase bridge_runs
// 6. Zapisz nowy timestamp w kb_sync_log

// Supabase tables (mirrory):
// supabase.shopping_items, supabase.tasks, supabase.activity_log
// supabase.bridge_stories, supabase.bridge_runs (z EPIC-12)
```

---

## 2. Data routing — kto skąd czyta

| Moduł | Użytkownik lokalny | Użytkownik zdalny (mobile) |
|-------|-------------------|---------------------------|
| **Dashboard widgets** (CPU, Docker, etc.) | SSE → server.cjs → systeminformation | N/A (system monitoring = local only) |
| **Pipeline** (stories, runs, models) | server.cjs → Bridge API :8199 | server.cjs → Supabase `bridge_stories` |
| **Home Shopping** | server.cjs → local SQLite | server.cjs → Supabase `shopping_items` |
| **Home Tasks** | server.cjs → local SQLite | server.cjs → Supabase `tasks` |
| **Chat** | server.cjs → OpenClaw gateway | server.cjs → OpenClaw gateway (wymaga expose) |
| **NightClaw** | server.cjs → Bridge API / local files | server.cjs → Supabase `nightclaw_digests` |
| **Settings** | server.cjs → local SQLite (users) | N/A (admin = local only) |

**Kluczowa decyzja: Smart routing w server.cjs**

```javascript
// Middleware w server.cjs
function getDataSource(req) {
  const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' 
                  || req.ip?.startsWith('192.168.');
  
  if (isLocal && bridgeAvailable) return 'bridge';   // local → Bridge API
  if (supabaseConfigured) return 'supabase';          // remote → Supabase
  return 'local-sqlite';                              // fallback → local DB
}
```

---

## 3. Auth system — PIN + Role profiles

### 3.1 Jak to działa

LobsterBoard ma PIN auth (4-6 cyfr, SHA-256 hash). Rozszerzamy o **multi-user PIN**:

```
Scenariusz: Angelika otwiera KiraBoard na telefonie
1. Widzi KiraBoard z Public Mode (read-only dashboard widgets)
2. Klika 🔒 → wpisuje swój PIN (np. 2468)
3. Server sprawdza hash → identyfikuje Angelikę → role: "home_plus"
4. Redirect na /pages/home/ (mobile-responsive)
5. Sidebar pokazuje: Shopping, Tasks, Activity, Calendar
6. NIE widzi: Pipeline, Models, Eval, NightClaw, Settings
```

```
Scenariusz: Mariusz na laptopie
1. Otwiera KiraBoard → widzi full dashboard z widgetami
2. Ctrl+E → wpisuje PIN (np. 1337)
3. Server identyfikuje Mariusza → role: "admin"
4. Edit mode + dostęp do wszystkich pages
5. Sidebar: Dashboard, Pipeline, Models, Eval, NightClaw, Patterns, Chat, Home, Settings
```

### 3.2 Server-side implementation

```javascript
// W server.cjs — rozszerzenie istniejącego PIN auth
const users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
// users.json:
// [
//   { "name": "Mariusz", "pin_hash": "<sha256>", "role": "admin", "avatar": "🦊" },
//   { "name": "Angelika", "pin_hash": "<sha256>", "role": "home_plus", "avatar": "🌸" },
//   { "name": "Zuza", "pin_hash": "<sha256>", "role": "home", "avatar": "⭐" },
//   { "name": "Iza", "pin_hash": "<sha256>", "role": "home", "avatar": "🌙" }
// ]

app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  const hash = crypto.createHash('sha256').update(pin).digest('hex');
  const user = users.find(u => u.pin_hash === hash);
  if (!user) return res.status(401).json({ error: 'Invalid PIN' });
  
  const token = jwt.sign({ name: user.name, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { name: user.name, role: user.role, avatar: user.avatar } });
});

// Middleware: route protection
function requireRole(...roles) {
  return (req, res, next) => {
    const user = verifyToken(req);
    if (!user || !roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  };
}

// Role → allowed pages mapping
const PAGE_ACCESS = {
  admin:     ['dashboard', 'pipeline', 'models', 'eval', 'nightclaw', 'patterns', 'chat', 'home', 'settings'],
  home_plus: ['home', 'chat'],
  home:      ['home']
};
```

### 3.3 Uproszczenie vs oryginalne EPICi

| Oryginalny EPIC-3 (Supabase Auth) | KiraBoard (PIN+users) |
|-----------------------------------|-----------------------|
| Supabase Auth + JWT + middleware  | `users.json` + SHA-256 + simple JWT |
| Email/password login page         | PIN input modal (już w LobsterBoard) |
| Invite by email + magic link      | Admin dodaje usera w Settings (name + PIN + role) |
| RLS policies w Supabase           | Server-side `requireRole()` middleware |
| Session refresh z Supabase        | JWT 7-day expiry, localStorage |
| Infrastruktura: Supabase projekt  | Zero — plik JSON na serwerze |

**Co tracimy:** audit log per user z bazą danych, email-based recovery, OAuth w przyszłości.
**Co zyskujemy:** zero external dependencies na auth, działa offline, 10x prostsze.

---

## 4. React Pages — architektura build

### 4.1 Jak to działa w LobsterBoard

Każda page w `pages/` to folder z `index.html` + opcjonalnym `api.cjs`. LobsterBoard servuje je jako statyczne pliki. Rozszerzamy to o **Vite build per page**:

```
pages/
├── home/
│   ├── page.json          # { "title": "Home", "icon": "🏠", "order": 1, "mobile": true }
│   ├── index.html          # Shell HTML z <div id="root">
│   ├── src/
│   │   ├── App.tsx         # React entry
│   │   ├── components/     # Shopping, Kanban, Activity...
│   │   ├── hooks/          # useShoppingList, useTasks...
│   │   └── stores/         # Zustand stores (if needed)
│   ├── dist/               # Vite build output (gitignored)
│   │   ├── index.html      # Built HTML
│   │   └── assets/         # JS/CSS bundles
│   ├── vite.config.ts
│   ├── package.json
│   └── api.cjs             # Server-side: CRUD shopping/tasks
│
├── pipeline/
│   ├── page.json
│   ├── src/                # React: PRD Wizard, Bulk Actions, Story Detail
│   ├── dist/
│   ├── vite.config.ts
│   └── api.cjs             # Server-side: Bridge proxy, bulk-action
│
├── chat/
│   ├── page.json
│   ├── src/                # React: Chat UI (inspired by ClawX)
│   ├── dist/
│   └── api.cjs             # Server-side: OpenClaw gateway proxy
│
├── models/                 # EPIC-5
├── eval/                   # EPIC-7
├── nightclaw/              # EPIC-9
├── patterns/               # EPIC-8
└── settings/               # EPIC-10
```

### 4.2 Build pipeline per page

```bash
# Każda page to mini React app z własnym Vite config
cd pages/home && npm install && npm run build
# Output → pages/home/dist/index.html + assets/

# LobsterBoard server.cjs servuje:
# /pages/home/ → pages/home/dist/index.html (jeśli dist/ istnieje)
#              → pages/home/index.html (fallback)
```

### 4.3 Shared dependencies

```
pages/_shared/              # Shared between all React pages
├── package.json            # React, Tailwind, shadcn/ui, lucide-react
├── components/
│   ├── ui/                 # shadcn/ui components (Button, Card, Input, Dialog...)
│   ├── layout/             # SharedSidebar, MobileNav, PageShell
│   └── common/             # Toast, LoadingSpinner, EmptyState, ErrorBoundary
├── hooks/
│   ├── useAuth.ts          # Read JWT, get user role
│   ├── useApi.ts           # Fetch wrapper with auth header
│   └── useSSE.ts           # SSE subscription hook
├── lib/
│   ├── api-client.ts       # Typed API client
│   └── cn.ts               # tailwind-merge utility
├── types/
│   └── index.ts            # Shared TypeScript types
└── tailwind.config.ts      # Shared Tailwind config (KiraBoard theme)
```

Każda page importuje z `_shared` via workspace symlink albo path alias w Vite:
```typescript
// pages/home/vite.config.ts
export default defineConfig({
  resolve: {
    alias: { '@shared': path.resolve(__dirname, '../_shared') }
  }
});

// pages/home/src/App.tsx
import { Button } from '@shared/components/ui/button';
import { useAuth } from '@shared/hooks/useAuth';
```

### 4.4 Shared Tailwind theme (KiraBoard)

```javascript
// pages/_shared/tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        kira: {
          bg:      '#0d0c1a',    // Deep background
          card:    '#1a1730',    // Card background  
          accent:  '#818cf8',    // Indigo accent
          border:  '#2a2540',    // Subtle borders
          text:    '#e2e8f0',    // Primary text
          muted:   '#94a3b8',    // Secondary text
          success: '#4ade80',    // Green
          warning: '#fbbf24',    // Yellow
          danger:  '#f87171',    // Red
        }
      }
    }
  }
};
```

---

## 5. EPIC → Implementation mapping (szczegółowy)

### EPIC-1: Dashboard (widgety) → Faza 1

**Co już mamy z LobsterBoard (reuse):**
- CPU/Memory widget → bez zmian
- Docker Containers → bez zmian
- Clock / World Clock → bez zmian
- Calendar (iCal) → bez zmian
- Todo List → bez zmian
- Notes → bez zmian
- Weather → bez zmian
- Quick Links → bez zmian
- GitHub Stats → bez zmian
- AI Usage (Claude/GPT/Gemini) → bez zmian
- Cost Tracker → rozszerzenie
- Cron Jobs → przekonfigurowanie na NightClaw cron
- Activity List → przekonfigurowanie na Bridge activity
- System Log → przekonfigurowanie na Bridge/OpenClaw log

**Nowe widgety do napisania:**

| Widget | Typ | Dane | Priorytet |
|--------|-----|------|-----------|
| `pipeline-status` | widget | Bridge `/api/status/pipeline` → stories IN_PROGRESS/REVIEW/DONE counts | MUST |
| `velocity-chart` | widget | Bridge `/api/status/runs` → Chart.js line chart, 30 dni | MUST |
| `model-agents` | widget | Bridge `/api/status/models` → 4 karty z sparkline, success rate | MUST |
| `morning-briefing` | widget | Agregat: NightClaw summary + tasks today + shopping count + weather + system status. Jeden widget = pełny obraz poranka. **Unikalne dla KiraBoard** | MUST |
| `service-health` | widget | `/api/health-check` → Bridge/OpenClaw/Supabase status badges z latency. **Dashy-inspired** | MUST |
| `nightclaw-card` | widget | Bridge `/api/nightclaw/summary` → digest preview, link do page | SHOULD |
| `patterns-summary` | widget | Bridge `/api/patterns` → top 5 patterns count | SHOULD |
| `gateway-status` | widget | OpenClaw health endpoint → connected/disconnected badge | SHOULD |
| `project-switcher` | widget | Bridge `/api/projects/list` → dropdown, active project | MUST |

**Effort: ~3-5 dni** (widgety to pure `generateHtml()` + `generateJs()`, krótki development cycle)

---

### EPIC-2: Real-time → Faza 5

**Co już mamy:** LobsterBoard SSE `/api/stats/stream` (system monitoring)

**Co dodajemy:**
1. Nowy SSE endpoint `/api/bridge/stream` — proxy do Bridge event stream
2. Toast overlay — CSS overlay na dashboard z notification queue
3. Write operations proxy — `/api/bridge/stories/[id]/advance` → Bridge CLI

**Effort: ~3 dni** (SSE infra już istnieje, rozszerzamy o Bridge events)

---

### EPIC-3: Auth → Faza 3

**Całkowicie przebudowany** — PIN+users zamiast Supabase Auth. Zob. sekcja 3.

**Stories przebudowane:**

| Story | Opis | Effort |
|-------|------|--------|
| 3.1 | `users.json` schema + hash utility + seed script | 0.5d |
| 3.2 | `POST /api/auth/login` + JWT generation | 0.5d |
| 3.3 | `requireRole()` middleware + page access map | 0.5d |
| 3.4 | Client-side: PIN modal + localStorage token + redirect per role | 1d |
| 3.5 | Conditional navigation (sidebar items per role) | 0.5d |

**Total: ~3 dni**

---

### EPIC-4: Home Dashboard → Faza 3 (PRIORYTET + MOBILE)

**Implementacja:** React page `/pages/home/`

**Komponenty (w kolejności priorytetu):**

1. **Shopping List** — CRUD z emoji kategoriami (🥬🥛🍞🧴🥩🧊), bought toggle, Supabase sync
   - Smart suggestions: top 5 najczęściej kupowanych z `kb_shopping_history` (KitchenOwl-inspired)
   - Offline PWA: cache w localStorage, sync when online (KitchenOwl-inspired)
   - Mobile: full-width cards, swipe-to-mark-bought, floating add button
   - Data: local SQLite → sync → Supabase

2. **Kanban Tasks** — 3 kolumny (To Do / Doing / Done), drag & drop
   - Multiple views toggle: 📋 Lista | 📊 Kanban | 📅 Kalendarz (Vikunja-inspired)
   - Quick-add: inline parsing "Odkurzyć jutro" → task + due date (Vikunja-inspired)
   - Lib: `@dnd-kit/core` (lightweight, touch-friendly)
   - Mobile: stacked columns (vertical scroll), tap-to-move instead of drag
   - Assigned_to: per user (Zuza widzi swoje zadania na górze)

3. **Recurring Tasks** — UI do zarządzania automatycznymi zadaniami (Grocy-inspired)
   - Lista reguł: "Pranie" weekly Pon, rotate Zuza↔Iza
   - Add/edit/delete/toggle active
   - Preview: kiedy następne auto-stworzenie
   - Engine z EPIC-0 STORY-0.14 (cron)

4. **Family Activity Feed** — wspólny stream (unikalne dla KiraBoard)
   - Shopping changes: "Angelika dodała Mleko" + "Zuza kupiła Chleb"
   - Task changes: "Iza oznaczyła Odkurzanie jako Done"
   - Pipeline events: "Kira zakończyła STORY-8.3" (tylko dla admin/home_plus)
   - NightClaw: "NightClaw znalazł 2 nowe patterns" (tylko dla admin)
   - Real-time: Supabase subscription LUB polling co 30s

5. **Home Overview** — landing page z summary cards
   - Cards: pending tasks count, shopping items count, recent activity, next recurring task
   - Quick actions: "Add to shopping" (z auto-suggest), "Quick task"
   - Mobile FAB: floating ➕ z 2 opcjami (Zakupy / Zadanie)

6. **Home Analytics** — charts (shopping frequency, task completion)
   - Role guard: admin + home_plus only
   - Charts: Recharts (lightweight, React-native)

**Mobile-first design:**
```
Phone viewport (375px):
┌──────────────────────┐
│  🦊 KiraBoard Home   │
│  Cześć, Angelika! 🌸 │
├──────────────────────┤
│  🛒 Zakupy (7)    →  │  ← tap → Shopping (z sugestiami)
│  ✅ Zadania (3)   →  │  ← tap → Tasks (lista/kanban toggle)
│  🔄 Auto (2 jutro) → │  ← tap → Recurring tasks
│  📊 Aktywność     →  │  ← tap → Family Feed
├──────────────────────┤
│         ＋            │  ← FAB: Zakupy / Zadanie
└──────────────────────┘

Bottom nav (mobile only):
[ 🏠 Home ] [ 🛒 Zakupy ] [ ✅ Zadania ] [ 👤 Profil ]
```

**Effort: ~10-14 dni** (rozszerzony o research features, ale warto — to główny interfejs dla rodziny)

---

### EPIC-5: Models → Faza 2

**Implementacja:** React page `/pages/models/`

**Zakres uproszczony:**
- Lista modeli z Bridge API
- Per-model stats: runs, success rate, avg duration, cost
- Inline cost editing (edytujesz cenę → save do config)
- Usage chart (7d/30d toggle)
- Monitoring toggle per model

**Effort: ~3-4 dni**

---

### EPIC-6: Pipeline PRD → Faza 2

**Implementacja:** React page `/pages/pipeline/`

**Najzłożniejsza page w projekcie.** Komponenty:

1. **Pipeline view** — lista stories z status badges, click → story detail
2. **Bulk actions** — checkboxy, sticky toolbar, advance/assign
3. **PRD Wizard** — 3-step modal:
   - Step 1: PRD textarea
   - Step 2: AI questions (Claude Haiku via `/api/pipeline/prd-questions`)
   - Step 3: Preview + register in Bridge
4. **Project switcher** — dropdown, stats per project
5. **Story Detail** — modal/page z metadata, runs, lessons, timeline

**Backend (api.cjs):**
- `POST /prd-questions` → Anthropic API → 5 questions
- `POST /create-from-prd` → Anthropic API → epics/stories → Bridge CLI
- `POST /bulk-action` → Bridge CLI sequential
- `GET /projects/stats` → Bridge API aggregate

**Effort: ~7-10 dni** (AI integration + Bridge CLI wrapper + complex UI)

---

### EPIC-7: Eval → Faza 2

**Implementacja:** React page `/pages/eval/`

- Golden tasks CRUD
- Run history with diff viewer
- "Run Eval Now" button → Bridge API trigger
- Pass/fail visualization

**Effort: ~4-5 dni**

---

### EPIC-8: Patterns → Faza 2

**Implementacja:** React page `/pages/patterns/`

- Markdown parser (patterns.md, anti-patterns.md, LESSONS_LEARNED.md)
- Filter by tags, search
- Add new entry from UI → append to markdown file via API

**Effort: ~2-3 dni** (read-heavy, minimal write)

---

### EPIC-9: NightClaw → Faza 2

**Implementacja:** React page `/pages/nightclaw/` + widget `nightclaw-card`

- Digest markdown rendering (react-markdown)
- Skills diff viewer (code diff component)
- Research findings list
- Calendar heatmap (run history: green/red per day)
- Model performance stats (last 24h)

**Effort: ~4-5 dni**

---

### EPIC-10: Settings → Faza 4

**Implementacja:** React page `/pages/settings/`

Dwa taby:

1. **Users** — lista userów z `users.json`, add/edit/remove, PIN reset, role change
2. **System** — Bridge health, OpenClaw status, API keys (masked), cron jobs list, Restart Bridge button

**Effort: ~3-4 dni**

---

### EPIC-11: CI/CD → Faza 6

Adapatacja do KiraBoard repo (nie Next.js):
- GitHub Actions: lint + test na PR
- Deploy: albo `rsync` na Mac Mini, albo npm publish
- Prostsze niż Vercel pipeline

**Effort: ~1-2 dni**

---

### EPIC-12: Supabase Sync → Faza 1 (foundation) + Faza 6 (full)

**Faza 1 (MVP sync):**
- Supabase projekt setup
- Tabele: shopping_items, tasks, activity_log
- `sync_to_supabase.js` script (cron co 60s)
- Home module czyta z Supabase gdy remote

**Faza 6 (full sync):**
- Bridge data sync: stories, runs, digests
- Supabase Realtime subscriptions
- Full remote access dla Pipeline pages

**Effort: Faza 1 = 2-3 dni, Faza 6 = 5-7 dni**

---

## 5b. Open Source Inspiracje — wbudowane w roadmap

### Źródła i co bierzemy

| Projekt | Stars | Co bierzemy | Faza |
|---------|-------|-------------|------|
| **Dashy** | 24K | Service health check widget, keyboard shortcuts, icon patterns | 0, 1 |
| **Beszel** | 19K | Alert rules (threshold → notification), time-series charts z zoom/range | 2, 5 |
| **KitchenOwl** | 1.2K | Smart suggestions "najczęściej kupowane" (SQL count), emoji kategorie (🥬🥛🍞), offline PWA cache | 0, 3 |
| **Grocy** | 7K | Recurring tasks/chores z rotation, calendar integration, feature flags per user | 0, 3 |
| **Planka** | 12K | Real-time sync kanban, card detail modal pattern, board permissions | 3 |
| **Vikunja** | 4K | Multiple views toggle (Lista/Kanban/Kalendarz), quick-add z natural language | 3 |
| **Nullboard** | — | Simplicity-first kanban, localStorage offline fallback | 3 |

### Unikalne KiraBoard features (czego konkurencja nie ma)

**Smart Morning Briefing** (widget, Faza 1) — jeden widget agregujący: co NightClaw zrobił w nocy, ile tasks na dziś, ile na liście zakupów, status Bridge/OpenClaw, pogoda. Jeden rzut oka = wiesz wszystko.

**Family Activity Feed** (Faza 3) — wspólny stream: "Angelika dodała Mleko do zakupów" + "Zuza oznaczyła Odkurzanie jako Done" + "Kira zakończyła STORY-8.3" + "NightClaw znalazł nowy pattern". Jeden feed, cała rodzina + pipeline.

**Quick Actions FAB** (mobile, Faza 3) — floating action button na Home mobile: ➕ Dodaj do zakupów (auto-suggest), ✅ Szybkie zadanie, opcjonalnie 📸 Scan (OCR → lista).

**Dashboard Presets per Role** (Faza 4) — po zalogowaniu PIN-em ładuje się preset widgetów dla roli. Mariusz → Admin Dashboard (Pipeline + AI Usage + System Health). Angelika → Home Dashboard (Shopping + Tasks + Calendar + Weather). Każdy może customizować swój.

**Recurring Tasks z Rotation** (Faza 0 fundament, Faza 3 UI) — "Pranie" co tydzień, auto-assign Zuza → Iza → Zuza. "Odkurzanie" co 2 tygodnie. System tworzy taski automatycznie z crona. Zero ręcznej pracy.

---

## 5c. Brakujące moduły — wykryte podczas mockup review

### ⛩️ Gate System (BRAK W EPICach — nowy moduł)

**Problem:** EPICi definiują statusy stories (READY→IN_PROGRESS→REVIEW→DONE) ale brak koncepcji **gate'ów** — kontrolowanych punktów kontroli przez które story musi przejść. Bez gate'ów nie wiadomo która story ominęła lint, test, czy review.

**Rozwiązanie:** Każda story przechodzi przez 5 gate'ów: IMPLEMENT → LINT → TEST → REVIEW → MERGE. Każdy gate ma status: pass / fail / skip / pending / active. Dashboard wizualizuje to per story i agreguje gate compliance per projekt.

**Implementacja:**
- **Tabela SQLite** `kb_story_gates` (story_id, project_key, gate_name, status, started_at, finished_at, details)
- **Bridge integration** — Bridge CLI loguje gate pass/fail do tabeli po każdym kroku
- **Pipeline page** — każda story row pokazuje 5 gate squares z kolorami
- **Filtry** — "⚠️ Skipped Gates" tab filtruje stories z pominięte gaty
- **Gate config** — per project w `gate_config.json` (które gaty required, które optional)
- **Gate compliance %** — per projekt: (stories z all gates passed) / total stories

**Dodać do EPIC-0 (foundation):** STORY-0.15 — tabela kb_story_gates + gate_config.json
**Dodać do Pipeline page (EPIC-6):** stories z STORY-6.6 i 6.8 rozszerzone o gate visualization + filtr + compliance banner
**Dodać do EPIC-2 (real-time):** SSE events przy gate pass/fail → toast + auto-refresh

### 📁 Projects Page (BRAK W EPICach — nowy moduł)

**Problem:** EPIC-6 ma project switcher (dropdown), ale brak dedykowanej strony do zarządzania projektami. Nie ma gdzie zobaczyć porównanie wszystkich projektów, gate compliance per projekt, czy archiwizować projekty.

**Rozwiązanie:** Nowa strona `/pages/projects/` z kartami projektów, comparison table, i CTA do PRD Wizard.

**Implementacja:**
- Nowa React page `/pages/projects/`
- Project cards: progress bar, stats (done/in_progress/ready/blocked), gate compliance %, tags
- Comparison table: all projects side-by-side z progress, stories, gates, cost
- Actions: Switch to project, Open Pipeline, Generate from PRD, Archive
- Tabs: All / Active / Archived

**Dodać do EPIC-6:** STORY-6.9 — Projects management page (frontend)
**Dodać do EPIC-6:** STORY-6.10 — `GET /api/projects/list-detailed` endpoint (backend)

### ⚡ Skills Page (BRAK W EPICach — nowy moduł)

**Problem:** ClawX ma Skills browser ale żaden EPIC nie pokrywa zarządzania skillami w KiraBoard. OpenClaw ma skill system — potrzebujemy UI do przeglądania, instalacji, i monitorowania.

**Rozwiązanie:** Nowa strona `/pages/skills/` z grid kart skilli: installed, available, community.

**Implementacja:**
- Nowa React page `/pages/skills/`
- Skill cards: name, version, description, tags, usage stats, install/uninstall button
- Tabs: Installed / Available / Community
- Search + filter by category
- Backend: `api.cjs` proxy do OpenClaw skill API

**Dodać jako nowy EPIC lub rozszerzyć EPIC-10:**
- STORY-skills.1 — `GET /api/skills/installed` + `GET /api/skills/available` (OpenClaw proxy)
- STORY-skills.2 — `POST /api/skills/install` + `DELETE /api/skills/uninstall`
- STORY-skills.3 — Skills page frontend (grid, search, install flow)

### 🔑 Story Namespace per Project (BRAK — krytyczny)

**Problem:** STORY-12.1 może istnieć w 4 różnych projektach jednocześnie. Obecny system nie namespace'uje stories per projekt. Pipeline view pokazuje je w jednej tabeli — to jest mylące i prowadzi do błędów.

**Rozwiązanie:** Story ID zawsze w kontekście projektu. Pipeline page MUSI filtrować per aktywny projekt. Zmiana projektu = zmiana widocznych stories.

**Implementacja:**
- **Story ID format:** `{project_key}:{story_id}` (np. `kira:STORY-12.1`, `kira-board:STORY-0.1`)
- **Bridge API** — `/api/bridge/stories?project=kira-board` — filtr per projekt
- **Pipeline page** — project switcher na górze, zmiana = reload stories list
- **Gate tracking** — `kb_story_gates` ma `project_key` column (compound key: project_key + story_id)
- **Supabase sync** — `bridge_stories` ma `project_key` column, indeks na (project_key, story_id)

**Dodać do EPIC-0:** rozszerzenie STORY-0.3 — dodanie project_key do all tables
**Dodać do EPIC-6:** pipeline view filtrowanie per project (STORY-6.7 rozszerzenie)
**Dodać do EPIC-12:** sync script respektuje project_key przy sync

### Faza 0: Bootstrap (5-7 dni) — 16 stories
```
□ Fork LobsterBoard → kira-board repo, rebrand → "KiraBoard 🦊"
□ Bridge API proxy (/api/bridge/*) z timeout + offline
□ Local SQLite: kb_users, kb_shopping, kb_tasks, kb_activity, kb_recurring_tasks, kb_shopping_history, kb_story_gates
□ Auth: users.json (4 users), PIN → JWT, requireRole, PAGE_ACCESS
□ Supabase setup + tabele mirror (+ project_key na bridge_stories/runs)
□ sync_to_supabase.js skeleton + recurring tasks cron + gate tracking
□ React Pages scaffold (pages/_shared + _example z Vite)
□ KiraBoard theme CSS (#0d0c1a palette)
□ Server.cjs rozszerzenia (pages discovery, env vars, CORS, smart routing)
□ Service health check endpoint (Dashy-inspired)
□ Keyboard shortcuts (/, ?, Escape, Ctrl+1-9)
□ SQLite extensions: recurring_tasks + shopping_history + story_gates
□ Recurring tasks cron engine (daily/weekly/monthly + rotation)
□ Gate system foundation: gate_config.json + kb_story_gates table
□ README + .env.example + architecture doc
```

### Faza 1: Core Widgets (5-7 dni)
```
□ Widgets: pipeline-status, velocity-chart, model-agents, nightclaw-card
□ Widgets: service-health, morning-briefing, gateway-status, patterns-summary, project-switcher
□ Widget: gate-compliance (% stories z all gates passed per project)
□ Rozszerzenie: Activity List → Bridge, Cron → NightClaw, Cost Tracker → multi-model
□ sync_to_supabase.js MVP (shopping + tasks sync)
```

### Faza 2: React Pages — Pipeline, Projects, Skills & AI (12-16 dni)
```
□ Pages React build infrastructure (Vite per page, _shared)
□ /pages/pipeline/ — Pipeline view z GATE SYSTEM per story (5 gate squares per row)
□ /pages/pipeline/ — Gate compliance banner + "Skipped Gates" tab + gate filter
□ /pages/pipeline/ — Gate config panel (per project: required/optional gates)
□ /pages/pipeline/ — Story detail z gate timeline
□ /pages/pipeline/ — PRD Wizard (3-step, Claude API)
□ /pages/pipeline/ — Bulk actions (advance, assign model, re-run gate)
□ /pages/pipeline/ — Project filter: zmiana projektu = zmiana widocznych stories (namespace)
□ /pages/projects/ — PROJECT MANAGEMENT page (cards, stats, gate compliance, comparison table)
□ /pages/projects/ — New project CTA → PRD Wizard, Archive, Switch
□ /pages/models/ — Model registry, cost editing, usage charts (Beszel-inspired)
□ /pages/eval/ — Golden tasks, run history, diff viewer
□ /pages/nightclaw/ — Digest rendering, skills diff, calendar heatmap
□ /pages/patterns/ — Knowledge base browser, markdown parser
□ /pages/skills/ — SKILLS page (installed/available/community, install/uninstall, search)
```

### Faza 3: Home + Auth + Mobile (10-14 dni)
```
□ PIN+users auth system (users.json, JWT, requireRole middleware)
□ /pages/home/ — React page, mobile-first responsive
□ Shopping List — CRUD, emoji categories (🥬🥛🍞🧴), bought toggle
□ Shopping List — Smart suggestions "najczęściej kupowane" (kb_shopping_history top 5)
□ Shopping List — Offline PWA cache (localStorage fallback + sync when online)
□ Kanban Tasks — 3 columns (dnd-kit, touch-friendly)
□ Kanban Tasks — Multiple views toggle: 📋 Lista | 📊 Kanban | 📅 Kalendarz (Vikunja-inspired)
□ Kanban Tasks — Quick-add z inline parsing ("Odkurzyć jutro" → task + due date)
□ Recurring Tasks UI — lista recurring rules, add/edit/toggle, preview next occurrence
□ Activity Feed — Family Activity Feed (shopping + tasks + pipeline + NightClaw w jednym)
□ Home Overview — summary cards, quick actions
□ Home Analytics — charts (shopping frequency, task completion), role-guarded
□ Mobile bottom nav + responsive layout
□ Mobile FAB — Quick Actions (➕ Zakupy, ✅ Zadanie)
□ Conditional sidebar per role
```

### Faza 4: Chat + Settings + ClawX Port (7-10 dni)
```
□ /pages/chat/ — AI chat interface (port ClawX Chat patterns)
□ Chat: message bubbles, markdown rendering, conversation history
□ Chat: OpenClaw gateway integration (WebSocket JSON-RPC)
□ /pages/settings/ — Users tab (CRUD users, PIN management, recurring tasks config)
□ /pages/settings/ — System tab (Bridge health, OpenClaw status, cron, restart, feature flags)
□ Dashboard Presets per Role — auto-load widget layout per user
□ Toast notification system (cross-page)
```

### Faza 5: Real-time + Write Operations (3-5 dni)
```
□ SSE Bridge event stream proxy
□ Write operations: advance story, trigger eval from UI
□ Optimistic UI updates + rollback
□ Toast notifications for state changes
□ Pipeline view live updates (SSE → auto-refresh)
□ Alert rules foundation (threshold config → toast, opcjonalnie email via Supabase Edge Function)
```

### Faza 6: Polish + Full Sync (5-7 dni)
```
□ Full Supabase sync (Bridge data: stories, runs, digests)
□ CI/CD (GitHub Actions)
□ Supabase Realtime for remote clients
□ E2E tests (Playwright)
□ Performance optimization (lazy loading pages, cache)
□ Documentation
```

---

## 7. Effort Summary

| Faza | Czas | Pokrywa EPICi | Inspiracje wbudowane |
|------|------|---------------|---------------------|
| 0: Bootstrap | 4-6d | EPIC-0 (14 stories) | Dashy (health, shortcuts), Grocy (recurring), KitchenOwl (history) |
| 1: Core Widgets | 5-7d | EPIC-1, EPIC-12 (partial) | Morning Briefing widget, Service Health widget |
| 2: React Pages | 10-14d | EPIC-5, 6, 7, 8, 9 | Beszel (time-series charts) |
| 3: Home + Auth | 10-14d | EPIC-3, 4 | KitchenOwl, Grocy, Vikunja, Planka, Nullboard |
| 4: Chat + Settings | 7-10d | EPIC-10, ClawX port | Dashboard Presets per Role |
| 5: Real-time | 3-5d | EPIC-2 | Beszel (alert rules) |
| 6: Polish | 5-7d | EPIC-11, 12 | — |
| **TOTAL** | **44-63 dni** | **Wszystkie 12 EPICów** | **7 open source projektów** |

---

## 8. Co zyskujemy vs budowanie od zera

| Aspekt | Od zera (Next.js) | KiraBoard (LobsterBoard + ClawX) |
|--------|-------------------|----------------------------------|
| Dashboard engine | Budujemy: grid, drag-drop, resize, edit mode, save/load | **Gotowe** (LobsterBoard) |
| 50 widgetów | Budujemy każdy od zera | **Gotowe** (50 widgetów) |
| Theme system | Budujemy: CSS vars, switcher, persistence | **Gotowe** (5 themes) |
| SSE real-time | Budujemy: endpoint, client, reconnect | **Gotowe** (system stats SSE) |
| PIN auth | Budujemy (lub Supabase setup) | **Gotowe** (PIN + secrets) |
| Template gallery | Nie w scope | **Gotowe** (export/import) |
| System monitoring | Budujemy z systeminformation | **Gotowe** (CPU/RAM/Disk/Network/Docker) |
| Pages system | Next.js app router (ale framework overhead) | **Gotowe** (auto-discovery, own API) |
| Build time | ~30s (Next.js) | **0s** (no build step for core) |
| Auth complexity | Supabase Auth + JWT + middleware + RLS | **users.json + SHA-256** |
| **Estimated time** | **4-6 miesięcy** | **~2 miesiące** |

---

## 9. Ryzyka i mitygacje

| Ryzyko | Severity | Mitygacja |
|--------|----------|-----------|
| Vanilla JS widgets ≠ React pages — two UI worlds | HIGH | Shared CSS vars (KiraBoard theme), consistent palette, pages feel like "app within app" — analogicznie do Spotify (web player w Electron shell) |
| Mobile Home page wymaga dobrego UX na dotyk | MEDIUM | Mobile-first design od początku (Faza 3), dnd-kit ma touch support, bottom nav zamiast sidebar |
| Sync local SQLite → Supabase może mieć conflicts | MEDIUM | Last-write-wins strategy, updated_at timestamps, conflict log w kb_sync_log |
| LobsterBoard upstream updates | LOW | Fork — mergujemy upstream selektywnie, nasze zmiany w pages/ nie konfliktują z core |
| OpenClaw gateway exposure dla remote chat | MEDIUM | Reverse proxy (nginx/Cloudflare tunnel) z auth, nie wystawiamy bezpośrednio |

---

*KiraBoard PRD v2 — ready for implementation. Let's build this. 🦊*
