'use client'

// contexts/ProjectContext.tsx
// Context Provider który przechowuje aktywny projekt.
// Musi owijać całą aplikację (lub przynajmniej dashboard layout).

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useSWRConfig } from 'swr'
import { useProjects } from '@/hooks/useProjects'
import type { Project } from '@/types/bridge'

const STORAGE_KEY = 'kira-active-project'

/** Wartości dostępne w ProjectContext. */
interface ProjectContextValue {
  /**
   * Aktualnie wybrany projekt.
   * null gdy: Bridge offline, projekty jeszcze ładowane, brak projektów.
   */
  activeProject: Project | null

  /**
   * Lista wszystkich dostępnych projektów.
   * null gdy: Bridge offline lub ładowanie.
   */
  projects: Project[] | null

  /**
   * Ustawia aktywny projekt. Wywołane z ProjectSwitcher gdy user wybiera projekt.
   */
  setActiveProject: (project: Project) => void

  /** true gdy projekty są wciąż ładowane. */
  loading: boolean

  /** true gdy Bridge offline i projekty są niedostępne. */
  offline: boolean
}

/** Domyślna wartość kontekstu — używana gdy ProjectProvider nie jest w drzewie. */
const defaultContextValue: ProjectContextValue = {
  activeProject: null,
  projects: null,
  setActiveProject: () => {
    console.warn('[ProjectContext] setActiveProject wywołane poza ProjectProvider')
  },
  loading: false,
  offline: false,
}

/** React Context dla aktywnego projektu. */
const ProjectContext = createContext<ProjectContextValue>(defaultContextValue)

interface ProjectProviderProps {
  children: ReactNode
}

/**
 * Provider który owijamy wokół dashboard layout.
 * Automatycznie ustawia pierwszy projekt z listy jako domyślny.
 * Persistuje wybrany projekt w localStorage pod kluczem 'kira-active-project'.
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const { projects, loading, offline } = useProjects()
  const { mutate } = useSWRConfig()
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)

  // Gdy projekty załadują się po raz pierwszy, ustaw projekt z localStorage lub pierwszy z listy.
  useEffect(() => {
    if (projects !== null && projects.length > 0 && activeProject === null) {
      // Próbuj przywrócić z localStorage
      let storedProject: Project | undefined
      try {
        const storedKey =
          typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
        if (storedKey !== null) {
          storedProject = projects.find((p) => p.key === storedKey)
        }
      } catch {
        // localStorage może być niedostępny (np. SSR, tryb prywatny)
      }

      const projectToSet = storedProject ?? projects[0]
      if (projectToSet !== undefined) {
        setActiveProjectState(projectToSet)
      }
    }
  }, [projects, activeProject])

  /**
   * Ustawia aktywny projekt, persistuje w localStorage
   * i rewaliduje wszystkie dane SWR (żeby odświeżyć dane dla nowego projektu).
   */
  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project)
    // Revalidate all SWR-cached data so hooks refetch for the new project
    mutate(() => true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, project.key)
      }
    } catch {
      // localStorage może być niedostępny
    }
  }, [mutate])

  const value: ProjectContextValue = {
    activeProject,
    projects,
    setActiveProject,
    loading,
    offline,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

/**
 * Hook do konsumowania ProjectContext.
 * Musi być wywołany wewnątrz ProjectProvider (lub zwróci defaultContextValue z warningiem).
 */
export function useProjectContext(): ProjectContextValue {
  return useContext(ProjectContext)
}
