---
story_id: STORY-2.6
title: "Mariusz widzi pełną stronę Story Detail /story/[id] z metadata, runami i akcjami"
epic: EPIC-2
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: none — patrz sekcja Design Reference poniżej
api_reference: GET /api/stories/[id]
priority: must
estimated_effort: 10h
depends_on: STORY-2.4, STORY-2.5
blocks: none
tags: [story-detail, page, breadcrumb, skeleton, dod, runs-timeline, lessons, admin-actions]
---

## 🎯 User Story

**Jako** Mariusz (Admin) korzystający z dashboardu Kira
**Chcę** kliknąć na story w widoku Pipeline i zobaczyć pełną stronę `/story/[id]` z wszystkimi detalami: metadata, Definition of Done, historią runów, wyekstrahowanymi lekcjami oraz przyciskami akcji
**Żeby** mieć pełny obraz stanu story i móc zarządzać jej lifecycle (start/advance/retry) bezpośrednio z dashboardu bez przełączania do terminala

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Projekt: `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/`
Route: `/story/[id]` — dynamiczna strona Next.js App Router
Framework: Next.js 15+ App Router, TypeScript strict, Tailwind CSS

Nowe pliki do stworzenia:
- `src/app/story/[id]/page.tsx` — główny plik strony (Server lub Client Component)
- `src/app/story/[id]/loading.tsx` — skeleton loading (Next.js convention)
- `src/app/story/[id]/not-found.tsx` — strona 404 gdy story nie istnieje
- `src/hooks/useStory.ts` — SWR hook do pobierania danych jednej story
- `src/components/story/StoryDetailHero.tsx` — hero section z ID, tytułem, statusem
- `src/components/story/StoryMetadataGrid.tsx` — siatka metadanych
- `src/components/story/StoryDodList.tsx` — Definition of Done lista checkboxów
- `src/components/story/StoryRunsTimeline.tsx` — chronologiczna lista runów
- `src/components/story/StoryLessons.tsx` — karty z lekcjami
- `src/components/story/StoryActionButtons.tsx` — przyciski akcji (ADMIN only)
- `src/components/story/StorySkeleton.tsx` — loading skeleton

### Powiązane pliki
- `src/hooks/useStoryActions.ts` — z STORY-2.4, zawiera `startStory(id)` i `advanceStory(id, status)`
- `src/lib/toast.ts` — z STORY-2.5, `toastError()`, `toastInfo()`
- `src/lib/api.ts` — `apiFetch` dla `GET /api/stories/[id]`
- Backend endpoint: `GET /api/stories/[id]` — zwraca pełny obiekt Story (z EPIC-14 lub STORY-2.2)
- `src/app/page.tsx` lub `src/app/(dashboard)/pipeline/page.tsx` — Pipeline view z którego linkujemy do `/story/[id]`

### Struktura danych Story (kontrakt API `GET /api/stories/[id]`)

```typescript
// src/types/story.types.ts — dodaj lub zaktualizuj istniejące typy

export type StoryStatus =
  | 'READY'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'REFACTOR'
  | 'DONE'
  | 'FAILED'
  | 'BLOCKED'

export type StoryPriority = 'must' | 'should' | 'could'

export interface StoryRun {
  id: string             // UUID
  step: string           // np. "IMPLEMENT", "REVIEW", "REFACTOR"
  model: string          // np. "sonnet-4.6", "kimi-k2.5"
  status: 'success' | 'failure' | 'in_progress'
  duration: number       // czas w sekundach
  startedAt: string      // ISO 8601
  branch?: string        // np. "feature/STORY-1.3"
  notes?: string         // opcjonalne notatki z runu
}

export interface StoryLesson {
  id: string             // UUID
  extractedAt: string    // ISO 8601
  extractedBy: string    // model który wyekstrahował, np. "sonnet-4.6"
  text: string           // treść lekcji po angielsku
  tags: string[]         // np. ["pattern", "anti-pattern", "performance"]
}

export interface Story {
  id: string             // np. "STORY-1.3"
  title: string          // pełny tytuł story
  status: StoryStatus
  epic: string           // np. "EPIC-1"
  epicTitle: string      // np. "Dashboard Foundation"
  domain: string         // np. "wiring", "frontend", "backend"
  priority: StoryPriority
  estimatedEffort: number  // w godzinach, np. 8
  assignedModel: string  // np. "sonnet-4.6"
  createdAt: string      // ISO 8601
  updatedAt: string      // ISO 8601
  dod: string[]          // lista stringów Definition of Done, np. ["TypeScript kompiluje", "Testy przechodzą"]
  runs: StoryRun[]       // posortowane rosnąco po startedAt (najstarszy pierwszy)
  lessons: StoryLesson[] // posortowane malejąco po extractedAt (najnowszy pierwszy)
}
```

