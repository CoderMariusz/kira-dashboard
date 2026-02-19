---
story_id: STORY-2.7
title: "Mariusz filtruje i przeszukuje Pipeline view v2 z live updates via SSE i optimistic UI"
epic: EPIC-2
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: /Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html
api_reference: Bridge API http://localhost:8199 — endpointy: GET /api/status/pipeline, POST /api/stories/{id}/start, SSE /api/events
priority: must
estimated_effort: 10h
depends_on: [STORY-1.5, STORY-2.2, STORY-2.4, STORY-2.5]
blocks: none
tags: [pipeline, filter, search, debounce, sse, live-updates, optimistic-ui, url-state, useSearchParams, usePipelineFilters]
---

## 🎯 User Story

**Jako** Mariusz (Admin, jedyny użytkownik dashboardu Kira)
**Chcę** filtrować pipeline po statusie, modelu i projekcie, wyszukiwać stories po ID i tytule, oraz widzieć zmiany stanu stories natychmiast bez odświeżania strony
**Żeby** szybko znaleźć konkretną story lub subset pipeline'u (np. "wszystkie w REVIEW") i zarządzać nim bez CLI — zmiany widoczne < 3 sekundy od ich wystąpienia w Bridge

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Route: `http://localhost:3000/?tab=pipeline` (zakładka Pipeline — ta sama co STORY-1.5)
Plik do modyfikacji: `/src/components/pipeline/PipelineTab.tsx` (stworzony w STORY-1.5)
Nowe pliki do stworzenia:
- `/src/components/pipeline/FilterBar.tsx` — pasek z 3 dropdownami (Status, Model, Project)
- `/src/components/pipeline/SearchInput.tsx` — pole wyszukiwania z debounce 300ms
- `/src/hooks/usePipelineFilters.ts` — hook zarządzający stanem filtrów + synchronizacja URL
- `/src/hooks/useLivePipeline.ts` — hook łączący usePipeline() + useSSE() + useStoryActions() z optimistic updates

### Powiązane pliki

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
  — tab "Pipeline" (sekcja `<!-- PIPELINE -->` w HTML): `.p-row`, `.p-id`, `.p-title`, `.p-model`, `.p-status`, klasy `.ps-ip`, `.ps-rv`, `.ps-done`, `.ps-rf`, `.ps-mrg`; filter bar **nie istnieje w mockupie** — zaprojektuj go zgodnie z design systemem (ciemne tło, border `#2a2540`)
- **Istniejący komponent:** `/src/components/pipeline/PipelineTab.tsx` z STORY-1.5 — zawiera sekcje Active, Review, Merge Queue, Done Today; każda story jest wierszem `.p-row`
- **Hook usePipeline()** z STORY-1.2 — `{ data: PipelineStory[], isLoading, isOffline, error, refresh }`
- **Hook useSSE()** z STORY-2.4 — `{ events: SSEEvent[], isConnected, error }` — nasłuchuje na `/api/events`
- **Hook useStoryActions()** z STORY-2.4 — `{ startStory, advanceStory, isLoading, error }` z optimistic updates
- **Hook useProjects()** z STORY-1.2 — `{ data: Project[], isLoading }` gdzie `Project = { id: string; name: string }`
- **Typy:** `PipelineStory`, `SSEEvent` z `/src/types/api.ts`

### Stan systemu przed tą story

Przed rozpoczęciem implementacji MUSZĄ być gotowe:
1. **STORY-1.5 DONE** — `PipelineTab.tsx` istnieje i renderuje pipeline w zakładce `?tab=pipeline`; sekcje Active, Review Queue, Done Today, Merge Queue działają; każda story jest klikalnym `.p-row`
2. **STORY-2.2 DONE** — backend endpoint `POST /api/stories/{id}/start` działa i zwraca `{ success: true, story_id: string }` lub error
3. **STORY-2.4 DONE** — hook `useSSE()` istnieje w `/src/hooks/useSSE.ts`, subskrybuje `/api/events`; hook `useStoryActions()` istnieje w `/src/hooks/useStoryActions.ts` z funkcjami `startStory(storyId)` i `advanceStory(storyId, targetStatus)`
4. **STORY-2.5 DONE** — system toastów (Sonner) działa globalnie; funkcja `toast.success()`, `toast.error()` dostępne z `'sonner'`

Typy (z `/src/types/api.ts`) — zdefiniowane w STORY-1.2:
```typescript
// PipelineStory — jeden wiersz w pipeline
interface PipelineStory {
  story_id: string;          // np. "STORY-13.8"
  title: string;             // np. "Auto log-run hook"
  status: 'IN_PROGRESS' | 'REVIEW' | 'REFACTOR' | 'DONE' | 'MERGE' | 'READY';
  model: string;             // np. "sonnet", "kimi", "glm", "codex"
  project: string;           // np. "kira", "gym-tracker"
  started_at: string | null; // ISO 8601 lub null gdy nie wystartowana
  updated_at: string;        // ISO 8601
}

// SSEEvent — zdarzenie z Bridge event stream
interface SSEEvent {
  type: 'story_advanced' | 'story_started' | 'story_failed' | 'heartbeat';
  payload: {
    story_id?: string;        // np. "STORY-13.8"
    old_status?: string;      // np. "IN_PROGRESS"
    new_status?: string;      // np. "REVIEW"
    model?: string;
    project?: string;
    title?: string;
    timestamp?: string;       // ISO 8601
  };
}

// Project — używany przez useProjects()
interface Project {
  id: string;     // np. "kira"
  name: string;   // np. "kira" (display name)
}
```

