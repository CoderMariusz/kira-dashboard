---
story_id: STORY-10.4
title: "System Status API — status, api-keys, cron-jobs, restart-bridge"
epic: EPIC-10
domain: backend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-10.2]
blocks: [STORY-10.6]
tags: [api, system, health, bridge, openclaw, cron]
---

## 🎯 User Story
Admin widzi status systemu i może restartować Bridge przez API.

## Spec pełna
`/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/EPIC-10-settings.md` → STORY-10.4

## Endpointy (auth: requireAdmin)

### GET /api/system/status → `app/api/system/status/route.ts`
Równoległy fetch: OpenClaw API + Bridge /api/health. Timeout 5s każdy.
```typescript
// ENV: OPENCLAW_API_URL, OPENCLAW_TOKEN, BRIDGE_URL, BRIDGE_TOKEN
// Response:
{
  openclaw: { version: string; uptime: number; channels: { whatsapp: boolean; telegram: boolean } }
  bridge: { status: "UP"|"DOWN"; version: string|null; lastError: { message: string; timestamp: string }|null }
}
```
Jeśli Bridge nie odpowie w 5s → `{ status: "DOWN", version: null, lastError: null }`.

### GET /api/system/api-keys → `app/api/system/api-keys/route.ts`
Odczytuje z env vars. NIGDY nie zwraca pełnych wartości.
Mask: `sk_abc123` → `sk_••••••ab23` (ostatnie 4 znaki widoczne).
```typescript
// Response: { keys: ApiKeyMeta[] }
interface ApiKeyMeta { name: string; maskedValue: string; status: "active"|"expired"|"unknown"; expiresAt: string|null }
```
Znane klucze do pokazania (z .env.local):
- `ANTHROPIC_API_KEY` → "Anthropic API Key"
- `MOONSHOT_API_KEY` → "Moonshot (Kimi) API Key"
- `ZAI_API_KEY` → "Z.AI (GLM) API Key"
- `OPENROUTER_API_KEY` → "OpenRouter API Key"

### GET /api/system/cron-jobs → `app/api/system/cron-jobs/route.ts`
Proxy do OpenClaw gateway: `GET {OPENCLAW_API_URL}/api/cron/jobs` (auth: Bearer OPENCLAW_TOKEN).
Fallback gdy niedostępny: `{ jobs: [], error: "OpenClaw offline" }`.
```typescript
// Response: { jobs: CronJob[] }
interface CronJob { name: string; schedule: string; lastRun: string|null; lastStatus: "success"|"error"|"running"|"never" }
```

### POST /api/system/restart-bridge → `app/api/system/restart-bridge/route.ts`
`POST {BRIDGE_URL}/api/system/restart` (auth: Bearer BRIDGE_TOKEN). Timeout 10s.
Response: `{ success: true, message: "Bridge restart zainicjowany — usługa wróci za chwilę" }`
Error 503: Bridge offline.

## AC
- GET /status: oba serwisy z timeout 5s; Bridge DOWN jeśli timeout
- GET /api-keys: masked values (4 ostatnie znaki widoczne), zero pełnych wartości
- GET /cron-jobs: lista jobów lub `{ jobs: [], error }` gdy OpenClaw offline
- POST /restart-bridge: 200 jeśli Bridge odpowie, 503 jeśli nie
- Wszystkie: 401/403 dla non-admin

## DoD
- [ ] Testy z mockowanymi fetch (happy path + timeout + offline)
- [ ] Mask funkcja przetestowana (nie ujawnia więcej niż 4 znaki)
- [ ] ENV vars: OPENCLAW_API_URL, OPENCLAW_TOKEN, BRIDGE_URL, BRIDGE_TOKEN (sprawdź .env.local, dodaj jeśli brak)
