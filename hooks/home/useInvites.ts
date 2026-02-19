'use client'
// hooks/home/useInvites.ts
// Hook do zarządzania zaproszeniami household — STORY-4.7

import { useState, useEffect, useCallback } from 'react'
import type { HouseholdInvite } from '@/types/home'

// ─────────────────────────────────────────────────────────
// Fetch: oczekujące zaproszenia
// ─────────────────────────────────────────────────────────
interface UseInvitesReturn {
  invites:  HouseholdInvite[]
  loading:  boolean
  error:    string | null
  refetch:  () => void
}

export function useInvites(): UseInvitesReturn {
  const [invites, setInvites]   = useState<HouseholdInvite[]>([])
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
        const res = await fetch('/api/home/household/invite')

        if (!res.ok) {
          if (res.status >= 400 && res.status < 500) {
            const body = (await res.json()) as { error?: string }
            console.warn('[useInvites] 4xx:', body.error)
            setError(body.error ?? 'Nie udało się załadować zaproszeń')
          } else {
            setError('Nie udało się załadować zaproszeń. Spróbuj ponownie.')
          }
          return
        }

        const data = (await res.json()) as { invites: HouseholdInvite[] }
        if (!cancelled) setInvites(data.invites ?? [])
      } catch {
        if (!cancelled) setError('Nie udało się załadować zaproszeń. Sprawdź połączenie.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [trigger])

  return { invites, loading, error, refetch }
}

// ─────────────────────────────────────────────────────────
// Mutation: wyślij zaproszenie (POST)
// ─────────────────────────────────────────────────────────
interface SendInviteOptions {
  onSuccess?: (invite: HouseholdInvite) => void
  onError?: (msg: string, field?: string) => void
}

export function useSendInvite({ onSuccess, onError }: SendInviteOptions = {}) {
  const [isPending, setIsPending] = useState(false)

  const sendInvite = useCallback(async (email: string) => {
    setIsPending(true)
    try {
      const res = await fetch('/api/home/household/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const body = (await res.json()) as { invite?: HouseholdInvite; error?: string; field?: string }

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          console.warn('[useSendInvite] 4xx:', body.error)
        }
        onError?.(body.error ?? 'Nie udało się wysłać zaproszenia. Spróbuj ponownie.', body.field)
        return false
      }

      onSuccess?.(body.invite!)
      return true
    } catch {
      onError?.('Nie udało się wysłać zaproszenia. Sprawdź połączenie.')
      return false
    } finally {
      setIsPending(false)
    }
  }, [onSuccess, onError])

  return { sendInvite, isPending }
}

// ─────────────────────────────────────────────────────────
// Mutation: anuluj zaproszenie (DELETE)
// ─────────────────────────────────────────────────────────
interface RevokeInviteOptions {
  onSuccess?: () => void
  onError?: (msg: string) => void
}

export function useRevokeInvite({ onSuccess, onError }: RevokeInviteOptions = {}) {
  const [isPending, setIsPending] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const revokeInvite = useCallback(async (inviteId: string) => {
    setIsPending(true)
    setPendingId(inviteId)
    try {
      const res = await fetch(`/api/home/household/invite/${encodeURIComponent(inviteId)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        if (res.status >= 400 && res.status < 500) {
          console.warn('[useRevokeInvite] 4xx:', body.error)
        }
        onError?.(body.error ?? 'Nie udało się anulować zaproszenia.')
        return false
      }

      onSuccess?.()
      return true
    } catch {
      onError?.('Nie udało się anulować. Sprawdź połączenie.')
      return false
    } finally {
      setIsPending(false)
      setPendingId(null)
    }
  }, [onSuccess, onError])

  return { revokeInvite, isPending, pendingId }
}
