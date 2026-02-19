---
story_id: STORY-2.5
title: "Developer instaluje Sonner i wdraża globalny system toast notifications"
epic: EPIC-2
module: dashboard
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: none
api_reference: none (UI-only, konsumuje eventy z useSSE)
priority: must
estimated_effort: 4h
depends_on: STORY-2.4
blocks: STORY-2.6, STORY-2.7, STORY-2.8
tags: [sonner, toast, notifications, sse-integration, dark-theme, typescript]
---

## 🎯 User Story

**Jako** Mariusz (Admin) korzystający z dashboardu Kira
**Chcę** widzieć powiadomienia toast w prawym dolnym rogu ekranu gdy zmieniają się stany stories lub kończą się ewaluacje
**Żeby** być na bieżąco ze zmianami w pipeline bez konieczności wpatrywania się w widok Pipeline — toast pojawia się i znika automatycznie po 4 sekundach

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Projekt: `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/`
Route: globalny (wszystkie strony aplikacji)
Pliki do modyfikacji:
- `src/app/layout.tsx` — root layout, dodać `<Toaster />` raz dla całej aplikacji

Nowe pliki do stworzenia:
- `src/lib/toast.ts` — funkcje pomocnicze do wywoływania toastów per typ eventu

### Powiązane pliki
- `src/app/layout.tsx` — root layout Next.js App Router (istniejący plik z EPIC-14)
- `src/hooks/useSSE.ts` — hook z STORY-2.4, zwraca `{events: SSEEvent[]}` — to tutaj podpinamy toasty
- `src/types/sse.types.ts` — typy `SSEEvent`, `StoryAdvancedPayload`, `EvalDonePayload` (STORY-2.4)
- `package.json` — tu zostanie dodany `"sonner": "^1.x.x"`

### Stan systemu przed tą story
1. Next.js projekt istnieje w `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/`
2. `src/app/layout.tsx` istnieje i eksportuje root layout z tagiem `<html>` i `<body>`
3. `src/hooks/useSSE.ts` istnieje (STORY-2.4) i zwraca `{events, connected, error}`
4. `src/types/sse.types.ts` istnieje z typami `SSEEvent`, `StoryAdvancedPayload`, `EvalDonePayload`
5. Sonner NIE jest zainstalowany — `package.json` nie zawiera `"sonner"` przed tą story
6. Tailwind CSS jest skonfigurowany (dark mode class-based lub media)
7. Aplikacja używa dark theme — tło `#13111c`, karty `#1a1730` (zgodnie z mockupem)

---

## ✅ Acceptance Criteria

### AC-1: Sonner jest zainstalowany jako dependency
GIVEN: W katalogu projektu `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/` uruchomiony jest terminal
WHEN: `npm install sonner` zostaje wykonane
THEN: `package.json` zawiera `"sonner": "^1.x.x"` w sekcji `dependencies`
AND: `node_modules/sonner` istnieje
AND: `npm run build` przechodzi bez błędów po instalacji

### AC-2: Toaster jest dodany do root layout
GIVEN: Plik `src/app/layout.tsx` zawiera komponent layout z tagami `<html>` i `<body>`
WHEN: Developer dodaje `<Toaster />` wewnątrz tagu `<body>` jako ostatni element przed `</body>`
THEN: `import { Toaster } from 'sonner'` jest dodany na górze pliku
AND: `<Toaster theme="dark" position="bottom-right" duration={4000} />` jest renderowany w `<body>`
AND: `<Toaster />` jest poza elementami `{children}` — nie jest przez nie nadpisywany
AND: Na każdej stronie aplikacji (Overview, Pipeline, Story Detail) `<Toaster />` jest widoczny bez ponownego mountowania

### AC-3: Funkcja toastStoryAdvanced wyświetla poprawny toast
GIVEN: `import { toastStoryAdvanced } from '@/lib/toast'` jest wykonany w komponencie
WHEN: `toastStoryAdvanced({ id: 'STORY-1.3', title: 'SSE client hook' }, 'REVIEW')` jest wywołane
THEN: Toast pojawia się w prawym dolnym rogu z treścią: `"STORY-1.3 przesunięta do REVIEW 🚀"`
AND: Toast ma zielony kolor (success variant Sonner lub custom style z `#4ade80`)
AND: Toast zawiera ikonę 🚀 przed tekstem
AND: Toast znika automatycznie po 4000ms

