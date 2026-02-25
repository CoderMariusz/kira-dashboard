---
story_id: STORY-9.5
title: "Typy TS + serwis kliencki NightClaw (4 endpointy)"
epic: EPIC-9
domain: wiring
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-9.1, STORY-9.2, STORY-9.3, STORY-9.4]
blocks: [STORY-9.6, STORY-9.7, STORY-9.8]
tags: [types, swr, service, nightclaw]
---

## 🎯 User Story
Frontend ma gotowe typy i hooki bez any dla całej strony NightClaw.

## Pliki do stworzenia
- `types/nightclaw.ts` — wszystkie interfejsy
- `services/nightclaw.service.ts` — fetch wrapper dla 4 endpointów
- `hooks/useNightClawDigest.ts` — SWR hook (refreshInterval: 60s)
- `hooks/useNightClawHistory.ts` — SWR hook
- `hooks/useNightClawSkillsDiff.ts` — SWR hook
- `hooks/useNightClawResearch.ts` — SWR hook

## Typy kluczowe
```typescript
// types/nightclaw.ts
export interface ModelStats { models: Record<string, ModelStatEntry>; last_updated: string; next_review: string }
export interface ModelStatEntry { stories_completed: number; stories_failed: number; success_rate: number; avg_duration_min: number; last_story_id: string; stories_with_refactor: number }
export interface DigestSummary { new_patterns: number; lessons_extracted: number; anti_patterns_flagged: number; open_issues: number; generated_at: string }
export interface DigestResponse { date: string; markdown: string; summary: DigestSummary; model_stats: ModelStats }
export type RunStatus = "ok" | "error" | "missing"
export interface HistoryEntry { date: string; status: RunStatus }
export interface HistoryResponse { entries: HistoryEntry[]; total_runs: number; total_errors: number }
export interface SkillDiff { name: string; path: string; diff: string; lines_added: number; lines_removed: number; modified_at: string }
export interface SkillsDiffResponse { skills: SkillDiff[]; total_modified: number }
export interface ResearchFile { filename: string; title: string; preview: string; content: string; modified_at: string }
export interface ResearchResponse { files: ResearchFile[] }
```

## Hooki SWR
- `useNightClawDigest(date?: string)` — key: `/api/nightclaw/digest?date=...`; refreshInterval: 60s; revalidateOnFocus: false
- `useNightClawHistory()` — key: `/api/nightclaw/history`; refreshInterval: 300s
- `useNightClawSkillsDiff()` — key: `/api/nightclaw/skills-diff`; refreshInterval: 300s
- `useNightClawResearch()` — key: `/api/nightclaw/research`; refreshInterval: 300s

Każdy hook zwraca: `{ data, isLoading, error, refresh }`

## Obsługa błędów (po polsku)
- 401 → "Sesja wygasła — zaloguj się ponownie"
- 404 → "Brak danych dla wybranego dnia"
- 500/503 → "Błąd serwera — Bridge może być offline"
- Network → "Brak połączenia z serwerem"

## DoD
- [ ] Zero `any` w typach
- [ ] Wszystkie 4 hooki SWR z poprawnymi refreshInterval
- [ ] `tsc --noEmit` bez błędów
