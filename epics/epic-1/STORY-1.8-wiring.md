---
story_id: STORY-1.8
title: "Developer implementuje dwupoziomowy sidebar z project switcherem i routingiem zakładek"
epic: EPIC-1
module: dashboard
domain: wiring
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: n/a
api_reference: http://localhost:8199/api/projects
priority: must
estimated_effort: 10h
depends_on: STORY-1.1, STORY-1.2
blocks: STORY-1.3, STORY-1.4, STORY-1.5, STORY-1.6, STORY-1.7
tags: [sidebar, navigation, project-switcher, context, routing, tabs, layout]
---

## 🎯 User Story

**Jako** Mariusz korzystający z kira-dashboard
**Chcę** mieć dwupoziomowy sidebar z project switcherem i tabs bar
**Żeby** móc szybko przełączać się między projektami i sekcjami dashboardu bez przeładowania strony

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Sidebar i nawigacja to layout-level komponenty. Renderowane są w `app/layout.tsx` lub w dedykowanym pliku `app/(dashboard)/layout.tsx` (route group). Komponenty tworzą "szkielet" UI wokół którego renderują się strony (STORY-1.3 do 1.7).

### Wymagania wstępne (must exist before this story)
- **STORY-1.1 musi być ukończona** — muszą istnieć: `lib/bridge.ts`, `types/bridge.ts`, shadcn/ui skonfigurowane
- **STORY-1.2 musi być ukończona** — musi istnieć `hooks/useProjects.ts` z exportem `useProjects()` i `components/providers/SWRProvider.tsx`

### Powiązane pliki (do stworzenia przez tę story)

```
kira-dashboard/
├── app/
│   ├── layout.tsx                    ← AKTUALIZACJA: dodaj ProjectProvider
│   └── (dashboard)/                  ← Route group (nowy katalog)
│       ├── layout.tsx                ← Dashboard layout z Sidebar + TabsBar
│       └── page.tsx                  ← Przekierowanie na ?tab=overview (lub Overview content)
├── contexts/
│   └── ProjectContext.tsx            ← Context provider z aktywnym projektem
├── components/
│   └── layout/
│       ├── Sidebar.tsx               ← Główny sidebar (icon rail + text nav)
│       ├── IconRail.tsx              ← Lewy rail 56px z ikonkami sekcji
│       ├── TextNav.tsx               ← Text nav 160px z nazwami zakładek
│       ├── ProjectSwitcher.tsx       ← Dropdown z listą projektów
│       └── TabsBar.tsx               ← Poziomy bar z zakładkami pod headerem
└── hooks/
    └── useActiveTab.ts               ← Hook do odczytu/zapisu ?tab= z URL
```

### Wizualny układ dashboardu

```
┌─────────────────────────────────────────────────────────┐
│ [SIDEBAR 56px]  │ [TEXT NAV 160px]  │  [MAIN CONTENT]   │
│ (icon rail)     │ (pojawia się      │                    │
│                 │  przy hover)      │  [TABS BAR]        │
│ [P] ProjectSwi  │ Overview          │  Ov │ Pipe │ Eval  │
│     tcher       │ Pipeline          │  ─────────────── │
│ ─────────────── │ Eval              │                    │
│ [≡] Overview    │ Patterns          │  CONTENT           │
│ [▶] Pipeline    │ Health            │                    │
│ [✓] Eval        │                   │                    │
│ [◇] Patterns    │                   │                    │
│ [♥] Health      │                   │                    │
└─────────────────────────────────────────────────────────┘
```

Wymiary:
- **IconRail:** szerokość stała `56px`, pełna wysokość ekranu, tło `bg-zinc-900`
- **TextNav:** szerokość `160px`, pojawia się przy hover na IconRail lub kliknięciu w ikonkę, tło `bg-zinc-800`
- **TabsBar:** poziomy bar `h-12` pod headerem strony, zawiera tabs: Overview / Pipeline / Eval / Patterns / Health

---

## ✅ Acceptance Criteria

