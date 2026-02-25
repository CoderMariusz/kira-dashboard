/**
 * app/api/eval/runs/[runId]/route.ts
 * STORY-7.4 — GET /api/eval/runs/[runId] — run detail + task results + diff.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireRole'
import { findEvalRunById, findEvalRunTaskResults, type EvalRunTaskResult } from '@/lib/bridge/eval-runs-bridge'

interface DiffResult { newFailures: string[]; newPasses: string[]; unchanged: number }

function computeDiff(current: EvalRunTaskResult[], previous: EvalRunTaskResult[]): DiffResult {
  const prevMap = new Map<string, boolean>()
  for (const tr of previous) prevMap.set(tr.task_id, tr.passed)
  const newFailures: string[] = [], newPasses: string[] = []
  let unchanged = 0
  for (const tr of current) {
    const prev = prevMap.get(tr.task_id)
    if (prev === undefined) continue
    if (!tr.passed && prev) newFailures.push(tr.task_id)
    else if (tr.passed && !prev) newPasses.push(tr.task_id)
    else unchanged++
  }
  return { newFailures, newPasses, unchanged }
}

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }): Promise<Response> {
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) return authResult
  const { runId } = await params
  try {
    const run = findEvalRunById(runId)
    if (!run) return NextResponse.json({ error: `EvalRun not found: ${runId}` }, { status: 404 })
    const { taskResults, prevRunId, prevTaskResults } = findEvalRunTaskResults(runId)
    const diff = prevRunId !== null ? computeDiff(taskResults, prevTaskResults) : null
    return NextResponse.json({ run, taskResults, diff })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
