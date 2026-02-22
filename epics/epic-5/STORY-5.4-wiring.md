---
story_id: STORY-5.4
title: "Typy TypeScript + hooki SWR dla modeli AI"
epic: EPIC-5
module: models
domain: wiring
status: draft
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 3h
depends_on: [STORY-5.1, STORY-5.2, STORY-5.3]
blocks: [STORY-5.5, STORY-5.6, STORY-5.7]
tags: [types, hooks, swr, typescript, localstorage, models, optimistic]
---

## 🎯 User Story

**Jako** komponent frontendowy (Models page, ModelCard, ModelDetailPanel)
**Chcę** mieć gotowe typy TypeScript i hooki SWR z obsługą błędów i polling
**Żeby** komponenty mogły wyświetlać dane modeli i metryki bez bezpośrednich wywołań fetch

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Pliki do stworzenia:
```
types/models.ts                 → wszystkie typy modułu models
hooks/useModels.ts              → hook SWR dla listy modeli
hooks/useModelMetrics.ts        → hook SWR dla time-series modelu
lib/model-monitoring.ts         → utility localStorage dla monitorowania
```

Stack:
- React 18+ (`useState`, `useCallback`)
- SWR (`swr`) — data fetching z polling i optimistic updates
- TypeScript (strict mode)
- `'use client'` — wszystkie hooki są client-side

### Powiązane pliki

- `app/api/models/route.ts` (STORY-5.1) — `GET /api/models` → `ModelEntry[]`
- `app/api/models/[alias]/route.ts` (STORY-5.2) — `PATCH /api/models/[alias]` → `ModelEntry`
- `app/api/models/[alias]/metrics/route.ts` (STORY-5.3) — `GET /api/models/[alias]/metrics?period=7d|30d` → `ModelMetricsResponse`
- `config/model-costs.ts` — `KNOWN_MODEL_KEYS` (może być przydatne w hookach)

### Stan systemu przed tą story

- STORY-5.1, 5.2, 5.3 ukończone — API endpoints działają
- SWR zainstalowany: `npm list swr` zwraca wersję ≥ 2.x
- `'use client'` działa w Next.js 16 App Router

---

## ✅ Acceptance Criteria

### AC-1: types/models.ts eksportuje wszystkie wymagane typy

GIVEN: plik `types/models.ts` istnieje
WHEN: dowolny komponent importuje z `@/types/models`
THEN: dostępne są eksporty:
  - `ModelEntry` (interface)
  - `ModelStats` (interface)
  - `ModelMetricPoint` (interface)
  - `ModelMetricsResponse` (interface)
  - `ModelCostUpdateDTO` (interface)
  - `ModelOverrideStore` (type alias)
AND: TypeScript kompiluje bez błędów gdy używa wszystkich tych typów

### AC-2: useModels() zwraca dane, isLoading, error i mutate

GIVEN: komponent używa `const { models, isLoading, error, mutate } = useModels()`
WHEN: `GET /api/models` zwraca `[ModelEntry, ModelEntry, ...]` z HTTP 200
THEN: `isLoading` jest `true` podczas oczekiwania na response
AND: po załadowaniu `isLoading` = `false` i `models` = tablica `ModelEntry[]`
AND: `error` = `undefined`
AND: `mutate` jest funkcją którą można wywołać żeby odświeżyć dane (nowy fetch)

WHEN: `GET /api/models` zwraca HTTP 500
THEN: `error` jest obiektem `Error` z `message` = `"Błąd serwera — spróbuj ponownie"`
AND: `models` = `[]`

### AC-3: useModels() automatycznie odświeża dane co 60 sekund

GIVEN: `useModels()` jest zamontowany
WHEN: upłynie 60 sekund bez aktywności użytkownika
THEN: hook automatycznie wysyła nowy `GET /api/models` (SWR `refreshInterval: 60000`)
AND: żadna dodatkowa akcja użytkownika nie jest wymagana

### AC-4: useModelMetrics(alias, period) nie fetchuje gdy alias === null

