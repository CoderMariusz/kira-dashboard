'use client'
// components/home/household/PendingInvites.tsx
// Lista oczekujących zaproszeń z opcją anulowania
// STORY-4.7

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useInvites, useRevokeInvite } from '@/hooks/home/useInvites'
import type { HouseholdInvite } from '@/types/home'

// ─────────────────────────────────────────────────────────
// Formatowanie czasu po polsku
// ─────────────────────────────────────────────────────────
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now  = new Date()
  const diffMs   = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHrs  = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1)   return 'przed chwilą'
  if (diffMins < 60)  return `${diffMins} ${diffMins === 1 ? 'minutę' : diffMins < 5 ? 'minuty' : 'minut'} temu`
  if (diffHrs  < 24)  return `${diffHrs} ${diffHrs === 1 ? 'godzinę' : diffHrs < 5 ? 'godziny' : 'godzin'} temu`
  if (diffDays === 1) return 'wczoraj'
  return `${diffDays} ${diffDays < 5 ? 'dni' : 'dni'} temu`
}

function formatExpiry(dateString: string): string {
  const date    = new Date(dateString)
  const now     = new Date()
  const diffMs  = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0)  return 'Wygasło'
  if (diffDays === 1) return 'Wygasa za 1 dzień'
  return `Wygasa za ${diffDays} dni`
}

// ─────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────
function InvitesSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map(i => (
        <div
          key={i}
          className="animate-pulse h-12 rounded-lg"
          style={{ background: '#2a2540' }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Invite Row
// ─────────────────────────────────────────────────────────
interface InviteRowProps {
  invite: HouseholdInvite
  onRevoke: (id: string) => void
  isRevoking: boolean
}

function InviteRow({ invite, onRevoke, isRevoking }: InviteRowProps) {
  return (
    <li
      className="flex items-center gap-3 px-3 py-2 rounded-lg border"
      style={{ borderColor: '#2a2540', background: '#13111c' }}
    >
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: '12px', color: '#e6edf3', fontWeight: 500 }}>
          {invite.email}
        </p>
        <p style={{ fontSize: '10px', color: '#6b7280' }}>
          {formatTimeAgo(invite.created_at)} · {formatExpiry(invite.expires_at)}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRevoke(invite.id)}
        disabled={isRevoking}
        style={{ fontSize: '11px', color: '#6b7280' }}
      >
        {isRevoking ? 'Anulowanie…' : 'Anuluj'}
      </Button>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────
interface PendingInvitesProps {
  refreshKey?: number   // inkrementacja powoduje odświeżenie listy
}

export function PendingInvites({ refreshKey }: PendingInvitesProps) {
  const { invites, loading, error, refetch } = useInvites()

  // Odśwież gdy InviteForm wysłał zaproszenie (refreshKey się zmienił)
  const prevRefreshKey = useRef(refreshKey)
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey !== prevRefreshKey.current) {
      prevRefreshKey.current = refreshKey
      refetch()
    }
  }, [refreshKey, refetch])

  const { revokeInvite, isPending: isRevoking, pendingId } = useRevokeInvite({
    onSuccess: () => {
      toast.success('Zaproszenie anulowane', {
        duration: 3000,
        style: { background: '#1a1730', border: '1px solid #2a2540', color: '#6b7280' },
      })
      refetch()
    },
    onError: (msg) => {
      toast.error(msg, {
        duration: 5000,
        style: { background: '#3a1a1a', border: '1px solid #5a2a2a', color: '#f87171' },
      })
    },
  })

  if (loading) return <InvitesSkeleton />

  if (error) {
    return (
      <div className="text-center py-4">
        <p className="text-[12px] mb-2" style={{ color: '#f85149' }}>
          Nie udało się załadować zaproszeń. Spróbuj ponownie.
        </p>
        <Button
          size="sm"
          onClick={refetch}
          style={{ background: '#2a2540', color: '#e6edf3' }}
        >
          Odśwież
        </Button>
      </div>
    )
  }

  if (invites.length === 0) {
    return (
      <p className="text-[12px] py-3" style={{ color: '#4b4569' }}>
        Brak oczekujących zaproszeń
      </p>
    )
  }

  return (
    <ul className="space-y-2" role="list" aria-label="Lista oczekujących zaproszeń">
      {invites.map(invite => (
        <InviteRow
          key={invite.id}
          invite={invite}
          onRevoke={id => void revokeInvite(id)}
          isRevoking={isRevoking && pendingId === invite.id}
        />
      ))}
    </ul>
  )
}
