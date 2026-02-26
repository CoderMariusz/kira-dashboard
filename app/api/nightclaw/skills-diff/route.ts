/**
 * app/api/nightclaw/skills-diff/route.ts
 * STORY-12.10 — GET /api/nightclaw/skills-diff migrated to Supabase
 *
 * Returns skills diff records from nightclaw_skills_diff table.
 * Auth: requireAuth — 401 for unauthenticated requests.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request?: { nextUrl?: URL; url?: string }): Promise<Response> {
  // Auth check
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // Parse date param (default: today)
  const url = request?.nextUrl ?? new URL(request?.url ?? 'http://localhost')
  const date = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0]

  const supabase = await createClient()

  const { data } = await supabase
    .from('nightclaw_skills_diff')
    .select('*')
    .eq('run_date', date)

  return NextResponse.json(
    {
      skills: data ?? [],
      total_modified: data?.length ?? 0,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
