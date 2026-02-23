// types/models.ts
// Shared types for the Models API (STORY-5.1, STORY-5.4).
// Used by: app/api/models/route.ts, hooks/useModels.ts, hooks/useModelMetrics.ts, components.

/**
 * Computed per-model statistics derived from Bridge runs data.
 * null for the whole object means Bridge is offline (no data available).
 */
export interface ModelStats {
  /** Total number of runs recorded for this model. */
  total_runs: number
  /** Fraction of successful runs: 0.0–1.0. 0 when total_runs === 0. */
  success_rate: number
  /** Average run duration in seconds. null when no completed runs with duration data. */
  avg_duration_s: number | null
  /** Sum of all run costs in USD (uses cost_usd if present, else calculates from tokens). */
  total_cost_usd: number
  /** ISO 8601 timestamp of the most recent run. null when no runs. */
  last_run_at: string | null
}

/**
 * Full model entry returned by GET /api/models.
 * Combines static model metadata (costs, provider) with live runtime statistics.
 */
export interface ModelEntry {
  /** Short alias used in pipeline config, e.g. "kimi", "glm", "sonnet", "codex". */
  alias: string
  /** Canonical model key, e.g. "kimi-k2.5", "glm-5", "sonnet-4.6", "codex-5.3". */
  canonical_key: string
  /** Full display name for UI, e.g. "Kimi K2.5", "Sonnet 4.6". */
  display_name: string
  /** AI provider name, e.g. "Moonshot AI", "Anthropic". */
  provider: string
  /** Model identifier string used by the provider. null if not applicable. */
  model_id: string | null
  /** Cost per 1M input tokens in USD. May be overridden at runtime (STORY-5.2). */
  cost_input_per_1m: number
  /** Cost per 1M output tokens in USD. May be overridden at runtime (STORY-5.2). */
  cost_output_per_1m: number
  /** Whether this model is included in monitoring/cost tracking. Managed by localStorage (STORY-5.7). */
  monitoring_enabled: boolean
  /** Live stats from Bridge runs. null when Bridge is offline. */
  stats: ModelStats | null
}

/**
 * One data point in the per-model time-series (one day bucket).
 * Returned by GET /api/models/[alias]/metrics (STORY-5.3).
 */
export interface ModelMetricPoint {
  /** Date in "YYYY-MM-DD" format (UTC). */
  date: string
  /** Total cost in USD for this day. */
  cost_usd: number
  /** Total input tokens for this day. */
  tokens_in: number
  /** Total output tokens for this day. */
  tokens_out: number
  /** Number of runs for this day. */
  runs: number
}

/**
 * Full response from GET /api/models/[alias]/metrics (STORY-5.3).
 */
export interface ModelMetricsResponse {
  alias: string
  period: '7d' | '30d'
  /** Array of daily points sorted ASC by date, no gaps. Length = 7 or 30. */
  points: ModelMetricPoint[]
}

/**
 * Request body for PATCH /api/models/[alias] — cost override update (STORY-5.2).
 */
export interface ModelCostUpdateDTO {
  /** New input cost per 1M tokens in USD. Optional. */
  cost_input_per_1m?: number
  /** New output cost per 1M tokens in USD. Optional. */
  cost_output_per_1m?: number
}

/**
 * Shape stored by lib/model-overrides.ts.
 * Maps canonical_key → cost override values.
 */
export type ModelOverrideStore = Map<string, { cost_input_per_1m: number; cost_output_per_1m: number }>
