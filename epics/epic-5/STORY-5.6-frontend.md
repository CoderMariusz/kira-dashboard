---
story_id: STORY-5.6
title: "Model detail panel — wykres time-series + edycja kosztów inline"
epic: EPIC-5
module: models
domain: frontend
status: draft
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 7h
depends_on: [STORY-5.4, STORY-5.5]
blocks: none
tags: [frontend, chart, chartjs, react-hook-form, zod, patch, toast, optimistic, tailwind]
---

## 🎯 User Story

**Jako** Mariusz (ADMIN)
**Chcę** w panelu szczegółów modelu widzieć wykres wydatków/tokenów + formularz edycji cen + listę ostatnich runów
**Żeby** analizować trendy kosztów per model i natychmiast aktualizować ceny API bez wychodzenia z widoku kart

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Plik do stworzenia:
```
components/models/ModelDetailPanel.tsx   → accordion panel wewnątrz ModelCard
```

Stack:
- React 18+ (`useState`)
- `react-chartjs-2` + `chart.js` — Line chart
- `react-hook-form` + `zod` + `@hookform/resolvers/zod` — formularz edycji kosztów
- shadcn/ui — `<Button>`, `<Input>`, `<Label>` (zakładamy zainstalowane)
- `useModelMetrics()` z `hooks/useModelMetrics.ts` (STORY-5.4)
- `useModels()` z `hooks/useModels.ts` (STORY-5.4) — do optimistic update i mutate
- Toast — shadcn/ui `<Toaster>` + `useToast()` (zakładamy zainstalowane) lub `sonner` toast library

### Powiązane pliki

- `hooks/useModelMetrics.ts` — `useModelMetrics(alias, period)` → `{ metrics, isLoading, error }`
- `hooks/useModels.ts` — `useModels()` → `{ mutate }` (do invalidacji po PATCH)
- `types/models.ts` — `ModelMetricsResponse`, `ModelMetricPoint`, `ModelEntry`, `ModelCostUpdateDTO`
- `app/api/models/[alias]/route.ts` — `PATCH /api/models/[alias]` (STORY-5.2)
- `types/bridge.ts` — `BridgeRunRaw`, `RunStatus`

### Jak Panel jest montowany

`ModelDetailPanel` jest renderowany wewnątrz `ModelCard` (STORY-5.5) gdy karta jest rozwinięta:
```tsx
// W ModelCard.tsx, po kliknięciu "▼ Szczegóły":
{isExpanded && (
  <div className="mt-4 border-t border-[#2a2540] pt-4">
    <ModelDetailPanel alias={canonicalKey} displayName={displayName} />
  </div>
)}
```

### Props interfejs

```typescript
interface ModelDetailPanelProps {
  alias: string        // canonical_key np. "kimi-k2.5" lub krótki alias "kimi" — do sprawdzenia
  displayName: string  // np. "Kimi K2.5" — do toast messages
}
```

**Ważne:** `alias` przekazywany z `model.canonical_key` (np. `"sonnet-4.6"`). W API calls:
- `useModelMetrics(alias, period)` — używa `alias` jako param SWR, endpoint przyjmuje krótki alias
- `PATCH /api/models/[alias]` — endpoint przyjmuje krótki alias (np. `"sonnet"`, `"kimi"`)
- Mapping: `canonical_key → short alias` przez `ALIAS_SHORT_MAP` lub przekazanie aliasu z ModelCard

**Rozwiązanie:** przekaż oba z ModelCard:
```tsx
<ModelDetailPanel canonicalKey={model.canonical_key} alias={model.alias} displayName={model.display_name} currentCostInput={model.cost_input_per_1m} currentCostOutput={model.cost_output_per_1m} />
```

### Chart.js setup

```typescript
// Zarejestruj komponenty Chart.js (raz w pliku lub w _app.tsx)
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend,
} from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)
```

### Dane do wykresu

- Oś X: daty z `metrics.points[].date` sformatowane jako "DD MMM" (np. "19 lut", "01 sty")
- Lewa oś Y: `cost_usd` — seria "Koszt (USD)", kolor `#818cf8`
- Prawa oś Y: `tokens_in + tokens_out` (suma tokenów) — seria "Tokeny", kolor `#4ade80`
- Formatowanie osi X dat: polska lokalizacja `new Date(date).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })`

### Mini lista ostatnich runów

