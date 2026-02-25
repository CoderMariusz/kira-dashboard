// app/api/users/[id]/role/route.ts
// PATCH /api/users/[id]/role — zmiana roli użytkownika (ADMIN only)
// STORY-10.3 — User Management API

export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidRole } from '@/lib/types/roles'
import { requireAdmin } from '@/lib/utils/require-admin'
import type { Role } from '@/types/auth.types'
import type { UserWithRole } from '@/app/api/users/route'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params

  if (!id || id.trim() === '') {
    return NextResponse.json({ error: 'Brak ID użytkownika' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane wejściowe' }, { status: 400 })
  }

  const rawRole =
    typeof body === 'object' && body !== null && 'role' in body
      ? (body as Record<string, unknown>)['role']
      : undefined

  if (typeof rawRole !== 'string' || !isValidRole(rawRole.trim())) {
    return NextResponse.json(
      { error: 'Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER' },
      { status: 400 }
    )
  }

  const newRole = rawRole.trim()

  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  // Guard: blokuj zmianę własnej roli
  if (id === auth.callerId) {
    return NextResponse.json(
      { error: 'Nie możesz zmienić własnej roli' },
      { status: 422 }
    )
  }

  try {
    const adminSupabase = createAdminClient()

    const { data: targetUser, error: targetError } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', id)
      .maybeSingle()

    if (targetError) {
      return NextResponse.json({ error: 'Błąd odczytu użytkownika' }, { status: 500 })
    }

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Użytkownik nie został znaleziony' },
        { status: 404 }
      )
    }

    // Guard: nie pozwól zdegradować ostatniego ADMIN-a
    if (targetUser.role === 'ADMIN' && newRole !== 'ADMIN') {
      const { count, error: countError } = await adminSupabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ADMIN')

      if (countError) {
        return NextResponse.json({ error: 'Błąd odczytu administratorów' }, { status: 500 })
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Nie można zdegradować ostatniego administratora' },
          { status: 422 }
        )
      }
    }

    // Zaktualizuj rolę
    const { error: updateError } = await adminSupabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Błąd aktualizacji roli' }, { status: 500 })
    }

    // Build UserWithRole response per spec
    const { data: authUserData } = await adminSupabase.auth.admin.getUserById(id)
    const email = authUserData?.user?.email ?? ''

    const { data: updatedRoleRow } = await adminSupabase
      .from('user_roles')
      .select('role, invited_at, invited_by')
      .eq('user_id', id)
      .maybeSingle()

    let invited_by_email: string | null = null
    const invitedById = updatedRoleRow?.invited_by as string | null | undefined
    if (invitedById) {
      const { data: inviterData } = await adminSupabase.auth.admin.getUserById(invitedById)
      invited_by_email = inviterData?.user?.email ?? null
    }

    const user: UserWithRole = {
      id,
      email,
      role: ((updatedRoleRow?.role ?? newRole) as Role),
      invited_at: (updatedRoleRow?.invited_at as string | null) ?? null,
      invited_by_email,
    }

    return NextResponse.json({ success: true, user }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
