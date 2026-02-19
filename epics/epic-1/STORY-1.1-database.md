---
story_id: STORY-1.1
title: "Developer inicjalizuje projekt Next.js 16 z klientem HTTP do Bridge API"
epic: EPIC-1
module: dashboard
domain: database
status: ready
difficulty: moderate
recommended_model: codex-5.3
ux_reference: n/a
api_reference: n/a
priority: must
estimated_effort: 6h
depends_on: none
blocks: STORY-1.2, STORY-1.8
tags: [setup, nextjs, tailwind, shadcn, bridge-client, typescript, config]
---

## 🎯 User Story

**Jako** Mariusz (admin i jedyny użytkownik dashboardu)
**Chcę** mieć gotowy projekt Next.js 16 z skonfigurowanym klientem HTTP do Bridge API
**Żeby** wszystkie kolejne stories mogły importować `fetchBridge()` i typy TypeScript bez konieczności konfiguracji infrastruktury

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Projekt Next.js tworzony w katalogu:
```
/Users/mariuszkrawczyk/codermariusz/kira-dashboard/
```
Nie ma tu żadnego istniejącego projektu Next.js — katalog może zawierać tylko plik `epics/`. Projekt tworzony od zera przez `create-next-app`.

### Stan systemu przed tą story
- Katalog `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/` istnieje lub nie istnieje — oba scenariusze są akceptowalne
- Bridge API działa na `http://localhost:8199` (lub może być offline)
- Node.js ≥ 20 zainstalowany (`node --version` zwraca v20+)
- npm ≥ 10 zainstalowany
- Żadne pliki projektu Next.js NIE istnieją w tym katalogu

### Powiązane pliki (do stworzenia przez tę story)
```
kira-dashboard/
├── app/
│   ├── layout.tsx             ← root layout z fontami i globalnymi stylami
│   ├── page.tsx               ← tymczasowy placeholder "Dashboard loading..."
│   └── globals.css            ← Tailwind CSS 4 directives
├── lib/
│   └── bridge.ts              ← klient HTTP: fetchBridge(), isBridgeOnline()
├── types/
│   └── bridge.ts              ← centralne typy TypeScript dla Bridge API
├── components/
│   └── ui/                    ← shadcn/ui komponenty (auto-generowane)
├── next.config.ts             ← konfiguracja z BRIDGE_URL
├── .env.local.example         ← przykład zmiennych środowiskowych
├── .env.local                 ← NIE commitować! (w .gitignore)
├── tailwind.config.ts         ← konfiguracja Tailwind CSS 4
├── tsconfig.json              ← TypeScript strict mode
└── package.json               ← Next.js 16, shadcn/ui, tailwind
```

---

## ✅ Acceptance Criteria

### AC-1: Projekt uruchamia się bez błędów
GIVEN: Katalog `kira-dashboard/` zawiera skonfigurowany projekt (po wykonaniu wszystkich kroków tej story)
WHEN: Developer uruchamia komendę `npm run dev` w katalogu `kira-dashboard/`
THEN: Serwer Next.js startuje na `http://localhost:3000` bez żadnych błędów w konsoli
AND: Przeglądarka po wejściu na `http://localhost:3000` wyświetla tekst "Dashboard loading..." (tymczasowy placeholder)
AND: Nie ma żadnych błędów TypeScript (`npm run build` przechodzi bez błędów)

### AC-2: TypeScript strict mode jest aktywny
GIVEN: Plik `tsconfig.json` istnieje w katalogu projektu
WHEN: Developer sprawdza konfigurację TypeScript w `tsconfig.json`
THEN: Pole `compilerOptions.strict` ma wartość `true`
AND: Pole `compilerOptions.noImplicitAny` ma wartość `true` (lub wynika z `strict: true`)
AND: Pole `compilerOptions.strictNullChecks` ma wartość `true` (lub wynika z `strict: true`)
AND: Pole `compilerOptions.noUncheckedIndexedAccess` ma wartość `true`
AND: Uruchomienie `npx tsc --noEmit` w katalogu projektu kończy się kodem wyjścia `0` (brak błędów)

