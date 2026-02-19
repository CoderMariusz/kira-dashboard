---
story_id: STORY-4.3
title: "Home hooks + types — useShoppingList, useTasks, useActivity, useHousehold"
epic: EPIC-4
module: home
domain: wiring
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: none
api_reference: none
priority: must
estimated_effort: 8 h
depends_on: STORY-4.1, STORY-4.2
blocks: STORY-4.4, STORY-4.5, STORY-4.6, STORY-4.7, STORY-4.9
tags: [hooks, types, supabase, realtime, optimistic-updates, shopping, tasks, activity, household]
---

## 🎯 User Story

**Jako** komponent frontendowy (Shopping List, Kanban Board, Activity Feed)
**Chcę** mieć gotowe React hooks z Supabase real-time subscriptions i optimistic updates
**Żeby** dane aktualizowały się automatycznie w czasie rzeczywistym dla wszystkich członków household — bez przeładowywania strony

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

```
src/types/home/                    ← TypeScript typy
  index.ts                         ← eksportuje wszystkie typy modułu home
  shopping.types.ts                ← ShoppingItem, ShoppingItemCreate, ShoppingItemUpdate
  tasks.types.ts                   ← Task, Column, ColumnWithTasks, TaskCreate, TaskUpdate, MoveTask
  activity.types.ts                ← ActivityEvent
  household.types.ts               ← Household, HouseholdMember

src/hooks/home/                    ← React hooks
  useShoppingList.ts
  useTasks.ts
  useActivity.ts
  useHousehold.ts
```

Stack:
- React 18+ (`useState`, `useEffect`, `useCallback`, `useRef`)
- Supabase JS client v2 (`@supabase/supabase-js`) — browser client
- **NIE React Query** — hooks zarządzają state samodzielnie, Supabase real-time zastępuje polling
- TypeScript (strict mode)

### Powiązane pliki
- `src/lib/supabase/client.ts` — eksportuje `createClient()` dla browser (singleton pattern)
  ```typescript
  // Wzorzec singleton — jeden klient na całą aplikację
  import { createBrowserClient } from '@supabase/ssr'
  let client: ReturnType<typeof createBrowserClient> | null = null
  export function createClient() {
    if (!client) {
      client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return client
  }
  ```
- API routes z STORY-4.2 — hooks wywołują te endpointy dla mutacji (nie bezpośrednio Supabase client)
- Supabase Realtime — hooks subskrybują `postgres_changes` dla odczytu na żywo

### Stan systemu przed tą story
- STORY-4.1 ukończony — tabele i Realtime publisher ustawiony
- STORY-4.2 ukończony — API routes dostępne
- `src/lib/supabase/client.ts` istnieje (z EPIC-3)
- `'use client'` directive działa w Next.js 16 App Router

### Architektura hooks (filozofia)

Hooks łączą **dwa źródła danych**:
1. **Initial fetch** (przy mount) → przez API route (`/api/home/shopping?household_id=...`) lub bezpośrednio przez Supabase client SELECT
2. **Real-time updates** (po mount) → przez `supabase.channel(...).on('postgres_changes', ...)` — nasłuchuje na INSERT/UPDATE/DELETE i aktualizuje lokalny state

Optimistic updates dla mutacji:
1. Mutuj lokalny state natychmiast (UI reaguje bez czekania)
2. Wyślij request do API route
3. Jeśli API zwróci błąd → rollback do poprzedniego state

---

## ✅ Acceptance Criteria

### AC-1: useShoppingList zwraca posortowane items i reaguje na real-time
GIVEN: komponent Shopping List montuje się z `householdId = 'household-A-uuid'`
WHEN: `useShoppingList('household-A-uuid')` jest wywołany
THEN: hook zwraca `{ items, addItem, toggleBought, deleteItem, loading }`
AND: `loading` = true podczas ładowania, false po załadowaniu
AND: `items` zawiera posortowane shopping items (is_bought=false pierwsze)

GIVEN: inny user (Angelika) w tym samym household dodaje item przez swoją przeglądarkę
WHEN: Supabase Realtime dostarcza event INSERT
THEN: `items` w hooku Mariusza automatycznie zawiera nowy item (bez przeładowania)

