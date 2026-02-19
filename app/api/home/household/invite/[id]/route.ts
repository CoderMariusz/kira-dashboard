// app/api/home/household/invite/[id]/route.ts
// DELETE /api/home/household/invite/:id — anuluj zaproszenie (ADMIN only)
// STORY-4.7

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function unauthorizedResponse(): Response {
  return NextResponse.json(
    { error: 'Brak autoryzacji — zaloguj się ponownie' },
    { status: 401 }
  )
}

function forbiddenResponse(msg = 'Brak uprawnień'): Response {
  return NextResponse.json({ error: msg }, { status: 403 })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: inviteId } = await params

    if (!inviteId) {
      return NextResponse.json({ error: 'Brak ID zaproszenia' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return unauthorizedResponse()

    // Znajdź zaproszenie
    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .select('id, household_id, status')
      .eq('id', inviteId)
      .maybeSingle()

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Zaproszenie nie znalezione' }, { status: 404 })
    }

    // Sprawdź rolę w household
    const { data: callerMember, error: callerError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (callerError || !callerMember) {
      return unauthorizedResponse()
    }

    if (callerMember.household_id !== invite.household_id) {
      return forbiddenResponse('Brak uprawnień do tego household')
    }

    if (callerMember.role !== 'ADMIN') {
      return forbiddenResponse('Tylko ADMIN może anulować zaproszenia')
    }

    // Anuluj zaproszenie (update status)
    const { error: updateError } = await supabase
      .from('household_invites')
      .update({ status: 'rejected' })
      .eq('id', inviteId)

    if (updateError) {
      console.warn('[household/invite DELETE] updateError:', updateError.message)
      return NextResponse.json({ error: 'Nie udało się anulować zaproszenia' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.warn('[household/invite DELETE] unexpected error:', err)
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
