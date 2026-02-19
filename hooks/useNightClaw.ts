'use client'

// hooks/useNightClaw.ts
// Endpoint /api/nightclaw/latest nie istnieje jeszcze w Bridge — stub zwraca puste dane.
// TODO: zaimplementować gdy Bridge doda NightClaw digest API.

interface UseNightClawReturn {
  data: null
  loading: false
  offline: false
  noDigest: true
}

export function useNightClaw(): UseNightClawReturn {
  return { data: null, loading: false, offline: false, noDigest: true }
}
