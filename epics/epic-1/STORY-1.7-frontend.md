---
story_id: STORY-1.7
title: "Użytkownik widzi zakładkę Insights z NightClaw Digest, Patterns i System Health"
epic: EPIC-1
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: /Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html
api_reference: none (dane z Bridge API: /api/nightclaw/latest, /api/patterns, /api/health)
priority: must
estimated_effort: 10 h
depends_on: STORY-1.1, STORY-1.2
blocks: none
tags: [nightclaw, patterns, health, modal, auto-refresh, polling, frontend, tabs]
---

## 🎯 User Story

**Jako** Mariusz (admin, jedyny użytkownik dashboardu)
**Chcę** widzieć dedykowaną zakładkę `?tab=insights` z kartami: NightClaw Digest, Top Patterns i System Health
**Żeby** szybko ocenić stan wiedzy pipeline'u (wzorce, lekcje) oraz stan techniczny systemu (Bridge API, memU, DB) — bez konieczności odpytywania Bridge API ręcznie lub czytania logów

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

- **Route:** `http://localhost:3000/?tab=insights`
- **Plik strony:** `/src/app/page.tsx` (lub `/src/app/dashboard/page.tsx` — ten sam co inne taby, query param `tab=insights` aktywuje InsightsTab)
- **Nowe pliki do stworzenia:**
  - `/src/components/insights/InsightsTab.tsx` — główny kontener zakładki Insights (renderuje NightClawDigestCard + PatternsPanel + SystemHealthCard w siatce)
  - `/src/components/insights/NightClawDigestCard.tsx` — karta NightClaw Digest z linkiem do raportu i statystykami
  - `/src/components/insights/PatternsPanel.tsx` — karta z top 5 confirmed patterns + modal z pełnym opisem
  - `/src/components/insights/PatternModal.tsx` — modal z pełnym opisem klikniętego patternu (shadcn Dialog)
  - `/src/components/insights/SystemHealthCard.tsx` — karta z healthem Bridge API, memU, DB; auto-refresh co 60s

### Powiązane pliki (z poprzednich stories)

- `/src/lib/api-client.ts` — klient HTTP z STORY-1.1 (obsługuje BRIDGE_URL env var + offline state)
- `/src/hooks/useRuns.ts` — zdefiniowany w STORY-1.2 (nie używany bezpośrednio tu, ale wzorzec)
- Shadcn/ui Dialog komponent — zainstalowany w STORY-1.1 via `npx shadcn-ui@latest add dialog` lub analogicznie. Jeśli nie zainstalowany, wykonaj: `cd /path/to/project && npx shadcn-ui@latest add dialog`. Plik: `/src/components/ui/dialog.tsx`

### Stan systemu przed tą story

Przed rozpoczęciem implementacji MUSZĄ być gotowe:
1. **STORY-1.1** — projekt Next.js 16 istnieje, `npm run dev` działa na localhost:3000, shadcn/ui jest skonfigurowane (w szczególności komponent `Dialog` jest dostępny jako `/src/components/ui/dialog.tsx`), Tailwind CSS działa
2. **STORY-1.2** — wzorzec hooków React dla danych z Bridge API jest znany (pattern `useEffect` + `fetch` + `isLoading` + `data` + `error`)
3. **Bridge API** — `http://localhost:8199` (lub `process.env.NEXT_PUBLIC_BRIDGE_URL`) dostarcza endpointy:
   - `GET /api/nightclaw/latest` → dane dzisiejszego raportu NightClaw
   - `GET /api/patterns?limit=5&status=confirmed` → top 5 confirmed patterns
   - `GET /api/health` → status Bridge API (ping), last_run, alerty
   - `GET /api/health/memu` → status memU
   - `GET /api/health/db` → rozmiar DB w MB

### Nowe hooki do napisania w tej story

Ponieważ STORY-1.2 mogła nie zdefiniować hooków dla insights, ta story wymaga napisania 3 nowych hooków (lub można je zdefiniować inline w komponentach, ale preferowane osobne pliki):

- `/src/hooks/useNightClaw.ts` — fetchuje `GET /api/nightclaw/latest`
- `/src/hooks/usePatterns.ts` — fetchuje `GET /api/patterns?limit=5&status=confirmed`
- `/src/hooks/useHealth.ts` — fetchuje `GET /api/health` + `GET /api/health/memu` + `GET /api/health/db` jednocześnie (Promise.all), auto-refresh co 60s

---

## ✅ Acceptance Criteria

### AC-1: Zakładka Insights renderuje się po przejściu na ?tab=insights

