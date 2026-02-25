'use client'

/**
 * components/eval/CategoryFilter.tsx
 * STORY-7.6 — Category filter buttons for Golden Tasks.
 * Buttons: ALL | API | Auth | CRUD | Pipeline | Reasoning | Home
 */

import { EVAL_CATEGORIES } from '@/lib/eval/types'

const CATEGORIES = ['ALL', ...EVAL_CATEGORIES] as const
type CategoryOption = typeof CATEGORIES[number]

interface CategoryFilterProps {
  selected: string
  onChange: (cat: string) => void
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '16px',
      }}
      role="toolbar"
      aria-label="Filtruj po kategorii"
    >
      {CATEGORIES.map((cat: CategoryOption) => {
        const isActive = selected === cat
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            aria-pressed={isActive}
            style={{
              background: isActive ? '#818cf8' : 'transparent',
              border: isActive ? '1px solid #818cf8' : '1px solid #2a2540',
              borderRadius: '20px',
              color: isActive ? '#fff' : '#a0a0b8',
              fontSize: '12px',
              fontWeight: 600,
              padding: '5px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        )
      })}
    </div>
  )
}