### Stan systemu przed tą story
1. Next.js projekt istnieje z App Router
2. `src/lib/api.ts` zawiera `apiFetch` z EPIC-14
3. `src/hooks/useStoryActions.ts` istnieje z STORY-2.4
4. `src/lib/toast.ts` istnieje z STORY-2.5
5. SWR 2.x jest zainstalowany
6. Tailwind CSS z dark theme jest skonfigurowany
7. Pipeline view (Overview tab) linkuje do story — `href="/story/STORY-1.3"` (do dodania jako część tej story lub STORY-2.7)

---

## ✅ Acceptance Criteria

### AC-1: Strona /story/[id] renderuje breadcrumb nawigację
GIVEN: Użytkownik przechodzi do `/story/STORY-1.3`
WHEN: Strona jest załadowana (dane dostępne)
THEN: Breadcrumb wyświetla: `Home > Pipeline > STORY-1.3`
AND: "Home" jest linkiem `<Link href="/">` 
AND: "Pipeline" jest linkiem `<Link href="/">`  (zakładka Pipeline w Overview)
AND: "STORY-1.3" jest zwykłym tekstem (aktualna strona, nie link)
AND: Separator między elementami to `>` lub `/` z kolorem `#4b4569`

### AC-2: Hero section wyświetla poprawne dane story
GIVEN: API `GET /api/stories/STORY-1.3` zwraca `{id:"STORY-1.3", title:"SSE client hook", status:"IN_PROGRESS", assignedModel:"sonnet-4.6"}`
WHEN: Strona renderuje Hero section
THEN: Widoczny badge z ID `STORY-1.3` (tło `#2d1b4a`, kolor `#a78bfa`, font-weight: 700)
AND: Tytuł `SSE client hook` wyświetlony jako `<h1>` font-size: 24px, kolor `#e6edf3`
AND: Status badge `IN_PROGRESS` z kolorem `#60a5fa`, tło `#1a3a5c` (zgodnie z `.ps-ip` z mockupu)
AND: Model badge `sonnet-4.6` z kolorem `#a78bfa`, tło `#2d1b4a`

### AC-3: Status badge używa poprawnych kolorów per status
GIVEN: Story ma status X
WHEN: Hero section renderuje status badge
THEN: Kolory odpowiadają stylom z mockupu `kira-dashboard-mockup-v3.html`:
  - `READY`       → tło `#1a2a3a`, kolor `#93c5fd`
  - `IN_PROGRESS` → tło `#1a3a5c`, kolor `#60a5fa`  (`.ps-ip`)
  - `REVIEW`      → tło `#2d1b4a`, kolor `#a78bfa`  (`.ps-rv`)
  - `DONE`        → tło `#1a3a1a`, kolor `#4ade80`  (`.ps-done`)
  - `REFACTOR`    → tło `#3a2a00`, kolor `#fbbf24`  (`.ps-rf`)
  - `FAILED`      → tło `#3a1a1a`, kolor `#f87171`
  - `BLOCKED`     → tło `#2a2540`, kolor `#9ca3af`

### AC-4: Sekcja Metadata wyświetla wszystkie pola
GIVEN: Story ma pola: epic, epicTitle, domain, priority, estimatedEffort, assignedModel, createdAt
WHEN: Sekcja Metadata jest renderowana
THEN: Siatka 2-kolumnowa (grid-template-columns: 1fr 1fr) wyświetla:
  - Komórka 1: `Epic` → `EPIC-1 — Dashboard Foundation`
  - Komórka 2: `Domena` → `wiring`
  - Komórka 3: `Priorytet` → `must`
  - Komórka 4: `Szacunek` → `8h`
  - Komórka 5: `Model` → `sonnet-4.6`
  - Komórka 6: `Utworzono` → sformatowana data np. `19 lut 2026, 11:05`
AND: Każda komórka ma label (font-size: 10px, kolor `#4b4569`, uppercase) i wartość (font-size: 13px, kolor `#e6edf3`, font-weight: 600)
AND: Tło każdej komórki: `#13111c`, border-radius: 7px, padding: 8px 11px

