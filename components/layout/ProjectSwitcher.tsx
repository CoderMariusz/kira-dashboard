'use client'

// components/layout/ProjectSwitcher.tsx
// Dropdown z listą projektów — wyświetla nazwę aktywnego projektu i listę do wyboru.
// Używa useProjectContext().

import { useState } from 'react'
import { useProjectContext } from '@/contexts/ProjectContext'
import type { Project } from '@/types/bridge'

/**
 * Project Switcher — przycisk + dropdown z listą projektów.
 * Zmienia activeProject w ProjectContext.
 * Renderowany na górze IconRail.
 */
export function ProjectSwitcher() {
  const { activeProject, projects, loading, offline, setActiveProject } = useProjectContext()
  const [isOpen, setIsOpen] = useState(false)

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full">
      {/* Przycisk triggering dropdown */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={loading}
        title={activeProject?.name ?? (offline ? 'Bridge offline' : 'Wybierz projekt')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'w-full h-10 flex items-center justify-center rounded-lg text-xs font-medium',
          'transition-colors duration-150',
          loading
            ? 'text-zinc-600 cursor-not-allowed'
            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer',
        ].join(' ')}
      >
        {/* Pierwsza litera projektu jako ikonka */}
        <span className="w-6 h-6 flex items-center justify-center rounded bg-zinc-700 text-white text-xs font-bold">
          {loading ? '·' : offline ? '!' : (activeProject?.name[0] ?? '?')}
        </span>
      </button>

      {/* Dropdown lista */}
      {isOpen && projects !== null && (
        <div
          className={[
            'absolute left-full top-0 ml-1 z-50',
            'bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg',
            'min-w-[160px] py-1',
          ].join(' ')}
          role="listbox"
          aria-label="Wybierz projekt"
        >
          {projects.map((project) => (
            <button
              key={project.key}
              role="option"
              aria-selected={activeProject?.key === project.key}
              onClick={() => handleProjectSelect(project)}
              className={[
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                'transition-colors duration-150',
                activeProject?.key === project.key
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-300 hover:bg-zinc-700 hover:text-white',
              ].join(' ')}
            >
              {/* Checkmark dla aktywnego projektu */}
              <span className="w-4 text-center">
                {activeProject?.key === project.key ? '✓' : ''}
              </span>
              <span>{project.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Overlay do zamykania dropdownu kliknięciem poza */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Offline dropdown — Bridge niedostępny, brak projektów */}
      {isOpen && offline && (
        <div
          className={[
            'absolute left-full top-0 ml-1 z-50',
            'bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg',
            'min-w-[160px] py-1',
          ].join(' ')}
          role="listbox"
          aria-label="Projekty niedostępne"
        >
          <button
            disabled
            role="option"
            aria-selected={false}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-zinc-500 cursor-not-allowed"
          >
            <span className="w-4 text-center" />
            <span>– Offline –</span>
          </button>
        </div>
      )}
    </div>
  )
}
