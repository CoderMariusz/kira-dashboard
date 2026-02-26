---
story_id: STORY-12.14
title: "Full test suite — integration testy wszystkich zmigrowanych endpointów"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 8h
depends_on: STORY-12.7, STORY-12.8, STORY-12.9, STORY-12.10, STORY-12.11, STORY-12.12
blocks: STORY-12.15
tags: [testing, integration, jest, supabase, tdd]
---

## 🎯 User Story

**Jako** developer
**Chcę** pełen zestaw integration testów na każdy zmigrowany endpoint
**Żeby** mieć pewność że migracja Bridge→Supabase nie zepsuła API i każdy edge case jest pokryty

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `__tests__/api/stories.test.ts`
- `__tests__/api/epics.test.ts`
- `__tests__/api/nightclaw.test.ts`
- `__tests__/api/patterns.test.ts`
- `__tests__/api/models.test.ts`
- `__tests__/api/runs.test.ts`
- `__tests__/api/stories-advance.test.ts`

### Stack testowy
- Jest + Testing Library
- Supabase mock: `@supabase/supabase-js` mockowany na poziomie `createClient`
- Auth mock: `requireAuth` / `requireAdmin` mockowane per test

### Stan systemu przed tą story
- EPIC-14 (TDD setup) DONE — Jest konfiguracja istnieje
- Wszystkie zmigrowane endpointy (12.7-12.12) DONE

---

## ✅ Acceptance Criteria

### AC-1: Testy GET /api/stories — 5 przypadków
GIVEN: mockowany Supabase z danymi testowymi
1. ✅ Zwraca listę stories dla authenticated user
2. ✅ Filtruje po epic_id
3. ✅ Filtruje po status
4. ✅ Zwraca pustą tablicę dla brak wyników
5. ✅ 401 dla brak auth

### AC-2: Testy GET /api/stories/[id] — 4 przypadki
1. ✅ Zwraca story + runs dla istniejącego id
2. ✅ 404 dla nieistniejącego id
3. ✅ depends_on/blocks nigdy null (zawsze [])
4. ✅ 401 dla brak auth

### AC-3: Testy GET /api/epics — 4 przypadki
1. ✅ Zwraca epics z progress %
2. ✅ Sortowanie numeryczne (EPIC-1 przed EPIC-10)
3. ✅ progress = 0 gdy total_stories = 0 (no division by zero)
4. ✅ 401 dla brak auth

### AC-4: Testy POST /api/stories/[id]/advance — 5 przypadków
1. ✅ Dual mode: execSync gdy BRIDGE_DIR ustawione
2. ✅ Queue mode: insert do bridge_commands gdy brak BRIDGE_DIR
3. ✅ 403 dla HELPER (nie ADMIN)
4. ✅ 400 dla nieprawidłowy status
5. ✅ 401 dla brak auth

### AC-5: Testy GET /api/nightclaw/* — 6 przypadków
1. ✅ GET /nightclaw/digest — latest digest
2. ✅ GET /nightclaw/digest?date=2026-02-26 — specific date
3. ✅ GET /nightclaw/digest — 404 gdy brak danych
4. ✅ GET /nightclaw/history — lista summaries
5. ✅ GET /nightclaw/research — lista findings
6. ✅ GET /nightclaw/skills-diff — skills z diff

### AC-6: Testy GET/POST /api/patterns + /api/lessons — 7 przypadków
1. ✅ GET /patterns — lista patterns + lessons z Supabase
2. ✅ GET /patterns?type=ANTI_PATTERN — filtrowanie
3. ✅ GET /patterns?search=timeout — wyszukiwanie
4. ✅ POST /patterns — ADMIN tworzy nowy pattern
5. ✅ POST /patterns — 403 dla HELPER
6. ✅ POST /lessons — ADMIN tworzy nową lekcję z auto OPS-XXX
7. ✅ POST /lessons — 400 brak title

### AC-7: Testy GET /api/models + /api/runs — 5 przypadków
1. ✅ GET /models — agregacja per model z bridge_runs
2. ✅ GET /models/sonnet-4.6/metrics?days=7 — time-series
3. ✅ GET /models — model z 0 runów
4. ✅ GET /runs — lista runs posortowana DESC
5. ✅ GET /runs — 401 brak auth