### AC-3: Bridge client zwraca dane gdy Bridge API jest online
GIVEN: Bridge API jest uruchomione i nasłuchuje na `http://localhost:8199`
AND: Endpoint `GET http://localhost:8199/api/projects` zwraca poprawny JSON
WHEN: Kod wywołuje `fetchBridge('/api/projects')` z pliku `lib/bridge.ts`
THEN: Funkcja zwraca sparsowany obiekt JSON (nie string, nie null)
AND: Funkcja NIE rzuca wyjątku
AND: W konsoli NIE pojawia się żaden błąd ani warning

### AC-4: Bridge client NIE crashuje gdy Bridge API jest offline
GIVEN: Bridge API NIE jest uruchomione (port 8199 nie odpowiada)
WHEN: Kod wywołuje `fetchBridge('/api/projects')` z pliku `lib/bridge.ts`
THEN: Funkcja zwraca `null` (nie rzuca wyjątku, nie crashuje procesu)
AND: W konsoli pojawia się dokładnie jeden komunikat: `[Bridge] offline: /api/projects`
AND: Aplikacja Next.js nie wyświetla "500 Internal Server Error" ani białego ekranu

### AC-5: Bridge client stosuje timeout 5 sekund i retry 1x
GIVEN: Bridge API odpowiada z opóźnieniem > 5 sekund (lub w ogóle nie odpowiada)
WHEN: Kod wywołuje `fetchBridge('/api/projects')`
THEN: Pierwsze żądanie jest przerywane po dokładnie 5000ms (`AbortController` z `setTimeout(5000)`)
AND: Automatycznie wysyłane jest drugie żądanie (retry 1x) po pierwszym timeout
AND: Drugie żądanie również ma timeout 5000ms
AND: Jeśli oba żądania się nie powiodą — funkcja zwraca `null`
AND: Całkowity czas oczekiwania nie przekracza ~10 sekund (2 × 5s)

### AC-6: BRIDGE_URL jest konfigurowalny przez zmienną środowiskową
GIVEN: Plik `.env.local` zawiera linię `BRIDGE_URL=http://localhost:9999`
WHEN: Kod wywołuje `fetchBridge('/api/projects')`
THEN: Żądanie HTTP wysyłane jest na `http://localhost:9999/api/projects` (nie na `localhost:8199`)
AND: Zmienna `BRIDGE_URL` jest odczytywana z `process.env.BRIDGE_URL` w `next.config.ts`
AND: Jeśli `BRIDGE_URL` nie jest ustawiona, używany jest domyślny fallback `http://localhost:8199`

### AC-7: Plik .env.local.example istnieje i jest poprawny
GIVEN: Developer klonuje repozytorium na nowej maszynie
WHEN: Sprawdza katalog główny projektu
THEN: Istnieje plik `.env.local.example` z następującą dokładną zawartością:
```
# Bridge API URL — lokalny adres Bridge daemon
# Zmień jeśli Bridge działa na innym porcie
BRIDGE_URL=http://localhost:8199
```
AND: Plik `.env.local` (z rzeczywistymi wartościami) NIE jest commitowany do gita
AND: `.gitignore` zawiera linię `.env.local`

### AC-8: shadcn/ui jest poprawnie zainicjalizowane
GIVEN: Projekt Next.js jest skonfigurowany z shadcn/ui
WHEN: Developer uruchamia `npx shadcn@latest add button` w katalogu projektu
THEN: Komenda kończy się sukcesem (exit code 0)
AND: Pojawia się plik `components/ui/button.tsx`
AND: Komponent `Button` można zaimportować w dowolnym pliku jako `import { Button } from '@/components/ui/button'`

---

