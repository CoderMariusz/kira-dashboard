// services/patterns.service.ts
// STORY-8.3 — API client for /api/patterns and /api/lessons

import type { PatternsResponse, AddPatternDTO, AddLessonDTO } from '@/types/patterns'
import { PATTERN_ERROR_MESSAGES, NETWORK_ERROR_MESSAGE } from '@/services/patterns.errors'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildError(status: number): Error {
  const message = PATTERN_ERROR_MESSAGES[status] ?? `Nieznany błąd HTTP ${status}`
  const err = new Error(message)
  return err
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  let response: Response

  try {
    response = await fetch(url, init)
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    throw buildError(response.status)
  }

  return response
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * GET /api/patterns
 * Returns patterns, lessons, and meta from Kira Bridge.
 */
export async function getPatterns(): Promise<PatternsResponse> {
  const response = await safeFetch('/api/patterns')
  return response.json() as Promise<PatternsResponse>
}

/**
 * POST /api/patterns
 * Adds a new pattern entry.
 */
export async function addPattern(
  dto: AddPatternDTO
): Promise<{ success: true; entry: string }> {
  const response = await safeFetch('/api/patterns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  return response.json() as Promise<{ success: true; entry: string }>
}

/**
 * POST /api/lessons
 * Adds a new lesson entry.
 */
export async function addLesson(
  dto: AddLessonDTO
): Promise<{ success: true }> {
  const response = await safeFetch('/api/lessons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  })
  return response.json() as Promise<{ success: true }>
}
