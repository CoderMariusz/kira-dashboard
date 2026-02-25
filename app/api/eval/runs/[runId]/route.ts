/**
 * app/api/eval/runs/[runId]/route.ts
 * STORY-7.4 — GET /api/eval/runs/[runId] — run detail + task results + diff.
 *
 * Response shape:
 * {
 *   run: EvalRun,
 *   taskResults: EvalRunTaskResult[],
 *   diff: { newFailures: string[], newPasses: string[], unchanged: number } | null
 * }
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/requireRole'
import {
  findEvalRunById,
  findEvalRunTaskResults,
  type EvalRunTaskResult,
} from '@/lib/bridge/eval-runs-bridge'

// ─── Diff helper ──────────────────────────────────────────────────────────────

interface DiffResult {
  newFailures: string[]   // task_ids that are now failing but passed in prev run
  newPasses: string[]     // task_ids that now pass but failed in prev run
  unchanged: number       // tasks whose pass/fail status did not change
}

function computeDiff(
  current: EvalRunTaskResult[],
  previous: EvalRunTaskResult[]
): DiffResult {
  const prevByTaskId = new Map<string, boolean>()
  for (const tr of previous) {
    prevByTaskId.set(tr.task_id, tr.passed)
  }

  const newFailures: string[] = []
  const newPasses: string[] = []
  let unchanged = 0

  for (const tr of current) {
    const prevPassed = prevByTaskId.get(tr.task_id)
    if (prevPassed === undefined) {
      // New task — not part of diff
      continue
    }
    if (!tr.passed && prevPassed) {
      newFailures.push(tr.task_id)
    } else if (tr.passed && !prevPassed) {
      newPasses.push(tr.task_id)
    } else {
      unchanged++
    }
  }

  return { newFailures, newPasses, unchanged }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
): Promise<Response> {
  // requireAuth → 401 if not logged in
  const authResult = await requireAuth(req)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { runId } = await params

  try {
    // 404 if run not found
    const run = findEvalRunById(runId)
    if (!run) {
      return NextResponse.json(
        { error: `EvalRun not found: ${runId}` },
        { status: 404 }
      )
    }

    // Fetch task results + previous run context
    const { taskResults, prevRunId, prevTaskResults } =
      findEvalRunTaskResults(runId)

    // Diff: null if no previous run exists
    const diff = prevRunId !== null
      ? computeDiff(taskResults, prevTaskResults)
      : null

    return NextResponse.json({ run, taskResults, diff })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
