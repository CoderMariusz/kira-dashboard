/**
 * app/api/nightclaw/history/route.ts
 * STORY-12.10 — GET /api/nightclaw/history migrated to Supabase
 *
 * Returns HistoryResponse: { entries, total_runs, total_errors }
 * Each entry: { date: string, status: 'ok' | 'error' | 'missing' }
 * Auth: requireAuth — 401 for unauthenticated requests.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'
import type { HistoryEntry, HistoryResponse } from '@/types/nightclaw'

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
    .select('run_date, stories_failed')
    .order('run_date', { ascending: false })
    .limit(limit)

  const rows = data ?? []

  const entries: HistoryEntry[] = rows.map(row => ({
    date: row.run_date as string,
    status: (row.stories_failed ?? 0) > 0 ? 'error' : 'ok',
  }))

  const total_runs = entries.length
  const total_errors = entries.filter(e => e.status === 'error').length

  const body: HistoryResponse = { entries, total_runs, total_errors }

  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } })
}