### AC-2: addItem wykonuje optimistic update i rollback przy błędzie
GIVEN: `items` = [{id: '1', name: 'Mleko', ...}]
WHEN: wywołano `addItem({ name: 'Chleb', category: 'Pieczywo', quantity: 1 })`
THEN: `items` natychmiast (synchronicznie przed API response) zawiera tymczasowy item z id = `'temp-<timestamp>'`
AND: w tle wysyłany jest `POST /api/home/shopping`
AND: po success response: tymczasowy item jest zastępowany realnym (z prawdziwym UUID z bazy)
AND: po error response: tymczasowy item jest usuwany, `error` state jest ustawiony

### AC-3: useTasks zwraca columns z taskami i reaguje na real-time
GIVEN: `useTasks('household-A-uuid')` zamontowany
THEN: zwraca `{ columns, addTask, moveTask, updateTask, deleteTask, loading }`
AND: `columns` to array `ColumnWithTasks[]` posortowany po position ASC
AND: każda column ma `tasks: Task[]` posortowane po position ASC

GIVEN: Angelika przesuwa task między kolumnami przez drag & drop
WHEN: Supabase Realtime dostarcza event UPDATE na tabeli tasks (zmiana column_id i position)
THEN: hook u Mariusza automatycznie przesuwa task do właściwej kolumny

### AC-4: moveTask wykonuje optimistic update
GIVEN: `columns` = [{name:'Todo', tasks:[{id:'task-1', ...}]}, {name:'Done', tasks:[]}]
WHEN: wywołano `moveTask({ taskId: 'task-1', targetColumnId: 'done-col-id', position: 1000 })`
THEN: natychmiast (przed API) `columns` wygląda tak: Todo ma pustą tablicę tasks, Done ma task-1
AND: w tle wysyłany jest `PATCH /api/home/tasks/task-1` z `{column_id, position}`
AND: po error: task-1 wraca do Todo (rollback)

### AC-5: useActivity zwraca real-time feed ostatnich N zdarzeń
GIVEN: `useActivity('household-A-uuid', 20)` zamontowany
THEN: zwraca `{ events, loading }` gdzie `events` = ostatnie 20 ActivityEvent posortowane DESC
AND: gdy Supabase Realtime dostarcza nowy INSERT do activity_log, `events` automatycznie dodaje go na górę i usuwa najstarszy jeśli length > limit

### AC-6: useHousehold tworzy household jeśli user go nie ma
GIVEN: zalogowany user nie ma household (brak rekordu w household_members)
WHEN: `useHousehold()` jest zamontowany
THEN: hook automatycznie wywołuje `POST /api/home/household` (lub bezpośrednio Supabase) żeby stworzyć household i dodać usera jako ADMIN
AND: po stworzeniu hook zwraca `{ household: {id, name, ...}, members: [{user_id, role: 'ADMIN', ...}], loading: false }`

### AC-7: Cleanup — subscriptions są usuwane przy unmount
GIVEN: komponent z `useShoppingList` jest zamontowany (aktywna Supabase subscription)
WHEN: komponent jest odmontowywany (np. user przechodzi do innej strony)
THEN: `supabase.channel.unsubscribe()` jest wywołane w cleanup `useEffect`
AND: brak memory leaks, brak "Can't perform state update on unmounted component"

### AC-8: Wszystkie typy są poprawnie wyeksportowane
GIVEN: komponent importuje typy z `@/types/home`
WHEN: TypeScript kompiluje projekt (`next build`)
THEN: zero błędów TypeScript związanych z typami home module
AND: brak użycia `any` w plikach hooks i types

---

## 🔌 Szczegóły Wiring

### Typy współdzielone

#### Plik: `src/types/home/shopping.types.ts`

```typescript
export interface ShoppingItem {
  id:           string        // UUID v4
  household_id: string        // UUID — FK do households
  name:         string        // Nazwa produktu, np. "Mleko"
  category:     string        // Kategoria, np. "Nabiał", domyślnie "Inne"
  quantity:     number        // Ilość, min 1
  unit:         string | null // Jednostka, np. "kg", "szt", null jeśli brak
  is_bought:    boolean       // false = na liście, true = kupione
  bought_at:    string | null // ISO 8601 timestamp lub null
  added_by:     string | null // UUID usera który dodał, null jeśli usunięty
  created_at:   string        // ISO 8601
  updated_at:   string        // ISO 8601
}

// DTO do tworzenia — bez pól auto-generowanych
export type ShoppingItemCreate = Pick<ShoppingItem,
  'name' | 'category' | 'quantity'
> & {
  unit?: string | null
  household_id: string
}

// DTO do aktualizacji — wszystkie pola opcjonalne
export type ShoppingItemUpdate = Partial<Pick<ShoppingItem,
  'name' | 'category' | 'quantity' | 'unit' | 'is_bought'
>>
```

