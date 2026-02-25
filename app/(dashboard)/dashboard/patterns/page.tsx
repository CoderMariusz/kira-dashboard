'use client'

/**
 * app/(dashboard)/dashboard/patterns/page.tsx
 * STORY-8.4 — Patterns & Lessons page skeleton
 *
 * Route: /dashboard/patterns
 *
 * Features:
 *  - Tabs: Patterns / Lessons with URL state (?tab=)
 *  - Global search bar with 300ms debounce + URL state (?q=)
 *  - Tag dropdown filter with URL state (?tag=)
 *  - Loading skeleton (3 pulse cards)
 *  - Error state with "Odśwież" button
 *  - Empty state with search query in message
 *  - Placeholder content areas for STORY-8.5/8.6
 */

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { usePatternPage } from '@/hooks/usePatternPage'
import type { PatternCard, Lesson } from '@/types/patterns'
import { PatternGrid } from '@/components/patterns/PatternGrid'

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0d0c1a',
  card:      '#1a1730',
  border:    '#2a2540',
  accent:    '#818cf8',
  text:      '#e2e8f0',
  secondary: '#94a3b8',
  skeleton:  '#2a2540',
} as const

// ─── Utility: collect all unique tags from patterns + lessons ─────────────────
function collectTags(patterns: PatternCard[], lessons: Lesson[]): string[] {
  const set = new Set<string>()
  for (const p of patterns) p.tags.forEach(t => set.add(t))
  for (const l of lessons)  l.tags.forEach(t => set.add(t))
  return Array.from(set).sort()
}

// ─── Utility: filter patterns by query + tag ─────────────────────────────────
function filterPatterns(patterns: PatternCard[], query: string, tag: string): PatternCard[] {
  const q = query.toLowerCase()
  return patterns.filter(p => {
    const matchesQuery =
      !q ||
      p.text.toLowerCase().includes(q) ||
      (p.model  ?? '').toLowerCase().includes(q) ||
      (p.domain ?? '').toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))

    const matchesTag =
      !tag ||
      p.tags.some(t => t.toLowerCase() === tag.toLowerCase())

    return matchesQuery && matchesTag
  })
}

// ─── Utility: filter lessons by query + tag ───────────────────────────────────
function filterLessons(lessons: Lesson[], query: string, tag: string): Lesson[] {
  const q = query.toLowerCase()
  return lessons.filter(l => {
    const matchesQuery =
      !q ||
      l.title.toLowerCase().includes(q) ||
      l.body.toLowerCase().includes(q) ||
      l.lesson.toLowerCase().includes(q) ||
      l.tags.some(t => t.toLowerCase().includes(q))

    const matchesTag =
      !tag ||
      l.tags.some(t => t.toLowerCase() === tag.toLowerCase())

    return matchesQuery && matchesTag
  })
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function PatternsLoadingSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px',
        marginTop: '20px',
      }}
    >
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            background: C.skeleton,
            borderRadius: '12px',
            height: '120px',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

// ─── Error state ──────────────────────────────────────────────────────────────
function PatternsErrorState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: C.secondary,
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
      <p style={{ margin: '0 0 8px', fontSize: '14px', color: C.text }}>
        Nie można załadować danych — Bridge może być offline.
      </p>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: C.secondary }}>
        Spróbuj ponownie.
      </p>
      <button
        onClick={onRefresh}
        style={{
          background: C.accent,
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 600,
          padding: '8px 20px',
          cursor: 'pointer',
        }}
      >
        Odśwież
      </button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function PatternsEmptyState({ query }: { query: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '48px 24px',
        color: C.secondary,
      }}
    >
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <p style={{ margin: 0, fontSize: '14px', color: C.text }}>
        {query
          ? `Brak wyników dla „${query}" — spróbuj innego wyszukiwania`
          : 'Brak danych do wyświetlenia'}
      </p>
    </div>
  )
}

// ─── Tabs component ───────────────────────────────────────────────────────────
type TabValue = 'patterns' | 'lessons'

