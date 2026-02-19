---
story_id: STORY-1.2
title: "Developer buduje React hooks pobierające dane z Bridge API z pollingiem co 30s"
epic: EPIC-1
module: dashboard
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: n/a
api_reference: http://localhost:8199
priority: must
estimated_effort: 6h
depends_on: STORY-1.1
blocks: STORY-1.3, STORY-1.4, STORY-1.5, STORY-1.6, STORY-1.7, STORY-1.8
tags: [hooks, swr, polling, bridge-api, typescript, data-layer]
---

## 🎯 User Story

**Jako** komponent React w kira-dashboard
**Chcę** wywoływać gotowe hooki (`useStats`, `usePipeline`, `useRuns`, `useEval`, `useProjects`) które automatycznie pobierają i odświeżają dane z Bridge API co 30 sekund
**Żeby** każda strona dashboardu miała aktualne dane bez pisania własnej logiki fetch/polling/error-handling

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Pliki hooków tworzymy w katalogu:
```
kira-dashboard/hooks/
```
Ten katalog NIE istnieje przed tą story — trzeba go stworzyć.

### Wymagania wstępne (must exist before this story)
- **STORY-1.1 musi być ukończona** — muszą istnieć:
  - `lib/bridge.ts` z funkcją `fetchBridge<T>(path: string): Promise<T | null>`
  - `types/bridge.ts` z typami: `PipelineResponse`, `RunsResponse`, `EvalOverviewResponse`, `ProjectsResponse`, `PipelineStats`, `Story`, `Run`, `EvalScore`, `Project`
  - Pakiet `swr` zainstalowany w `package.json`

### Powiązane pliki (do stworzenia przez tę story)
```
kira-dashboard/
├── hooks/
│   ├── useStats.ts        ← hook → GET /api/status/pipeline → { stats: PipelineStats }
│   ├── usePipeline.ts     ← hook → GET /api/status/pipeline → { stories: Story[] }
│   ├── useRuns.ts         ← hook → GET /api/status/runs → { runs: Run[] }
│   ├── useEval.ts         ← hook → GET /api/eval/overview → EvalOverviewResponse
│   └── useProjects.ts     ← hook → GET /api/projects → { projects: Project[] }
└── types/
    └── bridge.ts          ← ISTNIEJĄCY plik — NIE modyfikujemy, tylko importujemy
```

### Bridge API — dostępne endpointy

Wszystkie żądania są GET, bez autoryzacji (Bridge API jest lokalny, bez auth).

| Endpoint | Zwraca | Typ odpowiedzi |
|---|---|---|
| `GET /api/status/pipeline` | Stats + lista stories | `PipelineResponse` |
| `GET /api/status/runs` | Lista ostatnich 20 runów | `RunsResponse` |
| `GET /api/eval/overview` | Wyniki eval per kategoria | `EvalOverviewResponse` |
| `GET /api/projects` | Lista projektów | `ProjectsResponse` |

**WAŻNE:** Endpoint `GET /api/status/pipeline` jest używany przez DWA hooki:
- `useStats()` — pobiera tylko `response.stats` (obiekt PipelineStats)
- `usePipeline()` — pobiera tylko `response.stories` (tablica Story[])

Oba hooki wywołują ten sam endpoint — to jest zamierzone. SWR automatycznie deduplikuje identyczne żądania (cache key = URL), więc dwa hooki używające tego samego URL nie spowodują dwóch zapytań HTTP.

---

## ✅ Acceptance Criteria

### AC-1: `useStats()` zwraca statystyki pipeline'u
GIVEN: Bridge API jest online i `GET http://localhost:8199/api/status/pipeline` zwraca:
```json
{
  "stats": { "total": 8, "done": 3, "in_progress": 2, "review": 1 },
  "stories": [...]
}
```
WHEN: Komponent React wywołuje hook `const { stats, loading, offline } = useStats()`
THEN: Po pierwszym renderze `loading === true` i `stats === null`
AND: Po otrzymaniu odpowiedzi z Bridge API `loading === false`
AND: `stats` jest obiektem: `{ total: 8, done: 3, in_progress: 2, review: 1 }`
AND: `offline === false`

