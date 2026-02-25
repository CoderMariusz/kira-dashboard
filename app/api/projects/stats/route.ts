// app/api/projects/stats/route.ts
// GET /api/projects/stats — per-project story statistics from Bridge DB
// Implemented in STORY-6.4

export const runtime = 'nodejs'

import { execSync } from 'child_process'
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/require-admin'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProjectStat {
  key: string
  name: string
  is_current: boolean
  total: number
  done: number
  in_progress: number
  review: number
  blocked: number
  completion_pct: number
}

interface StatsResponse {
  projects: ProjectStat[]
  fetched_at: string
  offline?: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BRIDGE_DB =
  process.env.BRIDGE_DB_PATH ?? '/Users/mariuszkrawczyk/codermariusz/kira/data/bridge.db'
const CLI_TIMEOUT = 15_000
const CACHE_HEADER = 's-maxage=30, stale-while-revalidate=60'

const STATS_QUERY = `
SELECT
  p.key,
  p.name,
  p.is_current,
  COUNT(s.id) as total,
  SUM(CASE WHEN s.status = 'DONE' THEN 1 ELSE 0 END) as done,
  SUM(CASE WHEN s.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress,
  SUM(CASE WHEN s.status = 'REVIEW' THEN 1 ELSE 0 END) as review,
  SUM(CASE WHEN s.status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked
FROM projects p
LEFT JOIN stories s ON p.key = s.project_id
GROUP BY p.key
ORDER BY p.is_current DESC, p.name
`.trim()

// ─── Helpers ─────────────────────────────────────────────────────────────────

function offlineResponse(): NextResponse<StatsResponse> {
  return NextResponse.json(
    { projects: [], fetched_at: new Date().toISOString(), offline: true },
    { status: 200, headers: { 'Cache-Control': CACHE_HEADER } },
  )
}

function calcCompletion(done: number, total: number): number {
  if (total === 0) return 0
  return Math.round((done / total) * 1000) / 10
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  // 1. AUTH CHECK
  const auth = await requireAdmin()
  if (!auth.success) {
    const body = await auth.response.json()
    return NextResponse.json(
      { error: body.error ?? 'Brak dostępu. Wymagana rola ADMIN.' },
      { status: auth.response.status, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // 2. OFFLINE MODE
  if (process.env.NEXT_PUBLIC_BRIDGE_MODE === 'offline') {
    return offlineResponse()
  }

  // 3. QUERY BRIDGE DB via sqlite3 CLI
  try {
    const raw = execSync(
      `sqlite3 -json "${BRIDGE_DB}" "${STATS_QUERY.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
      { timeout: CLI_TIMEOUT, shell: '/bin/bash', encoding: 'utf-8' },
    )

    const rows: Array<{
      key: string
      name: string
      is_current: number
      total: number
      done: number
      in_progress: number
      review: number
      blocked: number
    }> = JSON.parse(raw)

    const projects: ProjectStat[] = rows.map((r) => ({
      key: r.key,
      name: r.name,
      is_current: r.is_current === 1,
      total: r.total,
      done: r.done,
      in_progress: r.in_progress,
      review: r.review,
      blocked: r.blocked,
      completion_pct: calcCompletion(r.done, r.total),
    }))

    return NextResponse.json(
      { projects, fetched_at: new Date().toISOString() } satisfies StatsResponse,
      { status: 200, headers: { 'Cache-Control': CACHE_HEADER } },
    )
  } catch (err) {
    console.error('[GET /api/projects/stats] CLI error:', err)
    return offlineResponse()
  }
}
