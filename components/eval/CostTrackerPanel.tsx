'use client'

// components/eval/CostTrackerPanel.tsx
// Panel dolny zakładki Eval — tabela kosztów per model + doughnut chart.
// Koszty obliczane po stronie frontendu na podstawie cost_estimate z runów.

import { useEffect, useRef } from 'react'
import type { Run } from '@/types/bridge'
import {
  MODEL_COSTS,
  KNOWN_MODEL_KEYS,
  resolveModelKey,
  calcTokenCost,
} from '@/config/model-costs'

interface CostTrackerPanelProps {
  runs: Run[] | null
  isLoading: boolean
}

/** Data for a single model row in the cost table. */
interface ModelRowData {
  key: string
  displayName: string
  color: string
  runCount: number
  /** Average total tokens (input + output) per run — null if no runs */
  avgTokens: number | null
  costPerRun: number
  totalCost: number
}

/** Formats cost as "$X.XX" or "~$X.XX" (with tilde when > $0). */
function formatCost(cost: number, withTilde = false): string {
  const formatted = `$${cost.toFixed(2)}`
  return withTilde && cost > 0 ? `~${formatted}` : formatted
}

/** Formats token count as "Xk" (rounded to nearest thousand). */
function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`
  return `${Math.round(tokens / 1000)}k`
}

/** Skeleton placeholder for loading state. */
function CostSkeleton() {
  return (
    <div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            width: '100%',
            height: '36px',
            background: '#2a2540',
            borderRadius: '7px',
            marginBottom: '5px',
          }}
        />
      ))}
      {/* Doughnut placeholder */}
      <div
        className="animate-pulse"
        style={{
          width: '160px',
          height: '160px',
          background: '#2a2540',
          borderRadius: '50%',
          margin: '16px auto 0',
        }}
      />
    </div>
  )
}

/** Chart.js doughnut component. */
function CostDoughnutChart({ modelRows }: { modelRows: ModelRowData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    import('chart.js/auto').then((ChartModule) => {
      if (!canvasRef.current) return

      const Chart = ChartModule.default

      // Destroy previous instance to prevent "Canvas is already in use" error
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      const allZero = modelRows.every((r) => r.totalCost === 0)
      // If all zero, use equal segments so chart is visible
      const data = allZero
        ? modelRows.map(() => 1)
        : modelRows.map((r) => r.totalCost)

      chartRef.current = new Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels: modelRows.map((r) => r.displayName),
          datasets: [
            {
              data,
              backgroundColor: modelRows.map((r) => r.color),
              borderColor: '#13111c',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#6b7280',
                font: { size: 10 },
                padding: 12,
              },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const row = modelRows[ctx.dataIndex]
                  if (!row) return ''
                  return allZero ? '$0.00' : formatCost(row.totalCost, true)
                },
              },
            },
          },
          cutout: '65%',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          animation: false as any,
        },
      })
    })

    // Cleanup — destroy chart on unmount or re-render
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [modelRows])

  return (
    <div style={{ height: '200px', width: '100%' }}>
      <canvas
        id="cost-doughnut"
        ref={canvasRef}
        aria-label="Wykres kołowy rozkładu kosztów per model"
      />
    </div>
  )
}

export default function CostTrackerPanel({ runs, isLoading }: CostTrackerPanelProps) {
  // --- Compute cost data ---

  // Group runs by known model keys — token-based cost computation (AC-6, AC-7)
  const modelRows: ModelRowData[] = KNOWN_MODEL_KEYS.map((key) => {
    const config = MODEL_COSTS[key] ?? { displayName: key, color: '#6b7280', input: 0, output: 0 }
    const modelRuns = (runs ?? []).filter((r) => resolveModelKey(r.model) === key)
    const runCount = modelRuns.length

    if (runCount === 0) {
      return {
        key,
        displayName: config.displayName,
        color: config.color,
        runCount: 0,
        avgTokens: null,
        costPerRun: 0,
        totalCost: 0,
      }
    }

    // Sum input and output tokens across all runs for this model
    const sumInput = modelRuns.reduce((s, r) => s + (r.input_tokens ?? 0), 0)
    const sumOutput = modelRuns.reduce((s, r) => s + (r.output_tokens ?? 0), 0)

    // Avg tokens per run (input + output combined)
    const avgTokens = (sumInput + sumOutput) / runCount

    // Total cost from aggregate token sums
    const totalCost = calcTokenCost(key, sumInput, sumOutput)
    const costPerRun = totalCost / runCount

    return {
      key,
      displayName: config.displayName,
      color: config.color,
      runCount,
      avgTokens,
      costPerRun,
      totalCost,
    }
  })

  // Handle EC-3: unknown models — group under "Other"
  const otherRuns = (runs ?? []).filter((r) => resolveModelKey(r.model) === null)
  const hasOther = otherRuns.length > 0
  const otherRow: ModelRowData | null = hasOther
    ? {
        key: 'other',
        displayName: 'Other',
        color: '#6b7280',
        runCount: otherRuns.length,
        avgTokens: null,
        costPerRun: 0, // No pricing for unknown models
        totalCost: 0,
      }
    : null

  const allRows = otherRow ? [...modelRows, otherRow] : modelRows
  const totalAll = allRows.reduce((sum, r) => sum + r.totalCost, 0)

  return (
    <section
      role="region"
      aria-label="Cost Tracker"
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '14px',
          gap: '8px',
        }}
      >
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#e6edf3',
            margin: 0,
            flex: 1,
          }}
        >
          Cost Tracker
        </h3>
        <span style={{ fontSize: '11px', color: '#4b4569' }}>— est. today</span>
      </div>

      {/* === Content === */}
      {isLoading ? (
        <CostSkeleton />
      ) : runs === null ? (
        /* Offline / no data */
        <div
          style={{
            fontSize: '12px',
            color: '#4b4569',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          Brak danych do obliczenia kosztów
        </div>
      ) : (
        <>
          {/* Cost table */}
          <div style={{ marginBottom: '8px' }}>
            {allRows.map((row) => (
              <div
                key={row.key}
                className="cost-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  background: '#13111c',
                  borderRadius: '7px',
                  padding: '7px 11px',
                  marginBottom: '5px',
                }}
              >
                {/* Model name */}
                <span
                  className="cost-model"
                  style={{
                    fontSize: '12px',
                    color: '#e6edf3',
                    fontWeight: 600,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: row.color,
                      flexShrink: 0,
                    }}
                  />
                  {row.displayName}
                </span>

                {/* Runs count */}
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    width: '44px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {row.runCount} runs
                </span>

                {/* Avg tokens */}
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    width: '70px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {row.runCount === 0
                    ? '—'
                    : row.avgTokens !== null
                      ? formatTokens(row.avgTokens)
                      : '—'}
                </span>

                {/* Est. cost/run */}
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    width: '75px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {row.runCount === 0 ? '$0.00' : formatCost(row.costPerRun, true)}
                </span>

                {/* Total est. cost */}
                <span
                  className="cost-val"
                  style={{
                    fontSize: '11px',
                    color: '#e6edf3',
                    fontWeight: 600,
                    width: '60px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {formatCost(row.totalCost, row.totalCost > 0)}
                </span>
              </div>
            ))}

            {/* Total row */}
            <div
              style={{
                borderTop: '1px solid #2a2540',
                paddingTop: '8px',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Total today</span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3' }}>
                {formatCost(totalAll, totalAll > 0)}
              </span>
            </div>
          </div>

          {/* Doughnut chart section */}
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#4b4569',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: '10px',
              }}
            >
              Cost Distribution
            </div>
            <CostDoughnutChart modelRows={modelRows} />
          </div>
        </>
      )}
    </section>
  )
}