### AC-4: Funkcja toastEvalDone wyświetla poprawny toast
GIVEN: `toastEvalDone` jest zaimportowane z `@/lib/toast`
WHEN: `toastEvalDone({ passRate: 0.87, totalCases: 54, passedCases: 47 })` jest wywołane
THEN: Toast pojawia się z treścią: `"Eval zakończony: 87% pass rate 📊 (47/54 cases)"`
AND: Toast ma niebieski kolor (info variant lub custom style)
AND: Toast zawiera ikonę 📊
AND: `passRate * 100` jest zaokrąglone do liczby całkowitej: `Math.round(passRate * 100)`

### AC-5: Funkcja toastError wyświetla czerwony toast
GIVEN: `toastError` jest zaimportowane z `@/lib/toast`
WHEN: `toastError('Nie można połączyć z Bridge API')` jest wywołane
THEN: Toast pojawia się z treścią: `"❌ Nie można połączyć z Bridge API"`
AND: Toast ma czerwony kolor (error variant Sonner)
AND: Toast NIE znika automatycznie (duration ustawiony na `Infinity` lub bardzo duży) — użytkownik musi zamknąć ręcznie
AND: Toast zawiera przycisk "✕" do zamknięcia

### AC-6: Funkcja toastInfo wyświetla szary toast
GIVEN: `toastInfo` jest zaimportowane z `@/lib/toast`
WHEN: `toastInfo('Pipeline jest bezczynny — brak aktywnych stories')` jest wywołane
THEN: Toast pojawia się z treścią: `"ℹ️ Pipeline jest bezczynny — brak aktywnych stories"`
AND: Toast ma szary/neutralny kolor (domyślny Sonner)
AND: Toast znika automatycznie po 4000ms

### AC-7: Integracja z useSSE — toast pojawia się przy evencie SSE
GIVEN: Komponent główny aplikacji (`src/app/providers.tsx` lub `src/app/layout.tsx`) używa `useSSE('/api/events')`
AND: `events` tablica z hooka jest pusta (`events.length === 0`)
WHEN: SSE server wysyła event `{"type":"story_advanced","payload":{"storyId":"STORY-1.3","newStatus":"REVIEW","previousStatus":"IN_PROGRESS","model":"sonnet-4.6"},"ts":1708348800000}`
THEN: Hook `useSSE` dodaje nowy event do `events[0]`
AND: `useEffect` w komponencie integracyjnym wykrywa nowy event (przez porównanie `events.length` lub `events[0].ts`)
AND: `toastStoryAdvanced` jest wywołane z danymi z `payload as StoryAdvancedPayload`
AND: Toast pojawia się w UI w ciągu 500ms od odebrania eventu

### AC-8: Nie ma duplikatów toastów przy re-renderach
GIVEN: Komponent z integracją SSE re-renderuje się (np. zmiana innego stanu)
WHEN: `events` tablica nie zmieniła się (ten sam event na pozycji [0])
THEN: `toastStoryAdvanced` NIE jest wywołane ponownie
AND: `useEffect` deps zawiera `events[0]?.ts` lub `events.length` — tylko nowe eventy triggerują toast

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji
Route: Globalny (root layout)
Komponent: `Toaster` (Sonner) + helpery w `src/lib/toast.ts`
Plik główny: `src/app/layout.tsx`
Plik helperów: `src/lib/toast.ts`
Plik integracji SSE: `src/app/providers.tsx` (nowy) lub bezpośrednio w layout

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `<Toaster>` | Zewnętrzny (Sonner) | `theme="dark"`, `position="bottom-right"`, `duration={4000}` | zawsze widoczny w DOM, aktywny gdy są toasty |
| `<SSEListener>` | Client Component | `url="/api/events"` | połączony/rozłączony — nie renderuje UI, tylko efekty |

### Design Reference — mockup kira-dashboard-mockup-v3.html

