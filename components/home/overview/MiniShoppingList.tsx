'use client'
// components/home/overview/MiniShoppingList.tsx
// AC-5, AC-6 — Max 5 niekupionych produktów z optimistic checkbox toggle

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ShoppingItem } from '@/types/home'

interface MiniShoppingListProps {
  items:        ShoppingItem[]   // Already sliced to 5, is_bought=false
  isLoading:    boolean
  onToggle:     (itemId: string, currentValue: boolean) => Promise<void>
}

// Skeleton
function SkeletonRow() {
  return (
    <div
      className="animate-pulse"
      style={{
        height:       '32px',
        background:   '#2a2540',
        borderRadius: '6px',
      }}
      aria-hidden="true"
    />
  )
}

interface CheckboxProps {
  item:     ShoppingItem
  onToggle: (itemId: string, currentValue: boolean) => Promise<void>
}

function ShoppingRow({ item, onToggle }: CheckboxProps) {
  const [optimistic, setOptimistic] = useState(false)

  async function handleToggle() {
    // Optimistic: zaznacz natychmiast
    setOptimistic(true)
    try {
      await onToggle(item.id, item.is_bought)
      // Sukces — item zniknie z listy po re-renderze rodzica
    } catch {
      // Rollback
      setOptimistic(false)
      toast.error('Nie udało się oznaczyć produktu')
    }
  }

  const checked = optimistic || item.is_bought

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Checkbox — AC-6: optimistic toggle */}
      <button
        role="checkbox"
        aria-checked={checked}
        aria-label={`Oznacz "${item.name}" jako kupione`}
        onClick={() => { void handleToggle() }}
        style={{
          width:        '16px',
          height:       '16px',
          flexShrink:   0,
          borderRadius: '4px',
          border:       checked ? 'none' : '1.5px solid #3b3d7a',
          background:   checked ? 'linear-gradient(135deg, #818cf8, #3b82f6)' : 'transparent',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'center',
          cursor:       'pointer',
          fontSize:     '10px',
          color:        '#fff',
          transition:   'background 0.15s',
        }}
        className="focus:outline-none focus:ring-2 focus:ring-[#818cf8]"
      >
        {checked ? '✓' : ''}
      </button>

      {/* Nazwa */}
      <span
        style={{
          fontSize:       '12px',
          color:          checked ? '#4b4569' : '#e6edf3',
          flex:           1,
          textDecoration: checked ? 'line-through' : 'none',
        }}
      >
        {item.name}
      </span>

      {/* Kategoria tag */}
      {item.category && (
        <span
          style={{
            fontSize:     '9px',
            color:        '#4b4569',
            background:   '#13111c',
            padding:      '2px 6px',
            borderRadius: '5px',
          }}
        >
          {item.category}
        </span>
      )}
    </div>
  )
}

export function MiniShoppingList({ items, isLoading, onToggle }: MiniShoppingListProps) {
  const router = useRouter()

  return (
    <section
      style={{
        background:   '#1a1730',
        border:       '1px solid #2a2540',
        borderRadius: '10px',
        padding:      '16px',
      }}
      aria-label="Mini lista zakupów"
    >
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-3">
        <div
          style={{
            fontSize:   '13px',
            fontWeight: 700,
            color:      '#e6edf3',
          }}
        >
          🛒 Lista zakupów
        </div>
        <button
          onClick={() => router.push('/home/shopping')}
          style={{
            fontSize:    '11px',
            color:       '#818cf8',
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            fontWeight:  500,
          }}
          className="focus:outline-none focus:ring-2 focus:ring-[#818cf8] rounded"
        >
          Pokaż wszystkie →
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <p style={{ color: '#4b4569', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
          Brak produktów do kupienia 🎉
        </p>
      ) : (
        <div className="divide-y divide-[#2a2540]">
          {items.map(item => (
            <ShoppingRow key={item.id} item={item} onToggle={onToggle} />
          ))}
        </div>
      )}

      {/* Error state jest obsługiwany wyżej — tu tylko empty/loading/filled */}
    </section>
  )
}
