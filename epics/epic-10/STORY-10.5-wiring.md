---
story_id: STORY-10.5
title: "Typy i serwis User Management (UserService + hooki)"
epic: EPIC-10
domain: wiring
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-10.3]
blocks: [STORY-10.7]
tags: [types, service, swr, users, settings]
---

## 🎯 User Story
Frontend users page ma gotowe typy i hooki bez any.

## Pliki
- `types/settings.types.ts` — UserWithRole, InviteUserRequest, UpdateRoleRequest
- `services/user.service.ts` — UserService (getAll, updateRole, deleteUser, inviteUser)
- `hooks/useUsers.ts` — SWR hook

## Typy
```typescript
// types/settings.types.ts
import type { Role } from './auth.types'

export interface UserWithRole {
  id: string
  email: string
  role: Role
  invited_at: string
  invited_by_email: string | null
}

export interface InviteUserRequest { email: string; role: Role }
export interface UpdateRoleRequest { role: Role }
export interface UsersListResponse { users: UserWithRole[] }
```

## UserService
```typescript
// services/user.service.ts
export const UserService = {
  getAll: (): Promise<UserWithRole[]>
  updateRole: (userId: string, role: Role): Promise<UserWithRole>
  deleteUser: (userId: string): Promise<void>
  inviteUser: (data: InviteUserRequest): Promise<{ message: string }>
}
```

## Hook
```typescript
// hooks/useUsers.ts
export function useUsers() {
  // SWR key: '/api/users'; refreshInterval: 0 (manual only); revalidateOnFocus: false
  return { users, isLoading, error, refresh, updateRole, deleteUser, inviteUser }
}
// updateRole/deleteUser: optimistic update + rollback on error
// inviteUser: invalidate SWR after success
```

## Obsługa błędów (po polsku)
- 400 → "Nieprawidłowe dane — sprawdź formularz"
- 403 → "Nie masz uprawnień do tej operacji"
- 404 → "Użytkownik nie istnieje"
- 409 → "Użytkownik z tym adresem już istnieje"
- 500 → "Błąd serwera — spróbuj ponownie"

## DoD
- [ ] Zero `any`
- [ ] Optimistic update w updateRole (rollback on error)
- [ ] `tsc --noEmit` czyste
