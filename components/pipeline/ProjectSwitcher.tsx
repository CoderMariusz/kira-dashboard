'use client'

// components/pipeline/ProjectSwitcher.tsx
// Multi-project switcher dropdown with per-project stats and "New Project" CTA.
// STORY-6.7: Project switcher and stats bar in Pipeline header.

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import type { ProjectStat, StatsResponse } from '@/types/bridge'

// ─── SWR Key ─────────────────────────────────────────────────────────────────

const STATS_SWR_KEY = '/api/projects/stats'

async function fetcher(url: string): Promise<StatsResponse | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as StatsResponse
  } catch {
    return null
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectSwitcherProps {
  onNewProject: () => void
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CompletionBarProps {
  pct: number
}

function CompletionBar({ pct }: CompletionBarProps) {
  const clampedPct = Math.min(100, Math.max(0, pct))
  return (
    <div
      style={{
        height: '4px',
        background: '#2a2540',
        borderRadius: '2px',
        overflow: 'hidden',
        width: '100%',
      }}
      role="progressbar"
      aria-valuenow={clampedPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clampedPct}% complete`}
    >
      <div
        style={{
          height: '100%',
          width: `${clampedPct}%`,
          background: 'linear-gradient(90deg, #818cf8, #3b82f6)',
          borderRadius: '2px',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  )
}

interface StatsChipsProps {
  done: number
  in_progress: number
}

function StatsChips({ done, in_progress }: StatsChipsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span aria-hidden="true">✓</span>
        <span>{done}</span>
      </span>
      <span style={{ fontSize: '11px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span aria-hidden="true">↔</span>
        <span>{in_progress}</span>
      </span>
    </div>
  )
}

interface ProjectListItemProps {
  project: ProjectStat
  isActive: boolean
  isFocused: boolean
  onClick: () => void
  id: string
}

function ProjectListItem({ project, isActive, isFocused, onClick, id }: ProjectListItemProps) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={isActive}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={-1}
      style={{
        padding: '10px 10px 10px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: isActive ? '#252040' : isFocused ? '#1e1b36' : 'transparent',
        outline: isFocused ? '1px solid #3b3d7a' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          ;(e.currentTarget as HTMLDivElement).style.background = '#1e1b36'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
        }
      }}
    >
      {/* Row 1: name + checkmark */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: isActive ? '#e0deff' : '#c4bfdd',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {project.name || project.key}
        </span>
        {isActive && (
          <span style={{ color: '#818cf8', fontSize: '13px', marginLeft: '8px', flexShrink: 0 }}>
            ✓
          </span>
        )}
      </div>

      {/* Row 2: completion bar */}
      <CompletionBar pct={project.completion_pct} />

      {/* Row 3: stats chips */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <StatsChips done={project.done} in_progress={project.in_progress} />
        <span style={{ fontSize: '11px', color: '#4b4569' }}>
          {project.completion_pct.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SwitcherSkeleton() {
  return (
    <div
      style={{
        width: '140px',
        height: '34px',
        background: '#2a2540',
        borderRadius: '8px',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
      aria-label="Ładowanie projektu..."
      role="status"
    />
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProjectSwitcher({ onNewProject }: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [optimisticCurrent, setOptimisticCurrent] = useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [isSwitching, setIsSwitching] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const comboboxId = useId()
  const listboxId = `${comboboxId}-listbox`

  // ─── SWR: fetch project stats every 60s ────────────────────────────────
  const { data, isLoading, mutate } = useSWR<StatsResponse | null>(
    STATS_SWR_KEY,
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )

  const projects = data?.projects ?? []
  const isOffline = data?.offline === true || (!isLoading && data === null)

  // Determine the active project key (optimistic takes priority)
  const activeKey =
    optimisticCurrent ??
    (projects.find((p) => p.is_current)?.key ?? (projects[0]?.key ?? null))

  const activeProject = projects.find((p) => p.key === activeKey) ?? projects[0] ?? null

  // ─── Close on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // ─── Focus first item when dropdown opens ─────────────────────────────
  useEffect(() => {
    if (isOpen && projects.length > 0) {
      const activeIdx = projects.findIndex((p) => p.key === activeKey)
      setFocusedIndex(activeIdx >= 0 ? activeIdx : 0)
    }
  }, [isOpen, activeKey, projects])

  // ─── Switch project handler ────────────────────────────────────────────
  const handleSwitch = useCallback(
    async (project: ProjectStat) => {
      if (project.key === activeKey || isSwitching) return

      const previousKey = activeKey
      setOptimisticCurrent(project.key)
      setIsOpen(false)
      setFocusedIndex(-1)
      setIsSwitching(true)

      try {
        const res = await fetch('/api/projects/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_key: project.key }),
        })

        if (!res.ok) {
          // Rollback optimistic update
          setOptimisticCurrent(previousKey)
          toast.error('Nie można przełączyć projektu — Bridge niedostępny')
          return
        }

        toast.success(`Przełączono na projekt: ${project.name || project.key}`)
        // Revalidate stats
        await mutate()
      } catch {
        // Rollback on network error
        setOptimisticCurrent(previousKey)
        toast.error('Nie można przełączyć projektu — Bridge niedostępny')
      } finally {
        setIsSwitching(false)
      }
    },
    [activeKey, isSwitching, mutate],
  )

  // ─── New project handler ───────────────────────────────────────────────
  const handleNewProject = useCallback(() => {
    setIsOpen(false)
    setFocusedIndex(-1)
    onNewProject()
  }, [onNewProject])

  // ─── Keyboard navigation ──────────────────────────────────────────────
  const handleButtonKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (isOffline) return

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setFocusedIndex(-1)
      } else if (e.key === 'ArrowDown' && !isOpen) {
        e.preventDefault()
        setIsOpen(true)
      }
    },
    [isOffline, isOpen],
  )

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // +1 for "New Project" at the end
      const totalItems = projects.length + 1

      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setFocusedIndex(-1)
        buttonRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % totalItems)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems)
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < projects.length) {
          const focusedProject = projects[focusedIndex]
          if (focusedProject) void handleSwitch(focusedProject)
        } else if (focusedIndex === projects.length) {
          handleNewProject()
        }
      } else if (e.key === 'Tab') {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    },
    [projects, focusedIndex, handleSwitch, handleNewProject],
  )

  // ─── Render: Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return <SwitcherSkeleton />
  }

  // ─── Render: Button label ─────────────────────────────────────────────
  const buttonLabel =
    isOffline
      ? 'kira-dashboard'
      : activeProject
        ? activeProject.name || activeProject.key
        : 'Wybierz projekt'

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Pulse animation keyframes */}
      <style>{`
        @keyframes oc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        [data-oc-skeleton] { animation: oc-pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* ── Trigger button ── */}
      <button
        ref={buttonRef}
        id={comboboxId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={`Aktywny projekt: ${buttonLabel}`}
        title={isOffline ? 'Bridge offline' : undefined}
        disabled={isOffline || isLoading}
        onClick={() => {
          if (!isOffline && !isLoading) {
            setIsOpen((prev) => !prev)
          }
        }}
        onKeyDown={handleButtonKeyDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          background: '#1a1730',
          border: '1px solid #2a2540',
          borderRadius: '8px',
          color: isOffline ? '#4b4569' : '#c4bfdd',
          fontSize: '13px',
          fontWeight: 500,
          cursor: isOffline ? 'not-allowed' : 'pointer',
          opacity: isOffline ? 0.6 : 1,
          transition: 'border-color 0.15s ease, background 0.15s ease',
          whiteSpace: 'nowrap',
          maxWidth: '220px',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!isOffline) {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#3b3d7a'
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1e1b36'
          }
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2540'
          ;(e.currentTarget as HTMLButtonElement).style.background = '#1a1730'
        }}
      >
        {/* Offline icon */}
        {isOffline && (
          <span style={{ fontSize: '12px' }} aria-hidden="true">
            ⚠
          </span>
        )}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {buttonLabel}
        </span>
        {/* Chevron */}
        {!isOffline && (
          <span
            aria-hidden="true"
            style={{
              fontSize: '10px',
              color: '#4b4569',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              flexShrink: 0,
            }}
          >
            ▼
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {isOpen && !isOffline && (
        <div
          ref={listRef}
          role="listbox"
          id={listboxId}
          aria-label="Lista projektów"
          tabIndex={0}
          onKeyDown={handleDropdownKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 50,
            background: '#1a1730',
            border: '1px solid #3b3d7a',
            borderRadius: '12px',
            padding: '8px',
            minWidth: '280px',
            maxHeight: '400px',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            // Mobile responsive: constrain to viewport
          }}
        >
          {/* Project list */}
          {projects.length === 0 ? (
            <div
              style={{
                padding: '12px',
                color: '#4b4569',
                fontSize: '13px',
                textAlign: 'center',
              }}
            >
              Brak projektów
            </div>
          ) : (
            projects.map((project, index) => (
              <ProjectListItem
                key={project.key}
                id={`${listboxId}-option-${index}`}
                project={project}
                isActive={project.key === activeKey}
                isFocused={focusedIndex === index}
                onClick={() => void handleSwitch(project)}
              />
            ))
          )}

          {/* Separator */}
          <div
            style={{
              borderTop: '1px solid #2a2540',
              margin: '4px 0',
            }}
            role="separator"
            aria-orientation="horizontal"
          />

          {/* "+ Nowy projekt" CTA */}
          <div
            role="option"
            aria-selected={false}
            id={`${listboxId}-option-${projects.length}`}
            onClick={handleNewProject}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleNewProject()
              }
            }}
            tabIndex={-1}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#818cf8',
              fontSize: '13px',
              fontWeight: 500,
              background: focusedIndex === projects.length ? '#252040' : 'transparent',
              outline: focusedIndex === projects.length ? '1px solid #3b3d7a' : 'none',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLDivElement).style.background = '#252040'
            }}
            onMouseLeave={(e) => {
              if (focusedIndex !== projects.length) {
                ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '14px' }}>
              +
            </span>
            Nowy projekt
          </div>
        </div>
      )}
    </div>
  )
}
