'use client'

// components/overview/ModelSparkline.tsx
// Chart.js line sparkline — last 10 runs cumulative trend.
// Each instance manages its own Chart.js lifecycle with cleanup.

import { useEffect, useRef } from 'react'

interface ModelSparklineProps {
  data: number[]
  color: string
}

export default function ModelSparkline({ data, color }: ModelSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    import('chart.js/auto').then(({ default: Chart }) => {
      // Destroy previous instance before creating a new one (EC-3: no memory leak)
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }

      if (!canvasRef.current) return

      // Derive fill color: 'rgb(R,G,B)' → 'rgba(R,G,B,0.12)'
      const fillColor = color.replace('rgb', 'rgba').replace(')', ',0.12)')

      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: data.map((_, i) => i),
          datasets: [
            {
              data,
              borderColor: color,
              borderWidth: 1.5,
              fill: true,
              backgroundColor: fillColor,
              pointRadius: 0,
              tension: 0.4,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false },
          },
          animation: false,
          responsive: true,
          maintainAspectRatio: false,
        },
      })
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, color])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
