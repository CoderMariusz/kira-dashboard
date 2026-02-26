export const runtime = 'nodejs'

// POST /api/stories/[id]/start
// STORY-12.9: Dual mode — local Bridge CLI (if BRIDGE_DIR set) or Supabase command queue (Vercel).
// Auth: ADMIN only

import { type NextRequest, NextResponse } from 'next/server'
import { runBridgeCLI, STORY_ID_REGEX } from '@/lib/bridge-cli'
import { requireAdmin } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  // Step 1: Auth — ADMIN only
  const auth = await requireAdmin()
  if (auth instanceof Response) {
    return auth
  }

  // Step 2: Validate story ID
  const { id } = await params
  if (!STORY_ID_REGEX.test(id)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Nieprawidłowy format story ID. Oczekiwany format: STORY-N.N (np. STORY-1.1)',
      },
      {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  // Step 3: Mode selection — local Bridge CLI or Supabase queue
  const bridgeDir = process.env['BRIDGE_DIR']

  if (bridgeDir) {
    // Mode 1: Local Bridge CLI (instant execution)
    const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli start-story ${id} --project kira-dashboard`
    const result = await runBridgeCLI(command)

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        {
          status: result.status,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    return NextResponse.json(
      { ok: true, mode: 'local', output: result.output },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  // Mode 2: Supabase command queue (Vercel — no local Bridge)
  const supabase = await createClient()
  const { error } = await supabase
    .from('bridge_commands')
    .insert({
      story_id: id,
      command: 'start',
      payload: {},
      created_by: auth.user.id,
    })

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  return NextResponse.json(
    {
      ok: true,
      mode: 'queued',
      message: 'Komenda w kolejce — Bridge przetworzy w ciągu minuty',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
