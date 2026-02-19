'use client'

// components/home/kanban/QuickAddTask.tsx
// Szybkie dodawanie zadania do kolumny — AC-6

import { useState } from 'react'

interface QuickAddTaskProps {
  onAdd: (title: string) => Promise<void> | void
}

export function QuickAddTask({ onAdd }: QuickAddTaskProps) {
  const [value, setValue] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleAdd = async () => {
    const trimmed = value.trim()
    if (!trimmed || isPending) return
    setIsPending(true)
    try {
      await onAdd(trimmed)
      setValue('')
    } finally {
      setIsPending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleAdd()
    }
  }

  return (
    <div className="flex gap-[6px] mb-[10px]">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Szybkie zadanie..."
        disabled={isPending}
        maxLength={200}
        className="flex-1 bg-[#13111c] border border-[#2a2540] rounded-[7px] px-[10px] py-[6px] text-[12px] text-[#e6edf3] placeholder:text-[#3d3757] outline-none focus:border-[#7c3aed] transition-colors min-h-[44px] disabled:opacity-50"
        aria-label="Tytuł nowego zadania"
      />
      <button
        onClick={() => void handleAdd()}
        disabled={!value.trim() || isPending}
        className="w-[44px] h-[44px] bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-[7px] text-white text-[18px] flex items-center justify-center flex-shrink-0 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-opacity"
        aria-label="Dodaj zadanie"
      >
        {isPending ? (
          <span className="w-[14px] h-[14px] border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          '+'
        )}
      </button>
    </div>
  )
}
