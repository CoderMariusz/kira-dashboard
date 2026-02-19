'use client'

import { useMemo, useState, useCallback } from 'react'
import { useHousehold } from '@/hooks/home/useHousehold'
import { useShoppingList } from '@/hooks/home/useShoppingList'
import { CategoryGroup } from './CategoryGroup'
import { BoughtSection } from './BoughtSection'
import { AddItemForm } from './AddItemForm'

// ──────────────────────────────────────────────────
// Skeleton component
// ──────────────────────────────────────────────────
function ShoppingListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-[#1a1730] border border-[#2a2540] rounded-[10px] overflow-hidden animate-pulse"
        >
          <div className="h-[44px] bg-[#2a2540]" />
          <div className="px-[14px] py-[10px] space-y-2">
            <div className="h-[28px] bg-[#1f1c2e] rounded" />
            <div className="h-[28px] bg-[#1f1c2e] rounded" />
            <div className="h-[28px] bg-[#1f1c2e] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────
// Empty state component
// ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">🛒</div>
      <h3 className="text-[16px] font-bold text-[#e6edf3] mb-2">
        Brak produktów na liście
      </h3>
      <p className="text-[12px] text-[#6b7280]">
        Dodaj pierwszy produkt do listy zakupów
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────────
// Error state component
// ──────────────────────────────────────────────────
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-4">⚠️</div>
      <h3 className="text-[16px] font-bold text-[#e6edf3] mb-2">
        Nie udało się załadować listy zakupów
      </h3>
      <p className="text-[12px] text-[#6b7280] mb-4">
        Sprawdź połączenie i spróbuj ponownie
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-[#2a2540] text-[#e6edf3] rounded-lg hover:bg-[#3b3d7a] transition-colors"
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}

// ──────────────────────────────────────────────────
// Progress bar component
// ──────────────────────────────────────────────────
function ProgressBar({
  boughtCount,
  totalCount,
  progressPercent,
}: {
  boughtCount: number
  totalCount: number
  progressPercent: number
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[12px] text-[#e6edf3]">
          Kupione: {boughtCount} / {totalCount}
        </span>
        <span className="text-[12px] text-[#4b4569]">
          {Math.round(progressPercent)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={boughtCount}
        aria-valuemax={totalCount}
        aria-label={`Postęp zakupów: ${boughtCount} z ${totalCount} produktów kupionych`}
        className="h-2 bg-[#2a2540] rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────
export function ShoppingList() {
  const { household, loading: householdLoading } = useHousehold()
  const {
    items,
    addItem,
    toggleBought,
    deleteItem,
    loading: itemsLoading,
    error,
  } = useShoppingList(household?.id)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Loading state
  const isLoading = householdLoading || itemsLoading

  // Computed values
  const { activeItems, boughtItems, progressPercent, groupedItems } = useMemo(() => {
    if (!items) {
      return {
        activeItems: [],
        boughtItems: [],
        progressPercent: 0,
        groupedItems: {},
      }
    }

    const active = items.filter(i => !i.is_bought)
    const bought = items.filter(i => i.is_bought)
    const pct = items.length > 0 ? (bought.length / items.length) * 100 : 0

    // Group active items by category
    const grouped: Record<string, typeof items> = {}
    for (const item of active) {
      const cat = item.category || 'Inne'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(item)
    }

    return { activeItems: active, boughtItems: bought, progressPercent: pct, groupedItems: grouped }
  }, [items])

  // Handle toggle
  const handleToggle = useCallback(
    async (itemId: string, currentValue: boolean) => {
      setTogglingId(itemId)
      try {
        await toggleBought(itemId, currentValue)
      } finally {
        setTogglingId(null)
      }
    },
    [toggleBought]
  )

  // Handle delete
  const handleDelete = useCallback(
    async (itemId: string) => {
      await deleteItem(itemId)
    },
    [deleteItem]
  )

  // Handle add item
  const handleAddItem = useCallback(
    async (data: { name: string; category: string; quantity: number; unit?: string | null }) => {
      setIsSubmitting(true)
      try {
        await addItem(data)
      } finally {
        setIsSubmitting(false)
      }
    },
    [addItem]
  )

  // Loading skeleton
  if (isLoading) {
    return (
      <div>
        <ShoppingListSkeleton />
      </div>
    )
  }

  // Error state
  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />
  }

  // Empty state
  if (!items || items.length === 0) {
    return (
      <div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full p-4 bg-[#1a1730] border border-dashed border-[#2a2540] rounded-[10px] text-[#4b4569] hover:border-[#7c3aed] hover:text-[#e6edf3] transition-colors"
        >
          ➕ Dodaj pierwszy produkt
        </button>
        <EmptyState />
        <AddItemForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleAddItem}
          isSubmitting={isSubmitting}
          existingItems={items || []}
        />
      </div>
    )
  }

  // Get ordered categories (sort by item count)
  const orderedCategories = Object.keys(groupedItems).sort((a, b) => {
    // 'Inne' always last
    if (a === 'Inne') return 1
    if (b === 'Inne') return -1
    return (groupedItems[b]?.length ?? 0) - (groupedItems[a]?.length ?? 0)
  })

  return (
    <div>
      {/* Header with add button */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-[18px] font-extrabold text-[#e6edf3] flex-1">
          🛒 Lista zakupów
        </h2>
        <span className="text-[12px] text-[#4b4569]">
          {activeItems.length} produktów do kupienia
        </span>
        <button
          onClick={() => setIsFormOpen(true)}
          className="px-3 py-1.5 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] text-white text-[12px] rounded-lg hover:opacity-90 transition-opacity"
        >
          ➕ Dodaj
        </button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <ProgressBar
          boughtCount={boughtItems.length}
          totalCount={items.length}
          progressPercent={progressPercent}
        />
      )}

      {/* Category groups */}
      <div>
        {orderedCategories.map(categoryName => (
          <CategoryGroup
            key={categoryName}
            categoryName={categoryName}
            items={groupedItems[categoryName] ?? []}
            onToggle={handleToggle}
            isToggling={togglingId}
          />
        ))}
      </div>

      {/* Bought section */}
      <BoughtSection
        items={items}
        onToggle={handleToggle}
        onDelete={handleDelete}
        isToggling={togglingId}
      />

      {/* Add item modal */}
      <AddItemForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddItem}
        isSubmitting={isSubmitting}
        existingItems={items ?? []}
      />
    </div>
  )
}
