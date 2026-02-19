import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { ActivityLogInsert, TaskRow } from '@/types/home.types'

const IdSchema = z.string().uuid('Nieprawidłowe ID')

const PatchTaskBodySchema = z
  .object({
    column_id: z.string().uuid('column_id musi być prawidłowym UUID').optional(),
    title: z
      .string()
      .trim()
      .min(1, 'Tytuł nie może być pusty')
      .max(500, 'Tytuł może mieć maksymalnie 500 znaków')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
      .nullable()
      .optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    position: z
      .number()
      .int('Pozycja musi być liczbą całkowitą')
      .min(0, 'Pozycja nie może być mniejsza niż 0')
      .optional(),
    assigned_to: z.string().uuid('assigned_to musi być prawidłowym UUID').nullable().optional(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD')
      .nullable()
      .optional(),
    completed_at: z
      .string()
      .datetime('completed_at musi być prawidłową datą ISO')
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Podaj przynajmniej jedno pole',
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

    const parsedBody = PatchTaskBodySchema.safeParse(body)

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

    const { data: task, error } = await supabase
      .from('tasks')
      .update(parsedBody.data)
      .eq('id', parsedId.data)
      .select('*')
      .maybeSingle()

    if (error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Wskazana kolumna nie istnieje' },
          { status: 400 }
        )
      }

      console.error('[PATCH /api/home/tasks/[id]] Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    if (!task) {
      return NextResponse.json(
        { error: 'Task nie znaleziony lub brak dostępu' },
        { status: 404 }
      )
    }

    if (parsedBody.data.column_id) {
      const activityPayload: ActivityLogInsert = {
        household_id: task.household_id,
        actor_id: user.id,
        actor_name: user.email ?? 'Nieznany',
        action: 'task_moved',
        entity_type: 'task',
        entity_id: task.id,
        entity_name: task.title,
        details: { to_column_id: parsedBody.data.column_id },
      }

      void supabase
        .from('activity_log')
        .insert(activityPayload)
        .then(({ error: activityError }) => {
          if (activityError) {
            console.error('[PATCH /api/home/tasks/[id]] activity_log error:', activityError)
          }
        })
    }

    return NextResponse.json({ data: task as TaskRow }, { status: 200 })
  } catch (error: unknown) {
    console.error('[PATCH /api/home/tasks/[id]] Unexpected error:', error)
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

    const { data: deletedTask, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', parsedId.data)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[DELETE /api/home/tasks/[id]] Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    if (!deletedTask) {
      return NextResponse.json(
        { error: 'Task nie znaleziony lub brak dostępu' },
        { status: 404 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    console.error('[DELETE /api/home/tasks/[id]] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}
