// types/api.ts
// Shared API response types used across all route handlers and hooks.
// RULE: Define ApiResponse<T> here FIRST — hooks and routes must share these types.

/**
 * Generic API success response wrapper.
 * All endpoints that return lists MUST use this shape: { data: T[] }
 * Hooks expect this format — do NOT return bare arrays.
 */
export interface ApiResponse<T> {
  data: T[]
}

/**
 * Generic API error response.
 * Returned by all endpoints on error.
 */
export interface ApiErrorResponse {
  error: string
}

// ─── Sync / Hybrid Mode types ─────────────────────────────────────────────

/** A story row from bridge_stories Supabase table (read-only, synced from SQLite). */
export interface BridgeSyncStory {
  project_id: string
  id: string
  epic_id: string
  title: string
  file_path: string
  status: string
  size: string
  expected_duration_min: number
  depends_on: string[]
  parallel_with: string[]
  assigned_worker: string | null
  branch: string | null
  definition_of_done: string
  model: string | null
  created_at: string | null
  updated_at: string | null
  started_at: string | null
  synced_at: string
}

/** An epic row from bridge_epics with nested stories. */
export interface BridgeSyncEpic {
  project_id: string
  id: string
  title: string
  file_path: string
  status: string
  created_at: string | null
  synced_at: string
  stories: BridgeSyncStory[]
}

/** A project row from bridge_projects. */
export interface BridgeSyncProject {
  key: string
  name: string
  path: string
  type: string
  description: string
  bridge_project: boolean
  is_current: boolean
  created_at: string | null
  updated_at: string | null
  synced_at: string
}

/** A run row from bridge_runs. */
export interface BridgeSyncRun {
  id: string
  story_id: string
  project_id: string | null
  step: string
  worker: string
  model: string
  status: string
  attempt_number: number
  started_at: string | null
  ended_at: string | null
  duration_ms: number | null
  error_message: string | null
  synced_at: string
}

/** Response shape for GET /api/sync/status */
export interface SyncStatusResponse {
  source: 'supabase'
  synced_at: string | null
  projects: BridgeSyncProject[]
  epics: BridgeSyncEpic[]
}

/** Response shape for GET /api/sync/runs */
export interface SyncRunsResponse {
  data: BridgeSyncRun[]
  total: number
}

// ─── Epics API types (STORY-12.8) ────────────────────────────────────────

/** Epic with calculated progress percentage. Returned by GET /api/epics. */
export interface EpicWithProgress {
  project_id: string
  id: string
  title: string
  file_path: string
  status: string
  total_stories: number
  done_stories: number
  created_at: string | null
  synced_at: string
  progress: number
}

/** Response shape for GET /api/epics */
export interface EpicsResponse {
  data: EpicWithProgress[]
}