### AC-5: Definition of Done wyświetla listę checkboxów (read-only)
GIVEN: Story ma `dod: ["TypeScript kompiluje bez błędów", "Testy przechodzą", "Story review przez PO"]`
WHEN: Sekcja Definition of Done jest renderowana
THEN: Każdy element `dod` jest wyświetlony jako wiersz z checkboxem `<input type="checkbox" disabled>`
AND: Checkboxy są `disabled` — użytkownik nie może ich zmieniać
AND: Jeśli `story.status === 'DONE'`, wszystkie checkboxy są `checked`
AND: Jeśli status jest inny niż DONE, checkboxy są `unchecked`
AND: Tekst każdego elementu dod jest wyświetlony obok checkboxa, kolor `#6b7280`, font-size: 12px
AND: Sekcja ma nagłówek `DEFINITION OF DONE` (uppercase, font-size: 11px, kolor `#4b4569`)

### AC-6: Timeline runów wyświetla chronologiczną listę
GIVEN: Story ma `runs: [{step:"IMPLEMENT", model:"sonnet-4.6", status:"success", duration:204, startedAt:"2026-02-19T11:03:00Z"}, {step:"REVIEW", model:"kimi-k2.5", status:"success", duration:42, startedAt:"2026-02-19T11:15:00Z"}]`
WHEN: Sekcja Runs Timeline jest renderowana
THEN: Każdy run wyświetlony w osobnym wierszu (`.run-row` z mockupu) z:
  - Step name (`IMPLEMENT`, `REVIEW`) — font-size: 11px, kolor `#818cf8`, width: 70px
  - Model name (`sonnet-4.6`) — font-size: 11px, kolor `#6b7280`
  - Duration — sformatowane jako `3.4m` (jeśli `duration >= 60` → `Math.round(duration/60 * 10) / 10 + 'm'`, jeśli `< 60` → `duration + 's'`)
  - Status badge — `success` → tło `#1a3a1a`, kolor `#4ade80`, text "DONE"; `failure` → tło `#3a1a1a`, kolor `#f87171`, text "FAILED"; `in_progress` → tło `#1a3a5c`, kolor `#60a5fa`, text "RUNNING"
AND: Runy są w kolejności rosnącej po `startedAt` (najstarszy na górze, najnowszy na dole)
AND: Jeśli `runs.length === 0`, wyświetl "Brak runów" (kolor `#3d3757`, font-size: 12px)

### AC-7: Extracted Lessons wyświetla karty lekcji
GIVEN: Story ma `lessons: [{id:"uuid1", extractedAt:"2026-02-19T11:20:00Z", extractedBy:"sonnet-4.6", text:"Non-blocking hooks in state machine transitions", tags:["pattern"]}]`
WHEN: Sekcja Extracted Lessons jest renderowana
THEN: Każda lekcja wyświetlona jako karta (`.les-row` z mockupu):
  - Border-left: `2px solid #7c3aed`
  - Tło: `#13111c`, border-radius: 7px, padding: 8px 10px
  - Meta line: `Auto-extracted · sonnet-4.6 · 19 lut 2026` (font-size: 10px, kolor `#818cf8`, font-weight: 600)
  - Tekst lekcji (font-size: 11px, kolor `#6b7280`, line-height: 1.4)
AND: Jeśli `lessons.length === 0`, wyświetl "Brak wyekstrahowanych lekcji" (kolor `#3d3757`)

### AC-8: Action buttons wyświetlają się tylko dla ADMIN z poprawną logiką warunkową
GIVEN: `useSession()` lub inny mechanizm auth zwraca `{role: "ADMIN"}` (lub brak auth w MVP — zakładamy że każdy user to ADMIN)
WHEN: Hero section lub dolna sekcja strony jest renderowana
THEN: Przyciski pokazują się WYŁĄCZNIE gdy status story pasuje:
  - Przycisk "▶ Start Story" — TYLKO gdy `status === 'READY'`
    - Kolor: gradient `linear-gradient(135deg,#7c3aed,#3b82f6)`, kolor tekstu `#fff`
    - onClick: wywołuje `startStory(story.id)` z `useStoryActions()`
  - Przycisk "→ Advance to Review" — TYLKO gdy `status === 'IN_PROGRESS'`
    - Kolor: gradient `linear-gradient(135deg,#7c3aed,#3b82f6)`, kolor tekstu `#fff`
    - onClick: wywołuje `advanceStory(story.id, 'REVIEW')` z `useStoryActions()`
  - Przycisk "↩ Retry" — TYLKO gdy `status === 'FAILED'`
    - Kolor: tło `#2a2540`, kolor tekstu `#6b7280`
    - onClick: wywołuje `startStory(story.id)` z `useStoryActions()`
