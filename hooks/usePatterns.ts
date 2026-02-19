'use client'

// hooks/usePatterns.ts
// Endpoint /api/patterns nie istnieje jeszcze w Bridge — stub zwraca puste dane.
// TODO: zaimplementować gdy Bridge doda wzorce.

import type { Pattern } from '@/types/insights'

interface UsePatternsReturn {
  patterns: Pattern[] | null
  loading: boolean
  offline: boolean
}

export function usePatterns(): UsePatternsReturn {
  return { patterns: null, loading: false, offline: false }
}
