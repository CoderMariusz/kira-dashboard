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
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProjectProvider>
  )
}
