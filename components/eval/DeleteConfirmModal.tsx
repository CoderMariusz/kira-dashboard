'use client'

/**
 * components/eval/DeleteConfirmModal.tsx
 * STORY-7.6 — Confirmation modal for deleting a golden task.
 */

import { useState } from 'react'
import type { EvalTask } from '@/lib/eval/types'

interface DeleteConfirmModalProps {
  task: EvalTask | null
  onConfirm: (id: string) => Promise<void>
  onCancel: () => void
}

export default function DeleteConfirmModal({
  task,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!task) return null

  const promptPreview =
    task.prompt.length > 60 ? task.prompt.slice(0, 60) + '...' : task.prompt

  async function handleConfirm() {
    setDeleting(true)
    setError(null)
    try {
      await onConfirm(task!.id)
      onCancel()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd usuwania')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60 }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Potwierdź usunięcie golden task"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1728',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '28px 32px',
          width: '440px',
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(248,113,113,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', flexShrink: 0,
          }}>🗑️</div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>
              Usuń Golden Task
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b8ba7' }}>
              Tej operacji nie można cofnąć.
            </p>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '14px', color: '#e6edf3' }}>
          Czy na pewno chcesz usunąć tę golden task?
        </p>

        <div style={{
          background: '#13111c',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px',
          padding: '12px 14px',
          fontSize: '12px',
          color: '#8b8ba7',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          &ldquo;{promptPreview}&rdquo;
        </div>

        {error && (
          <div style={{
            background: '#3a1a1a', border: '1px solid #5a2a2a',
            borderRadius: '8px', padding: '10px 14px',
            fontSize: '12px', color: '#f87171',
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex: 1, background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
            color: '#8b8ba7', fontSize: '13px', fontWeight: 600,
            padding: '10px', cursor: deleting ? 'not-allowed' : 'pointer',
          }}>
            Anuluj
          </button>
          <button onClick={handleConfirm} disabled={deleting} style={{
            flex: 1,
            background: deleting ? '#2a2540' : '#ef4444',
            border: 'none', borderRadius: '8px',
            color: deleting ? '#6b7280' : '#fff',
            fontSize: '13px', fontWeight: 600,
            padding: '10px', cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.7 : 1,
          }}>
            {deleting ? 'Usuwanie...' : 'Usuń task'}
          </button>
        </div>
      </div>
    </>
  )
}