### AC-1: Icon rail renderuje się z poprawnymi ikonkami sekcji
GIVEN: Dashboard jest załadowany na `http://localhost:3000`
WHEN: Użytkownik patrzy na lewy bok ekranu
THEN: Widoczny jest pionowy rail o szerokości dokładnie `56px`
AND: Rail zawiera ikonkę dla każdej z 5 sekcji w tej kolejności: Overview, Pipeline, Eval, Patterns, Health
AND: Nad ikonkami sekcji widoczna jest ikonka/przycisk project switcher
AND: Rail ma tło `bg-zinc-900` (ciemne, zgodnie z AgentSys dark theme)
AND: Ikonki są wyśrodkowane poziomo w railu (flexbox center)

### AC-2: Text nav pojawia się przy hover na icon rail
GIVEN: Text nav jest ukryta (sidebar w stanie collapsed)
WHEN: Użytkownik najeżdża kursorem na icon rail (mouse hover)
THEN: Text nav o szerokości `160px` pojawia się po prawej stronie icon rail
AND: Pojawienie się jest animowane (CSS transition, np. `transition-all duration-200`)
AND: Text nav zawiera nazwy zakładek: "Overview", "Pipeline", "Eval", "Patterns", "Health"
AND: Text nav ma tło `bg-zinc-800`
WHEN: Użytkownik zabiera kursor z sidebar (opuszcza zarówno icon rail jak i text nav)
THEN: Text nav chowa się (wraca do stanu collapsed)

### AC-3: Text nav pozostaje widoczna po kliknięciu
GIVEN: Text nav jest ukryta
WHEN: Użytkownik KLIKA w dowolną ikonkę na icon rail
THEN: Text nav pojawia się i POZOSTAJE widoczna (nie znika gdy user zabiera kursor)
AND: Sidebar jest w stanie "pinned/expanded"
WHEN: Użytkownik klika ponownie w tę samą ikonkę lub w ikonkę "zamknij" (jeśli istnieje)
THEN: Text nav chowa się (wraca do collapsed)

### AC-4: Aktywna zakładka jest podświetlona w obu nawigacjach
GIVEN: Aktywna zakładka to "Pipeline" (URL zawiera `?tab=pipeline`)
WHEN: Użytkownik patrzy na sidebar
THEN: Ikonka Pipeline w icon rail ma podświetlone tło (`bg-zinc-700` lub ring) odróżniające ją od pozostałych
AND: Tekst "Pipeline" w text nav ma podświetlone tło i inny kolor tekstu (np. `text-white` zamiast `text-zinc-400`)
AND: Żadna inna zakładka nie ma podświetlenia

### AC-5: Project switcher wyświetla listę projektów z Bridge API
GIVEN: Bridge API jest online i `GET /api/projects` zwraca `[{ key: "kira", name: "Kira Pipeline" }, { key: "gym-tracker", name: "Gym Tracker" }]`
WHEN: Użytkownik klika w project switcher (przycisk na górze icon rail)
THEN: Pojawia się dropdown z listą projektów: "Kira Pipeline" i "Gym Tracker"
AND: Aktualnie aktywny projekt jest zaznaczony (checkmark lub podświetlenie)
AND: Dropdown ma prawidłowy z-index (nie jest zasłonięty przez inne elementy)

### AC-6: Zmiana projektu w project switcher aktualizuje kontekst
GIVEN: Aktywny projekt to "kira" (Kira Pipeline)
AND: Dropdown z projektami jest otwarty
WHEN: Użytkownik klika na "Gym Tracker" (key: "gym-tracker") w dropdown
THEN: Dropdown zamyka się
AND: `ProjectContext` ma zaktualizowaną wartość `activeProject.key === "gym-tracker"`
AND: Nazwa aktywnego projektu w project switcher zmienia się na "Gym Tracker"
AND: Wszystkie hooki (useStats, usePipeline, useRuns, useEval) są odświeżone (SWR mutate/revalidate)

### AC-7: Tabs bar pod headerem wyświetla 5 zakładek
GIVEN: Dashboard jest załadowany
WHEN: Użytkownik patrzy na górną część głównej treści (pod ewentualnym headerem)
THEN: Widoczny jest poziomy bar `h-12` z 5 zakładkami w tej kolejności: "Overview", "Pipeline", "Eval", "Patterns", "Health"
AND: Aktualnie aktywna zakładka ma podświetlony bottom-border lub background
AND: Kliknięcie w zakładkę zmienia URL (dodaje lub zmienia `?tab=<name>`)

