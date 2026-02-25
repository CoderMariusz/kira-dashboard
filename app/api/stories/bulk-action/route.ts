export const runtime = 'nodejs'

// POST /api/stories/bulk-action
// Body: { story_ids: string[], action: 'advance'|'assign_model', payload?: { status?: string, model?: string } }
// Returns: { results: [{id, success, error?}], success_count, failure_count } — ALWAYS 200

import { type NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { requireAdmin } from '@/lib/utils/require-admin'

const STORY_ID_REGEX = /^STORY-\d+\.\d+$/
const ALLOWED_ACTIONS = ['advance', 'assign_model'] as const
const ALLOWED_STATUSES = ['REVIEW', 'DONE', 'MERGE', 'REFACTOR'] as const
const ALLOWED_MODELS = ['kimi', 'glm', 'sonnet', 'codex', 'haiku', 'opus'] as const
const MAX_STORIES = 20
const CLI_TIMEOUT_MS = 10_000
const SLEEP_MS = 200

const BRIDGE_DIR = '/Users/mariuszkrawczyk/codermariusz/kira'
const BRIDGE_CLI_CMD =
  process.env.BRIDGE_CLI_CMD ??
  `cd "${BRIDGE_DIR}" && source .venv/bin/activate && python -m bridge.cli`

interface BulkResult {
  id: string
  success: boolean
  error?: string
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Auth check
  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  // 2. Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Nieprawidłowe body requestu' },
      { status: 400 }
    )
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Nieprawidłowe body requestu' },
      { status: 400 }
    )
  }

  const { story_ids, action, payload } = body as Record<string, unknown>

  // 3. Validate story_ids
  if (!Array.isArray(story_ids) || story_ids.length === 0) {
    return NextResponse.json(
      { error: 'Lista stories nie może być pusta' },
      { status: 400 }
    )
  }

  if (story_ids.length > MAX_STORIES) {
    return NextResponse.json(
      { error: 'Maksymalnie 20 stories na operację' },
      { status: 400 }
    )
  }

  for (const id of story_ids) {
    if (typeof id !== 'string' || !STORY_ID_REGEX.test(id)) {
      return NextResponse.json(
        { error: `Nieprawidłowy format story ID: ${String(id)}. Oczekiwany: STORY-N.N` },
        { status: 400 }
      )
    }
  }

  // 4. Validate action
  if (
    typeof action !== 'string' ||
    !(ALLOWED_ACTIONS as readonly string[]).includes(action)
  ) {
    return NextResponse.json(
      { error: 'Nieznana akcja. Dozwolone: advance, assign_model' },
      { status: 400 }
    )
  }

  // 5. Validate payload based on action
  const payloadObj = (payload && typeof payload === 'object' ? payload : {}) as Record<
    string,
    unknown
  >

  if (action === 'advance') {
    const status = payloadObj['status']
    if (
      typeof status !== 'string' ||
      !(ALLOWED_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json(
        {
          error: `Nieprawidłowy status. Dozwolone: ${ALLOWED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      )
    }
  }

  if (action === 'assign_model') {
    const model = payloadObj['model']
    if (
      typeof model !== 'string' ||
      !(ALLOWED_MODELS as readonly string[]).includes(model)
    ) {
      return NextResponse.json(
        {
          error: `Nieprawidłowy model. Dozwolone: ${ALLOWED_MODELS.join(', ')}`,
        },
        { status: 400 }
      )
    }
  }

  // 6. Execute sequentially with sleep
  const results: BulkResult[] = []
  let bridgeUnavailable = false

  for (const storyId of story_ids as string[]) {
    if (results.length > 0) {
      await sleep(SLEEP_MS)
    }

    // Fail-fast if bridge was already detected as unavailable
    if (bridgeUnavailable) {
      results.push({
        id: storyId,
        success: false,
        error: 'Bridge CLI niedostępne',
      })
      continue
    }

    try {
      let command: string

      if (action === 'advance') {
        const status = payloadObj['status'] as string
        command = `${BRIDGE_CLI_CMD} advance ${storyId} --to ${status} --project kira-dashboard`
      } else {
        // assign_model
        const model = payloadObj['model'] as string
        command = `${BRIDGE_CLI_CMD} start-story ${storyId} --model ${model} --worker bulk --project kira-dashboard`
      }

      const output = execSync(command, {
        timeout: CLI_TIMEOUT_MS,
        shell: '/bin/bash',
        env: { ...process.env },
        encoding: 'utf-8',
      })

      results.push({
        id: storyId,
        success: true,
      })

      // Log success for debugging
      console.log(`[bulk-action] ${action} ${storyId}: OK`, output?.trim())
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException & {
        killed?: boolean
        signal?: string
        stderr?: string
      }

      // Check for ENOENT (bridge not installed)
      if (error.code === 'ENOENT') {
        bridgeUnavailable = true
        results.push({
          id: storyId,
          success: false,
          error: 'Bridge CLI niedostępne',
        })
        continue
      }

      // Check for timeout
      if (error.killed || error.signal === 'SIGTERM') {
        results.push({
          id: storyId,
          success: false,
          error: 'Timeout — Bridge CLI nie odpowiedział w ciągu 10s',
        })
        continue
      }

      // General CLI error
      const errorMessage =
        (typeof error.stderr === 'string' ? error.stderr.trim() : '') ||
        error.message ||
        'Bridge CLI zwróciło błąd'

      console.error(`[bulk-action] ${action} ${storyId}: FAIL`, errorMessage)

      results.push({
        id: storyId,
        success: false,
        error: errorMessage.slice(0, 200),
      })
    }
  }

  // 7. Return results — always 200
  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  return NextResponse.json({
    results,
    success_count: successCount,
    failure_count: failureCount,
  })
}
