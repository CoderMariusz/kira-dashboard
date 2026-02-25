---
story_id: STORY-7.1
title: "Jest + Testing Library + MSW — bazowa infrastruktura testów"
epic: EPIC-7
domain: infra
difficulty: moderate
recommended_model: codex
priority: must
depends_on: []
blocks: [STORY-7.2, STORY-7.3, STORY-7.4]
---

## 🎯 Cel
Zainstalować i skonfigurować pełny stack testów jednostkowych i integracyjnych.

## ✅ Acceptance Criteria

### AC-1: Pakiety zainstalowane
- `jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
- `msw` (v2), `ts-jest` lub `babel-jest` z TypeScript support
- `@types/jest`

### AC-2: `jest.config.ts` skonfigurowany
- `testEnvironment: 'jsdom'`
- `setupFilesAfterFramework: ['<rootDir>/jest.setup.ts']`
- Module aliases: `@/*` → `<rootDir>/*`
- Ignoruje `node_modules`, `.next`, `tests/` (Playwright)
- Coverage: `collectCoverageFrom` dla `app/**`, `components/**`, `hooks/**`, `services/**`
- Coverage thresholds: `branches: 80, functions: 80, lines: 80, statements: 80`

### AC-3: `jest.setup.ts` skonfigurowany
- Import `@testing-library/jest-dom`
- MSW server setup: `beforeAll(server.listen)`, `afterEach(server.resetHandlers)`, `afterAll(server.close)`

### AC-4: MSW handlers bazowe
- `__tests__/mocks/handlers.ts` — puste handlers (placeholder)
- `__tests__/mocks/server.ts` — MSW Node server export

### AC-5: `package.json` scripts
```json
"test": "jest",
"test:watch": "jest --watch",
"test:coverage": "jest --coverage",
"test:ci": "jest --ci --coverage --forceExit"
```

### AC-6: Smoke test — `npx jest` działa
- Napisz 1 trivial test: `__tests__/smoke.test.ts` → `expect(1+1).toBe(2)`
- `npm test` kończy się sukcesem (exit 0)

## ⚠️ Uwagi
- Next.js 16, React 19, TypeScript ES2022, App Router
- Użyj `jest-environment-jsdom` (nie `node`) — testy komponentów React
- `ts-jest` lub `babel-jest` z `@babel/preset-typescript` — oba OK
- NIE instaluj Playwright tutaj (STORY-7.3)
- NIE mockuj Supabase tutaj (STORY-7.2)

## ✔️ DoD
- [ ] `npm test` → exit 0
- [ ] `npm run test:coverage` → exit 0 z raportem coverage
- [ ] Brak błędów TypeScript w plikach konfiguracyjnych
- [ ] Commit na `feature/STORY-7.1`