### AC-8: Routing przez URL parametr `?tab=`
GIVEN: Użytkownik jest na stronie `http://localhost:3000`
WHEN: Użytkownik klika zakładkę "Pipeline" w tabs bar
THEN: URL zmienia się na `http://localhost:3000?tab=pipeline` (lub `/dashboard?tab=pipeline`)
AND: Strona NIE jest przeładowywana (client-side navigation)
AND: Aktywna zakładka "Pipeline" jest podświetlona w tabs bar AND w sidebar
GIVEN: Użytkownik wchodzi bezpośrednio na URL `http://localhost:3000?tab=eval`
THEN: Aktywna zakładka to "Eval" (czytamy wartość z URL)
AND: Icon rail i text nav pokazują "Eval" jako aktywne
GIVEN: Użytkownik wchodzi na URL bez parametru `?tab=` (np. `http://localhost:3000`)
THEN: Domyślna aktywna zakładka to "Overview"

### AC-9: ProjectContext jest dostępny we wszystkich child komponentach
GIVEN: Aplikacja jest załadowana z `ProjectProvider` owijającym layout
WHEN: Dowolny komponent potomny wywołuje `useProjectContext()` (custom hook)
THEN: Hook zwraca `{ activeProject: Project | null, setActiveProject: (project: Project) => void }`
AND: `activeProject` jest pierwszym projektem z listy (lub null jeśli Bridge offline)
AND: Hook NIE rzuca błędu (nie crashuje jeśli wywołany poza providerem — powinien logować warning i zwracać safe defaults)

### AC-10: Dashboard działa gdy Bridge offline (projekt switcher graceful degradation)
GIVEN: Bridge API NIE jest uruchomione
WHEN: Dashboard jest ładowany
THEN: Project switcher wyświetla placeholder: "– Offline –" lub spinner
AND: Project switcher NIE crashuje ani NIE blokuje załadowania reszty dashboardu
AND: `activeProject` w kontekście ma wartość `null`
AND: Tabs bar i sidebar nawigacja działają normalnie (nie wymagają Bridge do renderowania)

---

## 🔌 Szczegóły Wiring

### Typy współdzielone

Plik: `types/bridge.ts` (ISTNIEJĄCY — NIE tworzymy nowego pliku, typy już są zdefiniowane w STORY-1.1)

Używane typy z `types/bridge.ts`:
```typescript
import type { Project } from '@/types/bridge'
// Project: { key: string, name: string, description: string | null, active: boolean }
```

### Plik `contexts/ProjectContext.tsx` — ProjectProvider i useProjectContext

```typescript
// contexts/ProjectContext.tsx
// Context Provider który przechowuje aktywny projekt.
// Musi owijać całą aplikację (lub przynajmniej dashboard layout).

'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useProjects } from '@/hooks/useProjects'
import type { Project } from '@/types/bridge'

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
   * Po wywołaniu — patrz AC-6 — hooki SWR są rewalidowane.
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
 *
 * Przykład użycia w layout.tsx:
 *   <ProjectProvider>
 *     <Sidebar />
 *     {children}
 *   </ProjectProvider>
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const { projects, loading, offline } = useProjects()
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)

  // Gdy projekty załadują się po raz pierwszy, ustaw pierwszy projekt jako domyślny.
  // useEffect reaguje na zmianę `projects` z null na tablicę.
  useEffect(() => {
    if (projects !== null && projects.length > 0 && activeProject === null) {
      // Sprawdź czy pierwszy projekt istnieje — nie zakładamy nieustalonego indeksu
      const firstProject = projects[0]
      if (firstProject !== undefined) {
        setActiveProjectState(firstProject)
      }
    }
  }, [projects, activeProject])

  /**
   * Ustawia aktywny projekt i wymusza rewalidację wszystkich SWR hooków.
   * useCallback żeby uniknąć zbędnych re-renderów komponentów które konsumują kontekst.
   */
  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project)
    // UWAGA: W STORY-1.2 hooki SWR używają stałych kluczy ('/api/status/pipeline' etc.)
    // Gdy projectKey jest potrzebny w URL (np. /api/projects/kira/pipeline),
    // klucz SWR będzie zawierał projectKey — wtedy zmiana projektu automatycznie
    // spowoduje nowy fetch (inny klucz = inny cache entry).
    // Na potrzeby STORY-1.8 (MVP) — rewalidacja jest opcjonalna.
    // Jeśli Bridge API ignoruje projekt (zwraca dane niezależnie od projektu),
    // ten callback jest wystarczający — UI pokazuje zmieniony projekt.
  }, [])

  const value: ProjectContextValue = {
    activeProject,
    projects,
    setActiveProject,
    loading,
    offline,
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

/**
 * Hook do konsumowania ProjectContext.
 * Musi być wywołany wewnątrz ProjectProvider (lub zwróci defaultContextValue z warningiem).
 *
 * Przykład użycia:
 *   const { activeProject, setActiveProject, projects } = useProjectContext()
 */
export function useProjectContext(): ProjectContextValue {
  return useContext(ProjectContext)
}
```

### Plik `hooks/useActiveTab.ts` — zarządzanie aktywną zakładką przez URL

```typescript
// hooks/useActiveTab.ts
// Hook który czyta i zapisuje aktywną zakładkę z URL search param ?tab=
// Używa Next.js useSearchParams() i useRouter()

'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'

/** Dozwolone wartości dla parametru ?tab= */
export type TabValue = 'overview' | 'pipeline' | 'eval' | 'patterns' | 'health'

/** Domyślna zakładka gdy ?tab= nie jest ustawiony w URL. */
const DEFAULT_TAB: TabValue = 'overview'

/** Lista wszystkich dozwolonych zakładek. */
export const ALL_TABS: TabValue[] = ['overview', 'pipeline', 'eval', 'patterns', 'health']

/** Polskie etykiety dla każdej zakładki — do wyświetlenia w UI. */
export const TAB_LABELS: Record<TabValue, string> = {
  overview:  'Overview',
  pipeline:  'Pipeline',
  eval:      'Eval',
  patterns:  'Patterns',
  health:    'Health',
}

interface UseActiveTabReturn {
  /** Aktualnie aktywna zakładka (z URL lub domyślna 'overview'). */
  activeTab: TabValue
  /** Funkcja do zmiany aktywnej zakładki — aktualizuje URL (client-side navigation). */
  setActiveTab: (tab: TabValue) => void
}

/**
 * Hook do zarządzania aktywną zakładką przez URL parametr ?tab=
 *
 * Przykład użycia:
 *   const { activeTab, setActiveTab } = useActiveTab()
 *   // activeTab === 'overview' (domyślnie gdy brak ?tab=)
 *   setActiveTab('pipeline')
 *   // URL zmienia się na ?tab=pipeline, activeTab === 'pipeline'
 */
export function useActiveTab(): UseActiveTabReturn {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Odczytaj wartość ?tab= z URL
  const tabParam = searchParams.get('tab')

  // Waliduj — jeśli wartość nie jest w ALL_TABS, użyj domyślnej
  const activeTab: TabValue =
    tabParam !== null && (ALL_TABS as string[]).includes(tabParam)
      ? (tabParam as TabValue)
      : DEFAULT_TAB

  /**
   * Zmienia aktywną zakładkę przez aktualizację URL.
   * Używa router.push() dla client-side navigation (bez reload strony).
   * Zachowuje inne search params jeśli istnieją.
   */
  const setActiveTab = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  return { activeTab, setActiveTab }
}
```

### Plik `components/layout/IconRail.tsx`

