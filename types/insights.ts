// types/insights.ts
// Typy TypeScript dla zakładki Insights (STORY-1.7).
// Odpowiadają strukturom zwracanym przez Bridge API:
//   GET /api/nightclaw/latest
//   GET /api/patterns?limit=5&status=confirmed
//   GET /api/health, /api/health/memu, /api/health/db

// ─── NightClaw ──────────────────────────────────────────────────────────────

/** Dane dzisiejszego raportu NightClaw. Zwracane przez GET /api/nightclaw/latest. */
export interface NightClawData {
  /** Data raportu w formacie ISO, np. "2026-02-19". */
  date: string
  /** Timestamp raportu w formacie ISO, np. "2026-02-19T02:03:14Z". */
  timestamp: string
  /** Liczba nowych wzorców wykrytych dziś. */
  new_patterns_today: number
  /** Liczba wyekstrahowanych lekcji. */
  lessons_extracted: number
  /** Liczba oflagowanych anty-wzorców. */
  anti_patterns_flagged: number
  /** Ścieżka do pliku raportu, np. "/reports/nightclaw-2026-02-19.md". */
  file_url: string
  /** Treść skrótu raportu (digest). Null gdy NightClaw nie wygenerował digests dziś. */
  digest?: string | null
}

// ─── Patterns ───────────────────────────────────────────────────────────────

/** Typ wzorca w systemie. */
export type PatternType = 'PATTERN' | 'ANTI' | 'LESSON'

/** Jeden pattern. Zwracany przez GET /api/patterns. */
export interface Pattern {
  id: string
  type: PatternType
  /** Temat/nazwa wzorca, np. "dev_code_review". */
  topic: string
  /** Liczba wystąpień wzorca. */
  occurrence_count: number
  /** Pełny opis wzorca. */
  description: string
  /** Powiązane stories, np. ["STORY-12.10", "STORY-13.8"]. */
  related_stories?: string[]
}

/** Odpowiedź z GET /api/patterns. */
export interface PatternsResponse {
  patterns: Pattern[]
}

// ─── Health ─────────────────────────────────────────────────────────────────

/** Status pojedynczego komponentu systemu. */
export interface HealthItem {
  status: 'UP' | 'DOWN'
  /** Czas odpowiedzi w ms — tylko dla Bridge API. */
  ping_ms?: number
}

/** Typ alertu systemowego. */
export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO' | 'OK'

/** Jeden alert systemowy z /api/health. */
export interface Alert {
  type: AlertType
  message: string
  detail: string
}

/** Połączone dane zdrowia systemu z 3 endpointów. */
export interface HealthData {
  bridge: HealthItem
  memu: HealthItem
  /** Rozmiar bazy danych w MB. */
  db_size_mb: number
  /** Timestamp ostatniego runu (ISO datetime). */
  last_run: string
  alerts: Alert[]
}

// ─── Raw API responses ────────────────────────────────────────────────────────

/** Surowa odpowiedź z GET /api/health. */
export interface RawHealthResponse {
  bridge_status?: 'UP' | 'DOWN'
  ping_ms?: number
  last_run?: string
  alerts?: Alert[]
}

/** Surowa odpowiedź z GET /api/health/memu. */
export interface RawMemuResponse {
  status?: 'UP' | 'DOWN'
}

/** Surowa odpowiedź z GET /api/health/db. */
export interface RawDbResponse {
  size_mb?: number
}
