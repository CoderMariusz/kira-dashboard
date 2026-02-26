/**
 * app/api/nightclaw/research/route.ts
 * STORY-12.10 — GET /api/nightclaw/research migrated to Supabase
 *
 * Returns list of research findings from nightclaw_research table.
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

  // Parse optional status filter
  const url = request?.nextUrl ?? new URL(request?.url ?? 'http://localhost')
  const status = url.searchParams.get('status')

  const supabase = await createClient()

  let query = supabase
    .from('nightclaw_research')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data } = await query

  return NextResponse.json(
    { data: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
