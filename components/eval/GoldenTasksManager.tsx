'use client'

/**
 * components/eval/GoldenTasksManager.tsx
 * STORY-7.6 — Full CRUD manager for golden tasks.
 */

import { useState, useMemo } from 'react'
import { useGoldenTasks } from '@/hooks/useGoldenTasks'
import { useUserRole } from '@/hooks/useUserRole'
import { EVAL_CATEGORIES } from '@/lib/eval/types'
import type { EvalTask } from '@/lib/eval/types'
import TaskFormDrawer from './TaskFormDrawer'
import DeleteConfirmModal from './DeleteConfirmModal'

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  API:       { bg: 'rgba(129,140,248,0.15)', text: '#818cf8' },
  Auth:      { bg: 'rgba(244,114,182,0.15)', text: '#f472b6' },
  CRUD:      { bg: 'rgba(251,146,60,0.15)',  text: '#fb923c' },
  Pipeline:  { bg: 'rgba(167,139,250,0.15)', text: '#a78bfa' },
  Reasoning: { bg: 'rgba(52,211,153,0.15)',  text: '#34d399' },
  Home:      { bg: 'rgba(96,165,250,0.15)',  text: '#60a5fa' },
}

const MODEL_COLORS: Record<string, { bg: string; text: string }> = {
  haiku:  { bg: 'rgba(96,165,250,0.12)',  text: '#93c5fd' },
  kimi:   { bg: 'rgba(52,211,153,0.12)',  text: '#6ee7b7' },
  sonnet: { bg: 'rgba(129,140,248,0.12)', text: '#a5b4fc' },
  codex:  { bg: 'rgba(251,146,60,0.12)',  text: '#fdba74' },
  glm:    { bg: 'rgba(244,114,182,0.12)', text: '#f9a8d4' },
}

function SkeletonRow() {
  return (
    <tr>
      {[90, 300, 80, 60, 80].map((w, i) => (
        <td key={i} style={{ padding: '12px 14px' }}>
          <div className="animate-pulse" style={{
            width: `${w}px`, maxWidth: '100%', height: '14px',
            background: '#2a2540', borderRadius: '4px',
          }} />
        </td>
      ))}
    </tr>
  )
}

