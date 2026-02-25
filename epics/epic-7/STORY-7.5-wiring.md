---
story_id: STORY-7.5
title: "TypeScript types + evalTasksService + evalRunsService"
epic: EPIC-7
domain: wiring
difficulty: easy
recommended_model: kimi
priority: must
depends_on: [STORY-7.3, STORY-7.4]
blocks: [STORY-7.6, STORY-7.8]
---

## 🎯 Cel
Stworzyć typy TypeScript i serwisy klienckie dla Eval CRUD i historii runów.
Frontend korzysta wyłącznie z tych serwisów — nie wywołuje fetch bezpośrednio.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Istniejący pattern: `cat services/prdService.ts` — taki sam wzorzec.

## ✅ Acceptance Criteria

### AC-1: Typy w `types/eval.ts`
```typescript
export type EvalCategory = 'API' | 'Auth' | 'CRUD' | 'Pipeline' | 'Reasoning' | 'Home'
export type EvalTargetModel = 'haiku' | 'kimi' | 'sonnet' | 'codex' | 'glm'

export interface EvalTask {
  id: string
  prompt: string
  expected_output: string
  category: EvalCategory
  target_model: EvalTargetModel
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EvalTaskForm {
  prompt: string
  expected_output: string
  category: EvalCategory
  target_model: EvalTargetModel
  is_active?: boolean
}

export interface DiffLine {
  type: 'equal' | 'insert' | 'delete'
  value: string
}

export interface EvalTaskResult {
  task_id: string
  task_prompt: string
  task_category: EvalCategory
  task_model: EvalTargetModel
  expected_output: string
  actual_output: string
  passed: boolean
  diff_score: number
  diff_lines: DiffLine[]
}

export interface EvalRunSummary {
  id: string
  created_at: string
  duration_ms: number | null
  overall_score: number
  total_tasks: number
  passed_tasks: number
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'ERROR'
}

export interface EvalRunDelta {
  newly_failed: string[]
  newly_passed: string[]
  unchanged_fail: string[]
  unchanged_pass: string[]
}

export interface EvalRunDetail {
  run: EvalRunSummary
  task_results: EvalTaskResult[]
  delta: EvalRunDelta | null
}

export interface EvalTasksResponse {
  tasks: EvalTask[]
}

export interface EvalRunsResponse {
  runs: EvalRunSummary[]
  total: number
  has_more: boolean
}
```

### AC-2: `services/evalTasksService.ts`
```typescript
export async function getEvalTasks(opts?: { category?: EvalCategory; active_only?: boolean }): Promise<EvalTask[]>
export async function createEvalTask(form: EvalTaskForm): Promise<EvalTask>
export async function updateEvalTask(id: string, form: Partial<EvalTaskForm>): Promise<EvalTask>
export async function deleteEvalTask(id: string): Promise<void>
```
- Mapuj błędy HTTP na czytelne polskie komunikaty (pattern z prdService.ts)
- 403 → `'Brak uprawnień do zarządzania golden tasks'`
- 404 → `'Zadanie testowe nie istnieje'`

### AC-3: `services/evalRunsService.ts`
```typescript
export async function getEvalRuns(opts?: { limit?: number; offset?: number }): Promise<EvalRunsResponse>
export async function getEvalRunDetail(runId: string): Promise<EvalRunDetail>
```

### AC-4: `hooks/useEvalTasks.ts`
```typescript
export function useEvalTasks(opts?: { category?: EvalCategory; active_only?: boolean }): {
  tasks: EvalTask[]
  isLoading: boolean
  error: Error | null
  mutate: () => void
}
```

### AC-5: `hooks/useEvalRuns.ts`
```typescript
export function useEvalRuns(opts?: { limit?: number }): {
  runs: EvalRunSummary[]
  total: number
  isLoading: boolean
  mutate: () => void
}

export function useEvalRunDetail(runId: string | null): {
  detail: EvalRunDetail | null
  isLoading: boolean
}
```

### AC-6: TypeScript clean
`npx tsc --noEmit 2>&1 | grep -E "eval|Eval"` → 0 błędów

### AC-7: Testy hooków
`__tests__/hooks/useEvalTasks.test.tsx` i `useEvalRuns.test.tsx`:
- loading state
- success state z danymi
- error state
`npm test __tests__/hooks/useEval` → PASS

## ✔️ DoD
- [ ] `types/eval.ts` kompletne
- [ ] Oba serwisy działają
- [ ] Oba hooki z SWR
- [ ] Testy hooków PASS
- [ ] TS clean
- [ ] Commit na `feature/STORY-7.5`
