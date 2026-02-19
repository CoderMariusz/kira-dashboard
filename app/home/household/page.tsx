'use client'
// app/home/household/page.tsx
// Strona zarządzania household: lista członków, zaproszenia, oczekujące zaproszenia
// STORY-4.7 — dostępna dla ADMIN i HELPER_PLUS; HELPER → redirect /home

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/contexts/RoleContext'
import { useHousehold } from '@/hooks/home/useHousehold'
import { HouseholdMembers } from '@/components/home/household/HouseholdMembers'
import { InviteForm } from '@/components/home/household/InviteForm'
import { PendingInvites } from '@/components/home/household/PendingInvites'

export default function HouseholdPage() {
  const router = useRouter()
  const { user, role, isLoading: authLoading } = useUser()

  // Używamy useHousehold do weryfikacji, że household istnieje dla usera
  // (zgodnie z wymaganiem: Użyj hooka useHousehold z hooks/home/useHousehold.ts)
  const { household, loading: householdLoading, error: householdError } = useHousehold()

  // Klucz do wyzwalania odświeżania PendingInvites po wysłaniu zaproszenia
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0)

  const handleInviteSuccess = useCallback(() => {
    setInviteRefreshKey(k => k + 1)
  }, [])

  // Role guard — redirect HELPER do /home
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    if (role === 'HELPER') {
      router.replace('/home')
    }
  }, [authLoading, user, role, router])

  // Stany ładowania
  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 rounded" style={{ background: '#2a2540', width: '60%' }} />
          <div className="h-14 rounded" style={{ background: '#2a2540' }} />
          <div className="h-14 rounded" style={{ background: '#2a2540' }} />
        </div>
      </div>
    )
  }

  // Brak uprawnień (HELPER) — renderuj pusty fragment (useEffect zrobi redirect)
  if (role === 'HELPER' || !user) {
    return null
  }

  const isAdmin = role === 'ADMIN'

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* Nagłówek */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>
          👥 Zarządzanie Household
        </h1>
        {household && (
          <span
            className="text-[12px] px-2 py-[2px] rounded-full"
            style={{ background: '#2d1b4a', color: '#c4b5fd' }}
          >
            {household.name}
          </span>
        )}
      </div>

      {householdError && (
        <div
          className="text-[12px] px-3 py-2 rounded-lg border"
          style={{ color: '#f85149', borderColor: '#dc2626', background: '#3a1a1a' }}
        >
          ⚠️ {householdError}
        </div>
      )}

      {/* Sekcja 1: Aktualni członkowie */}
      <section>
        <h2
          className="text-[11px] font-semibold uppercase tracking-wider mb-3"
          style={{ color: '#6b7280' }}
        >
          Członkowie rodziny
        </h2>
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: '#2a2540', background: '#1a1730' }}
        >
          {householdLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="animate-pulse h-14 rounded-lg"
                  style={{ background: '#2a2540' }}
                />
              ))}
            </div>
          ) : (
            <HouseholdMembers
              currentUserId={user.id}
              currentUserRole={role ?? 'HELPER'}
            />
          )}
        </div>
      </section>

      {/* Sekcja 2: Zaproś (tylko ADMIN) */}
      {isAdmin && (
        <section>
          <h2
            className="text-[11px] font-semibold uppercase tracking-wider mb-3"
            style={{ color: '#6b7280' }}
          >
            Zaproś do household
          </h2>
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: '#2a2540', background: '#1a1730' }}
          >
            <InviteForm onSuccess={handleInviteSuccess} />
          </div>
        </section>
      )}

      {/* Sekcja 3: Oczekujące zaproszenia */}
      <section>
        <h2
          className="text-[11px] font-semibold uppercase tracking-wider mb-3"
          style={{ color: '#6b7280' }}
        >
          Oczekujące zaproszenia
        </h2>
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: '#2a2540', background: '#1a1730' }}
        >
          <PendingInvites refreshKey={inviteRefreshKey} />
        </div>
      </section>
    </div>
  )
}
