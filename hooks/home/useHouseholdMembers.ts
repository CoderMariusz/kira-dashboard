'use client'
// hooks/home/useHouseholdMembers.ts
// Hook do zarządzania członkami household — STORY-4.7
// Używa API route GET /api/home/household/members (zwraca dane z display_name i email)

import { useState, useEffect, useCallback } from 'react'
import type { HouseholdMemberExtended } from '@/types/home'

interface UseHouseholdMembersReturn {
  members:  HouseholdMemberExtended[]
  loading:  boolean
  error:    string | null
  refetch:  () => void
}

export function useHouseholdMembers(): UseHouseholdMembersReturn {
  const [members, setMembers]   = useState<HouseholdMemberExtended[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [trigger, setTrigger]   = useState(0)

  const refetch = useCallback(() => setTrigger(n => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/home/household/members')

        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            const body = (await res.json()) as { error?: string }
            console.warn('[useHouseholdMembers] 4xx:', body.error)
            setError(body.error ?? 'Nie udało się załadować członków')
          } else {
            setError('Nie udało się załadować członków. Spróbuj ponownie.')
          }
          return
        }

        const data = (await res.json()) as { members: HouseholdMemberExtended[] }
        if (!cancelled) {
          setMembers(data.members ?? [])
        }
      } catch {
        if (!cancelled) {
          setError('Nie udało się załadować członków. Sprawdź połączenie.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [trigger])

  return { members, loading, error, refetch }
}

// ─────────────────────────────────────────────────────────
// Mutation: usuń członka (DELETE)
// ─────────────────────────────────────────────────────────
interface DeleteMemberOptions {
  onSuccess?: () => void
  onError?: (msg: string) => void
}

export function useDeleteMember({ onSuccess, onError }: DeleteMemberOptions = {}) {
  const [isPending, setIsPending] = useState(false)

  const deleteMember = useCallback(async (memberId: string) => {
    setIsPending(true)
    try {
      const res = await fetch(`/api/home/household/members?member_id=${encodeURIComponent(memberId)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        if (res.status >= 400 && res.status < 500) {
          console.warn('[useDeleteMember] 4xx:', body.error)
        }
        onError?.(body.error ?? 'Nie udało się usunąć. Spróbuj ponownie.')
        return false
      }

      onSuccess?.()
      return true
    } catch {
      onError?.('Nie udało się usunąć. Sprawdź połączenie i spróbuj ponownie.')
      return false
    } finally {
      setIsPending(false)
    }
  }, [onSuccess, onError])

  return { deleteMember, isPending }
}
