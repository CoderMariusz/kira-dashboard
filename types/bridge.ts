// types/bridge.ts
// Centralne typy TypeScript dla wszystkich odpowiedzi Bridge API.
// WAŻNE: Te typy muszą dokładnie odpowiadać strukturom zwracanym przez Bridge API.
// Jeśli Bridge zwróci inne pola, zaktualizuj TUTAJ, nie w hookach.

// ─── Pipeline ──────────────────────────────────────────────────────────────

/** Zagregowane statystyki projektu — odpowiedź z GET /api/projects/{key}/stats. */
export interface PipelineStats {
  /** Klucz projektu, np. "kira-dashboard". */
  key: string
  /** Łączna liczba ukończonych stories. */
  stories_done: number
  /** Łączna liczba uruchomień pipeline'u. */
  total_runs: number
  /** Success rate jako ułamek 0.0–1.0, np. 0.8857. */
  success_rate: number
  /** ISO 8601 timestamp ostatniego uruchomienia. Null jeśli brak. */
  last_run_at: string | null
  /** Średni czas trwania runu w sekundach. */
  avg_run_duration_s: number
}

/** Status story w pipeline — dokładne stringi zwracane przez Bridge API. */
export type StoryStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE'
  | 'BLOCKED'
  | 'REFACTOR'
  | 'MERGE'

/** Domena story — dokładne stringi zwracane przez Bridge API. */
export type StoryDomain = 'database' | 'auth' | 'backend' | 'wiring' | 'frontend'

/** Trudność story — dokładne stringi zwracane przez Bridge API. */
export type StoryDifficulty = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert'

/**
 * Raw story as returned by Bridge API GET /api/status/pipeline.
 * Field names differ from the app-level Story type — use mapBridgeStory() to convert.
 */
export interface BridgeStoryRaw {
  story_id: string
  epic_id: string
  model: string | null
  status: StoryStatus
  title: string
  current_step: string | null
  assigned_worker: string | null
  started_at?: string | null
  updated_at?: string
}

/** Jedna story w pipeline — typy aplikacyjne po zmapowaniu z BridgeStoryRaw. */
export interface Story {
  /** Unikalny identyfikator story, np. "STORY-1.2". */
  id: string
  /** Pełny tytuł story, np. "Bridge API data layer — hooks i typy". */
  title: string
  /** Identyfikator epica, np. "EPIC-1". */
  epic: string
  /** Aktualny status story. */
  status: StoryStatus
  /** Domena techniczna story. Null gdy Bridge nie zwraca tego pola. */
  domain: StoryDomain | null
  /** Poziom trudności story. Null gdy Bridge nie zwraca tego pola. */
  difficulty: StoryDifficulty | null
  /** Alias modelu AI przypisanego do story, np. "codex", "kimi", "sonnet". Może być null. */
  assigned_model: string | null
  /** ISO 8601 timestamp kiedy story zaczęła się (IN_PROGRESS). Może być null. */
  started_at: string | null
  /** ISO 8601 timestamp ostatniej aktualizacji. */
  updated_at: string
  /** Opcjonalna lista kryteriów Definition of Done. */
  definition_of_done?: string
}

/** Odpowiedź z GET /api/status/pipeline — lista stories z surowymi polami Bridge. */
export interface PipelineResponse {
  /** Lista stories z surowymi polami Bridge (wymagają mapowania przez mapBridgeStory). */
  stories: BridgeStoryRaw[]
}

// ─── Runs ──────────────────────────────────────────────────────────────────

/** Status jednotego runu (uruchomienia modelu AI). */
export type RunStatus = 'DONE' | 'REFACTOR' | 'IN_PROGRESS' | 'REVIEW' | 'MERGE' | 'FAILED'

/**
 * Raw run as returned by Bridge API GET /api/status/runs.
 * Field names differ from the app-level Run type — use mapBridgeRun() to convert.
 */
export interface BridgeRunRaw {
  run_id: string
  story_id: string
  step: string
  worker: string | null
  model: string
  status: RunStatus
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  retry_count: number
  tokens_in: number | null
  tokens_out: number | null
  cost_usd: number | null
  artifacts: unknown[]
}

/** Jeden run modelu AI — typy aplikacyjne po zmapowaniu z BridgeRunRaw. */
export interface Run {
  /** Unikalny identyfikator runu. */
  id: string
  /** Identyfikator story do której należy ten run, np. "STORY-1.2". */
  story_id: string
  /** Tytuł story (opcjonalny — Bridge może nie zwracać). */
  story_title?: string
  /** Alias modelu AI który wykonał run, np. "codex", "kimi", "sonnet", "haiku". */
  model: string
  /** Status runu. */
  status: RunStatus
  /** Czas trwania runu w sekundach. Null jeśli run jest in_progress lub nie zakończony. */
  duration_seconds: number | null
  /** Szacunkowy koszt runu w USD. Null jeśli nieznany. */
  cost_estimate: number | null
  /** Liczba tokenów wejściowych. Opcjonalna — dostępna gdy Bridge zwraca dane tokenów. */
  input_tokens?: number
  /** Liczba tokenów wyjściowych. Opcjonalna — dostępna gdy Bridge zwraca dane tokenów. */
  output_tokens?: number
  /** ISO 8601 timestamp stworzenia runu. */
  created_at: string
  /** ISO 8601 timestamp końca runu. Null jeśli run jest in_progress. */
  finished_at: string | null
  /** Krok pipeline'u, np. "IMPLEMENT", "REVIEW". */
  step: string
}

