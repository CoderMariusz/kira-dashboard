---
story_id: STORY-10.2
title: "Route guard /settings/* — ADMIN only + RLS policies UPDATE/DELETE"
epic: EPIC-10
domain: auth
difficulty: simple
recommended_model: kimi-k2.5
depends_on: [STORY-10.1]
blocks: [STORY-10.7, STORY-10.8]
tags: [auth, middleware, rbac, rls, settings]
---

## 🎯 User Story
Tylko ADMIN widzi /settings/*; HELPER/HELPER_PLUS dostają redirect na /403.

## Zmiany

### 1. middleware.ts (rozszerzenie istniejącego z EPIC-3)
```typescript
// Dodaj do istniejącej logiki:
if (pathname.startsWith('/settings')) {
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/403', request.url))
  }
}
```
Sprawdź istniejący middleware.ts — nie nadpisuj logiki EPIC-3, tylko DODAJ blok dla /settings.

### 2. Strona /app/403/page.tsx (jeśli nie istnieje)
```tsx
// Prosty komunikat + link powrotu
export default function ForbiddenPage() {
  return (
    <div>
      <h1>Brak dostępu</h1>
      <p>Ta sekcja wymaga uprawnień Administratora.</p>
      <a href="/dashboard">← Wróć do dashboardu</a>
    </div>
  )
}
```

### 3. RLS policies (migracja SQL lub Supabase Studio)
```sql
-- Tylko ADMIN może UPDATE user_roles
CREATE POLICY IF NOT EXISTS "admin_update_roles" ON user_roles
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  ));

-- Tylko ADMIN może DELETE z user_roles  
CREATE POLICY IF NOT EXISTS "admin_delete_roles" ON user_roles
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  ));
```

## AC
- HELPER_PLUS na /settings/users → redirect /403
- HELPER na /settings/system → redirect /403
- ADMIN na /settings/* → OK, treść widoczna
- /403 renderuje komunikat z linkiem powrotu
- RLS: HELPER nie może UPDATE ani DELETE user_roles przez Supabase client

## DoD
- [ ] Testy middleware: role=HELPER → 302 /403; role=ADMIN → pass
- [ ] Strona /403 istnieje i renderuje
- [ ] RLS policies w migracji
