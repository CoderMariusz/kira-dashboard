// app/api/home/household/invite/route.ts
// POST   /api/home/household/invite  — wyślij zaproszenie (ADMIN only)
// GET    /api/home/household/invite  — lista oczekujących zaproszeń
// STORY-4.7

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { HouseholdInvite } from '@/types/home'

const InviteBodySchema = z.object({
  email: z
    .string()
    .trim()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Podaj poprawny adres email'),
})

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
// GET /api/home/household/invite
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
      console.warn('[household/invite GET] memberError:', memberError.message)
      return NextResponse.json({ error: 'Błąd ładowania household' }, { status: 500 })
    }

    if (!memberRow) {
      return NextResponse.json({ invites: [] })
    }

    const householdId = memberRow.household_id as string

    // Pobierz oczekujące zaproszenia
    const { data: invitesData, error: invitesError } = await supabase
      .from('household_invites')
      .select('*')
      .eq('household_id', householdId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (invitesError) {
      console.warn('[household/invite GET] invitesError:', invitesError.message)
      return NextResponse.json({ error: 'Błąd ładowania zaproszeń' }, { status: 500 })
    }

    return NextResponse.json({ invites: invitesData ?? [] })
  } catch (err) {
    console.warn('[household/invite GET] unexpected error:', err)
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────
// POST /api/home/household/invite
// ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Nieprawidłowe dane JSON' }, { status: 400 })
    }

    const parsed = InviteBodySchema.safeParse(body)
    if (!parsed.success) {
      const emailErr = parsed.error.issues.find(i => i.path[0] === 'email')?.message
      return NextResponse.json(
        { error: emailErr ?? 'Podaj poprawny adres email', field: 'email' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return unauthorizedResponse()

    // Sprawdź rolę bieżącego usera
    const { data: callerMember, error: callerError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (callerError || !callerMember) {
      return unauthorizedResponse()
    }

    if (callerMember.role !== 'ADMIN') {
      return forbiddenResponse('Tylko ADMIN może wysyłać zaproszenia')
    }

    const householdId = callerMember.household_id as string

    // Sprawdź, czy email jest już członkiem
    const { data: existingMember } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .limit(1)
      .maybeSingle()

    // Nie możemy łatwo sprawdzić po emailu w household_members (brak email kolumny)
    // Backend sprawdza po user_id, tutaj robimy best-effort check przez auth.users
    // Pominięte w MVP — sprawdzamy tylko oczekujące zaproszenia

    void existingMember // unused but kept for future

    // Sprawdź czy oczekujące zaproszenie już istnieje
    const { data: pendingInvite } = await supabase
      .from('household_invites')
      .select('id')
      .eq('household_id', householdId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (pendingInvite) {
      return NextResponse.json(
        { error: 'Zaproszenie na ten adres email już oczekuje — sprawdź listę poniżej', field: 'email' },
        { status: 409 }
      )
    }

    // Utwórz zaproszenie
    const { data: newInvite, error: insertError } = await supabase
      .from('household_invites')
      .insert({
        household_id: householdId,
        email,
        invited_by: user.id,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique violation
        return NextResponse.json(
          { error: 'Ten adres email jest już członkiem household', field: 'email' },
          { status: 409 }
        )
      }
      console.warn('[household/invite POST] insertError:', insertError.message)
      return NextResponse.json({ error: 'Nie udało się wysłać zaproszenia' }, { status: 500 })
    }

    return NextResponse.json({ invite: newInvite as HouseholdInvite }, { status: 201 })
  } catch (err) {
    console.warn('[household/invite POST] unexpected error:', err)
    return NextResponse.json({ error: 'Wewnętrzny błąd serwera' }, { status: 500 })
  }
}
