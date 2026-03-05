---
story_id: STORY-0.10
title: "README + .env.example + architecture doc"
epic: EPIC-0
module: infrastructure
domain: documentation
status: ready
difficulty: trivial
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.9]
blocks: none
tags: [documentation, readme, architecture, onboarding]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent) / Mariusz (Admin)
**Chcę** mieć kompletny README z instrukcjami setup i architekturą projektu
**Żeby** każdy agent (lub developer) mógł uruchomić KiraBoard od zera bez zagadywania o szczegóły

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `README.md` — główny plik dokumentacji w root projektu
- `.env.example` — template zmiennych środowiskowych (już częściowo STORY-0.5)
- `pages/README.md` — guide dla developerów tworzących nowe pages

### Stan systemu przed tą story
- Wszystkie poprzednie stories (0.1–0.9) ukończone
- System działa: server, SQLite, auth, Bridge proxy, health check, shortcuts, pages scaffold
- `.env.example` już istnieje (STORY-0.5) — do uzupełnienia

---

## ✅ Acceptance Criteria

### AC-1: Quick Start działa wg README
GIVEN: Świeże repo sklonowane
WHEN: Postępujesz dokładnie wg sekcji "Quick Start" w README
THEN: `node server.cjs` startuje KiraBoard na `localhost:8080` bez żadnych dodatkowych kroków

### AC-2: Architecture overview obecne
GIVEN: README otwarty
WHEN: Przejdziesz do sekcji "Architecture"
THEN: Widoczny diagram ASCII lub opis warstw: server.cjs, SQLite, Supabase sync, auth, pages scaffold

### AC-3: .env.example kompletny
GIVEN: `.env.example` w root projektu
WHEN: Wykonasz `grep -c "=" .env.example`
THEN: Co najmniej 8 zmiennych z komentarzami (BRIDGE_URL, SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_KEY, JWT_SECRET, KB_DB_PATH, PORT, HOST)

### AC-4: Page Development Guide obecny
GIVEN: `pages/README.md` otworzony
WHEN: Postępujesz wg sekcji "Creating a new page"
THEN: Jasne kroki: copy `_example`, edit `page.json`, `npm install`, `npm run build`, serwer auto-discovers

---

## 🔧 Szczegóły implementacji

### README.md — struktura

```markdown
# KiraBoard 🦊

Personal dashboard for the Krawczyk family — built on LobsterBoard, powered by OpenClaw/Bridge.

## Quick Start

\`\`\`bash
git clone https://github.com/[org]/kira-board.git
cd kira-board
npm install
cp .env.example .env  # fill in your values
node auth/users-seed.js 1234 5678 9012 3456  # set PINs
node server.cjs
# Open: http://localhost:8080
\`\`\`

## Architecture

\`\`\`
Browser ──────► server.cjs (Express, port 8080)
                    │
                    ├── /api/bridge/* ──► Bridge API (localhost:8199)
                    ├── /api/auth/*   ──► auth/middleware.js (JWT + PIN)
                    ├── /api/health-check ─► healthchecks.json (background ping)
                    ├── /api/gates/*  ──► kb_story_gates (SQLite)
                    ├── /pages/*/    ──► pages/*/dist/ (React apps, Vite-built)
                    └── static files ──► LobsterBoard widgets
                    │
                    ├── db/init.js ──────► kiraboard.db (SQLite, better-sqlite3)
                    │                     Tables: kb_users, kb_tasks, kb_shopping_items,
                    │                             kb_activity_log, kb_sync_log,
                    │                             kb_recurring_tasks, kb_shopping_history,
                    │                             kb_story_gates
                    │
                    └── sync_to_supabase.js ──► Supabase (PostgreSQL, remote)
                                               Cron: every 60s (when configured)
\`\`\`

## Configuration (.env)
[tabela zmiennych]

## Users & Auth
[instrukcja users-seed.js]

## Page Development Guide
[kroki tworzenia nowej page]

## Upgrading from LobsterBoard
[strategia merge upstream]
\`\`\`

### pages/README.md — Page Development Guide

```markdown
# KiraBoard Page Development Guide

## Creating a new page

1. Copy `_example` directory: `cp -r pages/_example pages/my-page`
2. Edit `pages/my-page/page.json`: set title, icon, order
3. Edit `pages/my-page/src/App.tsx`
4. Build: `cd pages/my-page && npm install && npm run build`
5. Server auto-discovers on next restart (or use page hot-reload if configured)

## Shared components
[lista komponentów z _shared/components/ui/]

## Available hooks
- `useAuth()` — get current user + role
- `useApi()` — authenticated fetch wrapper
```

---

## ⚠️ Edge Cases

### EC-1: README outdated po future stories
Scenariusz: EPIC-1, EPIC-2 dodają nowe features — README może być nieaktualny
Oczekiwane zachowanie: Na końcu README dodaj sekcję "Changelog" z linkami do EPIC docs — aktualizuj przy każdym EPIC

### EC-2: .env.example z sekretem demo
Scenariusz: Ktoś skopiuje plik z "example" secretem i użyje w produkcji
Oczekiwane zachowanie: Komentarze w `.env.example` jasno wskazują: `# CHANGE THIS — generate: openssl rand -base64 32`

---

## 🚫 Out of Scope tej Story
- API reference (generowane auto w EPIC-11)
- Video tutorial
- CI/CD documentation (EPIC-11)
- Changelog — aktualizowany po każdym EPIC

---

## ✔️ Definition of Done
- [ ] `README.md` zawiera Quick Start, Architecture, Configuration, Users & Auth, Page Dev Guide
- [ ] Quick Start działa — świeże clone → running server wg README
- [ ] `.env.example` kompletny (≥ 8 zmiennych z komentarzami)
- [ ] `pages/README.md` istnieje z Page Development Guide
- [ ] Brak TODO/placeholder w README (wypełniony rzeczywistą treścią)
- [ ] Architecture diagram ASCII poprawnie reprezentuje system po EPIC-0
