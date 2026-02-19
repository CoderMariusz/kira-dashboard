---
story_id: STORY-2.4
title: "Developer wires useSSE hook + useStoryActions z optimistic updates"
epic: EPIC-2
module: dashboard
domain: wiring
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: none
api_reference: /api/events (SSE), /api/stories/[id]/start, /api/stories/[id]/advance
priority: must
estimated_effort: 8h
depends_on: STORY-2.1, STORY-2.2
blocks: STORY-2.5, STORY-2.7
tags: [sse, websocket-fallback, optimistic-ui, swr, hooks, typescript]
---

## 🎯 User Story

**Jako** developer implementujący frontend dashboardu Kira
**Chcę** mieć gotowe hooki `useSSE()` i `useStoryActions()` z pełną obsługą błędów, auto-reconnect i optimistic updates
**Żeby** komponenty UI mogły odbierać live eventy i wykonywać write operations bez duplikowania logiki warstwy transportowej

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Projekt: `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/`
Framework: Next.js 15+ (App Router), TypeScript strict mode, SWR 2.x

Nowe pliki do stworzenia:
- `src/types/sse.types.ts` — typy SSE eventów i payloadów
- `src/hooks/useSSE.ts` — hook zarządzający EventSource z auto-reconnect i fallback
- `src/hooks/useStoryActions.ts` — hook do operacji zapisu z optimistic UI

Istniejące pliki do modyfikacji:
- `src/hooks/usePipeline.ts` — istniejący hook z EPIC-14 do pollingu danych pipeline (używany jako fallback SSE)

### Powiązane pliki
- `src/hooks/usePipeline.ts` — hook z EPIC-14, zawiera SWR fetch do `GET /api/status` — używany jako fallback SSE
- `src/lib/api.ts` — klient HTTP z EPIC-14, eksportuje `apiFetch(path, options)` do wywołań Bridge API
- Backend endpoint SSE: `GET /api/events` — zwraca `text/event-stream` (zaimplementowany w STORY-2.1)
- Backend endpoint start: `POST /api/stories/[id]/start` — zwraca `{ok: true}` (STORY-2.2)
- Backend endpoint advance: `POST /api/stories/[id]/advance` — body `{status: string}`, zwraca `{ok: true}` (STORY-2.2)

### Stan systemu przed tą story
1. Next.js projekt istnieje w `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/`
2. SWR 2.x jest zainstalowany: `cat package.json | grep swr` powinno pokazać `"swr": "^2.x.x"`
3. `src/lib/api.ts` eksportuje `apiFetch` (z EPIC-14)
4. `src/hooks/usePipeline.ts` eksportuje hook `usePipeline()` zwracający `{data, isLoading, error}` przez SWR
5. Backend endpoint `GET /api/events` istnieje i zwraca SSE stream z eventami: `data: {"type":"story_advanced","payload":{...},"ts":1708348800000}`
6. Backend endpointy `POST /api/stories/[id]/start` i `POST /api/stories/[id]/advance` istnieją (STORY-2.2)

---

## ✅ Acceptance Criteria

### AC-1: Typy SSE eventów są zdefiniowane i wyeksportowane
GIVEN: Plik `src/types/sse.types.ts` nie istnieje
WHEN: Developer tworzy plik i importuje typy w hookach
THEN: TypeScript kompiluje bez błędów `tsc --noEmit`
AND: Typ `SSEEvent` ma pola `type`, `payload`, `ts` ze ścisłymi typami
AND: Typ `SSEEventType` to union `"story_advanced" | "eval_done" | "heartbeat"`
AND: Interfejsy payload są zdefiniowane osobno dla każdego typu eventu

### AC-2: useSSE tworzy EventSource i odbiera eventy
GIVEN: Komponent wywołuje `const { events, connected } = useSSE('/api/events')`
WHEN: Backend wysyła event `data: {"type":"story_advanced","payload":{"storyId":"STORY-1.3","newStatus":"REVIEW"},"ts":1708348800000}\n\n`
THEN: Po max 200ms hook aktualizuje stan: `events` zawiera nowy `SSEEvent`
AND: `connected` zmienia wartość na `true`
AND: Tablica `events` przechowuje max 100 ostatnich eventów (starsze są usuwane)
AND: Każdy event jest parsowany przez `JSON.parse` — niewalidne JSON jest ignorowane bez crashu

### AC-3: useSSE auto-reconnect po rozłączeniu
GIVEN: `useSSE('/api/events')` jest aktywny i `connected === true`
WHEN: Serwer zamyka połączenie (np. EventSource.onerror jest wywołany)
THEN: Hook inkrementuje wewnętrzny licznik `reconnectAttempts` o 1
AND: Po 3000ms (3 sekundach) hook tworzy nowy `EventSource('/api/events')`
AND: Jeśli `reconnectAttempts < 10`, próba reconnect jest ponawiana po każdym kolejnym błędzie
AND: Jeśli `reconnectAttempts >= 10`, hook ustawia `error: "Max reconnect attempts reached (10/10)"` i zatrzymuje próby
AND: `connected` ustawia się na `false` natychmiast po błędzie, `true` po pomyślnym reconnect

### AC-4: useSSE fallback na polling po 3 kolejnych błędach
GIVEN: `useSSE('/api/events')` ma `reconnectAttempts === 3` (3 błędy pod rząd bez sukcesu)
WHEN: Czwarty błąd EventSource.onerror jest wywołany
THEN: Hook wywołuje wewnętrznie `startPollingFallback()` — uruchamia `setInterval` co 30000ms (30 sekund)
AND: Każde tknięcie interwału wywołuje SWR `mutate(PIPELINE_SWR_KEY)` aby wymusić refetch danych pipeline
AND: `error` jest ustawione na `"SSE niedostępne — tryb polling (co 30s)"`
AND: `connected` pozostaje `false` podczas trybu polling
AND: Fallback interwał jest czyszczony (`clearInterval`) przy unmount komponentu

### AC-5: useSSE cleanup przy unmount
GIVEN: Komponent z `useSSE('/api/events')` jest zamontowany i `connected === true`
WHEN: Komponent jest odmontowywany (np. nawigacja do innej strony)
THEN: `EventSource.close()` jest wywołana natychmiast
AND: Jeśli fallback polling był aktywny, `clearInterval` jest wywołana
AND: Żadne dodatkowe wywołania setState nie są wykonywane po unmount (brak "Can't perform a React state update on an unmounted component")

### AC-6: useStoryActions.startStory wykonuje optimistic update
GIVEN: SWR cache dla klucza `/api/status` zawiera story `{id: "STORY-1.3", status: "READY"}`
AND: Użytkownik klika "Start Story"
WHEN: `const { startStory } = useStoryActions()` i `await startStory("STORY-1.3")` jest wywołane
THEN: **Przed** fetch HTTP — SWR `mutate('/api/status', updater, false)` aktualizuje cache: status "STORY-1.3" zmienia się na "IN_PROGRESS"
AND: `loading` jest ustawione na `true`
AND: Fetch `POST /api/stories/STORY-1.3/start` jest wysyłany z headerem `Content-Type: application/json`
AND: Po otrzymaniu `{ok: true}` — `loading` ustawia się na `false`, `error` na `null`
AND: SWR `mutate('/api/status')` (bez danych) jest wywołana aby potwierdzić stan z serwera

### AC-7: useStoryActions rollback przy błędzie HTTP
GIVEN: `startStory("STORY-1.3")` zostało wywołane i optimistic update zmienił status na "IN_PROGRESS"
WHEN: Serwer zwraca HTTP 422 lub 500
THEN: SWR `revalidate('/api/status')` jest wywołana (bez danych optymistycznych — wymusza fresh fetch)
AND: `error` jest ustawione na string z opisem błędu np. `"Nie można wystartować story: HTTP 422"`
AND: `loading` wraca do `false`
AND: UI wraca do stanu sprzed kliknięcia (status "READY" jest przywrócony po revalidation)