```typescript
// components/layout/IconRail.tsx
// Lewy pionowy rail z ikonkami sekcji (56px szerokości).
// Zawiera: project switcher na górze, ikonki 5 sekcji, opcjonalnie logo na dole.

'use client'

import { useActiveTab, ALL_TABS, TAB_LABELS, type TabValue } from '@/hooks/useActiveTab'
import { ProjectSwitcher } from './ProjectSwitcher'

/** Mapowanie zakładek na ikonki (emoji lub SVG). */
const TAB_ICONS: Record<TabValue, string> = {
  overview:  '≡',
  pipeline:  '▶',
  eval:      '✓',
  patterns:  '◇',
  health:    '♥',
}

interface IconRailProps {
  /** Callback wywołany gdy user klika ikonkę — expand text nav. */
  onTabClick: (tab: TabValue) => void
}

/**
 * Lewy pionowy rail 56px.
 * Renderuje ikonki sekcji i project switcher.
 * NIE renderuje text nav — to robi Sidebar.tsx przez overlay/expand.
 */
export function IconRail({ onTabClick }: IconRailProps) {
  const { activeTab } = useActiveTab()

  return (
    <div className="flex h-screen w-14 flex-col items-center bg-zinc-900 py-3 gap-1">
      {/* Project Switcher — zawsze na górze railu */}
      <div className="w-full px-1 mb-2">
        <ProjectSwitcher />
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-zinc-700 mb-1" />

      {/* Ikonki sekcji */}
      {ALL_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabClick(tab)}
          title={TAB_LABELS[tab]}
          aria-label={`Sekcja: ${TAB_LABELS[tab]}`}
          aria-current={activeTab === tab ? 'page' : undefined}
          className={[
            'flex h-10 w-10 items-center justify-center rounded-lg text-lg',
            'transition-colors duration-150 cursor-pointer',
            activeTab === tab
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
          ].join(' ')}
        >
          {TAB_ICONS[tab]}
        </button>
      ))}
    </div>
  )
}
```

### Plik `components/layout/TextNav.tsx`

```typescript
// components/layout/TextNav.tsx
// Tekstowa nawigacja boczna (160px) — pojawia się przy hover/kliknięciu.

'use client'

import { useActiveTab, ALL_TABS, TAB_LABELS, type TabValue } from '@/hooks/useActiveTab'

interface TextNavProps {
  /** Czy text nav jest widoczna. Kontrolowane przez Sidebar.tsx. */
  visible: boolean
}

/**
 * Tekstowa nawigacja 160px.
 * Renderuje nazwy zakładek z podświetleniem aktywnej.
 * Widoczność kontrolowana przez prop `visible` (animowana CSS transition).
 */
export function TextNav({ visible }: TextNavProps) {
  const { activeTab, setActiveTab } = useActiveTab()

  return (
    <div
      className={[
        'flex flex-col bg-zinc-800 py-3 gap-1 overflow-hidden',
        'transition-all duration-200 ease-in-out',
        visible ? 'w-40 opacity-100' : 'w-0 opacity-0',
      ].join(' ')}
    >
      {ALL_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          aria-current={activeTab === tab ? 'page' : undefined}
          className={[
            'flex items-center px-4 h-9 text-sm font-medium rounded-lg mx-1',
            'transition-colors duration-150 text-left whitespace-nowrap w-36',
            activeTab === tab
              ? 'bg-zinc-700 text-white'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
          ].join(' ')}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </div>
  )
}
```

### Plik `components/layout/ProjectSwitcher.tsx`

```typescript
// components/layout/ProjectSwitcher.tsx
// Dropdown z listą projektów — wyświetla nazwę aktywnego projektu i listę do wyboru.
// Używa useProjectContext() i useProjects().

'use client'

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

  // Etykieta przycisku
  const buttonLabel: string =
    loading ? '...' :
    offline ? '– Offline –' :
    activeProject?.name ?? '– Wybierz projekt –'

  const handleProjectSelect = (project: Project) => {
    setActiveProject(project)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full">
      {/* Przycisk triggering dropdown */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={offline || loading}
        title={activeProject?.name ?? 'Wybierz projekt'}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={[
          'w-full h-10 flex items-center justify-center rounded-lg text-xs font-medium',
          'transition-colors duration-150',
          offline || loading
            ? 'text-zinc-600 cursor-not-allowed'
            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer',
        ].join(' ')}
      >
        {/* Pokazuj tylko pierwszą literę projektu jako ikonkę gdy sidebar zwinięty */}
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
    </div>
  )
}
```

### Plik `components/layout/TabsBar.tsx`

