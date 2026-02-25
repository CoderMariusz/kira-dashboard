/**
 * __tests__/hooks/useUsers.test.tsx
 * STORY-10.5 — Unit tests for useUsers hook
 *
 * Test matrix:
 *  TC-1  initial loading state
 *  TC-2  happy path — users loaded via SWR
 *  TC-3  error state — SWR error
 *  TC-4  refresh — calls mutate
 *  TC-5  updateRole — optimistic update + success
 *  TC-6  updateRole — optimistic rollback on error
 *  TC-7  deleteUser — optimistic remove + success
 *  TC-8  deleteUser — optimistic rollback on error
 *  TC-9  inviteUser — calls inviteUser + mutates on success
 * TC-10  inviteUser — throws on error, does not mutate
 */

import { jest } from '@jest/globals'
import { renderHook, waitFor, act } from '@testing-library/react'
import { SWRConfig } from 'swr'
import React from 'react'
import type { UserWithRole } from '@/types/settings.types'

// ─── Mock UserService ─────────────────────────────────────────────────────────

const mockGetAll = jest.fn<Promise<UserWithRole[]>, []>()
const mockUpdateRole = jest.fn<Promise<UserWithRole>, [string, import('@/types/auth.types').Role]>()
const mockDeleteUser = jest.fn<Promise<void>, [string]>()
const mockInviteUser = jest.fn<Promise<{ message: string }>, [import('@/types/settings.types').InviteUserRequest]>()

jest.mock('@/services/user.service', () => ({
  UserService: {
    getAll: () => mockGetAll(),
    updateRole: (userId: string, role: import('@/types/auth.types').Role) =>
      mockUpdateRole(userId, role),
    deleteUser: (userId: string) => mockDeleteUser(userId),
    inviteUser: (data: import('@/types/settings.types').InviteUserRequest) =>
      mockInviteUser(data),
  },
}))

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { useUsers } from '@/hooks/useUsers'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_USERS: UserWithRole[] = [
  {
    id: 'user-uuid-1',
    email: 'admin@kira.local',
    role: 'ADMIN',
    invited_at: '2026-02-01T10:00:00Z',
    invited_by_email: null,
  },
  {
    id: 'user-uuid-2',
    email: 'helper@kira.local',
    role: 'HELPER',
    invited_at: '2026-02-10T12:00:00Z',
    invited_by_email: 'admin@kira.local',
  },
]

// ─── SWR wrapper (isolated cache per test) ───────────────────────────────────

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
        {children}
      </SWRConfig>
    )
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUsers()', () => {
  beforeEach(() => {
    mockGetAll.mockClear()
    mockUpdateRole.mockClear()
    mockDeleteUser.mockClear()
    mockInviteUser.mockClear()
  })

  it('TC-1: returns isLoading=true initially', () => {
    mockGetAll.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.users).toBeUndefined()
  })

  it('TC-2: happy path — users loaded', async () => {
    mockGetAll.mockResolvedValueOnce(MOCK_USERS)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.users).toHaveLength(2)
    expect(result.current.users?.[0].email).toBe('admin@kira.local')
    expect(result.current.error).toBeUndefined()
  })

  it('TC-3: error state — SWR propagates error', async () => {
    const err = new Error('Błąd serwera — spróbuj ponownie')
    mockGetAll.mockRejectedValueOnce(err)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeDefined()
    expect(result.current.users).toBeUndefined()
  })

  it('TC-4: refresh() re-fetches', async () => {
    mockGetAll
      .mockResolvedValueOnce(MOCK_USERS)
      .mockResolvedValueOnce([MOCK_USERS[0]])

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockGetAll).toHaveBeenCalledTimes(2)
  })

  it('TC-5: updateRole — optimistic update applied, then confirmed', async () => {
    mockGetAll.mockResolvedValueOnce([...MOCK_USERS])
    const updatedUser: UserWithRole = { ...MOCK_USERS[1], role: 'HELPER_PLUS' }
    mockUpdateRole.mockResolvedValueOnce(updatedUser)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.updateRole('user-uuid-2', 'HELPER_PLUS')
    })

    expect(mockUpdateRole).toHaveBeenCalledWith('user-uuid-2', 'HELPER_PLUS')
    const found = result.current.users?.find((u) => u.id === 'user-uuid-2')
    expect(found?.role).toBe('HELPER_PLUS')
  })

  it('TC-6: updateRole — rollback on error', async () => {
    mockGetAll.mockResolvedValueOnce([...MOCK_USERS])
    mockUpdateRole.mockRejectedValueOnce(new Error('Nie masz uprawnień do tej operacji'))

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.updateRole('user-uuid-2', 'ADMIN')
      })
    ).rejects.toThrow('Nie masz uprawnień do tej operacji')

    // role should be rolled back to original
    const found = result.current.users?.find((u) => u.id === 'user-uuid-2')
    expect(found?.role).toBe('HELPER')
  })

  it('TC-7: deleteUser — optimistic remove, then confirmed', async () => {
    mockGetAll.mockResolvedValueOnce([...MOCK_USERS])
    mockDeleteUser.mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.deleteUser('user-uuid-2')
    })

    expect(mockDeleteUser).toHaveBeenCalledWith('user-uuid-2')
    const found = result.current.users?.find((u) => u.id === 'user-uuid-2')
    expect(found).toBeUndefined()
  })

  it('TC-8: deleteUser — rollback on error', async () => {
    mockGetAll.mockResolvedValueOnce([...MOCK_USERS])
    mockDeleteUser.mockRejectedValueOnce(new Error('Użytkownik nie istnieje'))

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.deleteUser('user-uuid-2')
      })
    ).rejects.toThrow('Użytkownik nie istnieje')

    // user should be rolled back
    const found = result.current.users?.find((u) => u.id === 'user-uuid-2')
    expect(found).toBeDefined()
    expect(found?.email).toBe('helper@kira.local')
  })

  it('TC-9: inviteUser — success triggers revalidation', async () => {
    mockGetAll
      .mockResolvedValueOnce([...MOCK_USERS])
      .mockResolvedValueOnce([
        ...MOCK_USERS,
        {
          id: 'user-uuid-3',
          email: 'new@kira.local',
          role: 'HELPER' as const,
          invited_at: '2026-02-25T10:00:00Z',
          invited_by_email: 'admin@kira.local',
        },
      ])
    mockInviteUser.mockResolvedValueOnce({ message: 'Zaproszenie wysłane' })

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.inviteUser({ email: 'new@kira.local', role: 'HELPER' })
    })

    expect(mockInviteUser).toHaveBeenCalledWith({
      email: 'new@kira.local',
      role: 'HELPER',
    })
    // After revalidation, 3 users
    await waitFor(() => expect(result.current.users).toHaveLength(3))
  })

  it('TC-10: inviteUser — throws on error, no extra mutate', async () => {
    mockGetAll.mockResolvedValueOnce([...MOCK_USERS])
    mockInviteUser.mockRejectedValueOnce(
      new Error('Użytkownik z tym adresem już istnieje')
    )

    const { result } = renderHook(() => useUsers(), { wrapper: createWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(
      act(async () => {
        await result.current.inviteUser({ email: 'admin@kira.local', role: 'HELPER' })
      })
    ).rejects.toThrow('Użytkownik z tym adresem już istnieje')

    // users unchanged (still 2)
    expect(result.current.users).toHaveLength(2)
  })
})
