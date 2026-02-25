'use client'

// components/pipeline/BulkActionBar.tsx
// Sticky bottom toolbar for bulk story operations — STORY-6.8
// Appears with slide-up animation when stories are selected.

import { useState, useRef, useEffect } from 'react'
import { AlertDialog } from 'radix-ui'
import type { BulkActionRequest, BulkAdvanceStatus, BulkAssignModel } from '@/types/pipeline-prd'

const MAX_BULK_STORIES = 20

// ─── Status / Model labels ────────────────────────────────────────────────────

const ADVANCE_OPTIONS: { value: BulkAdvanceStatus; label: string }[] = [
  { value: 'REVIEW',   label: 'Do Review' },
  { value: 'DONE',     label: 'Oznacz jako Done' },
  { value: 'MERGE',    label: 'Merge' },
  { value: 'REFACTOR', label: 'Do Refaktor' },
]

const MODEL_OPTIONS: { value: BulkAssignModel; label: string }[] = [
  { value: 'kimi',   label: 'Kimi K2.5' },
  { value: 'glm',    label: 'GLM-5' },
  { value: 'sonnet', label: 'Sonnet 4.6' },
  { value: 'codex',  label: 'Codex 5.3' },
  { value: 'haiku',  label: 'Haiku 4.5' },
  { value: 'opus',   label: 'Opus 4.6' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  disabled?: boolean
}

function DropdownMenu({ trigger, children, disabled }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          background: disabled ? '#1a1730' : '#2a2540',
          border: '1px solid #3b3d7a',
          borderRadius: '6px',
          padding: '5px 10px',
          color: disabled ? '#4b4569' : '#c9d1d9',
          fontSize: '11px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
        }}
      >
        {trigger}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: '6px',
            background: '#1a1730',
            border: '1px solid #2a2540',
            borderRadius: '8px',
            padding: '4px',
            minWidth: '150px',
            zIndex: 50,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
          }}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  )
}

interface DropdownItemProps {
  label: string
  onClick: () => void
}

function DropdownItem({ label, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderRadius: '5px',
        padding: '6px 10px',
        color: '#c9d1d9',
        fontSize: '11px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = '#2a2540'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface BulkActionBarProps {
  selectedIds: string[]
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkAction: (action: BulkActionRequest) => Promise<void>
  isLoading: boolean
}

export default function BulkActionBar({
  selectedIds,
  onSelectAll,
  onClearSelection,
  onBulkAction,
  isLoading,
}: BulkActionBarProps) {
  const count = selectedIds.length
  const overLimit = count > MAX_BULK_STORIES

  // AlertDialog state for advance confirmation
  const [pendingAdvance, setPendingAdvance] = useState<BulkAdvanceStatus | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (pendingAdvance && confirmRef.current) {
      confirmRef.current.focus()
    }
  }, [pendingAdvance])

  const handleAdvanceSelect = (status: BulkAdvanceStatus) => {
    setPendingAdvance(status)
  }

  const handleAdvanceConfirm = async () => {
    if (!pendingAdvance) return
    const status = pendingAdvance
    setPendingAdvance(null)
    await onBulkAction({
      story_ids: selectedIds,
      action: 'advance',
      payload: { status },
    })
  }

  const handleModelSelect = async (model: BulkAssignModel) => {
    await onBulkAction({
      story_ids: selectedIds,
      action: 'assign_model',
      payload: { model },
    })
  }

  return (
    <>
      {/* ── Confirmation AlertDialog ─── */}
      <AlertDialog.Root open={pendingAdvance !== null}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 100,
            }}
          />
          <AlertDialog.Content
            onEscapeKeyDown={() => setPendingAdvance(null)}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              background: '#1a1730',
              border: '1px solid #2a2540',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '440px',
              width: '90vw',
              zIndex: 101,
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}
          >
            <AlertDialog.Title
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: '#e6edf3',
                marginBottom: '8px',
              }}
            >
              Potwierdzenie masowej operacji
            </AlertDialog.Title>
            <AlertDialog.Description
              style={{ fontSize: '13px', color: '#8b949e', marginBottom: '20px' }}
            >
              Czy chcesz przesunąć{' '}
              <strong style={{ color: '#e6edf3' }}>{count}</strong>{' '}
              {count === 1 ? 'story' : 'stories'} do statusu{' '}
              <strong style={{ color: '#818cf8' }}>{pendingAdvance}</strong>?{' '}
              Tej operacji nie można cofnąć.
            </AlertDialog.Description>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  onClick={() => setPendingAdvance(null)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2a2540',
                    borderRadius: '7px',
                    padding: '7px 16px',
                    color: '#8b949e',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Anuluj
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  ref={confirmRef}
                  type="button"
                  onClick={handleAdvanceConfirm}
                  style={{
                    background: '#818cf8',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '7px 16px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Potwierdź
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* ── BulkActionBar ─────────────────── */}
      <div
        role="toolbar"
        aria-label={`Masowe operacje — ${count} zaznaczonych`}
        style={{
          position: 'sticky',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1a1730',
          borderTop: '1px solid #818cf8',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10,
          flexWrap: 'wrap',
          animation: 'bulkSlideUp 200ms ease forwards',
        }}
      >
        {/* Keyframe injection via style tag */}
        <style>{`
          @keyframes bulkSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Count badge */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: overLimit ? '#f87171' : '#818cf8',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          ☑ {count} zaznaczone{count === 1 ? '' : 'h'}
        </span>

        {/* EC-3: Over-limit warning */}
        {overLimit && (
          <span
            style={{
              fontSize: '11px',
              color: '#f87171',
              background: '#3a1a1a',
              borderRadius: '5px',
              padding: '3px 8px',
              whiteSpace: 'nowrap',
            }}
          >
            Max 20 stories na raz — odznacz kilka
          </span>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Loading state */}
        {isLoading && (
          <span style={{ fontSize: '11px', color: '#818cf8', whiteSpace: 'nowrap' }}>
            ⏳ Przetwarzanie {count} stories...
          </span>
        )}

        {/* Select All */}
        {!isLoading && (
          <button
            type="button"
            onClick={onSelectAll}
            style={{
              background: 'transparent',
              border: '1px solid #2a2540',
              borderRadius: '6px',
              padding: '4px 10px',
              color: '#8b949e',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Zaznacz wszystko
          </button>
        )}

        {/* Advance dropdown */}
        {!isLoading && (
          <DropdownMenu
            disabled={overLimit || isLoading}
            trigger={<>Advance <span style={{ fontSize: '8px' }}>▼</span></>}
          >
            {ADVANCE_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt.value}
                label={opt.label}
                onClick={() => handleAdvanceSelect(opt.value)}
              />
            ))}
          </DropdownMenu>
        )}

        {/* Assign Model dropdown */}
        {!isLoading && (
          <DropdownMenu
            disabled={overLimit || isLoading}
            trigger={<>Assign Model <span style={{ fontSize: '8px' }}>▼</span></>}
          >
            {MODEL_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt.value}
                label={opt.label}
                onClick={() => handleModelSelect(opt.value)}
              />
            ))}
          </DropdownMenu>
        )}

        {/* Clear / Close button */}
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isLoading}
          aria-label="Wyczyść selekcję"
          style={{
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 8px',
            color: '#4b4569',
            fontSize: '14px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    </>
  )
}
