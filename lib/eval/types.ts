/**
 * lib/eval/types.ts
 * STORY-7.3 — TypeScript types for EvalTask entities.
 */

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
