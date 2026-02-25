'use client'

/**
 * components/eval/EvalTasksTable.tsx
 * STORY-7.6 — Table for Golden Tasks with skeleton, empty state, and RBAC.
 *
 * Columns: Category (badge), Prompt (truncated 80 chars), Model, Active (check/cross),
 *          Actions (edit/delete — ADMIN only)
 */

import { useMemo } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useEvalTasks } from '@/lib/eval/services'
import type { EvalTask, EvalCategory } from '@/lib/eval/types'

// ─── Badge color maps ────────────────────────────────────────────────────────

const CATEGORY_BADGE: Record<string, { bg: string; text: string }> = {
  API:       { bg: 'rgba(96,165,250,0.15)',   text: '#60a5fa' },
  Auth:      { bg: 'rgba(245,158,11,0.15)',   text: '#f59e0b' },
  CRUD:      { bg: 'rgba(52,211,153,0.15)',   text: '#34d399' },
  Pipeline:  { bg: 'rgba(129,140,248,0.15)',  text: '#818cf8' },
  Reasoning: { bg: 'rgba(167,139,250,0.15)',  text: '#a78bfa' },
  Home:      { bg: 'rgba(251,146,60,0.15)',   text: '#fb923c' },
}

// ─── Skeleton row ────────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div
            className="animate-pulse"
            style={{
              width: i === 1 ? '200px' : '80px',
              maxWidth: '100%',
              height: '14px',
              background: '#2a2540',
              borderRadius: '4px',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface EvalTasksTableProps {
  category: string
  onEdit: (task: EvalTask) => void
  onDelete: (task: EvalTask) => void
  onAdd?: () => void
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function EvalTasksTable({
  category,
  onEdit,
  onDelete,
  onAdd,
}: EvalTasksTableProps) {
  const { isAdmin } = useUserRole()
  const resolvedCategory = category === 'ALL' ? undefined : (category as EvalCategory)
  const { tasks: allTasks, isLoading } = useEvalTasks(resolvedCategory)

  // Client-side filter
  const tasks = useMemo(
    () => (category === 'ALL' ? allTasks : allTasks.filter((t) => t.category === category)),
    [allTasks, category]
  )

  const colCount = isAdmin ? 5 : 4

  return (
    <div
      style={{
        background: '#1a1728',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Kategoria', 'Prompt', 'Model', 'Aktywna'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8b8ba7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
              {isAdmin && (
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#8b8ba7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  Akcje
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <>
                <SkeletonRow cols={colCount} />
                <SkeletonRow cols={colCount} />
                <SkeletonRow cols={colCount} />
              </>
            ) : tasks.length === 0 ? (
              <tr>
                <td
                  colSpan={colCount}
                  style={{ padding: '48px 20px', textAlign: 'center' }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>📭</div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#8b8ba7',
                      marginBottom: '8px',
                    }}
                  >
                    Brak golden tasks. Dodaj pierwsze zadanie testowe.
                  </div>
                  {isAdmin && onAdd && (
                    <button
                      onClick={onAdd}
                      style={{
                        background: 'none',
                        border: '1px solid rgba(129,140,248,0.4)',
                        borderRadius: '8px',
                        color: '#818cf8',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '6px 14px',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      Dodaj task
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              tasks.map((task, idx) => {
                const catColors =
                  CATEGORY_BADGE[task.category] ?? {
                    bg: 'rgba(255,255,255,0.1)',
                    text: '#e6edf3',
                  }
                const promptTrunc =
                  task.prompt.length > 80
                    ? task.prompt.slice(0, 80) + '\u2026'
                    : task.prompt

                return (
                  <tr
                    key={task.id}
                    style={{
                      borderBottom:
                        idx < tasks.length - 1
                          ? '1px solid rgba(255,255,255,0.04)'
                          : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLTableRowElement).style.background =
                        'rgba(255,255,255,0.02)'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLTableRowElement).style.background =
                        'transparent'
                    }}
                  >
                    {/* Category badge */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          background: catColors.bg,
                          color: catColors.text,
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {task.category}
                      </span>
                    </td>

                    {/* Prompt (truncated) */}
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: '13px',
                        color: '#e6edf3',
                        maxWidth: '320px',
                      }}
                      title={task.prompt}
                    >
                      {promptTrunc}
                    </td>

                    {/* Model */}
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: '12px',
                        color: '#a0a0b8',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.target_model}
                    </td>

                    {/* Active */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          background: task.is_active
                            ? 'rgba(52,211,153,0.12)'
                            : 'rgba(255,255,255,0.06)',
                          color: task.is_active ? '#34d399' : '#8b8ba7',
                          borderRadius: '20px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {task.is_active ? '\u2713' : '\u2717'}
                      </span>
                    </td>

                    {/* Actions (ADMIN only) */}
                    {isAdmin && (
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => onEdit(task)}
                            aria-label={`Edytuj task: ${task.prompt.slice(0, 30)}`}
                            title="Edytuj"
                            style={{
                              background: 'rgba(129,140,248,0.1)',
                              border: '1px solid rgba(129,140,248,0.2)',
                              borderRadius: '6px',
                              color: '#818cf8',
                              fontSize: '13px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(task)}
                            aria-label={`Usun task: ${task.prompt.slice(0, 30)}`}
                            title="Usun"
                            style={{
                              background: 'rgba(248,113,113,0.1)',
                              border: '1px solid rgba(248,113,113,0.2)',
                              borderRadius: '6px',
                              color: '#f87171',
                              fontSize: '13px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
