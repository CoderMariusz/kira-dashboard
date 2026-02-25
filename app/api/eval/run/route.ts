export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { exec } from 'child_process'
import { randomUUID } from 'crypto'
import { evalStore, cleanupOldRuns } from '@/lib/eval-store'
import { requireAdmin } from '@/lib/auth/requireRole'

const EVAL_TIMEOUT_MS = 5 * 60 * 1000
const MAX_BUFFER_BYTES = 50 * 1024 * 1024

function markError(runId: string, errorMessage: string): void {
  const existing = evalStore.get(runId)

  evalStore.set(runId, {
    status: 'error',
    startedAt: existing?.startedAt ?? Date.now(),
    completedAt: Date.now(),
    result: {
      error: errorMessage,
    },
  })
}

function runEvalAsync(runId: string, command: string): void {
  try {
    const child = exec(
      command,
      {
        timeout: EVAL_TIMEOUT_MS,
        shell: '/bin/bash',
        maxBuffer: MAX_BUFFER_BYTES,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        const existing = evalStore.get(runId)
        const startedAt = existing?.startedAt ?? Date.now()
        const completedAt = Date.now()

        if (error) {
          const isTimeout = error.killed || error.signal === 'SIGTERM'
          const cliError = stderr?.trim() || stdout?.trim() || error.message

          evalStore.set(runId, {
            status: 'error',
            startedAt,
            completedAt,
            result: {
              error: isTimeout
                ? 'Eval run timeout po 5 minutach'
                : cliError || 'Bridge CLI zwróciło błąd',
            },
          })
          return
        }

        evalStore.set(runId, {
          status: 'done',
          startedAt,
          completedAt,
          result: {
            output: stdout.trim(),
          },
        })
      }
    )

    if (!child.pid) {
      markError(runId, 'Nie można uruchomić Bridge CLI')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Nie można uruchomić Bridge CLI'
    markError(runId, message)
  }
}

export async function POST(): Promise<Response> {
  // Auth: only ADMIN can trigger eval runs
  const authResult = await requireAdmin()
  if (authResult instanceof Response) return authResult

  const bridgeDir = process.env['BRIDGE_DIR']

  if (!bridgeDir) {
    return Response.json(
      {
        ok: false,
        error: 'Konfiguracja serwera: brak BRIDGE_DIR w zmiennych środowiskowych',
      },
      { status: 500 }
    )
  }

  cleanupOldRuns()

  const runId = randomUUID()

  evalStore.set(runId, {
    status: 'running',
    startedAt: Date.now(),
  })

  const command = `cd "${bridgeDir}" && source .venv/bin/activate && python -m bridge.cli eval run`
  runEvalAsync(runId, command)

  return Response.json({ runId }, { status: 202 })
}