### AC-8: useStoryActions.advanceStory działa poprawnie
GIVEN: `const { advanceStory } = useStoryActions()` jest wywołane w komponencie
WHEN: `await advanceStory("STORY-1.3", "REVIEW")` jest wywołane
THEN: **Przed** fetch — SWR mutate aktualizuje status "STORY-1.3" na "REVIEW" w cache
AND: Fetch `POST /api/stories/STORY-1.3/advance` jest wysyłany z body `{"status": "REVIEW"}`
AND: Header `Content-Type: application/json` jest ustawiony
AND: Po sukcesie `loading === false` i `error === null`
AND: Po błędzie — rollback i `error` zawiera czytelny komunikat

---

## 🔌 Szczegóły Wiring

### Typy współdzielone

Plik: `src/types/sse.types.ts`

```typescript
// Dozwolone typy eventów SSE
export type SSEEventType = "story_advanced" | "eval_done" | "heartbeat"

// Bazowy interfejs eventu SSE
export interface SSEEvent {
  type: SSEEventType
  payload: unknown  // Zagnieżdżony interfejs per typ — patrz niżej
  ts: number        // Unix timestamp w milisekundach, np. Date.now()
}

// Payload dla eventu story_advanced
export interface StoryAdvancedPayload {
  storyId: string       // np. "STORY-1.3"
  previousStatus: string // np. "IN_PROGRESS"
  newStatus: string      // np. "REVIEW"
  model: string          // np. "sonnet-4.6"
}

// Payload dla eventu eval_done
export interface EvalDonePayload {
  runId: string        // UUID runu eval
  passRate: number     // 0.0–1.0, np. 0.87
  totalCases: number   // liczba przypadków testowych, np. 54
  passedCases: number  // liczba przypadków zaliczonych, np. 47
  duration: number     // czas wykonania w sekundach
}

// Payload dla heartbeat — brak danych
export interface HeartbeatPayload {
  ts: number           // echo timestampa z serwera
}

// Zwracany przez useSSE
export interface UseSSEReturn {
  events: SSEEvent[]       // ostatnie max 100 eventów, najnowszy na początku
  connected: boolean       // czy EventSource jest aktualnie połączony
  error: string | null     // opis błędu lub null
  reconnectAttempts: number // aktualna liczba prób (0–10)
}

// Zwracany przez useStoryActions
export interface UseStoryActionsReturn {
  startStory: (id: string) => Promise<void>
  advanceStory: (id: string, status: string) => Promise<void>
  loading: boolean
  error: string | null
}
```

### Hook useSSE — pełna implementacja

Plik: `src/hooks/useSSE.ts`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react'
import { mutate } from 'swr'
import type { SSEEvent, UseSSEReturn } from '@/types/sse.types'

// Klucz SWR używany przez usePipeline do pollingu — musi pasować dokładnie
const PIPELINE_SWR_KEY = '/api/status'

// Maksymalna liczba przechowywanych eventów w stanie
const MAX_EVENTS = 100

// Delay przed próbą reconnect (ms)
const RECONNECT_DELAY_MS = 3000

// Maksymalna liczba prób reconnect przed fallbackiem na polling
const MAX_RECONNECT_ATTEMPTS = 10

// Interwał pollingu fallback (ms)
const POLLING_INTERVAL_MS = 30_000

// Próg błędów SSE przed przełączeniem na polling
const FALLBACK_ERROR_THRESHOLD = 3