- Pobierz z `useModels()` → znajdź odpowiedni model → lub osobny fetch runów
- Lepsze podejście: `GET /api/status/runs` via `fetchBridge` lub użyj istniejących danych
- Podejście w story: pobierz z `GET /api/models` dane stats, które nie mają individual runs
- **Rozwiązanie:** dodaj osobny `useSWR` w panelu dla `GET /api/runs?model=${alias}` lub użyj Bridge bezpośrednio przez Next.js proxy
- **Uproszczone podejście (implementuj):** `fetch('/api/bridge/api/status/runs')` → filtruj po modelu → ostatnie 5

Format każdego wiersza runu:
```
[STATUS_BADGE] STORY-X.Y  •  Xs  •  DD MMM YYYY HH:MM
```

StatusBadge colors:
- DONE: `bg-[#4ade80]/20 text-[#4ade80]`
- FAILED: `bg-red-500/20 text-red-400`
- IN_PROGRESS: `bg-[#818cf8]/20 text-[#818cf8]`

---

## ✅ Acceptance Criteria

### AC-1: Panel ładuje wykres z skeleton podczas pobierania danych

GIVEN: `ModelDetailPanel` jest zamontowany z `alias="sonnet"`
WHEN: `useModelMetrics('sonnet', '7d')` ma `isLoading: true`
THEN: wyświetlany jest prostokąt skeleton o wymiarach `w-full h-[200px]` z klasą `bg-[#2a2540] animate-pulse rounded`
AND: skeleton jest widoczny zamiast wykresu (nie obok)
AND: przyciski period `[7 dni]` i `[30 dni]` są widoczne i aktywne nad skeletonem

### AC-2: Przełączenie period zmienia zapytanie SWR i ponownie ładuje wykres

GIVEN: panel jest otwarty, aktywny period = `7d`, wykres załadowany
WHEN: użytkownik klika przycisk `[30 dni]`
THEN: przycisk `[30 dni]` ma styl aktywny: `bg-[#818cf8] text-white`
AND: przycisk `[7 dni]` ma styl nieaktywny: `bg-[#2a2540] text-slate-400`
AND: `useModelMetrics` jest wywoływany z `period='30d'` (nowy SWR key)
AND: skeleton jest wyświetlany podczas ładowania nowych danych
AND: po załadowaniu wykres ma 30 punktów na osi X

### AC-3: Wykres line chart wyświetla dwie serie danych

GIVEN: `useModelMetrics('kimi', '7d')` zwraca `points` z co najmniej jednym dniem gdzie `cost_usd > 0` lub `tokens_in > 0`
WHEN: dane są załadowane (`isLoading: false`, `error: undefined`)
THEN: renderowany jest `<Line>` komponent z `react-chartjs-2`
AND: seria `"Koszt (USD)"` używa danych `points[].cost_usd`, kolor `#818cf8`, oś Y = `y` (lewa)
AND: seria `"Tokeny"` używa danych `points[].tokens_in + points[].tokens_out`, kolor `#4ade80`, oś Y = `y1` (prawa)
AND: oś X ma etykiety z dat w formacie "DD MMM" w języku polskim (np. "19 lut")
AND: wykres ma `fill: false` dla obu serii (linie, nie obszar)

GIVEN: wszystkie punkty mają `cost_usd: 0` i `tokens_in: 0` i `tokens_out: 0`
THEN: zamiast wykresu wyświetlany jest tekst: "Brak danych dla wybranego okresu"
AND: tekst jest wyśrodkowany, kolor `text-slate-400`

### AC-4: Formularz edycji kosztów waliduje dane wejściowe

GIVEN: panel jest otwarty, formularz edycji kosztów jest widoczny (tryb read-only domyślnie lub przycisk "Edytuj ceny" otwiera formularz)
WHEN: użytkownik wpisuje `-1` w pole "Koszt input ($/1M tokenów)" i klika "Zapisz"
THEN: pole jest oznaczone błędem, pod polem pojawia się tekst: "Wartość musi być ≥ 0"
AND: żaden request PATCH nie jest wysyłany

WHEN: użytkownik wpisuje `1001` i klika "Zapisz"
THEN: pod polem pojawia się tekst: "Wartość nie może przekraczać 1000"
AND: żaden request PATCH nie jest wysyłany

WHEN: użytkownik wpisuje `3.12345` (5 miejsc po przecinku) i klika "Zapisz"
THEN: pod polem pojawia się tekst: "Maksymalnie 4 miejsca po przecinku"
AND: żaden request PATCH nie jest wysyłany

### AC-5: Formularz wysyła PATCH i pokazuje toast sukcesu

