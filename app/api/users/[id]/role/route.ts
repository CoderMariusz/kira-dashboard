export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidRole } from '@/lib/types/roles'
import { requireAdmin } from '@/lib/utils/require-admin'

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

    const { error: updateError } = await adminSupabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Błąd aktualizacji roli' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
