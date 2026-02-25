// services/nightclaw.service.ts
// STORY-9.5 — Fetch wrapper for the 4 NightClaw API endpoints.
// All errors are thrown as Error objects with Polish user-facing messages.

import type {
  DigestResponse,
  HistoryResponse,
  SkillsDiffResponse,
  ResearchResponse,
} from '@/types/nightclaw'

// ─── Error messages (po polsku) ───────────────────────────────────────────────

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  401: 'Sesja wygasła — zaloguj się ponownie',
  404: 'Brak danych dla wybranego dnia',
  500: 'Błąd serwera — Bridge może być offline',
  503: 'Błąd serwera — Bridge może być offline',
}

const NETWORK_ERROR_MESSAGE = 'Brak połączenia z serwerem'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildHttpError(status: number): Error {
  const message =
    HTTP_ERROR_MESSAGES[status] ?? `Błąd serwera — Bridge może być offline`
  return new Error(message)
}

async function safeFetch(url: string): Promise<Response> {
  let response: Response

  try {
    response = await fetch(url)
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    throw buildHttpError(response.status)
  }

  return response
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/nightclaw/digest?date=YYYY-MM-DD
 * Returns the NightClaw digest for a given date (or today if omitted).
 */
export async function fetchDigest(date?: string): Promise<DigestResponse> {
  const url = date
    ? `/api/nightclaw/digest?date=${encodeURIComponent(date)}`
    : '/api/nightclaw/digest'
  const response = await safeFetch(url)
  return response.json() as Promise<DigestResponse>
}

/**
 * GET /api/nightclaw/history
 * Returns the list of NightClaw run history entries.
 */
export async function fetchHistory(): Promise<HistoryResponse> {
  const response = await safeFetch('/api/nightclaw/history')
  return response.json() as Promise<HistoryResponse>
}

/**
 * GET /api/nightclaw/skills-diff
 * Returns git diff for all SKILL.md files modified since last NightClaw run.
 */
export async function fetchSkillsDiff(): Promise<SkillsDiffResponse> {
  const response = await safeFetch('/api/nightclaw/skills-diff')
  return response.json() as Promise<SkillsDiffResponse>
}

/**
 * GET /api/nightclaw/research
 * Returns the list of solutions/ research files.
 */
export async function fetchResearch(): Promise<ResearchResponse> {
  const response = await safeFetch('/api/nightclaw/research')
  return response.json() as Promise<ResearchResponse>
}
