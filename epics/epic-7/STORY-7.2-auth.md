---
story_id: STORY-7.2
title: "RBAC — ADMIN write / HELPER read-only na /dashboard/eval"
epic: EPIC-7
domain: auth
difficulty: medium
recommended_model: sonnet
priority: must
depends_on: [STORY-7.1]
blocks: [STORY-7.3, STORY-7.4, STORY-7.6]
---

## 🎯 Cel
Zabezpieczyć stronę Eval i jej API: ADMIN może zarządzać golden tasks i triggerować runy,
pozostałe role mają dostęp read-only do wyników.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Auth: Supabase SSR (`@/lib/supabase/server`), RBAC przez tabelę `user_roles` w Bridge DB lub Supabase.
Sprawdź istniejący pattern RBAC: `cat app/api/auth/logout/route.ts` i middleware.

## ✅ Acceptance Criteria

### AC-1: Middleware chroni `/dashboard/eval`
- Niezalogowany → redirect do `/login`
- Zalogowany (każda rola) → dostęp do widoku (read-only)
- Sprawdź `middleware.ts` — dodaj `/dashboard/eval` do matchers jeśli potrzeba

### AC-2: Helper `requireAdmin()` dla API routes
Stwórz lub zaktualizuj `lib/auth/requireRole.ts`:
```typescript
export async function requireAdmin(req: Request): Promise<
  | { user: SupabaseUser; role: 'ADMIN' }
  | NextResponse  // 401 lub 403
>
export async function requireAuth(req: Request): Promise<
  | { user: SupabaseUser; role: string }
  | NextResponse  // 401
>
```
- `requireAdmin`: 401 bez sesji, 403 jeśli rola ≠ ADMIN
- `requireAuth`: 401 bez sesji, zwraca user + role dla każdej roli

### AC-3: API routes write-only dla ADMIN
Dotyczy (do implementacji w STORY-7.3):
- `POST /api/eval/tasks` → 403 dla non-ADMIN
- `PATCH /api/eval/tasks/[id]` → 403 dla non-ADMIN
- `DELETE /api/eval/tasks/[id]` → 403 dla non-ADMIN
- `POST /api/eval/run` (istniejące) → 403 dla non-ADMIN

### AC-4: API routes read dla wszystkich zalogowanych
- `GET /api/eval/tasks` → 200 dla każdej roli
- `GET /api/eval/runs` → 200 dla każdej roli

### AC-5: Testy integracyjne
Plik: `__tests__/api/auth/requireRole.test.ts`
- mockNoSession() → 401
- mockUserSession('USER') → 403 przy requireAdmin
- mockAdminSession() → pass (returns user object)
- `npm test __tests__/api/auth/` → PASS

### AC-6: Komponent UI reaguje na rolę
Stwórz helper hook: `hooks/useUserRole.ts`
```typescript
export function useUserRole(): { role: string | null; isAdmin: boolean; isLoading: boolean }
```
- Pobiera rolę z `/api/auth/me` lub Supabase session
- Używany w STORY-7.6 do chowania przycisków CRUD

## ⚠️ Uwagi
- Sprawdź istniejące RBAC helpers — mogą już być w `lib/auth/` lub `middleware.ts`
- Nie duplikuj istniejącego kodu — rozszerz
- `useUserRole` hook musi być serializowalny (nie server-only)

## ✔️ DoD
- [ ] `requireAdmin()` i `requireAuth()` w `lib/auth/requireRole.ts`
- [ ] `useUserRole` hook działa
- [ ] Testy integracyjne PASS
- [ ] Commit na `feature/STORY-7.2` w kira-dashboard