GIVEN: panel otwarty, formularz w trybie edycji
AND: użytkownik wpisuje `5.0` w "Koszt input" i `12.0` w "Koszt output"
WHEN: użytkownik klika "Zapisz"
THEN: wysyłany jest `PATCH /api/models/kimi` z body `{ "cost_input_per_1m": 5.0, "cost_output_per_1m": 12.0 }`
AND: toast z tekstem "Ceny modelu Kimi K2.5 zaktualizowane" pojawia się w prawym dolnym rogu ekranu
AND: toast jest zielony (variant: "success" lub stosowna klasa)
AND: formularz wraca do trybu read-only (pola są tylko do odczytu)
AND: `mutate()` z `useModels()` jest wywołane → grid odświeżony

### AC-6: Formularz pokazuje toast błędu gdy PATCH nie powiedzie się

GIVEN: panel otwarty, formularz w trybie edycji z poprawnymi wartościami
AND: serwer zwraca HTTP 500 lub HTTP 400
WHEN: użytkownik klika "Zapisz"
THEN: toast z tekstem "Nie udało się zaktualizować cen: Błąd serwera — spróbuj ponownie" pojawia się w prawym dolnym rogu
AND: toast jest czerwony (variant: "destructive" lub stosowna klasa)
AND: formularz POZOSTAJE w trybie edycji (użytkownik może spróbować ponownie)
AND: wartości w polach są zachowane (nie reset)

### AC-7: Lista ostatnich runów wyświetla 5 najnowszych runów dla tego modelu

GIVEN: Bridge zwraca runy, wśród nich 8 runów dla modelu `kimi-k2.5`
WHEN: panel jest zamontowany
THEN: pod formularzem widoczna jest sekcja "Ostatnie runy" z maksymalnie 5 runami (posortowane DESC po `started_at`)
AND: każdy wiersz zawiera: status badge (`DONE` / `FAILED` / `IN_PROGRESS`) + `story_id` (np. "STORY-1.2") + czas trwania (np. "3.2s" lub "—") + datę (np. "19 lut 2026 14:30")
AND: status badge DONE ma tło `bg-[#4ade80]/20` i tekst `text-[#4ade80]`
AND: status badge FAILED ma tło `bg-red-500/20` i tekst `text-red-400`
AND: jeśli Bridge offline: sekcja "Ostatnie runy" wyświetla "Brak danych o runach"

---

## 🖥️ Szczegóły Frontend

### Zod schema dla formularza

```typescript
import { z } from 'zod'

const MAX_DECIMAL_PLACES = 4

function maxDecimalPlaces(n: number) {
  const str = n.toString()
  const parts = str.split('.')
  return !parts[1] || parts[1].length <= MAX_DECIMAL_PLACES
}

const CostFormSchema = z.object({
  cost_input_per_1m: z.number({
    required_error: 'Podaj wartość',
    invalid_type_error: 'Podaj liczbę',
  })
    .min(0, 'Wartość musi być ≥ 0')
    .max(1000, 'Wartość nie może przekraczać 1000')
    .refine(maxDecimalPlaces, 'Maksymalnie 4 miejsca po przecinku'),
  cost_output_per_1m: z.number({
    required_error: 'Podaj wartość',
    invalid_type_error: 'Podaj liczbę',
  })
    .min(0, 'Wartość musi być ≥ 0')
    .max(1000, 'Wartość nie może przekraczać 1000')
    .refine(maxDecimalPlaces, 'Maksymalnie 4 miejsca po przecinku'),
})

type CostFormValues = z.infer<typeof CostFormSchema>
```

### React Hook Form setup

```typescript
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CostFormValues>({
  resolver: zodResolver(CostFormSchema),
  defaultValues: {
    cost_input_per_1m: currentCostInput,   // z props
    cost_output_per_1m: currentCostOutput, // z props
  },
})
```

### PATCH request

