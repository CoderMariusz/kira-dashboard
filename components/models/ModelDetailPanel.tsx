'use client'
// components/models/ModelDetailPanel.tsx
// Full implementation — STORY-5.6.
// Model detail panel: time-series chart, period toggle, inline cost editing, recent runs.

import { useState, useMemo } from 'react'
import { z } from 'zod'
import useSWR from 'swr'
import { toast } from 'sonner'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useModelMetrics } from '@/hooks/useModelMetrics'
import { useModels } from '@/hooks/useModels'
import { resolveModelKey } from '@/config/model-costs'
import type { RunStatus, RunsResponse } from '@/types/bridge'
import type { ModelMetricPoint } from '@/types/models'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ModelDetailPanelProps {
  alias: string           // canonical_key e.g. "kimi-k2.5" — used for all API calls
  displayName: string     // e.g. "Kimi K2.5" — for toast messages
  currentCostInput?: number
  currentCostOutput?: number
}

// ─── Zod schema (Zod v4) ─────────────────────────────────────────────────────

const MAX_DECIMAL_PLACES = 4

function hasMaxDecimalPlaces(n: number): boolean {
  const str = n.toString()
  const parts = str.split('.')
  return !parts[1] || parts[1].length <= MAX_DECIMAL_PLACES
}

const CostFieldSchema = z
  .number()
  .min(0, 'Wartość musi być ≥ 0')
  .max(1000, 'Wartość nie może przekraczać 1000')
  .refine(hasMaxDecimalPlaces, { message: 'Maksymalnie 4 miejsca po przecinku' })

const CostFormSchema = z.object({
  cost_input_per_1m: CostFieldSchema,
  cost_output_per_1m: CostFieldSchema,
})

