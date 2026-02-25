---
story_id: STORY-7.4
title: "API historii runów /api/eval/runs + per-task diff"
epic: EPIC-7
domain: backend
difficulty: hard
recommended_model: sonnet
priority: must
depends_on: [STORY-7.1, STORY-7.2]
blocks: [STORY-7.5, STORY-7.8]
---

## 🎯 Cel
Rozbudować API eval runs o paginowaną historię, szczegóły per-run z wynikami per-task
oraz diff (expected vs actual) ze wskazaniem co się zmieniło vs poprzedni run.

## Kontekst
**Projekt:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard`
Bridge już ma: `GET /api/eval/overview` i `POST /api/eval/run` — NIE modyfikuj tych endpointów.
Sprawdź istniejące: `cat app/api/eval/run/route.ts`
Bridge repos: `eval_run_result_repo.py` (STORY-7.1)

## ✅ Acceptance Criteria

### AC-1: `GET /api/eval/runs` — paginowana historia
- Auth: `requireAuth` (401)
- Query: `?limit=20&offset=0`
- Wywołuje Bridge → pobiera runs z `eval_runs` tabeli, sortowane `created_at DESC`
- Response:
```typescript
{
  runs: Array<{
    id: string
    created_at: string
    duration_ms: number | null
    overall_score: number        // % passed tasks
    total_tasks: number
    passed_tasks: number
    status: 'PASS' | 'FAIL' | 'RUNNING' | 'ERROR'
  }>
  total: number
  has_more: boolean
}
```
- 200 OK

### AC-2: `GET /api/eval/runs/[runId]` — szczegóły runu
- Auth: `requireAuth`
- 404 jeśli run nie istnieje
- Response:
```typescript
{
  run: { id, created_at, duration_ms, overall_score, status }
  task_results: Array<{
    task_id: string
    task_prompt: string
    task_category: string
    task_model: string
    expected_output: string
    actual_output: string
    passed: boolean
    diff_score: number
    diff_lines: Array<{ type: 'equal'|'insert'|'delete', value: string }>
  }>
  delta: {                       // porównanie z poprzednim runem
    newly_failed: string[]       // task_ids które teraz FAIL, poprzednio PASS
    newly_passed: string[]       // task_ids które teraz PASS, poprzednio FAIL
    unchanged_fail: string[]
    unchanged_pass: string[]
  } | null                       // null jeśli brak poprzedniego runu
}
```

### AC-3: Algorytm diff
- Użyj `npm install diff` (lekka biblioteka, 0 zależności)
- `import { diffLines } from 'diff'`
- Per task: `diffLines(expected_output, actual_output)` → mapuj na `{ type, value }`
- diff_score: % linii identycznych (0.0–1.0)

### AC-4: Delta vs poprzedni run
- Pobierz poprzedni run (według `created_at < current_run.created_at` ORDER BY DESC LIMIT 1)
- Jeśli brak → `delta: null`
- Porównaj task_results obu runów po `task_id`

### AC-5: Integracja z istniejącym `POST /api/eval/run`
- Po zakończeniu runu, zapisz wyniki do `eval_run_task_results`
- Zaktualizuj `app/api/eval/run/route.ts` aby zapisywał per-task wyniki jeśli `eval_tasks` istnieją
- Jeśli brak eval_tasks → działaj jak dotychczas (backward compatible)

### AC-6: Testy integracyjne
`__tests__/api/eval/runs.test.ts`:
- GET /runs 401 bez sesji
- GET /runs 200 pusta lista
- GET /runs 200 z danymi + paginacja
- GET /runs/[id] 404 nieistniejący
- GET /runs/[id] 200 z delta=null (brak poprzedniego)
- GET /runs/[id] 200 z delta populated

`npm test __tests__/api/eval/runs.test.ts` → PASS

## ⚠️ Uwagi
- `diff` package: `npm install diff && npm install -D @types/diff`
- Jeśli eval_run_task_results jest pusty dla runu → task_results: [] (nie błąd)
- eval_runs tabela może mieć inną strukturę — sprawdź schema przed implementacją
- Backward compatible z istniejącym `useEval` hookiem

## ✔️ DoD
- [ ] GET /runs i GET /runs/[id] działają
- [ ] diff_lines poprawnie generowane
- [ ] delta poprawnie wyliczana
- [ ] Testy PASS
- [ ] `npx tsc --noEmit` clean
- [ ] Commit na `feature/STORY-7.4`
