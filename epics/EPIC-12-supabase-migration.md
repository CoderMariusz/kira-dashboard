# EPIC-12 — Supabase Migration: Dashboard niezależny od lokalnego Bridge

## Cel
Zmigrować wszystkie endpointy które wymagają lokalnego Bridge/systemu plików do Supabase,
żeby dashboard działał w pełni na Vercelu bez dostępu do Mac Mini.

## Problem
Aktualnie ~70% API routes używa `BRIDGE_DIR`, `execSync`, lub czyta lokalne pliki.
Na Vercelu (serverless) nie ma dostępu do lokalnego systemu plików ani Bridge CLI.
Dashboard wyświetla puste dane lub błędy dla większości sekcji.

## Architektura docelowa
```
Bridge (Mac Mini) → sync script → Supabase DB → Vercel (Next.js) → User
```

Bridge lokalnie zapisuje dane do Supabase. Dashboard tylko czyta z Supabase.
Write operations (advance, start story) → przez Bridge HTTP API lub webhook.

## Nowe tabele Supabase (migracje)
| Tabela | Dane | Źródło |
|--------|------|---------|
| `bridge_stories` | stories + status | Bridge SQLite sync |
| `bridge_epics` | epics + progress | Bridge SQLite sync |
| `bridge_runs` | pipeline runs history | Bridge SQLite sync (już częściowo) |
| `nightclaw_digests` | NightClaw digest JSON | NightClaw cron → Supabase |
| `nightclaw_research` | research findings | NightClaw cron → Supabase |
| `kira_patterns` | patterns.md treść | Bridge sync / API write |
| `kira_lessons` | lessons_learned.md treść | Bridge sync / API write |

## Stories

| ID | Domena | Tytuł | Model | Priorytet |
|----|--------|-------|-------|-----------|
| STORY-12.1 | database | Migracja Supabase — tabele bridge_stories, bridge_epics, bridge_runs | kimi-k2.5 | must |
| STORY-12.2 | database | Migracja Supabase — tabele nightclaw_digests, nightclaw_research, nightclaw_skills_diff | kimi-k2.5 | must |
| STORY-12.3 | database | Migracja Supabase — tabele kira_patterns, kira_lessons | kimi-k2.5 | must |
| STORY-12.4 | backend | Bridge sync script — stories + epics → Supabase (rozszerzenie sync_bridge_to_supabase.py) | sonnet-4.6 | must |
| STORY-12.5 | backend | Bridge sync script — NightClaw data → Supabase (digest, research, skills-diff) | kimi-k2.5 | must |
| STORY-12.6 | backend | Bridge sync script — patterns + lessons → Supabase | kimi-k2.5 | must |
| STORY-12.7 | backend | API /api/stories — migracja z Bridge CLI na Supabase (GET list + GET detail) | sonnet-4.6 | must |
| STORY-12.8 | backend | API /api/epics — nowy endpoint z Supabase | kimi-k2.5 | must |
| STORY-12.9 | backend | API /api/stories/[id]/advance — write przez Bridge HTTP zamiast execSync | sonnet-4.6 | must |
| STORY-12.10 | backend | API /api/nightclaw/* — migracja z lokalnych plików na Supabase | kimi-k2.5 | must |
| STORY-12.11 | backend | API /api/patterns + /api/lessons — migracja z lokalnych plików na Supabase | kimi-k2.5 | must |
| STORY-12.12 | backend | API /api/models + /api/runs — ulepszony Supabase fallback (usuń Bridge-first) | sonnet-4.6 | should |
| STORY-12.13 | wiring | Supabase Realtime — stories + runs live updates (SSE zastąpione Supabase subscriptions) | sonnet-4.6 | should |
| STORY-12.14 | backend | Full test suite — integration testy wszystkich zmigrowanych endpointów | sonnet-4.6 | must |
| STORY-12.15 | backend | E2E testy — Playwright full flow na produkcji bez Bridge | sonnet-4.6 | must |

## Dependency chain
Wave 1 (parallel): 12.1, 12.2, 12.3 (DB migrations)
Wave 2 (parallel): 12.4, 12.5, 12.6 (sync scripts) — deps: 12.1, 12.2, 12.3
Wave 3 (parallel): 12.7, 12.8, 12.9, 12.10, 12.11, 12.12 (API migrations) — deps: 12.1-12.6
Wave 4: 12.13 (Realtime) — deps: 12.7, 12.8
Wave 5 (parallel): 12.14, 12.15 (testy) — deps: wszystkie poprzednie

## Out of Scope
- Migracja Bridge (Python) do Supabase — Bridge pozostaje lokalny
- Real-time pipeline execution przez Supabase — Bridge pozostaje executorem
- EPIC-13 (Polish) — bugfixy i UX po migracji
