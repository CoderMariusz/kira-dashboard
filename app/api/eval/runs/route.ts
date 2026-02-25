/**
 * app/api/eval/runs/route.ts
 * STORY-7.4 — GET /api/eval/runs — paginated eval run history.
 * Query params: page (default 1), pageSize (default 20, max 100)
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireRole'
import { findEvalRuns } from '@/lib/bridge/eval-runs-bridge'

export async function GET(req: Request): Promise<Response> {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult
  try {
    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
    const offset = (page - 1) * pageSize
    const { runs, total } = findEvalRuns({ limit: pageSize, offset })
    return NextResponse.json({ runs, total, page, pageSize })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
