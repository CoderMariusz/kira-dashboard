'use client'

// hooks/usePatterns.ts
// Endpoint /api/patterns nie istnieje jeszcze w Bridge — stub zwraca puste dane.
// TODO: zaimplementować gdy Bridge doda wzorce.

interface UsePatternsReturn {
  patterns: null
  loading: false
  offline: false
}

export function usePatterns(): UsePatternsReturn {
  return { patterns: null, loading: false, offline: false }
}
