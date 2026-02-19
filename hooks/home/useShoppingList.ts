'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/realtime-js'
import { createClient } from '@/lib/supabase/client'
import type { ShoppingItem, ShoppingItemCreate, ShoppingItemUpdate } from '@/types/home'

// ──────────────────────────────────────────────────
// Return type
// ──────────────────────────────────────────────────
interface UseShoppingListReturn {
  items:        ShoppingItem[]
  addItem:      (dto: Omit<ShoppingItemCreate, 'household_id'>) => Promise<void>
  toggleBought: (itemId: string, currentValue: boolean) => Promise<void>
  updateItem:   (itemId: string, updates: ShoppingItemUpdate) => Promise<void>
  deleteItem:   (itemId: string) => Promise<void>
  loading:      boolean
  error:        string | null
}

// ──────────────────────────────────────────────────
// Helper: sort items — is_bought=false first, then by created_at ASC
// ──────────────────────────────────────────────────
function sortItems(items: ShoppingItem[]): ShoppingItem[] {
  return [...items].sort((a, b) => {
    if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}

// ──────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────
export function useShoppingList(householdId: string | undefined): UseShoppingListReturn {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ────────────────────────────────────────────────
  // 1. INITIAL FETCH + window focus refetch
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) {
      setLoading(false)
      return
    }

    async function fetchItems() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/home/shopping?household_id=${householdId}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const { data } = (await res.json()) as { data: ShoppingItem[] }
        setItems(sortItems(data ?? []))
      } catch (err) {
        setError('Nie udało się załadować listy zakupów')
        console.error('[useShoppingList] fetchItems error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()

    // EC-2: refetch on window focus (catches missed real-time events)
    const onFocus = () => { void fetchItems() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [householdId])

  // ────────────────────────────────────────────────
  // 2. REALTIME SUBSCRIPTION
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!householdId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`shopping:${householdId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'shopping_items',
          filter: `household_id=eq.${householdId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as unknown as ShoppingItem
            setItems(prev => {
              // Remove any optimistic temp items (same-name optimistic item)
              // and add the real record
              const withoutTemp = prev.filter(i => !i.id.startsWith('temp-'))
              // Avoid duplicate if already present
              if (withoutTemp.some(i => i.id === newItem.id)) return sortItems(withoutTemp)
              return sortItems([...withoutTemp, newItem])
            })
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as unknown as ShoppingItem
            setItems(prev => sortItems(
              prev.map(i => i.id === updated.id ? updated : i)
            ))
          }

          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id
            setItems(prev => prev.filter(i => i.id !== deletedId))
          }
        }
      )
      .subscribe()

    // Cleanup: AC-7
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [householdId])

  // ────────────────────────────────────────────────
  // 3. MUTATIONS with OPTIMISTIC UPDATES
  // ────────────────────────────────────────────────

  // addItem — AC-2: optimistic INSERT → API → rollback on error
  const addItem = useCallback(async (dto: Omit<ShoppingItemCreate, 'household_id'>) => {
    if (!householdId) return

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

    // Optimistic: add to state immediately
    setItems(prev => sortItems([...prev, optimisticItem]))

    try {
      const res = await fetch('/api/home/shopping', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...dto, household_id: householdId }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      // Real-time INSERT event will replace the temp item (see subscription handler above)
    } catch (err) {
      // Rollback: remove temp item
      setItems(prev => prev.filter(i => i.id !== tempId))
      setError('Nie udało się dodać produktu')
      console.error('[useShoppingList] addItem error:', err)
    }
  }, [householdId])

  // toggleBought — optimistic UPDATE
  const toggleBought = useCallback(async (itemId: string, currentValue: boolean) => {
    const newValue = !currentValue

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
      // Real-time UPDATE event will sync bought_at from DB trigger
    } catch (err) {
      // Rollback
      setItems(prev => sortItems(
        prev.map(i => i.id === itemId
          ? { ...i, is_bought: currentValue, bought_at: currentValue ? i.bought_at : null }
          : i
        )
      ))
      setError('Nie udało się zaktualizować produktu')
      console.error('[useShoppingList] toggleBought error:', err)
    }
  }, [])

  // updateItem — optimistic UPDATE for name/quantity/category/unit
  const updateItem = useCallback(async (itemId: string, updates: ShoppingItemUpdate) => {
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
      // Rollback
      if (previousItem) {
        const prev = previousItem
        setItems(items => items.map(i => i.id === itemId ? prev : i))
      }
      setError('Nie udało się zaktualizować produktu')
      console.error('[useShoppingList] updateItem error:', err)
    }
  }, [])

  // deleteItem — optimistic DELETE
  const deleteItem = useCallback(async (itemId: string) => {
    let deletedItem: ShoppingItem | undefined

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
        const item = deletedItem
        setItems(prev => sortItems([...prev, item]))
      }
      setError('Nie udało się usunąć produktu')
      console.error('[useShoppingList] deleteItem error:', err)
    }
  }, [])

  return { items, addItem, toggleBought, updateItem, deleteItem, loading, error }
}
