import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { ShoppingItemRow } from '@/types/home.types'

const IdSchema = z.string().uuid('Nieprawidłowe ID')

const PatchShoppingBodySchema = z
  .object({
    is_bought: z.boolean().optional(),
    name: z
      .string()
      .trim()
      .min(1, 'Nazwa nie może być pusta')
      .max(200, 'Nazwa może mieć maksymalnie 200 znaków')
      .optional(),
    quantity: z
      .number()
      .int('Ilość musi być liczbą całkowitą')
      .min(1, 'Ilość musi być większa niż 0')
      .max(9999, 'Ilość może mieć maksymalnie 9999')
      .optional(),
    category: z
      .string()
      .trim()
      .max(100, 'Kategoria może mieć maksymalnie 100 znaków')
      .optional(),
    unit: z
      .string()
      .trim()
      .max(20, 'Jednostka może mieć maksymalnie 20 znaków')
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Musisz podać przynajmniej jedno pole do aktualizacji',
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const parsedId = IdSchema.safeParse(id)

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error: 'Walidacja nie powiodła się',
          fields: { id: parsedId.error.issues[0]?.message ?? 'Nieprawidłowe ID' },
        },
        { status: 400 }
      )
    }

    let body: unknown

    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Nieprawidłowy JSON' }, { status: 400 })
    }

    const parsedBody = PatchShoppingBodySchema.safeParse(body)

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

    const { data: item, error } = await supabase
      .from('shopping_items')
      .update(parsedBody.data)
      .eq('id', parsedId.data)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[PATCH /api/home/shopping/[id]] Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    if (!item) {
      return NextResponse.json(
        { error: 'Item nie znaleziony lub brak dostępu' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: item as ShoppingItemRow },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error('[PATCH /api/home/shopping/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params
    const parsedId = IdSchema.safeParse(id)

    if (!parsedId.success) {
      return NextResponse.json(
        {
          error: 'Walidacja nie powiodła się',
          fields: { id: parsedId.error.issues[0]?.message ?? 'Nieprawidłowe ID' },
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

    const { data: deletedItem, error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', parsedId.data)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[DELETE /api/home/shopping/[id]] Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    if (!deletedItem) {
      return NextResponse.json(
        { error: 'Item nie znaleziony lub brak dostępu' },
        { status: 404 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('[DELETE /api/home/shopping/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}
