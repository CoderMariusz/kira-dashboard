---
story_id: STORY-5.7
title: "Monitoring toggle per model z optimistic UI i localStorage"
epic: EPIC-5
module: models
domain: frontend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-5.4, STORY-5.5]
blocks: none
tags: [frontend, toggle, switch, localstorage, optimistic, shadcn, toast]
---

## 🎯 User Story

**Jako** Mariusz (ADMIN)
**Chcę** móc włączać i wyłączać monitorowanie każdego modelu AI osobno
**Żeby** wyłączone modele nie zaburzały statystyk w Cost Tracker i nie były liczone w zbiorczych podsumowaniach

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
components/models/MonitoringToggle.tsx   → komponent Switch per model
```

Stack:
- React 18+ (`useState`, `useEffect`)
- shadcn/ui `<Switch>` — komponent toggle z etykietą
- `setModelMonitoring()`, `isModelMonitored()` z `lib/model-monitoring.ts` (STORY-5.4)
- Toast — shadcn/ui `useToast()` lub `sonner` toast library (ta sama co w STORY-5.6)
- TypeScript (strict mode)

### Powiązane pliki

- `lib/model-monitoring.ts` — eksportuje `isModelMonitored(alias)`, `setModelMonitoring(alias, enabled)`
- `components/models/ModelsGrid.tsx` (STORY-5.5) — odczytuje `isModelMonitored()` do dimming kart
- `components/models/ModelCard.tsx` (STORY-5.5) — renderuje `<MonitoringToggle alias={canonical_key} />`
- `components/CostTrackerPanel.tsx` — (istniejący) sprawdza `isModelMonitored()` żeby filtrować modele

### Props interfejs

```typescript
interface MonitoringToggleProps {
  alias: string   // canonical_key modelu, np. "kimi-k2.5", "sonnet-4.6"
}
```

### Efekty wyłączenia modelu (cross-component)

Gdy `isModelMonitored('kimi-k2.5')` = `false`:
1. `MonitoringToggle` — Switch w pozycji OFF
2. `ModelCard` w `ModelsGrid` — `opacity-50` + badge "Wyłączony" (STORY-5.5)
3. `CostTrackerPanel` — model `kimi-k2.5` nie pojawia się w liście kosztów (filtrowanie przez `isModelMonitored()`)
4. Badge "N aktywnych" w headerze strony — model nie jest liczony

**Uwaga:** Efekty 2, 3, 4 są implementowane w odpowiednich komponentach (STORY-5.5). STORY-5.7 implementuje tylko `MonitoringToggle` i aktualizację localStorage.

---

## ✅ Acceptance Criteria

### AC-1: Toggle włączony → wyłączony (optimistic UI)

GIVEN: model `kimi-k2.5` jest monitorowany (`isModelMonitored('kimi-k2.5') = true`)
AND: Switch w `MonitoringToggle` jest w pozycji ON (checked)
WHEN: użytkownik klika Switch
THEN: Switch natychmiast przełącza się do pozycji OFF (przed jakimkolwiek requestem sieciowym)
AND: `setModelMonitoring('kimi-k2.5', false)` jest wywołane
AND: `localStorage.getItem('kira_model_monitoring')` zawiera `{"kimi-k2.5": false}`
AND: karta modelu w gridzie ma `opacity-50` i badge "Wyłączony" (odświeżenie stanu w `ModelCard`)

### AC-2: Toggle wyłączony → włączony (optimistic UI)

GIVEN: `isModelMonitored('kimi-k2.5') = false` (localStorage zawiera `{"kimi-k2.5": false}`)
AND: Switch w pozycji OFF (unchecked)
WHEN: użytkownik klika Switch
THEN: Switch natychmiast przełącza się do pozycji ON
AND: `setModelMonitoring('kimi-k2.5', true)` jest wywołane
AND: `localStorage.getItem('kira_model_monitoring')` zawiera `{"kimi-k2.5": true}` (lub klucz nie istnieje)
AND: karta modelu traci `opacity-50` i badge "Wyłączony"

### AC-3: Stan togglea jest zachowany po przeładowaniu strony

GIVEN: użytkownik wyłączył monitorowanie `glm-5` (Switch OFF, localStorage: `{"glm-5": false}`)
WHEN: użytkownik odświeża stronę (`F5` lub nawigacja)
THEN: `MonitoringToggle` dla `glm-5` jest od razu w pozycji OFF (bez flashowania stanu ON)
AND: karta modelu `glm-5` ma `opacity-50` i badge "Wyłączony"
AND: badge "N aktywnych" w headerze nie liczy `glm-5`

### AC-4: Rollback przy błędzie (opcjonalny PATCH)

GIVEN: `MonitoringToggle` próbuje wysłać `PATCH /api/models/glm` (opcjonalnie — persystencja serwer-side)
AND: serwer zwraca HTTP 500
WHEN: użytkownik klika Switch
THEN: Switch natychmiast zmienia stan (optimistic)
AND: po otrzymaniu błędu HTTP 500 — Switch wraca do poprzedniego stanu (rollback)
AND: `setModelMonitoring()` cofa zmianę (wraca do poprzedniej wartości)
AND: toast z tekstem "Nie udało się zmienić stanu monitorowania" pojawia się w prawym dolnym rogu

**Uwaga dla implementatora:** PATCH do serwera jest **opcjonalny** w tej story. Jeśli nie implementujesz PATCH, AC-4 dotyczy tylko localStorage (nie ma rollback bo nie ma błędu sieciowego). Priorytet: localStorage working = wystarczające dla MVP.

---

## 🖥️ Szczegóły Frontend

### Implementacja MonitoringToggle.tsx

```tsx
'use client'
import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'   // shadcn/ui
import { Label } from '@/components/ui/label'
import { isModelMonitored, setModelMonitoring } from '@/lib/model-monitoring'

