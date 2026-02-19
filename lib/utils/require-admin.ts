import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type AdminAuthResult =
  | { success: true; callerId: string }
  | { success: false; response: NextResponse }

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Brak autoryzacji. Zaloguj się ponownie.' },
        { status: 401 }
      ),
    }
  }

  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleError || !roleData) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Nie znaleziono profilu użytkownika.' },
        { status: 403 }
      ),
    }
  }

  if (roleData.role !== 'ADMIN') {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Brak uprawnień. Wymagana rola: ADMIN' },
        { status: 403 }
      ),
    }
  }

  return { success: true, callerId: user.id }
}