GIVEN: komponent wywołuje `useModelMetrics(null, '7d')`
WHEN: hook jest zamontowany
THEN: żaden request HTTP nie jest wysyłany
AND: `metrics` = `null`
AND: `isLoading` = `false`
AND: `error` = `undefined`

### AC-5: useModelMetrics(alias, period) fetuje dane dla alias !== null

GIVEN: `GET /api/models/kimi/metrics?period=7d` zwraca `ModelMetricsResponse` z 7 punktami
WHEN: komponent wywołuje `useModelMetrics('kimi', '7d')`
THEN: `metrics` = `{ alias: 'kimi', period: '7d', points: [/* 7 elementów */] }`
AND: `isLoading` = `false`, `error` = `undefined`

WHEN: komponent zmienia na `useModelMetrics('kimi', '30d')`
THEN: SWR wysyła nowy request `GET /api/models/kimi/metrics?period=30d`
AND: podczas oczekiwania `isLoading` = `true`

### AC-6: lib/model-monitoring.ts poprawnie persystuje stan w localStorage

GIVEN: localStorage jest pusty (brak klucza `kira_model_monitoring`)
WHEN: `isModelMonitored('kimi-k2.5')` jest wywołane
THEN: zwraca `true` (domyślnie wszystkie modele monitorowane)

WHEN: `setModelMonitoring('kimi-k2.5', false)` jest wywołane
THEN: localStorage ma klucz `kira_model_monitoring` z wartością `{"kimi-k2.5": false}`
AND: `isModelMonitored('kimi-k2.5')` zwraca `false`
AND: `isModelMonitored('sonnet-4.6')` zwraca `true` (inne modele niezmienione)

WHEN: strona jest przeładowana (nowa instancja JS)
THEN: `isModelMonitored('kimi-k2.5')` nadal zwraca `false` (stan z localStorage)

---

## 🔌 Szczegóły Wiring

### types/models.ts

```typescript
// types/models.ts
// Centralne typy TypeScript dla modułu models (EPIC-5).

/** Jedna pozycja statystyk modelu obliczona z runów Bridge. */
export interface ModelStats {
  /** Łączna liczba runów dla tego modelu. */
  total_runs: number
  /** Wskaźnik sukcesu: DONE / total. Zakres 0.0–1.0. */
  success_rate: number
  /** Średni czas trwania runu w sekundach. Null gdy brak runów z duration_ms. */
  avg_duration_s: number | null
  /** Łączny koszt w USD (z cost_usd z runów lub kalkulacji tokenów). */
  total_cost_usd: number
  /** ISO 8601 timestamp ostatniego runu. Null gdy brak runów. */
  last_run_at: string | null
}

/** Jeden model AI z konfiguracją i statystykami. Odpowiedź z GET /api/models. */
export interface ModelEntry {
  /** Krótki alias modelu, np. "kimi", "sonnet". */
  alias: string
  /** Kanoniczny klucz modelu, np. "kimi-k2.5", "sonnet-4.6". */
  canonical_key: string
  /** Pełna nazwa do wyświetlenia, np. "Kimi K2.5". */
  display_name: string
  /** Dostawca modelu, np. "Moonshot AI", "Anthropic". */
  provider: string
  /** Identyfikator modelu u dostawcy, np. "claude-sonnet-4-6". Null jeśli nieznany. */
  model_id: string | null
  /** Koszt input per 1M tokenów w USD. */
  cost_input_per_1m: number
  /** Koszt output per 1M tokenów w USD. */
  cost_output_per_1m: number
  /** Czy model jest aktywnie monitorowany. Domyślnie true. */
  monitoring_enabled: boolean
  /** Statystyki obliczone z runów. Null gdy Bridge offline. */
  stats: ModelStats | null
}

/** Jeden punkt w time-series per dzień. */
export interface ModelMetricPoint {
  /** Data w formacie "YYYY-MM-DD" (UTC). */
  date: string
  /** Suma kosztów w USD za ten dzień. */
  cost_usd: number
  /** Suma tokenów wejściowych za ten dzień. */
  tokens_in: number
  /** Suma tokenów wyjściowych za ten dzień. */
  tokens_out: number
  /** Liczba runów za ten dzień. */
  runs: number
}

/** Odpowiedź z GET /api/models/[alias]/metrics. */
export interface ModelMetricsResponse {
  alias: string
  period: '7d' | '30d'
  /** Tablica punktów posortowanych ASC po date, bez luk, długość = 7 lub 30. */
  points: ModelMetricPoint[]
}

/** Body do PATCH /api/models/[alias] — aktualizacja kosztów. */
export interface ModelCostUpdateDTO {
  /** Nowy koszt input per 1M tokenów. Opcjonalny. */
  cost_input_per_1m?: number
  /** Nowy koszt output per 1M tokenów. Opcjonalny. */
  cost_output_per_1m?: number
}

/** Kształt przechowywany w lib/model-overrides.ts. */
export type ModelOverrideStore = Map<string, { cost_input_per_1m: number; cost_output_per_1m: number }>
```