interface MonitoringToggleProps {
  alias: string   // canonical_key, np. "kimi-k2.5"
}

export function MonitoringToggle({ alias }: MonitoringToggleProps) {
  // Inicjalizacja z localStorage (może być false przy SSR → useEffect poprawia)
  const [enabled, setEnabled] = useState<boolean>(true)

  // Synchronizacja z localStorage po hydration
  useEffect(() => {
    setEnabled(isModelMonitored(alias))
  }, [alias])

  const handleToggle = (checked: boolean) => {
    // Optimistic update
    setEnabled(checked)
    setModelMonitoring(alias, checked)

    // Opcjonalny PATCH do serwera (jeśli implementujesz):
    // fetch(`/api/models/${shortAlias}`, { method: 'PATCH', body: JSON.stringify({ monitoring_enabled: checked }) })
    //   .then(res => { if (!res.ok) throw new Error() })
    //   .catch(() => {
    //     // Rollback
    //     setEnabled(!checked)
    //     setModelMonitoring(alias, !checked)
    //     toast({ title: "Nie udało się zmienić stanu monitorowania", variant: "destructive" })
    //   })
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        id={`monitoring-${alias}`}
        checked={enabled}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-[#818cf8]"
      />
      <Label
        htmlFor={`monitoring-${alias}`}
        className="text-xs text-slate-400 cursor-pointer select-none"
      >
        Monitoruj
      </Label>
    </div>
  )
}
```

### Jak unikać SSR hydration mismatch

Problem: `isModelMonitored()` czyta `localStorage` który nie istnieje podczas SSR → hydration mismatch.

Rozwiązanie: inicjalizuj `useState(true)` (wartość domyślna serwer) i w `useEffect` zsynchronizuj z localStorage:
```typescript
const [enabled, setEnabled] = useState<boolean>(true)  // domyślnie ON (SSR safe)
useEffect(() => {
  setEnabled(isModelMonitored(alias))  // koryguj po hydration client-side
}, [alias])
```

To powoduje mały "flash" (ON → OFF jeśli model wyłączony) ale jest to akceptowalne zachowanie.

---

## ⚠️ Edge Cases

### EC-1: MonitoringToggle renderowany po stronie serwera (SSR)
- `isModelMonitored()` zwraca `{}` gdy `typeof window === 'undefined'`
- `useState(true)` → domyślnie ON podczas SSR
- `useEffect` koryguje po montowaniu w przeglądarce
- Brak hydration mismatch error (stan serwerowy = `true`, klient też zaczyna od `true`)

### EC-2: localStorage jest pełny (QuotaExceededError)
- `setModelMonitoring()` ma `try/catch` wokół `localStorage.setItem()`
- Przy QuotaExceededError: error jest łapany cicho (brak toast, brak crash)
- Stan UI (`useState`) jest zaktualizowany optimistically — komponent wyświetla nowy stan
- Przy przeładowaniu strony: stary stan z localStorage (bez nowego wpisu) — "flash"
- To jest akceptowalne zachowanie degradacji

---

## 🚫 Out of Scope tej Story

- Persystencja stanu monitorowania w bazie danych lub Bridge
- Synchronizacja stanu między oknami przeglądarki (bez `storage` event listener)
- Toggle dla PATCH `monitoring_enabled` po stronie serwera (tylko localStorage jest wymagane)
- Animacja przełączania (shadcn Switch ma wbudowaną animację — wystarczające)
- Blokowanie interakcji z kartą gdy model jest wyłączony (karta tylko dimmed)

---

## ✔️ Definition of Done

- [ ] `components/models/MonitoringToggle.tsx` istnieje i eksportuje `MonitoringToggle`
- [ ] Switch jest w pozycji ON gdy `isModelMonitored(alias) = true`
- [ ] Switch jest w pozycji OFF gdy `isModelMonitored(alias) = false`
- [ ] Klik Switch → natychmiastowa zmiana stanu UI (optimistic)
- [ ] `setModelMonitoring()` wywoływane przy każdym kliknięciu
- [ ] Stan zachowany po przeładowaniu strony (localStorage)
- [ ] Brak SSR hydration mismatch (useState(true) + useEffect pattern)
- [ ] Label "Monitoruj" widoczny obok Switch, klikalny
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów
