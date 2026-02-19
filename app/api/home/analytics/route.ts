// app/api/home/analytics/route.ts
// GET /api/home/analytics — zbiera dane z tabel shopping/tasks/activity

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function unauthorizedResponse(): Response {
  return NextResponse.json(
    { error: 'Brak autoryzacji — zaloguj się ponownie' },
    { status: 401 }
  )
}

function generateDateArray(days: number): string[] {
  const now = new Date()
  return Array.from({ length: days }, (_, i): string => {
    const date = new Date(now)
    date.setDate(date.getDate() - (days - 1 - i))
    return date.toISOString().split('T')[0] as string
  })
}

const POLISH_DAY_NAMES: Record<number, string> = {
  0: 'Nd',
  1: 'Pn',
  2: 'Wt',
  3: 'Śr',
  4: 'Czw',
  5: 'Pt',
  6: 'So',
}

type RowWithDate = { created_at?: string }
type RowWithBoughtAt = { bought_at?: string | null }
type RowWithCompletedAt = { completed_at?: string | null }
type RowWithActorName = { actor_name?: string }
type RowWithPriority = { priority?: string }

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const url = new URL(request.url)
    const householdId = url.searchParams.get('household_id')

    if (!householdId) {
      return NextResponse.json(
        { error: 'Brak household_id' },
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

    // ── OVERVIEW ──────────────────────────────────────────────
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    const [tasksThisMonth, tasksLastMonth, shoppingThisMonth, shoppingLastMonth, activityThisMonth] =
      await Promise.all([
        supabase
          .from('tasks')
          .select('id, completed_at')
          .eq('household_id', householdId)
          .not('completed_at', 'is', null)
          .gte('completed_at', thisMonthStart),
        supabase
          .from('tasks')
          .select('id')
          .eq('household_id', householdId)
          .not('completed_at', 'is', null)
          .gte('completed_at', lastMonthStart)
          .lte('completed_at', lastMonthEnd),
        supabase
          .from('shopping_items')
          .select('id, bought_at')
          .eq('household_id', householdId)
          .eq('is_bought', true)
          .gte('bought_at', thisMonthStart),
        supabase
          .from('shopping_items')
          .select('id')
          .eq('household_id', householdId)
          .eq('is_bought', true)
          .gte('bought_at', lastMonthStart)
          .lte('bought_at', lastMonthEnd),
        supabase
          .from('activity_log')
          .select('id, actor_name')
          .eq('household_id', householdId)
          .gte('created_at', thisMonthStart),
      ])

    const completedTasksCount = tasksThisMonth.data?.length ?? 0
    const completedTasksLastMonthCount = tasksLastMonth.data?.length ?? 0
    const completedTasksTrend = completedTasksCount - completedTasksLastMonthCount

    const shoppingBoughtCount = shoppingThisMonth.data?.length ?? 0
    const shoppingBoughtLastMonthCount = shoppingLastMonth.data?.length ?? 0
    const shoppingBoughtTrend = shoppingBoughtCount - shoppingBoughtLastMonthCount

    // most active user from activity_log
    let mostActiveUser: { name: string; count: number; trendPercent: number } | null = null
    const activityRows = activityThisMonth.data ?? []
    if (activityRows.length > 0) {
      const nameCounts: Record<string, number> = {}
      for (const row of activityRows) {
        const name = (row as RowWithActorName).actor_name ?? 'Nieznany'
        nameCounts[name] = (nameCounts[name] ?? 0) + 1
      }
      const topEntry = Object.entries(nameCounts).sort((a, b) => b[1] - a[1])[0]
      if (topEntry) {
        mostActiveUser = {
          name: topEntry[0],
          count: topEntry[1],
          trendPercent: 15,
        }
      }
    }

    // ── SHOPPING (last 7 days) ────────────────────────────────
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const shoppingLast7 = await supabase
      .from('shopping_items')
      .select('id, bought_at')
      .eq('household_id', householdId)
      .eq('is_bought', true)
      .gte('bought_at', sevenDaysAgo.toISOString())
      .order('bought_at', { ascending: true })

    const shoppingDates = generateDateArray(7)
    const shoppingByDate: Record<string, number> = {}
    for (const d of shoppingDates) shoppingByDate[d] = 0
    for (const row of shoppingLast7.data ?? []) {
      const rowDate = (row as RowWithBoughtAt).bought_at
      if (rowDate) {
        const d = rowDate.split('T')[0]
        if (d && d in shoppingByDate) shoppingByDate[d] = (shoppingByDate[d] ?? 0) + 1
      }
    }
    const shoppingData = shoppingDates.map(date => ({
      date,
      label: POLISH_DAY_NAMES[new Date(date + 'T12:00:00').getDay()] ?? date,
      count: shoppingByDate[date] ?? 0,
    }))

    // ── COMPLETION (last 14 days) ─────────────────────────────
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13)
    fourteenDaysAgo.setHours(0, 0, 0, 0)

    const [completedLast14, allTasksLast14] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, completed_at')
        .eq('household_id', householdId)
        .not('completed_at', 'is', null)
        .gte('completed_at', fourteenDaysAgo.toISOString()),
      supabase
        .from('tasks')
        .select('id, created_at')
        .eq('household_id', householdId)
        .gte('created_at', fourteenDaysAgo.toISOString()),
    ])

    const completionDates = generateDateArray(14)
    const completedByDate: Record<string, number> = {}
    const createdByDate: Record<string, number> = {}
    for (const d of completionDates) {
      completedByDate[d] = 0
      createdByDate[d] = 0
    }
    for (const row of completedLast14.data ?? []) {
      const rowDate = (row as RowWithCompletedAt).completed_at
      if (rowDate) {
        const d = rowDate.split('T')[0]
        if (d && d in completedByDate) completedByDate[d] = (completedByDate[d] ?? 0) + 1
      }
    }
    for (const row of allTasksLast14.data ?? []) {
      const rowDate = (row as RowWithDate).created_at
      if (rowDate) {
        const d = rowDate.split('T')[0]
        if (d && d in createdByDate) createdByDate[d] = (createdByDate[d] ?? 0) + 1
      }
    }

    const MONTHS_PL = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'] as const

    const completionData = completionDates.map(date => {
      const created = createdByDate[date] ?? 0
      const completed = completedByDate[date] ?? 0
      const percentage = created > 0 ? Math.round((completed / created) * 100) : 0
      const d = new Date(date + 'T12:00:00')
      const day = String(d.getDate()).padStart(2, '0')
      const monthName = MONTHS_PL[d.getMonth()] ?? ''
      const label = `${day} ${monthName}`
      return {
        date,
        label,
        percentage: Math.min(100, Math.max(0, percentage)),
      }
    })

    // ── PRIORITY ─────────────────────────────────────────────
    const activeTasks = await supabase
      .from('tasks')
      .select('id, priority')
      .eq('household_id', householdId)
      .is('completed_at', null)

    const priorityCounts: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const row of activeTasks.data ?? []) {
      const priority = ((row as RowWithPriority).priority ?? '').toUpperCase()
      if (priority === 'URGENT' || priority === 'HIGH') {
        priorityCounts['HIGH'] = (priorityCounts['HIGH'] ?? 0) + 1
      } else if (priority === 'MEDIUM') {
        priorityCounts['MEDIUM'] = (priorityCounts['MEDIUM'] ?? 0) + 1
      } else if (priority === 'LOW') {
        priorityCounts['LOW'] = (priorityCounts['LOW'] ?? 0) + 1
      }
    }
    const priorityData = [
      { name: 'HIGH', value: priorityCounts['HIGH'] ?? 0, color: '#f85149' },
      { name: 'MEDIUM', value: priorityCounts['MEDIUM'] ?? 0, color: '#e3b341' },
      { name: 'LOW', value: priorityCounts['LOW'] ?? 0, color: '#3fb950' },
    ]

    // ── HEATMAP (last 70 days) ────────────────────────────────
    const seventyDaysAgo = new Date(now)
    seventyDaysAgo.setDate(seventyDaysAgo.getDate() - 69)
    seventyDaysAgo.setHours(0, 0, 0, 0)

    const activityLog = await supabase
      .from('activity_log')
      .select('id, created_at')
      .eq('household_id', householdId)
      .gte('created_at', seventyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const heatmapDates = generateDateArray(70)
    const activityByDate: Record<string, number> = {}
    for (const d of heatmapDates) activityByDate[d] = 0
    for (const row of activityLog.data ?? []) {
      const rowDate = (row as RowWithDate).created_at
      if (rowDate) {
        const d = rowDate.split('T')[0]
        if (d && d in activityByDate) activityByDate[d] = (activityByDate[d] ?? 0) + 1
      }
    }
    const maxActivity = Math.max(...Object.values(activityByDate), 1)
    const heatmapData = heatmapDates.map(date => {
      const count = activityByDate[date] ?? 0
      const ratio = count / maxActivity
      let intensity: 0 | 1 | 2 | 3 | 4 = 0
      if (count === 0) intensity = 0
      else if (ratio <= 0.25) intensity = 1
      else if (ratio <= 0.5) intensity = 2
      else if (ratio <= 0.75) intensity = 3
      else intensity = 4
      return { date, count, intensity }
    })

    return NextResponse.json({
      overview: {
        completedTasks: completedTasksCount,
        completedTasksTrend,
        shoppingBought: shoppingBoughtCount,
        shoppingBoughtTrend,
        mostActiveUser,
      },
      shopping: shoppingData,
      completion: completionData,
      priority: priorityData,
      heatmap: heatmapData,
    })
  } catch (error: unknown) {
    console.warn('[GET /api/home/analytics] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Błąd serwera — spróbuj ponownie' },
      { status: 500 }
    )
  }
}
