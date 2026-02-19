export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { evalStore, cleanupOldRuns } from '@/lib/eval-store'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  cleanupOldRuns()

  const { runId } = await params
  const state = evalStore.get(runId)

  if (!state) {
    return Response.json(
      { error: 'Run nie znaleziony. Może być za stary lub nie istnieje.' },
      { status: 404 }
    )
  }

  if (state.status === 'running') {
    return Response.json({ status: 'running' })
  }

  if (state.status === 'done') {
    // Parsuj output CLI żeby wyciągnąć score_percent, passed, total
    const output = state.result?.output ?? ''
    let score_percent: number | undefined
    let passed: number | undefined
    let total: number | undefined

    const scoreMatch = output.match(/Overall score:\s*([\d.]+)/)
    if (scoreMatch?.[1]) score_percent = Math.round(parseFloat(scoreMatch[1]) * 100)

    const passMatch = output.match(/Passed\/Failed:\s*(\d+)\/(\d+)/)
    if (passMatch?.[1] && passMatch?.[2]) {
      passed = parseInt(passMatch[1], 10)
      const failed = parseInt(passMatch[2], 10)
      total = passed + failed
    }

    return Response.json({
      status: 'done',
      result: {
        score_percent: score_percent ?? 0,
        passed: passed ?? 0,
        total: total ?? 0,
        output,
        completedAt: new Date(state.completedAt ?? Date.now()).toISOString(),
      },
    })
  }

  return Response.json({
    status: 'error',
    result: {
      error: state.result?.error ?? 'Nieznany błąd',
      completedAt: new Date(state.completedAt ?? Date.now()).toISOString(),
    },
  })
}
