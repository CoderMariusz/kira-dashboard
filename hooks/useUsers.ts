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
    // Deep-copy snapshot for rollback before any optimistic changes
    const previous = data ? data.map((u) => ({ ...u })) : undefined

    // Optimistic update — set new data without revalidating
    const optimistic = previous
      ? previous.map((u) => (u.id === userId ? { ...u, role } : u))
      : undefined
    mutate(optimistic, { revalidate: false })

    try {
      await UserService.updateRole(userId, role)
    } catch (err) {
      // Rollback to snapshot — no revalidate to avoid extra fetch
      mutate(previous, { revalidate: false })
      throw err
    }
  }

  // ── deleteUser ────────────────────────────────────────────────────────────

  async function deleteUser(userId: string): Promise<void> {
    // Deep-copy snapshot for rollback before any optimistic changes
    const previous = data ? data.map((u) => ({ ...u })) : undefined

    // Optimistic update — remove user without revalidating
    const optimistic = previous ? previous.filter((u) => u.id !== userId) : undefined
    mutate(optimistic, { revalidate: false })

    try {
      await UserService.deleteUser(userId)
    } catch (err) {
      // Rollback to snapshot — no revalidate to avoid extra fetch
      mutate(previous, { revalidate: false })
      throw err
    }
  }

  // ── inviteUser ────────────────────────────────────────────────────────────

  async function inviteUser(inviteData: InviteUserRequest): Promise<void> {
    await UserService.inviteUser(inviteData)
    // Revalidate after successful invite to get fresh server data
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