---

## ✅ Acceptance Criteria

### AC-1: Filter bar renderuje się nad listą stories w Pipeline tab

GIVEN: Użytkownik jest na stronie `http://localhost:3000/?tab=pipeline`
WHEN: Zakładka Pipeline jest aktywna i `PipelineTab` jest zamontowany
THEN: Nad pierwszą sekcją stories renderuje się komponent `FilterBar` zawierający w jednym rzędzie (flexbox, `display:flex; align-items:center; gap:8px`):
  - Dropdown **Status** z opcjami: "Wszystkie statusy", "IN_PROGRESS", "REVIEW", "REFACTOR", "DONE" — domyślnie "Wszystkie statusy"
  - Dropdown **Model** z opcjami: "Wszystkie modele", "kimi", "glm", "sonnet", "codex" — domyślnie "Wszystkie modele"
  - Dropdown **Projekt** z opcjami: "Wszystkie projekty" + lista nazw projektów z `useProjects()` — domyślnie "Wszystkie projekty"
  - Input `SearchInput` z placeholder "Szukaj po ID lub tytule..."
AND: Każdy dropdown jest elementem `<select>` lub komponentem shadcn/ui `Select` z tłem `#13111c`, border `1px solid #2a2540`, tekst `color:#e6edf3`, `font-size:12px`, `border-radius:8px`, `padding:6px 10px`
AND: `FilterBar` ma własne tło `#13111c` lub jest na tle karty, brak wyraźnego obramowania
AND: Na początku mountowania komponentu dropdowny czytają wartości z URL query params (`status`, `model`, `project`) — jeśli param istnieje, dropdown pokazuje tę wartość zamiast domyślnej

### AC-2: Search input filtruje stories po ID i tytule z debounce 300ms

GIVEN: Pipeline tab jest aktywny i lista stories jest załadowana (minimum 1 story widoczna)
WHEN: Użytkownik wpisuje tekst w pole `SearchInput` (np. "STORY-13" lub "hook")
THEN: System czeka 300ms od ostatniego keystroke (debounce) przed aktualizacją listy
AND: Po 300ms lista stories jest przefiltrowana — widoczne są tylko te stories, gdzie `story.story_id.toLowerCase().includes(query.toLowerCase())` LUB `story.title.toLowerCase().includes(query.toLowerCase())`
AND: Stories które nie pasują do query są ukryte (unmount lub `display:none` — preferowany unmount)
AND: Sekcje (Active, Review, etc.) które po filtrowaniu mają 0 stories są ukryte (nie renderuje się pusta sekcja z headerem bez wierszy)
AND: Liczniki w nagłówkach sekcji aktualizują się do liczby stories widocznych po filtrze (np. "Active (2)" zamiast "Active (5)")

### AC-3: Dropdown Status filtruje listę i zapisuje wartość w URL

GIVEN: Pipeline tab jest aktywny
WHEN: Użytkownik wybiera opcję "REVIEW" z dropdownu Status
THEN: Lista stories jest natychmiast przefiltrowana — widoczne są tylko stories z `status === 'REVIEW'`
AND: URL w pasku przeglądarki zmienia się na `?tab=pipeline&status=REVIEW` (bez przeładowania strony — używając `router.push()` z Next.js lub `window.history.pushState`)
AND: Pozostałe query params (jeśli istnieją) są zachowane (np. `?tab=pipeline&status=REVIEW&model=sonnet` gdy model był już wybrany)
AND: Przełączenie z powrotem na "Wszystkie statusy" usuwa param `status` z URL (URL wraca do `?tab=pipeline` lub `?tab=pipeline&model=sonnet` jeśli model był wybrany)

### AC-4: Dropdown Model filtruje listę i zapisuje wartość w URL

GIVEN: Pipeline tab jest aktywny
WHEN: Użytkownik wybiera opcję "sonnet" z dropdownu Model
THEN: Lista stories jest przefiltrowana — widoczne są tylko stories z `model === 'sonnet'`
AND: URL zmienia się na `?tab=pipeline&model=sonnet`
AND: Pozostałe aktywne filtry (status, project, search) są zachowane jednocześnie (filtry są addytywne — story musi pasować do WSZYSTKICH aktywnych filtrów naraz)

### AC-5: Filtry inicjalizują się z URL przy wejściu na stronę

