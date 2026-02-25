---
story_id: STORY-7.4
title: "Unit + integration testy dla EPIC-6 (serwisy, hooki, routes)"
epic: EPIC-7
domain: backend
difficulty: moderate
recommended_model: kimi
priority: must
depends_on: [STORY-7.1, STORY-7.2]
blocks: []
---

## 🎯 Cel
Napisać testy jednostkowe i integracyjne dla kodu wprowadzonego w EPIC-6 — serwisy, hooki, API routes.

## ✅ Acceptance Criteria

### AC-1: Testy serwisów (unit)
Pliki: `__tests__/services/prdService.test.ts`, `__tests__/services/projectsService.test.ts`

Per serwis:
- Happy path: poprawna odpowiedź → zwraca typed data
- Error path: 422 → rzuca ApiError z polskim komunikatem
- Error path: 500 → rzuca ApiError z fallback message
- Network error (fetch throws) → propaguje error

Użyj MSW handlers do mockowania fetch.

### AC-2: Testy hooka `useProjectStats` (unit)
Plik: `__tests__/hooks/useProjectStats.test.ts`

- Loading state: `stats: null`, `isLoading: true`
- Success: `stats.projects` populated, `isLoading: false`
- Error: `error` truthy, `stats: null`
- `refreshInterval` ustawiony na 60_000 (sprawdź przez mockowanie useSWR)

### AC-3: Testy API routes (integration)
Pliki w `__tests__/api/pipeline/`:

`prd-questions.test.ts`:
- 401 bez sesji
- 400 za krótki prd_text (< 50 znaków)
- 200 z valid input + mockowanym Anthropic SDK

`create-from-prd.test.ts`:
- 401 bez sesji
- 400 brakujące wymagane pola
- 409 projekt o tym kluczu istnieje (mockuj Bridge CLI)

`bulk-action.test.ts`:
- 401 bez sesji
- 400 pusta lista story_ids
- 200 partial success (nie jest błędem)

`projects/stats.test.ts`:
- 401 bez sesji
- 200 z mockowanym Bridge CLI output

### AC-4: Coverage check
- `npm run test:coverage` → coverage ≥ 80% dla plików z `services/`, `hooks/`
- Routes coverage: ≥ 70% (bridge CLI calls trudne do pełnego mockowania)

## ⚠️ Uwagi
- Bridge CLI mockuj przez `jest.mock('child_process')` lub przez `jest.spyOn(exec, ...)`
- Użyj `mockAdminSession()` z STORY-7.2 dla route testów
- MSW handlers nadpisuj per-test przez `server.use(http.post(...))`
- Nie testuj implementacji — testuj HTTP request → response

## ✔️ DoD
- [ ] `npm test __tests__/services/ __tests__/hooks/ __tests__/api/` → wszystkie pass
- [ ] Coverage raport: services/ + hooks/ ≥ 80%
- [ ] Commit na `feature/STORY-7.4`
