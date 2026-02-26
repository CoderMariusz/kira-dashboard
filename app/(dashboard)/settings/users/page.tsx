'use client'
/**
 * app/(dashboard)/settings/users/page.tsx
 * STORY-10.7 — /settings/users page
 * Tabela użytkowników, role dropdown, delete modal, invite modal.
 * Używa: useUsers() (STORY-10.5), shadcn Dialog, Zod walidacja.
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import { useUsers } from '@/hooks/useUsers'
import { useUser } from '@/contexts/RoleContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { UserWithRole } from '@/types/settings.types'
import type { Role } from '@/types/auth.types'

// ─── Zod schema ──────────────────────────────────────────────────────────────

const emailSchema = z.string().email('Nieprawidłowy adres email')

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'HELPER_PLUS', label: 'HELPER_PLUS' },
  { value: 'HELPER', label: 'HELPER' },
]

// ─── RoleBadge ───────────────────────────────────────────────────────────────

const ROLE_BADGE_STYLES: Record<Role, string> = {
  ADMIN:       'bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/40',
  HELPER_PLUS: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  HELPER:      'bg-slate-500/20 text-slate-400 border border-slate-500/40',
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      data-testid={`role-badge-${role}`}
      className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE_STYLES[role]}`}
    >
      {role}
    </span>
  )
}

// ─── RoleDropdown ─────────────────────────────────────────────────────────────

interface RoleDropdownProps {
  userId: string
  currentRole: Role
  onChangeRole: (userId: string, role: Role) => Promise<void>
}

function RoleDropdown({ userId, currentRole, onChangeRole }: RoleDropdownProps) {
  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role
    if (newRole === currentRole) return
    await onChangeRole(userId, newRole)
  }

  return (
    <select
      value={currentRole}
      onChange={handleChange}
      role="combobox"
      aria-label="Zmień rolę"
      className="bg-[#13111c] border border-[#3b3d7a] rounded px-2 py-1 text-xs text-[#e6edf3] outline-none cursor-pointer focus:border-[#818cf8]"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  )
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  user: UserWithRole
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmModal({ user, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="bg-[#1a1730] border border-[#3b3d7a] text-[#e6edf3] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e6edf3]">Usuń dostęp użytkownika</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-[#4b4569] py-2">
          Czy usunąć dostęp dla{' '}
          <strong className="text-[#e6edf3]">{user.email}</strong>? Konto Supabase
          pozostaje.
        </div>
        <DialogFooter className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#252246] hover:bg-[#2e2a5a] text-[#e6edf3] rounded-lg text-sm transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Usuń dostęp
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── InviteModal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void
  onInvite: (email: string, role: Role) => Promise<void>
}

function InviteModal({ onClose, onInvite }: InviteModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('HELPER')
  const [inviteError, setInviteError] = useState('')
  const [inviting, setInviting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError('')

    const result = emailSchema.safeParse(inviteEmail.trim())
    if (!result.success) {
      setInviteError(result.error.issues[0]?.message ?? 'Nieprawidłowy adres email')
      return
    }

    setInviting(true)
    try {
      await onInvite(inviteEmail.trim(), inviteRole)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd wysyłania zaproszenia'
      toast.error(msg)
    } finally {
      setInviting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-[#1a1730] border border-[#3b3d7a] text-[#e6edf3] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#e6edf3]">Zaproś użytkownika</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div>
            <label htmlFor="invite-email" className="block text-sm text-[#4b4569] mb-1">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }}
              placeholder="jan@example.com"
              className="w-full bg-[#13111c] border border-[#3b3d7a] rounded-lg px-3 py-2 text-[#e6edf3] text-sm focus:outline-none focus:border-[#818cf8]"
            />
            {inviteError && (
              <p className="text-red-400 text-xs mt-1" role="alert">
                {inviteError}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="invite-role" className="block text-sm text-[#4b4569] mb-1">
              Rola
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-full bg-[#13111c] border border-[#3b3d7a] rounded-lg px-3 py-2 text-[#e6edf3] text-sm focus:outline-none focus:border-[#818cf8]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#252246] text-[#e6edf3] rounded-lg text-sm hover:bg-[#2e2a5a] transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-[#818cf8] hover:bg-[#6366f1] text-white rounded-lg text-sm disabled:opacity-50 transition-colors"
            >
              {inviting ? 'Wysyłam...' : 'Wyślij zaproszenie'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── LoadingSkeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ładowanie użytkowników">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          data-testid="user-skeleton"
          className="animate-pulse h-14 bg-[#1a1730] rounded-lg mb-2"
        />
      ))}
    </div>
  )
}

// ─── Sub-nav ──────────────────────────────────────────────────────────────────

function SettingsSubNav() {
  const pathname = usePathname()

  const links = [
    { href: '/settings/users', label: 'Użytkownicy' },
    { href: '/settings/system', label: 'System' },
  ]

  return (
    <nav
      aria-label="Ustawienia nawigacja"
      className="flex gap-1 mb-8 border-b border-[#3b3d7a] pb-0"
    >
      {links.map((link) => {
        const isActive = pathname?.includes(link.href.replace('/settings/', ''))
        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              isActive
                ? 'border-[#818cf8] text-[#818cf8]'
                : 'border-transparent text-[#4b4569] hover:border-[#818cf8] hover:text-[#818cf8]',
            ].join(' ')}
            aria-current={isActive ? 'page' : undefined}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}

// ─── UsersTable ───────────────────────────────────────────────────────────────

interface UsersTableProps {
  users: UserWithRole[]
  currentUserId: string | null
  onRoleChange: (userId: string, role: Role) => Promise<void>
  onDeleteClick: (user: UserWithRole) => void
}

function UsersTable({ users, currentUserId, onRoleChange, onDeleteClick }: UsersTableProps) {
  function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div className="border border-[#3b3d7a] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table" aria-label="Lista użytkowników">
          <thead>
            <tr className="border-b border-[#3b3d7a] bg-[#1a1730] text-[#4b4569] text-left">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rola</th>
              <th className="px-4 py-3 font-medium">Data zaproszenia</th>
              <th className="px-4 py-3 font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isOwnRow = user.id === currentUserId
              return (
                <tr
                  key={user.id}
                  data-testid={`user-row-${user.id}`}
                  className="border-b border-[#3b3d7a]/40 last:border-0 hover:bg-[#1a1730]/50"
                >
                  {/* Email */}
                  <td className="px-4 py-3 text-[#e6edf3]">
                    {user.email}
                    {isOwnRow && (
                      <span className="ml-2 text-xs text-[#4b4569]">(Ty)</span>
                    )}
                  </td>

                  {/* Role — badge (own row) or dropdown (others) */}
                  <td className="px-4 py-3">
                    {isOwnRow ? (
                      <RoleBadge role={user.role} />
                    ) : (
                      <RoleDropdown
                        userId={user.id}
                        currentRole={user.role}
                        onChangeRole={onRoleChange}
                      />
                    )}
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 text-[#4b4569]">
                    {formatDate(user.invited_at)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {!isOwnRow && (
                      <button
                        onClick={() => onDeleteClick(user)}
                        className="text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded"
                        title={`Usuń dostęp ${user.email}`}
                        aria-label={`Usuń dostęp ${user.email}`}
                      >
                        🗑️ Usuń
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsersSettingsPage() {
  const { users, isLoading, error, updateRole, deleteUser, inviteUser, refresh } =
    useUsers()
  const { user: currentUser } = useUser()

  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null)
  const [showInvite, setShowInvite] = useState(false)

  // ── Role change (optimistic via hook) ────────────────────────────────────

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await updateRole(userId, newRole)
      toast.success('Rola zaktualizowana')
    } catch {
      toast.error('Nie udało się zmienić roli')
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteUser(target.id)
      toast.success(`Dostęp użytkownika ${target.email} usunięty`)
    } catch {
      toast.error('Nie udało się usunąć użytkownika')
    }
  }

  // ── Invite ───────────────────────────────────────────────────────────────

  const handleInvite = async (email: string, role: Role) => {
    await inviteUser({ email, role })
    toast.success(`Zaproszenie wysłane na ${email}`)
    void refresh()
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="text-[#e6edf3]">
      {/* Sub-nav */}
      <SettingsSubNav />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#e6edf3]">Użytkownicy</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-[#818cf8] hover:bg-[#6366f1] text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Zaproś
        </button>
      </div>

      {/* Loading state — 3 skeleton rows */}
      {isLoading && <LoadingSkeleton />}

      {/* Error state */}
      {!isLoading && error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400"
        >
          <p className="mb-2">Błąd ładowania użytkowników. Spróbuj ponownie.</p>
          <button
            onClick={() => void refresh()}
            className="text-sm underline hover:no-underline"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && users?.length === 0 && (
        <div className="text-center py-16 text-[#4b4569]">
          <div className="text-4xl mb-4" aria-hidden="true">
            👥
          </div>
          <p className="mb-2 text-lg font-medium text-[#4b4569]">Brak użytkowników.</p>
          <p className="mb-6 text-sm">Zaproś pierwszą osobę.</p>
          <button
            onClick={() => setShowInvite(true)}
            className="px-4 py-2 bg-[#818cf8] text-white rounded-lg text-sm hover:bg-[#6366f1] transition-colors"
          >
            + Zaproś użytkownika
          </button>
        </div>
      )}

      {/* Filled table */}
      {!isLoading && !error && users && users.length > 0 && (
        <UsersTable
          users={users}
          currentUserId={currentUser?.id ?? null}
          onRoleChange={handleRoleChange}
          onDeleteClick={setDeleteTarget}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Invite modal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={handleInvite}
        />
      )}
    </div>
  )
}