### AC-2: `usePipeline()` zwraca listę aktywnych stories
GIVEN: Bridge API jest online i `GET http://localhost:8199/api/status/pipeline` zwraca `stories` z 2 elementami: `[{ id: "STORY-1.2", status: "IN_PROGRESS", ... }, { id: "STORY-1.3", status: "REVIEW", ... }]`
WHEN: Komponent React wywołuje hook `const { stories, loading, offline } = usePipeline()`
THEN: Po otrzymaniu danych `loading === false`
AND: `stories` jest tablicą z 2 elementami
AND: `stories[0].id === "STORY-1.2"` i `stories[0].status === "IN_PROGRESS"`
AND: `stories[1].id === "STORY-1.3"` i `stories[1].status === "REVIEW"`
AND: `offline === false`

### AC-3: `useRuns()` zwraca listę ostatnich runów
GIVEN: Bridge API jest online i `GET http://localhost:8199/api/status/runs` zwraca `{ "runs": [...20 elementów...] }`
WHEN: Komponent React wywołuje hook `const { runs, loading, offline } = useRuns()`
THEN: Po otrzymaniu danych `loading === false`
AND: `runs` jest tablicą (może mieć 0-20 elementów)
AND: Każdy element `runs[i]` ma pola: `id`, `story_id`, `story_title`, `model`, `status`, `started_at`
AND: `offline === false`

### AC-4: `useEval()` zwraca wyniki eval
GIVEN: Bridge API jest online i `GET http://localhost:8199/api/eval/overview` zwraca `{ "scores": [...], "last_run_at": "2026-02-19T10:00:00Z", "overall_score": 0.87 }`
WHEN: Komponent React wywołuje hook `const { scores, overallScore, lastRunAt, loading, offline } = useEval()`
THEN: Po otrzymaniu danych `loading === false`
AND: `scores` jest tablicą obiektów EvalScore
AND: `overallScore === 0.87`
AND: `lastRunAt === "2026-02-19T10:00:00Z"`
AND: `offline === false`

### AC-5: `useProjects()` zwraca listę projektów
GIVEN: Bridge API jest online i `GET http://localhost:8199/api/projects` zwraca `{ "projects": [{ "key": "kira", "name": "Kira Pipeline", "active": true, ... }, { "key": "gym-tracker", "name": "Gym Tracker", "active": false, ... }] }`
WHEN: Komponent React wywołuje hook `const { projects, loading, offline } = useProjects()`
THEN: Po otrzymaniu danych `loading === false`
AND: `projects` jest tablicą z 2 elementami
AND: `projects[0].key === "kira"` i `projects[0].active === true`
AND: `offline === false`

### AC-6: Wszystkie hooki zwracają `offline: true` gdy Bridge offline
GIVEN: Bridge API NIE jest uruchomione (port 8199 nie odpowiada)
WHEN: Komponent React wywołuje dowolny hook np. `const { stats, loading, offline } = useStats()`
THEN: Po próbie połączenia `loading === false`
AND: `offline === true`
AND: `stats === null` (lub odpowiadające pole danych jest `null`)
AND: Komponent NIE crashuje (nie pojawia się "500" ani biały ekran)
AND: W konsoli pojawia się komunikat `[Bridge] offline: /api/status/pipeline` (z `lib/bridge.ts`)

### AC-7: Polling działa co 30 sekund (domyślnie)
GIVEN: Komponent React jest zamontowany i używa `useStats()` z domyślną konfiguracją
WHEN: Upływa 30 sekund od ostatniego fetch
THEN: Hook automatycznie wysyła nowe żądanie `GET /api/status/pipeline`
AND: Po otrzymaniu odpowiedzi `stats` jest zaktualizowane do nowych wartości
AND: Komponent re-renderuje się z nowymi danymi

