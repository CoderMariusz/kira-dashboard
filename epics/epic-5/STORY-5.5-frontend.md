---
story_id: STORY-5.5
title: "Models page /dashboard/models — grid kart z statystykami"
epic: EPIC-5
module: models
domain: frontend
status: draft
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 6h
depends_on: [STORY-5.4]
blocks: [STORY-5.6, STORY-5.7]
tags: [frontend, page, grid, card, skeleton, empty-state, offline, tailwind, shadcn, react]
---

## 🎯 User Story

**Jako** Mariusz (ADMIN)
**Chcę** widzieć stronę `/dashboard/models` z gridem kart modeli AI zawierających statystyki i koszty
**Żeby** mieć w jednym miejscu przegląd wszystkich modeli używanych w pipeline — ich wydajność, koszty i status

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Pliki do stworzenia:
```
app/(dashboard)/models/page.tsx          → strona Next.js (Server Component + use client wewnątrz)
components/models/ModelsGrid.tsx         → grid z kartami (client component)
components/models/ModelCard.tsx          → karta jednego modelu (client component)
```

Stack:
- Next.js 16 App Router — plik w grupie `(dashboard)` (layout sidebar istnieje)
- React 18+ (`useState`)
- Tailwind CSS — styl inline z klasami, bez nowych config
- shadcn/ui — `<Badge>`, `<Button>`, `<Skeleton>` (zakładamy zainstalowane)
- `useModels()` z `hooks/useModels.ts` (STORY-5.4)
- `isModelMonitored()` z `lib/model-monitoring.ts` (STORY-5.4)
- `MonitoringToggle` z `components/models/MonitoringToggle.tsx` (STORY-5.7, placeholder OK)
- `ModelDetailPanel` z `components/models/ModelDetailPanel.tsx` (STORY-5.6, placeholder OK)

### Powiązane pliki

- `hooks/useModels.ts` — `useModels()` → `{ models, isLoading, error, mutate }`
- `lib/model-monitoring.ts` — `isModelMonitored(canonical_key): boolean`
- `types/models.ts` — `ModelEntry`, `ModelStats`

### Schemat kolorów (spójny z projektem)

```
tło strony: bg-[#0d0c1a]
karty: bg-[#1a1730] border border-[#2a2540]
akcent: text-[#818cf8] bg-[#818cf8]
success: text-[#4ade80]
danger: text-red-400
tekst primary: text-white
tekst secondary: text-slate-400
```

### Provider colors (litera w kółku)

```typescript
const PROVIDER_COLORS: Record<string, string> = {
  'Anthropic':   'bg-[#7c3aed]',   // fioletowy
  'Moonshot AI': 'bg-[#3b82f6]',   // niebieski
  'Z.AI':        'bg-[#22c55e]',   // zielony
  'OpenAI':      'bg-[#ef4444]',   // czerwony
}
```

### Layout strony

```
/dashboard/models
├── <header>
│   ├── h1: "Modele AI"
│   └── badge: "N aktywnych" (N = liczba modeli z monitoring_enabled: true)
└── <ModelsGrid>
    ├── Stan: Loading → 2 skeleton karty
    ├── Stan: Empty → ilustracja + komunikat
    ├── Stan: Offline → ikona ⚠️ + komunikat + przycisk retry
    └── Stan: Filled → grid 2-col (lg) / 1-col (mobile)
        └── <ModelCard> per model
```

### Struktura ModelCard

```
ModelCard (border rounded-xl p-6)
├── Header row (flex justify-between items-start):
│   ├── Lewa: provider circle (litera) + display_name (font-semibold) + alias badge
│   └── Prawa: <MonitoringToggle alias={canonical_key} />
├── Stats row (grid grid-cols-4 gap-2 mt-4):
│   ├── "Runs: N"
│   ├── "Success: XX%"  (np. "Success: 87%")
│   ├── "Avg: X.Xs"     (np. "Avg: 3.2s") lub "Avg: —" gdy null
│   └── "Cost: $X.XX"   (np. "Cost: $0.05")
├── Cost row (flex justify-between items-center mt-3):
│   ├── "Input: $X.XX / 1M  |  Output: $X.XX / 1M"
│   └── <Button variant="ghost" size="sm">Edytuj ceny</Button>
└── Expand row (flex justify-center mt-3):
    └── <Button variant="ghost" size="sm" onClick={toggle}>▼ Szczegóły</Button>
        → gdy expanded: <ModelDetailPanel alias={canonical_key} />
```

