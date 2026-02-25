/**
 * types/system.types.ts
 * STORY-10.4 — Type definitions for System Status API.
 */

// ─── OpenClaw Status ──────────────────────────────────────────────────────────

export interface OpenClawChannels {
  whatsapp: boolean
  telegram: boolean
}

export interface OpenClawStatus {
  version: string
  uptime: number
  channels: OpenClawChannels
}

// ─── Bridge Status ────────────────────────────────────────────────────────────

export interface BridgeLastError {
  message: string
  timestamp: string
}

export interface BridgeStatus {
  status: 'UP' | 'DOWN'
  version: string | null
  lastError: BridgeLastError | null
}

// ─── System Status Response ───────────────────────────────────────────────────

export interface SystemStatusResponse {
  openclaw: OpenClawStatus
  bridge: BridgeStatus
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export interface ApiKeyMeta {
  name: string
  maskedValue: string
  status: 'active' | 'expired' | 'unknown'
  expiresAt: string | null
}

export interface ApiKeysResponse {
  keys: ApiKeyMeta[]
}

// ─── Cron Jobs ────────────────────────────────────────────────────────────────

export interface CronJob {
  name: string
  schedule: string
  lastRun: string | null
  lastStatus: 'success' | 'error' | 'running' | 'never'
}

export interface CronJobsResponse {
  jobs: CronJob[]
  error?: string
}
