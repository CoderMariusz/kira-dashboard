/**
 * lib/eval/types.ts
 * STORY-7.3 + STORY-7.8 — TypeScript types for EvalTask and EvalRun entities.
 */

// ─── EvalTask ─────────────────────────────────────────────────────────────────

export interface EvalTask {
  id: string
  prompt: string
  expected_output: string
  category: 'API' | 'Auth' | 'CRUD' | 'Pipeline' | 'Reasoning' | 'Home'
  target_model: 'haiku' | 'kimi' | 'sonnet' | 'codex' | 'glm'
  is_active: boolean
  created_at: string
  updated_at: string
}

export const EVAL_CATEGORIES = ['API', 'Auth', 'CRUD', 'Pipeline', 'Reasoning', 'Home'] as const
export const EVAL_MODELS = ['haiku', 'kimi', 'sonnet', 'codex', 'glm'] as const

export type EvalCategory = typeof EVAL_CATEGORIES[number]
export type EvalModel = typeof EVAL_MODELS[number]

// ─── EvalRun ──────────────────────────────────────────────────────────────────

export type EvalRunStatus = 'completed' | 'failed' | 'running' | 'error' | 'pending'

export interface EvalRun {
  id: string
  run_type: string
  status: EvalRunStatus
  started_at: string
  finished_at: string | null
  overall_score: number    // 0–100
  task_count: number
  passed_count: number
  failed_count: number
  /** Populated from useEvalRunDetail when detail is loaded. */
  delta?: {
    has_previous: boolean
    fixed: number
    new_failures: number
    unchanged: number
  }
}

// ─── EvalTaskResult ───────────────────────────────────────────────────────────

export interface DiffLine {
  type: 'equal' | 'insert' | 'delete'
  value: string   // line content
}

export interface EvalTaskResult {
  id: string
  task_id: string
  run_id: string
  prompt: string            // = task_prompt from bridge (truncated)
  category: string          // = task_category from bridge
  status: 'pass' | 'fail'  // derived from `passed`
  diff_score: number        // 0–100
  diff_lines: DiffLine[]    // pre-computed; empty when not available
  expected_output: string   // expected output (may be empty when not fetched)
  actual_output: string | null
  error?: string            // any error message from the run
  created_at: string
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface EvalRunsListResponse {
  runs: EvalRun[]
  total: number
  page: number
  pageSize: number
}

export interface EvalRunDiff {
  has_previous: boolean
  fixed: number           // count of newly passing tasks
  new_failures: number    // count of newly failing tasks
  unchanged: number
}

export interface EvalRunDetail {
  run: EvalRun
  task_results: EvalTaskResult[]
  diff: EvalRunDiff | null
}
