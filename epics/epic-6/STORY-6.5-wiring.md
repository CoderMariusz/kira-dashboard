---
story_id: STORY-6.5
title: "Typy TypeScript i serwisy klienta dla PRD wizard, bulk actions i project stats"
epic: EPIC-6
module: pipeline
domain: wiring
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 4h
depends_on: [STORY-6.1, STORY-6.2, STORY-6.3, STORY-6.4]
blocks: [STORY-6.6, STORY-6.7, STORY-6.8]
tags: [types, typescript, services, swr, hooks, pipeline, prd, bulk-actions]
---

## 🎯 User Story

**Jako** warstwa frontendowa kira-dashboard
**Chcę** mieć wspólne typy TypeScript i serwisy klienta dla wszystkich 4 nowych endpointów EPIC-6
**Żeby** komponenty wizard, bulk actions i project switcher mogły korzystać z otypowanych danych bez duplikowania logiki fetch

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Pliki do stworzenia:
```
types/pipeline-prd.ts          → wszystkie typy dla EPIC-6
services/prdService.ts         → fetch wrapper dla prd-questions i create-from-prd
services/projectsService.ts    → fetch wrapper dla projects/stats i bulk-action
hooks/useProjectStats.ts       → SWR hook dla GET /api/projects/stats
```

Stack:
- TypeScript strict mode — zero `any`
- `swr` (v2) — `useProjectStats` hook
- Natywny `fetch` w serwisach (jak istniejące serwisy w projekcie)

### Powiązane pliki
- `app/api/pipeline/prd-questions/route.ts` (STORY-6.1) — typy już zdefiniowane inline → przenieś tutaj
- `app/api/pipeline/create-from-prd/route.ts` (STORY-6.2)
- `app/api/stories/bulk-action/route.ts` (STORY-6.3)
- `app/api/projects/stats/route.ts` (STORY-6.4)
- Istniejące serwisy w projekcie (np. `hooks/useModels.ts`) — wzorzec SWR hook

### Stan systemu przed tą story
- Wszystkie 4 endpointy EPIC-6 zaimplementowane (STORY-6.1–6.4)

---

## ✅ Acceptance Criteria

### AC-1: Typy są eksportowane i importowalne
GIVEN: plik `types/pipeline-prd.ts` istnieje
WHEN: inny plik importuje typy `import { PrdQuestion, BulkActionRequest } from '@/types/pipeline-prd'`
THEN: TypeScript nie zgłasza błędów kompilacji
AND: zero `any` w pliku typów

### AC-2: `prdService.getQuestions` wywołuje poprawny endpoint
GIVEN: `prdService.getQuestions("tekst PRD...")`
WHEN: serwis jest wywołany
THEN: wysyłany jest `POST /api/pipeline/prd-questions` z `{ prd_text: "tekst PRD..." }` w body
AND: zwracany jest `PrdQuestionsResponse` lub rzucany jest `ApiError` z polskim komunikatem

### AC-3: `prdService.createFromPrd` wywołuje poprawny endpoint
GIVEN: `prdService.createFromPrd({ prd_text, project_name, project_key, answers })`
WHEN: serwis jest wywołany
THEN: wysyłany jest `POST /api/pipeline/create-from-prd` z prawidłowym body
AND: zwracany jest `CreateFromPrdResponse` lub rzucany jest `ApiError`

### AC-4: `projectsService.bulkAction` obsługuje partial success
GIVEN: `projectsService.bulkAction({ story_ids: [...], action: "advance", payload: { status: "REVIEW" } })`
WHEN: serwis jest wywołany
THEN: wysyłany jest `POST /api/stories/bulk-action`
AND: zwracany jest `BulkActionResponse` (zawsze 200 — partial success nie jest błędem)

### AC-5: `useProjectStats` hook — refresh co 60 sekund
GIVEN: komponent używający `const { stats, isLoading } = useProjectStats()`
WHEN: hook jest zamontowany
THEN: SWR fetchuje `GET /api/projects/stats` z `refreshInterval: 60_000`
AND: `stats` ma typ `ProjectsStatsResponse | null` (null gdy loading lub error)
AND: `isLoading: boolean` jest poprawnie ustawiony

### AC-6: Mapowanie błędów HTTP → komunikaty PL
GIVEN: serwis otrzymuje odpowiedź 422 z serwera
WHEN: serwis parsuje błąd
THEN: rzucony `ApiError.message` = "AI nie zdołało wygenerować struktury projektu — spróbuj ponownie"

---

## 🔌 Szczegóły Wiring

### Typy współdzielone — `types/pipeline-prd.ts`

