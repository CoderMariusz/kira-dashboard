'use client'

// components/eval/EvalFrameworkPanel.tsx
// Panel górny zakładki Eval — pass rate, score bars per kategoria, historia runów, przycisk Run Eval Now.

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useEvalRun } from '@/hooks/useEvalRun'
import type { EvalRecentRun, EvalScore } from '@/types/bridge'

interface EvalFrameworkPanelProps {
  scores: EvalScore[] | null
  overallScore: number | null
  recentRuns: EvalRecentRun[] | null
  isLoading: boolean
  isOffline: boolean
}

/** Skeleton for loading state. */
function EvalSkeleton() {
  return (
    <div>
      {/* Pass rate + categories skeleton */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' }}>
        <div
          className="animate-pulse"
          style={{
            width: '60px',
            height: '60px',
            background: '#2a2540',
            borderRadius: '8px',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ width: '100%', height: '12px', background: '#2a2540', borderRadius: '3px' }}
            />
          ))}
        </div>
      </div>
      {/* Run history skeleton — 5 rows per AC-9 */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            width: '100%',
            height: '36px',
            background: '#2a2540',
            borderRadius: '7px',
            marginBottom: '5px',
          }}
        />
      ))}
    </div>
  )
}

/** Format ISO date string as "DD Mon HH:MM" (e.g. "19 Feb 11:46"). */
function formatRunDate(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getUTCDate().toString().padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const mon = months[d.getUTCMonth()]
  const hh = d.getUTCHours().toString().padStart(2, '0')
  const mm = d.getUTCMinutes().toString().padStart(2, '0')
  return `${day} ${mon} ${hh}:${mm}`
}

/** Format duration_ms as "Xm Ys" (e.g. "2m 14s"). */
function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const mins = Math.floor(totalSec / 60)
  const secs = totalSec % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

/** Format duration in seconds as "Xs" (e.g. "23s"). */
function formatDurationSeconds(seconds: number): string {
  return `${seconds}s`
}

