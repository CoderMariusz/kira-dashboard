// services/prdService.ts
// Serwis do komunikacji z endpointami PRD Wizard (STORY-6.5)
// Używany przez: components/pipeline/NewProjectWizard.tsx

import type {
  PrdQuestionsResponse,
  CreateFromPrdRequest,
  CreateFromPrdResponse,
} from '@/types/pipeline-prd'

// ─── Error helper ─────────────────────────────────────────────────────────────

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body?.error ?? `HTTP ${response.status}`
  } catch {
    return `HTTP ${response.status}`
  }
}

// ─── getQuestions ─────────────────────────────────────────────────────────────

/**
 * Wywołuje POST /api/pipeline/prd-questions — zwraca pytania AI dla danego PRD.
 * Rzuca Error z komunikatem po polsku jeśli API zwróciło błąd.
 */
async function getQuestions(prdText: string): Promise<PrdQuestionsResponse> {
  const response = await fetch('/api/pipeline/prd-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prd_text: prdText }),
  })

  if (!response.ok) {
    const message = await parseError(response)
    throw new Error(message)
  }

  return response.json() as Promise<PrdQuestionsResponse>
}

// ─── createFromPrd ────────────────────────────────────────────────────────────

/**
 * Wywołuje POST /api/pipeline/create-from-prd — generuje epiki i rejestruje projekt.
 * Rzuca Error z komunikatem po polsku jeśli API zwróciło błąd.
 * Rzuca DuplicateProjectError (error.status === 409) jeśli projekt już istnieje.
 */
async function createFromPrd(
  payload: CreateFromPrdRequest
): Promise<CreateFromPrdResponse> {
  const response = await fetch('/api/pipeline/create-from-prd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const message = await parseError(response)
    const error = new Error(message) as Error & { status: number }
    error.status = response.status
    throw error
  }

  return response.json() as Promise<CreateFromPrdResponse>
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const prdService = {
  getQuestions,
  createFromPrd,
}
