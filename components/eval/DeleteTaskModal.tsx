'use client'

/**
 * components/eval/DeleteTaskModal.tsx
 * STORY-7.6 — Confirmation modal for deleting a golden task.
 */

import { useState } from 'react'
import { toast } from 'sonner'
import type { EvalTask } from '@/lib/eval/types'
import { deleteEvalTask } from '@/lib/eval/services'

interface DeleteTaskModalProps {
  task: EvalTask | null
  onCancel: () => void
  mutate: () => void
}

export default function DeleteTaskModal({ task, onCancel, mutate }: DeleteTaskModalProps) {
  const [deleting, setDeleting] = useState(false)

  if (!task) return null

  const promptPreview =
    task.prompt.length > 60 ? task.prompt.slice(0, 60) + '...' : task.prompt

  async function handleConfirm() {
    if (!task) return
    setDeleting(true)
    try {
      await deleteEvalTask(task.id)
      toast.success('Task usuniety')
      mutate()
      onCancel()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nieznany blad'
      toast.error(`Blad usuwania: ${msg}`)
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 60,
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-task-title"
        aria-describedby="del-task-desc"
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
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(248,113,113,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            D
          </div>
          <div>
            <h3
              id="del-task-title"
              style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}
            >
              Usun zadanie testowe
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#8b8ba7' }}>
              Tej operacji nie mozna cofnac.
            </p>
          </div>
        </div>

        <p
          id="del-task-desc"
          style={{ margin: 0, fontSize: '14px', color: '#e6edf3', lineHeight: 1.5 }}
        >
          Czy chcesz usunac to zadanie testowe? Wszystkie powiazane wyniki runow zostana utracone.
        </p>

        <div
          style={{
            background: '#13111c',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#8b8ba7',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          "{promptPreview}"
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              color: '#8b8ba7',
              fontSize: '13px',
              fontWeight: 600,
              padding: '10px',
              cursor: deleting ? 'not-allowed' : 'pointer',
            }}
          >
            Anuluj
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={deleting}
            style={{
              flex: 1,
              background: deleting ? '#2a2540' : '#ef4444',
              border: 'none',
              borderRadius: '8px',
              color: deleting ? '#6b7280' : '#fff',
              fontSize: '13px',
              fontWeight: 600,
              padding: '10px',
              cursor: deleting ? 'not-allowed' : 'pointer',
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Usuwanie...' : 'Usun task'}
          </button>
        </div>
      </div>
    </>
  )
}