## 🗄️ Szczegóły Infrastruktury Projektu

### Krok 1: Inicjalizacja projektu Next.js 16

Uruchom poniższą komendę w katalogu nadrzędnym (`/Users/mariuszkrawczyk/codermariusz/`):

```bash
npx create-next-app@16 kira-dashboard \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --no-turbopack
```

**Uwaga:** `--src-dir=false` = katalogi `app/`, `lib/`, `types/` są bezpośrednio w root projektu, NIE w `src/`. Jeśli `create-next-app@16` nie istnieje, użyj `create-next-app@latest`.

Po wykonaniu komendy sprawdź, że `package.json` zawiera `"next": "^16.x.x"` lub `"next": "^15.x.x"` (w zależności co jest dostępne jako latest).

### Krok 2: Konfiguracja TypeScript strict mode

Otwórz wygenerowany `tsconfig.json` i upewnij się, że `compilerOptions` zawiera DOKŁADNIE te pola (dodaj brakujące):

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["dom", "dom.iterable", "esnext"],
    "target": "ES2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Krok 3: Inicjalizacja shadcn/ui

```bash
cd kira-dashboard
npx shadcn@latest init
```

Podczas interaktywnego promptu wybierz:
- Style: `Default`
- Base color: `Slate`
- CSS variables: `Yes`

Komenda wygeneruje/zmodyfikuje: `components.json`, `app/globals.css`, `tailwind.config.ts`, `lib/utils.ts`.

### Krok 4: Instalacja dodatkowych pakietów

```bash
npm install swr
npm install --save-dev @types/node
```

**Dlaczego SWR?** Będzie używany w STORY-1.2 do hooków z pollingiem. Instalujemy już tutaj żeby nie blokować STORY-1.2.

### Krok 5: Plik `next.config.ts`

Utwórz (lub zastąp istniejący) plik `next.config.ts` w root projektu:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  env: {
    // BRIDGE_URL jest dostępny po stronie serwera (Server Components, Route Handlers)
    // Po stronie klienta używaj NEXT_PUBLIC_BRIDGE_URL jeśli potrzebujesz
    BRIDGE_URL: process.env.BRIDGE_URL ?? 'http://localhost:8199',
  },
  // Wyłącz strict mode React w dev (żeby uniknąć podwójnego polowania w development)
  // reactStrictMode: false, // odkomentuj tylko jeśli podwójny render powoduje problemy
}

export default nextConfig
```

### Krok 6: Plik `.env.local.example`

Utwórz plik `.env.local.example` w root projektu:

```
# Bridge API URL — lokalny adres Bridge daemon
# Zmień jeśli Bridge działa na innym porcie
BRIDGE_URL=http://localhost:8199
```

Utwórz plik `.env.local` (lokalny, nie commitowany):
```
BRIDGE_URL=http://localhost:8199
```

Sprawdź że `.gitignore` zawiera linię `.env.local`. Jeśli nie — dodaj ją.

### Krok 7: Plik `types/bridge.ts` — centralne typy TypeScript

Utwórz katalog `types/` w root projektu, a w nim plik `types/bridge.ts`:

```typescript
// types/bridge.ts
// Centralne typy TypeScript dla wszystkich odpowiedzi Bridge API.
// WAŻNE: Te typy muszą dokładnie odpowiadać strukturom zwracanym przez Bridge API.
// Jeśli Bridge zwróci inne pola, zaktualizuj TUTAJ, nie w hookach.

// ─── Pipeline ──────────────────────────────────────────────────────────────

/** Zagregowane statystyki pipeline'u ze wszystkich projektów lub jednego projektu. */
export interface PipelineStats {
  /** Łączna liczba wszystkich stories (wszystkich statusów). */
  total: number
  /** Liczba stories ze statusem DONE. */
  done: number
  /** Liczba stories ze statusem IN_PROGRESS. */
  in_progress: number
  /** Liczba stories ze statusem REVIEW. */
  review: number
}