export default function GoldenTasksManager() {
  const { isAdmin } = useUserRole()
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(EVAL_CATEGORIES)
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTask, setEditTask] = useState<EvalTask | null>(null)
  const [deleteTask, setDeleteTask] = useState<EvalTask | null>(null)

  const { tasks, loading, error, createTask, updateTask, deleteTask: doDelete, refresh } =
    useGoldenTasks()

  const filteredTasks = useMemo(() => {
    if (selectedCategories.size === EVAL_CATEGORIES.length) return tasks
    return tasks.filter((t) => selectedCategories.has(t.category))
  }, [tasks, selectedCategories])

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        if (next.size === 1) return prev
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  function openAdd() { setEditTask(null); setDrawerOpen(true) }
  function openEdit(task: EvalTask) { setEditTask(task); setDrawerOpen(true) }
  function closeDrawer() { setDrawerOpen(false); setEditTask(null) }

  return (
    <section style={{
      background: '#1a1728',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#e6edf3' }}>
            Golden Tasks
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8b8ba7' }}>
            {loading ? 'Ładowanie...' : `${filteredTasks.length} task${filteredTasks.length !== 1 ? 'i' : ''}`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} aria-label="Dodaj golden task" style={{
            background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
            border: 'none', borderRadius: '8px', color: '#fff',
            fontSize: '12px', fontWeight: 600, padding: '8px 16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            ＋ Add Task
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '8px',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {EVAL_CATEGORIES.map((cat) => {
          const active = selectedCategories.has(cat)
          const colors = CATEGORY_COLORS[cat] ?? { bg: 'rgba(255,255,255,0.1)', text: '#e6edf3' }
          return (
            <button key={cat} onClick={() => toggleCategory(cat)} aria-pressed={active} style={{
              background: active ? colors.bg : 'transparent',
              border: `1px solid ${active ? colors.text : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '20px',
              color: active ? colors.text : '#8b8ba7',
              fontSize: '11px', fontWeight: 600,
              padding: '4px 12px', cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
              {cat}
            </button>
          )
        })}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: '16px 20px', background: 'rgba(248,113,113,0.1)', color: '#f87171', fontSize: '13px' }}>
          ⚠️ {error}{' '}
          <button onClick={refresh} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>
            Odśwież
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Kategoria', 'Prompt', 'Model', 'Aktywna', ...(isAdmin ? ['Akcje'] : [])].map((h) => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontSize: '11px', fontWeight: 600, color: '#8b8ba7',
                  textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '10px' }}>📭</div>
                  <div style={{ fontSize: '14px', color: '#8b8ba7', marginBottom: '8px' }}>
                    Brak golden tasks
                  </div>
                  {isAdmin && (
                    <button onClick={openAdd} style={{
                      background: 'none',
                      border: '1px solid rgba(129,140,248,0.4)',
                      borderRadius: '8px', color: '#818cf8',
                      fontSize: '12px', fontWeight: 600,
                      padding: '6px 14px', cursor: 'pointer', marginTop: '4px',
                    }}>
                      ＋ Dodaj pierwszy task
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredTasks.map((task, idx) => {
                const catColors = CATEGORY_COLORS[task.category] ?? { bg: 'rgba(255,255,255,0.1)', text: '#e6edf3' }
                const modelColors = MODEL_COLORS[task.target_model] ?? { bg: 'rgba(255,255,255,0.1)', text: '#e6edf3' }
                const promptTrunc = task.prompt.length > 80 ? task.prompt.slice(0, 80) + '…' : task.prompt

                return (
                  <tr
                    key={task.id}
                    style={{ borderBottom: idx < filteredTasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                  >
                    {/* Category */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: catColors.bg, color: catColors.text, borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {task.category}
                      </span>
                    </td>

                    {/* Prompt */}
                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#e6edf3', maxWidth: '320px' }} title={task.prompt}>
                      {promptTrunc}
                    </td>

                    {/* Model */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ background: modelColors.bg, color: modelColors.text, borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                        {task.target_model}
                      </span>
                    </td>

                    {/* Active */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        background: task.is_active ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
                        color: task.is_active ? '#34d399' : '#8b8ba7',
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '11px', fontWeight: 600,
                      }}>
                        {task.is_active ? '✓ Aktywna' : '✗ Nieaktywna'}
                      </span>
                    </td>

                    {/* Actions (ADMIN only) */}
                    {isAdmin && (
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => openEdit(task)}
                            aria-label={`Edytuj task`}
                            title="Edytuj"
                            style={{
                              background: 'rgba(129,140,248,0.1)',
                              border: '1px solid rgba(129,140,248,0.2)',
                              borderRadius: '6px', color: '#818cf8',
                              fontSize: '13px', padding: '5px 8px',
                              cursor: 'pointer', lineHeight: 1,
                            }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => setDeleteTask(task)}
                            aria-label={`Usuń task`}
                            title="Usuń"
                            style={{
                              background: 'rgba(248,113,113,0.1)',
                              border: '1px solid rgba(248,113,113,0.2)',
                              borderRadius: '6px', color: '#f87171',
                              fontSize: '13px', padding: '5px 8px',
                              cursor: 'pointer', lineHeight: 1,
                            }}
                          >
                            🗑️
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

      <TaskFormDrawer
        open={drawerOpen}
        task={editTask}
        onClose={closeDrawer}
        onCreate={createTask}
        onUpdate={updateTask}
      />

      <DeleteConfirmModal
        task={deleteTask}
        onConfirm={doDelete}
        onCancel={() => setDeleteTask(null)}
      />
    </section>
  )
}