### AC-8: Interwał pollingu jest konfigurowalny
GIVEN: Komponent React wywołuje hook z niestandardowym interwałem: `useStats({ refreshInterval: 10000 })`
WHEN: Upływa 10 sekund od ostatniego fetch
THEN: Hook wysyła nowe żądanie (nie czeka 30 sekund)
GIVEN: Komponent React wywołuje hook z `useStats({ refreshInterval: 0 })`
WHEN: Komponent jest zamontowany
THEN: Hook pobiera dane raz i NIE ustawia żadnego timera (brak pollingu)

### AC-9: Polling zatrzymuje się gdy komponent jest odmontowany
GIVEN: Komponent React który używa `useStats()` jest zamontowany
AND: Hook ustawił timer pollingu
WHEN: Komponent jest odmontowany (np. user nawiguje do innej strony)
THEN: Timer pollingu jest anulowany (clearInterval lub SWR unmount cleanup)
AND: NIE pojawiają się błędy "Can't perform state update on unmounted component"
AND: NIE wysyłane są żadne nowe żądania HTTP po odmontowaniu

### AC-10: Hooki `useStats` i `usePipeline` nie wysyłają duplikatów żądań
GIVEN: Komponent React używa jednocześnie OBU hooków: `useStats()` i `usePipeline()`
WHEN: Komponent jest montowany po raz pierwszy
THEN: Do Bridge API wysyłane jest TYLKO JEDNO żądanie `GET /api/status/pipeline` (nie dwa)
AND: SWR cache deduplikuje żądania na podstawie klucza URL `/api/status/pipeline`

---

## ⚙️ Szczegóły Backend

### Mechanizm pollingu — SWR

Używamy biblioteki `swr` (zainstalowanej w STORY-1.1). SWR zapewnia:
- Automatyczny polling przez opcję `refreshInterval`
- Deduplikację żądań (ten sam URL = jeden fetch)
- Cache między renderami
- Automatyczny cleanup przy odmontowaniu

**NIE używamy React Query** — to zbędna zależność dla tego projektu.

### Konfiguracja SWR fetcher

W każdym pliku hooka definiujemy fetcher który używa `fetchBridge` z `lib/bridge.ts`:

```typescript
// Fetcher dla SWR — wraps fetchBridge
// SWR calls fetcher(key) where key = URL path
async function bridgeFetcher<T>(path: string): Promise<T> {
  const data = await fetchBridge<T>(path)
  if (data === null) {
    // SWR traktuje throw jako error state
    // Ale MY chcemy obsłużyć offline jako osobny stan, nie error
    // Dlatego rzucamy specjalny obiekt który hook rozróżni
    throw new BridgeOfflineError()
  }
  return data
}
```

**ALTERNATYWNIE** (prostsza implementacja bez SWR error state):

Zamiast rzucać błąd, hook może nie używać SWR error handling i samodzielnie zarządzać offline state. Poniżej podajemy OBIE implementacje — wybierz jedną i trzymaj się jej we wszystkich hookach.

### Endpoint: GET /api/status/pipeline

**URL:** `http://localhost:8199/api/status/pipeline` (lub `${BRIDGE_URL}/api/status/pipeline`)

**Metoda:** GET

**Nagłówki żądania:** `Accept: application/json` (dodawane przez `fetchBridge`)

**Oczekiwana odpowiedź HTTP 200:**
```json
{
  "stats": {
    "total": 8,
    "done": 3,
    "in_progress": 2,
    "review": 1
  },
  "stories": [
    {
      "id": "STORY-1.2",
      "title": "Bridge API data layer — hooks i typy",
      "epic": "EPIC-1",
      "status": "IN_PROGRESS",
      "domain": "backend",
      "difficulty": "moderate",
      "assigned_model": "sonnet",
      "started_at": "2026-02-19T10:00:00Z",
      "updated_at": "2026-02-19T11:30:00Z"
    }
  ]
}
```

