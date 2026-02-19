export type EvalRunStatus = 'running' | 'done' | 'error'

export interface EvalRunState {
  status: EvalRunStatus
  startedAt: number
  completedAt?: number
  result?: {
    output?: string
    error?: string
  }
}

declare global {
  var __evalRunStore: Map<string, EvalRunState> | undefined
}

export const evalStore: Map<string, EvalRunState> =
  globalThis.__evalRunStore ?? (globalThis.__evalRunStore = new Map<string, EvalRunState>())

const ONE_HOUR_MS = 60 * 60 * 1000
const TEN_MINUTES_MS = 10 * 60 * 1000

export function cleanupOldRuns(now = Date.now()): void {
  const oneHourAgo = now - ONE_HOUR_MS
  const runningCutoff = now - TEN_MINUTES_MS

  for (const [runId, state] of evalStore.entries()) {
    if (state.completedAt !== undefined && state.completedAt < oneHourAgo) {
      evalStore.delete(runId)
      continue
    }

    if (state.status === 'running' && state.startedAt < runningCutoff) {
      evalStore.delete(runId)
    }
  }
}