export function useSSE(url: string): UseSSEReturn {
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Refy do przechowywania mutowalnych wartości między renderami
  const esRef = useRef<EventSource | null>(null)           // aktywny EventSource
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)      // synchroniczna kopia reconnectAttempts
  const consecutiveErrorsRef = useRef(0)  // licznik kolejnych błędów bez sukcesu
  const isMountedRef = useRef(true)  // czy komponent jest zamontowany

  // Uruchom polling fallback
  const startPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return  // już działa
    pollingIntervalRef.current = setInterval(() => {
      mutate(PIPELINE_SWR_KEY)
    }, POLLING_INTERVAL_MS)
  }, [])

  // Zatrzymaj polling fallback
  const stopPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Główna funkcja tworząca EventSource
  const connectSSE = useCallback(() => {
    // Zamknij poprzedni EventSource jeśli istnieje
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return
      try {
        const parsed = JSON.parse(event.data) as SSEEvent
        // Zresetuj licznik błędów po sukcesie
        consecutiveErrorsRef.current = 0
        attemptsRef.current = 0

        setConnected(true)
        setError(null)
        setReconnectAttempts(0)
        setEvents(prev => [parsed, ...prev].slice(0, MAX_EVENTS))

        // Wymuś rewalidację SWR dla świeżych danych pipeline
        mutate(PIPELINE_SWR_KEY)
      } catch {
        // Niewalidny JSON — ignoruj cicho (nie crashuj)
        console.warn('[useSSE] Niewalidny JSON w evencie SSE:', event.data)
      }
    }

    es.onerror = () => {
      if (!isMountedRef.current) return

      setConnected(false)
      consecutiveErrorsRef.current += 1

      // Sprawdź czy przejść na polling
      if (consecutiveErrorsRef.current >= FALLBACK_ERROR_THRESHOLD) {
        setError('SSE niedostępne — tryb polling (co 30s)')
        startPollingFallback()
        // Kontynuuj próby reconnect jeśli poniżej limitu
      }

      if (attemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        attemptsRef.current += 1
        setReconnectAttempts(attemptsRef.current)
        setError(prev =>
          consecutiveErrorsRef.current >= FALLBACK_ERROR_THRESHOLD
            ? 'SSE niedostępne — tryb polling (co 30s)'
            : `Reconnecting... (${attemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`
        )

        // Zaplanuj reconnect po RECONNECT_DELAY_MS
        reconnectTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) connectSSE()
        }, RECONNECT_DELAY_MS)
      } else {
        setError(`Max reconnect attempts reached (${MAX_RECONNECT_ATTEMPTS}/${MAX_RECONNECT_ATTEMPTS})`)
      }
    }

    es.addEventListener('open', () => {
      if (!isMountedRef.current) return
      setConnected(true)
      consecutiveErrorsRef.current = 0
      stopPollingFallback()  // SSE działa — wyłącz polling
    })
  }, [url, startPollingFallback, stopPollingFallback])

  useEffect(() => {
    isMountedRef.current = true
    connectSSE()

    return () => {
      // Cleanup przy unmount
      isMountedRef.current = false

      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      stopPollingFallback()
    }
  }, [connectSSE, stopPollingFallback])

  return { events, connected, error, reconnectAttempts }
}
```

### Hook useStoryActions — pełna implementacja

Plik: `src/hooks/useStoryActions.ts`

```typescript
import { useState, useCallback } from 'react'
import { mutate } from 'swr'
import { apiFetch } from '@/lib/api'
import type { UseStoryActionsReturn } from '@/types/sse.types'

// SWR klucze — muszą pasować do tych używanych w usePipeline
const PIPELINE_SWR_KEY = '/api/status'