```typescript
// components/layout/TabsBar.tsx
// Poziomy bar z zakładkami pod headerem strony.

'use client'

import { useActiveTab, ALL_TABS, TAB_LABELS } from '@/hooks/useActiveTab'

/**
 * Poziomy tabs bar h-12 z zakładkami: Overview, Pipeline, Eval, Patterns, Health.
 * Zmienia URL przez useActiveTab().setActiveTab().
 * Aktywna zakładka ma podświetlony border-bottom.
 */
export function TabsBar() {
  const { activeTab, setActiveTab } = useActiveTab()

  return (
    <nav
      className="flex h-12 items-end border-b border-zinc-800 bg-zinc-950 px-4"
      aria-label="Nawigacja dashboardu"
    >
      {ALL_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          aria-current={activeTab === tab ? 'page' : undefined}
          className={[
            'px-4 pb-2 pt-1 text-sm font-medium transition-colors duration-150',
            'border-b-2 -mb-px', // -mb-px żeby border wychodził poza nav border
            activeTab === tab
              ? 'border-white text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600',
          ].join(' ')}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  )
}
```

### Plik `components/layout/Sidebar.tsx` — główny sidebar (orchestrator)

```typescript
// components/layout/Sidebar.tsx
// Główny sidebar łączący IconRail i TextNav.
// Zarządza stanem expanded/collapsed.

'use client'

import { useState, useRef } from 'react'
import { IconRail } from './IconRail'
import { TextNav } from './TextNav'
import { useActiveTab, type TabValue } from '@/hooks/useActiveTab'

/**
 * Główny sidebar dashboard.
 * Składa się z:
 *   - IconRail (56px, zawsze widoczny)
 *   - TextNav (160px, pokazuje się przy hover lub kliknięciu)
 *
 * Stany:
 *   - 'collapsed' — tylko IconRail widoczny
 *   - 'hover'     — TextNav widoczna przez hover (chowa się gdy kursor opuszcza)
 *   - 'pinned'    — TextNav widoczna przez kliknięcie (nie chowa się na hover out)
 */
export function Sidebar() {
  const [state, setState] = useState<'collapsed' | 'hover' | 'pinned'>('collapsed')
  const { setActiveTab } = useActiveTab()
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isTextNavVisible = state === 'hover' || state === 'pinned'

  // Obsługa hover z małym delay żeby uniknąć migania
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (state === 'collapsed') {
      setState('hover')
    }
  }

  const handleMouseLeave = () => {
    if (state === 'hover') {
      // 100ms delay żeby uniknąć zamykania gdy user przesuwa kursor między elementami
      hoverTimeoutRef.current = setTimeout(() => {
        setState('collapsed')
      }, 100)
    }
  }

  // Kliknięcie w ikonkę — toggle pinned
  const handleTabClick = (tab: TabValue) => {
    setActiveTab(tab)
    setState((prev) => prev === 'pinned' ? 'collapsed' : 'pinned')
  }

  return (
    <div
      className="flex h-screen"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <IconRail onTabClick={handleTabClick} />
      <TextNav visible={isTextNavVisible} />
    </div>
  )
}
```

### Plik `app/(dashboard)/layout.tsx` — dashboard layout

```typescript
// app/(dashboard)/layout.tsx
// Layout dla wszystkich stron dashboardu.
// Owijamy w ProjectProvider, renderujemy Sidebar i TabsBar.
// Wymaga Suspense dla useSearchParams() (Next.js 16 requirement).

import { Suspense, type ReactNode } from 'react'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabsBar } from '@/components/layout/TabsBar'

interface DashboardLayoutProps {
  children: ReactNode
}

// Fallback dla Suspense podczas ładowania search params
function DashboardSkeleton() {
  return (
    <div className="flex h-screen bg-zinc-950 items-center justify-center">
      <p className="text-zinc-500 text-sm">Ładowanie...</p>
    </div>
  )
}

/**
 * Layout dashboardu.
 * - ProjectProvider: dostarcza activeProject do całego drzewa
 * - Sidebar: icon rail + text nav (po lewej)
 * - Główna treść: TabsBar (na górze) + children (poniżej)
 *
 * WAŻNE: Komponenty które używają useSearchParams() muszą być owinięte w Suspense.
 * Dotyczy to: TabsBar, Sidebar (przez useActiveTab → useSearchParams).
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ProjectProvider>
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        {/* Sidebar — po lewej */}
        <Suspense fallback={<div className="w-14 bg-zinc-900" />}>
          <Sidebar />
        </Suspense>

        {/* Główna treść — reszta szerokości */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Tabs bar — pod headerem */}
          <Suspense fallback={<div className="h-12 bg-zinc-950 border-b border-zinc-800" />}>
            <TabsBar />
          </Suspense>

          {/* Content area — z scrollem */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ProjectProvider>
  )
}
```