/** Status story w pipeline — dokładne stringi zwracane przez Bridge API. */
export type StoryStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'BLOCKED'

/** Domena story — dokładne stringi zwracane przez Bridge API. */
export type StoryDomain = 'database' | 'auth' | 'backend' | 'wiring' | 'frontend'

/** Trudność story — dokładne stringi zwracane przez Bridge API. */
export type StoryDifficulty = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert'

/** Jedna story w pipeline. Zwracana przez GET /api/status/pipeline w tablicy stories[]. */
export interface Story {
  /** Unikalny identyfikator story, np. "STORY-1.2". */
  id: string
  /** Pełny tytuł story, np. "Bridge API data layer — hooks i typy". */
  title: string
  /** Identyfikator epica, np. "EPIC-1". */
  epic: string
  /** Aktualny status story. */
  status: StoryStatus
  /** Domena techniczna story. */
  domain: StoryDomain
  /** Poziom trudności story. */
  difficulty: StoryDifficulty
  /** Alias modelu AI przypisanego do story, np. "codex", "kimi", "sonnet". Może być null. */
  assigned_model: string | null
  /** ISO 8601 timestamp kiedy story zaczęła się (IN_PROGRESS). Może być null. */
  started_at: string | null
  /** ISO 8601 timestamp ostatniej aktualizacji. */
  updated_at: string
}

/** Odpowiedź z GET /api/status/pipeline. */
export interface PipelineResponse {
  /** Zagregowane statystyki. */
  stats: PipelineStats
  /** Lista wszystkich aktywnych i ostatnio ukończonych stories. */
  stories: Story[]
}

// ─── Runs ──────────────────────────────────────────────────────────────────

/** Status jednotego runu (uruchomienia modelu AI). */
export type RunStatus = 'success' | 'failure' | 'in_progress'

/** Jeden run modelu AI. Zwracany przez GET /api/status/runs w tablicy runs[]. */
export interface Run {
  /** Unikalny identyfikator runu (UUID lub integer jako string). */
  id: string
  /** Identyfikator story do której należy ten run, np. "STORY-1.2". */
  story_id: string
  /** Tytuł story (denormalizowany dla łatwości wyświetlania). */
  story_title: string
  /** Alias modelu AI który wykonał run, np. "codex", "kimi", "sonnet", "haiku". */
  model: string
  /** Status runu. */
  status: RunStatus
  /** Czas trwania runu w sekundach. Null jeśli run jest in_progress lub nie zakończony. */
  duration_seconds: number | null
  /** Szacunkowy koszt runu w USD. Null jeśli nieznany. */
  cost_estimate: number | null
  /** ISO 8601 timestamp startu runu. */
  started_at: string
  /** ISO 8601 timestamp końca runu. Null jeśli run jest in_progress. */
  finished_at: string | null
  /** Komunikat błędu jeśli status === 'failure'. Null w przeciwnym razie. */
  error: string | null
}

/** Odpowiedź z GET /api/status/runs. */
export interface RunsResponse {
  /** Lista ostatnich runów (max 20, posortowane od najnowszego). */
  runs: Run[]
}

// ─── Eval ──────────────────────────────────────────────────────────────────

/** Wynik eval dla jednej kategorii. Zwracany przez GET /api/eval/overview w tablicy scores[]. */
export interface EvalScore {
  /** Nazwa kategorii, np. "code_quality", "test_coverage", "type_safety". */
  category: string
  /** Wynik jako liczba od 0.0 do 1.0 (gdzie 1.0 = 100%). */
  score: number
  /** Wskaźnik zdanych testów jako liczba od 0.0 do 1.0. */
  pass_rate: number
  /** Łączna liczba testów w tej kategorii. */
  total_tests: number
  /** Liczba zdanych testów w tej kategorii. */
  passed_tests: number
}

