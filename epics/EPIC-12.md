---
epic_id: EPIC-12
title: "Supabase Full Sync + Realtime — Bridge Data, Remote Access, Subscriptions"
module: sync
status: draft
priority: should
estimated_size: L
risk: medium
---

## 📋 OPIS

EPIC-12 rozszerza sync script z EPIC-0 o pełną synchronizację danych Bridge (stories, runs, NightClaw digests) do Supabase, uruchamia Supabase Realtime subscriptions dla zdalnych klientów (Angelika na telefonie widzi zmiany shopping w real-time), i umożliwia pełny zdalny dostęp do Pipeline page przez Supabase jako data source gdy Bridge jest niedostępny. Fundament sync (MVP: shopping + tasks) był gotowy z EPIC-0; ten epic dodaje Bridge data sync i Realtime.

## 🎯 CEL BIZNESOWY

Angelika dodaje "Chleb" do zakupów na telefonie poza domem → Mariusz widzi zmianę na KiraBoard w ciągu 5 sekund bez odświeżania — przez Supabase Realtime.

## 👤 PERSONA

**Angelika (home_plus)** — używa KiraBoard poza siecią domową (na komórce przez LTE). Chce widzieć aktualną listę zakupów zsynchronizowaną z tym co widzi Zuza na telefonie w domu.

**Mariusz (Admin)** — chce mieć dostęp do Pipeline page gdy jest poza domem (np. przez Tailscale lub Cloudflare Tunnel) — dane z Supabase zamiast Bridge (który działa tylko lokalnie).

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: `sync_to_supabase.js` skeleton, Supabase projekt setup, tabele mirror; smart routing middleware w server.cjs
- EPIC-4: Home module CRUD (shopping/tasks) — dane do synchronizacji
- EPIC-6: Pipeline data — stories, runs do sync do `bridge_stories`, `bridge_runs`

### Blokuje (ten epic odblokowuje):
- Brak — to jest ostatnia faza (Faza 6)

## 📦 ZAKRES (In Scope)

- **Full Bridge sync** — rozszerzenie `sync_to_supabase.js`: `GET /api/bridge/status/runs` → upsert `bridge_runs` w Supabase; `GET /api/bridge/status/stories` → upsert `bridge_stories`; `GET /api/bridge/nightclaw/digests` → upsert `nightclaw_digests`; sync co 60s; obsługa `project_key` w compound key (story namespace)
- **Supabase Realtime dla Home module** — subscriptions w `pages/home/` React app: `supabase.channel('shopping').on('postgres_changes', ...)` → auto-update Shopping List bez polling; analogicznie dla Tasks i Activity Feed; zastępuje polling co 30s gdy remote
- **Remote Pipeline read access** — smart routing w server.cjs: gdy Bridge offline LUB user remote → Pipeline stories z `bridge_stories` Supabase (zamiast Bridge API); tryb read-only (write ops wymagają Bridge); banner "Remote mode — live edits disabled" w Pipeline page
- **NightClaw digests w Supabase** — tabela `nightclaw_digests` (id, content_md, status, run_date, patterns_found_count, skills_updated); sync z plików .md; NightClaw page fallback do Supabase gdy offline
- **Conflict resolution** — last-write-wins per `updated_at` timestamp; `kb_sync_log` rejestruje każdy conflict; przy konflikcie → lokalny rekord wygrywa (local-first zasada)
- **Sync health monitoring** — endpoint `GET /api/sync/status` → stats: last sync per table, records synced total, errors count, lag (seconds since last successful sync); widget `service-health` pokazuje "Supabase sync: 45s ago"

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Bi-directional sync (Supabase → local SQLite)** — zapis idzie local → Supabase; remote read przez Supabase; reverse sync (np. Angelika edytuje zdalnie → sync do local) to complex conflict resolution, poza scope
- **Supabase Edge Functions dla business logic** — logika jest w server.cjs; Supabase to storage/realtime tylko
- **Row Level Security (RLS) per user** — wszystkie dane przez server.cjs z JWT auth; Supabase anon key dla read, service key dla write; RLS to over-engineering dla tego projektu

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] `sync_to_supabase.js` synchronizuje Bridge stories i runs do Supabase co 60s; `GET /api/sync/status` pokazuje lag < 120s
- [ ] Angelika dodaje shopping item na telefonie (remote) → Mariusz widzi zmianę na Home Dashboard po ≤ 10s (Supabase Realtime)
- [ ] Gdy Bridge offline → Pipeline page przechodzi w "Remote mode", wyświetla stories z Supabase bridge_stories z banner "Remote mode"
- [ ] NightClaw digests dostępne w Supabase — NightClaw page ładuje się gdy Bridge offline (fallback)
- [ ] Konflikty sync loggowane w `kb_sync_log` z `status='error'` i `error_message` — zero cichych błędów

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-12.1 | database | Supabase tabele — bridge_stories, bridge_runs, nightclaw_digests | SQL migration w Supabase: tabele `bridge_stories`, `bridge_runs`, `nightclaw_digests` z project_key column, indexes, updated_at trigger |
| STORY-12.2 | backend | Full Bridge sync — stories, runs, digests do Supabase | Rozszerzenie `sync_to_supabase.js`: sync Bridge stories/runs/digests, obsługa project_key compound key, endpoint `GET /api/sync/status` |
| STORY-12.3 | backend | Smart routing — remote mode dla Pipeline + NightClaw | Middleware w server.cjs: detect remote user → serve Pipeline/NightClaw z Supabase fallback; banner trigger w response header |
| STORY-12.4 | wiring | Supabase Realtime client setup + subscriptions hook | Hook `useRealtimeSync(table, filter)` w `_shared/hooks/useRealtimeSync.ts`: Supabase channel subscription, auto-reconnect, state update callback |
| STORY-12.5 | frontend | Home module — Supabase Realtime integration | Integracja `useRealtimeSync` w ShoppingList i TaskBoard: zastąpienie polling co 30s przez Realtime subscription; banner "Live updates active" gdy remote |
| STORY-12.6 | frontend | Pipeline Remote Mode — banner + read-only UI | Komponent `RemoteModeBanner` w Pipeline page; disable write actions (Bulk Advance, PRD Wizard) gdy remote mode; show last sync timestamp |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | sync |
| Priorytet | Should |
| Szacunek | L (5-7 dni) |
| Ryzyko | Średnie — Supabase Realtime może mieć latency; sync conflicts trudne do debugowania; remote access wymaga expose serwera (Tailscale/Cloudflare Tunnel — poza scope tego epiku) |
| Domeny | database, backend, wiring, frontend |
| Stack | @supabase/supabase-js, node-cron, better-sqlite3, Supabase Realtime (WebSocket), React hooks |
| Uwagi | Remote access (Angelika poza domem) wymaga żeby KiraBoard serwer był dostępny z internetu — Tailscale lub Cloudflare Tunnel. To infrastruktura poza scope EPIC-12 ale Mariusz musi to ustawić żeby Realtime działało dla remote users. Uwaga w README. |