#### Plik: `src/types/home/tasks.types.ts`

```typescript
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id:           string              // UUID v4
  household_id: string              // UUID — FK do households
  column_id:    string              // UUID — FK do columns
  title:        string              // Tytuł zadania
  description:  string | null       // Opcjonalny opis
  priority:     TaskPriority        // Priorytet
  position:     number              // Pozycja w kolumnie (integer, krok 1000)
  assigned_to:  string | null       // UUID usera, null jeśli nieprzypisany
  due_date:     string | null       // Format YYYY-MM-DD lub null
  completed_at: string | null       // ISO 8601 lub null
  created_by:   string | null       // UUID usera który stworzył
  created_at:   string              // ISO 8601
  updated_at:   string              // ISO 8601
}

export interface Column {
  id:           string   // UUID v4
  household_id: string   // UUID — FK do households
  name:         string   // Nazwa kolumny, np. "Do zrobienia"
  position:     number   // Pozycja (0 = pierwsza kolumna od lewej)
  created_at:   string   // ISO 8601
}

export interface ColumnWithTasks extends Column {
  tasks: Task[]  // posortowane po position ASC
}

export type TaskCreate = Pick<Task,
  'household_id' | 'column_id' | 'title'
> & {
  description?: string
  priority?:    TaskPriority
  assigned_to?: string | null
  due_date?:    string | null
}

export type TaskUpdate = Partial<Pick<Task,
  'title' | 'description' | 'priority' | 'assigned_to' | 'due_date' | 'completed_at' | 'column_id' | 'position'
>>

export interface MoveTask {
  taskId:         string
  targetColumnId: string
  position:       number
}
```

#### Plik: `src/types/home/activity.types.ts`

```typescript
export interface ActivityEvent {
  id:           string      // UUID v4
  household_id: string      // UUID
  actor_id:     string | null  // UUID usera lub null (system action)
  actor_name:   string | null  // Nazwa wyświetlana, nawet po usunięciu usera
  action:       string      // np. 'shopping_added', 'task_moved', 'task_completed'
  entity_type:  string      // np. 'shopping_item', 'task', 'member'
  entity_id:    string | null  // UUID encji (może być usunięta)
  entity_name:  string | null  // Nazwa encji (zapisana redundantnie)
  details:      Record<string, unknown>  // Elastyczne JSONB dane
  created_at:   string      // ISO 8601
}
```

#### Plik: `src/types/home/household.types.ts`

```typescript
export type HouseholdRole = 'ADMIN' | 'HELPER+' | 'HELPER'

export interface Household {
  id:          string   // UUID v4
  name:        string   // Nazwa household, np. "Rodzina Kowalskich"
  invite_code: string   // Unikalny kod zaproszenia (6-12 znaków)
  created_at:  string   // ISO 8601
  updated_at:  string   // ISO 8601
}

export interface HouseholdMember {
  id:           string         // UUID v4
  household_id: string         // UUID
  user_id:      string         // UUID (auth.users)
  role:         HouseholdRole  // 'ADMIN' | 'HELPER+' | 'HELPER'
  joined_at:    string         // ISO 8601
}
```

#### Plik: `src/types/home/index.ts` (barrel export)

```typescript
export * from './shopping.types'
export * from './tasks.types'
export * from './activity.types'
export * from './household.types'
```

---

### Hook 1: `useShoppingList`

**Plik:** `src/hooks/home/useShoppingList.ts`

```typescript
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ShoppingItem, ShoppingItemCreate, ShoppingItemUpdate } from '@/types/home'

interface UseShoppingListReturn {
  items:        ShoppingItem[]
  addItem:      (dto: Omit<ShoppingItemCreate, 'household_id'>) => Promise<void>
  toggleBought: (itemId: string, currentValue: boolean) => Promise<void>
  updateItem:   (itemId: string, updates: ShoppingItemUpdate) => Promise<void>
  deleteItem:   (itemId: string) => Promise<void>
  loading:      boolean
  error:        string | null
}
```

