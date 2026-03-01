/**
 * app/api/nightclaw/digest/route.ts
 * STORY-12.10 — GET /api/nightclaw/digest migrated to Supabase
 *
 * Reads from nightclaw_digests table.
 * Auth: requireAuth — 401 for unauthenticated requests.
 * Missing digest: 404.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: { nextUrl?: URL; url?: string }): Promise<Response> {
  // 1. Auth check
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  // 2. Parse date param
  const url = request.nextUrl ?? new URL(request.url ?? 'http://localhost')
  const date = url.searchParams.get('date')

  const supabase = await createClient()

  const query = supabase.from('nightclaw_digests').select('*')

  if (date) {
    // AC-1: specific date
    const { data, error } = await query.eq('run_date', date).single()
    if (error || !data) {
      return NextResponse.json({ error: 'No digest found' }, { status: 404 })
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } else {
    // AC-2: latest
    const { data, error } = await query.order('run_date', { ascending: false }).limit(1).single()
    if (error || !data) {
      return NextResponse.json({ error: 'No digest found' }, { status: 404 })
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