/** Odpowiedź z GET /api/status/runs — lista runów z surowymi polami Bridge. */
export interface RunsResponse {
  /** Lista runów z surowymi polami Bridge (wymagają mapowania przez mapBridgeRun). */
  runs: BridgeRunRaw[]
}

// ─── Eval ──────────────────────────────────────────────────────────────────

/** Wynik eval dla jednej kategorii. Zwracany przez GET /api/eval/overview w tablicy scores[]. */
export interface EvalScore {
  /** Nazwa kategorii, np. "code_quality", "test_coverage", "type_safety". */
  category: string
  /** Wynik jako liczba od 0.0 do 1.0 (gdzie 1.0 = 100%). */
  score: number
  /** Wskaźnik zdanych testów jako liczba od 0.0 do 1.0. */
  pass_rate: number
  /** Łączna liczba testów w tej kategorii. */
  total_tests: number
  /** Liczba zdanych testów w tej kategorii. */
  passed_tests: number
}

/** Jeden historyczny run eval. Zwracany w tablicy recent_runs w EvalOverviewResponse. */
export interface EvalRecentRun {
  /** Unikalny identyfikator runu. */
  id: string
  /** ISO 8601 timestamp uruchomienia, np. "2026-02-19T11:46:00Z". */
  date: string
  /** Łączny wynik 0.0–100.0. */
  total_score: number
  /** true = PASS, false = FAIL. */
  passed: boolean
  /** Czas trwania runu w milisekundach. */
  duration_ms: number
}

/** Odpowiedź z GET /api/eval/overview. */
export interface EvalOverviewResponse {
  /** Lista wyników per kategoria. */
  scores: EvalScore[]
  /** ISO 8601 timestamp ostatniego uruchomienia eval. Null jeśli eval nie był uruchamiany. */
  last_run_at: string | null
  /** Łączny wynik (average score ze wszystkich kategorii). Liczba 0.0-1.0. */
  overall_score: number
  /** Historia ostatnich 5 runów eval. Opcjonalna — może być pusta lub nie być w starych API. */
  recent_runs?: EvalRecentRun[]
}

// ─── Eval Run (Trigger + Polling) ─────────────────────────────────────────────

/** Kategoria w wyniku eval runu. */
export interface EvalRunCategory {
  /** Nazwa kategorii, np. "code_quality". */
  name: string
  /** Wynik jako liczba od 0.0 do 1.0. */
  score: number
}

/** Wynik jednego eval runu. */
export interface EvalRunResult {
  /** Procent zdanych testów, np. 87 (liczba całkowita). */
  score_percent: number
  /** Liczba zdanych testów, np. 13. */
  passed: number
  /** Łączna liczba testów, np. 15. */
  total: number
  /** Czas trwania runu w sekundach, np. 23. */
  duration_seconds: number
  /** Opcjonalne kategorie z wynikami. */
  categories?: EvalRunCategory[]
}

/** Response z GET /api/eval/run/{runId}/status. */
export interface EvalRunStatusResponse {
  /** Status runu: running, done lub failed. */
  status: 'running' | 'done' | 'failed'
  /** Wynik evaluacji — istnieje gdy status === 'done'. */
  result?: EvalRunResult
  /** Komunikat błędu — istnieje gdy status === 'failed'. */
  error?: string
}

/** Response z POST /api/eval/run. */
export interface EvalRunStartResponse {
  /** Unikalny identyfikator runu eval. */
  runId: string
}

// ─── Projects ──────────────────────────────────────────────────────────────

/** Jeden projekt zarządzany przez Kira. Zwracany przez GET /api/projects w tablicy projects[]. */
export interface Project {
  /** Unikalny klucz projektu, np. "kira", "gym-tracker". Używany w API path jako {key}. */
  key: string
  /** Pełna nazwa projektu do wyświetlenia, np. "Kira Pipeline", "Gym Tracker". */
  name: string
  /** Opcjonalny opis projektu. Null jeśli brak. */
  description: string | null
  /** Czy projekt jest aktywny (ma aktywne stories). */
  active: boolean
}

/** Odpowiedź z GET /api/projects. */
export interface ProjectsResponse {
  /** Lista wszystkich zarejestrowanych projektów. */
  projects: Project[]
}

// ─── Stan offline ──────────────────────────────────────────────────────────

/** Wspólny stan błędu/offline zwracany przez hooki gdy Bridge API niedostępne. */
export interface BridgeOfflineState {
  offline: true
  error: string
}