```typescript
const onSubmit = async (data: CostFormValues) => {
  try {
    const res = await fetch(`/api/models/${alias}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cost_input_per_1m: data.cost_input_per_1m,
        cost_output_per_1m: data.cost_output_per_1m,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? `Błąd ${res.status}`)
    }
    toast({
      title: `Ceny modelu ${displayName} zaktualizowane`,
      variant: 'default',  // zielony (sukces)
    })
    setIsEditing(false)
    mutateModels()  // z useModels()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Nieznany błąd'
    toast({
      title: `Nie udało się zaktualizować cen: ${message}`,
      variant: 'destructive',  // czerwony
    })
    // NIE resetuj formularza — użytkownik może spróbować ponownie
  }
}
```

### Chart.js options

```typescript
const chartOptions = {
  responsive: true,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { position: 'top' as const, labels: { color: '#94a3b8' } },
    tooltip: { backgroundColor: '#1a1730', borderColor: '#2a2540', borderWidth: 1 },
  },
  scales: {
    x: { ticks: { color: '#94a3b8' }, grid: { color: '#2a2540' } },
    y: {
      type: 'linear' as const,
      position: 'left' as const,
      ticks: { color: '#818cf8' },
      grid: { color: '#2a2540' },
    },
    y1: {
      type: 'linear' as const,
      position: 'right' as const,
      ticks: { color: '#4ade80' },
      grid: { drawOnChartArea: false },
    },
  },
}
```

### Pobieranie ostatnich runów

```typescript
// W ModelDetailPanel — osobny useSWR dla runów
const { data: runsData } = useSWR('/api/bridge/api/status/runs', async (url) => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json() as Promise<{ runs: BridgeRunRaw[] } | null>
})

const recentRuns = useMemo(() => {
  if (!runsData?.runs) return null
  return runsData.runs
    .filter(r => resolveModelKey(r.model) === canonicalKey)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 5)
}, [runsData, canonicalKey])
```

---

## ⚠️ Edge Cases

### EC-1: Wszystkie punkty w metrikach mają wartości 0 (brak aktywności)
- Sprawdź: `metrics.points.every(p => p.cost_usd === 0 && p.tokens_in === 0 && p.tokens_out === 0)`
- Wynik: zamiast wykresu wyświetl `<p className="text-slate-400 text-center py-8">Brak danych dla wybranego okresu</p>`
- Wykres `<Line>` NIE jest renderowany

### EC-2: useModelMetrics zwraca error (Bridge offline dla metrics)
- `error` jest ustawiony
- Wyświetl: `<p className="text-red-400 text-center py-4">Nie udało się pobrać danych wykresu</p>`
- Formularz edycji kosztów nadal jest dostępny (nie zależy od metrics)

### EC-3: Formularz w trakcie submittingu (isSubmitting: true)
- Przycisk "Zapisz" jest disabled z `cursor-not-allowed opacity-60`
- Przycisk "Anuluj" jest disabled
- Pola formularza są disabled

### EC-4: PATCH zwraca HTTP 404 (nieznany alias po stronie serwera)
- `res.ok = false`, `res.status = 404`
- `err.error = "Model o aliasie '...' nie istnieje"`
- Toast: "Nie udało się zaktualizować cen: Model o aliasie '...' nie istnieje"
- Formularz pozostaje otwarty (nie zamyka się)

---

## 🚫 Out of Scope tej Story

- Eksport danych z wykresu (CSV, PNG)
- Wykres słupkowy (bar chart) zamiast liniowego
- Paginacja listy runów (tylko 5 ostatnich)
- Edycja innych pól poza `cost_input_per_1m` i `cost_output_per_1m`
- Porównanie dwóch modeli na jednym wykresie
- Animacja Chart.js (można ustawić `animation: false` dla szybkości)

---

## ✔️ Definition of Done

- [ ] `components/models/ModelDetailPanel.tsx` istnieje i jest renderowany wewnątrz `ModelCard`
- [ ] Skeleton `h-[200px] animate-pulse` podczas `isLoading` dla metrics
- [ ] Przyciski `[7 dni]` i `[30 dni]` z aktywnym stylem (bg-[#818cf8] dla aktywnego)
- [ ] Zmiana period → nowy request SWR → skeleton → nowy wykres
- [ ] Chart.js Line z dwoma seriami: `#818cf8` (lewa oś) i `#4ade80` (prawa oś)
- [ ] Wszystkie zera → "Brak danych dla wybranego okresu" (brak wykresu)
- [ ] Formularz React Hook Form + Zod z polami cost_input i cost_output
- [ ] Walidacja: ≥ 0, ≤ 1000, max 4 miejsca po przecinku — polskie komunikaty błędów
- [ ] Submit → `PATCH /api/models/[alias]` → toast sukcesu z nazwą modelu
- [ ] Błąd PATCH → toast destructive z treścią błędu, formularz otwarty
- [ ] Lista 5 ostatnich runów z badge statusu + story_id + czas + data
- [ ] Bridge offline dla runów → "Brak danych o runach"
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów
