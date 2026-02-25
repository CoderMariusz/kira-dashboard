// app/api/users/invite/route.ts
// POST /api/users/invite — zaproszenie użytkownika przez Supabase Admin API (ADMIN only)
// STORY-10.3 — User Management API

export const runtime = 'nodejs'

import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/utils/require-admin'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const InviteSchema = z.object({
  email: z.email({ error: 'Nieprawidłowy format adresu email' }),
  role: z.enum(['ADMIN', 'HELPER_PLUS', 'HELPER'], {
    error: 'Nieprawidłowa rola. Dozwolone: ADMIN, HELPER_PLUS, HELPER',
  }),
})

// ─── POST /api/users/invite ───────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  // Wymagaj roli ADMIN przed przetworzeniem body
  const auth = await requireAdmin()
  if (!auth.success) {
    return auth.response
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowe dane wejściowe' }, { status: 400 })
  }

  // Walidacja Zod
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return NextResponse.json(
      { error: firstError?.message ?? 'Nieprawidłowe dane wejściowe' },
      { status: 400 }
    )
  }

  const { email, role } = parsed.data

  try {
    const adminSupabase = createAdminClient()

    // Wyślij zaproszenie przez Supabase Admin API
    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email)

    if (inviteError) {
      const normalizedMessage = inviteError.message.toLowerCase()
      if (inviteError.status === 422 || normalizedMessage.includes('already')) {
        return NextResponse.json(
          { error: 'Użytkownik z tym adresem już istnieje' },
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

    // Wstaw rekord do user_roles z invited_by i invited_at
    const { error: roleError } = await adminSupabase
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role,
        invited_by: auth.callerId,
        invited_at: new Date().toISOString(),
      })

    if (roleError) {
      // Rollback — usuń zaproszonego usera z auth
      await adminSupabase.auth.admin.deleteUser(newUserId)
      return NextResponse.json(
        { error: 'Błąd podczas przypisywania roli. Spróbuj ponownie.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, message: 'Zaproszenie wysłane' },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}
