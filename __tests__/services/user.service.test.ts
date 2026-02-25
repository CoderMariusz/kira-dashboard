/**
 * __tests__/services/user.service.test.ts
 * STORY-10.5 — Unit tests for UserService
 *
 * Test matrix:
 *  TC-1  getAll — happy path returns UserWithRole[]
 *  TC-2  getAll — 403 throws Polish error
 *  TC-3  getAll — 500 throws Polish error
 *  TC-4  getAll — network error throws error
 *  TC-5  updateRole — happy path returns updated UserWithRole
 *  TC-6  updateRole — 400 throws Polish error
 *  TC-7  updateRole — 403 throws Polish error
 *  TC-8  updateRole — 404 throws Polish error
 *  TC-9  deleteUser — happy path resolves void
 * TC-10  deleteUser — 404 throws Polish error
 * TC-11  deleteUser — 403 throws Polish error
 * TC-12  inviteUser — happy path returns { message }
 * TC-13  inviteUser — 409 throws Polish error
 * TC-14  inviteUser — 400 throws Polish error
 * TC-15  inviteUser — 500 throws Polish error
 */

import { jest } from '@jest/globals'
import type { UserWithRole } from '@/types/settings.types'

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
global.fetch = mockFetch as typeof fetch

// ─── Import SUT ───────────────────────────────────────────────────────────────

import { UserService } from '@/services/user.service'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const MOCK_USER: UserWithRole = {
  id: 'user-uuid-1',
  email: 'admin@kira.local',
  role: 'ADMIN',
  invited_at: '2026-02-01T10:00:00Z',
  invited_by_email: null,
}

const MOCK_USER_2: UserWithRole = {
  id: 'user-uuid-2',
  email: 'helper@kira.local',
  role: 'HELPER',
  invited_at: '2026-02-10T12:00:00Z',
  invited_by_email: 'admin@kira.local',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserService', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  // ── getAll ─────────────────────────────────────────────────────────────────

  describe('getAll()', () => {
    it('TC-1: returns UserWithRole[] on 200', async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse(200, { users: [MOCK_USER, MOCK_USER_2] })
      )

      const result = await UserService.getAll()

      expect(mockFetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({
        method: 'GET',
      }))
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 'user-uuid-1', email: 'admin@kira.local', role: 'ADMIN' })
    })

    it('TC-2: 403 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(403, { error: 'forbidden' }))

      await expect(UserService.getAll()).rejects.toThrow(
        'Nie masz uprawnień do tej operacji'
      )
    })

    it('TC-3: 500 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(500, { error: 'server error' }))

      await expect(UserService.getAll()).rejects.toThrow(
        'Błąd serwera — spróbuj ponownie'
      )
    })

    it('TC-4: network error throws error', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(UserService.getAll()).rejects.toThrow()
    })
  })

  // ── updateRole ──────────────────────────────────────────────────────────────

  describe('updateRole()', () => {
    it('TC-5: happy path returns updated UserWithRole', async () => {
      const updated = { ...MOCK_USER_2, role: 'HELPER_PLUS' as const }
      mockFetch.mockResolvedValueOnce(makeResponse(200, { user: updated }))

      const result = await UserService.updateRole('user-uuid-2', 'HELPER_PLUS')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/user-uuid-2/role',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ role: 'HELPER_PLUS' }),
        })
      )
      expect(result.role).toBe('HELPER_PLUS')
    })

    it('TC-6: 400 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(400, { error: 'bad request' }))

      await expect(UserService.updateRole('user-uuid-2', 'HELPER')).rejects.toThrow(
        'Nieprawidłowe dane — sprawdź formularz'
      )
    })

    it('TC-7: 403 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(403, { error: 'forbidden' }))

      await expect(UserService.updateRole('user-uuid-2', 'HELPER')).rejects.toThrow(
        'Nie masz uprawnień do tej operacji'
      )
    })

    it('TC-8: 404 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'not found' }))

      await expect(UserService.updateRole('nonexistent-id', 'HELPER')).rejects.toThrow(
        'Użytkownik nie istnieje'
      )
    })
  })

  // ── deleteUser ──────────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('TC-9: happy path resolves void', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(204, null))

      await expect(UserService.deleteUser('user-uuid-2')).resolves.toBeUndefined()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/user-uuid-2',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('TC-10: 404 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(404, { error: 'not found' }))

      await expect(UserService.deleteUser('nonexistent-id')).rejects.toThrow(
        'Użytkownik nie istnieje'
      )
    })

    it('TC-11: 403 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(403, { error: 'forbidden' }))

      await expect(UserService.deleteUser('user-uuid-2')).rejects.toThrow(
        'Nie masz uprawnień do tej operacji'
      )
    })
  })

  // ── inviteUser ──────────────────────────────────────────────────────────────

  describe('inviteUser()', () => {
    it('TC-12: happy path returns { message }', async () => {
      mockFetch.mockResolvedValueOnce(
        makeResponse(200, { message: 'Zaproszenie wysłane' })
      )

      const result = await UserService.inviteUser({
        email: 'new@kira.local',
        role: 'HELPER',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/users/invite',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ email: 'new@kira.local', role: 'HELPER' }),
        })
      )
      expect(result.message).toBe('Zaproszenie wysłane')
    })

    it('TC-13: 409 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(409, { error: 'conflict' }))

      await expect(
        UserService.inviteUser({ email: 'existing@kira.local', role: 'HELPER' })
      ).rejects.toThrow('Użytkownik z tym adresem już istnieje')
    })

    it('TC-14: 400 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(400, { error: 'bad request' }))

      await expect(
        UserService.inviteUser({ email: 'bad', role: 'HELPER' })
      ).rejects.toThrow('Nieprawidłowe dane — sprawdź formularz')
    })

    it('TC-15: 500 throws Polish error', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(500, { error: 'server error' }))

      await expect(
        UserService.inviteUser({ email: 'new@kira.local', role: 'HELPER' })
      ).rejects.toThrow('Błąd serwera — spróbuj ponownie')
    })
  })
})