type CostFormErrors = {
  cost_input_per_1m?: string
  cost_output_per_1m?: string
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<RunStatus, { bg: string; text: string }> = {
  DONE:        { bg: 'bg-[#4ade80]/20',  text: 'text-[#4ade80]'  },
  IN_PROGRESS: { bg: 'bg-[#818cf8]/20',  text: 'text-[#818cf8]'  },
  REVIEW:      { bg: 'bg-yellow-500/20', text: 'text-yellow-400'  },
  MERGE:       { bg: 'bg-blue-500/20',   text: 'text-blue-400'    },
  REFACTOR:    { bg: 'bg-orange-500/20', text: 'text-orange-400'  },
}

function StatusBadge({ status }: { status: RunStatus }) {
  const styles = STATUS_STYLES[status]
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${styles.bg} ${styles.text}`}
    >
      {status}
    </span>
  )
}

// ─── Runs fetcher ──────────────────────────────────────────────────────────────

async function fetchRuns(url: string): Promise<RunsResponse | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json() as Promise<RunsResponse>
}

// ─── Public component (alias guard) ───────────────────────────────────────────

export function ModelDetailPanel({
  alias,
  displayName,
  currentCostInput = 0,
  currentCostOutput = 0,
}: ModelDetailPanelProps) {
  if (!alias) {
    return (
      <p className="text-slate-400 text-sm text-center py-4">
        Brak aliasu modelu
      </p>
    )
  }

  return (
    <ModelDetailPanelInner
      alias={alias}
      displayName={displayName}
      currentCostInput={currentCostInput}
      currentCostOutput={currentCostOutput}
    />
  )
}

// ─── Inner component ──────────────────────────────────────────────────────────

function ModelDetailPanelInner({
  alias,
  displayName,
  currentCostInput,
  currentCostOutput,
}: Required<ModelDetailPanelProps>) {
  // ── Period state ──────────────────────────────────────────────────────────
  const [period, setPeriod] = useState<'7d' | '30d'>('7d')

  // ── Form state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [costInput, setCostInput] = useState<string>(String(currentCostInput))
  const [costOutput, setCostOutput] = useState<string>(String(currentCostOutput))
  const [formErrors, setFormErrors] = useState<CostFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ── Data hooks ────────────────────────────────────────────────────────────
  const { metrics, isLoading, error } = useModelMetrics(alias, period)
  const { mutate: mutateModels } = useModels()

  const { data: runsData } = useSWR('/api/runs', fetchRuns, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  })

  // ── Recent runs ────────────────────────────────────────────────────────────
  const recentRuns = useMemo(() => {
    if (!runsData?.runs) return null
    return runsData.runs
      .filter((r) => r.model != null && resolveModelKey(r.model) === alias)
      .sort(
        (a, b) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      )
      .slice(0, 5)
  }, [runsData, alias])

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!metrics?.points) return []
    return metrics.points.map((p) => ({
      date: new Date(p.date).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
      }),
      cost_usd: p.cost_usd,
      tokens: p.tokens_in + p.tokens_out,
    }))
  }, [metrics])

  const hasData = chartData.some((p) => p.cost_usd > 0 || p.tokens > 0)

  // ── Form submit ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const parsedInput = parseFloat(costInput)
    const parsedOutput = parseFloat(costOutput)

    const rawValues = {
      cost_input_per_1m: isNaN(parsedInput) ? undefined : parsedInput,
      cost_output_per_1m: isNaN(parsedOutput) ? undefined : parsedOutput,
    }

    const result = CostFormSchema.safeParse(rawValues)
    if (!result.success) {
      const errors: CostFormErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof CostFormErrors
        if (!errors[field]) errors[field] = issue.message
      }
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/models/${alias}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cost_input_per_1m: result.data.cost_input_per_1m,
          cost_output_per_1m: result.data.cost_output_per_1m,
        }),
      })
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        throw new Error(errJson.error ?? `Błąd ${res.status}`)
      }
      toast.success(`Ceny modelu ${displayName} zaktualizowane`)
      setIsEditing(false)
      void mutateModels()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nieznany błąd'
      toast.error(
        `Nie udało się zaktualizować cen: ${message} — spróbuj ponownie`
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Period toggle + Chart ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">
            Koszt dzienny (USD) / Tokeny
          </h3>
          <div className="flex gap-1">
            {(['7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  period === p
                    ? 'bg-[#818cf8] text-white'
                    : 'bg-[#2a2540] text-slate-400 hover:text-white'
                }`}
              >
                {p === '7d' ? '7 dni' : '30 dni'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="w-full h-[200px] bg-[#2a2540] animate-pulse rounded" />
        )}

        {/* Error state */}
        {!isLoading && error && (
          <p className="text-red-400 text-center py-4 text-sm">
            Nie udało się pobrać danych wykresu
          </p>
        )}

        {/* No data */}
        {!isLoading && !error && metrics && !hasData && (
          <p className="text-slate-400 text-center py-8 text-sm">
            Brak danych dla wybranego okresu
          </p>
        )}

        {/* Chart */}
        {!isLoading && !error && metrics && hasData && (
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2540" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2540' }}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fill: '#818cf8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2540' }}
                  width={55}
                  tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#4ade80', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#2a2540' }}
                  width={55}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1730',
                    border: '1px solid #2a2540',
                    borderRadius: 8,
                    color: '#94a3b8',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="cost_usd"
                  name="Koszt (USD)"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tokens"
                  name="Tokeny"
                  stroke="#4ade80"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Stats summary ────────────────────────────────────────────────── */}
      {metrics && (
        <section>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">
            Statystyki okresu
          </h3>
          <StatsGrid points={metrics.points} />
        </section>
      )}

      {/* ── Cost editing form ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-300">Ceny API</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-[#818cf8] hover:text-white transition-colors"
            >
              Edytuj ceny
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            {/* cost_input_per_1m */}
            <div>
              <label
                htmlFor={`cost_input_${alias}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Koszt input ($/1M tokenów)
              </label>
              <input
                id={`cost_input_${alias}`}
                type="number"
                step="any"
                value={costInput}
                disabled={isSubmitting}
                onChange={(e) => setCostInput(e.target.value)}
                className={`w-full bg-[#0d0c1a] border rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#818cf8] disabled:cursor-not-allowed disabled:opacity-60 ${
                  formErrors.cost_input_per_1m
                    ? 'border-red-500'
                    : 'border-[#2a2540]'
                }`}
              />
              {formErrors.cost_input_per_1m && (
                <p className="text-red-400 text-xs mt-1">
                  {formErrors.cost_input_per_1m}
                </p>
              )}
            </div>

            {/* cost_output_per_1m */}
            <div>
              <label
                htmlFor={`cost_output_${alias}`}
                className="block text-xs text-slate-400 mb-1"
              >
                Koszt output ($/1M tokenów)
              </label>
              <input
                id={`cost_output_${alias}`}
                type="number"
                step="any"
                value={costOutput}
                disabled={isSubmitting}
                onChange={(e) => setCostOutput(e.target.value)}
                className={`w-full bg-[#0d0c1a] border rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#818cf8] disabled:cursor-not-allowed disabled:opacity-60 ${
                  formErrors.cost_output_per_1m
                    ? 'border-red-500'
                    : 'border-[#2a2540]'
                }`}
              />
              {formErrors.cost_output_per_1m && (
                <p className="text-red-400 text-xs mt-1">
                  {formErrors.cost_output_per_1m}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleSave()}
                className="px-4 py-1.5 bg-[#818cf8] text-white text-xs rounded hover:bg-[#6d77e0] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Zapisywanie…' : 'Zapisz'}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setIsEditing(false)
                  setFormErrors({})
                  setCostInput(String(currentCostInput))
                  setCostOutput(String(currentCostOutput))
                }}
                className="px-4 py-1.5 bg-[#2a2540] text-slate-400 text-xs rounded hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Anuluj
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#0d0c1a] rounded-lg p-3 text-sm">
            <div className="flex justify-between items-center text-slate-400">
              <span>Input:</span>
              <span className="text-white font-mono">
                ${currentCostInput.toFixed(4)} / 1M
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 mt-1">
              <span>Output:</span>
              <span className="text-white font-mono">
                ${currentCostOutput.toFixed(4)} / 1M
              </span>
            </div>
          </div>
        )}
      </section>

      {/* ── Recent runs ──────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">
          Ostatnie runy
        </h3>

        {runsData === undefined ? (
          <div className="space-y-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-7 bg-[#2a2540] animate-pulse rounded"
              />
            ))}
          </div>
        ) : recentRuns === null || recentRuns.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-2">
            Brak danych o runach
          </p>
        ) : (
          <div className="space-y-1.5">
            {recentRuns.map((run) => {
              const duration =
                run.duration_ms !== null && run.duration_ms !== undefined
                  ? `${(run.duration_ms / 1000).toFixed(1)}s`
                  : '—'
              const started = new Date(run.started_at)
              const date = started.toLocaleDateString('pl-PL', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
              const time = started.toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div
                  key={run.run_id}
                  className="flex items-center gap-2 text-xs text-slate-400 py-1 border-b border-[#2a2540] last:border-0"
                >
                  <StatusBadge status={run.status} />
                  <span className="text-white font-mono flex-shrink-0">
                    {run.story_id}
                  </span>
                  <span className="flex-shrink-0">•</span>
                  <span className="flex-shrink-0">{duration}</span>
                  <span className="flex-shrink-0">•</span>
                  <span className="flex-shrink-0 ml-auto">
                    {date} {time}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Stats grid subcomponent ──────────────────────────────────────────────────

function StatsGrid({ points }: { points: ModelMetricPoint[] }) {
  const totalRuns = points.reduce((s, p) => s + (p.runs ?? 0), 0)
  const totalCost = points.reduce((s, p) => s + (p.cost_usd ?? 0), 0)
  const totalTokens = points.reduce((s, p) => s + (p.tokens_in ?? 0) + (p.tokens_out ?? 0), 0)

  const tokenLabel =
    totalTokens >= 1_000_000
      ? `${(totalTokens / 1_000_000).toFixed(1)}M`
      : totalTokens >= 1_000
      ? `${(totalTokens / 1_000).toFixed(0)}k`
      : String(totalTokens)

  const stats = [
    { label: 'Łączne runy', value: String(totalRuns) },
    { label: 'Koszt (USD)',  value: `$${totalCost.toFixed(4)}` },
    { label: 'Tokeny',      value: tokenLabel },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-[#0d0c1a] rounded-lg p-2 text-center">
          <div className="text-xs text-slate-400">{label}</div>
          <div className="text-sm text-white font-medium mt-0.5">{value}</div>
        </div>
      ))}
    </div>
  )
}