function PatternsTabs({
  active,
  onChange,
  patternCount,
  lessonCount,
}: {
  active: TabValue
  onChange: (tab: TabValue) => void
  patternCount: number
  lessonCount: number
}) {
  const tabs: { value: TabValue; label: string; count: number }[] = [
    { value: 'patterns', label: 'Patterns', count: patternCount },
    { value: 'lessons',  label: 'Lessons',  count: lessonCount  },
  ]

  return (
    <div
      role="tablist"
      aria-label="Sekcje strony"
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: `1px solid ${C.border}`,
        marginBottom: '20px',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={active === tab.value}
          onClick={() => onChange(tab.value)}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: active === tab.value
              ? `2px solid ${C.accent}`
              : '2px solid transparent',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: active === tab.value ? 600 : 400,
            color: active === tab.value ? C.accent : C.secondary,
            transition: 'color 0.15s, border-color 0.15s',
            marginBottom: '-1px',
          }}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              style={{
                marginLeft: '6px',
                background: active === tab.value ? C.accent : C.border,
                color: active === tab.value ? '#fff' : C.secondary,
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '1px 6px',
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Search bar + tag filter ──────────────────────────────────────────────────
function PatternsSearchBar({
  searchValue,
  onSearchChange,
  tagOptions,
  selectedTag,
  onTagChange,
}: {
  searchValue: string
  onSearchChange: (v: string) => void
  tagOptions: string[]
  selectedTag: string
  onTagChange: (v: string) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}
    >
      {/* Search input */}
      <div style={{ flex: '1 1 240px', position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: C.secondary,
            fontSize: '14px',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          🔍
        </span>
        <input
          type="text"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onSearchChange('') }}
          placeholder="Szukaj we wzorcach i lekcjach…"
          aria-label="Szukaj we wzorcach i lekcjach"
          maxLength={100}
          style={{
            width: '100%',
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            color: C.text,
            fontSize: '13px',
            padding: '8px 12px 8px 36px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tag dropdown */}
      {tagOptions.length > 0 && (
        <select
          value={selectedTag}
          onChange={e => onTagChange(e.target.value)}
          aria-label="Filtruj po tagu"
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '8px',
            color: selectedTag ? C.text : C.secondary,
            fontSize: '13px',
            padding: '8px 12px',
            cursor: 'pointer',
            minWidth: '140px',
          }}
        >
          <option value="">Wszystkie tagi</option>
          {tagOptions.map(tag => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

// ─── Main page content (uses useSearchParams) ─────────────────────────────────
function PatternsPageContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Read URL state
  const rawTab = searchParams.get('tab') ?? 'patterns'
  const activeTab: TabValue = rawTab === 'lessons' ? 'lessons' : 'patterns'
  const urlQuery = searchParams.get('q')  ?? ''
  const urlTag   = searchParams.get('tag') ?? ''

  // Local search input value (pre-debounce)
  const [searchInput, setSearchInput] = useState(urlQuery)

  // Sync local input when URL changes externally (e.g. back/forward)
  useEffect(() => {
    setSearchInput(urlQuery)
  }, [urlQuery])

  // ─── URL updater ─────────────────────────────────────────────────────────
  const updateUrl = useCallback(
    (tab: TabValue, q: string, tag: string) => {
      const params = new URLSearchParams()
      if (tab !== 'patterns') params.set('tab', tab)
      if (q)   params.set('q',   q)
      if (tag) params.set('tag', tag)
      const qs = params.toString()
      router.replace(`/dashboard/patterns${qs ? `?${qs}` : ''}`)
    },
    [router]
  )

  // ─── Handlers ────────────────────────────────────────────────────────────
  function handleTabChange(tab: TabValue) {
    updateUrl(tab, urlQuery, urlTag)
  }

  function handleTagChange(tag: string) {
    updateUrl(activeTab, urlQuery, tag)
  }

  // Search input: update local state immediately, debounce URL update 300ms
  function handleSearchInput(value: string) {
    setSearchInput(value)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      updateUrl(activeTab, searchInput, urlTag)
    }, 300)
    return () => clearTimeout(timer)
    // We intentionally only re-run when searchInput changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // ─── Data ─────────────────────────────────────────────────────────────────
  const { patterns, lessons, isLoading, error, refresh } = usePatternPage()

  // Derived: unique tags
  const tagOptions = useMemo(
    () => collectTags(patterns ?? [], lessons ?? []),
    [patterns, lessons]
  )

  // Derived: filtered data
  const filteredPatterns = useMemo(
    () => filterPatterns(patterns ?? [], urlQuery, urlTag),
    [patterns, urlQuery, urlTag]
  )

  const filteredLessons = useMemo(
    () => filterLessons(lessons ?? [], urlQuery, urlTag),
    [lessons, urlQuery, urlTag]
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100%' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: C.text,
          }}
        >
          Patterns &amp; Lessons
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.secondary }}>
          Baza wiedzy pipeline — wzorce, antywzorce i lekcje wyciągnięte z historii uruchomień
        </p>
      </div>

      {/* ── Search + Tags ── */}
      <PatternsSearchBar
        searchValue={searchInput}
        onSearchChange={handleSearchInput}
        tagOptions={tagOptions}
        selectedTag={urlTag}
        onTagChange={handleTagChange}
      />

      {/* ── Tabs ── */}
      <PatternsTabs
        active={activeTab}
        onChange={handleTabChange}
        patternCount={filteredPatterns.length}
        lessonCount={filteredLessons.length}
      />

      {/* ── Content ── */}
      {isLoading ? (
        <PatternsLoadingSkeleton />
      ) : error ? (
        <PatternsErrorState onRefresh={refresh} />
      ) : activeTab === 'patterns' ? (
        filteredPatterns.length === 0 ? (
          <PatternsEmptyState query={urlQuery} />
        ) : (
          <PatternGrid
            patterns={filteredPatterns}
            activeTag={urlTag || null}
            onTagFilter={handleTagChange}
          />
        )
      ) : (
        // Lessons tab
        filteredLessons.length === 0 ? (
          <PatternsEmptyState query={urlQuery} />
        ) : (
          <div
            style={{
              padding: '16px',
              background: C.card,
              borderRadius: '12px',
              border: `1px solid ${C.border}`,
              color: C.secondary,
              fontSize: '13px',
            }}
          >
            {/* Placeholder for STORY-8.6 — LessonItem list */}
            Lessons content here ({filteredLessons.length} lekcji)
          </div>
        )
      )}
    </div>
  )
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function PatternsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '20px', color: '#4b4569', fontSize: '13px' }}>
          Ładowanie Patterns &amp; Lessons…
        </div>
      }
    >
      <PatternsPageContent />
    </Suspense>
  )
}
