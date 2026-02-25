'use client'
// hooks/useUsers.ts
// STORY-10.5 — SWR hook for user management (list, updateRole, deleteUser, inviteUser).

import useSWR from 'swr'
import { UserService } from '@/services/user.service'
import type { Role } from '@/types/auth.types'
import type { UserWithRole, InviteUserRequest } from '@/types/settings.types'

// ─── SWR key ─────────────────────────────────────────────────────────────────

const USERS_KEY = '/api/users'

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetcher(): Promise<UserWithRole[]> {
  return UserService.getAll()
}

// ─── Return type ─────────────────────────────────────────────────────────────

export interface UseUsersReturn {
  /** List of users with roles. Undefined while loading or on error. */
  users: UserWithRole[] | undefined
  /** True while the initial fetch is in progress. */
  isLoading: boolean
  /** Error thrown by the fetcher, if any. */
  error: Error | undefined
  /** Manually trigger a re-fetch of the user list. */
  refresh: () => Promise<UserWithRole[] | undefined>
  /**
   * Update a user's role with optimistic update.
   * Rolls back to the previous data if the API call fails.
   */
  updateRole: (userId: string, role: Role) => Promise<void>
  /**
   * Delete a user with optimistic removal.
   * Rolls back to the previous data if the API call fails.
   */
  deleteUser: (userId: string) => Promise<void>
  /**
   * Invite a new user. Triggers revalidation on success.
   * Throws on error — caller is responsible for handling.
   */
  inviteUser: (data: InviteUserRequest) => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUsers(): UseUsersReturn {
  const { data, error, isLoading, mutate } = useSWR<UserWithRole[], Error>(
    USERS_KEY,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
    }
  )

  // ── refresh ───────────────────────────────────────────────────────────────

  async function refresh(): Promise<UserWithRole[] | undefined> {
    return mutate()
  }

  // ── updateRole ────────────────────────────────────────────────────────────

  async function updateRole(userId: string, role: Role): Promise<void> {
    // Snapshot for rollback (deep copy to avoid reference mutations)
    const previous = data ? [...data] : undefined

    // Optimistic update
    await mutate(
      (current) =>
        current
          ? current.map((u) => (u.id === userId ? { ...u, role } : u))
          : current,
      false
    )

    try {
      await UserService.updateRole(userId, role)
    } catch (err) {
      // Rollback to snapshot — do NOT revalidate (would cause extra fetch)
      await mutate(previous, false)
      throw err
    }
  }

  // ── deleteUser ────────────────────────────────────────────────────────────

  async function deleteUser(userId: string): Promise<void> {
    // Snapshot for rollback (deep copy to avoid reference mutations)
    const previous = data ? [...data] : undefined

    // Optimistic update
    await mutate(
      (current) =>
        current ? current.filter((u) => u.id !== userId) : current,
      false
    )

    try {
      await UserService.deleteUser(userId)
    } catch (err) {
      // Rollback to snapshot — do NOT revalidate (would cause extra fetch)
      await mutate(previous, false)
      throw err
    }
  }

  // ── inviteUser ────────────────────────────────────────────────────────────

  async function inviteUser(data: InviteUserRequest): Promise<void> {
    await UserService.inviteUser(data)
    // Revalidate after successful invite
    await mutate()
  }

  return {
    users: data,
    isLoading,
    error,
    refresh,
    updateRole,
    deleteUser,
    inviteUser,
  }
}
