import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { ActivityLogInsert, ShoppingItemRow } from '@/types/home.types'

const GetShoppingQuerySchema = z.object({
  household_id: z.string().uuid('household_id musi być prawidłowym UUID'),
})

const PostShoppingBodySchema = z.object({
  household_id: z.string().uuid('household_id musi być prawidłowym UUID'),
  name: z
    .string()
    .trim()
    .min(1, 'Nazwa nie może być pusta')
    .max(200, 'Nazwa może mieć maksymalnie 200 znaków'),
  category: z
    .string()
    .trim()
    .max(100, 'Kategoria może mieć maksymalnie 100 znaków')
    .default('Inne'),
  quantity: z
    .number()
    .int('Ilość musi być liczbą całkowitą')
    .min(1, 'Ilość musi być większa niż 0')
    .max(9999, 'Ilość może mieć maksymalnie 9999'),
  unit: z
    .string()
    .trim()
    .max(20, 'Jednostka może mieć maksymalnie 20 znaków')
    .nullable()
    .optional(),
})

function buildValidationFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}

  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'root'
    if (!fields[key]) {
      fields[key] = issue.message
    }
  }

  return fields
}

function unauthorizedResponse(): Response {
  return NextResponse.json(
    { error: 'Brak autoryzacji — zaloguj się ponownie' },
    { status: 401 }
  )
}

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url)
    const parsedQuery = GetShoppingQuerySchema.safeParse({
      household_id: url.searchParams.get('household_id'),
    })

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: 'Walidacja nie powiodła się',
          fields: buildValidationFields(parsedQuery.error),
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorizedResponse()
    }

    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('household_id', parsedQuery.data.household_id)
      .order('is_bought', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[GET /api/home/shopping] Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { data: (data ?? []) as ShoppingItemRow[] },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('[GET /api/home/shopping] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Nieprawidłowy JSON' }, { status: 400 })
    }

    const parsedBody = PostShoppingBodySchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Walidacja nie powiodła się',
          fields: buildValidationFields(parsedBody.error),
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return unauthorizedResponse()
    }

    const { household_id, name, category, quantity, unit } = parsedBody.data

    const { data: item, error: insertError } = await supabase
      .from('shopping_items')
      .insert({
        household_id,
        name,
        category,
        quantity,
        unit: unit ?? null,
        added_by: user.id,
        is_bought: false,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23503') {
        return NextResponse.json(
          { error: 'Wskazane gospodarstwo domowe nie istnieje' },
          { status: 400 }
        )
      }

      if (insertError.code === '42501' || insertError.code === 'PGRST301') {
        return NextResponse.json(
          { error: 'Nie znaleziono zasobu lub brak dostępu' },
          { status: 404 }
        )
      }

      console.error('[POST /api/home/shopping] Supabase error:', insertError)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    const activityPayload: ActivityLogInsert = {
      household_id,
      actor_id: user.id,
      actor_name: user.email ?? 'Nieznany',
      action: 'shopping_added',
      entity_type: 'shopping_item',
      entity_id: item.id,
      entity_name: name,
      details: { category, quantity },
    }

    void supabase
      .from('activity_log')
      .insert(activityPayload)
      .then(({ error }) => {
        if (error) {
          console.error('[POST /api/home/shopping] activity_log error:', error)
        }
      })

    return NextResponse.json(
      { data: item as ShoppingItemRow },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[POST /api/home/shopping] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}