---

## ✅ Acceptance Criteria

### AC-1: Stan Loading — skeleton cards

GIVEN: `useModels()` ma `isLoading: true` (request w toku)
WHEN: użytkownik wchodzi na `/dashboard/models`
THEN: wyświetlane są dokładnie 2 skeleton karty — każda ma pulsujące szare tło (`animate-pulse`)
AND: każda skeleton karta ma tę samą wysokość i szerokość co normalna karta (bg-[#1a1730], border border-[#2a2540], rounded-xl)
AND: wewnątrz skeleton karty: belka nagłówkowa (h-6 w-3/4 bg-[#2a2540] rounded), belka statystyk (h-4 w-full bg-[#2a2540] rounded mt-4), belka kosztów (h-4 w-1/2 bg-[#2a2540] rounded mt-3)
AND: tytuł strony "Modele AI" i badge są widoczne nad skeletonami

### AC-2: Stan Empty — brak modeli

GIVEN: `useModels()` ma `isLoading: false`, `error: undefined`, `models: []` (pusta lista)
WHEN: użytkownik patrzy na stronę
THEN: widoczny jest komunikat: "Brak skonfigurowanych modeli. Dodaj modele w bridge.yml."
AND: komunikat jest wyśrodkowany, tekst w kolorze `text-slate-400`
AND: nad komunikatem jest ikona lub ilustracja (np. emoji "🤖" lub SVG 48×48px)
AND: badge w headerze pokazuje "0 aktywnych"
AND: grid kart jest pusty (brak kart)

### AC-3: Stan Offline — Bridge niedostępny

GIVEN: `useModels()` ma `error: Error { message: 'Błąd serwera — spróbuj ponownie' }` (API zwróciło błąd)
WHEN: użytkownik patrzy na stronę
THEN: widoczna jest ikona ⚠️ (żółty trójkąt, Unicode U+26A0 lub SVG) + tekst "Bridge niedostępny"
AND: poniżej jest przycisk z tekstem "Spróbuj ponownie"
AND: kliknięcie "Spróbuj ponownie" wywołuje `mutate()` z `useModels()` (wymuszony refetch)
AND: po kliknięciu przycisk tymczasowo (500ms) pokazuje stan loading (spinner lub `opacity-50`)
AND: brak kart modeli w tym stanie

### AC-4: Stan Filled — grid kart z danymi

GIVEN: `useModels()` zwraca 4 `ModelEntry` z `monitoring_enabled: true` dla wszystkich
WHEN: użytkownik patrzy na stronę
THEN: widoczne są 4 karty w gridzie
AND: na ekranie ≥ 1024px: grid ma 2 kolumny (`grid-cols-2`)
AND: na ekranie < 1024px: grid ma 1 kolumnę (`grid-cols-1`)
AND: badge w headerze pokazuje "4 aktywnych"
AND: każda karta ma tło `bg-[#1a1730]`, border `border-[#2a2540]`, rounded-xl, padding p-6

### AC-5: Karta wyłączonego modelu — dimmed i badge "Wyłączony"

GIVEN: model `kimi-k2.5` ma `monitoring_enabled: false` (zwrócone z API lub ustawione przez localStorage)
WHEN: `isModelMonitored('kimi-k2.5')` zwraca `false`
THEN: karta modelu `kimi` ma dodatkową klasę CSS `opacity-50`
AND: w nagłówku karty (obok alias badge) widoczny jest badge z tekstem "Wyłączony" w kolorze `bg-slate-600 text-slate-300`
AND: badge "Wyłączony" jest umieszczony obok alias badge (flex row)
AND: karta nadal jest renderowana w gridzie (nie ukryta całkowicie)
AND: badge "N aktywnych" w headerze strony NIE liczy tego modelu

### AC-6: Poprawne wyświetlenie statystyk w ModelCard

GIVEN: ModelEntry ma:
  ```json
  { "stats": { "total_runs": 42, "success_rate": 0.857, "avg_duration_s": 3.2, "total_cost_usd": 0.135 } }
  ```
WHEN: karta modelu jest renderowana
THEN: stat badges zawierają dokładnie te teksty (w tej kolejności):
  1. `"Runs: 42"`
  2. `"Success: 86%"` (floor(0.857 * 100) = 85 → zaokrąglij do `Math.round(0.857 * 100)` = 86)
  3. `"Avg: 3.2s"` (jedno miejsce po przecinku, suffix "s")
  4. `"Cost: $0.14"` (dwa miejsca po przecinku, prefix "$")

GIVEN: ModelEntry ma `stats: null` (Bridge offline)
THEN: stat badges zawierają:
  1. `"Runs: —"`
  2. `"Success: —"`
  3. `"Avg: —"`
  4. `"Cost: —"`

GIVEN: ModelEntry ma `stats.avg_duration_s: null` (brak runów z duration)
THEN: stat badge 3 = `"Avg: —"` (myślnik zamiast wartości)

### AC-7: Rozwijanie i zwijanie panelu szczegółów

GIVEN: karta modelu jest widoczna, panel szczegółów jest zamknięty
WHEN: użytkownik klika przycisk "▼ Szczegóły"
THEN: tekst przycisku zmienia się na "▲ Szczegóły"
AND: pod przyciskiem pojawia się `<ModelDetailPanel alias={canonical_key} />` (STORY-5.6)
AND: panel otwiera się z animacją (CSS transition, nie skeleton)
AND: jeśli STORY-5.6 nie jest jeszcze zaimplementowana: placeholder div z tekstem "Panel szczegółów — wkrótce" jest akceptowalny

WHEN: użytkownik klika "▲ Szczegóły" (panel otwarty)
THEN: tekst przycisku zmienia się na "▼ Szczegóły"
AND: `<ModelDetailPanel>` jest odmontowywany lub ukrywany (`hidden`)
AND: tylko jeden panel może być otwarty jednocześnie (otwarcie nowego zamyka poprzedni)

---

## 🖥️ Szczegóły Frontend

### app/(dashboard)/models/page.tsx

```tsx
// Server Component — nie potrzebuje 'use client'
import { ModelsGrid } from '@/components/models/ModelsGrid'

export default function ModelsPage() {
  return (
    <div className="min-h-screen bg-[#0d0c1a] p-6">
      <ModelsGrid />
    </div>
  )
}
```

### components/models/ModelsGrid.tsx

```tsx
'use client'
import { useState } from 'react'
import { useModels } from '@/hooks/useModels'
import { isModelMonitored } from '@/lib/model-monitoring'
import { ModelCard } from './ModelCard'
import { ModelEntry } from '@/types/models'

export function ModelsGrid() {
  const { models, isLoading, error, mutate } = useModels()
  const [expandedAlias, setExpandedAlias] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  // Badge count — liczy modele z monitoring_enabled (z localStorage)
  const activeCount = models.filter(m => isModelMonitored(m.canonical_key)).length

  const handleRetry = async () => {
    setIsRetrying(true)
    await mutate()
    setTimeout(() => setIsRetrying(false), 500)
  }

  const handleToggleExpand = (canonicalKey: string) => {
    setExpandedAlias(prev => prev === canonicalKey ? null : canonicalKey)
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <>
        <Header activeCount={0} isLoading />
        <SkeletonGrid />
      </>
    )
  }

  // --- Error / Offline ---
  if (error) {
    return (
      <>
        <Header activeCount={0} />
        <OfflineState onRetry={handleRetry} isRetrying={isRetrying} />
      </>
    )
  }

  // --- Empty ---
  if (models.length === 0) {
    return (
      <>
        <Header activeCount={0} />
        <EmptyState />
      </>
    )
  }

  // --- Filled ---
  return (
    <>
      <Header activeCount={activeCount} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        {models.map((model) => (
          <ModelCard
            key={model.canonical_key}
            model={model}
            isExpanded={expandedAlias === model.canonical_key}
            onToggleExpand={() => handleToggleExpand(model.canonical_key)}
          />
        ))}
      </div>
    </>
  )
}
```

### Komponenty pomocnicze w ModelsGrid.tsx

```tsx
// Header
function Header({ activeCount, isLoading }: { activeCount: number; isLoading?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <h1 className="text-2xl font-bold text-white">Modele AI</h1>
      <span className="px-2 py-1 rounded-full bg-[#2a2540] text-[#818cf8] text-sm font-medium">
        {isLoading ? '...' : `${activeCount} aktywnych`}
      </span>
    </div>
  )
}

// Skeleton
function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
      {[0, 1].map(i => (
        <div key={i} className="bg-[#1a1730] border border-[#2a2540] rounded-xl p-6 animate-pulse">
          <div className="h-6 w-3/4 bg-[#2a2540] rounded" />
          <div className="h-4 w-full bg-[#2a2540] rounded mt-4" />
          <div className="h-4 w-1/2 bg-[#2a2540] rounded mt-3" />
        </div>
      ))}
    </div>
  )
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <span className="text-5xl mb-4">🤖</span>
      <p className="text-center">Brak skonfigurowanych modeli. Dodaj modele w bridge.yml.</p>
    </div>
  )
}

// Offline state
function OfflineState({ onRetry, isRetrying }: { onRetry: () => void; isRetrying: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
      <span className="text-4xl">⚠️</span>
      <p className="text-white font-medium">Bridge niedostępny</p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className={`px-4 py-2 bg-[#818cf8] text-white rounded-lg text-sm font-medium transition-opacity ${isRetrying ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        Spróbuj ponownie
      </button>
    </div>
  )
}
```

### components/models/ModelCard.tsx

```tsx
'use client'
import { useState } from 'react'
import { ModelEntry } from '@/types/models'
import { isModelMonitored } from '@/lib/model-monitoring'
import { MonitoringToggle } from './MonitoringToggle'  // STORY-5.7
import { ModelDetailPanel } from './ModelDetailPanel'   // STORY-5.6

interface Props {
  model: ModelEntry
  isExpanded: boolean
  onToggleExpand: () => void
}

const PROVIDER_COLORS: Record<string, string> = {
  'Anthropic': 'bg-[#7c3aed]',
  'Moonshot AI': 'bg-[#3b82f6]',
  'Z.AI': 'bg-[#22c55e]',
  'OpenAI': 'bg-[#ef4444]',
}

function formatStat(value: number | null | undefined, format: 'runs' | 'percent' | 'seconds' | 'cost'): string {
  if (value === null || value === undefined) return '—'
  switch (format) {
    case 'runs':    return String(value)
    case 'percent': return `${Math.round(value * 100)}%`
    case 'seconds': return `${value.toFixed(1)}s`
    case 'cost':    return `$${value.toFixed(2)}`
  }
}

export function ModelCard({ model, isExpanded, onToggleExpand }: Props) {
  const monitored = isModelMonitored(model.canonical_key)
  const isDisabled = !monitored

  return (
    <div className={`bg-[#1a1730] border border-[#2a2540] rounded-xl p-6 transition-opacity ${isDisabled ? 'opacity-50' : ''}`}>
      {/* Header row */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${PROVIDER_COLORS[model.provider] ?? 'bg-slate-600'} flex items-center justify-center text-white text-sm font-bold`}>
            {model.provider[0]}
          </div>
          <div>
            <span className="text-white font-semibold">{model.display_name}</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="px-1.5 py-0.5 bg-[#2a2540] text-[#818cf8] text-xs rounded font-mono">{model.alias}</span>
              {isDisabled && (
                <span className="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">Wyłączony</span>
              )}
            </div>
          </div>
        </div>
        <MonitoringToggle alias={model.canonical_key} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Runs', value: formatStat(model.stats?.total_runs ?? null, 'runs') },
          { label: 'Success', value: formatStat(model.stats?.success_rate ?? null, 'percent') },
          { label: 'Avg', value: formatStat(model.stats?.avg_duration_s ?? null, 'seconds') },
          { label: 'Cost', value: formatStat(model.stats?.total_cost_usd ?? null, 'cost') },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#0d0c1a] rounded-lg p-2 text-center">
            <div className="text-xs text-slate-400">{label}</div>
            <div className="text-sm text-white font-medium mt-0.5">{value}</div>
          </div>
        ))}
      </div>

      {/* Cost row */}
      <div className="flex justify-between items-center mt-3">
        <span className="text-sm text-slate-400">
          Input: <span className="text-white">${model.cost_input_per_1m.toFixed(2)} / 1M</span>
          {' | '}
          Output: <span className="text-white">${model.cost_output_per_1m.toFixed(2)} / 1M</span>
        </span>
        <button
          onClick={onToggleExpand}
          className="text-xs text-[#818cf8] hover:text-white transition-colors"
        >
          Edytuj ceny
        </button>
      </div>

      {/* Expand button */}
      <div className="flex justify-center mt-3">
        <button
          onClick={onToggleExpand}
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          {isExpanded ? '▲' : '▼'} Szczegóły
        </button>
      </div>

      {/* Detail Panel */}
      {isExpanded && (
        <div className="mt-4 border-t border-[#2a2540] pt-4">
          <ModelDetailPanel alias={model.canonical_key} displayName={model.display_name} />
        </div>
      )}
    </div>
  )
}
```

---

## ⚠️ Edge Cases

### EC-1: Model ma stats: null (Bridge offline przy załadowaniu)
- Stat badges pokazują "—" dla każdej wartości
- Karta jest w pełni widoczna (nie błąd)
- Jeśli `monitoring_enabled: true` i Bridge offline — karta normalna, bez "Wyłączony" badge

### EC-2: Jeden model ma stats, inne nie (Bridge częściowo odpowiedział)
- Niemożliwe przy aktualnej architekturze — Bridge albo odpowiada dla wszystkich albo nie
- Ale jeśli `stats: null` per model — każda karta renderuje "—" niezależnie

### EC-3: useModels() error a potem retry sukces
- Error → `<OfflineState>` z przyciskiem
- Klik "Spróbuj ponownie" → `mutate()` → nowy fetch
- Jeśli fetch sukces → `error` cleared → SWR przechodzi do stanu Filled
- Grid kart pojawia się automatycznie

### EC-4: monitoring_enabled z localStorage różni się od API
- API zawsze zwraca `monitoring_enabled: true` (serwer nie zarządza tym stanem)
- `isModelMonitored(canonical_key)` sprawdza localStorage
- `isDisabled = !isModelMonitored(model.canonical_key)` — lokalny stan ma priorytet w UI
- Badge "N aktywnych" bazuje na `isModelMonitored()`, nie na `model.monitoring_enabled`

---

## 🚫 Out of Scope tej Story

- Sortowanie kart (zawsze w kolejności z `KNOWN_MODEL_KEYS`)
- Filtrowanie kart po providerze
- Eksport listy modeli
- Paginacja (zawsze 4 modele)
- Animacja otwierania/zamykania detail panel (plain CSS hidden jest wystarczające)

---

## ✔️ Definition of Done

- [ ] `app/(dashboard)/models/page.tsx` istnieje i renderuje `<ModelsGrid />`
- [ ] `components/models/ModelsGrid.tsx` istnieje z obsługą 4 stanów: loading, empty, offline, filled
- [ ] `components/models/ModelCard.tsx` istnieje z header, stats, cost, expand button
- [ ] Stan Loading: 2 skeleton karty z `animate-pulse`
- [ ] Stan Empty: komunikat "Brak skonfigurowanych modeli. Dodaj modele w bridge.yml."
- [ ] Stan Offline: ikona ⚠️ + "Bridge niedostępny" + przycisk "Spróbuj ponownie" wywołujący `mutate()`
- [ ] Wyłączony model: `opacity-50` + badge "Wyłączony"
- [ ] Stats: `total_runs`, `success_rate` (Math.round × 100%), `avg_duration_s` (1 dp + "s"), `total_cost_usd` (2 dp + "$")
- [ ] Stats null → "—" dla każdej wartości
- [ ] Expand: "▼ Szczegóły" / "▲ Szczegóły", tylko jeden panel otwarty jednocześnie
- [ ] Grid 2-col na lg, 1-col na mobile
- [ ] Badge "N aktywnych" w headerze odzwierciedla `isModelMonitored()` per model
- [ ] TypeScript — brak `any`, wszystkie typy zdefiniowane
- [ ] Kod przechodzi `next build` bez błędów
