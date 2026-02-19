'use client'

// components/overview/VelocityChart.tsx
// Chart.js bar chart — stories completed per day (last 30 days).
// Dynamiczny import Chart.js w useEffect (SSR incompatibility with canvas).

import { useEffect, useRef } from 'react'
import type { Run } from '@/types/bridge'

interface VelocityChartProps {
  runs: Run[] | null
  isLoading: boolean
  isOffline: boolean
}

export default function VelocityChart({ runs, isLoading, isOffline }: VelocityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (isOffline || isLoading || !canvasRef.current || !runs) return

    // Dynamic import — Chart.js cannot run in SSR
    import('chart.js/auto').then((ChartModule) => {
      const Chart = ChartModule.default

      // Generate last 30 days
      const today = new Date()
      const labels: string[] = []
      const dateKeys: string[] = []

      for (let i = 29; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
        labels.push(label)
        dateKeys.push(key)
      }

      // Count DONE runs per day
      const countMap: Record<string, number> = {}
      runs.forEach((run) => {
        if (run.status === 'DONE') {
          const day = run.created_at.slice(0, 10)
          countMap[day] = (countMap[day] || 0) + 1
        }
      })
      const data = dateKeys.map((key) => countMap[key] || 0)

      // Destroy previous chart instance
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Stories done',
              data,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              backgroundColor: (ctx: any) => {
                const v = ctx.raw as number
                if (v >= 20) return 'rgba(124,58,237,0.9)'
                if (v >= 15) return 'rgba(99,102,241,0.85)'
                return 'rgba(56,189,248,0.7)'
              },
              borderRadius: 3,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: '#4b4569', font: { size: 9 } },
              grid: { color: '#1f1c2e' },
            },
            y: {
              ticks: { color: '#4b4569', font: { size: 9 } },
              grid: { color: '#1f1c2e' },
            },
          },
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
        },
      })
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [runs, isOffline, isLoading])

  // Compute summary stats
  const doneCounts = (() => {
    if (!runs) return []
    const counts: Record<string, number> = {}
    runs.forEach((r) => {
      if (r.status === 'DONE') {
        const day = r.created_at.slice(0, 10)
        counts[day] = (counts[day] || 0) + 1
      }
    })
    return Object.values(counts)
  })()

  const total = doneCounts.reduce((a, b) => a + b, 0)
  const avg = (total / 30).toFixed(1)
  const peak = doneCounts.length > 0 ? Math.max(...doneCounts) : 0

  // Find peak date
  const peakDate = (() => {
    if (!runs || peak === 0) return null
    const counts: Record<string, number> = {}
    runs.forEach((r) => {
      if (r.status === 'DONE') {
        const day = r.created_at.slice(0, 10)
        counts[day] = (counts[day] || 0) + 1
      }
    })
    const peakDay = Object.entries(counts).find(([, v]) => v === peak)?.[0]
    if (!peakDay) return null
    const d = new Date(peakDay)
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${peak} (${monthNames[d.getMonth()]} ${d.getDate()})`
  })()

  return (
    <div
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', flex: 1, margin: 0 }}>
          Story Velocity
        </h3>
        <span style={{ fontSize: '11px', color: '#4b4569', marginLeft: '6px' }}>
          — stories/day · last 30 days
        </span>
      </div>

      {/* Chart area */}
      <div style={{ height: '110px', marginBottom: '10px' }}>
        {isLoading && (
          <div
            className="animate-pulse"
            style={{ height: '100%', background: '#2a2540', borderRadius: '4px' }}
          />
        )}
        {isOffline && !isLoading && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#4b4569',
            }}
          >
            🔌 Brak danych — Bridge offline
          </div>
        )}
        {!isLoading && !isOffline && (
          <canvas
            ref={canvasRef}
            aria-label="Wykres velocity — stories ukończone per dzień"
          />
        )}
      </div>

      {/* Summary stats */}
      {!isLoading && !isOffline && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            Avg/day: <b style={{ color: '#e6edf3' }}>{avg}</b>
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            Peak: <b style={{ color: '#e6edf3' }}>{peakDate ?? peak}</b>
          </span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>
            Total: <b style={{ color: '#e6edf3' }}>{total} stories</b>
          </span>
        </div>
      )}
    </div>
  )
}
