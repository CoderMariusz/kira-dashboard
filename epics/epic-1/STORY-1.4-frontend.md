---
story_id: STORY-1.4
title: "Mariusz widzi Model Agent cards ze sparklines i może otworzyć Story Detail Modal"
epic: EPIC-1
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
priority: must
estimated_effort: 8h
depends_on: [STORY-1.1, STORY-1.2, STORY-1.3]
blocks: [STORY-1.5]
tags: [model-cards, sparklines, chartjs, modal, story-detail, useRuns]
---

## 🎯 User Story

**Jako** Mariusz (Admin, developer systemu Kira)
**Chcę** widzieć 4 karty modeli AI (Kimi/GLM/Sonnet/Codex) ze sparkline chartami i metrykami, i móc kliknąć "✨ Analyze" by zobaczyć historię runów danego modelu w modalu
**Żeby** szybko ocenić wydajność każdego modelu i debugować nieudane runy bez otwierania CLI

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Route: `/` (Overview page) — sekcja "Model Agents" poniżej stat cards
Pliki: `/components/overview/ModelAgentsSection.tsx`, `/components/overview/ModelCard.tsx`, `/components/overview/StoryDetailModal.tsx`
Sekcja renderuje się wewnątrz `OverviewPage` z STORY-1.3, dodana po `<VelocityChart />`

### Powiązane pliki

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
  — sekcja `<!-- MODEL AGENTS -->` i `<!-- MODAL -->` (element `#storyModal`)
- **Hook:** `useRuns()` z STORY-1.2 (plik `/hooks/useRuns.ts`)
- **Typy:** `Run` z `/types/api.ts` (dostarczone przez STORY-1.2)
- **Komponent OverviewPage:** `/components/overview/OverviewPage.tsx` — tu dodasz `<ModelAgentsSection />`

### Stan systemu przed tą story

