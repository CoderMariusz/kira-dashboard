import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import type { ActivityLogInsert, ColumnRow, TaskRow } from '@/types/home.types'

const GetTasksQuerySchema = z.object({
  household_id: z.string().uuid('household_id musi być prawidłowym UUID'),
})

const PostTaskBodySchema = z.object({
  household_id: z.string().uuid('household_id musi być prawidłowym UUID'),
  column_id: z.string().uuid('column_id musi być prawidłowym UUID'),
  title: z
    .string()
    .trim()
    .min(1, 'Tytuł nie może być pusty')
    .max(500, 'Tytuł może mieć maksymalnie 500 znaków'),
  description: z
    .string()
    .trim()
    .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid('assigned_to musi być prawidłowym UUID').nullable().optional(),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD')
    .nullable()
    .optional(),
})

type ColumnWithTasks = Pick<ColumnRow, 'id' | 'name' | 'position'> & {
  tasks: TaskRow[] | null
}

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
    const parsedQuery = GetTasksQuerySchema.safeParse({
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

    const { data: columns, error } = await supabase
      .from('columns')
      .select(
        `
        id,
        name,
        position,
        tasks (
          id,
          household_id,
          column_id,
          title,
          description,
          priority,
          position,
          assigned_to,
          due_date,
          created_by,
          completed_at,
          created_at,
          updated_at
        )
      `
      )
      .eq('household_id', parsedQuery.data.household_id)
      .order('position', { ascending: true })

    if (error) {
      console.error('[GET /api/home/tasks] Supabase error:', error)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    const normalized = ((columns ?? []) as ColumnWithTasks[]).map((column) => ({
      ...column,
      tasks: (column.tasks ?? []).sort((a, b) => a.position - b.position),
    }))

    return NextResponse.json({ data: normalized }, { status: 200 })
  } catch (error: unknown) {
    console.error('[GET /api/home/tasks] Unexpected error:', error)
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

    const parsedBody = PostTaskBodySchema.safeParse(body)

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

    const { household_id, column_id, title, description, priority, assigned_to, due_date } =
      parsedBody.data

    const { data: lastTask, error: lastTaskError } = await supabase
      .from('tasks')
      .select('position')
      .eq('column_id', column_id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastTaskError) {
      console.error('[POST /api/home/tasks] Last task fetch error:', lastTaskError)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    const nextPosition = (lastTask?.position ?? 0) + 1000

    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        household_id,
        column_id,
        title,
        description: description ?? null,
        priority,
        assigned_to: assigned_to ?? null,
        due_date: due_date ?? null,
        created_by: user.id,
        position: nextPosition,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23503') {
        return NextResponse.json(
          { error: 'Wskazana kolumna nie istnieje' },
          { status: 400 }
        )
      }

      if (insertError.code === '42501' || insertError.code === 'PGRST301') {
        return NextResponse.json(
          { error: 'Nie znaleziono zasobu lub brak dostępu' },
          { status: 404 }
        )
      }

      console.error('[POST /api/home/tasks] Supabase error:', insertError)
      return NextResponse.json(
        { error: 'Błąd serwera — spróbuj ponownie' },
        { status: 500 }
      )
    }

    const activityPayload: ActivityLogInsert = {
      household_id,
      actor_id: user.id,
      actor_name: user.email ?? 'Nieznany',
      action: 'task_created',
      entity_type: 'task',
      entity_id: task.id,
      entity_name: title,
      details: { column_id, priority },
    }

    void supabase
      .from('activity_log')
      .insert(activityPayload)
      .then(({ error }) => {
        if (error) {
          console.error('[POST /api/home/tasks] activity_log error:', error)
        }
      })

    return NextResponse.json({ data: task as TaskRow }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/home/tasks] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}
