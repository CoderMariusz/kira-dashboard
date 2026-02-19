'use client'
// components/home/overview/QuickActions.tsx
// AC-4 — 3 quick action buttons: Dodaj zadanie, Dodaj zakup, Zaproś osobę

import { useRouter } from 'next/navigation'
import type { Role } from '@/types/auth.types'

interface QuickActionsProps {
  userRole: Role | null
}

interface ActionButtonProps {
  label:     string
  onClick:   () => void
  primary?:  boolean
}

function ActionButton({ label, onClick, primary = false }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={
        primary
          ? {
              background: 'linear-gradient(135deg, #818cf8, #3b82f6)',
              color:      '#fff',
              boxShadow:  '0 2px 10px rgba(124,58,237,.3)',
              border:     'none',
              borderRadius: '8px',
              padding:    '8px 16px',
              fontSize:   '13px',
              fontWeight: 600,
              cursor:     'pointer',
              whiteSpace: 'nowrap',
            }
          : {
              background:   '#2a2540',
              border:       '1px solid #3b3d7a',
              color:        '#e6edf3',
              borderRadius: '8px',
              padding:      '8px 16px',
              fontSize:     '13px',
              fontWeight:   600,
              cursor:       'pointer',
              whiteSpace:   'nowrap',
            }
      }
      className="focus:outline-none focus:ring-2 focus:ring-[#818cf8] transition-opacity hover:opacity-90"
    >
      {label}
    </button>
  )
}

export function QuickActions({ userRole }: QuickActionsProps) {
  const router = useRouter()
  const canInvite = userRole === 'ADMIN' || userRole === 'HELPER_PLUS'

  return (
    <div
      style={{
        background:   '#1a1730',
        border:       '1px solid #2a2540',
        borderRadius: '10px',
        padding:      '16px',
      }}
    >
      <div
        style={{
          fontSize:      '10px',
          color:         '#4b4569',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom:  '10px',
          fontWeight:    600,
        }}
      >
        ⚡ Szybkie akcje
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="➕ Dodaj zadanie"
          onClick={() => router.push('/home/tasks')}
          primary
        />
        <ActionButton
          label="🛒 Dodaj zakup"
          onClick={() => router.push('/home/shopping')}
        />
        {canInvite && (
          <ActionButton
            label="👥 Zaproś osobę"
            onClick={() => router.push('/home/household')}
          />
        )}
      </div>
    </div>
  )
}
