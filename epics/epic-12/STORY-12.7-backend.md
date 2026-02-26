---
story_id: STORY-12.7
title: "API /api/stories — migracja z Bridge CLI na Supabase (GET list + GET detail)"
epic: EPIC-12
module: supabase-migration
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: STORY-12.1, STORY-12.4
blocks: STORY-12.13, STORY-12.14
tags: [api, supabase, stories, migration, backend]
---

## 🎯 User Story

**Jako** użytkownik dashboardu
**Chcę** żeby lista stories i szczegóły story ładowały się z Supabase zamiast Bridge CLI
**Żeby** strona Pipeline działała na Vercelu bez dostępu do lokalnego Bridge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `app/api/stories/route.ts` — nowy endpoint GET /api/stories (lista)
- `app/api/stories/[id]/route.ts` — istniejący lub nowy GET (detail)
- Aktualne: `app/api/bridge/[...path]/route.ts` — proxy do Bridge HTTP API

### Aktualne zachowanie
Dashboard fetchuje dane przez `fetchBridge('/api/status/stories')` → Bridge HTTP na `127.0.0.1:8199`.
Na Vercelu Bridge nie istnieje → dane puste.

### Docelowe zachowanie
Dashboard czyta z Supabase `bridge_stories` tabeli. Bridge HTTP API służy jako write-only (advance, start).

### Powiązane pliki
- `lib/bridge.ts` — `fetchBridge()` helper
- `lib/supabase/server.ts` — `createClient()` Supabase
- `types/bridge.ts` — BridgeStory, StoryStatus, etc.
- `hooks/useStories.ts` lub `hooks/usePipeline.ts` — frontend hooki SWR

---

## ✅ Acceptance Criteria

### AC-1: GET /api/stories zwraca listę stories z Supabase
GIVEN: zalogowany użytkownik z ważnym JWT
WHEN: GET /api/stories?project=kira-dashboard
THEN: JSON z tablicą stories z tabeli `bridge_stories`, sortowaną po `epic_id, id`

### AC-2: GET /api/stories obsługuje filtrowanie
GIVEN: request z query params
WHEN: GET /api/stories?project=kira-dashboard&epic=EPIC-7&status=DONE
THEN: zwraca tylko stories z EPIC-7 o statusie DONE

### AC-3: GET /api/stories/[id] zwraca szczegóły story
GIVEN: zalogowany użytkownik
WHEN: GET /api/stories/STORY-7.1?project=kira-dashboard
THEN: JSON z pełnymi danymi story + lista powiązanych runs z `bridge_runs`

### AC-4: Auth wymagana
GIVEN: request bez JWT
WHEN: GET /api/stories
THEN: 401 Unauthorized

### AC-5: Brak wyników → pusta tablica, nie 404
GIVEN: filtr na nieistniejący epic
WHEN: GET /api/stories?epic=EPIC-999
THEN: `{ data: [], meta: { total: 0 } }` (200 OK)

### AC-6: Response schema kompatybilny z aktualnym frontendem
GIVEN: frontend używa `BridgeStory` type
WHEN: nowy endpoint zwraca dane
THEN: format odpowiedzi identyczny z dotychczasowym `fetchBridge` — zero zmian w hookach

---

## ⚙️ Szczegóły Backend

### GET /api/stories

```typescript
// app/api/stories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'
  const epic    = request.nextUrl.searchParams.get('epic')
  const status  = request.nextUrl.searchParams.get('status')
  const limit   = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '500'), 1000)

  const supabase = await createClient()
  let query = supabase
    .from('bridge_stories')
    .select('*', { count: 'exact' })
    .eq('project_id', project)
    .order('epic_id')
    .order('id')
    .limit(limit)

  if (epic)   query = query.eq('epic_id', epic)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Mapuj do formatu kompatybilnego z frontend
  const stories = (data ?? []).map(row => ({
    id:                row.id,
    epic_id:           row.epic_id,
    title:             row.title,
    status:            row.status,
    difficulty:        row.difficulty,
    recommended_model: row.recommended_model,
    assigned_model:    row.assigned_model,
    domain:            row.domain,
    priority:          row.priority,
    estimated_effort:  row.estimated_effort,
    depends_on:        row.depends_on ?? [],
    blocks:            row.blocks ?? [],
  }))

  return NextResponse.json({
    data: stories,
    meta: { total: count ?? stories.length },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
```

### GET /api/stories/[id]

```typescript
// app/api/stories/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const { id } = await params
  const project = request.nextUrl.searchParams.get('project') ?? 'kira-dashboard'

  const supabase = await createClient()

  // Story
  const { data: story, error } = await supabase
    .from('bridge_stories')
    .select('*')
    .eq('id', id)
    .eq('project_id', project)
    .single()

  if (error || !story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 })
  }

  // Runs for this story
  const { data: runs } = await supabase
    .from('bridge_runs')
    .select('*')
    .eq('story_id', id)
    .order('started_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    ...story,
    runs: runs ?? [],
    depends_on: story.depends_on ?? [],
    blocks: story.blocks ?? [],
  })
}
```

### Migracja hooków frontendowych

Zaktualizuj `fetchBridge` calls w hookach:
- **Przed:** `fetchBridge('/api/status/stories')` → proxy do Bridge HTTP
- **Po:** `fetch('/api/stories?project=kira-dashboard')` → Supabase

Jeśli hooki już używają `/api/stories` (np. EPIC-2 routes) — podmień implementację route'a. Sprawdź:
```bash
grep -r "fetchBridge.*stories" /Users/mariuszkrawczyk/codermariusz/kira-dashboard/lib/
grep -r "fetchBridge.*stories" /Users/mariuszkrawczyk/codermariusz/kira-dashboard/hooks/
```

---

## ⚠️ Edge Cases

### EC-1: Frontend oczekuje pól których nie ma w Supabase
Scenariusz: `fetchBridge` zwracał `latest_run`, `assigned_to` — pola nie w `bridge_stories`
Oczekiwane zachowanie: mapuj z `bridge_runs` (ostatni run) lub zwróć null z komentarzem TODO

### EC-2: Supabase timeout (wolne query)
Scenariusz: 500+ stories z JOINem na runs
Oczekiwane zachowanie: stories list BEZ runs (osobny fetch na detail). Indeksy z STORY-12.1 pomagają.

### EC-3: Stary endpoint `/api/bridge/[...path]` nadal istnieje
Scenariusz: frontend używa dwóch ścieżek — stara i nowa
Oczekiwane zachowanie: zachowaj stary endpoint (backwards compat) ale hooki przerzuć na nowy

### EC-4: `depends_on` jest `null` zamiast `[]` w Supabase
Scenariusz: Supabase zwraca `null` dla puste TEXT[]
Oczekiwane zachowanie: `story.depends_on ?? []` w mapowaniu

---

## 🚫 Out of Scope tej Story
- Write operations (advance, start) — STORY-12.9
- Realtime subscriptions (STORY-12.13)
- Usunięcie starych Bridge proxy endpoints (EPIC-13)

---

## ✔️ Definition of Done
- [ ] GET /api/stories zwraca stories z Supabase
- [ ] GET /api/stories/[id] zwraca story + runs z Supabase
- [ ] Filtrowanie po epic, status działa
- [ ] Auth wymagana (401 bez JWT)
- [ ] Response kompatybilny z frontend typami
- [ ] Frontend hooki zaktualizowane (lub kompatybilne)
- [ ] Pipeline page ładuje dane z Supabase (widoczne na Vercelu)
- [ ] Kod przechodzi linter bez błędów
- [ ] Story review przez PO