**Implementacja krok po kroku:**

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ShoppingItem, ShoppingItemCreate, ShoppingItemUpdate } from '@/types/home'

export function useShoppingList(householdId: string | undefined): UseShoppingListReturn {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ──────────────────────────────────────────────────
  // 1. INITIAL FETCH
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) {
      setLoading(false)
      return
    }

    // Funkcja fetch — wywołuje API route (nie bezpośrednio Supabase)
    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/home/shopping?household_id=${householdId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { data } = await res.json()
        // Sortuj: is_bought=false pierwsze, potem created_at ASC
        const sorted = (data as ShoppingItem[]).sort((a, b) => {
          if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
        setItems(sorted)
      } catch (err) {
        setError('Nie udało się załadować listy zakupów')
        console.error('[useShoppingList] fetchItems error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [householdId])

  // ──────────────────────────────────────────────────
  // 2. REALTIME SUBSCRIPTION
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) return

    const supabase = createClient()

    // Unikalna nazwa kanału — per household
    const channel = supabase
      .channel(`shopping:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',           // INSERT, UPDATE, DELETE
          schema: 'public',
          table:  'shopping_items',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as ShoppingItem
            setItems(prev => {
              // Usuń ewentualny optimistic item (temp-*) o tej samej nazwie i kategorii
              // i dodaj prawdziwy rekord
              const withoutTemp = prev.filter(i => !i.id.startsWith('temp-'))
              return sortItems([...withoutTemp, newItem])
            })
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ShoppingItem
            setItems(prev => sortItems(
              prev.map(i => i.id === updated.id ? updated : i)
            ))
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id as string
            setItems(prev => prev.filter(i => i.id !== deletedId))
          }
        }
      )
      .subscribe()

    // Cleanup przy unmount lub zmianie householdId
    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId])

  // ──────────────────────────────────────────────────
  // 3. MUTACJE z OPTIMISTIC UPDATE
  // ──────────────────────────────────────────────────

  // addItem: optimistic INSERT → potem API → rollback przy błędzie
  const addItem = useCallback(async (dto: Omit<ShoppingItemCreate, 'household_id'>) => {
    if (!householdId) return

    // 3a. Stwórz tymczasowy item z temp-id
    const tempId = `temp-${Date.now()}`
    const optimisticItem: ShoppingItem = {
      id:           tempId,
      household_id: householdId,
      name:         dto.name,
      category:     dto.category ?? 'Inne',
      quantity:     dto.quantity,
      unit:         dto.unit ?? null,
      is_bought:    false,
      bought_at:    null,
      added_by:     null,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }

    // 3b. Dodaj do state natychmiast
    setItems(prev => sortItems([...prev, optimisticItem]))

    try {
      // 3c. Wyślij do API
      const res = await fetch('/api/home/shopping', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...dto, household_id: householdId }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      // 3d. Real-time event zastąpi temp item — NIE robimy ręcznie replace tutaj
      // (Supabase INSERT event usunie temp i doda prawdziwy rekord — patrz subscription handler)
    } catch (err) {
      // 3e. Rollback: usuń temp item
      setItems(prev => prev.filter(i => i.id !== tempId))
      setError('Nie udało się dodać produktu')
      console.error('[useShoppingList] addItem error:', err)
    }
  }, [householdId])

  // toggleBought: optimistic UPDATE is_bought
  const toggleBought = useCallback(async (itemId: string, currentValue: boolean) => {
    const newValue = !currentValue

    // Optimistic update
    setItems(prev => sortItems(
      prev.map(i => i.id === itemId
        ? { ...i, is_bought: newValue, bought_at: newValue ? new Date().toISOString() : null }
        : i
      )
    ))

    try {
      const res = await fetch(`/api/home/shopping/${itemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_bought: newValue }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Real-time UPDATE event uaktualni state z danymi z bazy (bought_at z triggera)
    } catch (err) {
      // Rollback
      setItems(prev => sortItems(
        prev.map(i => i.id === itemId
          ? { ...i, is_bought: currentValue, bought_at: currentValue ? i.bought_at : null }
          : i
        )
      ))
      setError('Nie udało się zaktualizować produktu')
    }
  }, [])

  // updateItem: optimistic UPDATE dla name/quantity/category/unit
  const updateItem = useCallback(async (itemId: string, updates: ShoppingItemUpdate) => {
    // Zapamiętaj poprzedni stan do rollback
    let previousItem: ShoppingItem | undefined

    setItems(prev => {
      const found = prev.find(i => i.id === itemId)
      previousItem = found ? { ...found } : undefined
      return prev.map(i => i.id === itemId ? { ...i, ...updates } : i)
    })

    try {
      const res = await fetch(`/api/home/shopping/${itemId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      if (previousItem) {
        setItems(prev => prev.map(i => i.id === itemId ? previousItem! : i))
      }
      setError('Nie udało się zaktualizować produktu')
    }
  }, [])

  // deleteItem: optimistic DELETE
  const deleteItem = useCallback(async (itemId: string) => {
    let deletedItem: ShoppingItem | undefined

    // Optimistic remove
    setItems(prev => {
      deletedItem = prev.find(i => i.id === itemId)
      return prev.filter(i => i.id !== itemId)
    })

    try {
      const res = await fetch(`/api/home/shopping/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      // Rollback
      if (deletedItem) {
        setItems(prev => sortItems([...prev, deletedItem!]))
      }
      setError('Nie udało się usunąć produktu')
    }
  }, [])

  return { items, addItem, toggleBought, updateItem, deleteItem, loading, error }
}

// ──────────────────────────────────────────────────
// HELPER: sortowanie items
// ──────────────────────────────────────────────────
function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}
```

---

### Hook 2: `useTasks`

**Plik:** `src/hooks/home/useTasks.ts`

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { ColumnWithTasks, Task, TaskCreate, TaskUpdate, MoveTask } from '@/types/home'

interface UseTasksReturn {
  columns:    ColumnWithTasks[]
  addTask:    (dto: Omit<TaskCreate, 'household_id'> & { household_id?: string }) => Promise<void>
  moveTask:   (params: MoveTask) => Promise<void>
  updateTask: (taskId: string, updates: TaskUpdate) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  loading:    boolean
  error:      string | null
}
```