AND: Gdy `loading === true` w `useStoryActions`, WSZYSTKIE przyciski mają `disabled={true}` i `opacity: 0.5`
AND: Gdy `error !== null` w `useStoryActions`, `toastError(error)` jest wywołane automatycznie

### AC-9: Loading skeleton jest wyświetlany podczas ładowania danych
GIVEN: Użytkownik otwiera `/story/STORY-1.3` i API nie odpowiedziało jeszcze
WHEN: `useStory(id)` ma `isLoading === true`
THEN: Wyświetlana jest strona `loading.tsx` lub `<StorySkeleton />` w miejscu contentu
AND: Skeleton zawiera animated pulse bloki (Tailwind `animate-pulse`) dla:
  - Hero section: 3 bloki (ID badge, tytuł, status badge) — tło `#2a2540`
  - Metadata grid: 6 komórek — tło `#2a2540`
  - Runs: 3 wiersze placeholder — tło `#2a2540`
AND: Breadcrumb jest widoczny podczas loading (tekst breadcrumb może być statyczny np. "Home > Pipeline > Loading...")

### AC-10: Error state 404 gdy story nie istnieje
GIVEN: API `GET /api/stories/STORY-99.99` zwraca HTTP 404
WHEN: Strona `/story/STORY-99.99` jest renderowana
THEN: Next.js `not-found.tsx` jest wyświetlany (przez wywołanie `notFound()` w `page.tsx`)
AND: Strona 404 zawiera:
  - Nagłówek: "Story nie została znaleziona" (font-size: 24px, kolor `#e6edf3`)
  - Opis: "Story STORY-99.99 nie istnieje lub została usunięta." (kolor `#6b7280`)
  - Przycisk "← Wróć do Pipeline" jako `<Link href="/">` z tłem `#2a2540` i kolorem `#6b7280`
AND: Breadcrumb wyświetla "Home > Pipeline > Not Found"

### AC-11: Offline state gdy sieć jest niedostępna
GIVEN: `useStory(id)` zwraca `error` (network error, nie HTTP error)
WHEN: Komponent renderuje error state
THEN: Widoczny banner z treścią: "⚠️ Brak połączenia — dane mogą być nieaktualne" (tło `#3a2a00`, kolor `#fbbf24`, border `#5a4a00`)
AND: Jeśli dane były wcześniej w SWR cache (`data !== undefined`), stare dane są wyświetlane pod banerem
AND: Jeśli cache jest pusty, wyświetlony jest komunikat: "Nie można załadować danych story. Sprawdź połączenie i spróbuj ponownie." z przyciskiem "Spróbuj ponownie" (onClick: `mutate(swrKey)`)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: `/story/[id]`
Komponent główny: `StoryDetailPage` (default export)
Plik: `src/app/story/[id]/page.tsx`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `StoryDetailPage` | Client Component (`'use client'`) | `params: {id: string}` | loading, error, filled |
| `StoryDetailBreadcrumb` | Client Component | `storyId: string` | statyczny |
| `StoryDetailHero` | Client Component | `story: Story` | filled |
| `StoryMetadataGrid` | Client Component | `story: Story` | filled |
| `StoryDodList` | Client Component | `dod: string[]`, `isDone: boolean` | empty, filled |
| `StoryRunsTimeline` | Client Component | `runs: StoryRun[]` | empty, filled |
| `StoryLessons` | Client Component | `lessons: StoryLesson[]` | empty, filled |
| `StoryActionButtons` | Client Component | `story: Story`, `startStory`, `advanceStory`, `loading`, `error` | hidden/visible per status |
| `StorySkeleton` | Server/Client Component | brak props | animated pulse |

### Pełna implementacja src/hooks/useStory.ts

```typescript
'use client'

import useSWR, { mutate } from 'swr'
import { apiFetch } from '@/lib/api'
import type { Story } from '@/types/story.types'

// Fetcher dla SWR
const storyFetcher = (url: string) =>
  apiFetch(url).then(res => {
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`)
      // @ts-expect-error — dodajemy status do Error
      err.status = res.status
      throw err
    }
    return res.json() as Promise<Story>
  })

