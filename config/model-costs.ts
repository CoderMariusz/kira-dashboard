// config/model-costs.ts
// Hardcoded API pricing per model (USD per 1M tokens).
// Update these values when model pricing changes.
// Keys must match the `model` field returned by Bridge API GET /api/status/runs.

/** Cost config for a single model. */
export interface ModelCostConfig {
  /** Cost per 1M input tokens in USD. */
  input: number
  /** Cost per 1M output tokens in USD. */
  output: number
  /** Full display name for UI. */
  displayName: string
  /** Chart.js color for the doughnut segment. */
  color: string
}

/**
 * API pricing per model (canonical keys per AC-7).
 * Prices: USD per 1M tokens.
 *
 * AC-7 requirement: exactly these 4 models with these prices.
 */
export const MODEL_COSTS: Record<string, ModelCostConfig> = {
  'kimi-k2.5': { input: 0.0, output: 0.0, displayName: 'Kimi K2.5', color: '#3b82f6' },
  'glm-5':     { input: 0.0, output: 0.0, displayName: 'GLM-5',     color: '#22c55e' },
  'sonnet-4.6':{ input: 3.0, output: 15.0, displayName: 'Sonnet 4.6', color: '#7c3aed' },
  'codex-5.3': { input: 3.0, output: 12.0, displayName: 'Codex 5.3', color: '#ef4444' },
}

/**
 * Ordered list of the 4 known model keys (determines table row order).
 */
export const KNOWN_MODEL_KEYS = ['kimi-k2.5', 'glm-5', 'sonnet-4.6', 'codex-5.3'] as const
export type KnownModelKey = (typeof KNOWN_MODEL_KEYS)[number]

/**
 * Model alias → canonical key mapping.
 * Handles various string formats returned by Bridge API.
 */
export const MODEL_ALIAS_MAP: Record<string, string> = {
  // Kimi variants → 'kimi-k2.5'
  'kimi': 'kimi-k2.5',
  'kimi-k2.5': 'kimi-k2.5',
  'kimi_k2.5': 'kimi-k2.5',
  'kimi-k2': 'kimi-k2.5',
  // GLM variants → 'glm-5'
  'glm': 'glm-5',
  'glm-5': 'glm-5',
  'glm5': 'glm-5',
  'glm_5': 'glm-5',
  // Sonnet variants → 'sonnet-4.6'
  'sonnet': 'sonnet-4.6',
  'sonnet-4.6': 'sonnet-4.6',
  'sonnet_4.6': 'sonnet-4.6',
  'claude-sonnet-4-6': 'sonnet-4.6',
  'claude-sonnet-4.6': 'sonnet-4.6',
  'sonnet-4': 'sonnet-4.6',
  // Codex variants → 'codex-5.3'
  'codex': 'codex-5.3',
  'codex-5.3': 'codex-5.3',
  'codex_5.3': 'codex-5.3',
  'codex-5': 'codex-5.3',
}

/**
 * Resolves an arbitrary model string to a canonical model key.
 * Returns null if the model is not recognized (EC-3: unknown model).
 */
export function resolveModelKey(model: string): string | null {
  const lower = model.toLowerCase().trim()
  return MODEL_ALIAS_MAP[lower] ?? null
}

/**
 * Calculates cost in USD for token counts (single run or aggregated).
 * Uses hardcoded pricing from MODEL_COSTS.
 *
 * @param modelKey - Canonical model key (e.g. 'kimi-k2.5', 'sonnet-4.6')
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calcTokenCost(
  modelKey: string,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_COSTS[modelKey]
  if (!config) return 0
  return (inputTokens * config.input + outputTokens * config.output) / 1_000_000
}
