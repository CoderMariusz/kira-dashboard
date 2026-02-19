// app/home/layout.tsx — używa głównego layout z Sidebarą
import { Suspense, type ReactNode } from 'react'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TabsBar } from '@/components/layout/TabsBar'

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <ProjectProvider>
      <div className="flex h-screen bg-zinc-950 overflow-hidden">
        <Suspense fallback={<div className="w-14 bg-zinc-900" />}>
          <Sidebar />
        </Suspense>
        <div className="flex flex-col flex-1 min-w-0">
          <Suspense fallback={<div className="h-12 bg-zinc-950 border-b border-zinc-800" />}>
            <TabsBar />
          </Suspense>
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProjectProvider>
  )
}
