// types/pipeline-prd.ts
// Typy dla PRD Wizard (STORY-6.5 / STORY-6.6)
// Używane przez: services/prdService.ts, components/pipeline/NewProjectWizard.tsx

// ─── Questions (POST /api/pipeline/prd-questions) ─────────────────────────────

export interface PrdQuestion {
  id: string
  text: string
  type: 'text' | 'choice'
  options?: string[]
  required: boolean
}

export interface PrdQuestionsResponse {
  questions: PrdQuestion[]
}

// ─── Create from PRD (POST /api/pipeline/create-from-prd) ─────────────────────

export interface PrdStory {
  id: string
  title: string
  domain: 'database' | 'auth' | 'backend' | 'wiring' | 'frontend'
  size: 'short' | 'medium' | 'long'
  dod: string
}

export interface GeneratedEpic {
  epic_id: string
  title: string
  stories: PrdStory[]
  stories_count: number
}

export interface CreateFromPrdRequest {
  prd_text: string
  project_name: string
  project_key: string
  answers: Record<string, string>
}

export interface CreateFromPrdResponse {
  project_key: string
  epics: GeneratedEpic[]
  epics_count: number
  stories_count: number
  bridge_output: string
}

// ─── Bulk Actions (POST /api/stories/bulk-action) — STORY-6.8 ─────────────────

export type BulkAdvanceStatus = 'REVIEW' | 'DONE' | 'MERGE' | 'REFACTOR'
export type BulkAssignModel = 'kimi' | 'glm' | 'sonnet' | 'codex' | 'haiku' | 'opus'

export interface BulkActionRequest {
  story_ids: string[]
  action: 'advance' | 'assign_model'
  payload?: {
    status?: BulkAdvanceStatus
    model?: BulkAssignModel
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