**Implementacja krok po kroku:**

```typescript
export function useTasks(householdId: string | undefined): UseTasksReturn {
  const [columns, setColumns] = useState<ColumnWithTasks[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  // 1. INITIAL FETCH (columns + tasks)
  useEffect(() => {
    if (!householdId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/home/tasks?household_id=${householdId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(({ data }) => setColumns(data ?? []))
      .catch(() => setError('Nie udało się załadować zadań'))
      .finally(() => setLoading(false))
  }, [householdId])

  // 2. REALTIME SUBSCRIPTION — tasks tabela
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`tasks:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'tasks',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task
            setColumns(prev => prev.map(col =>
              col.id === newTask.column_id
                ? { ...col, tasks: sortTasks([...col.tasks, newTask]) }
                : col
            ))
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task
            const oldTask = payload.old as Partial<Task>
            setColumns(prev => {
              // Task mógł zmienić kolumnę — usuń ze starej, dodaj do nowej
              return prev.map(col => {
                let tasks = col.tasks.filter(t => t.id !== updated.id)
                if (col.id === updated.column_id) {
                  tasks = sortTasks([...tasks, updated])
                }
                return { ...col, tasks }
              })
            })
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id as string
            setColumns(prev => prev.map(col => ({
              ...col,
              tasks: col.tasks.filter(t => t.id !== deletedId)
            })))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId])

  // 3. REALTIME SUBSCRIPTION — columns tabela (jeśli ktoś doda/usunie kolumnę)
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`columns:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'columns',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          // Przy zmianie kolumn: refetch całości (rzadkie zdarzenie)
          fetch(`/api/home/tasks?household_id=${householdId}`)
            .then(r => r.json())
            .then(({ data }) => setColumns(data ?? []))
            .catch(() => {})
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId])

  // 4. addTask
  const addTask = useCallback(async (dto: TaskCreate) => {
    if (!householdId) return

    const tempId = `temp-${Date.now()}`
    const optimisticTask: Task = {
      id:           tempId,
      household_id: householdId,
      column_id:    dto.column_id,
      title:        dto.title,
      description:  dto.description ?? null,
      priority:     dto.priority ?? 'medium',
      position:     999999, // na końcu tymczasowo
      assigned_to:  dto.assigned_to ?? null,
      due_date:     dto.due_date ?? null,
      completed_at: null,
      created_by:   null,
      created_at:   new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }

    // Optimistic: dodaj do właściwej kolumny
    setColumns(prev => prev.map(col =>
      col.id === dto.column_id
        ? { ...col, tasks: sortTasks([...col.tasks, optimisticTask]) }
        : col
    ))

    try {
      const res = await fetch('/api/home/tasks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...dto, household_id: householdId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // Real-time INSERT zastąpi temp task
    } catch (err) {
      // Rollback
      setColumns(prev => prev.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t.id !== tempId)
      })))
      setError('Nie udało się dodać zadania')
    }
  }, [householdId])

  // 5. moveTask (drag & drop)
  const moveTask = useCallback(async ({ taskId, targetColumnId, position }: MoveTask) => {
    // Znajdź task i jego poprzednią kolumnę
    let movedTask: Task | undefined
    let sourceColumnId: string | undefined

    for (const col of columns) {
      const found = col.tasks.find(t => t.id === taskId)
      if (found) {
        movedTask = found
        sourceColumnId = col.id
        break
      }
    }
    if (!movedTask || !sourceColumnId) return

    const previousColumns = columns  // snapshot do rollback

    // Optimistic: przenieś task
    setColumns(prev => prev.map(col => {
      if (col.id === sourceColumnId) {
        return { ...col, tasks: col.tasks.filter(t => t.id !== taskId) }
      }
      if (col.id === targetColumnId) {
        const updated: Task = { ...movedTask!, column_id: targetColumnId, position }
        return { ...col, tasks: sortTasks([...col.tasks, updated]) }
      }
      return col
    }))

    try {
      const res = await fetch(`/api/home/tasks/${taskId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ column_id: targetColumnId, position }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      // Rollback
      setColumns(previousColumns)
      setError('Nie udało się przenieść zadania')
    }
  }, [columns])

  // 6. updateTask
  const updateTask = useCallback(async (taskId: string, updates: TaskUpdate) => {
    const previousColumns = columns

    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
    })))

    try {
      const res = await fetch(`/api/home/tasks/${taskId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(updates),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      setColumns(previousColumns)
      setError('Nie udało się zaktualizować zadania')
    }
  }, [columns])

  // 7. deleteTask
  const deleteTask = useCallback(async (taskId: string) => {
    const previousColumns = columns

    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: col.tasks.filter(t => t.id !== taskId)
    })))

    try {
      const res = await fetch(`/api/home/tasks/${taskId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      setColumns(previousColumns)
      setError('Nie udało się usunąć zadania')
    }
  }, [columns])

  return { columns, addTask, moveTask, updateTask, deleteTask, loading, error }
}

