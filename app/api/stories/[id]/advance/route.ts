export const runtime = 'nodejs'

// POST /api/stories/[id]/advance
// STORY-12.9: Dual mode — local Bridge CLI (if BRIDGE_DIR set) or Supabase command queue (Vercel).
// Body: { "status": "REVIEW" | "DONE" | "REFACTOR" }
// Auth: ADMIN only

import { type NextRequest, NextResponse } from 'next/server'
import { runBridgeCLI, STORY_ID_REGEX, ALLOWED_STATUSES } from '@/lib/bridge-cli'
import { requireAdmin } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
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

  // Step 3: Parse and validate body
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
    return NextResponse.json(
      {
        ok: false,
        error: 'Nieprawidłowy status. Dozwolone wartości: REVIEW, DONE, REFACTOR',
      },
      {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  const statusValue = (body as Record<string, unknown>)['status'] as string

  if (!(ALLOWED_STATUSES as readonly string[]).includes(statusValue)) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Nieprawidłowy status. Dozwolone wartości: REVIEW, DONE, REFACTOR',
      },
      {
        status: 400,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  // Step 4: Mode selection — local Bridge CLI or Supabase queue
  const bridgeDir = process.env['BRIDGE_DIR']

  if (bridgeDir) {
    // Mode 1: Local Bridge CLI (instant execution)
    const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli advance ${id} --to ${statusValue} --project kira-dashboard`
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
      command: 'advance',
      payload: { status: statusValue },
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