/** Odpowiedź z GET /api/eval/overview. */
export interface EvalOverviewResponse {
  /** Lista wyników per kategoria. */
  scores: EvalScore[]
  /** ISO 8601 timestamp ostatniego uruchomienia eval. Null jeśli eval nie był uruchamiany. */
  last_run_at: string | null
  /** Łączny wynik (average score ze wszystkich kategorii). Liczba 0.0-1.0. */
  overall_score: number
}

// ─── Projects ──────────────────────────────────────────────────────────────

/** Jeden projekt zarządzany przez Kira. Zwracany przez GET /api/projects w tablicy projects[]. */
export interface Project {
  /** Unikalny klucz projektu, np. "kira", "gym-tracker". Używany w API path jako {key}. */
  key: string
  /** Pełna nazwa projektu do wyświetlenia, np. "Kira Pipeline", "Gym Tracker". */
  name: string
  /** Opcjonalny opis projektu. Null jeśli brak. */
  description: string | null
  /** Czy projekt jest aktywny (ma aktywne stories). */
  active: boolean
}

/** Odpowiedź z GET /api/projects. */
export interface ProjectsResponse {
  /** Lista wszystkich zarejestrowanych projektów. */
  projects: Project[]
}

// ─── Stan offline ──────────────────────────────────────────────────────────

/** Wspólny stan błędu/offline zwracany przez hooki gdy Bridge API niedostępne. */
export interface BridgeOfflineState {
  offline: true
  error: string
}
```

### Krok 8: Plik `lib/bridge.ts` — klient HTTP Bridge API

Utwórz katalog `lib/` w root projektu (jeśli nie istnieje — `shadcn init` mógł go już stworzyć), a w nim plik `lib/bridge.ts`:

```typescript
// lib/bridge.ts
// Klient HTTP do Bridge API.
// JEDYNE miejsce w projekcie które wie o Bridge API URL.
// Wszystkie hooki i server components importują stąd fetchBridge().

/** Bazowy URL Bridge API. Odczytywany ze zmiennej środowiskowej lub domyślny. */
const BRIDGE_URL: string =
  process.env.BRIDGE_URL ?? 'http://localhost:8199'

/** Timeout pojedynczego żądania HTTP w milisekundach. */
const REQUEST_TIMEOUT_MS = 5000

/** Liczba automatycznych ponowień po failed request (łącznie: 1 próba + 1 retry). */
const MAX_RETRIES = 1

/**
 * Pomocnicza funkcja — wykonuje pojedyncze żądanie fetch z timeoutem.
 * Rzuca błąd jeśli żądanie trwa dłużej niż REQUEST_TIMEOUT_MS.
 *
 * @param url - Pełny URL do wywołania
 * @returns Promise<Response>
 * @throws Error z komunikatem 'AbortError' jeśli timeout
 * @throws Error z komunikatem sieciowym jeśli fetch się nie powiódł
 */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Nie cachujemy — Bridge API zwraca live data
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    })
    return response
  } finally {
    // Zawsze czyścimy timeout żeby nie wyciekać pamięci
    clearTimeout(timeoutId)
  }
}

/**
 * Główna funkcja do wywołań Bridge API.
 * Obsługuje: timeout 5s, retry 1x, graceful degradation (null zamiast throw).
 *
 * Przykład użycia:
 *   const data = await fetchBridge<ProjectsResponse>('/api/projects')
 *   if (data === null) { // Bridge offline }
 *
 * @param path - Ścieżka API zaczynająca się od '/', np. '/api/projects'
 * @returns Sparsowany obiekt JSON lub null jeśli Bridge offline/timeout/error
 */
