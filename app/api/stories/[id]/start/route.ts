export const runtime = 'nodejs'

// POST /api/stories/[id]/start
// Uruchamia story w Bridge CLI przez komendę start-story.
// Wymaga: BRIDGE_DIR w zmiennych środowiskowych.

import { type NextRequest } from 'next/server'
import { runBridgeCLI, STORY_ID_REGEX } from '@/lib/bridge-cli'

export async function POST(
  _request: NextRequest,
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

  // Krok 2: Zbuduj komendę CLI
  // id przeszło walidację regex — jest bezpieczne do wstawienia w komendę
  const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli start-story ${id} --project kira-dashboard`

  // Krok 3 & 4: Wywołaj Bridge CLI i obsłuż wynik
  const result = await runBridgeCLI(command)

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status })
  }

  return Response.json({ ok: true, output: result.output })
}
