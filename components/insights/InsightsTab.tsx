'use client'

// components/insights/InsightsTab.tsx
// Główny kontener zakładki Insights.
// Renderuje 3 karty w siatce: NightClawDigestCard, PatternsPanel, SystemHealthCard.
// Route: /dashboard?tab=insights

import { NightClawDigestCard } from './NightClawDigestCard'
import { PatternsPanel } from './PatternsPanel'
import { SystemHealthCard } from './SystemHealthCard'

/**
 * Zakładka Insights — 3 karty w układzie grid (3 kolumny na desktop ≥1280px).
 * Każda karta zarządza własnym hookiem i stanem (loading / error / filled).
 */
export function InsightsTab() {
  return (
    <div
      style={{
        padding: '18px 20px',
        overflowY: 'auto',
        flex: 1,
        background: '#13111c',
        minHeight: '100%',
      }}
    >
      {/* Grid 3 kolumny */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 14,
        }}
      >
        <NightClawDigestCard />
        <PatternsPanel />
        <SystemHealthCard />
      </div>
    </div>
  )
}
