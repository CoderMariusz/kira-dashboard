// app/api/home/household/members/route.ts
// GET  /api/home/household/members — lista członków z danymi profilu
// DELETE /api/home/household/members?member_id=... — usunięcie członka (ADMIN only)
// STORY-4.7

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { HouseholdMember, HouseholdMemberExtended, HouseholdRole } from '@/types/home'

function unauthorizedResponse(): Response {
  return NextResponse.json(
    { error: 'Brak autoryzacji — zaloguj się ponownie' },
    { status: 401 }
  )
}

function forbiddenResponse(msg = 'Brak uprawnień'): Response {
  return NextResponse.json({ error: msg }, { status: 403 })
}

// ─────────────────────────────────────────────────────────
// GET /api/home/household/members
// ─────────────────────────────────────────────────────────
export async function GET(_request: NextRequest): Promise<Response> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return unauthorizedResponse()

    // Znajdź household bieżącego użytkownika
    const { data: memberRow, error: memberError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberError) {
      console.warn('[household/members GET] memberError:', memberError.message)
      return NextResponse.json({ error: 'Błąd ładowania danych household' }, { status: 500 })
    }

    if (!memberRow) {
      return NextResponse.json({ members: [] })
    }

    const householdId = memberRow.household_id as string

    // Pobierz wszystkich członków household
    const { data: membersData, error: membersError } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', householdId)

    if (membersError) {
      console.warn('[household/members GET] membersError:', membersError.message)
      return NextResponse.json({ error: 'Błąd ładowania członków' }, { status: 500 })
    }

    const members = (membersData ?? []) as HouseholdMember[]

    // Pobierz emaile i display_name z auth.users (admin client)
    const adminClient = createAdminClient()
    const { data: authData, error: authDataError } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    const emailMap = new Map<string, { email: string; display_name: string }>()
    if (!authDataError && authData?.users) {
      for (const u of authData.users) {
        const display =
          (u.user_metadata?.full_name as string | undefined) ??
          (u.user_metadata?.name as string | undefined) ??
          u.email?.split('@')[0] ??
          u.id.slice(0, 8)
        emailMap.set(u.id, { email: u.email ?? '', display_name: display })
      }
    }

    // Sortuj: ADMIN → HELPER+ → HELPER
    const roleOrder: Record<HouseholdRole, number> = { ADMIN: 0, 'HELPER+': 1, HELPER: 2 }

    const extended: HouseholdMemberExtended[] = members
      .map(m => ({
        ...m,
        email: emailMap.get(m.user_id)?.email ?? '',
        display_name: emailMap.get(m.user_id)?.display_name ?? m.user_id.slice(0, 8),
      }))
      .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9))

    return NextResponse.json({ members: extended })
  } catch (err) {
    console.warn('[household/members GET] unexpected error:', err)
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────
// DELETE /api/home/household/members?member_id=<uuid>
// ─────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url)
    const memberId = url.searchParams.get('member_id')?.trim()

    if (!memberId) {
      return NextResponse.json({ error: 'Brak parametru member_id' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return unauthorizedResponse()

    // Sprawdź rolę bieżącego usera w household
    const { data: callerMember, error: callerError } = await supabase
      .from('household_members')
      .select('household_id, role, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (callerError || !callerMember) {
      return unauthorizedResponse()
    }

    if (callerMember.role !== 'ADMIN') {
      return forbiddenResponse('Tylko ADMIN może usuwać członków household')
    }

    // Sprawdź, czy target member istnieje i należy do tego samego household
    const { data: targetMember, error: targetError } = await supabase
      .from('household_members')
      .select('id, household_id, user_id, role')
      .eq('id', memberId)
      .maybeSingle()

    if (targetError || !targetMember) {
      return NextResponse.json({ error: 'Członek nie znaleziony' }, { status: 404 })
    }

    if (targetMember.household_id !== callerMember.household_id) {
      return forbiddenResponse('Brak uprawnień do tego household')
    }

    // Nie można usunąć samego siebie
    if (targetMember.user_id === user.id) {
      return forbiddenResponse('Nie możesz usunąć samego siebie z household')
    }

    // Usuń członka
    const { error: deleteError } = await supabase
      .from('household_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.warn('[household/members DELETE] deleteError:', deleteError.message)
      return NextResponse.json({ error: 'Nie udało się usunąć członka' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.warn('[household/members DELETE] unexpected error:', err)
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