GIVEN: Użytkownik otwiera przeglądarkę z URL `http://localhost:3000/?tab=pipeline&status=REVIEW&model=sonnet`
WHEN: Strona się ładuje i `PipelineTab` jest mountowany
THEN: Dropdown Status pokazuje "REVIEW" (nie "Wszystkie statusy")
AND: Dropdown Model pokazuje "sonnet" (nie "Wszystkie modele")
AND: Lista stories jest od razu przefiltrowana — widoczne są tylko REVIEW stories od modelu sonnet
AND: Użytkownik NIE musi niczego klikać — filtry są aktywne natychmiast po załadowaniu

### AC-6: Live update via SSE — story_advanced aktualizuje listę bez refetch

GIVEN: Użytkownik ma otwarty Pipeline tab i `useSSE()` jest połączony (podłączony do `/api/events`)
WHEN: Z Bridge API przyjdzie event SSE o typie `story_advanced` z payload np. `{ story_id: "STORY-13.8", old_status: "IN_PROGRESS", new_status: "REVIEW", model: "sonnet", title: "Auto log-run hook" }`
THEN: W ciągu < 500ms (bez pełnego refetch) story o `story_id === "STORY-13.8"` zmienia swój status w lokalnym state na `"REVIEW"`
AND: Story znika z sekcji "Active (IN_PROGRESS)" i pojawia się w sekcji "Review Queue"
AND: Animacja: przeniesienie jest widoczne (np. story pojawia się w nowej sekcji przez chwilę z większą opacity lub tłem `#2d1b4a` przez 600ms — tzw. "flash highlight" na nowym wierszu)
AND: Liczniki sekcji aktualizują się: "Active" maleje o 1, "Review" rośnie o 1
AND: NIE jest wykonywany `fetch('/api/status/pipeline')` — lista jest aktualizowana wyłącznie przez mutację lokalnego state

### AC-7: Optimistic UI dla "Start Story" z rollback przy błędzie

GIVEN: W pipeline view widoczna jest story ze statusem `READY` z aktywnym przyciskiem "▶ Start"
WHEN: Użytkownik klika przycisk "▶ Start" przy tej story
THEN: **Natychmiast** (< 50ms, synchronicznie przed wysłaniem żądania HTTP) status tej story w lokalnym state zmienia się na `IN_PROGRESS`
AND: Story przenosi się do sekcji "Active" z badge `IN_PROGRESS` (kolor `background:#1a3a5c; color:#60a5fa`)
AND: Przycisk "▶ Start" znika lub zmienia się na spinner/disabled
AND: W tle wykonywane jest żądanie `POST /api/stories/{story_id}/start`
WHEN: Żądanie zakończy się błędem (status HTTP 4xx/5xx lub timeout > 10s)
THEN: Status story w lokalnym state wraca do `READY` (rollback)
AND: Story wraca do oryginalnej pozycji w pipeline (poza sekcją Active)
AND: Wyświetlany jest toast błędu (Sonner): "Nie udało się wystartować story: {error.message}" — czerwony/destruktywny styl

### AC-8: Empty state gdy żaden wynik nie pasuje do filtrów

