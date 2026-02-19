export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/utils/require-admin'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params

  if (!id || id.trim() === '') {
    return NextResponse.json({ error: 'Brak ID użytkownika' }, { status: 400 })
  }

  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  if (id === auth.callerId) {
    return NextResponse.json(
      { error: 'Nie możesz usunąć własnego konta' },
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

    if (targetUser.role === 'ADMIN') {
      const { count, error: countError } = await adminSupabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'ADMIN')

      if (countError) {
        return NextResponse.json({ error: 'Błąd odczytu administratorów' }, { status: 500 })
      }

      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'Nie można usunąć ostatniego administratora' },
          { status: 422 }
        )
      }
    }

    const { error: roleDeleteError } = await adminSupabase
      .from('user_roles')
      .delete()
      .eq('user_id', id)

    if (roleDeleteError) {
      return NextResponse.json(
        { error: 'Błąd podczas usuwania danych użytkownika' },
        { status: 500 }
      )
    }

    const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(id)

    if (authDeleteError) {
      console.error('Supabase auth deleteUser failed:', authDeleteError.message)
      return NextResponse.json(
        { error: 'Błąd podczas usuwania konta' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
