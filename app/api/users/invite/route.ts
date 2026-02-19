export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidRole } from '@/lib/types/roles'
import { requireAdmin } from '@/lib/utils/require-admin'

function isValidEmail(email: string): boolean {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0 || atIndex === email.length - 1) {
    return false
  }

  const domainPart = email.slice(atIndex + 1)
  return domainPart.includes('.')
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane wejściowe' }, { status: 400 })
  }

  const rawEmail =
    typeof body === 'object' && body !== null && 'email' in body
      ? (body as Record<string, unknown>)['email']
      : undefined

  if (typeof rawEmail !== 'string' || rawEmail.trim() === '') {
    return NextResponse.json({ error: 'Pole email jest wymagane' }, { status: 400 })
  }

  const email = rawEmail.trim()

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Nieprawidłowy format adresu email' },
      { status: 400 }
    )
  }

  const rawRole =
    typeof body === 'object' && body !== null && 'role' in body
      ? (body as Record<string, unknown>)['role']
      : undefined

  if (typeof rawRole !== 'string' || rawRole.trim() === '') {
    return NextResponse.json({ error: 'Pole role jest wymagane' }, { status: 400 })
  }

  const role = rawRole.trim()

  if (!isValidRole(role)) {
    return NextResponse.json(
      { error: 'Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER' },
      { status: 400 }
    )
  }

  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  try {
    const adminSupabase = createAdminClient()

    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
      const normalizedMessage = inviteError.message.toLowerCase()
      if (inviteError.status === 422 || normalizedMessage.includes('already')) {
        return NextResponse.json(
          { error: 'Użytkownik z tym adresem email już istnieje' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Błąd podczas wysyłania zaproszenia' },
        { status: 500 }
      )
    }

    const newUserId = inviteData.user?.id
    if (!newUserId) {
      return NextResponse.json(
        { error: 'Błąd podczas wysyłania zaproszenia' },
        { status: 500 }
      )
    }

    const { error: roleError } = await adminSupabase
      .from('user_roles')
      .insert({ user_id: newUserId, role })

    if (roleError) {
      await adminSupabase.auth.admin.deleteUser(newUserId)
      return NextResponse.json(
        { error: 'Błąd podczas przypisywania roli. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, userId: newUserId }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