GIVEN: Aktywne są filtry (np. `status=REVIEW`) i żadna story nie spełnia kryteriów (lista pusta)
WHEN: Lista przefiltrowanych stories jest pusta (długość 0)
THEN: Zamiast listy wierszy wyświetla się komponent empty state:
  - Ikonka: "🔍" (emoji, font-size:32px, margin-bottom:12px)
  - Tekst główny: "Brak stories spełniających kryteria" (font-size:14px, color:#6b7280, font-weight:600)
  - Tekst pomocniczy: "Zmień filtry lub wyszukaj inną frazę" (font-size:12px, color:#4b4569, margin-top:4px)
  - Przycisk "Resetuj filtry" (background:`#2a2540`, color:`#e6edf3`, border:none, border-radius:8px, padding:7px 16px, font-size:12px, cursor:pointer)
AND: Kliknięcie "Resetuj filtry" resetuje wszystkie 3 dropdowny do "Wszystkie..." oraz czyści search input
AND: Po resecie URL zmienia się na `?tab=pipeline` (wszystkie filter params usunięte)

### AC-9: Liczniki per sekcja odzwierciedlają aktualną liczbę po filtrowaniu

GIVEN: Pipeline tab jest aktywny z aktywnym filtrem (np. `status=REVIEW`)
WHEN: Lista stories jest przefiltrowana
THEN: Każdy nagłówek sekcji pokazuje aktualną liczbę w nawiasie, np.:
  - "Active (2)" — liczba stories w sekcji po filtrze
  - "Review (1)" — liczba stories w sekcji po filtrze
  - "Done Today (5)" — liczba stories ukończonych dziś po filtrze
AND: Gdy filtrujesz po `status=REVIEW`, sekcja "Active" pokazuje "Active (0)" lub jest ukryta (brak wierszy, brak nagłówka)

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

Route: `/?tab=pipeline`
Komponent główny: `/src/components/pipeline/PipelineTab.tsx` (modyfikacja istniejącego)
Nowe komponenty: `/src/components/pipeline/FilterBar.tsx`, `/src/components/pipeline/SearchInput.tsx`
Nowe hooki: `/src/hooks/usePipelineFilters.ts`, `/src/hooks/useLivePipeline.ts`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `FilterBar` | div z 3 select + search | `filters`, `onFilterChange`, `projects` | domyślny, z aktywnymi filtrami |
| `SearchInput` | Input | `value`, `onChange`, `placeholder` | empty, typing, filled |
| `PipelineSection` | div | `title`, `stories`, `count`, `onStartStory` | empty, filled |
| `PipelineRow` | div.p-row | `story`, `onStart`, `isOptimistic` | default, optimistic-loading, hover |
| `PipelineEmptyState` | div | `onReset` | widoczny gdy 0 wyników |

### Implementacja krok po kroku

#### KROK 1 — Stwórz hook `usePipelineFilters.ts`

Plik: `/src/hooks/usePipelineFilters.ts`

```typescript
// Ten hook zarządza stanem filtrów i synchronizuje je z URL
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useState } from 'react';

export interface PipelineFilters {
  status: string;   // '' = all, lub 'IN_PROGRESS' | 'REVIEW' | 'REFACTOR' | 'DONE'
  model: string;    // '' = all, lub 'kimi' | 'glm' | 'sonnet' | 'codex'
  project: string;  // '' = all, lub dowolna nazwa projektu
  search: string;   // '' = brak filtra, lub fraza do wyszukania
}

export function usePipelineFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Inicjalizacja z URL query params
  const [filters, setFiltersState] = useState<PipelineFilters>({
    status: searchParams.get('status') ?? '',
    model: searchParams.get('model') ?? '',
    project: searchParams.get('project') ?? '',
    search: searchParams.get('search') ?? '',
  });

  // Aktualizacja filtrów i URL jednocześnie
  const setFilters = useCallback((newFilters: Partial<PipelineFilters>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      
      // Synchronizuj z URL (bez przeładowania)
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', 'pipeline'); // zachowaj tab
      
      if (updated.status) params.set('status', updated.status);
      else params.delete('status');
      
      if (updated.model) params.set('model', updated.model);
      else params.delete('model');
      
      if (updated.project) params.set('project', updated.project);
      else params.delete('project');
      
      if (updated.search) params.set('search', updated.search);
      else params.delete('search');
      
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      
      return updated;
    });
  }, [searchParams, router, pathname]);

  const resetFilters = useCallback(() => {
    setFilters({ status: '', model: '', project: '', search: '' });
  }, [setFilters]);

  return { filters, setFilters, resetFilters };
}
```

#### KROK 2 — Stwórz hook `useLivePipeline.ts`

Plik: `/src/hooks/useLivePipeline.ts`

```typescript
// Ten hook łączy usePipeline() z live updates via useSSE() i optimistic updates
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePipeline } from './usePipeline'; // hook z STORY-1.2
import { useSSE } from './useSSE';           // hook z STORY-2.4
import { useStoryActions } from './useStoryActions'; // hook z STORY-2.4
import type { PipelineStory, SSEEvent } from '../types/api';

export function useLivePipeline() {
  const { data: baseData, isLoading, error, refresh } = usePipeline();
  const { events } = useSSE();
  const { startStory: doStartStory, isLoading: actionLoading } = useStoryActions();
  
  // Lokalny state stories — kopia baseData z nałożonymi live updates
  const [stories, setStories] = useState<PipelineStory[]>([]);
  
  // Synchronizuj stories z baseData przy pierwszym załadowaniu i po refresh
  useEffect(() => {
    if (baseData) {
      setStories(baseData);
    }
  }, [baseData]);
  
  // Obsługa eventów SSE — aktualizuj stories bez refetch
  const processedEventIds = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!events || events.length === 0) return;
    
    const latestEvent = events[events.length - 1]; // Przetwarzaj tylko najnowszy event
    
    // Deduplikacja — unikaj podwójnego przetwarzania tego samego eventu
    const eventKey = `${latestEvent.type}-${latestEvent.payload.story_id}-${latestEvent.payload.timestamp}`;
    if (processedEventIds.current.has(eventKey)) return;
    processedEventIds.current.add(eventKey);
    
    if (latestEvent.type === 'story_advanced' || latestEvent.type === 'story_started') {
      const { story_id, new_status } = latestEvent.payload;
      if (!story_id || !new_status) return;
      
      setStories(prev => prev.map(story => 
        story.story_id === story_id
          ? { ...story, status: new_status as PipelineStory['status'], _justUpdated: true }
          : story
      ));
      
      // Usuń flagę _justUpdated po 600ms (koniec animacji highlight)
      setTimeout(() => {
        setStories(prev => prev.map(story =>
          story.story_id === story_id
            ? { ...story, _justUpdated: false }
            : story
        ));
      }, 600);
    }
  }, [events]);
  
  // Optimistic start story z rollback
  const startStory = useCallback(async (storyId: string) => {
    // Znajdź story przed zmianą (do rollback)
    const originalStory = stories.find(s => s.story_id === storyId);
    if (!originalStory) return;
    
    // Optimistic update — natychmiastowa zmiana stanu
    setStories(prev => prev.map(story =>
      story.story_id === storyId
        ? { ...story, status: 'IN_PROGRESS', _isOptimistic: true }
        : story
    ));
    
    try {
      await doStartStory(storyId);
      // Sukces — usuń flagę optimistic
      setStories(prev => prev.map(story =>
        story.story_id === storyId
          ? { ...story, _isOptimistic: false }
          : story
      ));
    } catch (err) {
      // Rollback — przywróć oryginalny status
      setStories(prev => prev.map(story =>
        story.story_id === storyId
          ? { ...originalStory, _isOptimistic: false }
          : story
      ));
      throw err; // Propaguj błąd do UI (toast w PipelineTab)
    }
  }, [stories, doStartStory]);
  
  return {
    stories,
    isLoading,
    error,
    refresh,
    startStory,
    actionLoading,
  };
}
```

**Uwaga:** Typ `PipelineStory` z STORY-1.2 nie ma pól `_justUpdated` ani `_isOptimistic`. Rozszerz typ lokalnie w tym hooku o te opcjonalne pola lub stwórz lokalny typ `LivePipelineStory extends PipelineStory`.

#### KROK 3 — Stwórz komponent `SearchInput.tsx`

Plik: `/src/components/pipeline/SearchInput.tsx`

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Szukaj po ID lub tytule...' }: SearchInputProps) {
  // Wewnętrzny state dla natychmiastowego wyświetlania (UX)
  const [inputValue, setInputValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Synchronizuj inputValue z zewnętrznym value (np. reset filtrów)
  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  // Debounce: wywołaj onChange dopiero po 300ms od ostatniego keystroke
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue); // Natychmiastowa aktualizacja input
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange(newValue); // Opóźniona propagacja do filtru
    }, 300);
  };
  
  // Cleanup przy unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  
  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      aria-label="Wyszukaj story po ID lub tytule"
      style={{
        background: '#13111c',
        border: '1px solid #2a2540',
        borderRadius: '8px',
        padding: '6px 12px',
        color: '#e6edf3',
        fontSize: '12px',
        outline: 'none',
        minWidth: '220px',
      }}
      onFocus={e => (e.target.style.borderColor = '#818cf8')}
      onBlur={e => (e.target.style.borderColor = '#2a2540')}
    />
  );
}
```

#### KROK 4 — Stwórz komponent `FilterBar.tsx`

Plik: `/src/components/pipeline/FilterBar.tsx`

```typescript
'use client';

