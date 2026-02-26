/**
 * app/api/nightclaw/history/route.ts
 * STORY-12.10 — GET /api/nightclaw/history migrated to Supabase
 *
 * Returns list of digest summaries from nightclaw_digests table.
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

  // Parse limit param (default 30, max 90)
  const url = request?.nextUrl ?? new URL(request?.url ?? 'http://localhost')
  const limitParam = url.searchParams.get('limit')
  const limit = Math.min(parseInt(limitParam ?? '30', 10) || 30, 90)

  const supabase = await createClient()

  const { data } = await supabase
    .from('nightclaw_digests')
    .select('run_date, summary, stories_done, stories_failed, models_used')
    .order('run_date', { ascending: false })
    .limit(limit)

  return NextResponse.json(
    { data: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