**TypeScript typ odpowiedzi:** `PipelineResponse` (z `types/bridge.ts`)

**Używany przez:** `useStats()` (pobiera `.stats`) i `usePipeline()` (pobiera `.stories`)

### Endpoint: GET /api/status/runs

**URL:** `http://localhost:8199/api/status/runs`

**Metoda:** GET

**Oczekiwana odpowiedź HTTP 200:**
```json
{
  "runs": [
    {
      "id": "42",
      "story_id": "STORY-1.2",
      "story_title": "Bridge API data layer — hooks i typy",
      "model": "sonnet",
      "status": "success",
      "duration_seconds": 187,
      "cost_estimate": 0.032,
      "started_at": "2026-02-19T10:00:00Z",
      "finished_at": "2026-02-19T10:03:07Z",
      "error": null
    }
  ]
}
```

**TypeScript typ odpowiedzi:** `RunsResponse` (z `types/bridge.ts`)

**Używany przez:** `useRuns()`

### Endpoint: GET /api/eval/overview

**URL:** `http://localhost:8199/api/eval/overview`

**Metoda:** GET

**Oczekiwana odpowiedź HTTP 200:**
```json
{
  "scores": [
    {
      "category": "code_quality",
      "score": 0.85,
      "pass_rate": 0.90,
      "total_tests": 10,
      "passed_tests": 9
    },
    {
      "category": "type_safety",
      "score": 0.92,
      "pass_rate": 0.95,
      "total_tests": 20,
      "passed_tests": 19
    }
  ],
  "last_run_at": "2026-02-19T10:00:00Z",
  "overall_score": 0.87
}
```

**TypeScript typ odpowiedzi:** `EvalOverviewResponse` (z `types/bridge.ts`)

**Używany przez:** `useEval()`

### Endpoint: GET /api/projects

**URL:** `http://localhost:8199/api/projects`

**Metoda:** GET

**Oczekiwana odpowiedź HTTP 200:**
```json
{
  "projects": [
    {
      "key": "kira",
      "name": "Kira Pipeline",
      "description": "Kira AI pipeline system",
      "active": true
    },
    {
      "key": "gym-tracker",
      "name": "Gym Tracker",
      "description": null,
      "active": false
    }
  ]
}
```

**TypeScript typ odpowiedzi:** `ProjectsResponse` (z `types/bridge.ts`)

**Używany przez:** `useProjects()`

### Implementacja hooków (krok po kroku)

#### Plik `hooks/useStats.ts`

```typescript
// hooks/useStats.ts
// Hook pobierający zagregowane statystyki pipeline'u z Bridge API.
// Używa SWR z pollingiem.

'use client' // ← WYMAGANE — SWR działa tylko po stronie klienta

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { PipelineResponse, PipelineStats } from '@/types/bridge'

/** Opcje konfiguracyjne dla hooka useStats. */
interface UseStatsOptions {
  /**
   * Interwał pollingu w milisekundach.
   * Domyślnie: 30000 (30 sekund).
   * Ustaw na 0 żeby wyłączyć polling.
   */
  refreshInterval?: number
}

/** Wartości zwracane przez hook useStats. */
interface UseStatsReturn {
  /** Statystyki pipeline'u. null gdy ładowanie lub offline. */
  stats: PipelineStats | null
  /** true gdy pierwsze ładowanie (stats === null i nie offline). */
  loading: boolean
  /** true gdy Bridge API jest niedostępne lub zwróciło błąd. */
  offline: boolean
}

/**
 * Pobiera zagregowane statystyki pipeline'u z Bridge API.
 * Endpoint: GET /api/status/pipeline
 * Używa pola response.stats.
 *
 * Przykład użycia:
 *   const { stats, loading, offline } = useStats()
 *   const { stats } = useStats({ refreshInterval: 10000 }) // polling co 10s
 *   const { stats } = useStats({ refreshInterval: 0 })     // bez pollingu
 */
export function useStats(options: UseStatsOptions = {}): UseStatsReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<PipelineResponse | null>(
    '/api/status/pipeline',
    (path: string) => fetchBridge<PipelineResponse>(path),
    {
      refreshInterval,
      // Nie rewaliduj przy focusie okna — zbędne dla dashboard
      revalidateOnFocus: false,
      // Nie retry automatycznie przy błędzie — fetchBridge już robi retry
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || data === null && !isLoading
  const stats = data?.stats ?? null

  return {
    stats,
    loading: isLoading,
    offline,
  }
}
```

