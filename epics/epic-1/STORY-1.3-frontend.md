---
story_id: STORY-1.3
title: "Mariusz widzi Overview page z stat cards, velocity chart i Kira banner"
epic: EPIC-1
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 8h
depends_on: [STORY-1.1, STORY-1.2]
blocks: [STORY-1.4, STORY-1.5, STORY-1.6, STORY-1.7]
tags: [overview, charts, stat-cards, chartjs, offline-state, kira-banner]
---

## 🎯 User Story

**Jako** Mariusz (Admin, developer systemu Kira)
**Chcę** widzieć Overview page dashboardu z 4 stat cards, wykresem velocity i banerem Kira v1.0
**Żeby** mieć pełny obraz stanu pipeline'u w < 5 sekund od otwarcia dashboardu, bez komend CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Route: `/` (root route Next.js App Router)
Plik główny: `/app/page.tsx`
Komponenty: `/components/overview/`

### Powiązane pliki

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
  — sekcja `<!-- KIRA BANNER -->`, `<!-- STATS -->`, `<!-- VELOCITY CHART -->` (tab "Overview")
- **Hooks:** `useStats()` i `useRuns()` z STORY-1.2 (plik `/hooks/useStats.ts` i `/hooks/useRuns.ts`)
- **Typy:** `StatsData`, `Run` z `/types/api.ts` (dostarczone przez STORY-1.2)

### Stan systemu przed tą story

1. **STORY-1.1 DONE** — projekt Next.js 16 działa na `localhost:3000`, zainstalowany Tailwind CSS, shadcn/ui, Chart.js (`npm install chart.js`)
2. **STORY-1.2 DONE** — hooki `useStats()` i `useRuns()` istnieją i działają:
   - `useStats()` → zwraca `{ data: StatsData | null, isLoading: boolean, isOffline: boolean, error: string | null, refresh: () => void }`
   - `useRuns()` → zwraca `{ data: Run[], isLoading: boolean, isOffline: boolean, error: string | null, refresh: () => void }`
3. Typy `StatsData` i `Run` są zdefiniowane w `/types/api.ts`:
   ```typescript
   interface StatsData {
     stories_done: number;      // Łączna liczba ukończonych stories
     active_runs: number;       // Liczba aktywnych runów (IN_PROGRESS)
     success_rate: number;      // Success rate w procentach, np. 93.9
     estimated_cost: number;    // Szacowany koszt dziś w USD, np. 4.20
   }
   interface Run {
     id: string;
     story_id: string;          // Np. "STORY-13.8"
     story_title: string;       // Np. "Auto log-run hook"
     model: string;             // Np. "sonnet", "kimi", "glm", "codex"
     status: 'DONE' | 'REFACTOR' | 'IN_PROGRESS' | 'REVIEW' | 'MERGE';
     duration_seconds: number;  // Czas trwania runu w sekundach
     created_at: string;        // ISO 8601, np. "2026-02-19T11:03:00Z"
     step: string;              // Np. "IMPLEMENT", "REVIEW"
   }
   ```

---

## ✅ Acceptance Criteria

### AC-1: Kira v1.0 banner renderuje się poprawnie z tagami capabilities

GIVEN: Użytkownik otwiera dashboard na `http://localhost:3000/` i Bridge API jest online (lub offline)
WHEN: Strona się załaduje (niezależnie od stanu API — banner jest statyczny)
THEN:
- Banner renderuje się u góry strony z gradientowym tłem `linear-gradient(135deg, #1e1b4b 0%, #1a2744 100%)` i borderem `1px solid #3b3d7a`, border-radius 12px
- Ikona 🤖 wyświetla się w kwadracie 42×42px z gradientem `linear-gradient(135deg, #7c3aed, #3b82f6)`, border-radius 11px
- Tytuł "Kira v1.0" renderuje się gradientowym tekstem `linear-gradient(135deg, #c4b5fd, #93c5fd)`, font-size 19px, font-weight 800
- Subtitle "AI Pipeline Orchestrator" wyświetla się poniżej tytułu, font-size 11px, color #6b7280
- Tagi wyświetlają się po prawej stronie bannera (margin-left: auto), max-width 500px, flex-wrap wrap
AND:
- Tag "✅ Multi-project" ma styl `.done`: bg #1a3a1a, border `1px solid #2a5a2a`, color #4ade80, padding 3px 9px, border-radius 20px
- Tag "✅ Auto run tracking" ma styl `.done` (identyczny jak powyżej)
- Tag "🆕 Lesson hooks" ma styl `.new`: bg #2d1b4a, border `1px solid #5b21b6`, color #c4b5fd
- Tag "🆕 memU events" ma styl `.new` (identyczny jak powyżej)
- Tag "🆕 Eval CLI" ma styl `.new` (identyczny jak powyżej)
- Tag "🆕 Dashboard" ma styl `.new` (identyczny jak powyżej)
- Tag "🔒 CI/CD EPIC-11" ma styl `.lock`: bg #1a1730, border `1px solid #2a2540`, color #3d3757