import { SearchInput } from './SearchInput';
import type { PipelineFilters } from '../../hooks/usePipelineFilters';
import type { Project } from '../../types/api';

interface FilterBarProps {
  filters: PipelineFilters;
  onFilterChange: (filters: Partial<PipelineFilters>) => void;
  projects: Project[];
}

// Styl wspólny dla <select>
const selectStyle: React.CSSProperties = {
  background: '#13111c',
  border: '1px solid #2a2540',
  borderRadius: '8px',
  padding: '6px 10px',
  color: '#e6edf3',
  fontSize: '12px',
  outline: 'none',
  cursor: 'pointer',
};

export function FilterBar({ filters, onFilterChange, projects }: FilterBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        flexWrap: 'wrap',
      }}
      role="search"
      aria-label="Filtry pipeline"
    >
      {/* Dropdown Status */}
      <select
        value={filters.status}
        onChange={e => onFilterChange({ status: e.target.value })}
        style={selectStyle}
        aria-label="Filtruj po statusie"
      >
        <option value="">Wszystkie statusy</option>
        <option value="IN_PROGRESS">IN_PROGRESS</option>
        <option value="REVIEW">REVIEW</option>
        <option value="REFACTOR">REFACTOR</option>
        <option value="DONE">DONE</option>
      </select>

      {/* Dropdown Model */}
      <select
        value={filters.model}
        onChange={e => onFilterChange({ model: e.target.value })}
        style={selectStyle}
        aria-label="Filtruj po modelu"
      >
        <option value="">Wszystkie modele</option>
        <option value="kimi">kimi</option>
        <option value="glm">glm</option>
        <option value="sonnet">sonnet</option>
        <option value="codex">codex</option>
      </select>

      {/* Dropdown Projekt */}
      <select
        value={filters.project}
        onChange={e => onFilterChange({ project: e.target.value })}
        style={selectStyle}
        aria-label="Filtruj po projekcie"
      >
        <option value="">Wszystkie projekty</option>
        {projects.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Search */}
      <SearchInput
        value={filters.search}
        onChange={search => onFilterChange({ search })}
      />

      {/* Przycisk "Resetuj filtry" — widoczny gdy jakikolwiek filtr aktywny */}
      {(filters.status || filters.model || filters.project || filters.search) && (
        <button
          onClick={() => onFilterChange({ status: '', model: '', project: '', search: '' })}
          style={{
            background: '#2a2540',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            color: '#818cf8',
            fontSize: '11px',
            cursor: 'pointer',
          }}
          aria-label="Resetuj wszystkie filtry"
        >
          ✕ Resetuj filtry
        </button>
      )}
    </div>
  );
}
```

#### KROK 5 — Zmodyfikuj `PipelineTab.tsx`

Plik: `/src/components/pipeline/PipelineTab.tsx` (modyfikacja istniejącego komponentu z STORY-1.5)

Zmiany do wprowadzenia (nie przepisuj całego pliku — tylko dodaj brakujące fragmenty):

1. **Dodaj importy** na górze pliku:
   ```typescript
   import { FilterBar } from './FilterBar';
   import { usePipelineFilters } from '../../hooks/usePipelineFilters';
   import { useLivePipeline } from '../../hooks/useLivePipeline';
   import { useProjects } from '../../hooks/useProjects'; // hook z STORY-1.2
   import { toast } from 'sonner'; // system toastów z STORY-2.5
   import { useMemo } from 'react';
   ```

2. **W ciele komponentu** zastąp `usePipeline()` przez `useLivePipeline()` i dodaj hooki filtrów:
   ```typescript
   // ZASTĄP: const { data: stories, isLoading, error } = usePipeline();
   // PRZEZ:
   const { stories, isLoading, error, startStory } = useLivePipeline();
   const { filters, setFilters, resetFilters } = usePipelineFilters();
   const { data: projects = [] } = useProjects();
   ```

3. **Dodaj logikę filtrowania** (computed — używaj useMemo):
   ```typescript
   const filteredStories = useMemo(() => {
     if (!stories) return [];
     return stories.filter(story => {
       if (filters.status && story.status !== filters.status) return false;
       if (filters.model && story.model !== filters.model) return false;
       if (filters.project && story.project !== filters.project) return false;
       if (filters.search) {
         const q = filters.search.toLowerCase();
         if (!story.story_id.toLowerCase().includes(q) && !story.title.toLowerCase().includes(q)) return false;
       }
       return true;
     });
   }, [stories, filters]);
   ```

4. **W JSX przed sekcjami** dodaj FilterBar:
   ```tsx
   <FilterBar
     filters={filters}
     onFilterChange={setFilters}
     projects={projects}
   />
   ```

5. **Dla sekcji Active** zmień nagłówek z `"Active"` na dynamiczny:
   ```tsx
   const activeStories = filteredStories.filter(s => s.status === 'IN_PROGRESS');
   // Nagłówek: `Active (${activeStories.length})`
   ```
   Analogicznie dla Review, Done Today.

6. **Empty state** — dodaj warunek:
   ```tsx
   {filteredStories.length === 0 && (
     <PipelineEmptyState onReset={resetFilters} />
   )}
   ```

7. **Obsługa startStory z toast** — przy kliknięciu "▶ Start":
   ```typescript
   const handleStartStory = async (storyId: string) => {
     try {
       await startStory(storyId);
       toast.success(`Story ${storyId} wystartowana`);
     } catch (err) {
       toast.error(`Nie udało się wystartować story: ${err instanceof Error ? err.message : 'Nieznany błąd'}`);
     }
   };
   ```

#### KROK 6 — Stwórz komponent `PipelineEmptyState.tsx`

Plik: `/src/components/pipeline/PipelineEmptyState.tsx`

```tsx
interface PipelineEmptyStateProps {
  onReset: () => void;
}

