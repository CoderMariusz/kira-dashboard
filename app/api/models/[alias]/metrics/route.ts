// app/api/models/[alias]/metrics/route.ts
// GET /api/models/[alias]/metrics?period=7d|30d — time-series daily aggregates for a single model
// Implemented in STORY-5.3

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { fetchBridge } from '@/lib/bridge'
import { createClient } from '@/lib/supabase/server'
import { resolveModelKey, calcTokenCost, MODEL_ALIAS_MAP } from '@/config/model-costs'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { RunsResponse, BridgeRunRaw } from '@/types/bridge'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModelMetricPoint {
  /** Date in "YYYY-MM-DD" format (UTC). */
  date: string
  /** Total cost in USD for this day (≥ 0). */
  cost_usd: number
  /** Total input tokens for this day (≥ 0). */
  tokens_in: number
  /** Total output tokens for this day (≥ 0). */
  tokens_out: number
  /** Number of runs on this day (≥ 0). */
  runs: number
}

export interface ModelMetricsResponse {
  alias: string
  period: '7d' | '30d'
  points: ModelMetricPoint[]
}

/** Bridge metrics endpoint response (may or may not exist). */
interface BridgeMetricsResponse {
  points: ModelMetricPoint[]
}

// ─── Alias map ───────────────────────────────────────────────────────────────

const ALIAS_SHORT_MAP: Record<string, string> = {
  'kimi-k2.5': 'kimi',
  'glm-5': 'glm',
  'sonnet-4.6': 'sonnet',
  'codex-5.3': 'codex',
}

// ─── Route params type ────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ alias: string }>
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<Response> {
  try {
    // 1. AUTH CHECK — requires ADMIN role
    const auth = await requireAdmin()
    if (!auth.success) {
      const body = await auth.response.json()
      return NextResponse.json(
        { error: body.error ?? 'Brak dostępu. Wymagana rola ADMIN.' },
        {
          status: auth.response.status,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    // 2. READ & VALIDATE PARAMETERS
    const { alias } = await params

    const period = request.nextUrl.searchParams.get('period')
    if (period !== '7d' && period !== '30d') {
      return NextResponse.json(
        { error: 'Nieprawidłowy period. Dozwolone: 7d, 30d' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    const canonicalKey = resolveModelKey(alias)
    if (canonicalKey === null) {
      return NextResponse.json(
        { error: `Model o aliasie '${alias}' nie istnieje` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 3. BUILD DATE RANGE (UTC, ASC from today-N+1 to today)
    const days = period === '7d' ? 7 : 30
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const dateRange: string[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setUTCDate(d.getUTCDate() - i)
      dateRange.push(d.toISOString().slice(0, 10)) // "YYYY-MM-DD"
    }

    const startDate = new Date(dateRange[0] + 'T00:00:00Z')

    // Resolved alias for the response (e.g. "kimi", "sonnet")
    const aliasShort = ALIAS_SHORT_MAP[canonicalKey] ?? alias

    // 4. TRY BRIDGE METRICS ENDPOINT
    const bridgeMetrics = await fetchBridge<BridgeMetricsResponse>(
      `/api/metrics/models/${canonicalKey}?period=${period}`
    )

    if (bridgeMetrics !== null && Array.isArray(bridgeMetrics.points)) {
      // Bridge has a metrics endpoint — use it, fill in any missing days with zeros
      const pointMap = new Map(bridgeMetrics.points.map((p) => [p.date, p]))
      const points: ModelMetricPoint[] = dateRange.map((date) =>
        pointMap.get(date) ?? {
          date,
          cost_usd: 0,
          tokens_in: 0,
          tokens_out: 0,
          runs: 0,
        }
      )
      return NextResponse.json(
        { alias: aliasShort, period, points } satisfies ModelMetricsResponse,
        { status: 200, headers: { 'Cache-Control': 'no-store' } }
      )
    }

    // 5. FALLBACK — AGGREGATE FROM RUNS
    const runsData = await fetchBridge<RunsResponse>('/api/status/runs')

    // Unified run type for aggregation (Bridge or Supabase)
    type AggRun = {
      started_at: string
      tokens_in: number | null
      tokens_out: number | null
      cost_usd: number | null
    }

    let aggRuns: AggRun[] = []

    if (runsData !== null) {
      // Bridge online — filter runs by model
      aggRuns = runsData.runs
        .filter((r): r is BridgeRunRaw & { started_at: string } =>
          !!r.started_at && resolveModelKey(r.model) === canonicalKey
        )
        .map((r) => ({
          started_at: r.started_at,
          tokens_in: r.tokens_in,
          tokens_out: r.tokens_out,
          cost_usd: r.cost_usd,
        }))
    } else {
      // Bridge offline — query Supabase bridge_runs
      try {
        const supabase = await createClient()
        // All aliases that map to this canonical key
        const modelAliases = Object.entries(MODEL_ALIAS_MAP)
          .filter(([, v]) => v === canonicalKey)
          .map(([k]) => k)

        const { data: sbRuns } = await supabase
          .from('bridge_runs')
          .select('started_at, tokens_in, tokens_out, cost_usd, model')
          .eq('project_id', 'kira-dashboard')
          .gte('started_at', startDate.toISOString())
          .in('model', modelAliases)
          .order('started_at', { ascending: true })

        if (sbRuns) {
          aggRuns = sbRuns.map((r) => ({
            started_at: r.started_at,
            tokens_in: r.tokens_in,
            tokens_out: r.tokens_out,
            cost_usd: r.cost_usd,
          }))
        }
      } catch (e) {
        console.warn('[metrics] Supabase fallback failed:', e)
      }
    }

    // Filter runs: match this model, have a valid started_at, and fall within the date range
    const modelRuns: AggRun[] = aggRuns.filter((r) => {
      if (!r.started_at) return false
      const runDate = new Date(r.started_at)
      return runDate >= startDate
    })

    // Aggregate per day — initialise all buckets with zeros
    const dayMap = new Map<
      string,
      { cost_usd: number; tokens_in: number; tokens_out: number; runs: number }
    >()
    for (const date of dateRange) {
      dayMap.set(date, { cost_usd: 0, tokens_in: 0, tokens_out: 0, runs: 0 })
    }

    for (const run of modelRuns) {
      const dateKey = run.started_at.slice(0, 10) // "YYYY-MM-DD"
      if (!dayMap.has(dateKey)) continue // outside range — skip
      const bucket = dayMap.get(dateKey)!

      bucket.runs += 1

      if (run.tokens_in !== null) bucket.tokens_in += run.tokens_in
      if (run.tokens_out !== null) bucket.tokens_out += run.tokens_out

      // Prefer explicit cost_usd; fall back to token-based calculation
      if (run.cost_usd !== null) {
        bucket.cost_usd += run.cost_usd
      } else if (run.tokens_in !== null && run.tokens_out !== null) {
        bucket.cost_usd += calcTokenCost(canonicalKey, run.tokens_in, run.tokens_out)
      }
    }

    // 6. BUILD SORTED POINTS AND RETURN
    const points: ModelMetricPoint[] = dateRange.map((date) => ({
      date,
      ...dayMap.get(date)!,
    }))

    return NextResponse.json(
      { alias: aliasShort, period, points } satisfies ModelMetricsResponse,
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err) {
    console.error('[GET /api/models/[alias]/metrics]', err)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
