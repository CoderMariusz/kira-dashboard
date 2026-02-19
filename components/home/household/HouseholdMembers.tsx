'use client'
// components/home/household/HouseholdMembers.tsx
// Lista członków household z avatarami, rolami i opcją usuwania
// STORY-4.7

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useHouseholdMembers, useDeleteMember } from '@/hooks/home/useHouseholdMembers'
import type { HouseholdMemberExtended, HouseholdRole } from '@/types/home'

// ─────────────────────────────────────────────────────────
// Avatar utils
// ─────────────────────────────────────────────────────────
function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
  }
  return displayName.slice(0, 2).toUpperCase()
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #ec4899, #f97316)',
  'linear-gradient(135deg, #a78bfa, #60a5fa)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #34d399, #06b6d4)',
]

function getAvatarGradient(userId: string): string {
  const charSum = userId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
  return AVATAR_GRADIENTS[charSum % AVATAR_GRADIENTS.length] ?? AVATAR_GRADIENTS[0]!
}

// ─────────────────────────────────────────────────────────
// Role badge
// ─────────────────────────────────────────────────────────
interface RoleBadgeProps {
  role: HouseholdRole
}

function RoleBadge({ role }: RoleBadgeProps) {
  if (role === 'ADMIN') {
    return (
      <span
        className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
        style={{ background: '#2d1b4a', color: '#c4b5fd' }}
      >
        ADMIN
      </span>
    )
  }
  if (role === 'HELPER+') {
    return (
      <span
        className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
        style={{ background: '#1a3a1a', color: '#4ade80' }}
      >
        HELPER+
      </span>
    )
  }
  return (
    <span
      className="text-[10px] font-semibold px-2 py-[2px] rounded-full"
      style={{ background: '#2a2540', color: '#6b7280' }}
    >
      HELPER
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────
function MemberSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="animate-pulse h-14 rounded-lg"
          style={{ background: '#2a2540' }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Confirm Delete Dialog
// ─────────────────────────────────────────────────────────
interface ConfirmDeleteDialogProps {
  memberName: string
  open: boolean
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDeleteDialog({
  memberName,
  open,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel() }}>
      <DialogContent
        className="border"
        style={{ background: '#1a1730', borderColor: '#2a2540', color: '#e6edf3' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#e6edf3' }}>Usuń członka household</DialogTitle>
          <DialogDescription style={{ color: '#6b7280' }}>
            Czy na pewno chcesz usunąć{' '}
            <span style={{ color: '#e6edf3', fontWeight: 600 }}>{memberName}</span>{' '}
            z household? Ta operacja jest nieodwracalna.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            style={{ background: '#2a2540', color: '#e6edf3' }}
          >
            Anuluj
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            style={{ background: '#dc2626', color: '#fff' }}
          >
            {isPending ? 'Usuwanie…' : 'Usuń'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// Member Row
// ─────────────────────────────────────────────────────────
interface MemberRowProps {
  member: HouseholdMemberExtended
  canDelete: boolean
  onDelete: (member: HouseholdMemberExtended) => void
}

function MemberRow({ member, canDelete, onDelete }: MemberRowProps) {
  return (
    <li
      className="flex items-center gap-3 p-3 rounded-lg border"
      style={{ borderColor: '#2a2540', background: '#13111c' }}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[13px] font-bold text-white"
        style={{ background: getAvatarGradient(member.user_id) }}
        aria-hidden="true"
      >
        {getInitials(member.display_name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500 }}>
          {member.display_name}
        </p>
        <p className="truncate" style={{ fontSize: '11px', color: '#6b7280' }}>
          {member.email}
        </p>
      </div>

      {/* Role badge */}
      <RoleBadge role={member.role} />

      {/* Delete button — tylko dla ADMIN, nie dla własnego wiersza */}
      {canDelete && (
        <button
          onClick={() => onDelete(member)}
          className="ml-1 p-1 rounded opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: '#f85149' }}
          aria-label={`Usuń ${member.display_name} z household`}
          title={`Usuń ${member.display_name}`}
        >
          {/* Trash icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      )}
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────
interface HouseholdMembersProps {
  currentUserId: string
  currentUserRole: string   // Auth role: 'ADMIN' | 'HELPER_PLUS' | 'HELPER'
}

export function HouseholdMembers({ currentUserId, currentUserRole }: HouseholdMembersProps) {
  const { members, loading, error, refetch } = useHouseholdMembers()
  const [confirmMember, setConfirmMember] = useState<HouseholdMemberExtended | null>(null)

  const { deleteMember, isPending: isDeleting } = useDeleteMember({
    onSuccess: () => {
      const name = confirmMember?.display_name ?? 'Członek'
      toast.success(`${name} została/został usunięta/y z household`, {
        duration: 3000,
        style: { background: '#1a3a1a', border: '1px solid #2a5a2a', color: '#4ade80' },
      })
      setConfirmMember(null)
      refetch()
    },
    onError: (msg) => {
      toast.error(msg, {
        duration: 5000,
        style: { background: '#3a1a1a', border: '1px solid #5a2a2a', color: '#f87171' },
      })
      setConfirmMember(null)
    },
  })

  const handleDeleteClick = useCallback((member: HouseholdMemberExtended) => {
    setConfirmMember(member)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmMember) return
    await deleteMember(confirmMember.id)
  }, [confirmMember, deleteMember])

  const handleCancelDelete = useCallback(() => {
    setConfirmMember(null)
  }, [])

  if (loading) return <MemberSkeleton />

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-[12px] mb-3" style={{ color: '#f85149' }}>
          Nie udało się załadować członków. Spróbuj ponownie.
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

  if (members.length === 0) {
    return (
      <p className="text-[12px] py-4" style={{ color: '#4b4569' }}>
        Brak członków household. Wyślij zaproszenie poniżej.
      </p>
    )
  }

  const isAdmin = currentUserRole === 'ADMIN'

  return (
    <>
      <ul className="space-y-2" role="list" aria-label="Lista członków household">
        {members.map(member => (
          <MemberRow
            key={member.id}
            member={member}
            canDelete={isAdmin && member.user_id !== currentUserId}
            onDelete={handleDeleteClick}
          />
        ))}
      </ul>

      <ConfirmDeleteDialog
        memberName={confirmMember?.display_name ?? ''}
        open={confirmMember !== null}
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  )
}