export function PipelineEmptyState({ onReset }: PipelineEmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: '#13111c',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
      <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '600' }}>
        Brak stories spełniających kryteria
      </div>
      <div style={{ fontSize: '12px', color: '#4b4569', marginTop: '4px', marginBottom: '16px' }}>
        Zmień filtry lub wyszukaj inną frazę
      </div>
      <button
        onClick={onReset}
        style={{
          background: '#2a2540',
          border: 'none',
          borderRadius: '8px',
          padding: '7px 16px',
          color: '#e6edf3',
          fontSize: '12px',
          cursor: 'pointer',
        }}
        aria-label="Resetuj wszystkie filtry"
      >
        Resetuj filtry
      </button>
    </div>
  );
}
```

#### KROK 7 — "Flash highlight" dla SSE live update

W komponencie `PipelineRow` (lub bezpośrednio w elemencie `.p-row`) dodaj CSS transition dla nowo zaktualizowanych stories:

```tsx
// W PipelineRow — jeśli story._justUpdated === true, dodaj podświetlenie
const rowStyle: React.CSSProperties = {
  // ... istniejące style z STORY-1.5
  transition: 'background-color 0.6s ease',
  backgroundColor: story._justUpdated ? '#2d1b4a' : 'transparent', // fioletowy flash
};
```

Efekt: przez 600ms od SSE eventu wiersz ma tło `#2d1b4a`, potem płynnie wraca do transparentnego.

### Stany widoku (PipelineTab)

