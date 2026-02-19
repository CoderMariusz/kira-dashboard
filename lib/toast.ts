import { toast } from 'sonner'
import type { StoryAdvancedPayload, EvalDonePayload } from '@/types/sse.types'

// ── story_advanced ──────────────────────────────────────────────────
// Wywołaj gdy SSE event type === "story_advanced"
// Przykład: toastStoryAdvanced({ id: 'STORY-1.3', title: 'SSE hook' }, 'REVIEW')
// Wynik:    "STORY-1.3 przesunięta do REVIEW 🚀"
export function toastStoryAdvanced(
  story: { id: string; title: string },
  newStatus: string
): void {
  toast.success(`${story.id} przesunięta do ${newStatus} 🚀`, {
    description: story.title,
    duration: 4000,
    style: {
      background: '#1a3a1a',
      border: '1px solid #2a5a2a',
      color: '#4ade80',
    },
  })
}

// ── eval_done ────────────────────────────────────────────────────────
// Wywołaj gdy SSE event type === "eval_done"
// Przykład: toastEvalDone({ passRate: 0.87, totalCases: 54, passedCases: 47 })
// Wynik:    "Eval zakończony: 87% pass rate 📊 (47/54 cases)"
export function toastEvalDone(result: {
  passRate: number
  totalCases: number
  passedCases: number
}): void {
  const pct = Math.round(result.passRate * 100)
  toast(`Eval zakończony: ${pct}% pass rate 📊`, {
    description: `${result.passedCases}/${result.totalCases} cases passed`,
    duration: 4000,
    style: {
      background: '#1a3a5c',
      border: '1px solid #1e3a6e',
      color: '#60a5fa',
    },
  })
}

// ── error ─────────────────────────────────────────────────────────────
// Wywołaj przy błędach API lub SSE
// Przykład: toastError('Nie można połączyć z Bridge API')
// Wynik:    "❌ Nie można połączyć z Bridge API"
// Uwaga: toast błędu NIE znika automatycznie (duration: Infinity)
export function toastError(message: string): void {
  toast.error(`❌ ${message}`, {
    duration: Infinity,       // użytkownik musi zamknąć ręcznie
    closeButton: true,
    style: {
      background: '#3a1a1a',
      border: '1px solid #5a2a2a',
      color: '#f87171',
    },
  })
}

// ── info ──────────────────────────────────────────────────────────────
// Wywołaj dla neutralnych informacji
// Przykład: toastInfo('Pipeline jest bezczynny')
// Wynik:    "ℹ️ Pipeline jest bezczynny"
export function toastInfo(message: string): void {
  toast(`ℹ️ ${message}`, {
    duration: 4000,
    style: {
      background: '#1a1730',
      border: '1px solid #2a2540',
      color: '#6b7280',
    },
  })
}
