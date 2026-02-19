---
story_id: STORY-1.5
title: "Mariusz widzi Pipeline view i Activity Feed na zakładce Pipeline"
epic: EPIC-1
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 8h
depends_on: [STORY-1.1, STORY-1.2, STORY-1.3]
blocks: [STORY-1.8]
tags: [pipeline, activity-feed, tabs, story-detail-modal, auto-refresh, usePipeline, useRuns]
---

## 🎯 User Story

**Jako** Mariusz (Admin, developer systemu Kira)
**Chcę** widzieć Pipeline view z aktywnym stories i Activity Feed na zakładce Pipeline
**Żeby** śledzić aktualny postęp pipeline'u, widzieć co jest w Merge Queue i co zostało zrobione dziś, bez potrzeby uruchamiania `bridge status` w CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Route: `/` z query param `?tab=pipeline` (np. `http://localhost:3000/?tab=pipeline`)
Pliki: `/components/pipeline/` + modyfikacja `/app/page.tsx`

### Powiązane pliki

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
  — tab "Pipeline" (przełącz na zakładkę "Pipeline" w topbarze), sekcja `<!-- PIPELINE -->` oraz `<!-- ACTIVITY FEED + EVAL -->` (lewa karta "Activity Feed")
- **Hooks:** `usePipeline()` i `useRuns()` z STORY-1.2
- **Typy:** `PipelineStory`, `Run` z `/types/api.ts` (dostarczone przez STORY-1.2)
- **Modal:** `StoryDetailModal` z STORY-1.4 — można reużyć ten komponent

### Stan systemu przed tą story

1. **STORY-1.1 DONE** — projekt Next.js 16 działa na `localhost:3000`
2. **STORY-1.2 DONE** — hooki `usePipeline()` i `useRuns()` istnieją:
   - `usePipeline()` → `{ data: PipelineStory[], isLoading, isOffline, error, refresh }`
   - `useRuns()` → `{ data: Run[], isLoading, isOffline, error, refresh }`
3. **STORY-1.3 DONE** — `/app/page.tsx` renderuje `<OverviewPage />` i ma podstawowy tabs bar
4. Typ `PipelineStory` z `/types/api.ts`:
   ```typescript
   interface PipelineStory {
     story_id: string;          // Np. "STORY-13.8"
     title: string;             // Np. "Auto log-run hook"
     status: 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'REFACTOR' | 'MERGE';
     model: string;             // Np. "sonnet", "kimi"
     epic: string;              // Np. "EPIC-13"
     started_at: string;        // ISO 8601 — kiedy story wystartowała
     completed_at?: string;     // ISO 8601 — kiedy story ukończona (tylko dla DONE)
     dod: string;               // Definition of Done — tekst
     runs: Run[];               // Lista runów tej story
   }
   ```
5. Typ `Run` jak w STORY-1.2/1.3/1.4 (patrz STORY-1.4 dla pełnej definicji)

---

## ✅ Acceptance Criteria

### AC-1: Zakładka Pipeline jest dostępna z tabs bar i przełącza widok

GIVEN: Użytkownik jest na `http://localhost:3000/` (lub `/?tab=overview`)
WHEN: Klika zakładkę "Pipeline" w tabs barze
THEN:
- URL zmienia się na `http://localhost:3000/?tab=pipeline` (bez pełnego page reload — `router.push`)
- Zawartość strony zmienia się z Overview page na Pipeline page (two-panel layout)
- Zakładka "Pipeline" staje się aktywna (styl `.tab.active`):
  - color: `#818cf8`
  - border-bottom: `2px solid #818cf8`
  - font-weight: 600
  - background: `#13111c`
