'use client'

// hooks/useEvalRun.ts
// Hook zarządzający cyklem eval run: trigger → polling → wynik

import { useState, useEffect, useRef, useCallback } from 'react'
import type { EvalRunResult } from '@/types/bridge'

type EvalRunPhase = 'idle' | 'starting' | 'running' | 'done' | 'error'

interface UseEvalRunReturn {
  /** Aktualna faza runu. */
  phase: EvalRunPhase
  /** true gdy eval jest w trakcie (starting lub running). */
  isRunning: boolean
  /** true gdy eval zakończył się sukcesem. */
  isDone: boolean
  /** true gdy wystąpił błąd. */
  isError: boolean
  /** Wynik evaluacji — dostępny gdy isDone. */
  result: EvalRunResult | null
  /** Komunikat błędu — dostępny gdy isError. */
  error: string | null
  /** Identyfikator aktualnego runu — dostępny gdy running. */
  runId: string | null
  /** Rozpoczyna nowy eval run. */
  triggerRun: () => Promise<void>
  /** Resetuje stan i ponownie uruchamia eval. */
  retry: () => void
  /** Ręcznie resetuje stan do idle. */
  reset: () => void
}

/** Maksymalny czas oczekiwania na zakończenie evalu (5 minut). */
const MAX_POLLING_DURATION_MS = 5 * 60 * 1000
/** Interwał pollingu statusu (3 sekundy). */
const POLL_INTERVAL_MS = 3000

/**
 * Hook zarządzający cyklem eval run.
 * Triggeruje POST /api/eval/run, następnie polluje GET /api/eval/run/{runId}/status.
 */
export function useEvalRun(): UseEvalRunReturn {
  const [phase, setPhase] = useState<EvalRunPhase>('idle')
  const [result, setResult] = useState<EvalRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)

  /** Czyści wszystkie timery i aborty. */
  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  /** Resetuje stan do idle. */
  const reset = useCallback(() => {
    clearPolling()
    setPhase('idle')
    setResult(null)
    setError(null)
    setRunId(null)
    runIdRef.current = null
    startTimeRef.current = null
  }, [clearPolling])

  /** Cleanup przy unmount. */
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  /** Polling statusu jednego runu. */
  const pollStatus = useCallback(async (targetRunId: string) => {
    // Sprawdź timeout
    if (startTimeRef.current && Date.now() - startTimeRef.current > MAX_POLLING_DURATION_MS) {
      clearPolling()
      setPhase('error')
      setError('Timeout: eval run trwa zbyt długo (>5 min). Sprawdź Bridge CLI.')
      return
    }

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`/api/eval/run/${targetRunId}/status`, {
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = (await res.json()) as {
        status: 'running' | 'done' | 'failed'
        result?: EvalRunResult
        error?: string
      }

      if (data.status === 'done' && data.result) {
        clearPolling()
        setResult(data.result)
        setPhase('done')
      } else if (data.status === 'failed') {
        clearPolling()
        setError(data.error ?? 'Nieznany błąd')
        setPhase('error')
      }
      // Jeśli 'running' — nic nie robimy, polling kontynuuje
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // Ignoruj cancelled requests

      // Błąd sieciowy — zatrzymaj polling, pokaż błąd
      clearPolling()
      setError((err as Error).message)
      setPhase('error')
    }
  }, [clearPolling])

  /** Triggeruje nowy eval run. */
  const triggerRun = useCallback(async () => {
    if (phase === 'starting' || phase === 'running') return // Guard: jeden run naraz

    setPhase('starting')
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      const { runId: newRunId } = (await res.json()) as { runId: string }

      setRunId(newRunId)
      runIdRef.current = newRunId
      setPhase('running')
      startTimeRef.current = Date.now()

      // Pierwsze poll natychmiast
      await pollStatus(newRunId)

      // Kolejne co 3 sekundy (tylko jeśli nadal running)
      intervalRef.current = setInterval(() => {
        const currentRunId = runIdRef.current
        if (currentRunId) {
          pollStatus(currentRunId)
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      setError((err as Error).message)
      setPhase('error')
    }
  }, [phase, pollStatus])

  /** Retry — reset i trigger. */
  const retry = useCallback(() => {
    clearPolling()
    setPhase('idle')
    setError(null)
    setResult(null)
    setRunId(null)
    runIdRef.current = null
    startTimeRef.current = null

    // Wywołaj triggerRun w następnym tick (po ustawieniu idle)
    setTimeout(() => {
      triggerRun()
    }, 0)
  }, [clearPolling, triggerRun])

  return {
    phase,
    isRunning: phase === 'starting' || phase === 'running',
    isDone: phase === 'done',
    isError: phase === 'error',
    result,
    error,
    runId,
    triggerRun,
    retry,
    reset,
  }
}
