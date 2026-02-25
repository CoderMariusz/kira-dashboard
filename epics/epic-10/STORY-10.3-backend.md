---
story_id: STORY-10.3
title: "User Management API — GET/PATCH/DELETE /api/users + POST /api/users/invite"
epic: EPIC-10
domain: backend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-10.1, STORY-10.2]
blocks: [STORY-10.5]
tags: [api, users, invite, supabase-admin, rbac]
---

## 🎯 User Story
Admin zarządza użytkownikami przez API — lista, zmiana roli, usunięcie, zaproszenie.

## Spec pełna
`/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/EPIC-10-settings.md` → STORY-10.3

## Endpointy
Wszystkie wymagają `requireAdmin`. Supabase Admin Client: `createClient(url, SERVICE_ROLE_KEY)`.

### GET /api/users → `app/api/users/route.ts`
Join user_roles + auth.users przez Admin API.
```typescript
// Response: { users: UserWithRole[] }
interface UserWithRole {
  id: string; email: string; role: Role
  invited_at: string; invited_by_email: string | null
}
```

### PATCH /api/users/[id]/role → `app/api/users/[id]/role/route.ts`
- Body: `{ role: "ADMIN" | "HELPER_PLUS" | "HELPER" }`
- Guard: id !== currentUser.id → 400 "Nie możesz zmienić własnej roli"
- UPDATE user_roles SET role = $role WHERE user_id = $id
- Response: `{ success: true, user: UserWithRole }`

### DELETE /api/users/[id] → `app/api/users/[id]/route.ts`
- Guard: id !== currentUser.id → 400 "Nie możesz usunąć własnego dostępu"
- DELETE FROM user_roles WHERE user_id = $id
- Supabase Auth account zostaje (tylko revoke)
- Response: `{ success: true }`

### POST /api/users/invite → `app/api/users/invite/route.ts`
- Body: `{ email: string, role: Role }` (walidacja Zod)
- `supabaseAdmin.auth.admin.inviteUserByEmail(email)`
- INSERT do user_roles z invited_by = currentUser.id, invited_at = NOW()
- Jeśli user już istnieje → 409 "Użytkownik z tym adresem już istnieje"
- Response: `{ success: true, message: "Zaproszenie wysłane" }`

## AC
- GET zwraca listę UserWithRole z email
- PATCH zmienia rolę; blokuje auto-modyfikację
- DELETE usuwa z user_roles; blokuje auto-usunięcie
- POST invite wysyła magic link przez Supabase Admin API
- Wszystkie endpointy: 401 bez sesji, 403 bez roli ADMIN
- Błędy po polsku

## DoD
- [ ] Testy dla każdego endpointu (happy path + guards)
- [ ] Zod walidacja na POST invite (email format, rola)
- [ ] Supabase Admin Client używa SERVICE_ROLE_KEY (nie anon key!)