GIVEN: Użytkownik otwiera dashboard pod adresem `http://localhost:3000`
WHEN: Użytkownik klika zakładkę "NightClaw 🌙" w pasku zakładek (tabs bar, widoczna jako ostatnia zakładka) lub wchodzi bezpośrednio na `http://localhost:3000/?tab=insights`
THEN: W obszarze treści (`.content`) renderuje się komponent `InsightsTab`, który zawiera 3 karty:
  - `NightClawDigestCard` — lewa lub pierwsza
  - `PatternsPanel` — środkowa lub druga
  - `SystemHealthCard` — prawa lub trzecia
AND: Karty są wyświetlone w siatce: na szerokości ≥1280px — layout trójkolumnowy (CSS grid: `display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;`), pasek class: `.grid-3` z mockupu
AND: URL w pasku przeglądarki pokazuje `?tab=insights`
AND: W tabs barze zakładka "NightClaw 🌙" ma aktywny styl: `color:#818cf8; border-bottom:2px solid #818cf8; font-weight:600; background:#13111c`

### AC-2: NightClawDigestCard wyświetla dane dzisiejszego raportu

GIVEN: Hook `useNightClaw()` wywołuje `GET http://{BRIDGE_URL}/api/nightclaw/latest` i otrzymuje odpowiedź 200 z danymi raportu
WHEN: Komponent `NightClawDigestCard` zostaje zamontowany
THEN: Wyświetla się karta z klasą `.nightclaw-card` ze stylami:
  - background: `linear-gradient(135deg, #13111c, #1a1730)`
  - border: `1px solid #3b3d7a`
  - border-radius: `10px`
  - padding: `14px`
  - cursor: `pointer`
  - transition: `.15s`
  - Hover: `border-color:#7c3aed; box-shadow:0 0 20px rgba(124,58,237,.2)`
