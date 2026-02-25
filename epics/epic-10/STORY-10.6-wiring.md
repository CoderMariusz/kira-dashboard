---
story_id: STORY-10.6
title: "Typy i serwis System Status (SystemService + hooki)"
epic: EPIC-10
domain: wiring
difficulty: simple
recommended_model: kimi-k2.5
depends_on: [STORY-10.4]
blocks: [STORY-10.8]
tags: [types, service, swr, system, settings]
---

## 🎯 User Story
Frontend system page ma gotowe typy i hooki dla statusu infrastruktury.

## Pliki
- `types/system.types.ts` — SystemStatusResponse, ApiKeyMeta, CronJob, BridgeHealth, OpenClawStatus
- `services/system.service.ts` — SystemService
- `hooks/useSystemStatus.ts`, `hooks/useApiKeys.ts`, `hooks/useCronJobs.ts`

## Typy
```typescript
// types/system.types.ts
export interface OpenClawStatus { version: string; uptime: number; channels: { whatsapp: boolean; telegram: boolean } }
export interface BridgeHealth { status: "UP"|"DOWN"; version: string|null; lastError: { message: string; timestamp: string }|null }
export interface SystemStatusResponse { openclaw: OpenClawStatus; bridge: BridgeHealth }
export interface ApiKeyMeta { name: string; maskedValue: string; status: "active"|"expired"|"unknown"; expiresAt: string|null }
export interface CronJob { name: string; schedule: string; lastRun: string|null; lastStatus: "success"|"error"|"running"|"never" }
```

## SystemService
```typescript
export const SystemService = {
  getStatus: (): Promise<SystemStatusResponse>
  getApiKeys: (): Promise<ApiKeyMeta[]>
  getCronJobs: (): Promise<CronJob[]>
  restartBridge: (): Promise<{ message: string }>
}
```

## Hooki SWR
- `useSystemStatus()` — refreshInterval: 30s; revalidateOnFocus: false
- `useApiKeys()` — refreshInterval: 300s
- `useCronJobs()` — refreshInterval: 60s

Każdy zwraca: `{ data, isLoading, error, refresh }`

## Obsługa błędów (po polsku)
- 503 → "Bridge jest niedostępny"
- 500 → "Błąd serwera systemu"

## DoD
- [ ] Zero `any`
- [ ] Hooki z poprawnymi refreshInterval
- [ ] `tsc --noEmit` czyste