export async function fetchBridge<T>(path: string): Promise<T | null> {
  const url = `${BRIDGE_URL}${path}`
  let lastError: unknown = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url)

      if (!response.ok) {
        // HTTP error (4xx, 5xx) — nie retry, logujemy i zwracamy null
        console.error(`[Bridge] HTTP ${response.status} for ${path}`)
        return null
      }

      // Parsujemy JSON
      const data = await response.json() as T
      return data

    } catch (error) {
      lastError = error
      // Jeśli to nie ostatnia próba, logujemy i próbujemy ponownie
      if (attempt < MAX_RETRIES) {
        console.warn(`[Bridge] attempt ${attempt + 1} failed for ${path}, retrying...`)
        continue
      }
    }
  }

  // Wszystkie próby się nie powiodły — logujemy i zwracamy null (NIE rzucamy!)
  console.warn(`[Bridge] offline: ${path}`)
  if (lastError instanceof Error && lastError.name !== 'AbortError') {
    // Nie logujemy AbortError (to normalny timeout) — logujemy tylko nieoczekiwane błędy
    console.error(`[Bridge] last error:`, lastError.message)
  }
  return null
}

/**
 * Sprawdza czy Bridge API jest dostępne (ping endpoint /api/projects).
 * Zwraca true jeśli Bridge odpowiedział poprawnie, false w każdym innym przypadku.
 *
 * Przykład użycia:
 *   const online = await isBridgeOnline()
 *   if (!online) { showOfflineBanner() }
 */
export async function isBridgeOnline(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const response = await fetch(`${BRIDGE_URL}/api/projects`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Eksportujemy BRIDGE_URL żeby komponenty mogły go wyświetlić (np. w System Health).
 * Nie używaj tej wartości do bezpośrednich fetch — używaj fetchBridge().
 */
export { BRIDGE_URL }
```

### Krok 9: Tymczasowy placeholder `app/page.tsx`

Zastąp wygenerowany `app/page.tsx` minimalnym placeholderem:

```typescript
// app/page.tsx
// Tymczasowy placeholder — zostanie zastąpiony w STORY-1.3 (Overview page)

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-muted-foreground">Dashboard loading...</p>
    </main>
  )
}
```

### Krok 10: Weryfikacja — uruchom projekt

```bash
cd /Users/mariuszkrawczyk/codermariusz/kira-dashboard
npm run dev
```

Oczekiwane wyjście w terminalu:
```
▲ Next.js 16.x.x
- Local: http://localhost:3000
✓ Starting...
✓ Ready in Xs
```

Następnie sprawdź build (TypeScript kompilacja):
```bash
npm run build
```
Oczekiwane wyjście: `✓ Compiled successfully` bez żadnych TypeScript errors.

### Struktura katalogów po ukończeniu story

```
kira-dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx          ← "Dashboard loading..." placeholder
│   └── globals.css
├── components/
│   └── ui/               ← shadcn/ui komponenty (puste na start, dodawane przez `npx shadcn add`)
├── lib/
│   ├── bridge.ts         ← ← ← GŁÓWNY PLIK TEJ STORY
│   └── utils.ts          ← generowany przez shadcn init
├── types/
│   └── bridge.ts         ← ← ← GŁÓWNY PLIK TEJ STORY
├── .env.local            ← NIE commituj
├── .env.local.example    ← commituj
├── .gitignore            ← zawiera .env.local
├── components.json       ← shadcn konfiguracja
├── next.config.ts        ← BRIDGE_URL env config
├── package.json
├── tailwind.config.ts
└── tsconfig.json         ← strict mode enabled
```

---

## ⚠️ Edge Cases

### EC-1: Bridge API zwraca niepoprawny JSON
Scenariusz: Bridge API zwraca odpowiedź HTTP 200, ale body nie jest poprawnym JSONem (np. zwraca HTML error page).
Oczekiwane zachowanie: `fetchBridge()` łapie wyjątek z `response.json()`, loguje `[Bridge] offline: /ścieżka` i zwraca `null`. Aplikacja nie crashuje.
Komunikat dla użytkownika: Brak — to scenariusz serwer-do-serwer. Hook wyżej ustawi stan `offline`.

### EC-2: Zmieniona `BRIDGE_URL` w `.env.local` nie jest odczytywana w przeglądarce
Scenariusz: Developer próbuje użyć `BRIDGE_URL` w Client Component (zamiast Server Component lub Route Handler).
Oczekiwane zachowanie: Next.js udostępnia `process.env.BRIDGE_URL` TYLKO po stronie serwera. W Client Components `process.env.BRIDGE_URL` jest `undefined`. Hooki z STORY-1.2 są Server-side lub używają Route Handler — jeśli kiedykolwiek potrzebna jest wartość po stronie klienta, trzeba dodać `NEXT_PUBLIC_BRIDGE_URL` (z prefiksem `NEXT_PUBLIC_`).
Komunikat dla użytkownika: Brak (błąd konfiguracyjny — widoczny w konsoli jako `undefined`).

### EC-3: Port 8199 zajęty przez inny proces
Scenariusz: Na porcie 8199 działa inny proces niż Bridge API, który zwraca niepoprawne dane.
Oczekiwane zachowanie: `fetchBridge()` dostaje HTTP response (np. 200 z HTML), ale `response.json()` rzuca błąd. Funkcja zwraca `null`. W konsoli pojawia się `[Bridge] offline: /ścieżka`.
Komunikat dla użytkownika: Brak — hooki wyżej pokażą "offline" state.

### EC-4: Next.js dev server próbuje użyć portu 3000 gdy jest zajęty
Scenariusz: Port 3000 jest już zajęty przez inną aplikację.
Oczekiwane zachowanie: Next.js automatycznie przechodzi na kolejny wolny port (3001, 3002, ...) i wypisuje nowy URL w terminalu. Nie wymaga akcji — to standardowe zachowanie Next.js.
Komunikat dla użytkownika: W terminalu: `- Local: http://localhost:3001` (lub inny wolny port).

