export const runtime = 'nodejs'

// POST /api/stories/[id]/advance
// Przesuwa story do nowego statusu w Bridge CLI przez komendę advance.
// Wymaga: BRIDGE_DIR w zmiennych środowiskowych.
// Body: { "status": "REVIEW" | "DONE" | "REFACTOR" }

import { type NextRequest } from 'next/server'
import { runBridgeCLI, STORY_ID_REGEX, ALLOWED_STATUSES } from '@/lib/bridge-cli'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Krok 1a: Sprawdź BRIDGE_DIR
  const bridgeDir = process.env['BRIDGE_DIR']
  if (!bridgeDir) {
    return Response.json(
      {
        ok: false,
        error: 'Konfiguracja serwera: brak BRIDGE_DIR w zmiennych środowiskowych',
      },
      { status: 500 }
    )
  }

  // Krok 1b: Pobierz i zwaliduj params.id
  const { id } = await params

  if (!STORY_ID_REGEX.test(id)) {
    return Response.json(
      {
        ok: false,
        error:
          'Nieprawidłowy format story ID. Oczekiwany format: STORY-N.N (np. STORY-1.1)',
      },
      { status: 400 }
    )
  }

  // Krok 1c: Parsuj i zwaliduj body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = null
  }

  if (
    body === null ||
    typeof body !== 'object' ||
    !('status' in body) ||
    typeof (body as Record<string, unknown>)['status'] !== 'string'
  ) {
    return Response.json(
      {
        ok: false,
        error: 'Nieprawidłowy status. Dozwolone wartości: REVIEW, DONE, REFACTOR',
      },
      { status: 400 }
    )
  }

  const statusValue = (body as Record<string, unknown>)['status'] as string

  // Krok 1d: Zwaliduj wartość statusu
  if (!(ALLOWED_STATUSES as readonly string[]).includes(statusValue)) {
    return Response.json(
      {
        ok: false,
        error: 'Nieprawidłowy status. Dozwolone wartości: REVIEW, DONE, REFACTOR',
      },
      { status: 400 }
    )
  }

  // Krok 2: Zbuduj komendę CLI
  // id i statusValue przeszły walidację — są bezpieczne do wstawienia w komendę
  const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli advance ${id} ${statusValue} --project kira-dashboard`

  // Krok 3 & 4: Wywołaj Bridge CLI i obsłuż wynik
  const result = await runBridgeCLI(command)

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status })
  }

  return Response.json({ ok: true, output: result.output })
}
