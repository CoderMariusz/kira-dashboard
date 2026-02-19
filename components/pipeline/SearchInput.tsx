'use client'

// components/pipeline/SearchInput.tsx
// Input wyszukiwania z debounce 300ms.
// Implementuje STORY-2.7 — AC-2.

import { useEffect, useState, useRef } from 'react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * Input wyszukiwania z debounce 300ms.
 *
 * Wyświetla wpisywaną wartość natychmiast (UX), ale propaguje zmianę
 * do onChange dopiero po 300ms od ostatniego keystroke (AC-2, EC-2).
 *
 * Keyboard: Escape czyści input (AC-2 keyboard navigation).
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Szukaj po ID lub tytule...',
}: SearchInputProps) {
  // Wewnętrzny state dla natychmiastowego wyświetlania wartości
  const [inputValue, setInputValue] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Synchronizuj inputValue z zewnętrznym value (np. reset filtrów - AC-8)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Cleanup timer przy unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue) // Natychmiastowa aktualizacja input (UX)

    // Debounce: wywołaj onChange po 300ms od ostatniego keystroke (EC-2)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onChange(newValue)
    }, 300)
  }

  // Escape czyści search input (keyboard navigation)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setInputValue('')
      if (timerRef.current) clearTimeout(timerRef.current)
      onChange('')
    }
  }

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      aria-label="Wyszukaj story po ID lub tytule"
      style={{
        background: '#13111c',
        border: '1px solid #2a2540',
        borderRadius: '8px',
        padding: '6px 12px',
        color: '#e6edf3',
        fontSize: '12px',
        outline: 'none',
        minWidth: '220px',
        transition: 'border-color 0.15s',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#818cf8'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#2a2540'
      }}
    />
  )
}