### AC-2: 4 stat cards wyświetlają poprawne dane z useStats()

GIVEN: `useStats()` zwraca `{ data: { stories_done: 158, active_runs: 49, success_rate: 93.9, estimated_cost: 4.20 }, isLoading: false, isOffline: false }`
WHEN: Komponent `StatCard` otrzyma dane
THEN:
- Row z 4 kartami renderuje się jako grid 4 kolumn (`grid-template-columns: repeat(4, 1fr)`), gap 12px, margin-bottom 18px
- **Karta 1 — "Stories Done":**
  - Label: "STORIES DONE" (uppercase, font-size 10px, color #4b4569, letter-spacing 0.07em)
  - Wartość: "158" (font-size 25px, font-weight 800, color #e6edf3, line-height 1)
  - Sub: "across 15 epics" (font-size 10px, color #4b4569, margin-top 4px)
  - Trend: "↑ +10 this session" (font-size 10px, color #4ade80, margin-top 3px)
- **Karta 2 — "Active Runs":**
  - Label: "ACTIVE RUNS"
  - Wartość: "49"
  - Sub: "auto-tracked from today"
  - Trend: "↑ hooks live ✅" (color #4ade80)
- **Karta 3 — "Success Rate":**
  - Label: "SUCCESS RATE"
  - Wartość: "93.9%" (success_rate sformatowany jako `${value}%`)
  - Sub: "kimi 100% · glm 85.7%"
  - Trend: "↑ 7-day trend stable" (color #4ade80)
- **Karta 4 — "Est. Cost":**
  - Label: "EST. COST"
  - Wartość: "~$4.20" (estimated_cost sformatowany jako `~$${value.toFixed(2)}`)
  - Sub: "today · all models"
  - Trend: "kimi $1.8 · sonnet $2.1" (color #f87171)
AND:
- Każda karta: bg #1a1730, border `1px solid #2a2540`, border-radius 10px, padding 14px 16px
- On hover każdej karty: border-color zmienia się na #3b3d7a (CSS transition 0.15s)

### AC-3: Velocity chart renderuje wykres słupkowy stories per dzień (ostatnie 30 dni)

GIVEN: `useRuns()` zwraca tablicę runów z różnymi datami w `created_at`
WHEN: Komponent `VelocityChart` wyrenderuje się z tymi danymi
THEN:
- Wykres Bar chart (Chart.js typ `'bar'`) renderuje się w kontenerze o wysokości 110px
- Oś X (labels): 30 dat — od 30 dni temu do dzisiaj, format "DD/MM" (np. "20/01", "21/01", ...)
  - Daty generuje się programatycznie: `for (let i = 29; i >= 0; i--) { /* data = today - i dni */ }`
- Oś Y: liczba stories ukończonych (status `'DONE'`) per dzień (count runów DONE na każdy dzień)
- Dane: przefiltruj `useRuns().data` gdzie `run.status === 'DONE'`, zgrupuj po dacie ISO `created_at.slice(0, 10)`, policz wystąpienia
- Kolor słupków (dynamiczny — callback): wartość >= 20 → `rgba(124,58,237,0.9)` (głęboki fiolet), wartość >= 15 → `rgba(99,102,241,0.85)` (indigo), wartość < 15 → `rgba(56,189,248,0.7)` (błękit)
- `borderRadius: 3` na słupkach
AND:
- Oś X: ticks color #4b4569, font-size 9px; grid color #1f1c2e
- Oś Y: ticks color #4b4569, font-size 9px; grid color #1f1c2e
- Legenda: wyłączona (`plugins.legend.display: false`)
- `responsive: true, maintainAspectRatio: false, animation: false`
- Pod wykresem (poniżej kontenera canvas) renderuje się row z 3 stat values:
  - "Avg/day: **X**" — X = suma wszystkich DONE runs / 30, zaokrąglona do 1 miejsca
  - "Peak: **Y**" — Y = max liczba DONE w jednym dniu, format "Y (DD Mmm)" np. "24 (Feb 18)"
  - "Total: **Z** stories" — Z = suma wszystkich DONE runs
  - Styl: font-size 11px, color #6b7280; `<b>` tag z color #e6edf3

### AC-4: Loading state — karty i wykres pokazują skeleton placeholdery

GIVEN: `useStats()` i `useRuns()` zwracają `isLoading: true` (zapytanie do Bridge API w toku)
WHEN: Komponent `OverviewPage` renderuje się
THEN:
- Kira banner jest zawsze widoczny (nie ukrywaj podczas loading)
- Każda z 4 stat cards wyświetla `animate-pulse` skeleton: szary prostokąt `bg-[#2a2540]` w miejscu wartości (w rozmiarze 60px × 28px) i szary prostokąt w miejscu labela (80px × 10px)
- Kontener wykresu velocity wyświetla szary blok `bg-[#2a2540] rounded animate-pulse` o wysokości 110px — zamiast canvas
- Żaden spinner globalny — tylko lokalne skeleton shapes

### AC-5: Offline state — karty szare z "—", banner "Bridge offline"

GIVEN: `useStats()` zwraca `{ data: null, isOffline: true }` LUB `useRuns()` zwraca `{ isOffline: true }`
WHEN: Komponent `OverviewPage` renderuje się
THEN:
- Kira banner zmienia subtitle na tekst "⚠️ Bridge offline — dane mogą być nieaktualne" (color #f87171)
  — tekst wyświetla się obok oryginalnego subtitle lub zamienia go
- Wszystkie 4 stat cards wyświetlają "—" zamiast liczb (`.s-val` → text "—", color #4b4569)
- `.s-sub` i `.s-trend` w kartach są ukryte (lub wyświetlają "—")
- Kontener wykresu velocity wyświetla komunikat centralny: "🔌 Brak danych — Bridge offline" (font-size 12px, color #4b4569, text-align center, padding 40px 0)
- Karty mają niezmieniony layout (nie zwijają się, nie znikają)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

Route: `/` (App Router root)
Plik route: `/app/page.tsx`
Komponenty w: `/components/overview/`

### Struktura plików do stworzenia

```
/app/page.tsx                           ← główna strona, renderuje <OverviewPage />
/components/overview/OverviewPage.tsx   ← container, łączy wszystkie sekcje
/components/overview/KiraBanner.tsx     ← banner Kira v1.0 (statyczny)
/components/overview/StatCard.tsx       ← reużywalny komponent karty
/components/overview/VelocityChart.tsx  ← wrapper na Chart.js bar chart
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `OverviewPage` | Page container | brak (sam wywołuje hooki) | loading, error, offline, filled |
| `KiraBanner` | Display | `isOffline?: boolean` | static, offline-subtitle |
| `StatCard` | Card | `label`, `value`, `sub`, `trend`, `trendType: 'up'\|'down'`, `isLoading`, `isOffline` | loading (skeleton), offline (—), filled |
| `VelocityChart` | Chart | `runs: Run[]`, `isLoading`, `isOffline` | loading (skeleton), offline (message), filled |

### Implementacja krok po kroku

#### Krok 1: Plik `/app/page.tsx`

```tsx
import OverviewPage from '@/components/overview/OverviewPage'

export default function Home() {
  return <OverviewPage />
}
```

#### Krok 2: Komponent `OverviewPage.tsx`

```tsx
'use client'

import { useStats } from '@/hooks/useStats'
import { useRuns } from '@/hooks/useRuns'
import KiraBanner from './KiraBanner'
import StatCard from './StatCard'
import VelocityChart from './VelocityChart'

export default function OverviewPage() {
  const { data: stats, isLoading: statsLoading, isOffline: statsOffline } = useStats()
  const { data: runs, isLoading: runsLoading, isOffline: runsOffline } = useRuns()
  
  const isOffline = statsOffline || runsOffline
  const isLoading = statsLoading || runsLoading

  return (
    <div className="p-[18px_20px] overflow-y-auto flex-1">
      <KiraBanner isOffline={isOffline} />
      {/* 4 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
        <StatCard label="STORIES DONE" value={stats?.stories_done} sub="across 15 epics" trend="↑ +10 this session" trendType="up" isLoading={isLoading} isOffline={isOffline} />
        <StatCard label="ACTIVE RUNS" value={stats?.active_runs} sub="auto-tracked from today" trend="↑ hooks live ✅" trendType="up" isLoading={isLoading} isOffline={isOffline} />
        <StatCard label="SUCCESS RATE" value={stats ? `${stats.success_rate}%` : undefined} sub="kimi 100% · glm 85.7%" trend="↑ 7-day trend stable" trendType="up" isLoading={isLoading} isOffline={isOffline} />
        <StatCard label="EST. COST" value={stats ? `~$${stats.estimated_cost.toFixed(2)}` : undefined} sub="today · all models" trend="kimi $1.8 · sonnet $2.1" trendType="down" isLoading={isLoading} isOffline={isOffline} />
      </div>
      {/* Velocity chart */}
      <VelocityChart runs={runs} isLoading={runsLoading} isOffline={runsOffline} />
    </div>
  )
}
```

#### Krok 3: Komponent `KiraBanner.tsx`

```tsx
interface KiraBannerProps { isOffline?: boolean }

export default function KiraBanner({ isOffline }: KiraBannerProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #1a2744 100%)',
      border: '1px solid #3b3d7a',
      borderRadius: '12px',
      padding: '14px 18px',
      marginBottom: '18px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }}>
      {/* Icon */}
      <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 2px 14px rgba(124,58,237,.4)' }}>
        🤖
      </div>
      {/* Title + subtitle */}
      <div>
        <div style={{ fontSize: '19px', fontWeight: 800, background: 'linear-gradient(135deg,#c4b5fd,#93c5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Kira v1.0
        </div>
        <div style={{ fontSize: '11px', color: isOffline ? '#f87171' : '#6b7280', marginTop: '2px' }}>
          {isOffline ? '⚠️ Bridge offline — dane mogą być nieaktualne' : 'AI Pipeline Orchestrator · 158 stories shipped · Bridge API live · EPIC-11 CI/CD next'}
        </div>
      </div>
      {/* Tags */}
      <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '500px' }}>
        <Tag type="done">✅ Multi-project</Tag>
        <Tag type="done">✅ Auto run tracking</Tag>
        <Tag type="new">🆕 Lesson hooks</Tag>
        <Tag type="new">🆕 memU events</Tag>
        <Tag type="new">🆕 Eval CLI</Tag>
        <Tag type="new">🆕 Dashboard</Tag>
        <Tag type="lock">🔒 CI/CD EPIC-11</Tag>
      </div>
    </div>
  )
}
```

Tag helper (wewnątrz tego samego pliku lub jako sub-komponent):
- `type="done"`: bg `#1a3a1a`, border `1px solid #2a5a2a`, color `#4ade80`
- `type="new"`: bg `#2d1b4a`, border `1px solid #5b21b6`, color `#c4b5fd`
- `type="lock"`: bg `#1a1730`, border `1px solid #2a2540`, color `#3d3757`
- Wspólne: font-size 10px, padding 3px 9px, border-radius 20px, display flex, align-items center, gap 3px

#### Krok 4: Komponent `StatCard.tsx`

Props:
```typescript
interface StatCardProps {
  label: string           // np. "STORIES DONE"
  value?: string | number // undefined = loading/offline
  sub?: string            // podtytuł
  trend?: string          // tekst trendu
  trendType?: 'up' | 'down'
  isLoading?: boolean
  isOffline?: boolean
}
```

Logika wyświetlania wartości:
- `isOffline === true` → wyświetl "—" (color #4b4569) zamiast value
- `isLoading === true` && nie ma value → wyświetl skeleton pulsujący
- Inaczej → wyświetl `value`

Skeleton value: `<div style={{ width: '60px', height: '28px', background: '#2a2540', borderRadius: '4px' }} className="animate-pulse" />`
Skeleton label: `<div style={{ width: '80px', height: '10px', background: '#2a2540', borderRadius: '4px', marginBottom: '6px' }} className="animate-pulse" />`

Styl karty:
```css
background: #1a1730
border: 1px solid #2a2540
border-radius: 10px
padding: 14px 16px
transition: border-color 0.15s
cursor: default
```
On hover (CSS `:hover`): `border-color: #3b3d7a`

#### Krok 5: Komponent `VelocityChart.tsx`

> **WAŻNE:** Chart.js musi być importowany dynamicznie (Next.js SSR nie obsługuje canvas). Użyj `'use client'` na górze pliku i `import { useEffect, useRef } from 'react'`.

```tsx
'use client'
import { useEffect, useRef } from 'react'
import type { Run } from '@/types/api'
// NIE importuj Chart z 'chart.js' na top-level!
// Importuj wewnątrz useEffect lub użyj dynamic import

interface VelocityChartProps {
  runs: Run[]
  isLoading: boolean
  isOffline: boolean
}

export default function VelocityChart({ runs, isLoading, isOffline }: VelocityChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (isOffline || isLoading || !canvasRef.current) return
    
    // Dynamiczny import Chart.js
    import('chart.js/auto').then((ChartModule) => {
      const Chart = ChartModule.default
      
      // Generuj ostatnie 30 dni
      const today = new Date()
      const labels: string[] = []
      const dateKeys: string[] = []
      
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10) // "2026-01-20"
        const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
        labels.push(label)
        dateKeys.push(key)
      }
      
      // Zlicz DONE runs per dzień
      const countMap: Record<string, number> = {}
      runs.forEach(run => {
        if (run.status === 'DONE') {
          const day = run.created_at.slice(0, 10)
          countMap[day] = (countMap[day] || 0) + 1
        }
      })
      const data = dateKeys.map(key => countMap[key] || 0)
      
      // Zniszcz poprzedni chart jeśli istnieje
      if (chartRef.current) {
        chartRef.current.destroy()
      }
      
      chartRef.current = new Chart(canvasRef.current!, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Stories done',
            data,
            backgroundColor: (ctx: any) => {
              const v = ctx.raw as number
              if (v >= 20) return 'rgba(124,58,237,0.9)'
              if (v >= 15) return 'rgba(99,102,241,0.85)'
              return 'rgba(56,189,248,0.7)'
            },
            borderRadius: 3
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#4b4569', font: { size: 9 } }, grid: { color: '#1f1c2e' } },
            y: { ticks: { color: '#4b4569', font: { size: 9 } }, grid: { color: '#1f1c2e' } }
          },
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      })
    })
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [runs, isOffline, isLoading])
  
  // Oblicz summary stats
  const doneCounts = /* jak wyżej */ (() => {
    const counts: Record<string, number> = {}
    runs.forEach(r => { if (r.status === 'DONE') counts[r.created_at.slice(0, 10)] = (counts[r.created_at.slice(0, 10)] || 0) + 1 })
    return Object.values(counts)
  })()
  const total = doneCounts.reduce((a, b) => a + b, 0)
  const avg = doneCounts.length > 0 ? (total / 30).toFixed(1) : '0.0'
  const peak = doneCounts.length > 0 ? Math.max(...doneCounts) : 0
  
  return (
    <div style={{ background: '#1a1730', border: '1px solid #2a2540', borderRadius: '10px', padding: '15px', marginBottom: '18px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3', flex: 1 }}>Story Velocity</h3>
        <span style={{ fontSize: '11px', color: '#4b4569', marginLeft: '6px' }}>— stories/day · last 30 days</span>
      </div>
      
      {/* Chart area */}
      <div style={{ height: '110px', marginBottom: '10px' }}>
        {isLoading && (
          <div className="animate-pulse" style={{ height: '100%', background: '#2a2540', borderRadius: '4px' }} />
        )}
        {isOffline && !isLoading && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#4b4569' }}>
            🔌 Brak danych — Bridge offline
          </div>
        )}
        {!isLoading && !isOffline && (
          <canvas ref={canvasRef} />
        )}
      </div>
      
      {/* Summary stats (tylko gdy dane są dostępne) */}
      {!isLoading && !isOffline && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Avg/day: <b style={{ color: '#e6edf3' }}>{avg}</b></span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Peak: <b style={{ color: '#e6edf3' }}>{peak}</b></span>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>Total: <b style={{ color: '#e6edf3' }}>{total} stories</b></span>
        </div>
      )}
    </div>
  )
}
```

### Stany widoku

**Loading (isLoading: true):**
- Kira banner: widoczny normalnie
- 4 stat cards: każda pokazuje pulsujące szare prostokąty (animate-pulse bg-[#2a2540]) zamiast wartości i labelów
- Velocity chart: szary pulsujący blok 110px wysokości zamiast canvas

**Offline (isOffline: true):**
- Kira banner: subtitle zmieniony na "⚠️ Bridge offline — dane mogą być nieaktualne" (color #f87171)
- Stat cards: wartość "—" (color #4b4569), sub i trend ukryte lub też "—"
- Velocity chart: komunikat tekstowy "🔌 Brak danych — Bridge offline" wycentrowany

**Error (błąd sieci, ale nie offline):**
- Zachowanie identyczne jak Offline — wyświetlaj offline state gdy `isOffline: true` lub `error !== null`

**Filled (normalny stan):**
- Banner ze statycznym tekstem, 7 tagami
- 4 karty z danymi z useStats()
- Velocity chart z danymi za ostatnie 30 dni z useRuns()

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na http://localhost:3000/ → system montuje <OverviewPage />
2. useStats() i useRuns() wysyłają requesty do Bridge API (http://localhost:8199)
3. Przez czas requestu (isLoading: true): banner widoczny, stat cards i chart pokazują skeleton
4. Request sukces → dane wypełniają karty i wykres
5. Request failure (sieć niedostępna) → isOffline: true → karty z "—", banner z ostrzeżeniem
6. useStats() i useRuns() ponawiają requesty automatycznie co N sekund (zdefiniowane w STORY-1.2)
```

### Responsive / Dostępność

- **Desktop (1280px+):** stat cards w 4 kolumnach (pełna szerokość), velocity chart full-width
- **Desktop (<1024px):** stat cards mogą zawijać się do 2×2 grid — nie jest wymagane w MVP (desktop-first per Epic)
- **Keyboard navigation:** strona nie ma interaktywnych elementów (tylko read-only karty)
- **ARIA:** `<canvas>` w VelocityChart powinien mieć `aria-label="Wykres velocity — stories ukończone per dzień"`

### Design Reference

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
- **Sekcje mockupu:** `<!-- KIRA BANNER -->`, `<!-- STATS -->`, `<!-- VELOCITY + PIPELINE -->` (lewa karta "Story Velocity")
- **Tab w mockupie:** "Overview" (domyślnie aktywny)
- **Kolory i layout:**
  - Page background: `#13111c`
  - Karty/panele: bg `#1a1730`, border `1px solid #2a2540`
  - Akcent gradient: `linear-gradient(135deg, #7c3aed, #3b82f6)` (fioletowo-niebieski)
  - Banner background: `linear-gradient(135deg, #1e1b4b 0%, #1a2744 100%)`
  - Text primary: `#e6edf3`
  - Text secondary: `#6b7280`
  - Text dimmed: `#4b4569`
  - Border active: `#3b3d7a`
  - Green (done/up): `#4ade80`
  - Red (error/down): `#f87171`

---

## ⚠️ Edge Cases

### EC-1: Bridge API całkowicie niedostępny od pierwszego ładowania

Scenariusz: Użytkownik otwiera dashboard gdy Bridge API (localhost:8199) nie odpowiada. `useStats()` i `useRuns()` nie mogą pobrać danych.
Oczekiwane zachowanie:
- `isOffline: true` po timeout (zdefiniowanym w STORY-1.2, np. 5 sekund)
- Kira banner pojawia się normalnie (jest statyczny)
- Wszystkie 4 karty wyświetlają "—" zamiast liczb
- Velocity chart wyświetla komunikat "🔌 Brak danych — Bridge offline"
- Strona nie crashuje, nie ma nieskończonego ładowania
Komunikat dla użytkownika: "⚠️ Bridge offline — dane mogą być nieaktualne" (w subtitlu bannera)

### EC-2: Brak runów w useRuns() — pusta tablica

Scenariusz: Bridge API jest online, ale `useRuns()` zwraca `data: []` (brak runów w bazie).
Oczekiwane zachowanie:
- Velocity chart renderuje się poprawnie z wykresem — wszystkie wartości to 0
- Słupki nie wyświetlają się (dane zerowe)
- Poniżej wykresu: "Avg/day: **0.0**", "Peak: **0**", "Total: **0 stories**"
- Stat cards z useStats() wyświetlają dane normalnie (niezależne od runs)
Komunikat dla użytkownika: brak — pusty chart to prawidłowy stan

### EC-3: Chart.js canvas re-mount po zmianie danych

Scenariusz: Hooki odświeżają dane po 30s — `useRuns()` zwraca nowe dane. Poprzedni Chart.js instance już istnieje.
Oczekiwane zachowanie:
- W `useEffect`, PRZED stworzeniem nowego Chart, wywołaj `chartRef.current.destroy()` jeśli istnieje
- Nowy Chart tworzy się na tym samym `<canvas>` elemencie
- Wykres renderuje się poprawnie bez błędów "Canvas is already in use"

### EC-4: useStats() zwraca null (edge case)

Scenariusz: Hook zwraca `{ data: null, isLoading: false, isOffline: false }` — np. pusta odpowiedź API.
Oczekiwane zachowanie:
- StatCard otrzymuje `value={undefined}` → renderuje "—" (traktuj null/undefined jak offline)
- Brak crasha JS (optional chaining `stats?.stories_done` jest konieczne)

---

## 🚫 Out of Scope tej Story

- Model Agent cards (STORY-1.4)
- Pipeline view i Activity Feed (STORY-1.5)
- Eval panel, Cost Tracker (STORY-1.6)
- NightClaw, Patterns, System Health (STORY-1.7)
- Sidebar navigation, tabs bar, multi-project switcher (STORY-1.8)
- Story Detail Modal (STORY-1.4)
- Autentykacja / autoryzacja
- Mobile responsive (Epic Out of Scope)
- WebSocket real-time (Epic Out of Scope)

---

## ✔️ Definition of Done

- [ ] `/app/page.tsx` renderuje `<OverviewPage />` i nie ma błędów TypeScript
- [ ] `KiraBanner` wyświetla się z wszystkimi 7 tagami w poprawnych kolorach (done/new/lock)
- [ ] 4 `StatCard` wyświetlają poprawne dane z `useStats()` — sprawdź visually przez porównanie z mockupem
- [ ] Velocity chart renderuje się jako bar chart za ostatnie 30 dni (Chart.js, typ `'bar'`)
- [ ] Kolory słupków są dynamiczne: fiolet/indigo/błękit w zależności od wartości (>= 20 / >= 15 / < 15)
- [ ] Loading state: skeleton animate-pulse widoczny przed załadowaniem danych
- [ ] Offline state: stat cards z "—", banner z "⚠️ Bridge offline...", chart z komunikatem tekstowym
- [ ] `useEffect` cleanup niszczy Chart.js instance przed odmontowaniem komponentu
- [ ] Kod przechodzi `npm run lint` bez błędów
- [ ] Brak `console.error` podczas normalnego ładowania strony
- [ ] Wszystkie 4 stany widoku działają (loading, offline, error, filled)
- [ ] Widok porównany wizualnie z mockupem (tab "Overview") — layout, kolory, font sizes zgodne
- [ ] Story review przez PO