---

## 🚫 Out of Scope tej Story
- Implementacja żadnych UI komponentów (poza placeholderem)
- Tworzenie hooków React (to STORY-1.2)
- Konfiguracja sidebara lub nawigacji (to STORY-1.8)
- Konfiguracja WebSocket lub real-time (poza zakresem EPIC-1)
- Deploy na Vercel lub jakiekolwiek środowisko produkcyjne
- Autentykacja (dashboard jest lokalny, bez auth — per EPIC-1 out-of-scope)
- Chart.js lub inne biblioteki do wizualizacji (installowane w STORY-1.3)

---

## ✔️ Definition of Done
- [ ] Komenda `npm run dev` startuje bez błędów na `http://localhost:3000`
- [ ] Komenda `npm run build` kończy się bez TypeScript errors
- [ ] `tsconfig.json` ma `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`
- [ ] Plik `lib/bridge.ts` istnieje z `fetchBridge<T>()` i `isBridgeOnline()`
- [ ] Plik `types/bridge.ts` istnieje z typami: `PipelineStats`, `Story`, `Run`, `EvalScore`, `Project`, `PipelineStats`, `PipelineResponse`, `RunsResponse`, `EvalOverviewResponse`, `ProjectsResponse`
- [ ] `fetchBridge()` zwraca `null` (nie rzuca) gdy Bridge offline
- [ ] `fetchBridge()` stosuje timeout 5s i retry 1x
- [ ] Plik `next.config.ts` odczytuje `BRIDGE_URL` z env z fallbackiem na `http://localhost:8199`
- [ ] Plik `.env.local.example` istnieje z `BRIDGE_URL=http://localhost:8199`
- [ ] Plik `.env.local` jest w `.gitignore`
- [ ] shadcn/ui jest zainicjalizowane (`components.json` istnieje, `npx shadcn add button` działa)
- [ ] Pakiet `swr` jest zainstalowany (`package.json` zawiera `"swr"`)
- [ ] Story review przez PO
