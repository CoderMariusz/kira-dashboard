---
story_id: STORY-12.13
title: "Supabase Realtime — live updates stories + runs (zastąpienie SSE)"
epic: EPIC-12
module: supabase-migration
domain: wiring
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: should
estimated_effort: 5h
depends_on: STORY-12.7, STORY-12.8
blocks: STORY-12.15
tags: [realtime, supabase, sse, wiring, live-updates]
---

## 🎯 User Story

**Jako** użytkownik dashboardu
**Chcę** żeby zmiany w stories i runs pojawiały się na żywo bez odświeżania strony
**Żeby** widzieć postęp pipeline w czasie rzeczywistym (np. story przeszła z REVIEW do DONE)

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `hooks/useRealtimePipeline.ts` — nowy hook
- `app/api/events/route.ts` — istniejący SSE endpoint (do usunięcia lub zachowania jako fallback)

### Aktualne zachowanie
- `/api/events` — SSE proxy do Bridge event stream (nie działa na Vercelu)
- `hooks/useSSE.ts` — hook SSE (nie działa na Vercelu)
- Alternatywnie: SWR polling co 30s (wolne, dużo requestów)

### Docelowe zachowanie
Supabase Realtime (WebSocket) — subskrypcja na zmiany w `bridge_stories`, `bridge_runs`.
- INSERT/UPDATE na `bridge_stories` → frontend automatycznie odświeża
- INSERT na `bridge_runs` → Activity Feed update w realtime

---

## ✅ Acceptance Criteria

### AC-1: Stories aktualizują się w realtime
GIVEN: użytkownik na Pipeline page
WHEN: sync script aktualizuje status story z IN_PROGRESS na REVIEW w Supabase
THEN: UI natychmiast (<3s) pokazuje zmianę — karta story zmienia kolor/status

### AC-2: Nowe runs pojawiają się w Activity Feed
GIVEN: użytkownik na Overview page
WHEN: nowy run wstawiony do `bridge_runs`
THEN: nowy wpis pojawia się w Activity Feed bez przeładowania

### AC-3: Fallback na SWR polling gdy Realtime niedostępny
GIVEN: WebSocket blokowany przez proxy/firewall
WHEN: Supabase Realtime nie łączy
THEN: hook automatycznie przełącza na SWR revalidate co 30s

### AC-4: Reconnect po utracie połączenia
GIVEN: użytkownik stracił internet na 30s
WHEN: połączenie wraca
THEN: Supabase Realtime automatycznie reconnectuje, dane aktualne

### AC-5: Subscription cleanup przy unmount
GIVEN: użytkownik przechodzi z Pipeline na Home
WHEN: komponent unmountuje
THEN: subscription Supabase Realtime zamknięty (brak memory leaks)

---

## ⚙️ Szczegóły Wiring

### Hook: useRealtimePipeline

```typescript
// hooks/useRealtimePipeline.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import useSWR from 'swr'

interface UseRealtimePipelineOptions {
  project?: string
  enabled?: boolean
}

export function useRealtimePipeline(opts: UseRealtimePipelineOptions = {}) {
  const project = opts.project ?? 'kira-dashboard'
  const [realtimeConnected, setRealtimeConnected] = useState(false)

  // Base data via SWR (initial load + fallback polling)
  const { data: stories, mutate: mutateStories } = useSWR(
    `/api/stories?project=${project}`,
    fetcher,
    { refreshInterval: realtimeConnected ? 0 : 30_000 } // polling only when RT off
  )

  const { data: runs, mutate: mutateRuns } = useSWR(
    `/api/runs?project=${project}&limit=50`,
    fetcher,
    { refreshInterval: realtimeConnected ? 0 : 30_000 }
  )

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel: RealtimeChannel = supabase
      .channel('pipeline-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bridge_stories',
          filter: `project_id=eq.${project}` },
        () => { void mutateStories() }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bridge_runs' },
        () => { void mutateRuns() }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED')
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [project, mutateStories, mutateRuns])

  return { stories, runs, realtimeConnected }
}
```

### Supabase Realtime wymaga

1. **Publication** — domyślnie `supabase_realtime` publication. Dodaj tabele:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE bridge_stories;
ALTER PUBLICATION supabase_realtime ADD TABLE bridge_runs;
```

2. **RLS** musi pozwalać SELECT — już skonfigurowane w STORY-12.1

### Frontend integration

Zamień istniejące hooki na nowy:
```typescript
// Przed
const { data } = useSSE('/api/events')  // nie działa na Vercelu

// Po
const { stories, runs, realtimeConnected } = useRealtimePipeline()
```

Dodaj indicator "🟢 Live" / "🔴 Polling" w UI (np. w sidebarze).

---

## ⚠️ Edge Cases

### EC-1: Supabase free tier — max 200 concurrent Realtime connections
Scenariusz: rodzina ma 4 urządzenia, nie problem. Ale: tab duplikaty.
Oczekiwane zachowanie: na free tier to nie problem (<10 users). Monitoruj.

### EC-2: Stale closure w useEffect
Scenariusz: `mutateStories` zmienia się → effect re-runs
Oczekiwane zachowanie: `useCallback` na mutate, dependency array prawidłowy

### EC-3: Szybkie kolejne zmiany (5 zmian w 1 sekundzie)
Scenariusz: sync script aktualizuje 5 stories naraz
Oczekiwane zachowanie: Supabase Realtime wysyła 5 eventów → 5x mutate → SWR deduplikuje (1 fetch)

### EC-4: Realtime subscription wymaga authenticated user
Scenariusz: anon user nie ma dostępu do RLS
Oczekiwane zachowanie: `createBrowserClient` używa tokena z cookie — auth automatyczna

---

## 🚫 Out of Scope
- Realtime dla NightClaw i Patterns (nie potrzebne — dane zmieniane 1x/dzień)
- Optimistic updates na advance (zachowaj istniejącą logikę)
- Usunięcie `/api/events` SSE (EPIC-13 cleanup)

---

## ✔️ Definition of Done
- [ ] `useRealtimePipeline` hook istnieje i działa
- [ ] Pipeline page: zmiana statusu story widoczna w <3s
- [ ] Activity Feed: nowe runy pojawiają się live
- [ ] Fallback na polling gdy RT niedostępny
- [ ] Subscription cleanup przy unmount (no leaks)
- [ ] `bridge_stories` i `bridge_runs` w Supabase Realtime publication
- [ ] Indicator "Live" / "Polling" w UI
- [ ] Działa na Vercelu
- [ ] Story review przez PO