export default function EvalFrameworkPanel({
  scores,
  overallScore,
  recentRuns,
  isLoading,
  isOffline,
}: EvalFrameworkPanelProps) {
  const {
    phase,
    isRunning,
    isDone,
    isError,
    result,
    error,
    triggerRun,
    retry,
  } = useEvalRun()

  // Toast notification przy zakończeniu evalu
  useEffect(() => {
    if (isDone && result) {
      const msg = `Eval zakończony: ${result.score_percent}% (${result.passed}/${result.total} passed)`
      if (result.score_percent >= 80) {
        toast.success(msg)
      } else {
        toast.error(msg)
      }
    }
  }, [isDone]) // Celowo pomijamy result w deps — toast tylko przy przejściu do done

  // Toast notification przy błędzie
  useEffect(() => {
    if (isError && error) {
      toast.error(`Eval nie powiódł się: ${error}`)
    }
  }, [isError]) // Celowo pomijamy error w deps

  // Compute derived values from scores
  const totalPassed = scores?.reduce((sum, s) => sum + s.passed_tests, 0) ?? 0
  const totalTests = scores?.reduce((sum, s) => sum + s.total_tests, 0) ?? 0

  // Pass rate: derive from passed/total, or fall back to overall score
  const passRateValue =
    totalTests > 0
      ? totalPassed / totalTests
      : (overallScore ?? 0)

  const passRatePct = Math.round(passRateValue * 100)

  return (
    <section
      role="region"
      aria-label="Eval Framework"
      style={{
        background: '#1a1730',
        border: '1px solid #2a2540',
        borderRadius: '10px',
        padding: '15px',
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '14px',
          gap: '8px',
        }}
      >
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#e6edf3',
            margin: 0,
            flex: 1,
          }}
        >
          Eval Framework
        </h3>
        <span style={{ fontSize: '11px', color: '#4b4569' }}>— pipeline quality</span>

        {/* Run Eval Now button */}
        <button
          onClick={triggerRun}
          disabled={isRunning || isOffline}
          aria-label={isRunning ? 'Eval w toku' : 'Uruchom Eval Now'}
          aria-disabled={isRunning || isOffline}
          aria-busy={isRunning}
          style={{
            background: isRunning
              ? '#2a2540'
              : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            color: isRunning ? '#6b7280' : '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '6px 14px',
            cursor: isRunning || isOffline ? 'not-allowed' : 'pointer',
            opacity: isRunning ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'opacity 0.2s',
          }}
        >
          {isRunning ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  border: '2px solid #6b7280',
                  borderTopColor: '#818cf8',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              Eval w toku...
            </>
          ) : (
            '▶ Uruchom Eval'
          )}
        </button>
      </div>

      {/* === Running State: Progress Bar === */}
      {isRunning && (
        <div
          role="progressbar"
          aria-label="Eval w toku"
          style={{ marginBottom: '16px' }}
        >
          {/* Progress bar indeterminate */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '4px',
              background: '#2a2540',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                height: '100%',
                width: '35%',
                background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                borderRadius: '4px',
                animation: 'indeterminate 1.5s ease-in-out infinite',
              }}
            />
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
            Eval w toku...
          </div>
        </div>
      )}

      {/* === Done State: Inline Result === */}
      {isDone && result && (
        <div
          className="eval-score-area"
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          {/* Pass rate big number */}
          <div className="ev-big" style={{ textAlign: 'center', flexShrink: 0 }}>
            <div
              className="ev-num"
              style={{
                fontSize: '36px',
                fontWeight: 800,
                color: result.score_percent >= 80 ? '#4ade80' : '#f87171',
                lineHeight: 1,
              }}
            >
              {result.score_percent}%
            </div>
            <div
              className="ev-lbl"
              style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}
            >
              Pass Rate
            </div>
            <div
              className="ev-sub"
              style={{
                fontSize: '10px',
                color: result.score_percent >= 80 ? '#4ade80' : '#f87171',
                marginTop: '2px',
              }}
            >
              {result.passed}/{result.total} passed
            </div>
            <div style={{ fontSize: '10px', color: '#4b4569', marginTop: '4px' }}>
              Czas: {formatDurationSeconds(result.duration_seconds)}
            </div>
          </div>

          {/* Category score bars (from result if available, otherwise from props) */}
          <div
            className="eval-cats"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {result.categories && result.categories.length > 0 ? (
              result.categories.map((cat) => (
                <div
                  key={cat.name}
                  className="ecat"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span
                    className="ecat-name"
                    style={{
                      fontSize: '10px',
                      color: '#6b7280',
                      width: '125px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flexShrink: 0,
                    }}
                  >
                    {cat.name}
                  </span>
                  <div
                    className="ecat-bg"
                    style={{
                      flex: 1,
                      background: '#2a2540',
                      borderRadius: '3px',
                      height: '5px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="ecat-fill"
                      style={{
                        background: 'linear-gradient(90deg, #4ade80, #34d399)',
                        height: '5px',
                        borderRadius: '3px',
                        width: `${Math.min(Math.max(cat.score, 0), 1) * 100}%`,
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span
                    className="ecat-pct"
                    style={{
                      fontSize: '10px',
                      color: '#4ade80',
                      width: '30px',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {Math.round(cat.score * 100)}%
                  </span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '11px', color: '#4b4569' }}>Brak szczegółowych danych per kategoria</div>
            )}
          </div>
        </div>
      )}

      {/* === Error State === */}
      {isError && error && (
        <div
          style={{
            background: '#3a1a1a',
            border: '1px solid #5a2a2a',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '8px' }}>
            ⚠️ Eval nie powiódł się: {error}
          </div>
          <button
            onClick={retry}
            style={{
              background: '#2a2540',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              color: '#e6edf3',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            aria-label="Spróbuj ponownie uruchomić eval"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* === Idle State: Default Content (from useEval) === */}
      {!isRunning && !isDone && !isError && (
        <>
          {/* Keyframe animations */}
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes indeterminate {
              0% { left: -35%; width: 35%; }
              60% { left: 100%; width: 35%; }
              100% { left: 100%; width: 35%; }
            }
          `}</style>

          {isLoading ? (
            <EvalSkeleton />
          ) : isOffline || scores === null ? (
            /* Offline / unavailable state */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
              <div style={{ fontSize: '13px', color: '#4b4569' }}>Eval unavailable</div>
            </div>
          ) : (
            <>
              {/* Score area — pass rate + category score bars */}
              <div
                className="eval-score-area"
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                {/* Pass rate big number */}
                <div className="ev-big" style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div
                    className="ev-num"
                    style={{ fontSize: '36px', fontWeight: 800, color: '#4ade80', lineHeight: 1 }}
                  >
                    {passRatePct}%
                  </div>
                  <div
                    className="ev-lbl"
                    style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}
                  >
                    Pass Rate
                  </div>
                  {totalTests > 0 && (
                    <div
                      className="ev-sub"
                      style={{ fontSize: '10px', color: '#4ade80', marginTop: '2px' }}
                    >
                      {totalPassed}/{totalTests} passed
                    </div>
                  )}
                </div>

                {/* Category score bars */}
                <div
                  className="eval-cats"
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  {scores.length === 0 ? (
                    <div style={{ fontSize: '11px', color: '#4b4569' }}>No categories yet</div>
                  ) : (
                    scores.map((cat) => (
                      <div
                        key={cat.category}
                        className="ecat"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span
                          className="ecat-name"
                          style={{
                            fontSize: '10px',
                            color: '#6b7280',
                            width: '125px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flexShrink: 0,
                          }}
                        >
                          {cat.category}
                        </span>
                        <div
                          className="ecat-bg"
                          style={{
                            flex: 1,
                            background: '#2a2540',
                            borderRadius: '3px',
                            height: '5px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            className="ecat-fill"
                            style={{
                              background: 'linear-gradient(90deg, #4ade80, #34d399)',
                              height: '5px',
                              borderRadius: '3px',
                              width: `${Math.min(Math.max(cat.score, 0), 1) * 100}%`,
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </div>
                        <span
                          className="ecat-pct"
                          style={{
                            fontSize: '10px',
                            color: '#4ade80',
                            width: '30px',
                            textAlign: 'right',
                            flexShrink: 0,
                          }}
                        >
                          {Math.round(cat.score * 100)}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Last 5 Eval Runs section */}
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#4b4569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: '8px',
                  }}
                >
                  Last 5 Eval Runs
                </div>

                {/* Recent runs — render from recentRuns data or show empty state */}
                {!recentRuns || recentRuns.length === 0 ? (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#4b4569',
                      textAlign: 'center',
                      padding: '12px 0',
                    }}
                  >
                    Brak historii eval runów. Kliknij &apos;Uruchom Eval&apos; żeby uruchomić pierwszy
                    eval.
                  </div>
                ) : (
                  recentRuns.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: '#13111c',
                        borderRadius: '7px',
                        padding: '7px 11px',
                        marginBottom: '5px',
                      }}
                    >
                      {/* Date */}
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#6b7280',
                          width: '110px',
                          flexShrink: 0,
                        }}
                      >
                        {formatRunDate(run.date)}
                      </span>

                      {/* Score */}
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#e6edf3',
                          width: '50px',
                          flexShrink: 0,
                        }}
                      >
                        {run.total_score.toFixed(1)}
                      </span>

                      {/* PASS / FAIL badge */}
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '7px',
                          background: run.passed ? '#1a3a1a' : '#3a1a1a',
                          color: run.passed ? '#4ade80' : '#f87171',
                          flexShrink: 0,
                        }}
                      >
                        {run.passed ? 'PASS' : 'FAIL'}
                      </span>

                      {/* Duration */}
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#4b4569',
                          textAlign: 'right',
                          marginLeft: 'auto',
                          flexShrink: 0,
                        }}
                      >
                        {formatDuration(run.duration_ms)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* Keyframe animations for running state */}
      {isRunning && (
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes indeterminate {
            0% { left: -35%; width: 35%; }
            60% { left: 100%; width: 35%; }
            100% { left: 100%; width: 35%; }
          }
        `}</style>
      )}
    </section>
  )
}
