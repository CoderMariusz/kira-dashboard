'use client'

// components/pipeline/FilterBar.tsx
// Pasek filtrów pipeline: 3 dropdowny (Status, Model, Projekt) + SearchInput.
// Implementuje STORY-2.7 — AC-1, AC-3, AC-4.

import { SearchInput } from './SearchInput'
import type { PipelineFilters } from '@/hooks/usePipelineFilters'
import type { Project } from '@/types/bridge'

interface FilterBarProps {
  filters: PipelineFilters
  onFilterChange: (filters: Partial<PipelineFilters>) => void
  projects: Project[]
}

/** Wspólny styl dla elementów <select> w FilterBar */
const selectStyle: React.CSSProperties = {
  background: '#13111c',
  border: '1px solid #2a2540',
  borderRadius: '8px',
  padding: '6px 10px',
  color: '#e6edf3',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
}

/**
 * Pasek filtrów nad listą stories w Pipeline tab.
 *
 * Renderuje w jednym rzędzie (flex):
 * - Dropdown Status (filtry po story.status)
 * - Dropdown Model (filtry po story.assigned_model)
 * - Dropdown Projekt (filtry po story.project, lista z useProjects())
 * - SearchInput z debounce 300ms
 * - Przycisk "Resetuj filtry" (widoczny gdy jakikolwiek filtr aktywny)
 *
 * AC-1: FilterBar renderuje się nad listą stories
 * AC-3: Dropdown Status filtruje listę i zapisuje w URL
 * AC-4: Dropdown Model filtruje listę i zapisuje w URL
 */
export function FilterBar({ filters, onFilterChange, projects }: FilterBarProps) {
  const hasActiveFilters =
    Boolean(filters.status) ||
    Boolean(filters.model) ||
    Boolean(filters.project) ||
    Boolean(filters.search)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}
      role="search"
      aria-label="Filtry pipeline"
    >
      {/* Dropdown Status — AC-1, AC-3 */}
      <select
        value={filters.status}
        onChange={(e) => onFilterChange({ status: e.target.value })}
        style={selectStyle}
        aria-label="Filtruj po statusie"
      >
        <option value="">Wszystkie statusy</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="REVIEW">REVIEW</option>
        <option value="REFACTOR">REFACTOR</option>
        <option value="DONE">DONE</option>
        <option value="BLOCKED">BLOCKED</option>
        <option value="MERGE">MERGE</option>
      </select>

      {/* Dropdown Model — AC-1, AC-4 */}
      <select
        value={filters.model}
        onChange={(e) => onFilterChange({ model: e.target.value })}
        style={selectStyle}
        aria-label="Filtruj po modelu"
      >
        <option value="">Wszystkie modele</option>
        <option value="kimi">kimi</option>
        <option value="glm">glm</option>
        <option value="sonnet">sonnet</option>
        <option value="codex">codex</option>
        <option value="haiku">haiku</option>
        <option value="opus">opus</option>
      </select>

      {/* Dropdown Projekt — AC-1, EC-6 */}
      <select
        value={filters.project}
        onChange={(e) => onFilterChange({ project: e.target.value })}
        style={selectStyle}
        aria-label="Filtruj po projekcie"
      >
        <option value="">Wszystkie projekty</option>
        {(projects ?? []).map((p) => (
          <option key={p.key} value={p.key}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Search Input z debounce 300ms — AC-2 */}
      <SearchInput
        value={filters.search}
        onChange={(search) => onFilterChange({ search })}
      />

      {/* Przycisk Resetuj filtry — widoczny gdy jakikolwiek filtr aktywny (AC-8) */}
      {hasActiveFilters && (
        <button
          onClick={() =>
            onFilterChange({ status: '', model: '', project: '', search: '' })
          }
          style={{
            background: '#2a2540',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#818cf8',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          aria-label="Resetuj wszystkie filtry"
        >
          ✕ Resetuj filtry
        </button>
      )}
    </div>
  )
}
