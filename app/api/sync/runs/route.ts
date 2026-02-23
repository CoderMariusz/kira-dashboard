// app/api/sync/runs/route.ts
// GET /api/sync/runs — returns pipeline runs from Supabase bridge_runs table.
// Query params:
//   project  — filter by project_id (optional)
//   limit    — number of results (default 50, max 200)
// STORY-5.9: Hybrid Mode

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { SyncRunsResponse, BridgeSyncRun } from '@/types/api'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(request: NextRequest): Promise<Response> {
  // ALWAYS check auth BEFORE calling any service
  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  const { searchParams } = request.nextUrl
  const project = searchParams.get('project') ?? null

  const rawLimit = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)
  const limit = isNaN(rawLimit) || rawLimit < 1
    ? DEFAULT_LIMIT
    : Math.min(rawLimit, MAX_LIMIT)

  try {
    const supabase = await createClient()

    let query = supabase
      .from('bridge_runs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .limit(limit)

    if (project) {
      query = query.eq('project_id', project)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[sync/runs] Failed to fetch bridge_runs:', error.message)
      return NextResponse.json(
        { error: 'Błąd pobierania runów z Supabase' },
        { status: 500 }
      )
    }

    const body: SyncRunsResponse = {
      data: (data ?? []) as BridgeSyncRun[],
      total: count ?? 0,
    }

    return NextResponse.json(body)
  } catch (err) {
    console.error('[sync/runs] Unexpected error:', err)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
