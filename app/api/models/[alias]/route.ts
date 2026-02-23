// app/api/models/[alias]/route.ts
// PATCH /api/models/[alias] — aktualizacja konfiguracji kosztów modelu
// Implemented in STORY-5.2

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchBridge } from '@/lib/bridge'
import {
  MODEL_COSTS,
  resolveModelKey,
  calcTokenCost,
} from '@/config/model-costs'
import { modelOverrides } from '@/lib/model-overrides'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { RunsResponse, BridgeRunRaw } from '@/types/bridge'
import type { ModelEntry, ModelStats } from '@/types/models'

// ─── Static metadata maps (mirrored from GET /api/models) ───────────────────

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

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const PatchModelBodySchema = z
  .object({
    cost_input_per_1m: z
      .number()
      .min(0, 'Cena nie może być ujemna')
      .max(1000, 'Cena nie może przekraczać 1000 USD')
      .optional(),
    cost_output_per_1m: z
      .number()
      .min(0, 'Cena nie może być ujemna')
      .max(1000, 'Cena nie może przekraczać 1000 USD')
      .optional(),
  })
  .refine(
    (data) =>
      data.cost_input_per_1m !== undefined ||
      data.cost_output_per_1m !== undefined,
    { message: 'Podaj co najmniej jedno pole do aktualizacji' }
  )

// ─── Route params type ──────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ alias: string }>
}

// ─── Helper: Build ModelEntry ───────────────────────────────────────────────

async function buildModelEntry(canonicalKey: string): Promise<ModelEntry> {
  const costConfig =
    MODEL_COSTS[canonicalKey] ?? {
      input: 0,
      output: 0,
      displayName: canonicalKey,
      color: '#888',
    }
  const override = modelOverrides.get(canonicalKey)

  // Fetch stats from Bridge
  const runsData = await fetchBridge<RunsResponse>('/api/status/runs')
  const bridgeOnline = runsData !== null
  const runs: BridgeRunRaw[] = runsData?.runs ?? []

  // Filter runs for this model
  const modelRuns = runs.filter((r) => resolveModelKey(r.model) === canonicalKey)

  // Compute stats — null when Bridge is offline
  let stats: ModelStats | null = null

  if (bridgeOnline) {
    const totalRuns = modelRuns.length
    const doneRuns = modelRuns.filter((r) => r.status === 'DONE')
    const successRate = totalRuns > 0 ? doneRuns.length / totalRuns : 0

    const durationsMs = modelRuns
      .filter((r): r is BridgeRunRaw & { duration_ms: number } => r.duration_ms !== null)
      .map((r) => r.duration_ms / 1000)
    const avgDurationS =
      durationsMs.length > 0
        ? durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length
        : null

    const totalCostUsd = modelRuns.reduce((sum, r) => {
      if (r.cost_usd !== null) return sum + r.cost_usd
      if (r.tokens_in !== null && r.tokens_out !== null) {
        return sum + calcTokenCost(canonicalKey, r.tokens_in, r.tokens_out)
      }
      return sum
    }, 0)

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
    cost_input_per_1m:
      override?.cost_input_per_1m ?? costConfig.input,
    cost_output_per_1m:
      override?.cost_output_per_1m ?? costConfig.output,
    monitoring_enabled: true,
    stats,
  }
}

// ─── PATCH Handler ──────────────────────────────────────────────────────────

export async function PATCH(request: Request, { params }: RouteParams): Promise<Response> {
  try {
    // 1. AUTH CHECK — requires ADMIN role
    const auth = await requireAdmin()
    if (!auth.success) {
      const body = await auth.response.json()
      return NextResponse.json(
        { error: body.error ?? 'Brak dostępu. Wymagana rola ADMIN.' },
        { status: auth.response.status }
      )
    }

    // 2. READ ALIAS FROM URL
    const { alias } = await params
    const canonicalKey = resolveModelKey(alias)
    if (canonicalKey === null) {
      return NextResponse.json(
        { error: `Model o aliasie '${alias}' nie istnieje` },
        { status: 404 }
      )
    }

    // 3. PARSE AND VALIDATE BODY
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Nieprawidłowy JSON' },
        { status: 400 }
      )
    }

    const parsed = PatchModelBodySchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'Nieprawidłowe dane'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // 4. APPLY OVERRIDE
    const costConfig = MODEL_COSTS[canonicalKey] ?? { input: 0, output: 0, displayName: canonicalKey, color: '#888' }
    const existing = modelOverrides.get(canonicalKey)
    const newOverride = {
      cost_input_per_1m:
        parsed.data.cost_input_per_1m ??
        existing?.cost_input_per_1m ??
        costConfig.input,
      cost_output_per_1m:
        parsed.data.cost_output_per_1m ??
        existing?.cost_output_per_1m ??
        costConfig.output,
    }
    modelOverrides.set(canonicalKey, newOverride)

    // 5. BUILD AND RETURN UPDATED ModelEntry
    const entry = await buildModelEntry(canonicalKey)
    return NextResponse.json(entry, { status: 200 })
  } catch (err) {
    console.error('[PATCH /api/models/[alias]]', err)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}
