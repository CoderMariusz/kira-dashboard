// app/api/models/route.ts
// GET /api/models — proxy lista modeli z Bridge + obliczone statystyki
// Implemented in STORY-5.1

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { fetchBridge } from '@/lib/bridge'
import {
  KNOWN_MODEL_KEYS,
  MODEL_COSTS,
  resolveModelKey,
  calcTokenCost,
} from '@/config/model-costs'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { RunsResponse, BridgeRunRaw } from '@/types/bridge'
import type { ModelEntry, ModelStats } from '@/types/models'

// ─── Static metadata maps ────────────────────────────────────────────────────

const PROVIDER_MAP: Record<string, string> = {
  'kimi-k2.5': 'Moonshot AI',
  'glm-5': 'Z.AI',
  'sonnet-4.6': 'Anthropic',
  'codex-5.3': 'OpenAI',
}

const MODEL_ID_MAP: Record<string, string | null> = {
  'kimi-k2.5': null,
  'glm-5': null,
  'sonnet-4.6': 'claude-sonnet-4-6',
  'codex-5.3': null,
}

const ALIAS_SHORT_MAP: Record<string, string> = {
  'kimi-k2.5': 'kimi',
  'glm-5': 'glm',
  'sonnet-4.6': 'sonnet',
  'codex-5.3': 'codex',
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(): Promise<Response> {
  try {
    // 1. AUTH CHECK — requires ADMIN role
    const auth = await requireAdmin()
    if (!auth.success) {
      // Add Cache-Control to auth error responses as well
      const body = await auth.response.json()
      return NextResponse.json(
        { error: body.error ?? 'Brak dostępu. Wymagana rola ADMIN.' },
        {
          status: auth.response.status,
          headers: { 'Cache-Control': 'no-store' },
        }
      )
    }

    // 2. FETCH RUNS from Bridge
    const runsData = await fetchBridge<RunsResponse>('/api/status/runs')
    const bridgeOnline = runsData !== null
    const runs: BridgeRunRaw[] = runsData?.runs ?? []

    // 3. GROUP RUNS by canonical model key
    const runsByModel: Record<string, BridgeRunRaw[]> = {}
    for (const run of runs) {
      const key = resolveModelKey(run.model)
      if (key === null) continue // EC-3: unknown model — skip silently
      if (!runsByModel[key]) runsByModel[key] = []
      runsByModel[key].push(run)
    }

    // 4. LOAD RUNTIME OVERRIDES (optional — created by STORY-5.2)
    let overrides: Map<string, { cost_input_per_1m?: number; cost_output_per_1m?: number }> = new Map()
    try {
      const { modelOverrides } = await import('@/lib/model-overrides')
      overrides = modelOverrides
    } catch {
      // lib/model-overrides.ts does not exist yet — use MODEL_COSTS defaults
    }

    // 5. BUILD ModelEntry[] for each known model
    const result: ModelEntry[] = KNOWN_MODEL_KEYS.map((canonicalKey) => {
      // costConfig is guaranteed for KNOWN_MODEL_KEYS but TypeScript doesn't know that
      const costConfig = MODEL_COSTS[canonicalKey] ?? { input: 0, output: 0, displayName: canonicalKey, color: '#888' }
      const override = overrides.get(canonicalKey)
      const modelRuns = runsByModel[canonicalKey] ?? []

      // Compute stats — null when Bridge is offline (EC-2)
      let stats: ModelStats | null = null

      if (bridgeOnline) {
        const totalRuns = modelRuns.length
        const doneRuns = modelRuns.filter((r) => r.status === 'DONE')
        const successRate = totalRuns > 0 ? doneRuns.length / totalRuns : 0

        // avg_duration_s: only runs that have a duration value
        const durationsMs = modelRuns
          .filter((r): r is BridgeRunRaw & { duration_ms: number } => r.duration_ms !== null)
          .map((r) => r.duration_ms / 1000)
        const avgDurationS =
          durationsMs.length > 0
            ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length
            : null

        // total_cost_usd: prefer explicit cost_usd; fall back to token calculation
        const totalCostUsd = modelRuns.reduce((sum, r) => {
          if (r.cost_usd !== null) return sum + r.cost_usd
          if (r.tokens_in !== null && r.tokens_out !== null) {
            return sum + calcTokenCost(canonicalKey, r.tokens_in, r.tokens_out)
          }
          return sum
        }, 0)

        // last_run_at: most recent started_at
        const sortedByDate = [...modelRuns]
          .filter((r) => r.started_at != null)
          .sort(
            (a, b) =>
              new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
          )
        const lastRunAt = sortedByDate[0]?.started_at ?? null

        stats = {
          total_runs: totalRuns,
          success_rate: successRate,
          avg_duration_s: avgDurationS,
          total_cost_usd: totalCostUsd,
          last_run_at: lastRunAt,
        }
      }

      return {
        alias: ALIAS_SHORT_MAP[canonicalKey] ?? canonicalKey,
        canonical_key: canonicalKey,
        display_name: costConfig.displayName,
        provider: PROVIDER_MAP[canonicalKey] ?? canonicalKey,
        model_id: MODEL_ID_MAP[canonicalKey] ?? null,
        cost_input_per_1m: override?.cost_input_per_1m ?? costConfig.input,
        cost_output_per_1m: override?.cost_output_per_1m ?? costConfig.output,
        monitoring_enabled: true, // default true; managed via localStorage in STORY-5.7
        stats,
      }
    })

    // 6. RETURN RESPONSE
    return NextResponse.json(
      { data: result },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  } catch (err) {
    console.error('[GET /api/models]', err)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }
}
