// lib/utils/timeAgo.ts
// Relatywny czas po polsku — bez zewnętrznych bibliotek

/**
 * Zwraca relatywny czas po polsku, np. "10 min temu", "1h temu", "wczoraj".
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'przed chwilą'
  if (diffMins < 60) return `${diffMins} min temu`
  if (diffHours < 24) return `${diffHours}h temu`
  if (diffDays === 1) return 'wczoraj'
  return `${diffDays} dni temu`
}
