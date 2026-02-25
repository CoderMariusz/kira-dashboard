// types/settings.types.ts
// STORY-10.5 — Typy dla zarządzania użytkownikami w panelu ustawień

import type { Role } from './auth.types'

/**
 * Użytkownik z przypisaną rolą — kształt zwracany przez GET /api/users
 * Uwaga: UserWithRole z types/users.types.ts zawiera `created_at` zamiast `invited_*`.
 * Ta wersja jest właściwa dla endpointów zarządzania użytkownikami (STORY-10.3+).
 */
export interface UserWithRole {
  id: string
  email: string
  role: Role
  invited_at: string
  invited_by_email: string | null
}

/** Payload do POST /api/users/invite */
export interface InviteUserRequest {
  email: string
  role: Role
}

/** Payload do PATCH /api/users/[id]/role */
export interface UpdateRoleRequest {
  role: Role
}

/** Kształt odpowiedzi GET /api/users */
export interface UsersListResponse {
  users: UserWithRole[]
}