### Plik `app/(dashboard)/page.tsx` — tymczasowy placeholder

```typescript
// app/(dashboard)/page.tsx
// Tymczasowy placeholder dla głównej strony dashboardu.
// Zostanie zastąpiony zawartością poszczególnych zakładek w STORY-1.3 do 1.7.

'use client'

import { useActiveTab, TAB_LABELS } from '@/hooks/useActiveTab'

export default function DashboardPage() {
  const { activeTab } = useActiveTab()

  return (
    <div className="text-zinc-400">
      <h1 className="text-xl font-semibold text-white mb-2">
        {TAB_LABELS[activeTab]}
      </h1>
      <p>Treść zakładki &quot;{TAB_LABELS[activeTab]}&quot; — implementowana w STORY-1.3 do 1.7.</p>
    </div>
  )
}
```

### Aktualizacja `app/layout.tsx`

Root `app/layout.tsx` musi zostać zaktualizowany. `ProjectProvider` jest w `(dashboard)/layout.tsx`, więc root layout nie wymaga zmian strukturalnych. Upewnij się że `SWRProvider` (z STORY-1.2) jest obecny:

```typescript
// app/layout.tsx — sprawdź że SWRProvider jest obecny (dodany w STORY-1.2)
import { SWRProvider } from '@/components/providers/SWRProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  )
}
```

### Obsługa błędów

```typescript
// Plik: contexts/ProjectContext.tsx (już zawarty powyżej)
// Błędy na styku:

// 1. useProjectContext() wywołany poza ProjectProvider
//    → zwraca defaultContextValue z console.warn
//    → NIE rzuca błędu — safe defaults

// 2. Bridge offline → projects === null → activeProject === null
//    → ProjectSwitcher wyświetla "– Offline –"
//    → Reszta dashboardu działa (nie wymaga activeProject do renderowania)

// 3. Pusta lista projektów (Bridge online ale brak projektów)
//    → projects === [] → activeProject nie jest ustawiany
//    → ProjectSwitcher wyświetla "– Wybierz projekt –"
```

---

## ⚠️ Edge Cases

### EC-1: URL z nieprawidłową wartością ?tab= (np. ?tab=unknown)
Scenariusz: Użytkownik ręcznie wpisuje w URL `?tab=randomvalue`.
Oczekiwane zachowanie: `useActiveTab()` waliduje wartość przez `ALL_TABS.includes(tabParam)`. Jeśli wartość nie jest w `ALL_TABS`, hook zwraca `DEFAULT_TAB` (czyli `'overview'`). URL NIE jest automatycznie korygowany — zakładka "Overview" jest aktywna, ale URL pozostaje z nieprawidłową wartością. Brak erroru, brak crash.

### EC-2: Bridge zwraca tylko 1 projekt
Scenariusz: `GET /api/projects` zwraca `{ "projects": [{ "key": "kira", "name": "Kira Pipeline", ... }] }`.
Oczekiwane zachowanie: ProjectSwitcher renderuje dropdown z 1 pozycją. Kliknięcie w przycisk otwiera dropdown (zachowanie bez zmian). Aktywny projekt jest ustawiony na "kira" automatycznie.

### EC-3: Szybka zmiana projektu (double-click na inny projekt)
Scenariusz: Użytkownik szybko klika "Gym Tracker" a potem "Kira Pipeline".
Oczekiwane zachowanie: `setActiveProject` jest wywoływane dwukrotnie. React setState jest synchroniczny wewnętrznie — ostatnie wywołanie "wygrywa". Aktywny projekt to "Kira Pipeline". Brak race condition, brak crash.

### EC-4: Sidebar w stanie 'hover' gdy kursor szybko przechodzi przez rail
Scenariusz: Kursor mija icon rail w ciągu < 100ms.
Oczekiwane zachowanie: `handleMouseLeave` ustawia 100ms timeout przed collapse. Jeśli kursor wróci przed upływem timeout — `clearTimeout` anuluje collapse. Text nav pojawia się tylko przy świadomym hover (> 100ms), nie migacze.