export function useStory(id: string) {
  const key = `/api/stories/${id}`
  const { data, error, isLoading } = useSWR<Story>(key, storyFetcher, {
    revalidateOnFocus: false,    // nie odświeżaj przy focus zakładki
    revalidateOnReconnect: true, // odświeżaj po przywróceniu połączenia
    dedupingInterval: 10_000,    // deduplikuj requesty co 10s
  })

  const isNotFound = (error as {status?: number})?.status === 404
  const isOffline = error && !isNotFound  // błąd sieciowy (nie 404)

  return {
    story: data,
    isLoading,
    error,
    isNotFound,
    isOffline,
    refresh: () => mutate(key),
  }
}
```

### Pełna implementacja src/app/story/[id]/page.tsx

```typescript
'use client'

import { useParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import { useStory } from '@/hooks/useStory'
import { useStoryActions } from '@/hooks/useStoryActions'
import { toastError } from '@/lib/toast'
import { StorySkeleton } from '@/components/story/StorySkeleton'
import { StoryDetailHero } from '@/components/story/StoryDetailHero'
import { StoryMetadataGrid } from '@/components/story/StoryMetadataGrid'
import { StoryDodList } from '@/components/story/StoryDodList'
import { StoryRunsTimeline } from '@/components/story/StoryRunsTimeline'
import { StoryLessons } from '@/components/story/StoryLessons'
import { StoryActionButtons } from '@/components/story/StoryActionButtons'

export default function StoryDetailPage() {
  const params = useParams<{ id: string }>()
  const storyId = params.id  // np. "STORY-1.3"

  const { story, isLoading, isNotFound, isOffline, refresh } = useStory(storyId)
  const { startStory, advanceStory, loading: actionLoading, error: actionError } = useStoryActions()

  // Redirect do not-found jeśli API zwróciło 404
  if (isNotFound) {
    notFound()
  }

  // Wyświetl toast błędu akcji
  useEffect(() => {
    if (actionError) {
      toastError(actionError)
    }
  }, [actionError])

  return (
    <div style={{ padding: '18px 20px', maxWidth: '900px', margin: '0 auto' }}>

      {/* BREADCRUMB */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
        <Link href="/" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
          Home
        </Link>
        <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
        <Link href="/" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none' }}>
          Pipeline
        </Link>
        <span style={{ fontSize: '12px', color: '#4b4569' }}>›</span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          {isLoading ? 'Loading...' : storyId}
        </span>
      </nav>

      {/* OFFLINE BANNER */}
      {isOffline && (
        <div style={{
          background: '#3a2a00',
          border: '1px solid #5a4a00',
          borderRadius: '8px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#fbbf24' }}>
            ⚠️ Brak połączenia — dane mogą być nieaktualne
          </span>
          <button
            onClick={refresh}
            style={{
              fontSize: '11px',
              color: '#fbbf24',
              background: 'transparent',
              border: '1px solid #5a4a00',
              borderRadius: '6px',
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && <StorySkeleton />}

      {/* FILLED STATE — dane załadowane */}
      {!isLoading && story && (
        <>
          <StoryDetailHero story={story} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div>
              <StoryMetadataGrid story={story} />
              <div style={{ marginTop: '16px' }}>
                <StoryDodList dod={story.dod} isDone={story.status === 'DONE'} />
              </div>
            </div>
            <div>
              <StoryRunsTimeline runs={story.runs} />
              <div style={{ marginTop: '16px' }}>
                <StoryLessons lessons={story.lessons} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px', borderTop: '1px solid #2a2540', paddingTop: '16px' }}>
            <StoryActionButtons
              story={story}
              startStory={startStory}
              advanceStory={advanceStory}
              loading={actionLoading}
              error={actionError}
            />
          </div>
        </>
      )}

      {/* OFFLINE BEZ CACHE */}
      {isOffline && !story && !isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px', color: '#e6edf3' }}>
            Nie można załadować danych story
          </p>
          <p style={{ fontSize: '13px', marginBottom: '16px' }}>
            Sprawdź połączenie i spróbuj ponownie.
          </p>
          <button
            onClick={refresh}
            style={{
              padding: '8px 18px',
              background: '#2a2540',
              color: '#6b7280',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
    </div>
  )
}
```

### Implementacja StoryActionButtons

```typescript
// src/components/story/StoryActionButtons.tsx
'use client'

import type { Story } from '@/types/story.types'

interface Props {
  story: Story
  startStory: (id: string) => Promise<void>
  advanceStory: (id: string, status: string) => Promise<void>
  loading: boolean
  error: string | null
}

// Mapowanie statusu story na dostępne przyciski akcji
// Tylko jeden przycisk akcji jest pokazywany na raz
export function StoryActionButtons({ story, startStory, advanceStory, loading }: Props) {
  const { id, status } = story

  // Wspólne style przycisków
  const primaryStyle = {
    padding: '8px 20px',
    background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600' as const,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
    boxShadow: '0 2px 10px rgba(124,58,237,.35)',
  }

  const secondaryStyle = {
    padding: '8px 20px',
    background: '#2a2540',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.5 : 1,
  }

  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
      {status === 'READY' && (
        <button
          style={primaryStyle}
          disabled={loading}
          onClick={() => startStory(id)}
        >
          {loading ? '...' : '▶ Start Story'}
        </button>
      )}

      {status === 'IN_PROGRESS' && (
        <button
          style={primaryStyle}
          disabled={loading}
          onClick={() => advanceStory(id, 'REVIEW')}
        >
          {loading ? '...' : '→ Advance to Review'}
        </button>
      )}

      {status === 'FAILED' && (
        <button
          style={secondaryStyle}
          disabled={loading}
          onClick={() => startStory(id)}
        >
          {loading ? '...' : '↩ Retry'}
        </button>
      )}

      {/* Dla REVIEW, DONE, REFACTOR, BLOCKED — brak przycisków akcji */}
    </div>
  )
}
```

### Implementacja StorySkeleton

```typescript
// src/components/story/StorySkeleton.tsx
// Animated pulse skeleton dla loading state

const pulse = { background: '#2a2540', borderRadius: '6px', animation: 'pulse 2s infinite' }

export function StorySkeleton() {
  return (
    <div>
      {/* Hero skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ ...pulse, width: '80px', height: '24px' }} />
        <div style={{ ...pulse, width: '300px', height: '32px' }} />
        <div style={{ ...pulse, width: '90px', height: '24px' }} />
        <div style={{ ...pulse, width: '90px', height: '24px' }} />
      </div>
      {/* Metadata skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ ...pulse, height: '52px' }} />
        ))}
      </div>
      {/* Runs skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ ...pulse, height: '38px', marginBottom: '5px' }} />
      ))}
    </div>
  )
}
```

### Design Reference — mockup kira-dashboard-mockup-v3.html

Strona Story Detail jest rozwinięciem modalu `.modal` z mockupu do pełnej strony:

**Kolory z mockupu (CSS zmienne):**
- Główne tło strony: `#13111c` (body background)
- Tło kart/sekcji: `#1a1730` (`.card`)
- Tło komórek metadata: `#13111c` (`.meta-item`)
- Tło wierszy runów: `#13111c` (`.run-row`)
- Tło lekcji: `#13111c` z border-left `#7c3aed` (`.les-row`)
- Border globalny: `#2a2540`
- Text primary: `#e6edf3`
- Text secondary: `#6b7280`
- Text dim: `#4b4569`
- Text purple accent: `#818cf8`

**Hero section (rozwinięcie `.modal-header`):**
- Story ID badge: tło `#2d1b4a`, kolor `#818cf8` — wzorowane na `.modal-id`
- Ikona story: tło `#2d1b4a` — wzorowane na `.modal-icon` (40×40px, border-radius: 10px)
- Tytuł: font-size: 20px, kolor `#e6edf3`, font-weight: 700 — wzorowane na `.modal-title`

**Metadata Grid (rozwinięcie `.modal-meta-grid`):**
- 2 kolumny — identyczne z `.modal-meta-grid` z mockupu
- Każda komórka: `.meta-item` → tło `#13111c`, padding: 8px 11px, border-radius: 7px
- Label: `.ml` → font-size: 10px, kolor `#4b4569`
- Wartość: `.mv` → font-size: 13px, kolor `#e6edf3`, font-weight: 600

**Runs Timeline (rozwinięcie `.modal-runs`):**
- Każdy wiersz: `.run-row` → `background: #13111c`, border-radius: 7px, padding: 8px 11px
- Step: `.rr-step` → font-size: 11px, font-weight: 700, kolor `#818cf8`, width: 70px
- Model: `.rr-model` → font-size: 11px, kolor `#6b7280`, flex: 1
- Duration: `.rr-dur` → font-size: 11px, kolor `#6b7280`, width: 44px
- Status: `.rr-st` → font-size: 10px, padding: 2px 7px, border-radius: 7px

**Lessons (rozwinięcie `.les-row`):**
- Border-left: `2px solid #7c3aed`
- Tło: `#13111c`, border-radius: 7px, padding: 8px 10px, margin-bottom: 5px
- Meta: `.les-meta` → font-size: 10px, kolor `#818cf8`, font-weight: 600
- Tekst: `.les-text` → font-size: 11px, kolor `#6b7280`, line-height: 1.4

**Action buttons (rozwinięcie `.modal-footer`):**
- Primary: `.mf-btn-p` → `background: linear-gradient(135deg,#7c3aed,#3b82f6)`, kolor `#fff`, border-radius: 8px, padding: 7px 18px
- Secondary: `.mf-btn-s` → `background: #2a2540`, kolor `#6b7280`, border-radius: 8px

### Stany widoku

**Loading:**
`<StorySkeleton />` — animated pulse bloki dla hero (3 bloki), metadata (6 komórek), runs (3 wiersze). Tło pulsujące `#2a2540`. Breadcrumb widoczny ze statycznym tekstem "Loading..."

**Empty (brak runów / lekcji):**
- Runs: "Brak runów" (kolor `#3d3757`, font-size: 12px, tekst-align: center, padding: 16px)
- Lessons: "Brak wyekstrahowanych lekcji" (kolor `#3d3757`, font-size: 12px)
- DoD: "Brak Definition of Done" jeśli `dod.length === 0`

**Error (błąd serwera/sieci):**
- 404: Next.js `not-found.tsx` — pełna strona z komunikatem i przyciskiem powrotu
- Offline: Żółty banner + stare dane z cache LUB komunikat "Nie można załadować" + przycisk retry

**Filled (normalny stan):**
Pełna strona z wszystkimi sekcjami: Hero, Metadata Grid, DoD, Runs Timeline, Lessons, Action Buttons (warunkowe)

### Flow interakcji (krok po kroku)

```
1. Użytkownik klika story w Pipeline view → Next.js router nawiguje do /story/STORY-1.3
2. page.tsx się montuje → useStory('STORY-1.3') wywołuje SWR fetch GET /api/stories/STORY-1.3
3. isLoading === true → <StorySkeleton /> renderowany, breadcrumb z "Loading..."
4. API odpowiada {story data} → isLoading === false, story !== undefined
5. Strona renderuje pełny widok: Hero, Metadata, DoD, Runs, Lessons
6. Jeśli status === READY → widoczny przycisk "▶ Start Story"
7. Użytkownik klika "▶ Start Story" → startStory('STORY-1.3') wywołane
8. useStoryActions: optimistic update w SWR → status → IN_PROGRESS w UI
9. useStoryActions: loading === true → wszystkie przyciski disabled
10. Po sukcesie: loading === false, SWR revalidate, przycisk zmienia się na "→ Advance to Review"
11. Po błędzie: rollback (status wraca do READY), toastError() wywołane
12. Jeśli API zwróciło 404 (krok 4) → notFound() → wyświetlana not-found.tsx
13. Jeśli błąd sieciowy (krok 4) → isOffline === true → offline banner + stare dane lub komunikat retry
```

### Responsive / Dostępność
- Mobile (375px+): Układ zmienia się na 1 kolumnę (metadata grid i runs/lessons są pod sobą). Przyciski zajmują pełną szerokość.
- Desktop (1280px+): Layout 2-kolumnowy (metadata+DoD po lewej, runs+lessons po prawej). Przyciski w prawym dolnym rogu.
- Keyboard navigation: Tab przechodzi przez linki breadcrumb → przyciski akcji. Enter aktywuje przycisk. Disabled przyciski nie są w tab order.
- ARIA: `aria-label="Breadcrumb navigation"` na `<nav>`. Checkboxy DoD mają `aria-label="{tekst checka}"`. Przyciski akcji mają descriptive text.

---

## ⚠️ Edge Cases

### EC-1: Story ID w URL zawiera znaki specjalne lub wielkie litery
Scenariusz: URL to `/story/story-1.3` (małe litery zamiast STORY-1.3)
Oczekiwane zachowanie: `params.id` z Next.js to `"story-1.3"` — backend `/api/stories/story-1.3` może zwrócić 404 lub powinien być case-insensitive. Frontend wyświetla 404 jeśli API zwróci 404. Frontend nie normalizuje ID — odpowiedzialność po stronie backendu.
Komunikat dla użytkownika: Strona 404 z "Story story-1.3 nie istnieje lub została usunięta."

### EC-2: Story ma bardzo długi tytuł (>100 znaków)
Scenariusz: `story.title` to 150-znakowy string
Oczekiwane zachowanie: Tytuł w `<h1>` ma `word-break: break-word` lub `overflow-wrap: break-word` — nie wychodzi poza layout. Nie używa `text-overflow: ellipsis` w `<h1>` — pełny tytuł jest widoczny.
Komunikat dla użytkownika: Brak — tytuł po prostu się łamie na kolejne linie

### EC-3: Story ma 0 elementów w dod
Scenariusz: API zwraca `{...story, dod: []}`
Oczekiwane zachowanie: `<StoryDodList>` wyświetla "Brak Definition of Done" zamiast pustej listy
Komunikat dla użytkownika: "Brak Definition of Done" (kolor `#3d3757`, font-size: 12px)

### EC-4: `startStory` lub `advanceStory` wywołane gdy już `loading === true` (double click)
Scenariusz: Użytkownik klika "Start Story" dwukrotnie szybko
Oczekiwane zachowanie: Przycisk ma `disabled={loading}` — gdy `loading === true` po pierwszym kliknięciu, przycisk jest `disabled` i nie można go kliknąć ponownie. Event handler nie jest wywoływany dla disabled buttona.
Komunikat dla użytkownika: Brak — przycisk jest wizualnie wyszarzony (opacity 0.5)

### EC-5: Runs mają status `in_progress` (run aktualnie trwa)
Scenariusz: Story jest `IN_PROGRESS`, ostatni run ma `status: "in_progress"` bez `duration`
Oczekiwane zachowanie: Duration wyświetlane jako "—" lub "trwa..." (brak wartości liczbowej). Status badge pokazuje "RUNNING" z kolorem niebieskim `#60a5fa`.
Komunikat dla użytkownika: Badge "RUNNING" w wierszy runu

### EC-6: API zwraca story ale bez pola `lessons` (stara wersja API)
Scenariusz: Backend nie zwraca `lessons` w odpowiedzi (backwards compatibility)
Oczekiwane zachowanie: TypeScript `story.lessons ?? []` — domyślnie pusta tablica. `<StoryLessons lessons={story.lessons ?? []} />` nie crasha. Wyświetla "Brak wyekstrahowanych lekcji".
Komunikat dla użytkownika: "Brak wyekstrahowanych lekcji"

---

## 🚫 Out of Scope tej Story
- Edycja danych story z UI (tytuł, metadata) — read-only widok
- Tworzenie nowych story z tej strony
- Komentarze / dyskusja do story
- Push notifications o zmianie stanu story podczas gdy strona jest otwarta — STORY-2.5 obsługuje toasty globalnie
- Paginacja dla runs lub lessons (MVP — zakładamy <20 runów i <10 lekcji)
- Eksport story do PDF/Markdown
- "Advance to DONE" z tej strony — tylko REVIEW jest aktualne dla IN_PROGRESS (DONE wymaga review)
- Auth/RBAC — MVP zakłada że każdy user to ADMIN (EPIC-16 doda proper auth)
- Animacje przejść między stanami (loading → filled)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] TypeScript kompiluje bez błędów (`tsc --noEmit`)
- [ ] `npm run build` przechodzi bez błędów
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading skeleton, empty sections, error/404/offline, filled)
- [ ] Breadcrumb wyświetla `Home > Pipeline > {storyId}` z linkami
- [ ] Hero section pokazuje ID badge, tytuł, status badge (prawidłowe kolory per status), model badge
- [ ] Status badge używa dokładnych kolorów z mockupu (7 statusów)
- [ ] Metadata grid wyświetla 6 pól w układzie 2-kolumnowym
- [ ] DoD lista jest read-only, checked gdy `status === DONE`
- [ ] Runs timeline wyświetla step, model, duration (poprawny format min/sek), status badge
- [ ] Lessons wyświetla karty z border-left purple i meta line
- [ ] "Start Story" przycisk widoczny TYLKO gdy `status === READY`
- [ ] "Advance to Review" przycisk widoczny TYLKO gdy `status === IN_PROGRESS`
- [ ] "Retry" przycisk widoczny TYLKO gdy `status === FAILED`
- [ ] Przyciski disabled gdy `loading === true` (opacity 0.5)
- [ ] `toastError` wywołane gdy `actionError !== null`
- [ ] 404 wyświetla `not-found.tsx` z przyciskiem powrotu
- [ ] Offline state wyświetla żółty banner
- [ ] Widok działa na mobile 375px bez horizontal scroll
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Story review przez PO
