// app/api/runs/route.ts
// GET /api/runs — returns pipeline runs, Bridge-first with Supabase fallback.
// Query params:
//   project — project_id filter (default: kira-dashboard)
//   limit   — max runs (default 100)
// Used by ModelDetailPanel for recent runs list.

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { fetchBridge } from '@/lib/bridge'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { RunsResponse, BridgeRunRaw } from '@/types/bridge'

export async function GET(request: NextRequest): Promise<Response> {
  const auth = await requireAdmin()
  if (!auth.success) return auth.response

  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '100'), 200)

  // 1. Try Bridge
  const bridgeData = await fetchBridge<RunsResponse>('/api/status/runs')
  if (bridgeData !== null) {
    return NextResponse.json(bridgeData, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  // 2. Supabase fallback
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bridge_runs')
      .select('id, story_id, step, worker, model, status, started_at, ended_at, duration_ms, tokens_in, tokens_out, cost_usd, error_message')
      .eq('project_id', project)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Map to BridgeRunRaw shape expected by the frontend
    const runs: BridgeRunRaw[] = (data ?? []).map((r) => ({
      run_id: r.id,
      story_id: r.story_id,
      step: r.step,
      worker: r.worker,
      model: r.model,
      status: r.status,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_ms: r.duration_ms,
      tokens_in: r.tokens_in,
      tokens_out: r.tokens_out,
      cost_usd: r.cost_usd,
      retry_count: 0,
      artifacts: [],
    }))

    return NextResponse.json({ runs } satisfies RunsResponse, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    console.error('[GET /api/runs] Supabase fallback failed:', e)
    return NextResponse.json({ runs: [] } satisfies RunsResponse, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
