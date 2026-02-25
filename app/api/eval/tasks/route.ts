export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAuth, requireAdmin } from '@/lib/auth/requireRole'
import type { RequireAuthResult, RequireAdminResult } from '@/lib/auth/requireRole'
import {
  findAllEvalTasks,
  createEvalTask,
} from '@/lib/bridge/eval-tasks-bridge'
import { EVAL_CATEGORIES, EVAL_MODELS } from '@/lib/eval/types'
import type { EvalCategory, EvalModel } from '@/lib/eval/types'

/** Type guard: check if auth result is an error response */
function isErrorResponse(result: RequireAuthResult | RequireAdminResult): result is NextResponse {
  return result instanceof Response
}

// ─── GET /api/eval/tasks ─────────────────────────────────────────────────────

export async function GET(req: Request): Promise<Response> {
  const authResult = await requireAuth(req)
  if (isErrorResponse(authResult)) return authResult

  try {
    const url = new URL(req.url)
    const category = url.searchParams.get('category') || undefined
    const activeOnlyParam = url.searchParams.get('active_only')
    const active_only = activeOnlyParam !== 'false'

    const tasks = findAllEvalTasks({ category, active_only })

    return NextResponse.json({ tasks })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/eval/tasks ────────────────────────────────────────────────────

interface CreateTaskBody {
  prompt?: string
  expected_output?: string
  category?: EvalCategory
  target_model?: EvalModel
}

export async function POST(req: Request): Promise<Response> {
  const authResult = await requireAdmin(req)
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = (await req.json()) as CreateTaskBody

    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: prompt' },
        { status: 400 }
      )
    }

    if (!body.expected_output || typeof body.expected_output !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: expected_output' },
        { status: 400 }
      )
    }

    if (!body.category) {
      return NextResponse.json(
        { error: 'Missing required field: category' },
        { status: 400 }
      )
    }

    if (!EVAL_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EVAL_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    if (!body.target_model) {
      return NextResponse.json(
        { error: 'Missing required field: target_model' },
        { status: 400 }
      )
    }

    if (!EVAL_MODELS.includes(body.target_model)) {
      return NextResponse.json(
        { error: `Invalid target_model. Must be one of: ${EVAL_MODELS.join(', ')}` },
        { status: 400 }
      )
    }

    const task = createEvalTask({
      prompt: body.prompt,
      expected_output: body.expected_output,
      category: body.category,
      target_model: body.target_model,
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