### hooks/useModels.ts

```typescript
'use client'
// hooks/useModels.ts
import useSWR, { KeyedMutator } from 'swr'
import { ModelEntry } from '@/types/models'

// Mapowanie kodów HTTP na komunikaty UI
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Nieprawidłowe żądanie',
  401: 'Brak dostępu — zaloguj się ponownie',
  403: 'Brak uprawnień',
  404: 'Nie znaleziono danych',
  500: 'Błąd serwera — spróbuj ponownie',
}

async function fetchModels(url: string): Promise<ModelEntry[]> {
  const res = await fetch(url)
  if (!res.ok) {
    const message = ERROR_MESSAGES[res.status] ?? `Błąd ${res.status}`
    throw new Error(message)
  }
  return res.json()
}

export interface UseModelsResult {
  models: ModelEntry[]
  isLoading: boolean
  error: Error | undefined
  mutate: KeyedMutator<ModelEntry[]>
}

export function useModels(): UseModelsResult {
  const { data, isLoading, error, mutate } = useSWR<ModelEntry[], Error>(
    '/api/models',
    fetchModels,
    {
      refreshInterval: 60000,      // 60s polling
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  )
  return {
    models: data ?? [],
    isLoading,
    error,
    mutate,
  }
}
```

### hooks/useModelMetrics.ts

```typescript
'use client'
// hooks/useModelMetrics.ts
import useSWR from 'swr'
import { ModelMetricsResponse } from '@/types/models'

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Nieprawidłowe żądanie',
  401: 'Brak dostępu — zaloguj się ponownie',
  403: 'Brak uprawnień',
  404: 'Nie znaleziono modelu',
  500: 'Błąd serwera — spróbuj ponownie',
}

async function fetchMetrics(url: string): Promise<ModelMetricsResponse> {
  const res = await fetch(url)
  if (!res.ok) {
    const message = ERROR_MESSAGES[res.status] ?? `Błąd ${res.status}`
    throw new Error(message)
  }
  return res.json()
}

export interface UseModelMetricsResult {
  metrics: ModelMetricsResponse | null
  isLoading: boolean
  error: Error | undefined
}

/**
 * @param alias - Krótki alias modelu, np. "kimi". Null = nie fetchuj.
 * @param period - "7d" lub "30d"
 */
export function useModelMetrics(
  alias: string | null,
  period: '7d' | '30d'
): UseModelMetricsResult {
  // SWR key = null gdy alias === null → SWR nie fetuje
  const key = alias !== null
    ? ['/api/models', alias, 'metrics', period]
    : null

  const url = key ? `/api/models/${alias}/metrics?period=${period}` : null

  const { data, isLoading, error } = useSWR<ModelMetricsResponse, Error>(
    key,    // klucz tablicowy — SWR dedupuje per (alias, period)
    url ? () => fetchMetrics(url) : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  return {
    metrics: data ?? null,
    isLoading: alias !== null ? isLoading : false,
    error,
  }
}
```

### lib/model-monitoring.ts

