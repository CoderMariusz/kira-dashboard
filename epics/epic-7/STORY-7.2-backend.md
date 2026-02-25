---
story_id: STORY-7.2
title: "Supabase auth mock — pomocniki testowe dla App Router"
epic: EPIC-7
domain: backend
difficulty: moderate
recommended_model: sonnet
priority: must
depends_on: [STORY-7.1]
blocks: [STORY-7.4]
---

## 🎯 Cel
Stworzyć reużywalne mocki sesji Supabase dla Next.js App Router, żeby testy backend route nie wymagały prawdziwego auth.

## ✅ Acceptance Criteria

### AC-1: Mock helper `__tests__/helpers/auth.ts`
```typescript
export function mockAdminSession() // mockuje zalogowanego admina
export function mockUserSession(role: 'admin' | 'user')
export function mockNoSession() // mockuje brak sesji (401)
```

### AC-2: Supabase server client mockowany
- `@/lib/supabase/server` (lub gdzie jest `createServerClient`) mockowany przez `jest.mock()`
- `auth.getSession()` zwraca kontrolowaną wartość
- `from().select()` można mockować per-test przez `mockResolvedValueOnce`

### AC-3: Przykładowy test route używający pomocników
Plik: `__tests__/api/pipeline/prd-questions.test.ts`
- Test 1: `mockNoSession()` → POST → expect 401
- Test 2: `mockAdminSession()` + short prd_text → POST → expect 400
- Test 3: `mockAdminSession()` + valid prd_text + mockowany Anthropic SDK → POST → expect 200

### AC-4: `__tests__/helpers/index.ts` — barrel export
```typescript
export * from './auth'
export * from './fetch' // mockRequest helper: new Request(url, { method, body })
```

### AC-5: `npm test` zielone
- Wszystkie testy z AC-3 przechodzą

## ⚠️ Uwagi
- Sprawdź ścieżkę do Supabase client: `lib/supabase/server.ts` lub `utils/supabase/server.ts`
- Anthropic SDK mock: `jest.mock('@anthropic-ai/sdk')` z `.mockResolvedValue`
- App Router routes: importuj `POST` / `GET` funkcję bezpośrednio i wywołuj z `new Request(...)`
- NIE mockuj całej bazy danych — tylko auth + konkretne query per test

## ✔️ DoD
- [ ] `npm test __tests__/api/` → wszystkie pass
- [ ] auth mock działa w izolacji (nie wymaga `.env.local`)
- [ ] Commit na `feature/STORY-7.2`