#### Plik `hooks/usePipeline.ts`

```typescript
// hooks/usePipeline.ts
// Hook pobierający listę aktywnych stories z Bridge API.
// Współdzieli cache SWR z useStats() — ten sam klucz '/api/status/pipeline'.

'use client'

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { PipelineResponse, Story } from '@/types/bridge'

interface UsePipelineOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UsePipelineReturn {
  /** Lista stories. null gdy ładowanie lub offline. */
  stories: Story[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Pobiera listę aktywnych stories z Bridge API.
 * Endpoint: GET /api/status/pipeline (to samo co useStats — SWR deduplikuje zapytania)
 * Używa pola response.stories.
 */
export function usePipeline(options: UsePipelineOptions = {}): UsePipelineReturn {
  const { refreshInterval = 30000 } = options

  // WAŻNE: klucz SWR to '/api/status/pipeline' — IDENTYCZNY jak w useStats.
  // SWR automatycznie deduplikuje — jedno żądanie HTTP dla obu hooków.
  const { data, error, isLoading } = useSWR<PipelineResponse | null>(
    '/api/status/pipeline',
    (path: string) => fetchBridge<PipelineResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || data === null && !isLoading
  const stories = data?.stories ?? null

  return {
    stories,
    loading: isLoading,
    offline,
  }
}
```

#### Plik `hooks/useRuns.ts`

```typescript
// hooks/useRuns.ts
// Hook pobierający listę ostatnich runów modeli AI z Bridge API.

'use client'

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { RunsResponse, Run } from '@/types/bridge'

interface UseRunsOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UseRunsReturn {
  /** Lista ostatnich runów (max 20). null gdy ładowanie lub offline. */
  runs: Run[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Pobiera listę ostatnich 20 runów z Bridge API.
 * Endpoint: GET /api/status/runs
 */
export function useRuns(options: UseRunsOptions = {}): UseRunsReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<RunsResponse | null>(
    '/api/status/runs',
    (path: string) => fetchBridge<RunsResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || data === null && !isLoading
  const runs = data?.runs ?? null

  return {
    runs,
    loading: isLoading,
    offline,
  }
}
```

#### Plik `hooks/useEval.ts`

```typescript
// hooks/useEval.ts
// Hook pobierający wyniki eval framework z Bridge API.

'use client'

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { EvalOverviewResponse, EvalScore } from '@/types/bridge'

interface UseEvalOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UseEvalReturn {
  /** Lista wyników per kategoria. null gdy ładowanie lub offline. */
  scores: EvalScore[] | null
  /** Łączny wynik 0.0-1.0. null gdy ładowanie lub offline. */
  overallScore: number | null
  /** ISO 8601 timestamp ostatniego eval run. null gdy brak lub offline. */
  lastRunAt: string | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Pobiera wyniki eval framework per kategoria z Bridge API.
 * Endpoint: GET /api/eval/overview
 */
export function useEval(options: UseEvalOptions = {}): UseEvalReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<EvalOverviewResponse | null>(
    '/api/eval/overview',
    (path: string) => fetchBridge<EvalOverviewResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || data === null && !isLoading

  return {
    scores: data?.scores ?? null,
    overallScore: data?.overall_score ?? null,
    lastRunAt: data?.last_run_at ?? null,
    loading: isLoading,
    offline,
  }
}
```

#### Plik `hooks/useProjects.ts`

