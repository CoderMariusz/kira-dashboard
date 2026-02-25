// services/user.service.ts
// STORY-10.5 — Fetch wrappers for /api/users endpoints.
// All errors are thrown as Error objects with Polish user-facing messages.

import type { Role } from '@/types/auth.types'
import type {
  UserWithRole,
  InviteUserRequest,
  UsersListResponse,
} from '@/types/settings.types'

// ─── Error messages (po polsku) ───────────────────────────────────────────────

const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Nieprawidłowe dane — sprawdź formularz',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Użytkownik nie istnieje',
  409: 'Użytkownik z tym adresem już istnieje',
  500: 'Błąd serwera — spróbuj ponownie',
}

function buildHttpError(status: number): Error {
  const message = HTTP_ERROR_MESSAGES[status] ?? 'Błąd serwera — spróbuj ponownie'
  return new Error(message)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const UserService = {
  /**
   * GET /api/users
   * Returns the full list of users with their roles.
   */
  async getAll(): Promise<UserWithRole[]> {
    const response = await fetch('/api/users', { method: 'GET' })

    if (!response.ok) {
      throw buildHttpError(response.status)
    }

    const data = (await response.json()) as UsersListResponse
    return data.users
  },

  /**
   * PATCH /api/users/[id]/role
   * Updates the role of a specific user.
   */
  async updateRole(userId: string, role: Role): Promise<UserWithRole> {
    const response = await fetch(`/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (!response.ok) {
      throw buildHttpError(response.status)
    }

    const data = (await response.json()) as { user: UserWithRole }
    return data.user
  },

  /**
   * DELETE /api/users/[id]
   * Removes a user from the system.
   */
  async deleteUser(userId: string): Promise<void> {
    const response = await fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw buildHttpError(response.status)
    }
  },

  /**
   * POST /api/users/invite
   * Sends an invitation to a new user with the given role.
   */
  async inviteUser(data: InviteUserRequest): Promise<{ message: string }> {
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw buildHttpError(response.status)
    }

    return (await response.json()) as { message: string }
  },
}