Toasty nawiązują do kolorów Activity Feed z mockupu:
- **story_advanced (green)**: kolor `#4ade80` — identyczny z kropkami `act-dot` w Activity Feed dla eventów "→ DONE", "→ REVIEW". Toast success kolor: `background: #1a3a1a`, `border: 1px solid #2a5a2a`, `color: #4ade80`
- **eval_done (blue)**: kolor `#60a5fa` — identyczny z niebieską kropką w Activity Feed dla "→ REVIEW". Toast info kolor: `background: #1a3a5c`, `color: #60a5fa`
- **error (red)**: kolor `#f87171` — identyczny z czerwoną kropką w Activity Feed dla "→ REFACTOR". Toast error: `background: #3a1a1a`, `color: #f87171`
- **info (gray)**: kolor `#6b7280` — kolor muted text w całym UI. Toast: `background: #1a1730`, `color: #6b7280`, `border: 1px solid #2a2540`

Pozycja: **bottom-right** — zgodnie z konwencją dashboardu, nie zasłania głównego contentu.

### Pełna implementacja src/lib/toast.ts

```typescript
import { toast } from 'sonner'
import type { StoryAdvancedPayload, EvalDonePayload } from '@/types/sse.types'

// ── story_advanced ──────────────────────────────────────────────────
// Wywołaj gdy SSE event type === "story_advanced"
// Przykład: toastStoryAdvanced({ id: 'STORY-1.3', title: 'SSE hook' }, 'REVIEW')
// Wynik:    "STORY-1.3 przesunięta do REVIEW 🚀"
export function toastStoryAdvanced(
  story: { id: string; title: string },
  newStatus: string
): void {
  toast.success(`${story.id} przesunięta do ${newStatus} 🚀`, {
    description: story.title,
    duration: 4000,
    style: {
      background: '#1a3a1a',
      border: '1px solid #2a5a2a',
      color: '#4ade80',
    },
  })
}

// ── eval_done ────────────────────────────────────────────────────────
// Wywołaj gdy SSE event type === "eval_done"
// Przykład: toastEvalDone({ passRate: 0.87, totalCases: 54, passedCases: 47 })
// Wynik:    "Eval zakończony: 87% pass rate 📊 (47/54 cases)"
export function toastEvalDone(result: {
  passRate: number
  totalCases: number
  passedCases: number
}): void {
  const pct = Math.round(result.passRate * 100)
  toast(`Eval zakończony: ${pct}% pass rate 📊`, {
    description: `${result.passedCases}/${result.totalCases} cases passed`,
    duration: 4000,
    style: {
      background: '#1a3a5c',
      border: '1px solid #1e3a6e',
      color: '#60a5fa',
    },
  })
}

// ── error ─────────────────────────────────────────────────────────────
// Wywołaj przy błędach API lub SSE
// Przykład: toastError('Nie można połączyć z Bridge API')
// Wynik:    "❌ Nie można połączyć z Bridge API"
// Uwaga: toast błędu NIE znika automatycznie (duration: Infinity)
export function toastError(message: string): void {
  toast.error(`❌ ${message}`, {
    duration: Infinity,       // użytkownik musi zamknąć ręcznie
    closeButton: true,
    style: {
      background: '#3a1a1a',
      border: '1px solid #5a2a2a',
      color: '#f87171',
    },
  })
}

// ── info ──────────────────────────────────────────────────────────────
// Wywołaj dla neutralnych informacji
// Przykład: toastInfo('Pipeline jest bezczynny')
// Wynik:    "ℹ️ Pipeline jest bezczynny"
export function toastInfo(message: string): void {
  toast(`ℹ️ ${message}`, {
    duration: 4000,
    style: {
      background: '#1a1730',
      border: '1px solid #2a2540',
      color: '#6b7280',
    },
  })
}
```

### Integracja SSE — src/app/providers.tsx (nowy plik)

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useSSE } from '@/hooks/useSSE'
import {
  toastStoryAdvanced,
  toastEvalDone,
  toastError,
} from '@/lib/toast'
import type {
  SSEEvent,
  StoryAdvancedPayload,
  EvalDonePayload,
} from '@/types/sse.types'