```typescript
// ── PRD Questions ──────────────────────────────────────────────
export interface PrdQuestion {
  id: string               // "q1" – "q5"
  text: string             // pytanie po polsku
  type: 'text' | 'choice'
  options?: string[]       // tylko dla type='choice'
  required: boolean
}

export interface PrdQuestionsRequest {
  prd_text: string         // min 50, max 20 000 znaków
}

export interface PrdQuestionsResponse {
  questions: PrdQuestion[]
}

// ── Create From PRD ────────────────────────────────────────────
export interface CreateFromPrdRequest {
  prd_text: string
  project_name: string     // min 2, max 100 znaków
  project_key: string      // /^[a-z0-9-]+$/, min 3, max 40 znaków
  answers: Record<string, string>
}

export interface GeneratedStory {
  id: string               // "STORY-1.1"
  title: string
  domain: string           // "database"|"auth"|"backend"|"wiring"|"frontend"
}

export interface GeneratedEpic {
  epic_id: string          // "EPIC-1"
  title: string
  stories_count: number
  stories: GeneratedStory[]
}

export interface CreateFromPrdResponse {
  project_key: string
  epics: GeneratedEpic[]
  epics_count: number
  stories_count: number
  bridge_output: string
}

// ── Bulk Actions ───────────────────────────────────────────────
export type BulkActionType = 'advance' | 'assign_model'

export interface BulkActionRequest {
  story_ids: string[]
  action: BulkActionType
  payload?: {
    status?: string       // dla advance
    model?: string        // dla assign_model
  }
}

export interface BulkActionResult {
  id: string
  success: boolean
  error?: string
}

export interface BulkActionResponse {
  results: BulkActionResult[]
  success_count: number
  failure_count: number
}

// ── Project Stats ──────────────────────────────────────────────
export interface ProjectStats {
  key: string
  name: string
  is_current: boolean
  total: number
  done: number
  in_progress: number
  review: number
  blocked: number
  completion_pct: number
}

export interface ProjectsStatsResponse {
  projects: ProjectStats[]
  fetched_at: string
  offline?: boolean
}

// ── Error ──────────────────────────────────────────────────────
export interface ApiError {
  statusCode: number
  message: string
}
```

### Mapowanie błędów
```typescript
// services/prd.errors.ts (lub inline w serwisach)
const PRD_ERROR_MESSAGES: Record<number, string> = {
  400: 'Sprawdź poprawność wypełnionych pól',
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  409: 'Projekt o tym kluczu już istnieje w Bridge',
  422: 'AI nie zdołało wygenerować struktury projektu — spróbuj ponownie',
  503: 'Serwis AI tymczasowo niedostępny',
  500: 'Błąd serwera — sprawdź logi Bridge CLI',
}
```

### Serwis `services/prdService.ts`
```typescript
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw {
      statusCode: res.status,
      message: body.error ?? PRD_ERROR_MESSAGES[res.status] ?? `Błąd ${res.status}`,
    } as ApiError
  }
  return res.json()
}

export const prdService = {
  getQuestions: (prd_text: string): Promise<PrdQuestionsResponse> =>
    fetch('/api/pipeline/prd-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prd_text }),
    }).then(handleResponse<PrdQuestionsResponse>),

  createFromPrd: (req: CreateFromPrdRequest): Promise<CreateFromPrdResponse> =>
    fetch('/api/pipeline/create-from-prd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then(handleResponse<CreateFromPrdResponse>),
}
```

### Serwis `services/projectsService.ts`
```typescript
export const projectsService = {
  getStats: (): Promise<ProjectsStatsResponse> =>
    fetch('/api/projects/stats').then(handleResponse<ProjectsStatsResponse>),

  bulkAction: (req: BulkActionRequest): Promise<BulkActionResponse> =>
    fetch('/api/stories/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }).then(handleResponse<BulkActionResponse>),
}
```

### Hook `hooks/useProjectStats.ts`
```typescript
'use client'
import useSWR from 'swr'
import type { ProjectsStatsResponse } from '@/types/pipeline-prd'

const fetcher = () => projectsService.getStats()

export function useProjectStats() {
  const { data, isLoading, error, mutate } = useSWR<ProjectsStatsResponse>(
    '/api/projects/stats',
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
    }
  )
  return {
    stats: data ?? null,
    isLoading,
    error,
    mutate,
  }
}
```

---

## ⚠️ Edge Cases

### EC-1: Serwis otrzymuje `undefined` z serwera dla opcjonalnego pola
Scenariusz: `ProjectStats.review` jest undefined (nowy klucz nie ma takich stories)
Oczekiwane zachowanie: typy muszą to obsłużyć — użyj `review: number` (0 jako default w API)

### EC-2: `handleResponse` gdy body nie jest JSON
Scenariusz: Serwer zwraca HTML error page (502 z load balancer)
Oczekiwane zachowanie: `.catch(() => ({}))` w `res.json()` → fallback do `PRD_ERROR_MESSAGES[502]`

---

## 🚫 Out of Scope tej Story
- Testy jednostkowe serwisów (opcjonalne, nie blokują)
- Caching po stronie serwisu (SWR zajmuje się tym w hooku)
- Websocket / realtime

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów
- [ ] `npx tsc --noEmit` bez błędów — zero `any`
- [ ] Wszystkie typy wyeksportowane z `types/pipeline-prd.ts`
- [ ] Oba serwisy (`prdService`, `projectsService`) zaimplementowane z `handleResponse`
- [ ] `useProjectStats` hook z `refreshInterval: 60_000` i `revalidateOnFocus: true`
- [ ] Mapowanie błędów HTTP → polskie komunikaty kompletne dla wszystkich kodów z endpointów EPIC-6