### AC-8: Coverage ≥ 90% na zmigrowanych routes
GIVEN: `npm test -- --coverage`
WHEN: sprawdzasz coverage dla `app/api/stories`, `app/api/epics`, etc.
THEN: branch + statement coverage ≥ 90%

---

## ⚙️ Szczegóły Backend

### Supabase Mock Pattern

```typescript
// __tests__/helpers/supabase-mock.ts
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

export function mockSupabaseQuery(data: any, error: any = null) {
  const chainMock = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    insert: jest.fn().mockResolvedValue({ data: null, error }),
    upsert: jest.fn().mockResolvedValue({ data: null, error }),
    not: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
  }

  // Make chained methods return resolved data at the end
  chainMock.limit.mockResolvedValue({ data, error, count: data?.length ?? 0 })

  const mockClient = {
    from: jest.fn(() => chainMock),
  }

  ;(createClient as jest.Mock).mockResolvedValue(mockClient)
  return { mockClient, chainMock }
}
```

### Auth Mock Pattern

```typescript
// __tests__/helpers/auth-mock.ts
jest.mock('@/lib/auth/requireRole', () => ({
  requireAuth: jest.fn().mockResolvedValue({ success: true, user: { id: 'test-uid' } }),
  requireAdmin: jest.fn().mockResolvedValue({ success: true, user: { id: 'test-uid' } }),
}))

export function mockAuthFail() {
  const { requireAuth } = require('@/lib/auth/requireRole')
  requireAuth.mockResolvedValueOnce({
    success: false,
    response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
  })
}

export function mockAdminFail() {
  const { requireAdmin } = require('@/lib/auth/requireRole')
  requireAdmin.mockResolvedValueOnce({
    success: false,
    response: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
  })
}
```

### Przykład testu

```typescript
// __tests__/api/stories.test.ts
import { GET } from '@/app/api/stories/route'
import { mockSupabaseQuery, mockAuthFail } from '../helpers'

describe('GET /api/stories', () => {
  it('returns stories for authenticated user', async () => {
    mockSupabaseQuery([
      { id: 'STORY-1.1', epic_id: 'EPIC-1', title: 'Test', status: 'DONE' },
    ])

    const request = new Request('http://test/api/stories?project=kira-dashboard')
    const response = await GET(request as any)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.data[0].id).toBe('STORY-1.1')
  })

  it('returns 401 when not authenticated', async () => {
    mockAuthFail()
    const request = new Request('http://test/api/stories')
    const response = await GET(request as any)
    expect(response.status).toBe(401)
  })
})
```

### Uruchomienie

```bash
npm test -- --coverage --collectCoverageFrom='app/api/**/*.ts'
```

---

## ⚠️ Edge Cases

### EC-1: Supabase mock nie obsługuje chained calls
Scenariusz: `supabase.from('x').select('*').eq('y', 'z').order(...)` — mock nie łączy chainów
Oczekiwane zachowanie: każda metoda zwraca `this` (mockReturnThis) z final promise na `limit()` lub `single()`

### EC-2: Testy izolowane — nie dzielą stanu
Scenariusz: test A mockuje Supabase, test B go nie resetuje
Oczekiwane zachowanie: `beforeEach(() => jest.clearAllMocks())` w każdym describe

### EC-3: NextRequest w testach
Scenariusz: `new NextRequest(...)` wymaga URL
Oczekiwane zachowanie: `new NextRequest(new URL('http://test/api/stories'))` lub użyj `Request`

### EC-4: Dynamic import route handlers
Scenariusz: Next.js route handlers mogą być lazy-loaded
Oczekiwane zachowanie: import bezpośrednio: `import { GET } from '@/app/api/stories/route'`

---

## 🚫 Out of Scope
- E2E testy (STORY-12.15)
- Performance benchmarks
- Test fixtures z prawdziwymi danymi Supabase (używamy mocki)

---

## ✔️ Definition of Done
- [ ] 36+ test cases pokrywające wszystkie zmigrowane endpointy
- [ ] Coverage ≥ 90% na routes `app/api/stories`, `epics`, `nightclaw`, `patterns`, `models`, `runs`
- [ ] Każdy test izolowany (mockReset w beforeEach)
- [ ] `npm test` zielone w <30s
- [ ] Helpers: `supabase-mock.ts`, `auth-mock.ts` — reusable
- [ ] Testy weryfikują edge cases (puste dane, auth fail, 404)
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