// Komponent Client-side który nasłuchuje SSE i wywołuje toasty
// Renderuje null — nie ma własnego UI
export function SSEProvider() {
  const { events, error } = useSSE('/api/events')
  const lastTsRef = useRef<number>(0)  // ts ostatnio przetworzonego eventu

  // Reaguj na nowe eventy SSE
  useEffect(() => {
    if (events.length === 0) return

    const latest = events[0]  // najnowszy event jest zawsze na pozycji [0]

    // Sprawdź czy to nowy event (nie przetworzony wcześniej)
    if (latest.ts <= lastTsRef.current) return
    lastTsRef.current = latest.ts

    // Wywołaj odpowiednią funkcję toast na podstawie typu eventu
    switch (latest.type) {
      case 'story_advanced': {
        const p = latest.payload as StoryAdvancedPayload
        toastStoryAdvanced(
          { id: p.storyId, title: p.storyId },  // tytuł pobierany z cache jeśli dostępny
          p.newStatus
        )
        break
      }
      case 'eval_done': {
        const p = latest.payload as EvalDonePayload
        toastEvalDone(p)
        break
      }
      case 'heartbeat':
        // Heartbeat — brak toastu, cichy
        break
      default:
        // Nieznany typ — ignoruj
        break
    }
  }, [events])  // deps: cała tablica events — uruchom gdy events się zmieni

  // Wyświetl toast błędu gdy SSE jest niedostępne (ale nie przy każdym re-renderze)
  const lastErrorRef = useRef<string | null>(null)
  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error
      // Nie pokazuj toastu dla "Reconnecting..." — tylko dla finalnych błędów
      if (error.includes('niedostępne') || error.includes('Max reconnect')) {
        toastError(error)
      }
    }
    if (!error) {
      lastErrorRef.current = null
    }
  }, [error])

  return null  // Ten komponent nie renderuje żadnego UI
}
```

### Modyfikacja src/app/layout.tsx

```typescript
// Istniejący plik — dodaj dwie zmiany:

import { Toaster } from 'sonner'          // DODAJ ten import
import { SSEProvider } from './providers'  // DODAJ ten import

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <body>
        <SSEProvider />   {/* DODAJ — nasłuchuje SSE i wywołuje toasty */}
        {children}
        <Toaster          {/* DODAJ — kontener toastów, jeden dla całej aplikacji */}
          theme="dark"
          position="bottom-right"
          duration={4000}
          richColors={false}   // false = używamy własnych stylów
          closeButton={true}
        />
      </body>
    </html>
  )
}
```

### Stany widoku

**Loading:**
Brak własnego loading state — Toaster jest zawsze w DOM. Żadne elementy nie są blokowane.

**Empty (brak toastów):**
`<Toaster />` jest w DOM ale nie wyświetla nic. Nie ma żadnego placeholder.

**Error (błąd SSE):**
Czerwony toast z ikoną ❌ i treścią błędu. Nie znika automatycznie — użytkownik widzi przycisk "✕" aby zamknąć.

**Filled (aktywne toasty):**
Toasty pojawiają się w stosie od dołu (najnowszy na górze stosu). Max 3 toasty widoczne jednocześnie (domyślne zachowanie Sonner). Starsze przesuwają się w górę gdy pojawia się nowy.

### Flow interakcji (krok po kroku)

```
1. Aplikacja się ładuje → layout.tsx renderuje <SSEProvider /> + <Toaster />
2. SSEProvider montuje się → wywołuje useSSE('/api/events') → EventSource połączony
3. Bridge API zmienia status story → backend wysyła SSE event
4. useSSE.onmessage → parsuje JSON → dodaje do events[0]
5. useEffect w SSEProvider wykrywa nowy events[0].ts > lastTsRef.current
6. switch(latest.type) === "story_advanced" → toastStoryAdvanced() wywołane
7. Sonner renderuje toast w bottom-right corner
8. Po 4000ms toast znika automatycznie (lub użytkownik klika ✕)
9. Jeśli SSE error po 3 próbach → useSSE zwraca error string
10. useEffect[error] wykrywa zmianę error → toastError(error) wywołane → czerwony trwały toast
```

### Responsive / Dostępność
- Mobile (375px+): Toast zajmuje max 90% szerokości ekranu, bottom-right staje się bottom-center na mobile (Sonner robi to automatycznie)
- Desktop (1280px+): Toast w prawym dolnym rogu, szerokość 356px (domyślne Sonner)
- Keyboard navigation: Escape zamyka aktywny toast (Sonner built-in)
- ARIA: Sonner automatycznie dodaje `role="status"` lub `role="alert"` per typ toast

---

## ⚠️ Edge Cases

### EC-1: Wiele eventów SSE przychodzi w krótkim czasie (burst)
Scenariusz: Bridge wysyła 5 eventów `story_advanced` w ciągu 100ms (batch advance)
Oczekiwane zachowanie: Każdy event ma unikalny `ts` — `useEffect` uruchamia się raz per zmiana `events`, ale tylko najnowszy (`events[0]`) jest przetwarzany przez `lastTsRef`. Pozostałe eventy (events[1..4]) NIE triggerują toastów — toast jest pokazywany tylko dla najnowszego. Sonner nie jest zalewany 5 toastami jednocześnie.
Komunikat: Jeden toast dla najnowszego eventu

### EC-2: Aplikacja jest w tle gdy przychodzi event SSE
Scenariusz: Użytkownik przełączył zakładkę przeglądarki — aplikacja jest w tle
Oczekiwane zachowanie: EventSource kontynuuje działanie w tle (przeglądarki nie throttlują SSE). Po powrocie do zakładki toast może być widoczny lub już zniknął (4000ms). Nie ma specjalnego zachowania — standard browser behavior.
Komunikat: Toast pojawi się w momencie odebrania, niezależnie od aktywności zakładki

### EC-3: `toastError` wywołana wielokrotnie dla tego samego błędu
Scenariusz: `useSSE.error` zmienia się wielokrotnie na "SSE niedostępne..." przy każdym re-renderze
Oczekiwane zachowanie: `lastErrorRef.current` przechowuje ostatni wyświetlony błąd. Nowy toast pojawia się TYLKO gdy `error !== lastErrorRef.current`. Duplikaty są blokowane.
Komunikat: Jeden czerwony toast błędu zamiast wielu

### EC-4: Komponent SSEProvider montuje się i odmontowuje (hot reload w dev)
Scenariusz: Next.js Hot Module Replacement odmontowuje i remontuje komponenty
Oczekiwane zachowanie: `useSSE` cleanup przy unmount zamyka EventSource (AC-5 z STORY-2.4). `lastTsRef.current` resetuje się do 0 przy nowym montowaniu — duplikaty są możliwe po HMR ale akceptowalne w dev
Komunikat: Potencjalny duplikat toast po HMR — akceptowalne w środowisku dev

---

## 🚫 Out of Scope tej Story
- Sonner customization (animacje, rich content, ikony SVG) — domyślne zachowanie jest wystarczające
- Persystencja nieodczytanych notyfikacji po odświeżeniu strony
- Centrum notyfikacji (panel historii toastów) — oddzielna story
- Toast dla `useStoryActions` (loading/success/error) — STORY-2.6 lub STORY-2.7 podepnie useStoryActions do przycisków i wywoła toast lokalnie
- Audio powiadomienia
- Push notifications / Service Worker

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] TypeScript kompiluje bez błędów (`tsc --noEmit`)
- [ ] `npm run build` przechodzi bez błędów
- [ ] `sonner` jest w `package.json` dependencies
- [ ] `<Toaster>` jest w `src/app/layout.tsx` z `theme="dark"`, `position="bottom-right"`, `duration={4000}`
- [ ] `src/lib/toast.ts` zawiera 4 funkcje: `toastStoryAdvanced`, `toastEvalDone`, `toastError`, `toastInfo`
- [ ] `src/app/providers.tsx` zawiera `SSEProvider` podpięty do `useSSE`
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading: n/a, empty: brak toastów, error: czerwony toast, filled: toast widoczny)
- [ ] Test manualny: `toastStoryAdvanced({id:'STORY-1.3',title:'test'},'REVIEW')` — zielony toast z treścią "STORY-1.3 przesunięta do REVIEW 🚀" pojawia się i znika po 4s
- [ ] Test manualny: `toastEvalDone({passRate:0.87,totalCases:54,passedCases:47})` — niebieski toast "Eval zakończony: 87% pass rate 📊 (47/54 cases)"
- [ ] Test manualny: `toastError('test')` — czerwony toast, NIE znika automatycznie
- [ ] Test manualny: SSE event `story_advanced` przychodzi → toast pojawia się w ciągu 500ms
- [ ] Brak duplikatów toastów przy tym samym evencie
- [ ] Widok działa na mobile 375px bez horizontal scroll (Sonner responsive)
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Komunikaty błędów są po polsku i zrozumiałe dla użytkownika końcowego
- [ ] Story review przez PO