AND: Wewnątrz karty wyświetla się header (`.nc-head`: flex, align-items:center, gap:10px, margin-bottom:10px):
  - Ikona 🌙 (`.nc-icon`: width:36px, height:36px, background:#1e1b4b, border-radius:9px, font-size:18px, display:flex, align-items:center, justify-content:center)
  - Tytuł "NightClaw Digest" (`.nc-title`: font-size:13px, font-weight:700, color:#e6edf3)
  - Pod tytułem sub-tekst ze sformatowaną datą raportu i informacją "kliknij aby otworzyć" (`.nc-sub`: font-size:10px, color:#4b4569), np. "19 Feb 2026 · kliknij aby otworzyć · auto-runs o 2:00"
AND: Poniżej headera wyświetla się siatka stats (`.nc-stats`: display:grid, grid-template-columns:1fr 1fr 1fr, gap:8px), każdy element:
  - `.nc-stat` (background:#13111c, border-radius:7px, padding:8px 10px)
  - `.nv` (font-size:18px, font-weight:700, color:#c4b5fd) — liczba
  - `.nl` (font-size:10px, color:#4b4569) — etykieta
  - Pierwsza komórka: liczba `new_patterns_today`, etykieta "New Patterns"
  - Druga komórka: liczba `lessons_extracted`, etykieta "Lessons"
  - Trzecia komórka: liczba `anti_patterns_flagged`, etykieta "Anti-patterns"
AND: Na dole karty wyświetla się timestamp ostatniego raportu (font-size:10px, color:#4b4569, margin-top:8px) w formacie "Ostatni raport: 19 Feb o 02:03"

### AC-3: NightClawDigestCard — kliknięcie otwiera link do raportu

GIVEN: `NightClawDigestCard` wyświetla dane raportu, w tym pole `file_url` z odpowiedzi API (np. `"/reports/nightclaw-2026-02-19.md"` lub pełny URL)
WHEN: Użytkownik klika kartę NightClaw Digest (cała karta jest clickable)
THEN: Jeśli `file_url` jest dostępny, otwiera się nowa karta przeglądarki (`target="_blank"`) z URL: `{BRIDGE_URL}{file_url}` — np. `http://localhost:8199/reports/nightclaw-2026-02-19.md`
AND: Karta pozostaje zaznaczona (focus) bez zmiany URL dashboardu

### AC-4: NightClawDigestCard — brak raportu (empty state)

GIVEN: Hook `useNightClaw()` zwraca odpowiedź 404 (brak raportu na dziś) lub API zwraca `null` jako dane
WHEN: Komponent `NightClawDigestCard` zostaje zamontowany
THEN: Zamiast danych stats, wyświetla się komunikat "No digest yet today" (font-size:13px, color:#4b4569, text-align:center, padding:16px 0)
AND: Header karty (z ikoną 🌙 i tytułem) nadal jest widoczny
AND: Karta NIE jest clickable (cursor:default, brak hover efektu) gdy brak raportu
AND: Pod komunikatem wyświetlony jest informacyjny tekst: "Raport NightClaw generowany automatycznie o 2:00 AM" (font-size:10px, color:#4b4569, text-align:center)

### AC-5: PatternsPanel wyświetla top 5 confirmed patterns

GIVEN: Hook `usePatterns()` wywołuje `GET http://{BRIDGE_URL}/api/patterns?limit=5&status=confirmed` i otrzymuje odpowiedź 200 z tablicą patterns
WHEN: Komponent `PatternsPanel` zostaje zamontowany
THEN: Wyświetla się karta (`.card`: background:#1a1730, border:1px solid #2a2540, border-radius:10px, padding:15px) z nagłówkiem (`.card-hdr`):
  - Tytuł "Top Patterns" (font-size:13px, font-weight:700, color:#e6edf3)
  - Link "All →" po prawej (`.see-all`: font-size:11px, color:#818cf8, cursor:pointer, margin-left:auto)
AND: Dla każdego pattern w tablicy (max 5) renderuje się wiersz (`.pat-row`: display:flex, align-items:center, gap:7px, background:#13111c, border-radius:6px, padding:6px 9px, margin-bottom:5px) zawierający:
  - Badge typu (`.pt`: font-size:9px, padding:2px 6px, border-radius:6px, font-weight:700) z kolorem zależnym od `type`:
    - `"PATTERN"` → background:`#1a3a5c`, color:`#60a5fa`, tekst: "PATTERN"
    - `"ANTI"` → background:`#3a1a1a`, color:`#f87171`, tekst: "ANTI"
    - `"LESSON"` → background:`#2d1b4a`, color:`#a78bfa`, tekst: "LESSON"
  - Temat (`.pat-topic`: font-size:12px, color:#e6edf3, flex:1) — wartość pola `topic` z API, np. "dev_code_review"
  - Liczba wystąpień (`.pat-count`: font-size:10px, color:#4b4569) — wartość pola `occurrence_count` z API w formacie "54×"
AND: Każdy wiersz `.pat-row` ma styl `cursor:pointer` i hover efekt: `background:#1f1c2e` (nieco jaśniejszy)

### AC-6: PatternsPanel — kliknięcie wiersza otwiera modal z pełnym opisem

GIVEN: `PatternsPanel` wyświetla listę patterns, użytkownik widzi co najmniej jeden wiersz
WHEN: Użytkownik klika na dowolny wiersz `.pat-row`
THEN: Otwiera się modal (komponent `PatternModal`) z następującą zawartością:
  - Nagłówek modalu z:
    - Ikoną zależną od typu: PATTERN→"🔵", ANTI→"🔴", LESSON→"🟣" (16px w div 32×32px z odpowiednim tłem)
    - Tytułem: wartość pola `topic` patternu (font-size:16px, font-weight:700, color:#e6edf3)
    - Podtytułem: typ + occurrence_count, np. "PATTERN · 54 wystąpień" (font-size:12px, color:#818cf8)
    - Przyciskiem zamknięcia "✕" (prawy górny róg)
  - Ciało modalu zawiera:
    - Sekcja "Opis" — pełny tekst pola `description` z API (font-size:13px, color:#6b7280, line-height:1.6, background:#13111c, border-radius:8px, padding:12px)
    - Sekcja "Statystyki" — dwa pola w grid 2×1: "Typ" (wartość) i "Wystąpienia" (occurrence_count + "×")
    - Sekcja "Powiązane stories" — jeśli API zwraca pole `related_stories: string[]`, wyświetl je jako listę (font-size:11px, color:#818cf8); jeśli pole nie istnieje lub jest puste, sekcja jest ukryta
AND: Modal jest implementowany jako shadcn/ui `Dialog` komponent (import z `/src/components/ui/dialog.tsx`)
AND: Modal zamyka się gdy:
  - Użytkownik kliknie przycisk "✕"
  - Użytkownik kliknie overlay (poza modalem)
  - Użytkownik naciśnie klawisz Escape

### AC-7: SystemHealthCard wyświetla status Bridge API, memU i DB

GIVEN: Hook `useHealth()` wykonuje 3 równoległe requesty: `GET /api/health`, `GET /api/health/memu`, `GET /api/health/db` — wszystkie zwracają status 200
WHEN: Komponent `SystemHealthCard` zostaje zamontowany
THEN: Wyświetla się karta (`.card`) z nagłówkiem "System Health" (font-size:13px, font-weight:700, color:#e6edf3) w `.card-hdr`
AND: Wewnątrz karty wyświetla się siatka health items (`.health-grid`: display:grid, grid-template-columns:1fr 1fr, gap:7px, margin-bottom:12px) z 4 komórkami (`.hi`: background:#13111c, border-radius:7px, padding:9px 11px):
  - Komórka 1 — "Bridge API":
    - Label: "Bridge API" (`.hl`: font-size:10px, color:#4b4569, margin-bottom:3px)
    - Wartość (`.hv`): `"● Online"` (color:#4ade80) gdy status=UP, `"● Offline"` (color:#f87171) gdy status=DOWN
    - Jeśli UP: pod wartością wyświetla się ping time: "ping: Xms" (font-size:9px, color:#4b4569)
  - Komórka 2 — "memU":
    - Label: "memU" (`.hl`)
    - Wartość: `"● Online"` lub `"● Offline"` — analogicznie jak Bridge API
  - Komórka 3 — "DB Size":
    - Label: "DB Size" (`.hl`)
    - Wartość: rozmiar w formacie "X.X MB" (font-size:12px, font-weight:600, color:#e6edf3) — wartość z `/api/health/db`
  - Komórka 4 — "Ostatni Run":
    - Label: "Last Run" (`.hl`)
    - Wartość: timestamp sformatowany jako "HH:MM" (tylko godzina i minuty) — wartość z `/api/health`

### AC-8: SystemHealthCard wyświetla alerty jako badges

GIVEN: `useHealth()` zwrócił dane zawierające tablicę `alerts` (każdy alert ma: `type: "CRITICAL"|"WARNING"|"INFO"|"OK"`, `message: string`, `detail: string`)
WHEN: Komponent `SystemHealthCard` renderuje sekcję alertów
THEN: Poniżej `.health-grid` wyświetla się sekcja alertów — dla każdego alertu wiersz (`.al-row`: display:flex, align-items:center, gap:7px, padding:6px 9px, background:#13111c, border-radius:6px, margin-bottom:5px):
  - Dot badge (`.al-dot`: width:6px, height:6px, border-radius:50%) z kolorem zależnym od typu:
    - `"CRITICAL"` → background:`#f85149` (czerwony)
    - `"WARNING"` → background:`#e3b341` (pomarańczowy)
    - `"INFO"` → background:`#60a5fa` (niebieski)
    - `"OK"` → background:`#4ade80` (zielony)
  - Tekst alertu (`.al-name`: font-size:12px, color:#e6edf3, flex:1) — wartość pola `message`
  - Detail (`.al-st`: font-size:10px, color:#4b4569) — wartość pola `detail`, max 30 znaków (truncate z `...`)
AND: Jeśli `alerts` jest pusta tablica, wyświetla się jeden wiersz ze statusem OK: dot zielony + tekst "System działa poprawnie" + detail ""

### AC-9: SystemHealthCard auto-refresh co 60 sekund

GIVEN: `SystemHealthCard` jest zamontowany i wyświetla dane health
WHEN: Upłynie 60 sekund od ostatniego fetcha (lub od momentu mountowania)
THEN: Hook `useHealth()` automatycznie wywołuje ponownie wszystkie 3 requesty (`GET /api/health`, `GET /api/health/memu`, `GET /api/health/db`) bez interakcji użytkownika
AND: Podczas re-fetcha dane nadal są wyświetlane (brak skeleton ani loading overlay) — tylko dane są cichym odświeżeniem w tle
AND: Po otrzymaniu nowych danych, widok aktualizuje się z nowymi wartościami (ping time, DB size, status)
AND: Gdy komponent jest unmountowany (użytkownik przechodzi na inny tab), interval jest czyszczony (`clearInterval`) — brak memory leaks

### AC-10: Wszystkie karty obsługują offline state

GIVEN: Bridge API jest niedostępne (fetch zwraca błąd sieciowy lub timeout)
WHEN: Hook `useNightClaw()`, `usePatterns()` lub `useHealth()` nie może pobrać danych
THEN: Dla każdej karty osobno:
  - `NightClawDigestCard` offline: wyświetla "Raport niedostępny — Bridge API offline" (font-size:12px, color:#4b4569, text-align:center, padding:16px 0)
  - `PatternsPanel` offline: wyświetla "Wzorce niedostępne — Bridge API offline" analogicznie
  - `SystemHealthCard` offline: wyświetla w komórkach health-grid `"● Offline"` (color:#f87171) dla Bridge API, `"—"` dla pozostałych (memU, DB size, Last Run) — bo nie można pobrać danych
AND: Żadna z kart NIE crashuje ani nie wyświetla białego ekranu — wszystkie obsługują error gracefully

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

- Route: `/?tab=insights`
- Główny komponent zakładki: `InsightsTab`
- Plik: `/src/components/insights/InsightsTab.tsx`
- Pliki do stworzenia: patrz sekcja "Nowe pliki do stworzenia" wyżej

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `InsightsTab` | Container | brak (hooki wewnątrz dzieci) | loading, filled |
| `NightClawDigestCard` | Card clickable | `data: NightClawData \| null`, `isLoading: boolean` | loading (skeleton), empty (no digest), offline, filled |
| `PatternsPanel` | Card z listą | `patterns: Pattern[] \| null`, `isLoading: boolean` | loading (skeleton), empty, offline, filled |
| `PatternModal` | shadcn Dialog | `pattern: Pattern \| null`, `open: boolean`, `onClose: () => void` | open, closed |
| `SystemHealthCard` | Card z health-grid | `data: HealthData \| null`, `isLoading: boolean` | loading (skeleton), offline (partial data), filled |

### Typy TypeScript (zdefiniuj w `/src/types/insights.ts`)

```typescript
// /src/types/insights.ts

export interface NightClawData {
  date: string;                   // ISO date np. "2026-02-19"
  timestamp: string;              // ISO datetime np. "2026-02-19T02:03:14Z"
  new_patterns_today: number;
  lessons_extracted: number;
  anti_patterns_flagged: number;
  file_url: string;               // np. "/reports/nightclaw-2026-02-19.md"
}

export interface Pattern {
  id: string;
  type: 'PATTERN' | 'ANTI' | 'LESSON';
  topic: string;                  // np. "dev_code_review"
  occurrence_count: number;
  description: string;            // pełny opis
  related_stories?: string[];     // opcjonalne, np. ["STORY-12.10", "STORY-13.8"]
}

export interface HealthItem {
  status: 'UP' | 'DOWN';
  ping_ms?: number;               // tylko dla Bridge API
}

export interface Alert {
  type: 'CRITICAL' | 'WARNING' | 'INFO' | 'OK';
  message: string;
  detail: string;
}

export interface HealthData {
  bridge: HealthItem;
  memu: HealthItem;
  db_size_mb: number;
  last_run: string;               // ISO datetime
  alerts: Alert[];
}
```

### Implementacja hooków

**`/src/hooks/useNightClaw.ts`** — wzorzec implementacji:
```typescript
import { useState, useEffect } from 'react';
import { NightClawData } from '@/types/insights';

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? 'http://localhost:8199';

export function useNightClaw() {
  const [data, setData] = useState<NightClawData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    
    fetch(`${BRIDGE_URL}/api/nightclaw/latest`, { signal: controller.signal })
      .then(res => {
        if (res.status === 404) return null;  // brak raportu dziś
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json); setError(null); })
      .catch(err => {
        if (err.name === 'AbortError') return;  // normalny cleanup
        setError(err.message);
        setData(null);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  return { data, isLoading, error };
}
```

**`/src/hooks/usePatterns.ts`** — analogiczny wzorzec, URL: `${BRIDGE_URL}/api/patterns?limit=5&status=confirmed`, zwraca `{ patterns: Pattern[] | null, isLoading, error }`

**`/src/hooks/useHealth.ts`** — wzorzec z auto-refresh:
```typescript
import { useState, useEffect, useRef } from 'react';
import { HealthData } from '@/types/insights';

const BRIDGE_URL = process.env.NEXT_PUBLIC_BRIDGE_URL ?? 'http://localhost:8199';
const REFRESH_INTERVAL_MS = 60_000; // 60 sekund

export function useHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealth = async () => {
    try {
      const [healthRes, memuRes, dbRes] = await Promise.all([
        fetch(`${BRIDGE_URL}/api/health`),
        fetch(`${BRIDGE_URL}/api/health/memu`),
        fetch(`${BRIDGE_URL}/api/health/db`),
      ]);
      
      if (!healthRes.ok || !memuRes.ok || !dbRes.ok) {
        throw new Error('Health endpoint error');
      }
      
      const [health, memu, db] = await Promise.all([
        healthRes.json(),
        memuRes.json(),
        dbRes.json(),
      ]);
      
      // Merge wyników w HealthData
      setData({
        bridge: { status: health.bridge_status ?? 'UP', ping_ms: health.ping_ms },
        memu: { status: memu.status ?? 'UP' },
        db_size_mb: db.size_mb ?? 0,
        last_run: health.last_run ?? '',
        alerts: health.alerts ?? [],
      });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();                                           // initial fetch
    intervalRef.current = setInterval(fetchHealth, REFRESH_INTERVAL_MS);  // auto-refresh
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);  // cleanup!
    };
  }, []);

  return { data, isLoading, error };
}
```

### Design Reference

- **Plik mockupu:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
- **Sekcja w mockupie:** Dolna część Overview tab — `<!-- NIGHTCLAW + COST + PATTERNS -->` (grid-3: 3 kolumny). W STORY-1.7 implementujemy **tab Insights** który przenosi te komponenty do dedykowanej zakładki i rozszerza je o: modal dla patterns, pełne alerty, link do raportu NightClaw
- **Szczegóły designu:**

**NightClawDigestCard:**
  - Karta gradient: `background: linear-gradient(135deg, #13111c, #1a1730)`, `border: 1px solid #3b3d7a`
  - Hover: `border-color: #7c3aed`, `box-shadow: 0 0 20px rgba(124,58,237,.2)`
  - Ikona 🌙: div 36×36px, `background: #1e1b4b`, `border-radius: 9px`
  - Tytuł: 13px, 700 weight, `#e6edf3`
  - Sub: 10px, `#4b4569`
  - Stats grid: 3 kolumny, gap 8px, każda komórka `background: #13111c`, `border-radius: 7px`, padding 8px 10px
  - Liczby stats: 18px, 700 weight, `#c4b5fd` (fioletowy pastelowy)
  - Etykiety stats: 10px, `#4b4569`
  - Empty state: tekst "No digest yet today" 13px `#4b4569`, centered

**PatternsPanel:**
  - Karta: `background: #1a1730`, `border: 1px solid #2a2540`, `border-radius: 10px`, `padding: 15px`
  - Nagłówek `card-hdr`: tytuł 13px 700 `#e6edf3`, link "All →" 11px `#818cf8`
  - Wiersz `.pat-row`: `background: #13111c`, `border-radius: 6px`, `padding: 6px 9px`, `margin-bottom: 5px`
  - Badge PATTERN: `background: #1a3a5c`, `color: #60a5fa`
  - Badge ANTI: `background: #3a1a1a`, `color: #f87171`
  - Badge LESSON: `background: #2d1b4a`, `color: #a78bfa`
  - Badge base: 9px, `padding: 2px 6px`, `border-radius: 6px`, `font-weight: 700`
  - Temat: 12px, `#e6edf3`, flex:1
  - Count: 10px, `#4b4569`

**PatternModal (shadcn Dialog):**
  - Overlay: `background: rgba(0,0,0,.65)`, `backdrop-filter: blur(4px)`
  - Modal: `background: #1a1730`, `border: 1px solid #3b3d7a`, `border-radius: 14px`, `width: 540px`, `max-height: 80vh`, `overflow-y: auto`
  - Modal header: `padding: 18px 20px 12px`, `border-bottom: 1px solid #2a2540`
  - Tytuł: 16px, 700, `#e6edf3`
  - Subtitle/ID: 12px, `#818cf8`
  - Przycisk zamknięcia: 28×28px, `background: #2a2540`, `border-radius: 7px`, kolor `#6b7280`; hover: `background: #3b3d7a`, `color: #e6edf3`
  - Sekcje body: `margin-bottom: 16px`
  - Nagłówki sekcji: 11px, 700, `#4b4569`, uppercase, `letter-spacing: .07em`
  - Tekst opisu: `background: #13111c`, `border-radius: 8px`, `padding: 10px 12px`, 12px, `#6b7280`, `line-height: 1.6`

**SystemHealthCard:**
  - Karta: `background: #1a1730`, `border: 1px solid #2a2540`, `border-radius: 10px`, `padding: 15px`
  - health-grid: grid 2 kolumny, gap 7px, margin-bottom 12px
  - Każda komórka `.hi`: `background: #13111c`, `border-radius: 7px`, `padding: 9px 11px`
  - Label `.hl`: 10px, `#4b4569`, margin-bottom 3px
  - Wartość `.hv`: 12px, 600 weight, `#e6edf3`; gdy online: `.hv.ok` → `#4ade80`
  - Alert row `.al-row`: flex, gap 7px, padding 6px 9px, `background: #13111c`, `border-radius: 6px`, margin-bottom 5px
  - Dot CRITICAL: `#f85149`, WARNING: `#e3b341`, INFO: `#60a5fa`, OK: `#4ade80`
  - Alert message: 12px, `#e6edf3`, flex:1
  - Alert detail: 10px, `#4b4569`

### Stany widoku

**Loading (isLoading = true dla danej karty):**
- `NightClawDigestCard` loading: zamiast headera — placeholder 100%×36px + placeholder 36px×36px (ikona), zamiast nc-stats — 3 prostokąty 100%×54px; wszystko tło `#2a2540`, `animate-pulse`
- `PatternsPanel` loading: 5 prostokątów 100%×36px tło `#2a2540`, `animate-pulse`
- `SystemHealthCard` loading: 4 prostokąty w siatce 2×2 (50%×52px każdy) tło `#2a2540`, `animate-pulse`

**Empty (brak danych, ale nie błąd):**
- `NightClawDigestCard`: "No digest yet today" + informacja o auto-run (AC-4)
- `PatternsPanel` empty: "Brak potwierdzonych wzorców" (font-size:12px, color:#4b4569, text-align:center, padding:16px 0)
- `SystemHealthCard` empty: komórki z "—" zamiast wartości (data=null)

**Offline (błąd sieciowy):**
- Każda karta wyświetla swój offline komunikat — patrz AC-10
- Żadna karta nie crashuje — obsługa przez try/catch w hookach

**Filled (normalny stan, dane załadowane):**
- `NightClawDigestCard`: header + stats 3 liczb
- `PatternsPanel`: 5 wierszy z badge, temat, count; klikalne
- `SystemHealthCard`: health-grid + alerty

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na http://localhost:3000/?tab=insights
2. Strona renderuje InsightsTab — montuje 3 komponenty jednocześnie
3. Każdy komponent wywołuje swój hook:
   - NightClawDigestCard → useNightClaw() → GET /api/nightclaw/latest
   - PatternsPanel → usePatterns() → GET /api/patterns?limit=5&status=confirmed
   - SystemHealthCard → useHealth() → Promise.all([GET /api/health, GET /api/health/memu, GET /api/health/db])
4. Podczas ładowania (isLoading=true) → każda karta niezależnie pokazuje skeleton
5. Dane załadowane → każda karta aktualizuje się niezależnie (nie czekają na siebie)

--- NightClaw flow ---
6. Jeśli GET /api/nightclaw/latest → 200: NightClawDigestCard wyświetla dane + stats
7. Jeśli GET /api/nightclaw/latest → 404: NightClawDigestCard wyświetla "No digest yet today"
8. Użytkownik klika kartę NightClaw → otwiera file_url w nowej karcie przeglądarki

--- Patterns flow ---
9. Lista 5 patterns wyświetlona
10. Użytkownik klika na wiersz pattern → stan `selectedPattern` ustawiony → PatternModal otwiera się
11. Modal wyświetla pełne dane patternu (topic, type, occurrence_count, description, related_stories)
12. Użytkownik klika "✕" lub overlay lub Escape → modal się zamyka → selectedPattern = null

--- Health flow ---
13. SystemHealthCard wyświetla health-grid z danymi z wszystkich 3 endpoints
14. Po 60s → useHealth() automatycznie re-fetchuje bez interakcji użytkownika
15. Nowe dane podmieniane w tle (bez blinku/skeleton)
16. Użytkownik przechodzi na inny tab → setInterval jest czyszczony (cleanup w useEffect)
```

### Responsive / Dostępność

- Desktop (1280px+): 3 karty w grid-3 (`.grid-3`: `grid-template-columns: 1fr 1fr 1fr; gap: 14px`)
- Tablet/Mobile: poza zakresem tej story (epic zakłada desktop-first 1440px+)
- Keyboard navigation:
  - Pattern rows: dostępne przez Tab, aktywowane Enter/Space
  - Każdy `.pat-row` ma `tabIndex={0}`, `role="button"`, `onKeyDown` handler (Enter → openModal)
  - Modal: focus trap wewnątrz dialogu (shadcn Dialog obsługuje to automatycznie)
  - Escape zamyka modal (shadcn Dialog obsługuje to automatycznie)
  - NightClawDigestCard: ma `tabIndex={0}`, `role="link"` gdy data dostępna, `onKeyDown` handler
- ARIA:
  - `NightClawDigestCard`: `role="link"`, `aria-label="Otwórz raport NightClaw z dnia {data.date}"`
  - `PatternsPanel`: `role="region"`, `aria-label="Top 5 potwierdzonych wzorców"`
  - Każdy `.pat-row`: `role="button"`, `aria-label="Otwórz szczegóły wzorca: {pattern.topic}"`
  - `PatternModal`: shadcn Dialog ma wbudowane `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
  - `SystemHealthCard`: `role="region"`, `aria-label="System Health — odświeżany co 60 sekund"`, `aria-live="polite"` na kontenerze alertów (żeby screen reader ogłaszał zmiany)

---

## ⚠️ Edge Cases

### EC-1: useHealth() — jeden z 3 endpoints niedostępny (częściowa awaria)

Scenariusz: Bridge API jest UP, ale endpoint `/api/health/memu` zwraca 503 lub timeout
Oczekiwane zachowanie: `Promise.all` nie jest używany bezpośrednio z `Promise.all` bo to rzuciłoby cały Promise — zamiast tego użyj `Promise.allSettled`:
```typescript
const [healthResult, memuResult, dbResult] = await Promise.allSettled([...]);
```
Każdy wynik sprawdzany osobno: jeśli `memuResult.status === 'rejected'`, ustaw `memu: { status: 'DOWN' }`. Pozostałe dane są nadal wyświetlane poprawnie.
Komunikat dla użytkownika: W komórce "memU" wyświetla się "● Offline" (color:#f87171). Pozostałe komórki działają normalnie.

### EC-2: Patterns API zwraca patterns z nieznanym typem

Scenariusz: API zwraca pattern z `type: "UNKNOWN"` lub innym nieobsługiwanym typem
Oczekiwane zachowanie: Badge renderuje się z domyślnym stylem: `background:#2a2540, color:#6b7280`, tekst "???" — NIE crashuje z "Cannot read property of undefined". Opis w modalu jest nadal wyświetlony.
Komunikat dla użytkownika: Brak specjalnego komunikatu — badge "???" jest wystarczającym sygnałem

### EC-3: NightClaw file_url jest niepoprawny lub plik nie istnieje

Scenariusz: API zwraca `file_url: ""` (pusty string) lub URL prowadzi do 404
Oczekiwane zachowanie: Gdy `file_url` jest pusty lub null, karta NIE otwiera nowej karty po kliknięciu — zamiast tego wyświetla się toast/komunikat inline pod kartą: "Link do raportu niedostępny" (font-size:11px, color:#f87171) przez 3 sekundy.
Komunikat dla użytkownika: "Link do raportu niedostępny"

### EC-4: SystemHealthCard — interval leak przy szybkim przełączaniu tabów

Scenariusz: Użytkownik bardzo szybko przełącza między zakładkami (mount→unmount→mount w <1s)
Oczekiwane zachowanie: Cleanup w `useEffect` (`clearInterval(intervalRef.current)`) jest wywoływany natychmiast przy unmount. Nowy interval jest tworzony przy następnym mountowaniu. Nie ma duplikatów intervalów. W konsoli przeglądarki brak ostrzeżeń "Can't perform a React state update on unmounted component" — osiągane przez sprawdzenie `isMounted` flagi lub przez AbortController dla fetchy.
Komunikat dla użytkownika: Brak — problem techniczny zapobiegany w kodzie

### EC-5: Modal patternu z bardzo długim opisem

Scenariusz: Pole `description` w pattern ma >1000 znaków (długi opis)
Oczekiwane zachowanie: Modal ma ustawione `max-height: 80vh; overflow-y: auto` — długi opis powoduje scroll wewnątrz modalu, a nie overflow poza ekran. Tekst opisu jest wyświetlony w całości (bez truncacji) — użytkownik może scrollować.
Komunikat dla użytkownika: Brak — scroll jest intuicyjny

### EC-6: Health auto-refresh gdy użytkownik jest na innym tabie przeglądarki

Scenariusz: Użytkownik ma otwarty dashboard w tle (tab nieaktywny) — przeglądarka może throttlować setInterval do 1× per sekunda lub całkowicie zamrozić
Oczekiwane zachowanie: Dashboard nie wymaga precyzyjnego timingu — throttlowanie jest akceptowalne. Gdy użytkownik wróci na tab dashboardu, dane odświeżą się przy najbliższym ticku intervalu (lub może być dodatkowy `document.addEventListener('visibilitychange', ...)` żeby re-fetchować natychmiast po powrocie — opcjonalne, not required).
Komunikat dla użytkownika: Brak

---

## 🚫 Out of Scope tej Story

- Filtrowanie patterns (np. po typie PATTERN/ANTI/LESSON, po dacie, po projekcie)
- Sortowanie patterns (tylko top 5 z API według occurrence_count)
- Paginacja patterns (tylko 5, link "All →" to stub — nie implementuje pełnej strony)
- Edycja lub usuwanie patterns z UI (read-only)
- Manualne triggerowanie NightClaw raportu z UI
- WebSocket real-time health monitoring (polling co 60s wystarczy)
- Historia health / health metrics over time
- Notyfikacje push przy CRITICAL alertach
- Logowanie użytkownika / autentykacja

---

## ✔️ Definition of Done

- [ ] Plik `/src/components/insights/InsightsTab.tsx` istnieje i renderuje 3 karty w grid-3
- [ ] Plik `/src/components/insights/NightClawDigestCard.tsx` istnieje
- [ ] Plik `/src/components/insights/PatternsPanel.tsx` istnieje
- [ ] Plik `/src/components/insights/PatternModal.tsx` istnieje i używa shadcn Dialog
- [ ] Plik `/src/components/insights/SystemHealthCard.tsx` istnieje
- [ ] Plik `/src/hooks/useNightClaw.ts` istnieje i fetchuje `/api/nightclaw/latest`
- [ ] Plik `/src/hooks/usePatterns.ts` istnieje i fetchuje `/api/patterns?limit=5&status=confirmed`
- [ ] Plik `/src/hooks/useHealth.ts` istnieje z auto-refresh co 60s i cleanup intervalem
- [ ] Plik `/src/types/insights.ts` istnieje z typami NightClawData, Pattern, HealthData, Alert
- [ ] `useHealth()` używa `Promise.allSettled` (nie `Promise.all`) dla odporności na częściowe awarie
- [ ] Interval z `useHealth()` jest czyszczony w cleanup useEffect (brak memory leaks)
- [ ] AbortController używany w fetch calls (cleanup przy unmount)
- [ ] PatternModal zamyka się na Escape, kliknięcie overlay, przycisk "✕"
- [ ] Wszystkie 4 stany widoku zaimplementowane dla każdej z 3 kart (loading, empty/offline, error, filled)
- [ ] Każdy `.pat-row` ma `tabIndex={0}` i `onKeyDown` handler dla dostępności
- [ ] Kod przechodzi linter bez błędów (`npm run lint` — 0 errors)
- [ ] Brak console.error podczas normalnego użytkowania (sprawdzić w DevTools)
- [ ] Strona na ?tab=insights ładuje się poniżej 2s przy Bridge API online
- [ ] Story review przez PO