1. **STORY-1.1 DONE** — projekt Next.js 16, Chart.js zainstalowany (`npm install chart.js`)
2. **STORY-1.2 DONE** — `useRuns()` istnieje i zwraca `{ data: Run[], isLoading, isOffline, error, refresh }`
3. **STORY-1.3 DONE** — `OverviewPage.tsx` istnieje i renderuje KiraBanner, StatCards, VelocityChart
4. Typ `Run` z `/types/api.ts`:
   ```typescript
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

### AC-1: 4 Model Agent cards renderują się z poprawnymi ikonami, kolorami i rolami

GIVEN: Komponent `ModelAgentsSection` jest zamontowany na stronie Overview
WHEN: Strona się załaduje (niezależnie od danych — struktura kart jest statyczna)
THEN:
- Ponad kartami renderuje się nagłówek sekcji w stylu:
  - "Model Agents" — font-size 14px, font-weight 700, color #e6edf3
  - "performance last 7 days — click for details" — font-size 11px, color #4b4569, margin-left 8px
  - "All runs →" — po prawej (margin-left: auto), font-size 11px, color #818cf8, cursor pointer
- Karty renderują się w `grid-4` (4 kolumny, gap 12px, margin-bottom 18px)
- **Karta 1 — Kimi K2.5:**
  - Ikona: 🌙, kwadrat 32×32px, bg `#1a3a5c`, border-radius 8px
  - Nazwa: "Kimi K2.5", font-size 13px, font-weight 700, color #e6edf3
  - Rola: "Easy · Short · Impl", font-size 10px, color #4b4569
  - Status (domyślnie Active): zielona kropka (6×6px, bg #4ade80) + tekst "Active" color #4ade80
- **Karta 2 — GLM-5:**
  - Ikona: ⚡, bg `#1a3a1a`
  - Nazwa: "GLM-5"
  - Rola: "Frontend · Heartbeat"
  - Status: Active
- **Karta 3 — Sonnet 4.6:**
  - Ikona: 🎵, bg `#2d1b4a`
  - Nazwa: "Sonnet 4.6"
  - Rola: "Medium · Review · Main"
  - Status: Active
- **Karta 4 — Codex 5.3:**
  - Ikona: 🔴, bg `#3a1a1a`
  - Nazwa: "Codex 5.3"
  - Rola: "Hard · Infra Review"
  - Status: Idle (żółta kropka 6×6px, bg #d29922 + tekst "Idle" color #d29922)
AND:
- Każda karta: bg `#1a1730`, border `1px solid #2a2540`, border-radius 10px, padding 13px
- On hover: border-color `#3b3d7a`, transform `translateY(-1px)`, box-shadow `0 4px 20px rgba(0,0,0,.3)`, transition 0.15s

### AC-2: Każda karta wyświetla metryki obliczone z useRuns()

GIVEN: `useRuns()` zwraca tablicę runów, w tym runy dla modeli "kimi", "glm", "sonnet", "codex"
WHEN: `ModelAgentsSection` przetwarza dane runów
THEN: Każda karta wyświetla 3 metryki w gridzie 3 kolumn:
- **Runs count** — liczba runów dla tego modelu (filtruj `runs.filter(r => r.model === modelKey)`)
  - Label: "Runs", font-size 9px, color #6b7280
  - Wartość: liczba całkowita, font-size 16px, font-weight 800, color #e6edf3
- **Success Rate** — % runów ze statusem DONE spośród wszystkich runów tego modelu
  - Formuła: `(runs.filter(r => r.model === modelKey && r.status === 'DONE').length / runs.filter(r => r.model === modelKey).length * 100).toFixed(1) + '%'`
  - Jeśli brak runów: "—"
  - Label: "Success", font-size 9px, color #6b7280
- **Avg Duration** — średni `duration_seconds` wszystkich runów tego modelu, sformatowany jako minuty z 1 miejscem po przecinku + "m"
  - Formuła: `(średnia_duration_seconds / 60).toFixed(1) + 'm'`
  - Jeśli brak runów: "—"
  - Label: "Avg", font-size 9px, color #6b7280
AND:
- Metryki grid: `display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 9px`
- Wartość metryki (`.mv`): font-size 16px, font-weight 800, color #e6edf3
- Label metryki (`.ml`): font-size 9px, color #6b7280

### AC-3: Sparkline chart renderuje się dla każdego modelu (Chart.js, ostatnie 10 runów)

GIVEN: `useRuns()` zwraca runy dla modelu "kimi" (np. 22 runy)
WHEN: Karta Kimi K2.5 jest zamontowana
THEN:
- Kontener sparkline: wysokość 40px, margin-bottom 9px
- Renderuje się Chart.js line chart z danymi ostatnich 10 runów dla tego modelu (posortowanych `created_at` ASC)
- Oś X: indeksy (0-9), ukryta (`display: false`)
- Oś Y: wartości runs count skumulowany (cumulative sum) — tj. dane to `[1, 2, 3, 4, ...]` reprezentujące narastającą liczbę runów
  - Alternatywnie: dane to `run.duration_seconds` kolejnych runów — implementuj jako narastającą sumę runs count (tak jak w mockupie, gdzie krzywa rośnie stopniowo)
  - **Dokładna logika:** weź ostatnie 10 runów danego modelu. Dla każdego runu wartość na wykresie = indeks + 1 (tj. dla runu #1 → 1, #2 → 2, ... #10 → 10). To symuluje trend narastający jak w mockupie.
- Kolor linii per model:
  - Kimi: `rgb(56,189,248)` (sky blue)
  - GLM: `rgb(74,222,128)` (green)
  - Sonnet: `rgb(167,139,250)` (purple)
  - Codex: `rgb(248,113,113)` (red)
- Fill (area pod linią): `backgroundColor = kolor_linii.replace('rgb', 'rgba').replace(')', ',0.12)')` — np. `rgba(56,189,248,0.12)`
- `borderWidth: 1.5, pointRadius: 0, tension: 0.4`
- `plugins.legend.display: false`
- `scales.x.display: false, scales.y.display: false`
- `animation: false, responsive: true, maintainAspectRatio: false`
AND:
- Sparkline musi mieć cleanup: zniszcz Chart.js instance w `useEffect` cleanup function
- Jeśli model ma 0 runów: kontener 40px wyświetla pusty szary prostokąt bg `#13111c`

### AC-4: Kliknięcie "✨ Analyze" otwiera Story Detail Modal z runami danego modelu

GIVEN: Użytkownik widzi karte "Kimi K2.5" z danymi runów
WHEN: Klika przycisk "✨ Analyze" (`.btn-p`) na karcie Kimi
THEN:
- Modal (`StoryDetailModal`) otwiera się jako overlay nad całą stroną
- Overlay: `position: fixed, inset: 0, background: rgba(0,0,0,0.65), backdrop-filter: blur(4px), z-index: 100`
- Modal container: `width: 540px, max-height: 80vh, overflow-y: auto, background: #1a1730, border: 1px solid #3b3d7a, border-radius: 14px, box-shadow: 0 20px 60px rgba(0,0,0,0.6)`
- Animacja otwarcia: `opacity: 0 → 1, translateY: 16px → 0` przez 0.2s ease (CSS `@keyframes fadeUp`)
- **Header modalu:**
  - Ikona 🤖 w kwadracie 40×40px, bg #2d1b4a, border-radius 10px, font-size 20px
  - Tytuł: "Kimi K2.5 — Easy · Short · Impl", font-size 16px, font-weight 700, color #e6edf3
  - ID/subtitle: `"model: kimi · 22 runs · 100% success · avg 3.5m"` — font-size 12px, color #818cf8
  - Przycisk ✕: width 28px, height 28px, bg #2a2540, border-radius 7px, color #6b7280, font-size 14px
AND:
- Overlay klikany: kliknięcie w overlay (poza modalem) zamyka modal
- Klawisz Escape zamyka modal

### AC-5: Modal wyświetla listę ostatnich 10 runów danego modelu

GIVEN: Modal dla modelu "kimi" jest otwarty
WHEN: Modal się załaduje
THEN:
- **Sekcja "Metadata":**
  - Nagłówek sekcji: "METADATA", font-size 11px, font-weight 700, color #4b4569, uppercase, letter-spacing 0.07em, margin-bottom 8px
  - Grid 2×2: 4 pola — "Model", "Runs", "Success Rate", "Avg Duration"
  - Każde pole (`.meta-item`): bg #13111c, border-radius 7px, padding 8px 11px
    - Label (`.ml`): font-size 10px, color #4b4569
    - Wartość (`.mv`): font-size 13px, font-weight 600, color #e6edf3
- **Sekcja "Recent Runs (last 10)":**
  - Nagłówek: "RECENT RUNS (LAST 10)", uppercase, font-size 11px
  - Lista ostatnich 10 runów tego modelu (posortowanych `created_at` DESC — najnowsze pierwsze)
  - Każdy run-row:
    - Background: #13111c, border-radius 7px, padding 8px 11px, display flex, gap 9px
    - Step (`.rr-step`): `run.step` uppercase, font-size 11px, font-weight 700, color #818cf8, width 70px, flex-shrink 0
    - Model+info (`.rr-model`): `run.story_id + ' · ' + run.story_title`, font-size 11px, color #6b7280, flex 1 (truncate jeśli za długi: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`)
    - Duration (`.rr-dur`): `(run.duration_seconds / 60).toFixed(1) + 'm'`, font-size 11px, color #6b7280, width 44px, text-align right
    - Status badge (`.rr-st`): font-size 10px, padding 2px 7px, border-radius 7px, font-weight 600
      - DONE: bg #1a3a1a, color #4ade80
      - REFACTOR: bg #3a2a00, color #fbbf24
      - IN_PROGRESS: bg #1a3a5c, color #60a5fa
      - REVIEW: bg #2d1b4a, color #a78bfa
      - MERGE: bg #1a2a1a, color #34d399
- **Footer modalu:**
  - Przycisk "Close" (`.mf-btn-s`): bg #2a2540, color #6b7280, padding 7px 18px, border-radius 8px, font-size 12px
  - Przycisk "View Full Story →" (`.mf-btn-p`): gradient `linear-gradient(135deg,#7c3aed,#3b82f6)`, color #fff, padding 7px 18px, border-radius 8px, font-size 12px, font-weight 600
  - Footer padding: 12px 20px 16px, border-top 1px solid #2a2540, display flex, gap 9px, justify-content flex-end

### AC-6: Empty state gdy model ma 0 runów

GIVEN: `useRuns()` zwraca puste `data: []` LUB żaden run nie ma `model === 'codex'`
WHEN: Karta Codex 5.3 renderuje się
THEN:
- Metryki wyświetlają "—" zamiast liczb
- Sparkline kontener (40px) wyświetla pusty prostokąt bg #13111c, border-radius 4px — bez canvas
- Przycisk "✨ Analyze" jest widoczny i klikalny (modal się otworzy z pustą listą runów)
- W modalu, sekcja "Recent Runs": zamiast listy runów wyświetla komunikat:
  - Tekst: "Brak runów dla tego modelu" (font-size 12px, color #4b4569, padding 16px, text-align center)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

Route: `/` (Overview page, rozszerzenie STORY-1.3)
Pliki do stworzenia:
```
/components/overview/ModelAgentsSection.tsx    ← sekcja z nagłówkiem + 4 karty
/components/overview/ModelCard.tsx             ← pojedyncza karta modelu
/components/overview/ModelSparkline.tsx        ← Chart.js sparkline wrapper
/components/overview/StoryDetailModal.tsx      ← modal z historią runów
```
Plik do modyfikacji:
```
/components/overview/OverviewPage.tsx          ← dodaj <ModelAgentsSection /> po VelocityChart
```

### Konfiguracja modeli (stała w kodzie)

Utwórz stałą `MODEL_CONFIG` w `/components/overview/ModelAgentsSection.tsx`:

```typescript
const MODEL_CONFIG = [
  {
    key: 'kimi',           // klucz do filtrowania run.model
    name: 'Kimi K2.5',
    icon: '🌙',
    iconBg: '#1a3a5c',
    role: 'Easy · Short · Impl',
    status: 'active' as const,    // 'active' | 'idle'
    sparklineColor: 'rgb(56,189,248)',
  },
  {
    key: 'glm',
    name: 'GLM-5',
    icon: '⚡',
    iconBg: '#1a3a1a',
    role: 'Frontend · Heartbeat',
    status: 'active' as const,
    sparklineColor: 'rgb(74,222,128)',
  },
  {
    key: 'sonnet',
    name: 'Sonnet 4.6',
    icon: '🎵',
    iconBg: '#2d1b4a',
    role: 'Medium · Review · Main',
    status: 'active' as const,
    sparklineColor: 'rgb(167,139,250)',
  },
  {
    key: 'codex',
    name: 'Codex 5.3',
    icon: '🔴',
    iconBg: '#3a1a1a',
    role: 'Hard · Infra Review',
    status: 'idle' as const,
    sparklineColor: 'rgb(248,113,113)',
  },
] as const
```

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `ModelAgentsSection` | Section container | `runs: Run[]`, `isLoading`, `isOffline` | loading, offline, filled |
| `ModelCard` | Card | `config: ModelConfig`, `runs: Run[]`, `isLoading`, `onAnalyze: () => void` | loading, empty, filled |
| `ModelSparkline` | Chart | `data: number[]`, `color: string` | empty (no canvas), filled |
| `StoryDetailModal` | Modal | `isOpen: boolean`, `onClose: () => void`, `modelConfig: ModelConfig`, `runs: Run[]` | empty-runs, filled |

### Implementacja krok po kroku

#### Krok 1: `ModelAgentsSection.tsx`

```tsx
'use client'
import { useState } from 'react'
import type { Run } from '@/types/api'
import ModelCard from './ModelCard'
import StoryDetailModal from './StoryDetailModal'

const MODEL_CONFIG = [ /* ... jak wyżej ... */ ]

interface ModelAgentsSectionProps {
  runs: Run[]
  isLoading: boolean
  isOffline: boolean
}

export default function ModelAgentsSection({ runs, isLoading, isOffline }: ModelAgentsSectionProps) {
  const [modalModel, setModalModel] = useState<typeof MODEL_CONFIG[number] | null>(null)

  return (
    <>
      {/* Nagłówek sekcji */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#e6edf3', flex: 1 }}>Model Agents</h3>
        <span style={{ fontSize: '11px', color: '#4b4569', marginLeft: '8px' }}>performance last 7 days — click for details</span>
        <span style={{ fontSize: '11px', color: '#818cf8', cursor: 'pointer', marginLeft: 'auto' }}>All runs →</span>
      </div>

      {/* 4 karty */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' }}>
        {MODEL_CONFIG.map(cfg => {
          const modelRuns = runs.filter(r => r.model === cfg.key)
          return (
            <ModelCard
              key={cfg.key}
              config={cfg}
              runs={modelRuns}
              isLoading={isLoading}
              onAnalyze={() => setModalModel(cfg)}
            />
          )
        })}
      </div>

      {/* Modal */}
      {modalModel && (
        <StoryDetailModal
          isOpen={true}
          onClose={() => setModalModel(null)}
          modelConfig={modalModel}
          runs={runs.filter(r => r.model === modalModel.key)}
        />
      )}
    </>
  )
}
```

#### Krok 2: `ModelCard.tsx`

```tsx
'use client'
import ModelSparkline from './ModelSparkline'
import type { Run } from '@/types/api'

interface ModelConfig {
  key: string; name: string; icon: string; iconBg: string;
  role: string; status: 'active' | 'idle'; sparklineColor: string;
}

interface ModelCardProps {
  config: ModelConfig
  runs: Run[]
  isLoading: boolean
  onAnalyze: () => void
}

export default function ModelCard({ config, runs, isLoading, onAnalyze }: ModelCardProps) {
  // Oblicz metryki
  const totalRuns = runs.length
  const doneRuns = runs.filter(r => r.status === 'DONE').length
  const successRate = totalRuns > 0 ? `${(doneRuns / totalRuns * 100).toFixed(1)}%` : '—'
  const avgDuration = totalRuns > 0
    ? `${(runs.reduce((sum, r) => sum + r.duration_seconds, 0) / totalRuns / 60).toFixed(1)}m`
    : '—'

  // Sparkline data — ostatnie 10 runów, indeksy 1..n
  const last10 = [...runs].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-10)
  const sparklineData = last10.map((_, i) => i + 1)

  return (
    <div
      style={{
        background: '#1a1730', border: '1px solid #2a2540', borderRadius: '10px',
        padding: '13px', cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#3b3d7a'
        el.style.transform = 'translateY(-1px)'
        el.style.boxShadow = '0 4px 20px rgba(0,0,0,.3)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = '#2a2540'
        el.style.transform = 'translateY(0)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Head: icon + name + role + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '32px', height: '32px', background: config.iconBg, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
          {config.icon}
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#e6edf3' }}>{config.name}</div>
          <div style={{ fontSize: '10px', color: '#4b4569' }}>{config.role}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: config.status === 'active' ? '#4ade80' : '#d29922' }} />
          <span style={{ color: config.status === 'active' ? '#4ade80' : '#d29922' }}>
            {config.status === 'active' ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '9px' }}>
        {[
          { value: String(totalRuns), label: 'Runs' },
          { value: successRate, label: 'Success' },
          { value: avgDuration, label: 'Avg' },
        ].map(({ value, label }) => (
          <div key={label}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#e6edf3' }}>{isLoading ? '—' : value}</div>
            <div style={{ fontSize: '9px', color: '#6b7280' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      <div style={{ height: '40px', marginBottom: '9px' }}>
        {sparklineData.length > 0 && !isLoading
          ? <ModelSparkline data={sparklineData} color={config.sparklineColor} />
          : <div style={{ height: '40px', background: '#13111c', borderRadius: '4px' }} />
        }
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <button
          onClick={e => { e.stopPropagation(); onAnalyze() }}
          style={{
            padding: '5px', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
            color: '#fff', border: 'none', borderRadius: '6px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer', textAlign: 'center'
          }}
        >
          ✨ Analyze
        </button>
        <button
          style={{
            padding: '5px', background: '#2a2540', color: '#6b7280',
            border: 'none', borderRadius: '6px', fontSize: '11px', cursor: 'pointer'
          }}
        >
          Runs
        </button>
      </div>
    </div>
  )
}
```

#### Krok 3: `ModelSparkline.tsx`

> **WAŻNE:** Każda instancja musi mieć własny ref i cleanup. Używaj `'use client'`.

```tsx
'use client'
import { useEffect, useRef } from 'react'

interface ModelSparklineProps {
  data: number[]
  color: string
}

export default function ModelSparkline({ data, color }: ModelSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return

    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }

      // Wyprowadź fillColor z color: 'rgb(R,G,B)' → 'rgba(R,G,B,0.12)'
      const fillColor = color.replace('rgb', 'rgba').replace(')', ',0.12)')

      chartRef.current = new Chart(canvasRef.current!, {
        type: 'line',
        data: {
          labels: data.map((_, i) => i),
          datasets: [{
            data,
            borderColor: color,
            borderWidth: 1.5,
            fill: true,
            backgroundColor: fillColor,
            pointRadius: 0,
            tension: 0.4
          }]
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          animation: false,
          responsive: true,
          maintainAspectRatio: false
        }
      })
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [data, color])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
```

#### Krok 4: `StoryDetailModal.tsx`

```tsx
'use client'
import { useEffect } from 'react'
import type { Run } from '@/types/api'

interface ModelConfig {
  key: string; name: string; icon: string; role: string;
  sparklineColor: string; status: 'active' | 'idle';
}

interface StoryDetailModalProps {
  isOpen: boolean
  onClose: () => void
  modelConfig: ModelConfig
  runs: Run[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  DONE:        { bg: '#1a3a1a', color: '#4ade80' },
  REFACTOR:    { bg: '#3a2a00', color: '#fbbf24' },
  IN_PROGRESS: { bg: '#1a3a5c', color: '#60a5fa' },
  REVIEW:      { bg: '#2d1b4a', color: '#a78bfa' },
  MERGE:       { bg: '#1a2a1a', color: '#34d399' },
}

export default function StoryDetailModal({ isOpen, onClose, modelConfig, runs }: StoryDetailModalProps) {
  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Ostatnie 10 runów (DESC — najnowsze pierwsze)
  const last10 = [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 10)

  const totalRuns = runs.length
  const doneRuns = runs.filter(r => r.status === 'DONE').length
  const successRate = totalRuns > 0 ? `${(doneRuns / totalRuns * 100).toFixed(1)}%` : '—'
  const avgDuration = totalRuns > 0
    ? `${(runs.reduce((s, r) => s + r.duration_seconds, 0) / totalRuns / 60).toFixed(1)}m`
    : '—'

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
            {modelConfig.icon}
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#e6edf3' }}>{modelConfig.name} — {modelConfig.role}</div>
            <div style={{ fontSize: '12px', color: '#818cf8', marginTop: '2px' }}>
              model: {modelConfig.key} · {totalRuns} runs · {successRate} success · avg {avgDuration}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', width: '28px', height: '28px', background: '#2a2540', border: 'none', borderRadius: '7px', color: '#6b7280', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px' }}>
          {/* Metadata grid */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#4b4569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Metadata</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Model', value: modelConfig.key },
                { label: 'Total Runs', value: String(totalRuns) },
                { label: 'Success Rate', value: successRate },
                { label: 'Avg Duration', value: avgDuration },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#13111c', borderRadius: '7px', padding: '8px 11px' }}>
                  <div style={{ fontSize: '10px', color: '#4b4569', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#e6edf3' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Runs list */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#4b4569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Recent Runs (last 10)</h4>
            {last10.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#4b4569', padding: '16px', textAlign: 'center' }}>
                Brak runów dla tego modelu
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {last10.map(run => {
                  const st = STATUS_STYLES[run.status] || STATUS_STYLES.DONE
                  return (
                    <div key={run.id} style={{ display: 'flex', alignItems: 'center', gap: '9px', background: '#13111c', borderRadius: '7px', padding: '8px 11px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', width: '70px', flexShrink: 0 }}>{run.step}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {run.story_id} · {run.story_title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', width: '44px', textAlign: 'right' }}>
                        {(run.duration_seconds / 60).toFixed(1)}m
                      </div>
                      <div style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '7px', fontWeight: 600, background: st.bg, color: st.color }}>
                        {run.status}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', borderTop: '1px solid #2a2540', display: 'flex', gap: '9px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 18px', background: '#2a2540', color: '#6b7280', border: 'none', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
            Close
          </button>
          <button style={{ padding: '7px 18px', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
            View Full Story →
          </button>
        </div>
      </div>

      {/* Animacja fadeUp — wstaw w global CSS lub jako <style> tag */}
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

#### Krok 5: Modyfikacja `OverviewPage.tsx`

Dodaj `<ModelAgentsSection />` po `<VelocityChart />`:

```tsx
// W OverviewPage.tsx, po <VelocityChart ... />:
import ModelAgentsSection from './ModelAgentsSection'

// W JSX:
<VelocityChart runs={runs} isLoading={runsLoading} isOffline={runsOffline} />
<ModelAgentsSection runs={runs} isLoading={runsLoading} isOffline={runsOffline} />
```

### Stany widoku

**Loading:**
- Karty wyświetlają się ze szkieletem: metryki to "—", sparkline to pusty szary blok

**Empty (brak runów dla modelu):**
- Metryki: "—" dla wszystkich 3 pól
- Sparkline: pusty prostokąt bg #13111c
- Modal: komunikat "Brak runów dla tego modelu"

**Error / Offline:**
- Takie same jak Empty — gdy `isOffline: true`, `runs = []`, metryki "—"

**Filled (normalny stan):**
- Karty z metrykami, sparklinami i przyciskami

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na / → OverviewPage montuje ModelAgentsSection z runs=[] na początku
2. useRuns() ładuje dane → ModelAgentsSection dostaje pełną tablicę runs
3. ModelCard(kimi) filtruje runs: runs.filter(r => r.model === 'kimi') → kimi_runs
4. Oblicza metryki: totalRuns, successRate, avgDuration z kimi_runs
5. ModelSparkline dostaje data=[1,2,...n] z ostatnich 10 runów kimi
6. Użytkownik klika "✨ Analyze" na karcie Kimi
7. ModelAgentsSection ustawia modalModel = MODEL_CONFIG[0] (kimi)
8. StoryDetailModal renderuje się z isOpen=true, runs=kimi_runs
9. Modal wyświetla animację fadeUp, overlay backdrop-filter blur
10. Użytkownik klika overlay lub ✕ lub Escape → onClose() → modalModel = null → modal znika
```

### Responsive / Dostępność

- **Desktop (1280px+):** 4 karty w jednym wierszu (grid repeat 4)
- Nie wymaga mobile responsiveness (Epic Out of Scope)
- **ARIA:** przycisk ✨ Analyze powinien mieć `aria-label={`Analyze ${config.name} runs`}`
- **Keyboard:** modal: focus-trap nie jest wymagany w MVP, ale Escape musi zamykać

### Design Reference

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
- **Sekcja:** `<!-- MODEL AGENTS -->` (grid-4 z `.model-card` komponentami) i `<!-- MODAL -->` (`#storyModal`)
- **Kolory kart:**
  - Kimi ikona bg: `#1a3a5c` (navy blue)
  - GLM ikona bg: `#1a3a1a` (dark green)
  - Sonnet ikona bg: `#2d1b4a` (dark purple)
  - Codex ikona bg: `#3a1a1a` (dark red)
- **Sparkline kolory:**
  - Kimi: `rgb(56,189,248)` — sky blue
  - GLM: `rgb(74,222,128)` — green
  - Sonnet: `rgb(167,139,250)` — purple
  - Codex: `rgb(248,113,113)` — red
- **Status dots:** Active = #4ade80 (green), Idle = #d29922 (amber)

---

## ⚠️ Edge Cases

### EC-1: Brak runów dla modelu — empty state

Scenariusz: `useRuns()` zwraca `[]` lub żaden run nie ma `model === 'codex'`
Oczekiwane zachowanie:
- Karta Codex 5.3 wyświetla "—" we wszystkich metrykach
- Sparkline: pusty prostokąt (bez canvas)
- Przycisk "✨ Analyze" jest klikalny — modal otwiera się z komunikatem "Brak runów dla tego modelu"
- Brak crasha JS (`.length`, `.reduce` na `[]` muszą być bezpieczne)

### EC-2: Tylko 1 run — sparkline z jednym punktem

Scenariusz: Model "codex" ma 1 run w bazie.
Oczekiwane zachowanie:
- `last10 = [run]`, `sparklineData = [1]`
- Chart.js line chart z jednym punktem renderuje się bez błędów
- Linia to poziomy odcinek lub pojedynczy punkt (Chart.js obsługuje to domyślnie)

### EC-3: Chart.js memory leak — wiele re-renderów

Scenariusz: `useRuns()` odświeża dane co 30s — komponent re-renduje się wielokrotnie
Oczekiwane zachowanie:
- W każdym `useEffect` PRZED `new Chart()` wywołaj `chartRef.current?.destroy()`
- Po odmontowaniu komponentu: `return () => { chartRef.current?.destroy() }`
- Brak błędu "Canvas is already in use by Chart.js"

### EC-4: Bardzo długi tytuł story w modalu

Scenariusz: `run.story_title = "Bardzo długa nazwa story która nie mieści się w jednym wierszu tabeli modal"` (>50 znaków)
Oczekiwane zachowanie:
- Element `.rr-model` ma `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Tytuł jest ucinany z "..." i nie łamie layoutu modal rows

---

## 🚫 Out of Scope tej Story

- Kliknięcie "View Full Story →" w modal (na razie brak akcji, tylko zamknięcie)
- Kliknięcie "Runs" button (osobna widok listy runów — Out of Scope dla MVP)
- Filtrowanie runów per epic lub po dacie
- Stat cards, Velocity chart (STORY-1.3)
- Pipeline view, Activity Feed (STORY-1.5)
- Sidebar navigation (STORY-1.8)

---

## ✔️ Definition of Done

- [ ] 4 model karty renderują się z poprawnymi ikonami, kolorami (ikona bg) i rolami
- [ ] Metryki (Runs, Success Rate, Avg Duration) są obliczane z `useRuns()` filtrowanego per model
- [ ] Sparkline Chart.js renderuje się dla każdego modelu w wysokości 40px
- [ ] Kolory sparkline są zgodne z konfiguracją: Kimi=niebieski, GLM=zielony, Sonnet=fioletowy, Codex=czerwony
- [ ] Kliknięcie "✨ Analyze" otwiera StoryDetailModal dla właściwego modelu
- [ ] Modal wyświetla Metadata grid (Model, Total Runs, Success Rate, Avg Duration)
- [ ] Modal wyświetla listę ≤10 ostatnich runów z poprawnym statusem badge (kolor per status)
- [ ] Modal zamyka się na: kliknięcie overlay, kliknięcie ✕, klawisz Escape
- [ ] Empty state: metryki "—", pusty sparkline, modal z komunikatem "Brak runów..."
- [ ] Chart.js cleanup w useEffect — brak "Canvas is already in use" error
- [ ] Kod przechodzi `npm run lint` bez błędów
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Wszystkie 4 stany widoku zaimplementowane (loading, empty, error, filled)
- [ ] Widok porównany wizualnie z mockupem (sekcja "Model Agents" i modal `#storyModal`)
- [ ] Story review przez PO
