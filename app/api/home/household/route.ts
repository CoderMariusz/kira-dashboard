// app/api/home/household/route.ts
// POST /api/home/household — tworzy nowy household dla zalogowanego usera
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Sprawdź czy user już ma household
    const { data: existing } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      // Zwróć istniejący household
      const { data: household } = await supabase
        .from('households')
        .select('*')
        .eq('id', existing.household_id)
        .single()
      return NextResponse.json({ data: household })
    }

    // Utwórz nowy household (service role do bypass RLS)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    const { data: newHousehold, error: createError } = await admin
      .from('households')
      .insert({ name: `${user.email?.split('@')[0] ?? 'Mój'} Dom` })
      .select()
      .single()

    if (createError || !newHousehold) {
      return NextResponse.json({ error: 'Failed to create household' }, { status: 500 })
    }

    // Dodaj usera jako ADMIN household
    await admin
      .from('household_members')
      .insert({ household_id: newHousehold.id, user_id: user.id, role: 'ADMIN' })

    return NextResponse.json({ data: newHousehold }, { status: 201 })
  } catch (err) {
    console.warn('[household/route] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