```typescript
// hooks/useProjects.ts
// Hook pobierający listę projektów Kira z Bridge API.

'use client'

import useSWR from 'swr'
import { fetchBridge } from '@/lib/bridge'
import type { ProjectsResponse, Project } from '@/types/bridge'

interface UseProjectsOptions {
  /** Interwał pollingu w ms. Domyślnie: 30000 (30s). Ustaw 0 = brak pollingu. */
  refreshInterval?: number
}

interface UseProjectsReturn {
  /** Lista zarejestrowanych projektów. null gdy ładowanie lub offline. */
  projects: Project[] | null
  /** true gdy pierwsze ładowanie. */
  loading: boolean
  /** true gdy Bridge offline lub error. */
  offline: boolean
}

/**
 * Pobiera listę wszystkich zarejestrowanych projektów z Bridge API.
 * Endpoint: GET /api/projects
 */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const { refreshInterval = 30000 } = options

  const { data, error, isLoading } = useSWR<ProjectsResponse | null>(
    '/api/projects',
    (path: string) => fetchBridge<ProjectsResponse>(path),
    {
      refreshInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )

  const offline = error !== undefined || data === null && !isLoading
  const projects = data?.projects ?? null

  return {
    projects,
    loading: isLoading,
    offline,
  }
}
```

### Konfiguracja SWR Provider (wymagana w `app/layout.tsx`)

SWR wymaga providera na poziomie root layout aby współdzielić cache między komponentami. Dodaj do `app/layout.tsx`:

**Krok 1:** Utwórz plik `components/providers/SWRProvider.tsx`:
```typescript
// components/providers/SWRProvider.tsx
'use client'

import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'

interface SWRProviderProps {
  children: ReactNode
}

/**
 * Globalny provider SWR dla całej aplikacji.
 * Musi owijać wszystkie Client Components które używają useSWR().
 * Konfiguracja: brak globalnego fetchera — każdy hook definiuje własny.
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Nie retry automatycznie — fetchBridge już robi retry 1x
        shouldRetryOnError: false,
        // Nie rewaliduj przy focusie — dashboard nie potrzebuje
        revalidateOnFocus: false,
        // Nie rewaliduj przy reconnect — polling wystarczy
        revalidateOnReconnect: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}
```

**Krok 2:** Zaktualizuj `app/layout.tsx` dodając SWRProvider:
```typescript
// app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SWRProvider } from '@/components/providers/SWRProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kira Dashboard',
  description: 'AI Pipeline Monitoring Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body className={inter.className}>
        <SWRProvider>
          {children}
        </SWRProvider>
      </body>
    </html>
  )
}
```

---

## ⚠️ Edge Cases

### EC-1: Bridge API wraca online po chwili offline
Scenariusz: Dashboard startuje gdy Bridge jest offline (`offline: true`). Po 30 sekundach Bridge wraca online.
Oczekiwane zachowanie: SWR automatycznie ponawia żądanie przy następnym ticku pollingu (co 30s). Hook zwraca zaktualizowane dane, `offline` zmienia się na `false`. Komponenty re-renderują się bez reload strony.
Komunikat dla użytkownika: Brak komunikatu — UI po prostu pokazuje dane (banner "offline" znika jeśli był wyświetlany).

### EC-2: Bridge API zwraca pustą tablicę stories
Scenariusz: `GET /api/status/pipeline` zwraca `{ "stats": { "total": 0, "done": 0, "in_progress": 0, "review": 0 }, "stories": [] }`.
Oczekiwane zachowanie: `usePipeline()` zwraca `stories: []` (pusta tablica, NIE null). `useStats()` zwraca `stats: { total: 0, done: 0, in_progress: 0, review: 0 }`. `offline: false`. Komponenty renderują empty state (puste tablice, nie errory).

