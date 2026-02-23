// app/(dashboard)/dashboard/models/page.tsx
// Strona /dashboard/models — grid kart modeli AI (STORY-5.5).
// Server Component — deleguje renderowanie do ModelsPage (Client Component).

import { ModelsPage } from '@/components/models/ModelsPage'

export default function ModelsRoute() {
  return (
    <div className="min-h-screen bg-[#0d0c1a] p-6">
      <ModelsPage />
    </div>
  )
}
