// lib/bridge-cli.ts
// Helper do uruchamiania Bridge CLI jako child process.
// Wymagane: BRIDGE_DIR w zmiennych środowiskowych (ścieżka do projektu kira).
// Używane przez: /api/stories/[id]/start i /api/stories/[id]/advance

import { exec } from 'child_process'

/** Timeout wywołania Bridge CLI w milisekundach (30 sekund). */
const BRIDGE_CLI_TIMEOUT_MS = 30_000

/** Regex walidujący format story ID (np. STORY-1.1, STORY-12.34). */
export const STORY_ID_REGEX = /^STORY-\d+\.\d+$/

/** Dozwolone wartości statusu dla komendy advance. */
export const ALLOWED_STATUSES = ['REVIEW', 'DONE', 'REFACTOR'] as const
export type AdvanceStatus = (typeof ALLOWED_STATUSES)[number]

/**
 * Wynik wywołania Bridge CLI — sukces.
 */
export interface BridgeCLISuccess {
  ok: true
  output: string
}

/**
 * Wynik wywołania Bridge CLI — błąd.
 */
export interface BridgeCLIError {
  ok: false
  error: string
  status: 400 | 504
}

export type BridgeCLIResult = BridgeCLISuccess | BridgeCLIError

/**
 * Uruchamia komendę Bridge CLI z timeoutem 30s.
 * Wymaga basha (source .venv/bin/activate używa bash-specific składni).
 *
 * @param command - Pełna komenda do wykonania w bashu
 * @returns Promise z sukcesem (stdout) lub błędem (stderr/stdout, status 400 lub 504)
 */
export function runBridgeCLI(command: string): Promise<BridgeCLIResult> {
  return new Promise((resolve) => {
    const child = exec(
      command,
      {
        timeout: BRIDGE_CLI_TIMEOUT_MS,
        shell: '/bin/bash', // WAŻNE: source wymaga bash, nie sh
        env: { ...process.env }, // przekaż env vars do child process
      },
      (error, stdout, stderr) => {
        if (error) {
          // Sprawdź czy to timeout (error.killed lub SIGTERM)
          if (error.killed || error.signal === 'SIGTERM') {
            resolve({
              ok: false,
              error: 'Bridge CLI timeout po 30 sekundach',
              status: 504,
            })
            return
          }

          // Błąd CLI (exit code != 0)
          console.error('[Bridge CLI error]', {
            command,
            stderr: stderr?.trim(),
            stdout: stdout?.trim(),
            code: error.code,
          })

          const errorMessage =
            stderr?.trim() || stdout?.trim() || 'Bridge CLI zwróciło błąd'

          resolve({
            ok: false,
            error: errorMessage,
            status: 400,
          })
          return
        }

        // Sukces (exit code 0)
        resolve({
          ok: true,
          output: stdout.trim(),
        })
      }
    )

    // Zabezpieczenie: jeśli child jest null (exec się nie uruchomił)
    if (!child) {
      resolve({
        ok: false,
        error: 'Nie udało się uruchomić Bridge CLI',
        status: 400,
      })
    }
  })
}
