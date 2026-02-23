// lib/model-monitoring.ts
// Utility for persisting per-model monitoring toggle state in localStorage (STORY-5.4).
//
// Storage key : 'kira_model_monitoring'
// Value format: Record<canonical_key, boolean>
//               e.g. { 'kimi-k2.5': false, 'glm-5': true }
//
// Absence of a key in the record means the model IS monitored (default = true).
// SSR-safe: all functions guard against `window` being undefined.

const STORAGE_KEY = 'kira_model_monitoring'

/**
 * Reads the full monitoring state from localStorage.
 * Returns an empty object when localStorage is unavailable (SSR, private browsing)
 * or the stored JSON is corrupted.
 */
export function getMonitoringState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    // JSON.parse threw (corrupted data) — return clean state.
    return {}
  }
}

/**
 * Persists a monitoring toggle for one model.
 *
 * @param alias   - canonical_key of the model, e.g. 'kimi-k2.5'
 * @param enabled - true = monitor, false = disable
 */
export function setModelMonitoring(alias: string, enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const state = getMonitoringState()
    state[alias] = enabled
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage full or blocked — degrade silently.
  }
}

/**
 * Returns whether a model is currently being monitored.
 * Defaults to true when no record exists for the given alias.
 *
 * @param alias - canonical_key of the model, e.g. 'sonnet-4.6'
 */
export function isModelMonitored(alias: string): boolean {
  const state = getMonitoringState()
  // Absence of the key → default = monitored.
  return state[alias] !== false
}
