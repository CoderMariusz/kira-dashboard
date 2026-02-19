'use client'
// app/home/page.tsx
// Strona domyślna /home — widoczna dla wszystkich zalogowanych (HELPER, HELPER_PLUS, ADMIN)
// Nie ma role guard — przekierowanie do /login obsługuje middleware

import { useUser } from '@/contexts/RoleContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { HomeOverview } from '@/components/home/overview/HomeOverview'

export default function HomePage() {
  const { user, role, isLoading } = useUser()
  const router = useRouter()

  // Redirect do /login jeśli brak sesji (po załadowaniu auth)
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [isLoading, user, router])

  // Auth loading state — minimalistyczny skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1a1730' }}>
        <div className="animate-pulse" style={{ color: '#4b4569', fontSize: '14px' }}>
          Ładowanie…
        </div>
      </div>
    )
  }

  // Brak sesji — useEffect zajmie się redirect
  if (!user) return null

  // Imię użytkownika — z email prefix lub 'Użytkowniku'
  const userName = user.email?.split('@')[0] ?? 'Użytkowniku'

  return (
    <HomeOverview
      initialUserName={userName}
      userRole={role}
    />
  )
}
