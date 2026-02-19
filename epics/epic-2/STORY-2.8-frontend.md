---
story_id: STORY-2.8
title: "Mariusz triggeruje Eval run z UI i widzi progress + wynik inline z toastem"
epic: EPIC-2
module: dashboard
domain: frontend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
ux_reference: /Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html
api_reference: Bridge API http://localhost:8199 — POST /api/eval/run, GET /api/eval/run/{runId}/status
priority: must
estimated_effort: 6h
depends_on: [STORY-1.6, STORY-2.3, STORY-2.5]
blocks: none
tags: [eval, polling, progress-bar, toast, loading-state, run-eval, inline-result, useEvalRun]
---

## 🎯 User Story

**Jako** Mariusz (Admin, jedyny użytkownik dashboardu Kira)
**Chcę** uruchomić eval z dashboardu jednym kliknięciem i widzieć postęp oraz wynik bezpośrednio w panelu Eval — bez otwierania terminala
**Żeby** szybko weryfikować jakość pipeline'u po sesji implementacji i otrzymać wynik (pass rate, pass/fail count) w < 30 sekund od kliknięcia

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

Route: `http://localhost:3000/?tab=eval`
Plik do modyfikacji: `/src/components/eval/EvalFrameworkPanel.tsx` (stworzony w STORY-1.6)
Nowy plik do stworzenia: `/src/hooks/useEvalRun.ts` — hook zarządzający cyklem eval run (trigger → polling → wynik)

### Powiązane pliki

