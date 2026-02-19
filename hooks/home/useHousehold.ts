'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Household, HouseholdMember } from '@/types/home'

// ──────────────────────────────────────────────────
// Return type
// ──────────────────────────────────────────────────
interface UseHouseholdReturn {
  household: Household | null
  members:   HouseholdMember[]
  loading:   boolean
  error:     string | null
  refetch:   () => void
}

// ──────────────────────────────────────────────────
// Hook — AC-6: load or create household for the current user
// ──────────────────────────────────────────────────
export function useHousehold(): UseHouseholdReturn {
  const [household, setHousehold] = useState<Household | null>(null)
  const [members, setMembers]     = useState<HouseholdMember[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = useCallback(() => setRefetchTrigger(n => n + 1), [])

  useEffect(() => {
    const supabase = createClient()

    async function init() {
      setLoading(true)
      setError(null)

      try {
        // 1. Get current authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          setError('Nie jesteś zalogowany')
          return
        }

        // 2. Check if user already belongs to a household
        const { data: memberRow, error: memberError } = await supabase
          .from('household_members')
          .select('household_id, role')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        // PGRST116 = no rows (user has no household yet) — handled below
        if (memberError) {
          throw memberError
        }

        let householdId: string

        if (!memberRow) {
          // 3. User has no household → create one via API route (server-side, service role)
          // NOTE: POST /api/home/household is implemented in STORY-4.7.
          // Fallback: create directly via Supabase client (anon key, subject to RLS).
          const res = await fetch('/api/home/household', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name: 'Moja Rodzina' }),
          })
          if (!res.ok) {
            const body = (await res.json()) as { error?: string }
            throw new Error(body.error ?? `HTTP ${res.status}`)
          }
          const { data: newHousehold } = (await res.json()) as { data: Household }
          householdId = newHousehold.id
        } else {
          householdId = memberRow.household_id as string
        }

        // 4. Fetch household details
        const { data: householdData, error: householdError } = await supabase
          .from('households')
          .select('*')
          .eq('id', householdId)
          .single()

        if (householdError) throw householdError

        // 5. Fetch all members of the household
        const { data: membersData, error: membersError } = await supabase
          .from('household_members')
          .select('*')
          .eq('household_id', householdId)

        if (membersError) throw membersError

        setHousehold(householdData as Household)
        setMembers((membersData ?? []) as HouseholdMember[])
      } catch (err) {
        const is4xx = err instanceof Error && /HTTP 4\d\d/.test(err.message)
        if (is4xx) console.warn('[useHousehold] error:', err)
        else console.error('[useHousehold] error:', err)
        setError('Nie udało się załadować danych household')
      } finally {
        setLoading(false)
      }
    }

    void init()
  }, [refetchTrigger])

  return { household, members, loading, error, refetch }
}
