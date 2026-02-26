---
story_id: STORY-12.8
title: "API /api/epics — nowy endpoint czytający epics z Supabase"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: STORY-12.1, STORY-12.4
blocks: STORY-12.13, STORY-12.14
tags: [api, supabase, epics, backend]
---

## 🎯 User Story

**Jako** użytkownik dashboardu
**Chcę** żeby lista epics z postępem (done/total stories) ładowała się z Supabase
**Żeby** Overview page i Pipeline sidebar działały na Vercelu

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`app/api/epics/route.ts` — nowy endpoint

### Aktualne zachowanie
Epics czytane przez `fetchBridge('/api/status')` lub obliczane po stronie klienta z listy stories.

### Docelowe zachowanie
Dedykowany endpoint `/api/epics` czyta z `bridge_epics` (pre-computed `total_stories`, `done_stories`).

---

## ✅ Acceptance Criteria

### AC-1: GET /api/epics zwraca listę epics z Supabase
GIVEN: zalogowany użytkownik
WHEN: GET /api/epics?project=kira-dashboard
THEN: JSON tablica epics z polami: id, title, status, total_stories, done_stories, progress (%)

### AC-2: progress obliczony jako %
GIVEN: epic z 8 stories, 6 DONE
WHEN: response epics
THEN: `progress: 75` (6/8 * 100, rounded)

### AC-3: Sortowanie po numerze epica
GIVEN: epics EPIC-1 do EPIC-14
WHEN: GET /api/epics
THEN: posortowane numerycznie (1, 2, 3... 14), nie leksykalnie (1, 10, 14, 2...)

### AC-4: Auth wymagana
GIVEN: request bez JWT
WHEN: GET /api/epics
THEN: 401 Unauthorized

---

## ⚙️ Szczegóły Backend

### Endpoint

```typescript
// app/api/epics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bridge_epics')
    .select('*')
    .eq('project_id', project)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Sortuj numerycznie po EPIC-N
  const epics = (data ?? [])
    .map(e => ({
      ...e,
      progress: e.total_stories > 0
        ? Math.round((e.done_stories / e.total_stories) * 100)
        : 0,
    }))
    .sort((a, b) => {
      const numA = parseInt(a.id.replace('EPIC-', ''))
      const numB = parseInt(b.id.replace('EPIC-', ''))
      return numA - numB
    })

  return NextResponse.json({ data: epics }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
```

### Frontend integration
Stwórz hook `useEpics()` lub dodaj do istniejącego `usePipeline()`:
```typescript
const { data } = useSWR('/api/epics?project=kira-dashboard', fetcher)
```

---

## ⚠️ Edge Cases

### EC-1: Epic bez stories (total_stories = 0)
Scenariusz: EPIC-14 (TDD) — 0 stories w Supabase
Oczekiwane zachowanie: `progress: 0`, nie division by zero

### EC-2: Stale data — sync nie uruchomiony po advance story
Scenariusz: user advance'uje story → Supabase ma stare `done_stories`
Oczekiwane zachowanie: sync co 5 min (cron) — akceptowalne opóźnienie. Realtime w STORY-12.13.

---

## 🚫 Out of Scope
- Epic detail page (jeśli nie istnieje)
- Write operations na epics
- Realtime updates (STORY-12.13)

---

## ✔️ Definition of Done
- [ ] GET /api/epics zwraca epics z Supabase z progress %
- [ ] Sortowanie numeryczne (nie leksykalne)
- [ ] Auth wymagana
- [ ] Frontend Overview page używa nowego endpointu
- [ ] Działa na Vercelu (testować na preview deploy)
- [ ] Story review przez PO
