'use client'

// components/layout/TabsBar.tsx
// Poziomy bar z zakładkami pod headerem strony.

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
