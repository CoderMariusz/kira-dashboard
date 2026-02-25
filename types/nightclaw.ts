// types/nightclaw.ts
// STORY-9.5 — TypeScript interfaces for NightClaw API (4 endpoints)
// Zero `any` — all types are strict.

// ─── /api/nightclaw/digest ────────────────────────────────────────────────────

export interface ModelStatEntry {
  stories_completed: number
  stories_failed: number
  success_rate: number
  avg_duration_min: number
  last_story_id: string
  stories_with_refactor: number
}

/** Model statistics keyed by model alias (e.g. "kimi", "sonnet") */
export interface ModelStats {
  models: Record<string, ModelStatEntry>
  last_updated: string
  next_review: string
}

export interface DigestSummary {
  new_patterns: number
  lessons_extracted: number
  anti_patterns_flagged: number
  open_issues: number
  generated_at: string
}

export interface DigestResponse {
  date: string
  markdown: string
  summary: DigestSummary
  model_stats: ModelStats | null
}

// ─── /api/nightclaw/history ───────────────────────────────────────────────────

export type RunStatus = 'ok' | 'error' | 'missing'

export interface HistoryEntry {
  date: string
  status: RunStatus
}

export interface HistoryResponse {
  entries: HistoryEntry[]
  total_runs: number
  total_errors: number
}

// ─── /api/nightclaw/skills-diff ──────────────────────────────────────────────

export interface SkillDiff {
  name: string
  path: string
  diff: string
  lines_added: number
  lines_removed: number
  modified_at: string
}

export interface SkillsDiffResponse {
  skills: SkillDiff[]
  total_modified: number
}

// ─── /api/nightclaw/research ─────────────────────────────────────────────────

export interface ResearchFile {
  filename: string
  title: string
  preview: string
  content: string
  modified_at: string
}

export interface ResearchResponse {
  files: ResearchFile[]
}
