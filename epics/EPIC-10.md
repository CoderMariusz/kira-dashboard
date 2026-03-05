---
epic_id: EPIC-10
title: "Settings Page + Dashboard Presets per Role"
module: settings
status: draft
priority: should
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-10 buduje React page `/pages/settings/` z dwoma zakładkami — Users (zarządzanie userami: CRUD, PIN reset, role change) i System (Bridge health, OpenClaw status, API keys, cron jobs, restart Bridge). Dodaje też Dashboard Presets per Role — po zalogowaniu PIN-em system auto-ładuje preset widgetów odpowiedni dla roli: Mariusz widzi Admin Dashboard (Pipeline + AI Usage + System Health), Angelika widzi Home-focused layout. Każdy user może customizować swój preset. Strona Settings jest wyłącznie dla roli `admin`.

## 🎯 CEL BIZNESOWY

Mariusz dodaje nowego usera (Zuza, PIN + rola home) w 30 sekund przez Settings UI — bez edytowania `users.json` w terminalu.

## 👤 PERSONA

**Mariusz (Admin)** — administrator systemu. Sporadycznie zarządza userami (reset PIN, dodanie nowego), monitoruje Bridge i OpenClaw status, sprawdza cron jobs i klucze API (zamaskowane).

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: `users.json`, `requireRole()` middleware, Bridge API proxy, health check endpoint
- EPIC-3: Auth guard — strona wymaga roli `admin`; useAuth hook w `_shared/`

### Blokuje (ten epic odblokowuje):
- Brak bezpośrednich blokerów — Settings jest standalone

## 📦 ZAKRES (In Scope)

- **Tab Users** — lista userów z `GET /api/settings/users`; per user: nazwa, rola (badge), avatar emoji; add user: formularz (nazwa, PIN, rola, avatar); reset PIN: modal z nowym PIN; change role: select dropdown; delete user: confirm dialog (nie można usunąć ostatniego admina); `POST/PATCH/DELETE /api/settings/users`
- **Tab System** — sekcje: Bridge Status (live z `/api/health-check`), OpenClaw Status (wersja, aktywne sesje), API Keys (zamaskowane — pokazuje `sk-...***`, nie edytowalne z UI — info gdzie je zmienić), Cron Jobs (lista aktywnych cronów z NightClaw + sync), Restart Bridge button (`POST /api/settings/restart-bridge` → exec `pkill bridge && bridge start`)
- **Feature flags** — prosta lista toggles z `feature_flags.json`: np. `enable_gate_system`, `enable_prd_wizard`, `enable_supabase_sync`; `PATCH /api/settings/flags`
- **Dashboard Presets per Role** — plik `role_presets.json` z domyślnym układem widgetów per rola; po zalogowaniu (EPIC-3) LobsterBoard ładuje preset dla roli jeśli user nie ma własnego custom layout; admin może edytować presety z UI (wybór widgetów per rola)
- **User self-service** — po zalogowaniu user może zmienić swój avatar emoji (nie PIN) przez mini panel w sidebarze; `PATCH /api/settings/users/me/avatar`

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Email notifications / magic link recovery** — system jest PIN-only; brak email; recovery = admin resetuje PIN
- **Audit log per user action** — `kb_activity_log` loguje działania ale Settings nie ma dedykowanego widoku audit log (to future)
- **OpenClaw configuration** — Settings pokazuje OpenClaw status ale nie edytuje config (to domena OpenClaw)

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Mariusz dodaje usera "Zuza" (PIN + role:home) → pojawia się na liście; Zuza może się zalogować PIN-em
- [ ] Reset PIN: modal → nowy PIN → `users.json` zaktualizowany; stary PIN nie działa
- [ ] Usunięcie usera z role:admin gdy to jedyny admin → error "Cannot remove last admin"
- [ ] System tab wyświetla aktualny Bridge status (up/down) z latency
- [ ] Dashboard Presets: po zalogowaniu Angeliką → dashboard auto-ładuje preset `home_plus` (Shopping widget + Calendar + Weather zamiast Pipeline + AI Usage)
- [ ] Feature flags: toggle `enable_gate_system` OFF → Gate compliance banner i gate squares w Pipeline page znikają

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-10.1 | backend | Users management API — CRUD + PIN reset | Endpointy `GET/POST /api/settings/users`, `PATCH /api/settings/users/:id` (PIN reset, role, avatar), `DELETE /api/settings/users/:id` z last-admin guard |
| STORY-10.2 | backend | System status API + feature flags + Bridge restart | Endpoint `GET /api/settings/system` (Bridge/OpenClaw/cron status), `POST /api/settings/restart-bridge`, `GET/PATCH /api/settings/flags` |
| STORY-10.3 | backend | Dashboard presets API — role presets CRUD | Endpoint `GET /api/settings/presets` (per rola), `PATCH /api/settings/presets/:role` (update widget layout), `GET /api/settings/presets/me` (user's effective preset) |
| STORY-10.4 | wiring | Typy + API client dla Settings module | Typy `User`, `SystemStatus`, `FeatureFlag`, `DashboardPreset`; serwis `settingsApi` w `_shared/lib/settings-api.ts` |
| STORY-10.5 | frontend | Settings page — Tab Users (CRUD + PIN reset) | Komponent `UsersTab`: tabela userów, add/edit modal (PIN input hidden), delete confirm, role badge |
| STORY-10.6 | frontend | Settings page — Tab System + Feature flags | Komponent `SystemTab`: Bridge/OpenClaw status cards, cron list, API keys masked, Restart button; `FeatureFlags` toggle list |
| STORY-10.7 | frontend | Dashboard Presets — auto-load per role + preset editor | Integracja z LobsterBoard: po login load preset per role (`role_presets.json`); komponent `PresetEditor` (drag widgetów do preset listy) |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | settings |
| Priorytet | Should |
| Szacunek | M (3-4 dni) |
| Ryzyko | Niskie — prosta CRUD UI; ryzyko: Bridge restart endpoint musi być bezpieczny (requireRole admin, może zakłócić pipeline) |
| Domeny | backend, wiring, frontend |
| Stack | React 19, shadcn/ui (Tabs, Dialog, Switch, Select, Input, Badge, Table), better-sqlite3, Node.js fs (users.json, role_presets.json) |
| Uwagi | Dashboard Presets: LobsterBoard persystuje layout w `config.json`; dodaj per-role presets jako osobny plik `role_presets.json`. Po login (EPIC-3) check: jeśli user nie ma custom layout → load role preset. Restart Bridge: `child_process.exec` — zabezpiecz przed concurrent restarts (mutex). |