### EC-5: Zmiana zakładki przez URL nie przeładowuje strony
Scenariusz: User klika zakładkę "Pipeline" — URL zmienia się na `?tab=pipeline`.
Oczekiwane zachowanie: Next.js `router.push()` wykonuje client-side navigation. Strona NIE jest przeładowywana (brak pełnego HTTP request). SWR cache pozostaje nienaruszone. Komponenty layout (Sidebar, TabsBar) nie re-mountują się.

### EC-6: Sidebar na wąskim ekranie (< 768px)
Scenariusz: Dashboard otwarty na ekranie < 768px (choć EPIC-1 jest desktop-first).
Oczekiwane zachowanie: Icon rail (56px) pozostaje widoczny. Text nav może zasłaniać treść — to akceptowalne dla MVP (mobile support w EPIC-15). Brak JavaScript errors, brak crash.

---

## 🚫 Out of Scope tej Story
- Implementacja treści zakładek (Overview, Pipeline, Eval, Patterns, Health) — to STORY-1.3 do 1.7
- Budowanie Story Detail Modal — to STORY-1.5
- Responsywność na mobile — desktop-first MVP, mobile w EPIC-15
- Hamburger menu na mobile — poza zakresem EPIC-1
- Animacje wejścia/wyjścia sidebar inne niż CSS transition — MVP level
- Pamiętanie stanu sidebar (expanded/collapsed) w localStorage — opcjonalne, nie required
- Używanie `projectKey` w URL hooków danych (np. `/api/projects/kira/pipeline`) — to rozszerzenie po EPIC-1, gdy Bridge API zostanie zaktualizowane

---

## ✔️ Definition of Done
- [ ] Istnieje plik `contexts/ProjectContext.tsx` z exportami: `ProjectProvider`, `useProjectContext`
- [ ] Istnieje plik `hooks/useActiveTab.ts` z exportami: `useActiveTab`, `TabValue`, `ALL_TABS`, `TAB_LABELS`
- [ ] Istnieje plik `components/layout/Sidebar.tsx` z exportem `Sidebar`
- [ ] Istnieje plik `components/layout/IconRail.tsx` z exportem `IconRail`
- [ ] Istnieje plik `components/layout/TextNav.tsx` z exportem `TextNav`
- [ ] Istnieje plik `components/layout/ProjectSwitcher.tsx` z exportem `ProjectSwitcher`
- [ ] Istnieje plik `components/layout/TabsBar.tsx` z exportem `TabsBar`
- [ ] Istnieje plik `app/(dashboard)/layout.tsx` z `ProjectProvider` + `Sidebar` + `TabsBar`
- [ ] Istnieje plik `app/(dashboard)/page.tsx` jako placeholder
- [ ] Wszystkie typy wyeksportowane z `/types/bridge.ts` — brak `any` w nowych plikach
- [ ] `useProjectContext()` nie crashuje gdy wywołany poza `ProjectProvider`
- [ ] Icon rail ma szerokość `56px` (`w-14` w Tailwind = 56px)
- [ ] Text nav ma szerokość `160px` (`w-40` w Tailwind = 160px)
- [ ] Text nav pojawia się przy hover na sidebar
- [ ] Text nav pozostaje przy kliknięciu (pinned state)
- [ ] Aktywna zakładka jest podświetlona w obu: IconRail i TextNav
- [ ] Tabs bar zawiera 5 zakładek: Overview, Pipeline, Eval, Patterns, Health
- [ ] Kliknięcie zakładki aktualizuje URL (`?tab=`) bez przeładowania strony
- [ ] Domyślna zakładka to 'overview' gdy `?tab=` brak w URL
- [ ] ProjectSwitcher wyświetla "– Offline –" gdy Bridge niedostępny (nie crashuje)
- [ ] ProjectSwitcher zmienia `activeProject` w kontekście
- [ ] `npm run build` przechodzi bez TypeScript errors
- [ ] Ręczny test: otwórz dashboard, sprawdź sidebar hover/click, sprawdź project switcher, sprawdź tabs routing
- [ ] Wszystkie komponenty owinięte w `Suspense` gdzie używają `useSearchParams()`
- [ ] Test integracyjny happy path: mount Dashboard z Bridge online — project switcher pokazuje projekt
- [ ] Test integracyjny error case: mount Dashboard z Bridge offline — "– Offline –" widoczne, brak crash
- [ ] Story review przez PO
