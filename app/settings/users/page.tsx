'use client'

import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'
import { useUsers } from '@/hooks/useUsers'
import { useUser } from '@/contexts/RoleContext'
import type { UserWithRole } from '@/types/settings.types'
import type { Role } from '@/types/auth.types'

// ─── Zod email schema ─────────────────────────────────────────────────────────

const emailSchema = z.string().email('Nieprawidłowy adres email')

// ─── Role badge styles ────────────────────────────────────────────────────────

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-[#818cf8]/20 text-[#818cf8] border border-[#818cf8]/40',
  HELPER_PLUS: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
  HELPER: 'bg-slate-500/20 text-slate-400 border border-slate-500/40',
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      data-testid={`role-badge-${role}`}
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_STYLES[role]}`}
    >
      {role}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersSettingsPage() {
  const { users, isLoading, error, updateRole, deleteUser, inviteUser, refresh } = useUsers()
  const { user: currentUser } = useUser()
  const currentUserId = currentUser?.id

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserWithRole | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('HELPER')
  const [inviteError, setInviteError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)

  // ── handlers ─────────────────────────────────────────────────────────────

  async function handleUpdateRole(userId: string, role: Role) {
    try {
      await updateRole(userId, role)
      toast.success('Rola zaktualizowana')
    } catch {
      toast.error('Błąd zmiany roli')
    }
  }

  async function handleDelete(userId: string) {
    setDeleteLoading(true)
    try {
      await deleteUser(userId)
      setDeleteTarget(null)
      toast.success('Dostęp usunięty')
    } catch {
      toast.error('Błąd usuwania dostępu')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')

    // Zod email validation
    const result = emailSchema.safeParse(inviteEmail)
    if (!result.success) {
      setInviteError(result.error.issues[0]?.message ?? 'Nieprawidłowy adres email')
      return
    }

    setInviteLoading(true)
    try {
      await inviteUser({ email: inviteEmail, role: inviteRole })
      toast.success(`Zaproszenie wysłane na ${inviteEmail}`)
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('HELPER')
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Błąd wysyłania zaproszenia'
      setInviteError(message)
    } finally {
      setInviteLoading(false)
    }
  }

  function openInviteModal() {
    setInviteEmail('')
    setInviteRole('HELPER')
    setInviteError('')
    setShowInviteModal(true)
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0d0c1a] text-[#e6edf3]">

      {/* Sub-nav */}
      <div className="border-b border-[#3b3d7a] px-6 py-3 flex gap-4 text-sm">
        <a
          href="/settings/users"
          className="text-[#818cf8] border-b-2 border-[#818cf8] pb-1 font-medium"
        >
          Użytkownicy
        </a>
        <a
          href="/settings/system"
          className="text-[#4b4569] hover:text-[#e6edf3] transition-colors pb-1"
        >
          System
        </a>
      </div>

      <div className="p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-semibold">Użytkownicy</h1>
          <button
            onClick={openInviteModal}
            className="px-4 py-2 bg-[#818cf8] text-white rounded-lg text-sm font-medium hover:bg-[#6366f1] transition-colors"
          >
            + Zaproś
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                data-testid="user-skeleton"
                aria-busy="true"
                className="h-14 bg-[#1a1730] rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div
            role="alert"
            className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm"
          >
            Błąd ładowania użytkowników.{' '}
            <button
              onClick={() => void refresh()}
              className="underline hover:no-underline"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && users !== undefined && users.length === 0 && (
          <div className="text-center py-16 text-[#4b4569]">
            <p className="text-4xl mb-4">👥</p>
            <p className="mb-4 text-base">Brak użytkowników. Zaproś pierwszą osobę.</p>
            <button
              onClick={openInviteModal}
              className="px-4 py-2 bg-[#818cf8] text-white rounded-lg text-sm font-medium hover:bg-[#6366f1] transition-colors"
            >
              + Zaproś
            </button>
          </div>
        )}

        {/* Users table */}
        {!isLoading && !error && users !== undefined && users.length > 0 && !deleteTarget && (
          <div className="overflow-x-auto rounded-lg border border-[#1a1730]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#3b3d7a] text-[#4b4569] text-left bg-[#1a1730]/50">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rola</th>
                  <th className="px-4 py-3 font-medium">Data dołączenia</th>
                  <th className="px-4 py-3 font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isOwnRow = currentUserId === user.id
                  return (
                    <tr
                      key={user.id}
                      data-testid={`user-row-${user.id}`}
                      className="border-b border-[#1a1730] hover:bg-[#1a1730]/50 transition-colors last:border-b-0"
                    >
                      {/* Email */}
                      <td className="px-4 py-3 text-[#e6edf3]">{user.email}</td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        {isOwnRow ? (
                          /* Own row: badge only, no dropdown */
                          <RoleBadge role={user.role} />
                        ) : (
                          /* Other rows: badge + dropdown */
                          <div className="flex items-center gap-2">
                            <RoleBadge role={user.role} />
                            <select
                              value={user.role}
                              onChange={e => handleUpdateRole(user.id, e.target.value as Role)}
                              role="combobox"
                              aria-label="Zmień rolę"
                              className="bg-[#1a1730] border border-[#3b3d7a] rounded px-2 py-1 text-xs text-[#e6edf3] hover:border-[#818cf8] focus:border-[#818cf8] outline-none cursor-pointer transition-colors"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="HELPER_PLUS">HELPER_PLUS</option>
                              <option value="HELPER">HELPER</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Joined date */}
                      <td className="px-4 py-3 text-[#4b4569]">
                        {new Date(user.invited_at).toLocaleDateString('pl-PL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions — no delete for self */}
                      <td className="px-4 py-3">
                        {!isOwnRow && (
                          <button
                            onClick={() => setDeleteTarget(user)}
                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-400/10 transition-colors text-xs"
                            aria-label={`Usuń ${user.email}`}
                          >
                            🗑 Usuń
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Delete confirm modal ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
        >
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Usuń dostęp użytkownika</h2>
            <p className="text-[#4b4569] text-sm mb-6 leading-relaxed">
              Czy usunąć dostęp dla{' '}
              <strong className="text-[#e6edf3]">{deleteTarget.email}</strong>?{' '}
              Konto Supabase pozostaje.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-[#252246] rounded-lg text-sm hover:bg-[#2d2858] transition-colors disabled:opacity-50"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteLoading ? (
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : null}
                Usuń dostęp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Invite modal ─────────────────────────────────────────────────── */}
      {showInviteModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowInviteModal(false) }}
        >
          <div className="bg-[#1a1730] border border-[#3b3d7a] rounded-xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Zaproś użytkownika</h2>
            <form onSubmit={handleInvite} className="space-y-4">

              <div>
                <label htmlFor="invite-email" className="block text-sm text-[#4b4569] mb-1.5">
                  Email
                </label>
                <input
                  id="invite-email"
                  type="text"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={inviteLoading}
                  className="w-full bg-[#0d0c1a] border border-[#3b3d7a] rounded-lg px-3 py-2 text-sm text-[#e6edf3] placeholder-[#4b4569] focus:border-[#818cf8] outline-none transition-colors disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="block text-sm text-[#4b4569] mb-1.5">
                  Rola
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as Role)}
                  disabled={inviteLoading}
                  className="w-full bg-[#0d0c1a] border border-[#3b3d7a] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:border-[#818cf8] outline-none transition-colors disabled:opacity-50"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="HELPER_PLUS">HELPER_PLUS</option>
                  <option value="HELPER">HELPER</option>
                </select>
              </div>

              {inviteError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {inviteError}
                </p>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviteLoading}
                  className="px-4 py-2 bg-[#252246] rounded-lg text-sm hover:bg-[#2d2858] transition-colors disabled:opacity-50"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 bg-[#818cf8] text-white rounded-lg text-sm font-medium hover:bg-[#6366f1] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {inviteLoading ? (
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : null}
                  Wyślij zaproszenie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
