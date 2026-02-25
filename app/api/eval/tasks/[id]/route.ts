export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireRole'
import type { RequireAdminResult } from '@/lib/auth/requireRole'
import {
  findEvalTaskById,
  updateEvalTask,
  deleteEvalTask,
} from '@/lib/bridge/eval-tasks-bridge'
import { EVAL_CATEGORIES, EVAL_MODELS } from '@/lib/eval/types'
import type { EvalCategory, EvalModel } from '@/lib/eval/types'

/** Type guard: check if auth result is an error response */
function isErrorResponse(result: RequireAdminResult): result is NextResponse {
  return result instanceof Response
}

// ─── PATCH /api/eval/tasks/[id] ──────────────────────────────────────────────

interface UpdateTaskBody {
  prompt?: string
  expected_output?: string
  category?: EvalCategory
  target_model?: EvalModel
  is_active?: boolean
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authResult = await requireAdmin(req)
  if (isErrorResponse(authResult)) return authResult

  const { id } = await params

  try {
    const existing = findEvalTaskById(id)
    if (!existing) {
      return NextResponse.json(
        { error: `EvalTask not found: ${id}` },
        { status: 404 }
      )
    }

    const body = (await req.json()) as UpdateTaskBody

    // Validate category if provided
    if (body.category !== undefined && !EVAL_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EVAL_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate target_model if provided
    if (body.target_model !== undefined && !EVAL_MODELS.includes(body.target_model)) {
      return NextResponse.json(
        { error: `Invalid target_model. Must be one of: ${EVAL_MODELS.join(', ')}` },
        { status: 400 }
      )
    }

    // Build partial update
    const updates: {
      prompt?: string
      expected_output?: string
      category?: EvalCategory
      target_model?: EvalModel
      is_active?: boolean
    } = {}

    if (body.prompt !== undefined) updates.prompt = body.prompt
    if (body.expected_output !== undefined) updates.expected_output = body.expected_output
    if (body.category !== undefined) updates.category = body.category
    if (body.target_model !== undefined) updates.target_model = body.target_model
    if (body.is_active !== undefined) updates.is_active = body.is_active

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ task: existing })
    }

    const task = updateEvalTask(id, updates)
    return NextResponse.json({ task })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE /api/eval/tasks/[id] ─────────────────────────────────────────────

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authResult = await requireAdmin(req)
  if (isErrorResponse(authResult)) return authResult

  const { id } = await params

  try {
    const existing = findEvalTaskById(id)
    if (!existing) {
      return NextResponse.json(
        { error: `EvalTask not found: ${id}` },
        { status: 404 }
      )
    }

    deleteEvalTask(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Bridge error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