// HELPER
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.position - b.position)
}
```

---

### Hook 3: `useActivity`

**Plik:** `src/hooks/home/useActivity.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityEvent } from '@/types/home'

interface UseActivityReturn {
  events:  ActivityEvent[]
  loading: boolean
  error:   string | null
}

export function useActivity(householdId: string | undefined, limit = 20): UseActivityReturn {
  const [events, setEvents]   = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // 1. INITIAL FETCH — bezpośrednio przez Supabase client (read-only, brak API route)
  useEffect(() => {
    if (!householdId) { setLoading(false); return }

    const supabase = createClient()

    async function fetchEvents() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (fetchError) {
        setError('Nie udało się załadować aktywności')
        console.error('[useActivity] fetch error:', fetchError)
      } else {
        setEvents(data ?? [])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [householdId, limit])

  // 2. REALTIME SUBSCRIPTION — nasłuchuj na nowe INSERT
  useEffect(() => {
    if (!householdId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`activity:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',   // tylko nowe zdarzenia — stare nie są modyfikowane
          schema: 'public',
          table:  'activity_log',
          filter: `household_id=eq.${householdId}`,
        },
        (payload) => {
          const newEvent = payload.new as ActivityEvent
          setEvents(prev => {
            // Dodaj na górę (najnowszy pierwszy), przytnij do limit
            const updated = [newEvent, ...prev]
            return updated.slice(0, limit)
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId, limit])

  return { events, loading, error }
}
```

---

### Hook 4: `useHousehold`

**Plik:** `src/hooks/home/useHousehold.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Household, HouseholdMember } from '@/types/home'

interface UseHouseholdReturn {
  household: Household | null
  members:   HouseholdMember[]
  loading:   boolean
  error:     string | null
  refetch:   () => void
}

export function useHousehold(): UseHouseholdReturn {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers]     = useState<HouseholdMember[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = () => setRefetchTrigger(n => n + 1)

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      setLoading(true)
      setError(null)

      try {
        // 1. Pobierz aktualnego usera
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          setError('Nie jesteś zalogowany')
          return
        }

        // 2. Sprawdź czy user ma household (przez household_members)
        const { data: memberRows, error: memberError } = await supabase
          .from('household_members')
          .select('household_id, role')
          .eq('user_id', user.id)
          .limit(1)
          .single()

        if (memberError && memberError.code !== 'PGRST116') {
          // PGRST116 = no rows found (OK, user nie ma household)
          throw memberError
        }

        // 3. Jeśli user NIE ma household → stwórz go (przez server-side API)
        let householdId: string

        if (!memberRows) {
          // 3a. Wywołaj API route która tworzy household + dodaje usera jako ADMIN (service role)
          const res = await fetch('/api/home/household', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name: 'Moja Rodzina' }),
          })
          if (!res.ok) throw new Error('Nie udało się stworzyć household')
          const { data: newHousehold } = await res.json()
          householdId = newHousehold.id
        } else {
          householdId = memberRows.household_id
        }

        // 4. Pobierz dane household
        const { data: householdData, error: householdError } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .single()

        if (householdError) throw householdError

        // 5. Pobierz listę członków household
        const { data: membersData, error: membersError } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', householdId)

        if (membersError) throw membersError

        setHousehold(householdData as Household)
        setMembers(membersData as HouseholdMember[] ?? [])

      } catch (err) {
        console.error('[useHousehold] error:', err)
        setError('Nie udało się załadować danych household')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [refetchTrigger])

  return { household, members, loading, error, refetch }
}
```

Uwaga: `POST /api/home/household` (tworzenie household) to endpoint spoza STORY-4.2 — tworzony w STORY-4.7. Tymczasowo hook może tworzyć household bezpośrednio przez Supabase (INSERT households, potem przez service role INSERT household_members). Finalne rozwiązanie: API route.

---

### Obsługa błędów na styku

```typescript
// src/hooks/home/errors.ts
export const HOME_ERROR_MESSAGES: Record<number, string> = {
  400: 'Sprawdź poprawność wypełnionych pól',
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Element nie został znaleziony',
  500: 'Wystąpił błąd serwera — spróbuj ponownie za chwilę',
}

export function getErrorMessage(statusCode: number): string {
  return HOME_ERROR_MESSAGES[statusCode] ?? 'Wystąpił nieoczekiwany błąd'
}
```

---

## ⚠️ Edge Cases

### EC-1: Double-subscription przy StrictMode (React 18)
Scenariusz: React 18 StrictMode montuje i odmontowuje komponenty dwukrotnie w development. Dwa kanały Supabase do tego samego tematu mogą powodować duplikację eventów.
Oczekiwane zachowanie: Cleanup `useEffect` (return () => supabase.removeChannel(channel)) musi się wykonać przed nowym mount. Supabase JS v2 poprawnie obsługuje `removeChannel` — kanał jest usuwany. Brak duplikatów w prodzie (StrictMode nie działa w prodzie).
Implementacja: Zawsze zwracaj cleanup function z każdego `useEffect` który tworzy channel.

### EC-2: Optimistic item nie zostaje zastąpiony przez real-time event (INSERT nie przyszedł)
Scenariusz: API POST `/api/home/shopping` zwróciło 201 (success), ale Supabase Realtime event INSERT nie dotarł do klienta (chwilowa utrata połączenia WebSocket).
Oczekiwane zachowanie: Tymczasowy item (temp-id) pozostaje widoczny. Przy następnym refetch (np. powrót do strony lub `window.focus`) hook wykonuje fresh fetch który pobiera prawdziwy rekord.
Implementacja: Dodaj `window.addEventListener('focus', fetchItems)` w `useShoppingList` useEffect — po refocusie strony wykonaj refetch. Alternatywnie: po 5 sekundach od addItem wywołaj refetch jeśli temp-id nadal istnieje.

### EC-3: Realtime event dla innego household
Scenariusz: Filter `household_id=eq.${householdId}` nie jest obsługiwany przez Supabase Realtime dla tabel bez `REPLICA IDENTITY FULL`. Domyślnie Supabase Realtime dla DELETE zwraca tylko primary key (bez other columns), a filter może nie działać poprawnie.
Oczekiwane zachowanie: Włącz `REPLICA IDENTITY FULL` dla tabel z subscriptions: `ALTER TABLE shopping_items REPLICA IDENTITY FULL;`. To pozwala Supabase wysyłać pełny rekord przy DELETE i poprawnie filtrować.
Implementacja: Dodaj do migracji STORY-4.1 (lub oddzielna migracja):
```sql
ALTER TABLE shopping_items REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE activity_log REPLICA IDENTITY FULL;
```

### EC-4: moveTask — gap w pozycjach (rebalance)
Scenariusz: Po wielu drag & drop operacjach, wszystkie taski mają tę samą pozycję (np. 1000) lub nie można wstawić między dwa istniejące (pozycje 1000 i 1001 — brak miejsca na 1000.5).
Oczekiwane zachowanie: moveTask używa algorytmu fractional indexing — gdy wstawia między dwa taski o pozycjach A i B, nowa pozycja = (A + B) / 2. Gdy liczba między A i B < 1 (pełne liczby, krok 1), wykonaj **rebalance**: przepisz wszystkie pozycje w tej kolumnie jako wielokrotności 1000 (1000, 2000, 3000...).
Implementacja uproszczona dla v1: Przy każdym drag & drop przepisz całą tablicę tasków w kolumnie docelowej:
```typescript
const rebalancedTasks = targetColTasks
  .sort((a, b) => a.position - b.position)
  .map((t, i) => ({ ...t, position: (i + 1) * 1000 }))
```
Potem PATCH każdy task z nową pozycją (batch). Dla v1 to wystarczy — board nie będzie miał >100 tasków.

---

## 🚫 Out of Scope tej Story
- Serwis API client (`/services/home/shopping.service.ts`) — hooks wywołują fetch bezpośrednio, bez dodatkowej warstwy serwisu
- Paginacja listy zakupów i tasków — v1 pobiera wszystkie; household ma max ~100 items
- Hook dla Household Analytics (`useAnalytics`) — STORY-4.8
- Hook dla Kanban drag & drop physics (dnd-kit) — STORY-4.5 (frontend)
- Error toasts (wyświetlanie error z hooka) — STORY-4.4/4.5 (komponenty decydują jak pokazać error)
- Persystencja state do localStorage (offline mode) — poza zakresem v1

---

## ✔️ Definition of Done
- [ ] Wszystkie 4 pliki hooks istnieją: `useShoppingList.ts`, `useTasks.ts`, `useActivity.ts`, `useHousehold.ts`
- [ ] Wszystkie typy wyeksportowane z `src/types/home/index.ts`
- [ ] Brak użycia `any` w żadnym pliku — wszystko otypowane
- [ ] `'use client'` directive na początku każdego pliku hooks
- [ ] Cleanup `useEffect` usuwa Supabase channel przy unmount
- [ ] Optimistic update działa dla: addItem, toggleBought, deleteItem, addTask, moveTask, deleteTask
- [ ] Rollback działa przy błędzie API (state wraca do poprzedniej wartości)
- [ ] Real-time subscription obsługuje INSERT, UPDATE, DELETE dla shopping_items i tasks
- [ ] `useHousehold` tworzy household jeśli user go nie ma
- [ ] TypeScript kompiluje bez błędów (`next build` lub `tsc --noEmit`)
- [ ] Kod przechodzi linter (eslint) bez błędów
- [ ] `REPLICA IDENTITY FULL` ustawiony dla tabel z real-time subscriptions (w STORY-4.1 lub oddzielna migracja)
- [ ] Story review przez PO