**Loading:**
Cały tab pokazuje skeleton — 3 wiersze `.p-row` jako placeholder z background `#1a1730` i animacją pulse (opacity 0.4 → 0.8 → 0.4, duration 1.5s). FilterBar jest zrenderowany (nie jest skeleton), ale dropdowny są disabled (`disabled` attr).

**Empty (brak danych z API — offline):**
Jeśli `isOffline === true`: baner "Bridge API niedostępny — dane mogą być nieaktualne" (background `#3a2a00`, color `#fbbf24`, border-radius `8px`, padding `10px 14px`, marginBottom `12px`) nad listą.

**Empty (brak wyników po filtrowaniu):**
Komponent `PipelineEmptyState` (AC-8).

**Error (błąd API):**
Tekst "Błąd ładowania pipeline: {error.message}" w kolorze `#f87171` + przycisk "Spróbuj ponownie" (klik wywołuje `refresh()`).

**Filled (normalny stan):**
FilterBar na górze, następnie sekcje z nagłówkami i licznikami, każda sekcja z wierszami `.p-row`.

### Design Reference (mockup)

**Tab Pipeline** — sekcja `<!-- PIPELINE -->` w `kira-dashboard-mockup-v3.html`:
- Wiersz story: `.p-row` — `display:flex; align-items:center; gap:9px; background:#13111c; border-radius:7px; padding:8px 11px; margin-bottom:5px; border:1px solid transparent`; hover: `border-color:#2a2540`
- ID: `.p-id` — `font-size:11px; font-weight:700; color:#818cf8; width:78px`
- Tytuł: `.p-title` — `font-size:12px; color:#e6edf3; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis`
- Model: `.p-model` — `font-size:10px; color:#6b7280; width:55px`
- Badge statusu: `.p-status` — `font-size:10px; padding:2px 7px; border-radius:8px; font-weight:600`
  - `IN_PROGRESS`: `background:#1a3a5c; color:#60a5fa`
  - `REVIEW`: `background:#2d1b4a; color:#a78bfa`
  - `DONE`: `background:#1a3a1a; color:#4ade80`
  - `REFACTOR`: `background:#3a2a00; color:#fbbf24`
  - `MERGE`: `background:#1a2a1a; color:#34d399; border:1px solid #2a5a2a`
- Nagłówki sekcji: `.sec-lbl` — `font-size:10px; font-weight:700; color:#3d3757; text-transform:uppercase; letter-spacing:.07em; margin-bottom:7px`
- FilterBar nie ma odpowiednika w mockupie — użyj stylu pasującego do design systemu: ciemne tło `#13111c`, border `#2a2540`, odstępy `8px`

### Responsive / Dostępność

- Desktop (1280px+): FilterBar w jednym wierszu (flex row), wszystkie dropdowny i search widoczne
- Tablet (768px+): FilterBar owija do 2 wierszy jeśli nie mieści się (`flex-wrap:wrap`)
- Mobile (375px+): poza zakresem tej story (EPIC-2 jest desktop-first)
- Keyboard navigation:
  - Tab przechodzi przez: Status dropdown → Model dropdown → Project dropdown → Search input → Reset filters button (jeśli widoczny)
  - Enter przy wierszu `.p-row` otwiera Story Detail (istniejące zachowanie z STORY-1.5)
  - Escape czyści search input (jeśli focus jest na SearchInput)
- ARIA:
  - `role="search"` na FilterBar div
  - `aria-label="Filtruj po statusie"` na Status select
  - `aria-label="Filtruj po modelu"` na Model select
  - `aria-label="Filtruj po projekcie"` na Project select
  - `aria-label="Wyszukaj story po ID lub tytule"` na SearchInput
  - `aria-live="polite"` na kontenenerze z liczbą wyników (np. `<span aria-live="polite">{filteredStories.length} stories</span>`)

---

## ⚠️ Edge Cases

### EC-1: SSE rozłączone podczas oglądania pipeline

