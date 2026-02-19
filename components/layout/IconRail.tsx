'use client'

// components/layout/IconRail.tsx
// Lewy pionowy rail z ikonkami sekcji (56px szerokości).
// Zawiera: project switcher na górze, ikonki 5 sekcji.

import { useActiveTab, ALL_TABS, TAB_LABELS, type TabValue } from '@/hooks/useActiveTab'
import { ProjectSwitcher } from './ProjectSwitcher'

/** Mapowanie zakładek na ikonki (emoji). */
const TAB_ICONS: Record<TabValue, string> = {
  overview: '≡',
  pipeline: '▶',
  models: '🤖',
  epics: '📋',
  eval: '✓',
  patterns: '◇',
  insights: '🌙',
}

interface IconRailProps {
  /** Callback wywołany gdy user klika ikonkę — toggle text nav. */
  onTabClick: (tab: TabValue) => void
}

/**
 * Lewy pionowy rail 56px.
 * Renderuje ikonki sekcji i project switcher.
 * NIE renderuje text nav — to robi Sidebar.tsx.
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
