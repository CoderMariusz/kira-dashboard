// services/system.service.ts
// STORY-10.6 — API client for /api/system/* endpoints
// All errors are thrown as Error objects with Polish user-facing messages.

import type {
  SystemStatusResponse,
  ApiKeyMeta,
  CronJob,
} from '@/types/system.types'

// ─── Error messages (po polsku) ───────────────────────────────────────────────

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  401: 'Sesja wygasła — zaloguj się ponownie',
  403: 'Brak uprawnień do tej operacji',
  500: 'Błąd serwera systemu',
  503: 'Bridge jest niedostępny',
}

const NETWORK_ERROR_MESSAGE = 'Brak połączenia z serwerem'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildHttpError(status: number): Error {
  const message =
    HTTP_ERROR_MESSAGES[status] ?? 'Błąd serwera systemu'
  return new Error(message)
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    throw buildHttpError(response.status)
  }

  return response
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const SystemService = {
  /**
   * GET /api/system/status
   * Returns the full system status (OpenClaw + Bridge health).
   */
  getStatus: async (): Promise<SystemStatusResponse> => {
    const response = await safeFetch('/api/system/status')
    return response.json() as Promise<SystemStatusResponse>
  },

  /**
   * GET /api/system/api-keys
   * Returns the list of API key metadata.
   * Response is unwrapped from { keys: [...] }.
   */
  getApiKeys: async (): Promise<ApiKeyMeta[]> => {
    const response = await safeFetch('/api/system/api-keys')
    const data = (await response.json()) as { keys: ApiKeyMeta[] }
    return data.keys
  },

  /**
   * GET /api/system/cron-jobs
   * Returns the list of cron jobs.
   * Response is unwrapped from { jobs: [...] }.
   */
  getCronJobs: async (): Promise<CronJob[]> => {
    const response = await safeFetch('/api/system/cron-jobs')
    const data = (await response.json()) as { jobs: CronJob[] }
    return data.jobs
  },

  /**
   * POST /api/system/restart-bridge
   * Initiates a Bridge restart.
   */
  restartBridge: async (): Promise<{ message: string }> => {
    const response = await safeFetch('/api/system/restart-bridge', {
      method: 'POST',
    })
    return response.json() as Promise<{ message: string }>
  },
}