export function useStoryActions(): UseStoryActionsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startStory = useCallback(async (id: string): Promise<void> => {
    setLoading(true)
    setError(null)

    // KROK 1: Optimistic update — zaktualizuj SWR cache natychmiast
    // false = nie rewaliduj z serwera (czekamy na fetch poniżej)
    await mutate(
      PIPELINE_SWR_KEY,
      (current: Record<string, unknown> | undefined) => {
        if (!current) return current
        // Struktura danych z /api/status: { stories: Story[] }
        const stories = (current.stories as Array<{id: string; status: string}>) ?? []
        return {
          ...current,
          stories: stories.map(s =>
            s.id === id ? { ...s, status: 'IN_PROGRESS' } : s
          ),
        }
      },
      false  // false = nie rewaliduj teraz — czekamy na wynik fetcha
    )

    try {
      // KROK 2: Wyślij request do serwera
      await apiFetch(`/api/stories/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // KROK 3: Sukces — rewaliduj SWR żeby potwierdzić stan z serwera
      await mutate(PIPELINE_SWR_KEY)
      setLoading(false)
    } catch (err: unknown) {
      // KROK 4: Błąd — rollback przez rewalidację (fetch świeżych danych)
      await mutate(PIPELINE_SWR_KEY)  // bez optymistycznych danych = rollback
      const message = err instanceof Error ? err.message : String(err)
      setError(`Nie można wystartować story: ${message}`)
      setLoading(false)
    }
  }, [])

  const advanceStory = useCallback(async (id: string, status: string): Promise<void> => {
    setLoading(true)
    setError(null)

    // KROK 1: Optimistic update
    await mutate(
      PIPELINE_SWR_KEY,
      (current: Record<string, unknown> | undefined) => {
        if (!current) return current
        const stories = (current.stories as Array<{id: string; status: string}>) ?? []
        return {
          ...current,
          stories: stories.map(s =>
            s.id === id ? { ...s, status } : s
          ),
        }
      },
      false
    )

    try {
      // KROK 2: Wyślij request
      await apiFetch(`/api/stories/${id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      // KROK 3: Potwierdź z serwera
      await mutate(PIPELINE_SWR_KEY)
      setLoading(false)
    } catch (err: unknown) {
      // KROK 4: Rollback
      await mutate(PIPELINE_SWR_KEY)
      const message = err instanceof Error ? err.message : String(err)
      setError(`Nie można przesunąć story do ${status}: ${message}`)
      setLoading(false)
    }
  }, [])

  return { startStory, advanceStory, loading, error }
}
```

### Obsługa błędów na styku

Plik: `src/lib/api.ts` (modyfikacja istniejącego pliku)

```typescript
// Dodaj do istniejącego api.ts:

export const SSE_ERROR_MESSAGES: Record<number, string> = {
  401: 'Twoja sesja wygasła — zaloguj się ponownie',
  403: 'Nie masz uprawnień do tej operacji',
  404: 'Story nie została znaleziona',
  409: 'Story jest już w tym statusie',
  422: 'Nieprawidłowa zmiana stanu story — sprawdź aktualny status',
  500: 'Błąd serwera — spróbuj ponownie za chwilę',
}

// Upewnij się że apiFetch rzuca Error z czytelnym message:
// throw new Error(`HTTP ${response.status}: ${SSE_ERROR_MESSAGES[response.status] ?? 'Nieznany błąd'}`)
```

### Optimistic UI — podsumowanie strategii

| Operacja | Przed fetch | Po sukcesie | Po błędzie |
|----------|-------------|-------------|------------|
| `startStory(id)` | `mutate(key, optimisticData, false)` — status → IN_PROGRESS | `mutate(key)` — fresh fetch | `mutate(key)` — rollback przez rewalidację |
| `advanceStory(id, status)` | `mutate(key, optimisticData, false)` — status → {status} | `mutate(key)` — fresh fetch | `mutate(key)` — rollback przez rewalidację |

---

## ⚠️ Edge Cases

### EC-1: EventSource nie istnieje w środowisku (SSR)
Scenariusz: Next.js renderuje komponent serwerowo, gdzie `window.EventSource` nie istnieje
Oczekiwane zachowanie: Hook sprawdza `typeof EventSource === 'undefined'` w useEffect — jeśli true, ustawia `error: "SSE niedostępne w tym środowisku"` i natychmiast uruchamia polling fallback
Komunikat dla użytkownika: Brak widocznego komunikatu — UI działa przez polling niewidoczny dla użytkownika

### EC-2: URL zmieniła się podczas gdy hook jest aktywny
Scenariusz: Prop `url` zmienia się z `/api/events?project=kira` na `/api/events?project=gym-tracker`
Oczekiwane zachowanie: `useEffect` reaguje na zmianę `url` w deps array — zamyka poprzedni EventSource, resetuje `attemptsRef.current = 0` i `consecutiveErrorsRef.current = 0`, tworzy nowy EventSource dla nowego URL
Komunikat dla użytkownika: Brak — reconnect jest transparentny

### EC-3: Serwer wysyła niewalidny JSON w evencie SSE
Scenariusz: Backend wysyła `data: not-valid-json\n\n`
Oczekiwane zachowanie: `JSON.parse` rzuca SyntaxError, catch blok loguje `console.warn('[useSSE] Niewalidny JSON w evencie SSE: not-valid-json')` i kontynuuje — nie updatuje stanu, nie rozłącza
Komunikat dla użytkownika: Brak

### EC-4: `startStory` wywołana dwukrotnie szybko (double click)
Scenariusz: Użytkownik klika "Start Story" dwukrotnie zanim `loading` się zaktualizuje
Oczekiwane zachowanie: `loading === true` po pierwszym kliknięciu — komponent renderuje button jako `disabled` gdy `loading === true` — drugie kliknięcie jest ignorowane przez disabled state
Komunikat dla użytkownika: Przycisk jest nieaktywny (disabled, opacity 50%) podczas `loading`

### EC-5: SWR cache jest pusty (pierwsze ładowanie)
Scenariusz: `mutate(PIPELINE_SWR_KEY, updater, false)` — `current` w updater jest `undefined`
Oczekiwane zachowanie: Updater sprawdza `if (!current) return current` — zwraca `undefined`, mutate nie aktualizuje cache, fetch wysyłany normalnie, po sukcesie `mutate(key)` ładuje dane od nowa
Komunikat dla użytkownika: Loading state widoczny przez chwilę

### EC-6: Sieć jest dostępna ale Bridge API (port 8199) jest niedostępne
Scenariusz: Next.js backend `/api/events` jest dostępny, ale Bridge API jest niedostępne — backend zwraca 503
Oczekiwane zachowanie: EventSource.onerror jest wywołany (backend zamknął połączenie), licznik błędów inkrementuje, po 3 błędach fallback na polling, `/api/status` podczas pollingu też może zwracać błąd — polling kontynuuje, next tick może zadziałać gdy Bridge wróci
Komunikat dla użytkownika: `error: "SSE niedostępne — tryb polling (co 30s)"`

---

## 🚫 Out of Scope tej Story
- Implementacja backendowych endpointów SSE i write operations (STORY-2.1, STORY-2.2)
- Wyświetlanie toastów na evencie SSE (STORY-2.5)
- Komponenty UI używające tych hooków (STORY-2.5, STORY-2.6, STORY-2.7)
- WebSocket lub innych protokołów real-time poza SSE
- Autoryzacja/autentykacja w hookach — zakładamy że Next.js middleware obsługuje auth (EPIC-16)
- Persystencja eventów SSE (localStorage, sessionStorage)

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] TypeScript kompiluje bez błędów (`tsc --noEmit`)
- [ ] Brak `any` w plikach `useSSE.ts`, `useStoryActions.ts`, `sse.types.ts`
- [ ] Wszystkie typy wyeksportowane z `src/types/sse.types.ts`
- [ ] `useSSE` zamyka EventSource przy unmount (brak memory leaks)
- [ ] `useSSE` czyści timery reconnect i polling interval przy unmount
- [ ] Test manualny: SSE odbiera event — `events` tablica aktualizuje się w UI
- [ ] Test manualny: rozłącz sieć — po 3s hook próbuje reconnect (widoczne w `reconnectAttempts`)
- [ ] Test manualny: wymuś 3 błędy SSE — polling fallback uruchamia się (`error` zmienia się na "SSE niedostępne...")
- [ ] Test manualny: `startStory("STORY-X.Y")` — status zmienia się w UI natychmiast (optimistic), po ~200ms potwierdzony
- [ ] Test manualny: zasymuluj błąd 422 z serwera — UI wraca do poprzedniego statusu (rollback)
- [ ] Serwis obsługuje wszystkie kody błędów: 401, 403, 404, 409, 422, 500
- [ ] Story review przez PO
