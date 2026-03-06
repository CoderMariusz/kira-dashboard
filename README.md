# KiraBoard 🦊

Personal dashboard for the Krawczyk family — built on LobsterBoard, powered by OpenClaw/Bridge.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/CoderMariusz/kira-dashboard.git
cd kira-dashboard

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your values (see Configuration section below)

# 4. Seed users with PINs
node auth/users-seed.js 1234 5678 9012 3456

# 5. Start the server
node server.cjs

# 6. Open in browser
open http://localhost:8080
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               BROWSER                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Dashboard  │  │  Builder    │  │  React      │  │  Widgets (LobsterBoard) │ │
│  │  (index)    │  │  (Ctrl+E)   │  │  Pages      │  │  (Vanilla JS)           │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
└─────────┼────────────────┼────────────────┼─────────────────────┼───────────────┘
          │                │                │                     │
          └────────────────┴────────────────┴─────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           server.cjs (Express)                                  │
│  Port: 8080 (default)                                                           │
│                                                                                 │
│  ┌─────────────────┬─────────────────┬─────────────────┬─────────────────────┐  │
│  │ /api/bridge/*   │ /api/auth/*     │ /api/gates/*    │ /pages/*/           │  │
│  │ ─────────────── │ ─────────────── │ ─────────────── │ ─────────────────── │  │
│  │ Bridge Proxy    │ JWT + PIN       │ Story Gates     │ React Apps (Vite)   │  │
│  │ (localhost:8199)│ auth/middleware │ (SQLite)        │ Auto-discovered     │  │
│  └────────┬────────┴────────┬────────┴────────┬────────┴──────────┬──────────┘  │
│           │                 │                 │                   │             │
│  ┌────────▼─────────────────▼─────────────────▼───────────────────▼──────────┐  │
│  │                         SQLite (better-sqlite3)                           │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │ kb_users    │ │ kb_tasks    │ │ kb_shopping │ │ kb_activity_log     │  │  │
│  │  │ (PIN auth)  │ │ (Kanban)    │ │ _items      │ │ (audit trail)       │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │  │
│  │  │ kb_sync_log │ │ kb_recurring│ │ kb_shopping │ │ kb_story_gates      │  │  │
│  │  │ (Supabase)  │ │ _tasks      │ │ _history    │ │ (pipeline quality)  │  │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│           │                                                                      │
│           └──────────────────┬───────────────────────────────────────────────────┘
│                              │
│  ┌───────────────────────────▼────────────────────────────────────────────────┐ │
│  │                    sync_to_supabase.js (Cron: 60s)                         │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Supabase PostgreSQL (remote backup when SUPABASE_URL configured)    │  │ │
│  │  └──────────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| **Server** | `server.cjs` | Express server, API routes, Bridge proxy |
| **Database** | `db/init.cjs` | SQLite initialization with all tables |
| **Auth** | `auth/middleware.js` | JWT token verification + PIN login |
| **Users** | `auth/users-seed.js` | Generate `users.json` with hashed PINs |
| **Sync** | `sync_to_supabase.js` | Background sync to Supabase PostgreSQL |
| **Pages** | `pages/*/` | React apps (Vite-built), auto-discovered |
| **Shared** | `pages/_shared/` | Reusable hooks, components, utilities |

## Configuration (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BRIDGE_URL` | Yes | `http://localhost:8199` | OpenClaw Bridge API endpoint |
| `SUPABASE_URL` | No | — | Supabase project URL (for sync) |
| `SUPABASE_KEY` | No | — | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | No | — | Supabase service role key (for sync) |
| `JWT_SECRET` | **Yes** | — | Secret for signing JWT tokens |
| `KB_DB_PATH` | Yes | `./kiraboard.db` | SQLite database file path |
| `PORT` | No | `8080` | HTTP server port |
| `HOST` | No | `127.0.0.1` | HTTP server bind address |

### Generating JWT_SECRET

```bash
# Generate a secure random secret
openssl rand -base64 32
```

Copy the output into your `.env` file as `JWT_SECRET`.

## Users & Auth

KiraBoard uses PIN-based authentication with JWT tokens.

### Setting Up Users

Run the seed script with 4 PINs (one for each family member):

```bash
node auth/users-seed.js <mariusz_pin> <angelika_pin> <zuza_pin> <iza_pin>
```

Example:
```bash
node auth/users-seed.js 1234 5678 9012 3456
```

This creates `users.json` with SHA256-hashed PINs:

```json
[
  { "name": "Mariusz", "pin_hash": "...", "role": "admin", "avatar": "🦊" },
  { "name": "Angelika", "pin_hash": "...", "role": "home_plus", "avatar": "🌸" },
  { "name": "Zuza", "pin_hash": "...", "role": "home", "avatar": "⭐" },
  { "name": "Iza", "pin_hash": "...", "role": "home", "avatar": "🌙" }
]
```

### Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access — manage users, all pages, builder mode |
| `home_plus` | Extended home access — most pages, limited admin features |
| `home` | Standard access — basic pages, personal tasks |

### Login Flow

1. User enters PIN on login screen
2. Server validates PIN against `users.json`
3. On success, server returns JWT token
4. Token stored in `localStorage` as `kiraboard_token`
5. All API requests include `Authorization: Bearer <token>` header

## Page Development Guide

See [`pages/README.md`](pages/README.md) for detailed instructions on creating new React pages.

Quick overview:

1. Copy `_example` directory: `cp -r pages/_example pages/my-page`
2. Edit `pages/my-page/page.json` — set title, icon, order
3. Edit `pages/my-page/src/App.tsx` — your React code
4. Build: `cd pages/my-page && npm install && npm run build`
5. Restart server — pages are auto-discovered on startup

## Upgrading from LobsterBoard

KiraBoard is built on top of LobsterBoard. To upgrade:

1. Backup your `config.json` and `widgets/` directory
2. Pull latest KiraBoard changes
3. Merge your widget customizations (if any)
4. Run `npm install` to update dependencies
5. Create `.env` file (new requirement)
6. Run `node auth/users-seed.js` to set up authentication
7. Start server with `node server.cjs`

Your existing LobsterBoard widgets and configs remain compatible.

## Changelog

- **EPIC-0** — Foundation: SQLite, auth, Bridge proxy, health checks, pages scaffold
- See `stories/` directory for detailed EPIC documentation

## License

BSL-1.1 License · Made with 🦊 by [kira](https://github.com/CoderMariusz)