```typescript
// lib/model-monitoring.ts
// Utility dla zarządzania stanem monitorowania modeli w localStorage.
// Klucz localStorage: 'kira_model_monitoring'
// Format: Record<canonical_key, boolean> — np. { 'kimi-k2.5': false, 'glm-5': true }
// Domyślnie: brak klucza w obiekcie = true (monitorowany)

const STORAGE_KEY = 'kira_model_monitoring'

/**
 * Zwraca aktualny stan monitorowania wszystkich modeli.
 * Jeśli localStorage niedostępny (SSR) lub klucz nie istnieje → pusty obiekt.
 */
export function getMonitoringState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, boolean>
  } catch {
    return {}
  }
}

/**
 * Ustawia stan monitorowania dla jednego modelu.
 * @param alias - canonical_key modelu, np. 'kimi-k2.5'
 * @param enabled - true = monitoruj, false = wyłącz
 */
export function setModelMonitoring(alias: string, enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const state = getMonitoringState()
    state[alias] = enabled
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage pełny lub zablokowany — cicha degradacja
  }
}

/**
 * Sprawdza czy model jest monitorowany.
 * @param alias - canonical_key modelu, np. 'sonnet-4.6'
 * @returns true jeśli monitorowany (domyślnie true gdy brak wpisu)
 */
export function isModelMonitored(alias: string): boolean {
  const state = getMonitoringState()
  // Brak klucza = domyślnie monitorowany
  return state[alias] !== false
}
```

---

## ⚠️ Edge Cases

### EC-1: localStorage niedostępny (SSR lub private browsing)
- `typeof window === 'undefined'` → `getMonitoringState()` zwraca `{}`
- `setModelMonitoring()` — try/catch łapie `ReferenceError` — cicha degradacja
- `isModelMonitored()` zwraca `true` (domyślna wartość)

### EC-2: localStorage zawiera nieprawidłowy JSON (skorumpowany)
- `JSON.parse(raw)` rzuca `SyntaxError`
- try/catch zwraca `{}` — stan czysty, wszystkie modele domyślnie monitorowane

### EC-3: SWR key zmienia się gdy alias zmienia (useModelMetrics)
- Zmiana z `alias='kimi'` na `alias='sonnet'` → klucz SWR zmienia się
- SWR automatycznie wysyła nowy request dla nowego aliasu
- Stare dane dla `kimi` są zachowane w cache SWR
- Podczas loadingu nowych danych `metrics` jest `null` a `isLoading` = `true`

### EC-4: Sieć offline — fetch rzuca TypeError
- `fetchModels()` rzuca `TypeError: Failed to fetch`
- SWR przekazuje ten error do `error`
- `useModels()` zwraca `error: Error { message: 'Failed to fetch' }` i `models: []`
- Komponent wyświetla stan offline

---

## 🚫 Out of Scope tej Story

- Persystencja monitoring state po stronie serwera (tylko localStorage)
- Synchronizacja monitoring state między oknami przeglądarki (`storage` event)
- Hook `useModelOverrides()` — overrides zarządzane przez PATCH endpoint
- Server-side data fetching (React Server Components) — hooki są client-side
- Optimistic update przy PATCH kosztów — obsługiwany w STORY-5.6 przez `mutate()`

---

## ✔️ Definition of Done

- [ ] `types/models.ts` eksportuje: `ModelEntry`, `ModelStats`, `ModelMetricPoint`, `ModelMetricsResponse`, `ModelCostUpdateDTO`, `ModelOverrideStore`
- [ ] `useModels()` zwraca `{ models: ModelEntry[], isLoading, error, mutate }` z `refreshInterval: 60000`
- [ ] `useModels()` zwraca `models: []` i `error` gdy API zwraca błąd HTTP
- [ ] `useModelMetrics(null, '7d')` nie wysyła żadnego request HTTP
- [ ] `useModelMetrics('kimi', '7d')` fetuje `/api/models/kimi/metrics?period=7d`
- [ ] `useModelMetrics('kimi', '30d')` fetuje `/api/models/kimi/metrics?period=30d`
- [ ] `isModelMonitored()` zwraca `true` gdy brak klucza w localStorage
- [ ] `setModelMonitoring('kimi-k2.5', false)` persystuje do localStorage
- [ ] Po przeładowaniu strony: `isModelMonitored('kimi-k2.5')` zwraca `false`
- [ ] `getMonitoringState()` zwraca `{}` gdy localStorage niedostępny (SSR)
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów TypeScript
