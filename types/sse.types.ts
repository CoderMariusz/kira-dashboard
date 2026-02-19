// types/sse.types.ts
// Typy SSE eventów i payloadów — używane przez useSSE() i useStoryActions().

/** Dozwolone typy eventów SSE */
export type SSEEventType = 'story_advanced' | 'eval_done' | 'heartbeat'

/** Bazowy interfejs eventu SSE */
export interface SSEEvent {
  type: SSEEventType
  payload: unknown // Zagnieżdżony interfejs per typ — patrz niżej
  ts: number // Unix timestamp w milisekundach, np. Date.now()
}

/** Payload dla eventu story_advanced */
export interface StoryAdvancedPayload {
  storyId: string // np. "STORY-1.3"
  previousStatus: string // np. "IN_PROGRESS"
  newStatus: string // np. "REVIEW"
  model: string // np. "sonnet-4.6"
}

/** Payload dla eventu eval_done */
export interface EvalDonePayload {
  runId: string // UUID runu eval
  passRate: number // 0.0–1.0, np. 0.87
  totalCases: number // liczba przypadków testowych, np. 54
  passedCases: number // liczba przypadków zaliczonych, np. 47
  duration: number // czas wykonania w sekundach
}

/** Payload dla heartbeat — echo timestampa z serwera */
export interface HeartbeatPayload {
  ts: number
}

/** Zwracany przez useSSE */
export interface UseSSEReturn {
  /** Ostatnie max 100 eventów, najnowszy na początku */
  events: SSEEvent[]
  /** Czy EventSource jest aktualnie połączony */
  connected: boolean
  /** Opis błędu lub null */
  error: string | null
  /** Aktualna liczba prób reconnect (0–10) */
  reconnectAttempts: number
}

/** Zwracany przez useStoryActions */
export interface UseStoryActionsReturn {
  startStory: (id: string) => Promise<void>
  advanceStory: (id: string, status: string) => Promise<void>
  loading: boolean
  error: string | null
}