- **Mockup:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
  — tab "Eval" (kliknij zakładkę "Eval" w pasku tabs): sekcja `<!-- EVAL -->` w dolnej siatce `grid-2`; klasy: `.eval-score-area`, `.ev-big`, `.ev-num` (font-size:36px, color:#4ade80), `.ev-lbl`, `.ev-sub`, `.eval-cats`, `.ecat`, `.ecat-name`, `.ecat-bg`, `.ecat-fill` (gradient `#4ade80→#34d399`), `.ecat-pct`; link "Run eval →" widoczny jako `.see-all` w `.card-hdr`
  — Przycisk "Run Eval Now" NIE istnieje w mockupie — zaprojektuj go zgodnie z design systemem (gradient `#7c3aed→#3b82f6`, biały tekst)
- **Istniejący komponent:** `/src/components/eval/EvalFrameworkPanel.tsx` z STORY-1.6 — renderuje aktualny score i kategorie z `useEval()`; ma placeholder "Run eval →" w nagłówku karty
- **Hook useEval()** z STORY-1.2 — `{ data: EvalOverview, isLoading, refresh }` gdzie `EvalOverview = { pass_rate: number, passed: number, total: number, categories: EvalCategory[] }`
- **Backend endpoint** z STORY-2.3:
  - `POST /api/eval/run` → `{ runId: string }` z HTTP 202 (Accepted), natychmiastowa odpowiedź
  - `GET /api/eval/run/{runId}/status` → `{ status: 'running' | 'done' | 'failed', result?: EvalRunResult, error?: string }`
- **Toast system** z STORY-2.5 — `import { toast } from 'sonner'`; `toast.success(msg)`, `toast.error(msg)`

### Stan systemu przed tą story

Przed rozpoczęciem implementacji MUSZĄ być gotowe:
1. **STORY-1.6 DONE** — `/src/components/eval/EvalFrameworkPanel.tsx` istnieje, renderuje aktualny eval score i kategorii z `useEval()`; zakładka `?tab=eval` działa, `EvalTab.tsx` istnieje
2. **STORY-2.3 DONE** — backend endpoint `POST /api/eval/run` zwraca `{ runId: string }` z HTTP 202; endpoint `GET /api/eval/run/{runId}/status` zwraca status i wynik
3. **STORY-2.5 DONE** — Sonner toast system jest skonfigurowany globalnie w `layout.tsx` (lub `_app.tsx`); `import { toast } from 'sonner'` działa w dowolnym komponencie

Typy do dodania do `/src/types/api.ts` (jeśli nie istnieją po STORY-2.3):
```typescript
// Wynik jednego eval runu
interface EvalRunResult {
  score_percent: number;    // np. 87 (procent, liczba całkowita)
  passed: number;           // np. 13 (liczba testów passed)
  total: number;            // np. 15 (łączna liczba testów)
  duration_seconds: number; // np. 23 (czas trwania runu)
  categories?: {
    name: string;
    score: number; // 0.0 - 1.0
  }[];
}

// Response z GET /api/eval/run/{runId}/status
interface EvalRunStatusResponse {
  status: 'running' | 'done' | 'failed';
  result?: EvalRunResult;   // istnieje gdy status === 'done'
  error?: string;           // istnieje gdy status === 'failed'
}
```

---

## ✅ Acceptance Criteria

### AC-1: Przycisk "Uruchom Eval" jest widoczny w panelu Eval

GIVEN: Użytkownik wchodzi na `http://localhost:3000/?tab=eval`
WHEN: Komponent `EvalFrameworkPanel` jest zamontowany i `useEvalRun` zwraca `{ isRunning: false }`
THEN: W nagłówku karty (`.card-hdr`) widoczny jest przycisk "▶ Uruchom Eval" (lub "Run Eval Now"):
  - Styl: `background: linear-gradient(135deg, #7c3aed, #3b82f6)`, `color: #fff`, `border: none`, `border-radius: 8px`, `padding: 6px 14px`, `font-size: 12px`, `font-weight: 600`, `cursor: pointer`
  - Przycisk jest **enabled** (nie ma atrybutu `disabled`)
AND: Link "Run eval →" z STORY-1.6 jest zastąpiony tym przyciskiem (nie oba elementy jednocześnie)

### AC-2: Kliknięcie przycisku triggeruje eval run i pokazuje loading state

GIVEN: Przycisk "▶ Uruchom Eval" jest widoczny i enabled
WHEN: Użytkownik klika przycisk "▶ Uruchom Eval"
THEN: W ciągu 50ms przycisk staje się disabled i zmienia tekst na "Eval w toku..." z spinner (animowany element, np. CSS `border-radius:50%; animation:spin 1s linear infinite`)
AND: W ciągu 200ms (przed lub po otrzymaniu odpowiedzi 202) pojawia się progress bar pod przyciskiem:
  - Styl: szerokość `100%`, height `4px`, background `#2a2540`, border-radius `4px`
  - Wypełnienie animuje się indeterminate (animacja CSS: `@keyframes indeterminate { 0% { left:-35%; width:35% } 60% { left:100%; width:35% } 100% { left:100%; width:35% } }`) — pełzający pasek od lewej do prawej, powtarzający się w pętli, kolor `linear-gradient(90deg, #7c3aed, #3b82f6)`
AND: Pod progress barem wyświetla się tekst "Eval w toku..." (font-size:12px, color:#6b7280)
AND: Wywołane jest `POST /api/eval/run` — jeśli odpowiedź zwróci `{ runId: "abc123" }` z HTTP 202, stan zmienia się na `isRunning: true`, `runId: "abc123"`

### AC-3: Polling statusu co 3 sekundy do zakończenia runu

GIVEN: Eval run jest aktywny (`isRunning: true`) i znany jest `runId`
WHEN: Stan `isRunning` zmienia się na `true`
THEN: Hook `useEvalRun` natychmiast (bez czekania 3s) wykonuje pierwsze `GET /api/eval/run/{runId}/status`
AND: Co 3 sekundy (dokładnie: `setInterval` z 3000ms) wykonywany jest kolejny `GET /api/eval/run/{runId}/status`
AND: Gdy odpowiedź zwróci `{ status: 'running' }` — kontynuuj polling, brak zmiany UI (spinner i progress bar trwają)
AND: Gdy odpowiedź zwróci `{ status: 'done', result: { ... } }` — zatrzymaj interval (`clearInterval`), stan przechodzi do `isDone: true`, wynik jest zapisany do state
AND: Gdy odpowiedź zwróci `{ status: 'failed', error: "..." }` — zatrzymaj interval, stan przechodzi do `isError: true`, error message zapisany do state
AND: `clearInterval` jest wywoływany przy unmount komponentu (cleanup w `useEffect` return)

### AC-4: Inline result po zakończeniu runu

GIVEN: Polling zwrócił `{ status: 'done', result: { score_percent: 87, passed: 13, total: 15, duration_seconds: 23 } }`
WHEN: Stan `isDone` zmienia się na `true`
THEN: Loading state (spinner + progress bar + "Eval w toku...") jest UKRYTY
AND: W miejscu loading state pojawia się sekcja inline result z elementami:
  - Duża liczba `score_percent` (`.ev-num`: font-size:36px, font-weight:800, color:#4ade80 gdy >=80% LUB color:#f87171 gdy <80%)
  - Etykieta "Pass Rate" poniżej (`.ev-lbl`: font-size:10px, color:#6b7280)
  - Sub-tekst `{passed}/{total} passed` (`.ev-sub`: font-size:10px; color:#4ade80 gdy >=80%, color:#f87171 gdy <80%)
  - Czas trwania: "Czas: {duration_seconds}s" (font-size:10px, color:#4b4569, marginTop:4px)
AND: Sekcja result jest wyświetlona w tym samym layoucie co istniejący `eval-score-area` z STORY-1.6 (wymiana treści, nie nowy layout)
AND: Przycisk "▶ Uruchom Eval" wraca do stanu enabled (można uruchomić kolejny eval)

### AC-5: Toast notification po zakończeniu runu

GIVEN: Polling zwrócił `{ status: 'done', result: { score_percent: 87, passed: 13, total: 15 } }`
WHEN: `isDone` zmienia się na `true`
THEN: Wyświetlony jest toast Sonner:
  - Treść: `"Eval zakończony: 87% (13/15 passed)"`
  - Kolor: zielony styl (Sonner: `toast.success(...)`) gdy `score_percent >= 80`
  - Kolor: czerwony styl (Sonner: `toast.error(...)`) gdy `score_percent < 80`
AND: Toast pojawia się w ciągu 200ms od przejścia do stanu `isDone`
AND: Toast jest widoczny przez domyślny czas Sonner (4 sekundy), po czym znika

### AC-6: Stan błędu z przyciskiem Retry

GIVEN: Polling zwrócił `{ status: 'failed', error: "Timeout: bridge eval run nie odpowiedział w 60s" }`
WHEN: `isError` zmienia się na `true`
THEN: Loading state (spinner + progress bar) jest UKRYTY
AND: W panelu wyświetla się komunikat błędu:
  - Ikonka "⚠️" (emoji, margin-right:6px)
  - Tekst: "Eval nie powiódł się: Timeout: bridge eval run nie odpowiedział w 60s" (font-size:12px, color:#f87171)
  - Przycisk "Spróbuj ponownie" (background:`#2a2540`, color:`#e6edf3`, border:none, border-radius:8px, padding:6px 12px, font-size:11px, cursor:pointer) — wyświetlony pod komunikatem błędu
AND: Kliknięcie "Spróbuj ponownie" resetuje stan do initial (`isRunning:false`, `isError:false`, `result:null`, `runId:null`) i natychmiast triggeruje nowy `POST /api/eval/run`
AND: Przycisk "▶ Uruchom Eval" wraca do stanu enabled gdy `isError: true` (alternatywna droga do retry)
AND: Toast błędu: `toast.error("Eval nie powiódł się: {error}")` wyświetlony przy przejściu do `isError`

### AC-7: Jeden run naraz — przycisk disabled podczas trwającego runu

GIVEN: Eval run jest aktywny (`isRunning: true`)
WHEN: Użytkownik próbuje kliknąć przycisk "Eval w toku..." (który zastąpił "▶ Uruchom Eval")
THEN: Przycisk ma atrybut `disabled` i style wskazujące niedostępność: `opacity: 0.6`, `cursor: not-allowed`
AND: Kliknięcie NIE triggeruje nowego `POST /api/eval/run`
AND: Na przycisku jest spinner + tekst "Eval w toku..." (nie "▶ Uruchom Eval")

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

Route: `/?tab=eval`
Komponent do modyfikacji: `/src/components/eval/EvalFrameworkPanel.tsx`
Nowy hook: `/src/hooks/useEvalRun.ts`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `EvalFrameworkPanel` | Panel (modyfikacja) | brak zmian w props | idle, running, done, error |
| `EvalRunButton` | Button | `isRunning`, `onClick` | enabled, disabled+spinner |
| `EvalProgressBar` | div | widoczny gdy `isRunning` | indeterminate animation |
| `EvalInlineResult` | div | `result: EvalRunResult` | success (green), failure (red) |
| `EvalErrorState` | div | `error: string`, `onRetry` | widoczny gdy `isError` |

### Implementacja hook `useEvalRun.ts` krok po kroku

Plik: `/src/hooks/useEvalRun.ts`

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { EvalRunResult } from '../types/api';

type EvalRunState = 
  | { phase: 'idle' }
  | { phase: 'starting' }     // POST wysłany, czekamy na 202
  | { phase: 'running'; runId: string }  // Mamy runId, polling aktywny
  | { phase: 'done'; result: EvalRunResult }
  | { phase: 'error'; error: string };

export function useEvalRun() {
  const [state, setState] = useState<EvalRunState>({ phase: 'idle' });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup przy unmount lub zmianie runId
  const clearPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPolling(); // Cleanup przy unmount
  }, [clearPolling]);

  // Polling jednego statusu
  const pollStatus = useCallback(async (runId: string) => {
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`/api/eval/run/${runId}/status`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { status: string; result?: EvalRunResult; error?: string };

      if (data.status === 'done' && data.result) {
        clearPolling();
        setState({ phase: 'done', result: data.result });
      } else if (data.status === 'failed') {
        clearPolling();
        setState({ phase: 'error', error: data.error ?? 'Nieznany błąd' });
      }
      // jeśli 'running' — nic nie robimy, polling kontynuuje
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // Ignoruj cancelled requests
      // Błąd sieciowy — zatrzymaj polling, pokaż błąd
      clearPolling();
      setState({ phase: 'error', error: (err as Error).message });
    }
  }, [clearPolling]);

  // Trigger eval run
  const triggerRun = useCallback(async () => {
    if (state.phase === 'running' || state.phase === 'starting') return; // Guard: jeden run naraz
    
    setState({ phase: 'starting' });
    
    try {
      const res = await fetch('/api/eval/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const { runId } = await res.json() as { runId: string };
      
      setState({ phase: 'running', runId });
      
      // Pierwsze poll natychmiast
      await pollStatus(runId);
      
      // Kolejne co 3 sekundy (tylko jeśli stan nadal 'running')
      intervalRef.current = setInterval(() => {
        // Sprawdź aktualny stan przez ref żeby uniknąć stale closure
        setState(prev => {
          if (prev.phase === 'running') {
            pollStatus(prev.runId); // fire-and-forget
          }
          return prev; // Brak zmiany state — tylko efekt uboczny
        });
      }, 3000);

    } catch (err) {
      setState({ phase: 'error', error: (err as Error).message });
    }
  }, [state.phase, pollStatus]);

  // Retry — reset i trigger
  const retry = useCallback(() => {
    clearPolling();
    setState({ phase: 'idle' });
    // Wywołaj triggerRun w następnym tick (po ustawieniu idle)
    setTimeout(() => triggerRun(), 0);
  }, [clearPolling, triggerRun]);

  return {
    phase: state.phase,
    isRunning: state.phase === 'starting' || state.phase === 'running',
    isDone: state.phase === 'done',
    isError: state.phase === 'error',
    result: state.phase === 'done' ? state.result : null,
    error: state.phase === 'error' ? state.error : null,
    triggerRun,
    retry,
  };
}
```

**Uwaga implementacyjna dotycząca pollStatus + setInterval:**
Powyższy wzorzec z `setState(prev => { pollStatus(); return prev; })` jest trochę hacky (efekt uboczny w setState). Alternatywnie użyj `useRef` do przechowywania aktualnego `runId` i wywołuj `pollStatus(runIdRef.current)` bezpośrednio w `setInterval`:
```typescript
const runIdRef = useRef<string | null>(null);
// Przy setState({ phase: 'running', runId }) ustaw też: runIdRef.current = runId;
// W setInterval: if (runIdRef.current) pollStatus(runIdRef.current);
```

### Implementacja `EvalFrameworkPanel.tsx` krok po kroku

Plik: `/src/components/eval/EvalFrameworkPanel.tsx` — **modyfikacja istniejącego komponentu z STORY-1.6**

1. **Dodaj importy** na górze pliku:
   ```typescript
   import { useEffect } from 'react';
   import { toast } from 'sonner';
   import { useEvalRun } from '../../hooks/useEvalRun';
   ```

2. **W ciele komponentu** dodaj hook:
   ```typescript
   const { phase, isRunning, isDone, isError, result, error, triggerRun, retry } = useEvalRun();
   ```

3. **Efekt dla toasta** — uruchom toast przy przejściu do done/error:
   ```typescript
   useEffect(() => {
     if (isDone && result) {
       const msg = `Eval zakończony: ${result.score_percent}% (${result.passed}/${result.total} passed)`;
       if (result.score_percent >= 80) {
         toast.success(msg);
       } else {
         toast.error(msg);
       }
     }
   }, [isDone]); // Celowo pomijamy result w deps — toast tylko przy przejściu do done

   useEffect(() => {
     if (isError && error) {
       toast.error(`Eval nie powiódł się: ${error}`);
     }
   }, [isError]); // Celowo pomijamy error w deps
   ```

4. **W JSX nagłówka karty** zastąp `"Run eval →"` przyciskiem:
   ```tsx
   {/* USUŃ: <span className="see-all">Run eval →</span> */}
   {/* DODAJ: */}
   <button
     onClick={triggerRun}
     disabled={isRunning}
     aria-label={isRunning ? 'Eval w toku' : 'Uruchom Eval Now'}
     style={{
       background: isRunning
         ? '#2a2540'
         : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
       color: isRunning ? '#6b7280' : '#fff',
       border: 'none',
       borderRadius: '8px',
       padding: '5px 12px',
       fontSize: '11px',
       fontWeight: '600',
       cursor: isRunning ? 'not-allowed' : 'pointer',
       opacity: isRunning ? 0.6 : 1,
       display: 'flex',
       alignItems: 'center',
       gap: '6px',
       transition: 'opacity 0.2s',
     }}
   >
     {isRunning ? (
       <>
         <span style={{
           width: '10px', height: '10px',
           border: '2px solid #6b7280',
           borderTopColor: '#818cf8',
           borderRadius: '50%',
           animation: 'spin 1s linear infinite',
           display: 'inline-block',
         }} aria-hidden="true" />
         Eval w toku...
       </>
     ) : '▶ Uruchom Eval'}
   </button>
   ```

   Dodaj CSS keyframe `spin` globalnie lub w `globals.css`:
   ```css
   @keyframes spin {
     from { transform: rotate(0deg); }
     to   { transform: rotate(360deg); }
   }
   ```

5. **W obszarze content karty** — logika warunkowego renderowania:
   ```tsx
   {/* Loading state — visible gdy isRunning */}
   {isRunning && (
     <div style={{ marginBottom: '12px' }}>
       {/* Progress bar indeterminate */}
       <div style={{
         position: 'relative',
         width: '100%',
         height: '4px',
         background: '#2a2540',
         borderRadius: '4px',
         overflow: 'hidden',
         marginBottom: '6px',
       }}>
         <div style={{
           position: 'absolute',
           height: '100%',
           width: '35%',
           background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
           borderRadius: '4px',
           animation: 'indeterminate 1.5s ease-in-out infinite',
         }} aria-hidden="true" />
       </div>
       <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>
         Eval w toku...
       </div>
     </div>
   )}

   {/* Inline result — visible gdy isDone */}
   {isDone && result && (
     <div className="eval-score-area">
       <div className="ev-big">
         <div
           className="ev-num"
           style={{ color: result.score_percent >= 80 ? '#4ade80' : '#f87171' }}
         >
           {result.score_percent}%
         </div>
         <div className="ev-lbl">Pass Rate</div>
         <div
           className="ev-sub"
           style={{ color: result.score_percent >= 80 ? '#4ade80' : '#f87171' }}
         >
           {result.passed}/{result.total} passed
         </div>
         <div style={{ fontSize: '10px', color: '#4b4569', marginTop: '4px' }}>
           Czas: {result.duration_seconds}s
         </div>
       </div>
       {/* Kategorie z useEval() (istniejące dane) lub z result.categories jeśli dostępne */}
       {result.categories && (
         <div className="eval-cats">
           {result.categories.map(cat => (
             <div className="ecat" key={cat.name}>
               <div className="ecat-name">{cat.name}</div>
               <div className="ecat-bg">
                 <div
                   className="ecat-fill"
                   style={{ width: `${cat.score * 100}%` }}
                 />
               </div>
               <div className="ecat-pct">{Math.round(cat.score * 100)}%</div>
             </div>
           ))}
         </div>
       )}
     </div>
   )}

   {/* Error state — visible gdy isError */}
   {isError && error && (
     <div style={{
       background: '#3a1a1a',
       border: '1px solid #5a2a2a',
       borderRadius: '8px',
       padding: '12px 14px',
       marginBottom: '12px',
     }}>
       <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '8px' }}>
         ⚠️ Eval nie powiódł się: {error}
       </div>
       <button
         onClick={retry}
         style={{
           background: '#2a2540',
           border: 'none',
           borderRadius: '8px',
           padding: '6px 12px',
           color: '#e6edf3',
           fontSize: '11px',
           cursor: 'pointer',
         }}
         aria-label="Spróbuj ponownie uruchomić eval"
       >
         Spróbuj ponownie
       </button>
     </div>
   )}

   {/* Domyślny widok (idle) — istniejące dane z useEval() z STORY-1.6 */}
   {!isRunning && !isDone && !isError && (
     /* Istniejący JSX z EvalFrameworkPanel z STORY-1.6 — eval-score-area z useEval() */
     <ExistingEvalContent evalData={evalData} />
   )}
   ```

   CSS keyframe `indeterminate` dodaj globalnie w `globals.css`:
   ```css
   @keyframes indeterminate {
     0%   { left: -35%; width: 35%; }
     60%  { left: 100%; width: 35%; }
     100% { left: 100%; width: 35%; }
   }
   ```

### Stany widoku (EvalFrameworkPanel)

**Idle (domyślny):**
Istniejący widok z STORY-1.6: duże "Pass Rate" z `useEval()`, kategorie z progress barami. Przycisk "▶ Uruchom Eval" w nagłówku karty (enabled, gradient). Nie ma progress bara ani loading state.

**Running (eval w toku):**
Przycisk zmieniony na "Eval w toku..." (spinner + disabled + opacity 0.6). Progress bar indeterminate (pełzający pasek gradient fioletowy, height 4px). Tekst "Eval w toku..." pod progress barem (font-size:11px, color:#6b7280, text-align:center). Istniejące dane eval (score z useEval()) mogą być ukryte lub widoczne — decyzja implementacyjna; domyślnie ukryj żeby nie mylić z nowym wynikiem.

**Done (wynik dostępny):**
Progress bar ukryty. Inline result: duże `{score_percent}%` (36px, zielony gdy >=80% / czerwony gdy <80%), "{passed}/{total} passed", "Czas: {duration_seconds}s". Przycisk "▶ Uruchom Eval" wraca do stanu enabled. Toast widoczny przez 4s.

**Error (eval nie powiódł się):**
Progress bar ukryty. Czerwone tło z komunikatem błędu i przyciskiem "Spróbuj ponownie". Przycisk "▶ Uruchom Eval" enabled (alternatywny trigger). Toast błędu przez 4s.

### Flow interakcji krok po kroku

```
1. Użytkownik wchodzi na /?tab=eval
   → EvalFrameworkPanel renderuje się
   → useEvalRun() inicjalizuje się z phase='idle'
   → Widoczny: istniejący eval score (useEval()), przycisk "▶ Uruchom Eval" (enabled)

2. Użytkownik klika "▶ Uruchom Eval"
   → triggerRun() wywołany
   → setState({ phase: 'starting' }) — przycisk natychmiast disabled + spinner
   → fetch('POST /api/eval/run') wysłany

3. API odpowiada 202 z { runId: "run-abc123" }
   → setState({ phase: 'running', runId: 'run-abc123' })
   → Progress bar indeterminate pojawia się
   → Tekst "Eval w toku..." pojawia się
   → Natychmiast: pollStatus('run-abc123') wywołany

4. GET /api/eval/run/run-abc123/status odpowiada { status: 'running' }
   → Stan nie zmienia się — polling kontynuuje

5. Po 3 sekundach: kolejne GET /api/eval/run/run-abc123/status
   → Może wrócić 'running' (powtarzamy) lub 'done' (przejdź do 6)

6. GET /api/eval/run/run-abc123/status odpowiada { status: 'done', result: { score_percent: 87, passed: 13, total: 15, duration_seconds: 23 } }
   → clearInterval() — polling zatrzymany
   → setState({ phase: 'done', result: {...} })
   → Progress bar znika
   → Inline result pojawia się: "87%" (zielony), "13/15 passed", "Czas: 23s"
   → Przycisk "▶ Uruchom Eval" wraca (enabled)
   → Toast: "Eval zakończony: 87% (13/15 passed)" (zielony — bo >=80%)

7. [Wariant błędu] GET /api/eval/run/run-abc123/status odpowiada { status: 'failed', error: 'Timeout' }
   → clearInterval()
   → setState({ phase: 'error', error: 'Timeout' })
   → Komunikat błędu + przycisk "Spróbuj ponownie" pojawia się
   → Toast błędu: "Eval nie powiódł się: Timeout" (czerwony)

8. Użytkownik klika "Spróbuj ponownie"
   → retry() wywołany
   → State resetuje się do idle
   → Automatycznie wywołuje się triggerRun() — wracamy do kroku 2
```

### Design Reference (mockup)

**Tab "Eval"** — sekcja `<!-- ACTIVITY FEED + EVAL -->` w `kira-dashboard-mockup-v3.html`, prawa karta:
- Karta: `.card` — `background:#1a1730; border:1px solid #2a2540; border-radius:10px; padding:15px`
- Nagłówek: `.card-hdr` — `display:flex; align-items:center; margin-bottom:12px`; tytuł "Eval Framework" (font-size:13px, font-weight:700, color:#e6edf3), sub "— latest run" (font-size:11px, color:#4b4569)
- Score area: `.eval-score-area` — `display:flex; gap:16px; align-items:center; margin-bottom:12px`
- Duży procent: `.ev-num` — `font-size:36px; font-weight:800; color:#4ade80; line-height:1`
- Etykieta: `.ev-lbl` — `font-size:10px; color:#6b7280`
- Sub: `.ev-sub` — `font-size:10px; color:#4ade80; margin-top:2px`
- Kategorie: `.eval-cats` — `flex:1; display:flex; flex-direction:column; gap:4px`
- Wiersz kategorii: `.ecat` — `display:flex; align-items:center; gap:7px`
- Bar fill: `.ecat-fill` — `background:linear-gradient(90deg,#4ade80,#34d399); height:5px; border-radius:3px`
- Przycisk "▶ Uruchom Eval" — wzoruj na `.btn-new` z topbara: `background:linear-gradient(135deg,#7c3aed,#3b82f6); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:600`
- Kolor błędu: `color:#f87171` (czerwony) — ten sam co w `.s-trend.dn`
- Kolor tła błędu: `#3a1a1a` (ciemnoczerwony) — analogiczny do `.mc-icon.codex { background:#3a1a1a }`

### Responsive / Dostępność

- Desktop (1280px+): Layout jak w STORY-1.6 — eval panel w prawej kolumnie (grid 2-kolumnowy)
- Tablet/Mobile: poza zakresem (desktop-first w EPIC-2)
- Keyboard navigation:
  - Tab dotarcie do przycisku "▶ Uruchom Eval" (lub "Eval w toku..." gdy disabled)
  - Enter na przycisku "▶ Uruchom Eval" → triggerRun()
  - Tab na przycisk "Spróbuj ponownie" (gdy error state) → retry()
  - Escape nie ma specjalnego działania (brak modalu)
- ARIA:
  - `aria-label="Uruchom Eval Now"` na przycisku (zmienia się na `aria-label="Eval w toku"` gdy running)
  - `aria-disabled="true"` na przycisku gdy `isRunning`
  - `aria-live="polite"` na kontenenerze progress/result (zmiana stanu jest ogłaszana przez screen reader)
  - `aria-label="Spróbuj ponownie uruchomić eval"` na przycisku Retry
  - Progress bar: `role="progressbar"`, `aria-valuenow` nie jest ustawiany (indeterminate), `aria-label="Eval w toku"`

---

## ⚠️ Edge Cases

### EC-1: POST /api/eval/run zwraca błąd HTTP (5xx lub sieć niedostępna)

Scenariusz: Bridge API jest offline lub `/api/eval/run` zwraca HTTP 500 przy kliknięciu "▶ Uruchom Eval".
Oczekiwane zachowanie: `triggerRun()` łapie błąd w `catch`, ustawia `setState({ phase: 'error', error: 'HTTP 500: ...' })`. Ani `setInterval` ani polling nie jest uruchamiany. Panel pokazuje stan błędu z przyciskiem "Spróbuj ponownie". Toast błędu: "Eval nie powiódł się: HTTP 500: ...".
Komunikat dla użytkownika: "⚠️ Eval nie powiódł się: HTTP 500: Internal Server Error" + przycisk "Spróbuj ponownie"

### EC-2: Polling timeout — run trwa > 5 minut

Scenariusz: Bridge eval run "wisi" i nigdy nie zwraca `status: 'done'` ani `status: 'failed'`. Polling wykonuje się w nieskończoność.
Oczekiwane zachowanie: `useEvalRun` implementuje timeout: jeśli po 5 minutach (300 sekund) run nadal ma `status: 'running'`, hook automatycznie zatrzymuje polling i ustawia `phase: 'error'` z komunikatem "Timeout: eval run trwa zbyt długo (>5 min). Sprawdź Bridge CLI.". Implementacja: licznik pollów (`const pollCount = useRef(0)`; inkrementuj przy każdym pollStatus; gdy `pollCount.current > 100` → clearInterval + setError).
Komunikat dla użytkownika: "⚠️ Eval nie powiódł się: Timeout: eval run trwa zbyt długo (>5 min). Sprawdź Bridge CLI."

### EC-3: Użytkownik przełącza tab podczas trwającego runu

Scenariusz: Eval run jest aktywny (`isRunning: true`), użytkownik klika zakładkę "Pipeline" — `EvalFrameworkPanel` jest unmountowany.
Oczekiwane zachowanie: `useEffect` cleanup (`return () => clearPolling()`) jest wywoływany przy unmount. `clearInterval` i `AbortController.abort()` są wywołane. Żadne `setState` nie jest wywoływane po unmount (zapobiega React warning "Can't perform a state update on an unmounted component"). Gdy użytkownik wróci na `?tab=eval`, hook inicjalizuje się od nowa z `phase: 'idle'` — wynik poprzedniego runu jest tracony (nie jest cachowany poza komponentem).

### EC-4: Wynik runu ma score_percent = 0 lub 100

Scenariusz: Eval zwraca `{ score_percent: 0, passed: 0, total: 15 }` lub `{ score_percent: 100, passed: 15, total: 15 }`.
Oczekiwane zachowanie dla 0%: `ev-num` ma kolor `#f87171` (czerwony) bo `0 < 80`. Toast: `toast.error("Eval zakończony: 0% (0/15 passed)")`. Sub-tekst: "0/15 passed" w kolorze `#f87171`.
Oczekiwane zachowanie dla 100%: `ev-num` ma kolor `#4ade80` (zielony) bo `100 >= 80`. Toast: `toast.success("Eval zakończony: 100% (15/15 passed)")`.

### EC-5: GET /api/eval/run/{runId}/status zwraca błąd HTTP podczas pollingu

Scenariusz: Po uruchomieniu runu Bridge API staje się niedostępny i `/api/eval/run/{runId}/status` zwraca HTTP 503 lub sieć wypada.
Oczekiwane zachowanie: `pollStatus()` łapie błąd w `catch`. Jeśli to nie `AbortError` — `clearPolling()` + `setState({ phase: 'error', error: 'HTTP 503: Service Unavailable' })`. NIE kontynuuj pollingu po błędzie sieciowym (nie chcemy flood requestów). Użytkownik widzi stan błędu z "Spróbuj ponownie".

---

## 🚫 Out of Scope tej Story

- Wyświetlanie szczegółowych wyników per kategoria z bieżącego runu (tylko jeśli `result.categories` jest dostępne — opcjonalne)
- Historia eval runów (lista ostatnich N runów) — tylko najnowszy wynik inline
- Konfiguracja eval przed uruchomieniem (np. wybór suite, timeout) — zawsze `POST /api/eval/run` bez body
- WebSocket zamiast pollingu — polling co 3s wystarczy dla MVP
- Anulowanie trwającego runu (`DELETE /api/eval/run/{runId}`) — brak przycisku Cancel
- Eksport wyników eval do pliku CSV/JSON
- Porównanie wyników z poprzednim runem (trend ↑/↓)

---

## ✔️ Definition of Done

- [ ] Kod przechodzi linter (`next lint`) bez błędów i ostrzeżeń
- [ ] Wszystkie 4 stany widoku zaimplementowane: idle (przycisk enabled + dane z useEval), running (spinner + indeterminate progress bar), done (inline result), error (komunikat + retry)
- [ ] Przycisk "▶ Uruchom Eval" jest widoczny w nagłówku EvalFrameworkPanel w stanie idle
- [ ] Kliknięcie przycisku wywołuje `POST /api/eval/run` i przechodzi do stanu running
- [ ] Progress bar indeterminate renderuje się poprawnie w stanie running
- [ ] Polling `GET /api/eval/run/{runId}/status` co 3s działa i zatrzymuje się po `done`/`failed`
- [ ] `clearInterval` wywoływany przy unmount komponentu (brak React warnings)
- [ ] Inline result pokazuje `score_percent`, `passed/total`, `duration_seconds`
- [ ] Kolor `ev-num` jest zielony (`#4ade80`) gdy >=80% i czerwony (`#f87171`) gdy <80%
- [ ] Toast Sonner wyświetla się z właściwą treścią i kolorem po zakończeniu runu
- [ ] Stan błędu pokazuje komunikat i przycisk "Spróbuj ponownie"
- [ ] Kliknięcie "Spróbuj ponownie" triggeruje nowy run
- [ ] Przycisk disabled (`opacity:0.6`, `cursor:not-allowed`) podczas trwającego runu
- [ ] Timeout > 5 minut przerywa polling z komunikatem o timeout
- [ ] Brak `console.error` podczas normalnego użytkowania
- [ ] Widok działa na rozdzielczości 1280px bez poziomego scrolla
- [ ] Story review przez PO
