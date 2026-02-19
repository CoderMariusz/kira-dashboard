'use client'
// components/home/overview/HomeOverview.tsx
// Główny Client Component strony /home — agreguje wszystkie hooki i podkomponenty

import { useHousehold }    from '@/hooks/home/useHousehold'
import { useShoppingList } from '@/hooks/home/useShoppingList'
import { useTasks }        from '@/hooks/home/useTasks'
import { useActivity }     from '@/hooks/home/useActivity'

import { GreetingBanner }   from './GreetingBanner'
import { StatCards }        from './StatCards'
import { QuickActions }     from './QuickActions'
import { MiniShoppingList } from './MiniShoppingList'
import { MiniKanban }       from './MiniKanban'
import { RecentActivity }   from './RecentActivity'

import type { Role } from '@/types/auth.types'

interface HomeOverviewProps {
  initialUserName: string
  userRole:        Role | null
}

export function HomeOverview({ initialUserName, userRole }: HomeOverviewProps) {
  // ─── 1. Household (bez household_id — hook sam wykrywa usera) ────
  const {
    household,
    members,
    loading:       householdLoading,
    isCreating:    householdCreating,
    creationError: householdCreationError,
  } = useHousehold()

  const householdId = household?.id

  // ─── 2. Shopping list ────────────────────────────────────────────
  const {
    items: allItems,
    toggleBought,
    loading: shoppingLoading,
    error:   shoppingError,
    refetch: shoppingRefetch,
  } = useShoppingList(householdId)

  // ─── 3. Tasks (kanban columns) ───────────────────────────────────
  const {
    columns,
    loading: tasksLoading,
    error:   tasksError,
    // addTask, moveTask etc. available but not used in overview
  } = useTasks(householdId)

  // ─── 4. Activity (ostatnie 4 eventy) ────────────────────────────
  const {
    events,
    loading: activityLoading,
    error:   activityError,
    refetch: activityRefetch,
  } = useActivity(householdId, 4)

  // ─── Pochodne ────────────────────────────────────────────────────
  const shoppingPending = allItems.filter(i => !i.is_bought)

  // Aktywność dziś
  const todayStr        = new Date().toDateString()
  const activityToday   = events.filter(e => new Date(e.created_at).toDateString() === todayStr)
  const activityCount   = activityToday.length

  // Brak household — EC-1: pokazuj baner tylko gdy tworzenie się nie powiodło
  // (nie gdy hook auto-tworzy household lub gdy trwa loading)
  const noHousehold = !householdLoading && !householdCreating && householdCreationError !== null

  // Loading do GreetingBanner subtext
  const greetingTasksCount    = tasksLoading    ? null : columns.flatMap(c => c.tasks).filter(t => t.due_date && new Date(t.due_date).toDateString() === todayStr).length
  const greetingShoppingCount = shoppingLoading ? null : shoppingPending.length

  const anyLoading = householdLoading || householdCreating || shoppingLoading || tasksLoading || activityLoading

  return (
    <main
      className="space-y-4 p-4 sm:p-6 max-w-5xl mx-auto"
      aria-label="Strona główna household"
    >
      {/* ── Baner "brak household" (EC-1) ── */}
      {noHousehold && (
        <div
          style={{
            background:   '#3a2a00',
            border:       '1px solid #e3b341',
            borderRadius: '10px',
            padding:      '12px 16px',
            fontSize:     '13px',
            color:        '#e3b341',
          }}
        >
          ⚠️ Nie należysz jeszcze do żadnego household. Poproś administratora o zaproszenie.
        </div>
      )}

      {/* 1. Greeting Banner — natychmiastowy, nie czeka na API */}
      <GreetingBanner
        userName={initialUserName}
        tasksToday={greetingTasksCount}
        shoppingCount={greetingShoppingCount}
      />

      {/* 2. Stat Cards */}
      <StatCards
        columns={columns}
        shoppingPending={shoppingPending}
        activityCount={activityCount}
        members={members}
        isLoading={anyLoading}
        noHousehold={noHousehold}
      />

      {/* 3. Quick Actions — bez loading, brak zależności od API */}
      <QuickActions userRole={userRole} />

      {/* 4. Error states per sekcja */}
      {shoppingError && (
        <ErrorBanner message={shoppingError} onRetry={shoppingRefetch} />
      )}
      {activityError && (
        <ErrorBanner message={activityError} onRetry={activityRefetch} />
      )}
      {tasksError && (
        <ErrorBanner message={tasksError} onRetry={() => window.location.reload()} />
      )}

      {/* 5. Bottom row: Mini Shopping + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MiniShoppingList
          items={shoppingPending.slice(0, 5)}
          isLoading={shoppingLoading || householdLoading}
          onToggle={toggleBought}
        />
        <RecentActivity
          events={events.slice(0, 4)}
          isLoading={activityLoading || householdLoading}
        />
      </div>

      {/* 6. Mini Kanban */}
      <MiniKanban
        columns={columns}
        isLoading={tasksLoading || householdLoading}
      />
    </main>
  )
}

// ─── Helper: Error banner ─────────────────────────────────────────
interface ErrorBannerProps {
  message:  string
  onRetry?: () => void
}

function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{
        background:   '#3a1a1a',
        border:       '1px solid #5a2a2a',
        borderRadius: '8px',
        padding:      '10px 14px',
        fontSize:     '12px',
        color:        '#f87171',
      }}
    >
      <span>⚠️ {message}. Spróbuj ponownie.</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background:   '#2a2540',
            border:       '1px solid #4b3d7a',
            color:        '#818cf8',
            borderRadius: '6px',
            padding:      '4px 10px',
            fontSize:     '11px',
            cursor:       'pointer',
          }}
        >
          Odśwież
        </button>
      )}
    </div>
  )
}
