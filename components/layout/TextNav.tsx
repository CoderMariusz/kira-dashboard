'use client'

// components/layout/TextNav.tsx
// Tekstowa nawigacja boczna (160px) — pojawia się przy hover/kliknięciu.

import { useActiveTab, ALL_TABS, TAB_LABELS } from '@/hooks/useActiveTab'

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