- Zakładka "Overview" traci styl active (powraca do: color #6b7280, border-bottom transparent)
AND:
- Jeśli użytkownik wpisuje bezpośrednio `localhost:3000/?tab=pipeline` w adresbar — strona ładuje się od razu z Pipeline view (działa przy odświeżeniu strony)
- Zakładka "Overview" po kliknięciu wraca do widoku Overview (URL: `/?tab=overview` lub `/`)

### AC-2: Tabs bar renderuje się poprawnie nad zawartością

GIVEN: Strona `/` jest załadowana
WHEN: Widok jest zrenderowany
THEN:
- Tabs bar renderuje się poniżej topbar, nad contentem (border-bottom `1px solid #2a2540`, bg `#1a1730`, padding `10px 20px 0`)
- Widoczne zakładki: "Overview", "Pipeline", "Models", "Epics", "Eval", "Patterns", "NightClaw 🌙"
- Każda zakładka (`.tab`): padding `7px 14px`, font-size 12px, color `#6b7280`, cursor pointer, border-radius `7px 7px 0 0`, border-bottom `2px solid transparent`, margin-bottom `-1px`
- On hover: color `#e6edf3`
- Dla `?tab=pipeline` — aktywna jest zakładka "Pipeline"
- Dla `?tab=overview` lub brak param — aktywna jest "Overview"
- **WAŻNE:** Zakładki "Models", "Epics", "Eval", "Patterns", "NightClaw" są renderowane ale NIE są wdrożone w tej story (kliknięcie może być no-op lub pokazywać "Coming soon"). Nie dodawaj logiki dla tych zakładek.

### AC-3: Pipeline view — lewa/górna sekcja — renderuje aktywne stories

GIVEN: `usePipeline()` zwraca stories z różnymi statusami, np.:
```
[
  { story_id: 'STORY-1.3', title: 'Overview page setup', status: 'IN_PROGRESS', model: 'glm', started_at: '2026-02-19T10:00:00Z', ... },
  { story_id: 'STORY-1.2', title: 'Bridge API hooks', status: 'REVIEW', model: 'sonnet', started_at: '2026-02-19T09:30:00Z', ... },
  { story_id: 'STORY-13.8', title: 'Auto log-run hook', status: 'MERGE', model: 'sonnet', ... },
  { story_id: 'STORY-13.9', title: 'LessonExtractor hook', status: 'DONE', model: 'sonnet', completed_at: '2026-02-19T11:05:00Z', ... },
]
```
WHEN: PipelinePanel renderuje się z tymi danymi
THEN:
- **Sekcja "Active Stories"** (u góry karty):
  - Summary row: "Active: **1**" (color #60a5fa), "Review: **1**" (color #a78bfa), "Merge: **1**" (color #4ade80) — font-size 11px, color #6b7280
  - Tabela/lista aktywnych stories (status `IN_PROGRESS`):
    - Story STORY-1.3: wyświetla się jako wiersz
    - Kolumny w wierszu:
      - Story ID (`p-id`): "STORY-1.3", font-size 11px, font-weight 700, color `#818cf8`, width 78px, flex-shrink 0
      - Tytuł (`p-title`): "Overview page setup", font-size 12px, color `#e6edf3`, flex 1, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
      - Model (`p-model`): "glm", font-size 10px, color `#6b7280`, width 55px, flex-shrink 0
      - Status badge (`p-status`): "IN PROGRESS", styl `ps-ip`: bg `#1a3a5c`, color `#60a5fa`, font-size 10px, padding `2px 7px`, border-radius 8px, font-weight 600
      - Czas od startu: np. "45m ago" — obliczony jako `Date.now() - new Date(story.started_at).getTime()`, format "Xm ago" lub "Xh Ym ago"
    - Styl wiersza: bg `#13111c`, border-radius 7px, padding `8px 11px`, margin-bottom 5px, cursor pointer, border `1px solid transparent`, on hover: border-color `#2a2540`
  - Jeśli brak stories z IN_PROGRESS: wyświetl info box "🎉 Pipeline idle — all stories done" (bg `#13111c`, border-radius 8px, padding 10px, text-align center, font-size 12px, color `#3d3757`)
AND:
- Kliknięcie wiersza story → otwiera Story Detail Modal (patrz AC-5)

### AC-4: Pipeline view — sekcje "Merge Queue" i "Done Today"

GIVEN: Dane z `usePipeline()` zawierają stories ze statusami MERGE i DONE
WHEN: PipelinePanel renderuje sekcje
THEN:
- **Sekcja "MERGE QUEUE"**:
  - Label sekcji: "MERGE QUEUE", font-size 10px, font-weight 700, color `#3d3757`, text-transform uppercase, letter-spacing 0.07em, margin-bottom 7px, margin-top 10px
  - Lista stories z `status === 'MERGE'` jako wiersze (ten sam styl `p-row`)
  - Status badge: styl `ps-mrg`: bg `#1a2a1a`, color `#34d399`, border `1px solid #2a5a2a`
  - Jeśli brak merge stories: brak sekcji MERGE QUEUE (nie renderuj)
- **Sekcja "DONE TODAY"**:
  - Label sekcji: "DONE TODAY", font-size 10px, font-weight 700, color `#3d3757`, uppercase, margin-bottom 7px, margin-top 10px
  - Lista stories z `status === 'DONE'` gdzie `completed_at` jest dzisiaj (porównaj `completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10)`)
  - Status badge: styl `ps-done`: bg `#1a3a1a`, color `#4ade80`
  - Jeśli brak done-today stories: brak sekcji DONE TODAY (nie renderuj)
AND:
- Kliknięcie każdego wiersza w Merge Queue i Done Today → Story Detail Modal

### AC-5: Kliknięcie wiersza story otwiera Story Detail Modal z pełnymi danymi

GIVEN: Użytkownik widzi wiersz "STORY-13.8" w Pipeline view
WHEN: Klika w ten wiersz (dowolne miejsce w `p-row`)
THEN:
- Modal otwiera się z danymi tej konkretnej story (nie modelu!)
- Modal header:
  - Ikona 🔧 (lub emoji odpowiedni dla domeny — użyj zawsze 🔧 jako fallback)
  - Tytuł: `story.title` — np. "Auto log-run hook", font-size 16px, font-weight 700, color #e6edf3
  - ID line: `story.story_id + ' · ' + story.epic`, np. "STORY-13.8 · EPIC-13", font-size 12px, color #818cf8
- Modal body, sekcja "Metadata":
  - Grid 2×2: Status (z kolorową wartością), Model, Epic, Data startu
  - Status color: DONE → #4ade80, IN_PROGRESS → #60a5fa, REVIEW → #a78bfa, REFACTOR → #fbbf24, MERGE → #34d399
  - Data startu: sformatowana jako "Feb 19, 11:05" (lokalna strefa, `toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })`)
- Modal body, sekcja "Definition of Done":
  - Bg #13111c, border-radius 8px, padding 10px 12px, font-size 12px, color #6b7280, line-height 1.6
  - Tekst: `story.dod`
- Modal body, sekcja "Runs":
  - Lista `story.runs` (max 10, DESC) — ten sam format co STORY-1.4 (rr-step, rr-model, rr-dur, rr-st)
  - Jeśli brak runów: "Brak runów dla tej story"
- Modal zamyka się: kliknięcie overlay, ✕, Escape

> **UWAGA IMPLEMENTACYJNA:** Możesz REUŻYĆ `StoryDetailModal` z STORY-1.4 LUB stworzyć nową wersję komponentu `PipelineStoryModal` która przyjmuje `PipelineStory` zamiast `Run[]`. Obie opcje są akceptowalne. Preferuj reużycie jeśli interfejsy są kompatybilne.

### AC-6: Activity Feed — lista ostatnich 20 eventów

GIVEN: `useRuns()` zwraca tablicę runów (każdy run = jeden event pipeline'u)
WHEN: ActivityFeed renderuje się
THEN:
- Bierze ostatnie 20 runów posortowanych `created_at` DESC (najnowsze pierwsze)
- Każdy event (`.act-item`) renderuje się z:
  - **Timeline linia:** pionowa linia (#2a2540, 1px) łącząca kolejne eventy (ukryta przy ostatnim)
  - **Dot:** kółko 8×8px, colored per status:
    - DONE: `#4ade80` (zielony)
    - REFACTOR: `#f87171` (czerwony)
    - REVIEW: `#60a5fa` (niebieski)
    - IN_PROGRESS: `#818cf8` (fioletowy/indigo)
    - MERGE: `#34d399` (teal)
  - **Treść eventu (`.act-event`):** font-size 12px, color `#e6edf3`
    - Format: `<span>{run.story_id}</span> advanced to {run.status} by {run.model}`
    - Gdzie `<span>` ma color `#818cf8`, font-weight 600
    - Przykład: `STORY-13.8 advanced to REVIEW by sonnet`
  - **Timestamp (`.act-time`):** font-size 10px, color `#4b4569`
    - Format: relative timestamp — "X min temu", "Xh temu", "wczoraj" (patrz implementacja poniżej)
AND:
- Separator między eventami: `border-bottom: 1px solid #1f1c2e` (przy ostatnim brak)
- Każdy `.act-item`: `display: flex; gap: 10px; padding: 7px 0`

### AC-7: Activity Feed auto-odświeża się co 30 sekund

GIVEN: Strona `?tab=pipeline` jest otwarta
WHEN: Upłynie 30 sekund
THEN:
- `useRuns().refresh()` jest wywoływane automatycznie co 30s
- Lista eventów aktualizuje się jeśli pojawiły się nowe runy
- Odświeżanie działa z `setInterval` w `useEffect` ActivityFeed lub przez hook `useRuns` z opcją `refreshInterval: 30000`
- Po odmontowaniu komponentu `clearInterval` jest wywoływany (cleanup)
AND:
- Brak widocznego loadera podczas auto-refresh (dane aktualizują się "w tle")
- Jeśli podczas auto-refresh API zwróci błąd — poprzednie dane pozostają widoczne

### AC-8: Offline state dla Pipeline view i Activity Feed

GIVEN: `usePipeline()` lub `useRuns()` zwraca `isOffline: true`
WHEN: Komponent `PipelinePage` renderuje się
THEN:
- W `PipelinePanel` (zamiast sekcji z wierszami): wyświetlany komunikat "🔌 Bridge offline — brak danych pipeline'u" (bg #13111c, padding 20px, text-align center, font-size 12px, color #4b4569)
- W `ActivityFeed` (zamiast listy eventów): wyświetlany komunikat "🔌 Bridge offline — brak danych aktywności" (identyczny styl)
- Layout dwupanelowy jest zachowany (nie collapsuje się)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

Route: `/?tab=pipeline` (query param w App Router)
Pliki do stworzenia:
```
/components/pipeline/PipelinePage.tsx      ← główny container dla tab=pipeline (wywołuje hooki, dwa panele)
/components/pipeline/PipelinePanel.tsx     ← lewa/górna karta: Active Stories, Merge Queue, Done Today
/components/pipeline/PipelineRow.tsx       ← reużywalny wiersz story
/components/pipeline/ActivityFeed.tsx      ← prawa/dolna karta: lista eventów
/components/pipeline/ActivityItem.tsx      ← pojedynczy event w feedzie
/components/pipeline/PipelineStoryModal.tsx ← modal z detalami story (lub reużyj STORY-1.4 StoryDetailModal)
```
Pliki do modyfikacji:
```
/app/page.tsx                              ← dodaj logikę tabs + renderuj PipelinePage gdy ?tab=pipeline
```

### Implementacja krok po kroku

#### Krok 1: Modyfikacja `/app/page.tsx` — obsługa zakładek

```tsx
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import OverviewPage from '@/components/overview/OverviewPage'
import PipelinePage from '@/components/pipeline/PipelinePage'

// Wszystkie zakładki
const TABS = ['Overview', 'Pipeline', 'Models', 'Epics', 'Eval', 'Patterns', 'NightClaw 🌙']

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Aktywna zakładka (default: 'overview')
  const activeTab = searchParams.get('tab') ?? 'overview'

  function handleTabClick(tab: string) {
    router.push(`/?tab=${tab.toLowerCase().split(' ')[0]}`)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar — zdefiniowany w layout lub tutaj inline */}
      <div style={{ height: '50px', borderBottom: '1px solid #2a2540', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px', background: '#1a1730' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3', flex: 1 }}>
          {activeTab === 'pipeline' ? 'Pipeline' : 'Overview'}
        </h1>
        {/* Opcjonalnie: search bar, akcje — pomijamy w tej story, implementuje STORY-1.8 */}
      </div>

      {/* Tabs bar */}
      <div style={{ display: 'flex', gap: '2px', padding: '10px 20px 0', borderBottom: '1px solid #2a2540', background: '#1a1730' }}>
        {TABS.map(tab => {
          const tabKey = tab.toLowerCase().split(' ')[0]
          const isActive = activeTab === tabKey || (activeTab === 'overview' && tabKey === 'overview')
          return (
            <div
              key={tab}
              onClick={() => handleTabClick(tab)}
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                color: isActive ? '#818cf8' : '#6b7280',
                cursor: 'pointer',
                borderRadius: '7px 7px 0 0',
                borderBottom: isActive ? '2px solid #818cf8' : '2px solid transparent',
                fontWeight: isActive ? 600 : 400,
                background: isActive ? '#13111c' : 'transparent',
                marginBottom: '-1px',
                transition: 'color 0.15s',
                userSelect: 'none',
              }}
            >
              {tab}
            </div>
          )
        })}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'pipeline' ? (
          <PipelinePage />
        ) : (
          <OverviewPage />
        )}
        {/* Pozostałe zakładki: Models, Epics, Eval, etc. — renderuj placeholder */}
        {!['overview', 'pipeline'].includes(activeTab) && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b4569', fontSize: '14px' }}>
            Coming soon — {activeTab}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ flex: 1, background: '#13111c' }} />}>
      <DashboardContent />
    </Suspense>
  )
}
```

> **WAŻNE:** `useSearchParams()` w Next.js App Router wymaga `<Suspense>` wrapujący komponent który go używa. Bez `<Suspense>` build się nie powiedzie. Zawsze owiń `DashboardContent` w `<Suspense>`.

#### Krok 2: `PipelinePage.tsx` — main container

```tsx
'use client'
import { usePipeline } from '@/hooks/usePipeline'
import { useRuns } from '@/hooks/useRuns'
import PipelinePanel from './PipelinePanel'
import ActivityFeed from './ActivityFeed'
import PipelineStoryModal from './PipelineStoryModal'
import { useState } from 'react'
import type { PipelineStory } from '@/types/api'

export default function PipelinePage() {
  const { data: stories, isLoading: pipelineLoading, isOffline: pipelineOffline } = usePipeline()
  const { data: runs, isLoading: runsLoading, isOffline: runsOffline, refresh: refreshRuns } = useRuns()
  const [selectedStory, setSelectedStory] = useState<PipelineStory | null>(null)

  const isOffline = pipelineOffline || runsOffline

  return (
    <div style={{ flex: 1, padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <PipelinePanel
          stories={stories}
          isLoading={pipelineLoading}
          isOffline={pipelineOffline}
          onStoryClick={setSelectedStory}
        />
        <ActivityFeed
          runs={runs}
          isLoading={runsLoading}
          isOffline={runsOffline}
          refresh={refreshRuns}
        />
      </div>

      {selectedStory && (
        <PipelineStoryModal
          isOpen={true}
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}
    </div>
  )
}
```

#### Krok 3: `PipelinePanel.tsx`

```tsx
'use client'
import type { PipelineStory } from '@/types/api'
import PipelineRow from './PipelineRow'

interface PipelinePanelProps {
  stories: PipelineStory[]
  isLoading: boolean
  isOffline: boolean
  onStoryClick: (story: PipelineStory) => void
}

export default function PipelinePanel({ stories, isLoading, isOffline, onStoryClick }: PipelinePanelProps) {
  if (isOffline) {
    return (
      <div style={{ background: '#1a1730', border: '1px solid #2a2540', borderRadius: '10px', padding: '15px' }}>
        <PipelineHeader />
        <div style={{ background: '#13111c', borderRadius: '8px', padding: '20px', textAlign: 'center', fontSize: '12px', color: '#4b4569' }}>
          🔌 Bridge offline — brak danych pipeline'u
        </div>
      </div>
    )
  }

  // Filtruj stories per sekcja
  const activeStories = stories.filter(s => s.status === 'IN_PROGRESS')
  const reviewStories = stories.filter(s => s.status === 'REVIEW')
  const mergeStories  = stories.filter(s => s.status === 'MERGE')
  
  // Done today: DONE i completed_at = dzisiaj
  const todayStr = new Date().toISOString().slice(0, 10)
  const doneTodayStories = stories.filter(s =>
    s.status === 'DONE' && s.completed_at && s.completed_at.slice(0, 10) === todayStr
  )

  // Summary counts
  const activeCount = activeStories.length
  const reviewCount = reviewStories.length
  const mergeCount  = mergeStories.length

  return (
    <div style={{ background: '#1a1730', border: '1px solid #2a2540', borderRadius: '10px', padding: '15px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', flex: 1 }}>Pipeline</h3>
        <span style={{ fontSize: '11px', color: '#4b4569', marginLeft: '6px' }}>— active + merge queue</span>
        <span style={{ fontSize: '11px', color: '#818cf8', cursor: 'pointer', marginLeft: 'auto' }}>+ Start Story</span>
      </div>

      {/* Summary counts */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>Active: <b style={{ color: '#60a5fa' }}>{activeCount}</b></span>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>Review: <b style={{ color: '#a78bfa' }}>{reviewCount}</b></span>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>Merge: <b style={{ color: '#4ade80' }}>{mergeCount}</b></span>
      </div>

      {/* Active stories (IN_PROGRESS) */}
      {isLoading ? (
        <div className="animate-pulse" style={{ height: '60px', background: '#2a2540', borderRadius: '8px', marginBottom: '10px' }} />
      ) : activeStories.length === 0 ? (
        <div style={{ background: '#13111c', borderRadius: '8px', padding: '10px', textAlign: 'center', color: '#3d3757', fontSize: '12px', marginBottom: '10px' }}>
          🎉 Pipeline idle — all stories done
        </div>
      ) : (
        activeStories.map(story => (
          <PipelineRow key={story.story_id} story={story} onClick={() => onStoryClick(story)} />
        ))
      )}

      {/* Review stories */}
      {reviewStories.length > 0 && (
        <>
          <SectionLabel>REVIEW QUEUE</SectionLabel>
          {reviewStories.map(story => (
            <PipelineRow key={story.story_id} story={story} onClick={() => onStoryClick(story)} />
          ))}
        </>
      )}

      {/* Merge Queue */}
      {mergeStories.length > 0 && (
        <>
          <SectionLabel>MERGE QUEUE</SectionLabel>
          {mergeStories.map(story => (
            <PipelineRow key={story.story_id} story={story} onClick={() => onStoryClick(story)} />
          ))}
        </>
      )}

      {/* Done Today */}
      {doneTodayStories.length > 0 && (
        <>
          <SectionLabel>DONE TODAY</SectionLabel>
          {doneTodayStories.map(story => (
            <PipelineRow key={story.story_id} story={story} onClick={() => onStoryClick(story)} />
          ))}
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: '10px', fontWeight: 700, color: '#3d3757', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px', marginTop: '10px' }}>
      {children}
    </div>
  )
}
```

#### Krok 4: `PipelineRow.tsx`

```tsx
'use client'
import type { PipelineStory } from '@/types/api'

const STATUS_STYLES: Record<string, { bg: string; color: string; border?: string; label: string }> = {
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa', label: 'IN PROGRESS' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa', label: 'REVIEW' },
  DONE:        { bg: '#1a3a1a', color: '#4ade80', label: 'DONE' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24', label: 'REFACTOR' },
  MERGE:       { bg: '#1a2a1a', color: '#34d399', border: '1px solid #2a5a2a', label: 'MERGE' },
}

function formatTimeAgo(isoString: string): string {
  // Oblicz różnicę między teraz a started_at
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  const remMin = diffMin % 60
  return `${diffH}h ${remMin}m ago`
}

interface PipelineRowProps {
  story: PipelineStory
  onClick: () => void
}

export default function PipelineRow({ story, onClick }: PipelineRowProps) {
  const st = STATUS_STYLES[story.status] ?? STATUS_STYLES.IN_PROGRESS
  const timeAgo = formatTimeAgo(story.started_at)

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '9px',
        background: '#13111c', borderRadius: '7px', padding: '8px 11px',
        marginBottom: '5px', cursor: 'pointer', transition: 'border-color 0.15s',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#2a2540' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}
    >
      {/* Story ID */}
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', width: '78px', flexShrink: 0 }}>
        {story.story_id}
      </div>
      {/* Tytuł */}
      <div style={{ fontSize: '12px', color: '#e6edf3', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {story.title}
      </div>
      {/* Model */}
      <div style={{ fontSize: '10px', color: '#6b7280', width: '55px', flexShrink: 0 }}>
        {story.model}
      </div>
      {/* Czas od startu */}
      <div style={{ fontSize: '10px', color: '#4b4569', width: '60px', textAlign: 'right', flexShrink: 0 }}>
        {timeAgo}
      </div>
      {/* Status badge */}
      <div style={{
        fontSize: '10px', padding: '2px 7px', borderRadius: '8px', fontWeight: 600,
        flexShrink: 0, background: st.bg, color: st.color,
        border: st.border ?? 'none',
      }}>
        {st.label}
      </div>
    </div>
  )
}
```

#### Krok 5: `ActivityFeed.tsx`

```tsx
'use client'
import { useEffect } from 'react'
import type { Run } from '@/types/api'
import ActivityItem from './ActivityItem'

interface ActivityFeedProps {
  runs: Run[]
  isLoading: boolean
  isOffline: boolean
  refresh: () => void
}

export default function ActivityFeed({ runs, isLoading, isOffline, refresh }: ActivityFeedProps) {
  // Auto-refresh co 30 sekund
  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, 30000) // 30 000 ms = 30 sekund

    return () => clearInterval(interval) // cleanup przy odmontowaniu
  }, [refresh])

  // Ostatnie 20 runów, DESC (najnowsze pierwsze)
  const last20 = [...runs]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20)

  return (
    <div style={{ background: '#1a1730', border: '1px solid #2a2540', borderRadius: '10px', padding: '15px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', flex: 1 }}>Activity Feed</h3>
        <span style={{ fontSize: '11px', color: '#4b4569', marginLeft: '6px' }}>— live events</span>
        <span style={{ fontSize: '11px', color: '#818cf8', cursor: 'pointer', marginLeft: 'auto' }}>All events →</span>
      </div>

      {/* Content */}
      {isOffline ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#4b4569' }}>
          🔌 Bridge offline — brak danych aktywności
        </div>
      ) : isLoading ? (
        <div className="animate-pulse" style={{ height: '200px', background: '#2a2540', borderRadius: '8px' }} />
      ) : last20.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#4b4569' }}>
          Brak eventów — pipeline idle
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {last20.map((run, i) => (
            <ActivityItem key={run.id} run={run} isLast={i === last20.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}
```

#### Krok 6: `ActivityItem.tsx`

```tsx
'use client'
import type { Run } from '@/types/api'

const DOT_COLORS: Record<string, string> = {
  DONE:        '#4ade80',
  REFACTOR:    '#f87171',
  REVIEW:      '#60a5fa',
  IN_PROGRESS: '#818cf8',
  MERGE:       '#34d399',
}

function formatRelativeTime(isoString: string): string {
  // Oblicz względny czas do wyświetlenia
  // Format: "X min temu", "Xh temu", "wczoraj"
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1)   return 'przed chwilą'
  if (diffMin < 60)  return `${diffMin} min temu`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24)    return `${diffH}h temu`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1)   return 'wczoraj'
  return `${diffD} dni temu`
}

interface ActivityItemProps {
  run: Run
  isLast: boolean
}

export default function ActivityItem({ run, isLast }: ActivityItemProps) {
  const dotColor = DOT_COLORS[run.status] ?? '#818cf8'
  const relTime = formatRelativeTime(run.created_at)

  return (
    <div style={{ display: 'flex', gap: '10px', padding: '7px 0', borderBottom: isLast ? 'none' : '1px solid #1f1c2e', position: 'relative' }}>
      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: '3px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        {!isLast && (
          <div style={{ width: '1px', background: '#2a2540', flex: 1, marginTop: '3px' }} />
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: '#e6edf3' }}>
          <span style={{ color: '#818cf8', fontWeight: 600 }}>{run.story_id}</span>
          {' '}advanced to {run.status} by {run.model}
        </div>
        <div style={{ fontSize: '10px', color: '#4b4569', marginTop: '1px' }}>
          {relTime} · {run.step} · {(run.duration_seconds / 60).toFixed(1)}m
        </div>
      </div>
    </div>
  )
}
```

#### Krok 7: `PipelineStoryModal.tsx`

> Stwórz jako nowy komponent zamiast reużycia `StoryDetailModal` z STORY-1.4, bo przyjmuje `PipelineStory` (nie tablicę `Run[]` per model).

```tsx
'use client'
import { useEffect } from 'react'
import type { PipelineStory } from '@/types/api'

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  DONE:        { bg: '#1a3a1a', color: '#4ade80', label: 'DONE' },
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa', label: 'IN PROGRESS' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa', label: 'REVIEW' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24', label: 'REFACTOR' },
  MERGE:       { bg: '#1a2a1a', color: '#34d399', label: 'MERGE' },
}

interface PipelineStoryModalProps {
  isOpen: boolean
  story: PipelineStory
  onClose: () => void
}

export default function PipelineStoryModal({ isOpen, story, onClose }: PipelineStoryModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const st = STATUS_STYLES[story.status] ?? STATUS_STYLES.IN_PROGRESS

  // Sformatuj datę startu
  const startedDate = new Date(story.started_at).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  // Ostatnie 10 runów DESC
  const last10runs = [...(story.runs ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1a1730', border: '1px solid #3b3d7a', borderRadius: '14px', width: '540px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.6)', animation: 'fadeUp 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 12px', borderBottom: '1px solid #2a2540', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: '#2d1b4a', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
            🔧
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>{story.title}</div>
            <div style={{ fontSize: '12px', color: '#818cf8', marginTop: '2px' }}>
              {story.story_id} · {story.epic}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: '28px', height: '28px', background: '#2a2540', border: 'none', borderRadius: '7px', color: '#6b7280', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Metadata */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#4b4569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Metadata</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Status',  value: <span style={{ color: st.color }}>{st.label}</span> },
                { label: 'Model',   value: story.model },
                { label: 'Epic',    value: story.epic },
                { label: 'Started', value: startedDate },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#13111c', borderRadius: '7px', padding: '8px 11px' }}>
                  <div style={{ fontSize: '10px', color: '#4b4569', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* DoD */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#4b4569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Definition of Done</h4>
            <div style={{ background: '#13111c', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#6b7280', lineHeight: 1.6 }}>
              {story.dod || 'Brak opisu DoD'}
            </div>
          </div>

          {/* Runs */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#4b4569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Runs ({last10runs.length})</h4>
            {last10runs.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#4b4569', padding: '12px', textAlign: 'center' }}>Brak runów dla tej story</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {last10runs.map(run => {
                  const rst = STATUS_STYLES[run.status] ?? STATUS_STYLES.DONE
                  return (
                    <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', background: '#13111c', borderRadius: '7px', padding: '8px 11px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', width: '70px', flexShrink: 0 }}>{run.step}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{run.model}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', width: '44px', textAlign: 'right' }}>{(run.duration_seconds / 60).toFixed(1)}m</div>
                      <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '7px', fontWeight: 600, background: rst.bg, color: rst.color }}>{run.status}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #2a2540', display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 18px', background: '#2a2540', color: '#6b7280', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>Close</button>
          <button style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>View Full Story →</button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
```

### Stany widoku

**Loading:**
- PipelinePanel: szary skeleton block 60px (animate-pulse) zamiast wierszy
- ActivityFeed: szary skeleton block 200px (animate-pulse)

**Empty:**
- PipelinePanel, brak IN_PROGRESS: "🎉 Pipeline idle — all stories done"
- ActivityFeed, brak runów: "Brak eventów — pipeline idle"

**Offline:**
- PipelinePanel: "🔌 Bridge offline — brak danych pipeline'u"
- ActivityFeed: "🔌 Bridge offline — brak danych aktywności"

**Filled (normalny stan):**
- PipelinePanel: wiersze per sekcja (Active, Review Queue, Merge Queue, Done Today)
- ActivityFeed: lista 20 eventów z kolorowymi dots i relative timestamps

### Flow interakcji (krok po kroku)

```
1. Użytkownik klika tab "Pipeline" → router.push('/?tab=pipeline')
2. page.tsx czyta searchParams.get('tab') === 'pipeline' → renderuje <PipelinePage />
3. PipelinePage montuje → usePipeline() i useRuns() wysyłają requesty
4. isLoading: true → skeleton w obu panelach
5. Dane załadowane → PipelinePanel wyświetla sekcje, ActivityFeed wyświetla eventy
6. Co 30s → setInterval → refresh() → useRuns() re-fetchuje → ActivityFeed aktualizuje się
7. Użytkownik klika wiersz story → setSelectedStory(story) → PipelineStoryModal otwiera się
8. Modal: użytkownik widzi Status, Model, Epic, Started, DoD, listę runów
9. Użytkownik klika ✕ lub Escape lub overlay → onClose() → selectedStory = null
```

### Responsive / Dostępność

- **Desktop (1280px+):** grid 2 kolumny — PipelinePanel po lewej, ActivityFeed po prawej
- **Keyboard navigation:**
  - Tab key: przełącza fokus między zakładkami (domyślne HTML tab-index)
  - Enter na zakładce: aktywuje ją (dodaj `onKeyDown` handler lub użyj `<button>`)
  - Escape w modalu: zamyka modal (zaimplementowane)
- **ARIA:** tabs powinny mieć `role="tab"`, `aria-selected={isActive}` — minimalna implementacja
- Mobile: nie wymagane (Epic Out of Scope)

### Design Reference

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
- **Tab w mockupie:** "Pipeline" (druga zakładka w tabs barze)
- **Sekcje:** w Overview page mockupu — prawa karta "Pipeline" (`.card` z `.p-row` wierszami) i lewa karta "Activity Feed" (`.activity-list`)
- **Pipeline row colors:**
  - `.ps-ip` (IN PROGRESS): bg `#1a3a5c`, color `#60a5fa`
  - `.ps-rv` (REVIEW): bg `#2d1b4a`, color `#a78bfa`
  - `.ps-done` (DONE): bg `#1a3a1a`, color `#4ade80`
  - `.ps-rf` (REFACTOR): bg `#3a2a00`, color `#fbbf24`
  - `.ps-mrg` (MERGE): bg `#1a2a1a`, color `#34d399`, border `1px solid #2a5a2a`
- **Activity dot colors:**
  - DONE: `#4ade80`, REFACTOR: `#f87171`, REVIEW: `#60a5fa`, IN_PROGRESS/system: `#818cf8`
- **Section label:** font-size 10px, font-weight 700, color `#3d3757`, uppercase, letter-spacing 0.07em

---

## ⚠️ Edge Cases

### EC-1: Brak aktywnych stories — pipeline idle

Scenariusz: `usePipeline()` zwraca `[]` lub wszystkie stories mają `status === 'DONE'` i `completed_at` starsze niż dziś
Oczekiwane zachowanie:
- PipelinePanel wyświetla "🎉 Pipeline idle — all stories done" (bg #13111c, border-radius 8px, padding 10px, text-align center, font-size 12px, color #3d3757)
- Summary row: "Active: **0**", "Review: **0**", "Merge: **0**"
- Sekcje Merge Queue i Done Today nie renderują się (brak danych)
- ActivityFeed działa normalnie — pokazuje historyczne eventy

### EC-2: useSearchParams() — Next.js App Router Suspense requirement

Scenariusz: Implementor próbuje użyć `useSearchParams()` bez `<Suspense>` wrapującego komponent
Oczekiwane zachowanie (błąd build/runtime):
- `Error: useSearchParams() should be wrapped in a suspense boundary at page "/".`
- **Rozwiązanie:** Komponent który używa `useSearchParams()` MUSI być wewnątrz `<Suspense>` w `page.tsx`
- Kod w `/app/page.tsx` musi wyglądać:
  ```tsx
  export default function Home() {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <DashboardContent />  // ← tu jest useSearchParams()
      </Suspense>
    )
  }
  ```

### EC-3: setInterval leak — refresh po odmontowaniu

Scenariusz: Użytkownik przełącza z `?tab=pipeline` na `?tab=overview` → `ActivityFeed` odmontowuje się, ale `setInterval` nadal działa
Oczekiwane zachowanie:
- `useEffect` cleanup: `return () => clearInterval(intervalId)` — OBOWIĄZKOWE
- Po odmontowaniu `ActivityFeed` — brak błędu "Cannot update state on unmounted component"
- W React 18+ strict mode: `useEffect` uruchamia się dwukrotnie w dev → cleanup musi być idempotentny

### EC-4: Bardzo długie story titles w PipelineRow

Scenariusz: `story.title = "Bardzo długa nazwa story która nie mieści się w wierszu tabeli pipeline"` (>60 znaków)
Oczekiwane zachowanie:
- Element `p-title` ma `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Tytuł jest ucinany z "..." i nie łamie layoutu wiersza
- Inne kolumny (ID, Model, Czas, Status) mają `flex-shrink: 0` i zawsze są widoczne

---

## 🚫 Out of Scope tej Story

- Sidebar navigation i tabs bar dla zakładek Models/Epics/Eval/Patterns/NightClaw (STORY-1.8)
- Eval panel (STORY-1.6)
- WebSocket real-time updates (Epic Out of Scope — polling co 30s wystarczy)
- Edycja stories z UI (Epic Out of Scope — read-only)
- Filtrowanie i sortowanie stories w Pipeline
- Search (w topbarze — STORY-1.8)
- Akcja "+ Start Story" (tylko widoczna, brak funkcjonalności w tej story)

---

## ✔️ Definition of Done

- [ ] Tabs bar renderuje się z zakładkami: Overview, Pipeline, Models, Epics, Eval, Patterns, NightClaw
- [ ] Kliknięcie "Pipeline" zmienia URL na `/?tab=pipeline` i renderuje Pipeline view
- [ ] Kliknięcie "Overview" przełącza z powrotem na OverviewPage
- [ ] Odświeżenie strony na `/?tab=pipeline` zachowuje aktywną zakładkę Pipeline
- [ ] PipelinePanel wyświetla sekcje: Active Stories, (Review Queue), MERGE QUEUE, DONE TODAY
- [ ] Wiersze Pipeline mają kolumny: Story ID, Tytuł, Model, Czas od startu, Status badge
- [ ] Status badge ma poprawny kolor per status (IN_PROGRESS=niebieski, REVIEW=fioletowy, DONE=zielony, REFACTOR=żółty, MERGE=teal)
- [ ] Kliknięcie wiersza story otwiera PipelineStoryModal z metadanymi, DoD i listą runów
- [ ] Modal zamyka się: Escape, ✕, kliknięcie overlay
- [ ] ActivityFeed wyświetla ostatnie 20 runów jako eventy (story_id, status, model, relative time)
- [ ] Relative timestamp działa: "X min temu", "Xh temu", "wczoraj"
- [ ] Auto-refresh co 30s — `setInterval` + cleanup w `useEffect`
- [ ] Offline state: oba panele wyświetlają komunikat offline, brak crasha
- [ ] `useSearchParams()` jest opakowany w `<Suspense>` w `page.tsx`
- [ ] `setInterval` cleanup w ActivityFeed — brak memory leaku po zmianie zakładki
- [ ] Kod przechodzi `npm run lint` bez błędów
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, offline, filled)
- [ ] Widok porównany wizualnie z mockupem (karty Pipeline i Activity Feed)
- [ ] Story review przez PO