### EC-3: Bridge API zwraca odpowiedź bez oczekiwanego pola
Scenariusz: `GET /api/status/pipeline` zwraca JSON bez pola `stats` (np. `{ "stories": [...] }`).
Oczekiwane zachowanie: `useStats()` zwraca `stats: null` (dzięki `data?.stats ?? null`). NIE crashuje. W konsoli NIE pojawia się błąd TypeScript runtime. `offline: false` (dane przyszły, tylko nie mają stats).

### EC-4: Dwa komponenty na tej samej stronie używają tego samego hooka
Scenariusz: Komponent `StatCards` i komponent `PipelineHeader` oba wywołują `useStats()`. SWR powinien deduplikować żądania.
Oczekiwane zachowanie: SWR wysyła JEDNO żądanie HTTP (nie dwa), cache jest współdzielony między komponentami. Oba komponenty re-renderują się jednocześnie gdy dane są dostępne.

### EC-5: Hook z `refreshInterval: 0` nie wysyła requestów po inicjalnym fetch
Scenariusz: `useStats({ refreshInterval: 0 })` — polling wyłączony.
Oczekiwane zachowanie: Hook pobiera dane JEDEN raz przy montowaniu. NIE ustawia żadnego timera. Dane są "zamrożone" do odmontowania i remontowania komponentu.

### EC-6: Komponent jest montowany i natychmiast odmontowywany przed odpowiedzią
Scenariusz: Szybka nawigacja — komponent montuje się, wysyła fetch, ale jest odmontowywany przed odpowiedzią.
Oczekiwane zachowanie: SWR anuluje oczekujące request lub ignoruje response po odmontowaniu. NIE pojawia się błąd "state update on unmounted component". Brak wycieków pamięci.

---

## 🚫 Out of Scope tej Story
- Budowanie żadnych komponentów UI (to STORY-1.3 do 1.7)
- Sidebar i nawigacja (to STORY-1.8)
- Hooki specyficzne dla projektu z `projectKey` (to STORY-1.8 — `ProjectContext` doda `projectKey` do URL)
- `usePatterns()` i `useHealth()` — te hooki są potrzebne w STORY-1.7 i zostaną dodane tam
- WebSocket lub Server-Sent Events (poza zakresem EPIC-1)
- Mutacje (POST/PUT/DELETE) do Bridge API — dashboard jest read-only

---

## ✔️ Definition of Done
- [ ] Istnieje katalog `hooks/` w root projektu
- [ ] Istnieje plik `hooks/useStats.ts` z exportem `useStats()`
- [ ] Istnieje plik `hooks/usePipeline.ts` z exportem `usePipeline()`
- [ ] Istnieje plik `hooks/useRuns.ts` z exportem `useRuns()`
- [ ] Istnieje plik `hooks/useEval.ts` z exportem `useEval()`
- [ ] Istnieje plik `hooks/useProjects.ts` z exportem `useProjects()`
- [ ] Istnieje plik `components/providers/SWRProvider.tsx` z exportem `SWRProvider`
- [ ] `app/layout.tsx` owijuje aplikację w `<SWRProvider>`
- [ ] Wszystkie hooki mają dyrektywę `'use client'` na początku pliku
- [ ] Żaden hook nie używa `any` — wszystko otypowane przez typy z `types/bridge.ts`
- [ ] Każdy hook przyjmuje `options?: { refreshInterval?: number }` z domyślną wartością 30000
- [ ] `useStats()` i `usePipeline()` używają IDENTYCZNEGO klucza SWR (`'/api/status/pipeline'`) — SWR deduplikuje
- [ ] `npm run build` przechodzi bez błędów TypeScript
- [ ] Ręczny test: zamontuj komponent z `useStats()` gdy Bridge offline — `offline: true`, brak crash
- [ ] Ręczny test: zamontuj komponent z `useStats()` gdy Bridge online — dane w `stats` po < 5s
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu nie ma miejsca (GET endpoints — brak inputu)
- [ ] Endpoint (hook) nie crashuje na pustej bazie (Bridge zwraca puste tablice)
- [ ] Wywołanie z Bridge offline zwraca `offline: true` i `null` data
- [ ] Story review przez PO