Scenariusz: useSSE() traci połączenie z `/api/events` (serwer Bridge zrestartowany lub sieć chwilowo niedostępna). Event `story_advanced` pojawia się gdy SSE jest offline.
Oczekiwane zachowanie: `useLivePipeline` wykrywa `isConnected === false` (z useSSE) i po 5 sekundach od rozłączenia wykonuje pełny `refresh()` (fallback polling). Gdy SSE wróci, wznawia live updates i anuluje polling. Lista jest zawsze aktualna — co najwyżej z 5-sekundowym opóźnieniem.
Komunikat dla użytkownika: Mały wskaźnik w prawym górnym rogu PipelineTab: "🔴 Live updates offline — odświeżanie co 5s" (font-size:10px, color:#f87171). Znika gdy SSE wróci.

### EC-2: Użytkownik wpisuje szybko w search — debounce nie pozwala na flood

Scenariusz: Użytkownik wpisuje "STORY-13.8" jedno znak na raz, każdy z opóźnieniem 50ms (szybsze niż debounce 300ms).
Oczekiwane zachowanie: Filtr aktualizuje się tylko raz — po 300ms od ostatniego wciśniętego klawisza. Wcześniejsze timeouty są czyszczone (`clearTimeout`). Brak widocznych pośrednich stanów filtrowania — lista zmienia się tylko raz.

### EC-3: URL zawiera nieprawidłowy filtr (np. ?status=INVALID)

Scenariusz: Użytkownik ręcznie wpisuje URL `?tab=pipeline&status=INVALID_VALUE`.
Oczekiwane zachowanie: `usePipelineFilters` przy inicjalizacji sprawdza czy wartość `status` z URL należy do zbioru `['IN_PROGRESS', 'REVIEW', 'REFACTOR', 'DONE', '']`. Jeśli nie — ignoruje wartość i ustawia `status: ''` (wszystkie statusy). URL jest korygowany do `?tab=pipeline` przy pierwszej zmianie filtra. Brak komunikatu o błędzie — ciche zignorowanie.

### EC-4: Optimistic update — race condition (dwa kliknięcia Start)

Scenariusz: Użytkownik klika "▶ Start" na story A, a następnie natychmiast klika "▶ Start" na story B, zanim pierwsze żądanie wróci.
Oczekiwane zachowanie: Oba żądania są wykonane niezależnie. Przycisk "▶ Start" jest disabled/ukryty natychmiast po pierwszym kliknięciu (optimistic update zmienia status na IN_PROGRESS, a READY stories nie mają przycisku Start). Jeśli story A się nie uda — rollback tylko dla A, B nie jest dotknięta.

### EC-5: SSE event dla nieistniejącej story

Scenariusz: Przychodzi event `{ type: "story_advanced", payload: { story_id: "STORY-99.99", new_status: "DONE" } }` dla story której nie ma w lokalnym state (np. pochodzi z innego projektu).
Oczekiwane zachowanie: `useLivePipeline` mapuje stories ale nie znajduje story o danym ID — `.map()` zwraca tablicę bez zmian. Brak błędu w konsoli, brak crash. Story nie jest dodawana do listy (to nie jest nowa story — SSE nie tworzy nowych wierszy).

### EC-6: useProjects() zwraca pustą listę lub błąd

Scenariusz: `useProjects()` nie może pobrać listy projektów (Bridge offline).
Oczekiwane zachowanie: Dropdown Projekt pokazuje tylko opcję "Wszystkie projekty" bez dodatkowych pozycji. Brak błędu UI. Istniejące filtrowanie po projekcie na podstawie URL (`?project=kira`) nadal działa — filtr jest aplikowany do stories nawet jeśli lista projektów jest pusta.

---

## 🚫 Out of Scope tej Story

- Tworzenie nowych stories z pipeline view (to EPIC-2, inne story — Start dotyczy READY stories, nie tworzenia)
- Filtrowanie po epoce (epic_id) — tylko status/model/project w tej story
- Batch operations (zaznaczenie wielu stories i masowe startowanie)
- Responsywność mobile (EPIC-2 jest desktop-first, mobile w osobnym epicu)
- Persist filtrów w localStorage (tylko URL w tej story)
- Animacje slide-in/slide-out przy zmianie sekcji (proste show/hide wystarczy)
- Advance story z pipeline view (tylko Start Story — advance jest w Story Detail page, STORY-2.6)

---

## ✔️ Definition of Done

- [ ] Kod przechodzi linter (`next lint`) bez błędów i ostrzeżeń
- [ ] Wszystkie 4 stany widoku zaimplementowane: loading (skeleton), empty (brak wyników), error (błąd API), filled (normalne dane z filtrami)
- [ ] FilterBar renderuje się nad listą stories na zakładce `?tab=pipeline`
- [ ] 3 dropdowny (Status, Model, Projekt) filtrują listę niezależnie i addytywnie
- [ ] Search input filtruje po ID i tytule z debounce 300ms
- [ ] Filtry są inicjalizowane z URL query params przy wejściu na stronę
- [ ] Każda zmiana filtru aktualizuje URL bez przeładowania (pushState)
- [ ] SSE event `story_advanced` aktualizuje lokalny state bez `fetch` do API
- [ ] "Flash highlight" (tło `#2d1b4a` przez 600ms) widoczny dla SSE-zaktualizowanych wierszy
- [ ] Kliknięcie "▶ Start" wywołuje optimistic update — natychmiastowa zmiana statusu w UI
- [ ] Rollback działa gdy `POST /api/stories/{id}/start` zwraca błąd
- [ ] Toast błędu ("Nie udało się wystartować story: ...") wyświetla się przy failed start
- [ ] Empty state z przyciskiem "Resetuj filtry" wyświetla się gdy 0 wyników
- [ ] Kliknięcie "Resetuj filtry" czyści wszystkie filtry i URL
- [ ] Liczniki sekcji ("Active (N)", "Review (N)", "Done Today (N)") odzwierciedlają liczbę po filtrowaniu
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Widok działa na rozdzielczości 1280px bez poziomego scrolla
- [ ] Story review przez PO
