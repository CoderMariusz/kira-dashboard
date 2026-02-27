'use client'
// hooks/home/useHousehold.ts
// Ładuje household przez GET /api/home/household (server-side auth via cookies).
// NIE używa client-side Supabase bezpośrednio — unika problemu Navigator LockManager
// w headless Chromium (Playwright) gdzie supabase.auth.getSession() wisi.

import { useState, useEffect, useCallback } from 'react'
import type { Household, HouseholdMember } from '@/types/home'

interface UseHouseholdReturn {
  household:     Household | null
  members:       HouseholdMember[]
  loading:       boolean
  error:         string | null
  isCreating:    boolean
  creationError: string | null
  refetch:       () => void
}

export function useHousehold(): UseHouseholdReturn {
  const [household, setHousehold]         = useState<Household | null>(null)
  const [members, setMembers]             = useState<HouseholdMember[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [isCreating, setIsCreating]       = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = useCallback(() => setRefetchTrigger(n => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      setError(null)

      try {
        // GET /api/home/household — server-side auth, nie wymaga client Supabase
        const res = await fetch('/api/home/household')

        if (res.status === 401) {
          if (!cancelled) setError('Nie jesteś zalogowany')
          return
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const body = await res.json() as { data: Household | null; members?: HouseholdMember[] }

        if (!body.data) {
          // Brak household — utwórz przez POST
          if (!cancelled) setIsCreating(true)
          try {
            const createRes = await fetch('/api/home/household', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Moja Rodzina' }),
            })
            if (!createRes.ok) {
              const err = await createRes.json() as { error?: string }
              throw new Error(err.error ?? `HTTP ${createRes.status}`)
            }
            const { data: newHousehold } = await createRes.json() as { data: Household }
            if (!cancelled) {
              setHousehold(newHousehold)
              setMembers([])
            }
          } catch (createErr) {
            if (!cancelled) setCreationError(createErr instanceof Error ? createErr.message : 'Błąd tworzenia household')
          } finally {
            if (!cancelled) setIsCreating(false)
          }
          return
        }

        if (!cancelled) {
          setHousehold(body.data)
          setMembers((body.members ?? []) as HouseholdMember[])
        }
      } catch (err) {
        if (!cancelled) setError('Nie udało się załadować danych household')
        console.warn('[useHousehold]', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void init()
    return () => { cancelled = true }
  }, [refetchTrigger])

  return { household, members, loading, error, isCreating, creationError, refetch }
}
