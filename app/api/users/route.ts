// app/api/users/route.ts
// GET /api/users — lista wszystkich użytkowników (ADMIN only)
// STORY-10.3 — User Management API

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { Role } from '@/types/auth.types'

export interface UserWithRole {
  id: string
  email: string
  role: Role
  invited_at: string | null
  invited_by_email: string | null
}

export async function GET(): Promise<Response> {
  // Wymagaj roli ADMIN
  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  try {
    const adminSupabase = createAdminClient()

    // 1. Pobierz wszystkie role z user_roles (z polami invited_by i invited_at)
    const { data: roleData, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('user_id, role, created_at, invited_by, invited_at')
      .order('created_at', { ascending: true })

    if (roleError) {
      return NextResponse.json(
        { error: 'Błąd ładowania ról użytkowników' },
        { status: 500 }
      )
    }

    if (!roleData || roleData.length === 0) {
      return NextResponse.json({ users: [] })
    }

    // 2. Pobierz listę userów z Supabase Auth (email)
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.listUsers({ perPage: 1000 })

    if (authError) {
      return NextResponse.json(
        { error: 'Błąd ładowania danych uwierzytelniania' },
        { status: 500 }
      )
    }

    // 3. Zbuduj mapę userId → email
    const emailMap = new Map<string, string>()
    for (const authUser of authData.users) {
      emailMap.set(authUser.id, authUser.email ?? '')
    }

    // 4. Połącz dane ról z emailami
    const validRoles: Role[] = ['ADMIN', 'HELPER_PLUS', 'HELPER']

    const users: UserWithRole[] = roleData
      .filter(
        (r): r is typeof r & { user_id: string; role: string } =>
          typeof r.user_id === 'string' &&
          typeof r.role === 'string' &&
          validRoles.includes(r.role as Role)
      )
      .map((r) => ({
        id: r.user_id,
        email: emailMap.get(r.user_id) ?? '',
        role: r.role as Role,
        invited_at: (r.invited_at as string | null) ?? null,
        invited_by_email: r.invited_by ? (emailMap.get(r.invited_by as string) ?? null) : null,
      }))
      .filter((u) => u.email !== '') // pomiń userów bez emaila

    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
