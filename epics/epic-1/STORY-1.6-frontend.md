---
story_id: STORY-1.6
title: "Użytkownik widzi zakładkę Eval z panelem Eval Framework i Cost Tracker"
epic: EPIC-1
module: dashboard
domain: frontend
status: ready
difficulty: complex
recommended_model: sonnet-4.6
ux_reference: /Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html
api_reference: none (dane z hooków useEval() i useRuns() z STORY-1.2)
priority: must
estimated_effort: 10 h
depends_on: STORY-1.1, STORY-1.2
blocks: none
tags: [eval, cost-tracker, chart, chartjs, doughnut, hooks, frontend, tabs]
---

## 🎯 User Story

**Jako** Mariusz (admin, jedyny użytkownik dashboardu)
**Chcę** widzieć dedykowaną zakładkę `?tab=eval` z panelem Eval Framework i panelem Cost Tracker
**Żeby** monitorować jakość pipeline'u (score per kategoria, historia eval runów) i szacunkowe koszty API per model — bez potrzeby odpytywania API ręcznie

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie

- **Route:** `http://localhost:3000/?tab=eval`
- **Plik strony:** `/src/app/page.tsx` (lub `/src/app/dashboard/page.tsx` — zależy od setupu z STORY-1.1). Tab jest renderowany warunkowo w głównym komponencie strony na podstawie query parametru `tab`.
- **Nowe pliki do stworzenia:**
  - `/src/components/eval/EvalTab.tsx` — główny kontener zakładki Eval (renderuje EvalFrameworkPanel + CostTrackerPanel)
  - `/src/components/eval/EvalFrameworkPanel.tsx` — górna część: score, kategorie, historia runów, przycisk Run Eval Now
  - `/src/components/eval/CostTrackerPanel.tsx` — dolna część: tabela kosztów + doughnut chart
  - `/src/config/model-costs.ts` — hardcoded ceny API per model (importowany przez CostTrackerPanel)

### Powiązane pliki (z poprzednich stories)

- `/src/hooks/useEval.ts` — hook z STORY-1.2, zwraca dane z `/api/eval/overview`
- `/src/hooks/useRuns.ts` — hook z STORY-1.2, zwraca listę runów z `/api/status/runs`
- `/src/lib/api-client.ts` — klient HTTP z STORY-1.1 (obsługuje BRIDGE_URL env var + offline state)

### Stan systemu przed tą story

Przed rozpoczęciem implementacji MUSZĄ być gotowe:
1. **STORY-1.1** — projekt Next.js 16 istnieje, `npm run dev` działa na localhost:3000, Chart.js jest zainstalowane jako dependency, shadcn/ui jest skonfigurowane, Tailwind CSS działa
2. **STORY-1.2** — hook `useEval()` istnieje w `/src/hooks/useEval.ts` i zwraca dane z `/api/eval/overview`; hook `useRuns()` istnieje w `/src/hooks/useRuns.ts` i zwraca dane z `/api/status/runs`; klient API poprawnie obsługuje offline (zwraca null/undefined gdy Bridge API niedostępne)
3. **Bridge API** — `http://localhost:8199` dostarcza endpoint `GET /api/eval/overview` (zwraca dane eval) i `POST /api/eval/run` (triggeruje nowy run); endpoint `GET /api/status/runs` zwraca listę runów z tokenami

---

## ✅ Acceptance Criteria

### AC-1: Zakładka Eval renderuje się po przejściu na ?tab=eval

GIVEN: Użytkownik otwiera dashboard w przeglądarce pod adresem `http://localhost:3000`
WHEN: Użytkownik klika zakładkę "Eval" w pasku zakładek (tabs bar) lub wchodzi bezpośrednio na URL `http://localhost:3000/?tab=eval`
THEN: W obszarze treści (`.content`) renderuje się komponent `EvalTab`, który zawiera dwa panele: `EvalFrameworkPanel` (górna część) i `CostTrackerPanel` (dolna część)
AND: URL w pasku przeglądarki pokazuje `?tab=eval` (query param jest ustawiany przez Next.js router)
AND: W tabs barze zakładka "Eval" ma klasę `active` (styl: `color:#818cf8; border-bottom: 2px solid #818cf8; font-weight:600; background:#13111c`)

### AC-2: EvalFrameworkPanel wyświetla pass rate i score bars z useEval()

GIVEN: Hook `useEval()` zwróci dane (Bridge API jest online i endpoint `/api/eval/overview` odpowiada)
WHEN: Komponent `EvalFrameworkPanel` zostaje zamontowany
THEN: W górnej części panelu wyświetla się obszar `.eval-score-area` (flexbox, gap:16px, align-items:center) z dwoma elementami:
  - Element `.ev-big` (text-align:center) pokazuje:
    - Duży procent pass rate (`.ev-num`: font-size:36px, font-weight:800, color:#4ade80) np. "100%" lub "80%"
    - Etykietę "Pass Rate" (`.ev-lbl`: font-size:10px, color:#6b7280)
    - Sub-tekst w formacie "X/Y passed" gdzie X = liczba passed, Y = total (`.ev-sub`: font-size:10px, color:#4ade80)
  - Element `.eval-cats` (flex, flex-direction:column, gap:4px) pokazuje listę kategorii score bars
AND: Każdy wiersz kategorii (`.ecat`) zawiera:
  - Nazwę kategorii (`.ecat-name`: font-size:10px, color:#6b7280, width:125px, white-space:nowrap, overflow:hidden, text-overflow:ellipsis)
  - Background bar (`.ecat-bg`: flex:1, background:#2a2540, border-radius:3px, height:5px)
  - Wypełnienie bar (`.ecat-fill` wewnątrz `.ecat-bg`: background:linear-gradient(90deg,#4ade80,#34d399), height:5px, border-radius:3px; width ustawiony inline jako `${score * 100}%` gdzie score pochodzi z useEval())
  - Wartość procentowa (`.ecat-pct`: font-size:10px, color:#4ade80, width:30px, text-align:right) np. "85%"

### AC-3: EvalFrameworkPanel wyświetla historię 5 ostatnich eval runów

GIVEN: Hook `useEval()` zwrócił dane zawierające pole `recent_runs` (tablica obiektów z polami: id, date, total_score, passed, duration_ms)
WHEN: Komponent `EvalFrameworkPanel` wyrenderuje sekcję historii
THEN: Poniżej score area wyświetla się sekcja z nagłówkiem "Last 5 Eval Runs" (font-size:11px, font-weight:700, color:#4b4569, text-transform:uppercase, letter-spacing:0.07em)
AND: Tabela lub lista pokazuje maksymalnie 5 wierszy (jeśli `recent_runs.length > 5`, pokaż pierwsze 5)
AND: Każdy wiersz zawiera dokładnie (w jednym `div` z flexbox, background:#13111c, border-radius:7px, padding:7px 11px, margin-bottom:5px):
  - Datę run'u: sformatowaną jako "DD Mon HH:MM" (np. "19 Feb 11:46") — font-size:11px, color:#6b7280, width:110px
  - Score ogólny: np. "94.5" lub "100.0" — font-size:12px, font-weight:700, color:#e6edf3, width:50px
  - Status PASS/FAIL badge:
    - "PASS" — background:#1a3a1a, color:#4ade80, font-size:10px, padding:2px 7px, border-radius:7px, font-weight:600
    - "FAIL" — background:#3a1a1a, color:#f87171, font-size:10px, padding:2px 7px, border-radius:7px, font-weight:600
  - Czas trwania: sformatowany jako "Xm Ys" (np. "2m 14s") obliczony z duration_ms — font-size:10px, color:#4b4569, text-align:right, margin-left:auto

### AC-4: Przycisk "Run Eval Now" triggeruje eval i pokazuje wynik inline

GIVEN: Bridge API jest online, `EvalFrameworkPanel` jest zamontowany i wyświetla dane
WHEN: Użytkownik klika przycisk "Run Eval Now" umieszczony w prawym górnym rogu `.card-hdr` sekcji EvalFrameworkPanel
THEN: Natychmiast (synchronicznie, przed otrzymaniem odpowiedzi) przycisk zmienia stan na loading:
  - Tekst przycisku zmienia się na "Running..." 
  - Przycisk ma atrybut `disabled={true}` (nie można kliknąć ponownie)
  - Opcjonalnie: animowany spinner obok tekstu (border-radius:50%, animation:spin 1s linear infinite)
AND: Aplikacja wysyła `POST http://{BRIDGE_URL}/api/eval/run` (gdzie BRIDGE_URL to wartość `process.env.NEXT_PUBLIC_BRIDGE_URL` lub domyślnie `http://localhost:8199`) z pustym body `{}`
AND: Po otrzymaniu odpowiedzi z API (status 200 lub 201):
  - Przycisk wraca do stanu normalnego ("Run Eval Now", nie disabled)
  - Poniżej przycisku (lub w obszarze score area) pojawia się inline komunikat sukcesu przez 5 sekund: "✅ Eval completed — score: {total_score}%" (font-size:12px, color:#4ade80)
  - Po 5 sekundach komunikat znika (lub hook useEval() jest automatycznie re-fetchwany żeby odświeżyć dane)

### AC-5: Stan offline — "Eval unavailable"

GIVEN: Bridge API jest niedostępne (hook `useEval()` zwraca null lub błąd, bo klient API obsługuje offline)
WHEN: Komponent `EvalFrameworkPanel` zostaje zamontowany lub Bridge API stanie się niedostępne podczas działania
THEN: Zamiast score bars i historii, w panelu EvalFrameworkPanel wyświetla się komunikat "Eval unavailable" (font-size:13px, color:#4b4569, text-align:center, padding:24px 0)
AND: Przycisk "Run Eval Now" jest widoczny ale ma atrybut `disabled={true}` i zmniejszoną opacity (opacity:0.5)
AND: Panel CostTrackerPanel NADAL jest widoczny (jeśli useRuns() zwraca dane, cost tracker działa niezależnie)

### AC-6: CostTrackerPanel wyświetla tabelę kosztów

GIVEN: Hook `useRuns()` zwrócił dane (lista run obiektów z polami: model, input_tokens, output_tokens)
WHEN: Komponent `CostTrackerPanel` zostaje zamontowany
THEN: Renderuje się sekcja z nagłówkiem karty (`.card-hdr`): "Cost Tracker" (font-size:13px, font-weight:700, color:#e6edf3) i sub-tekstem "— est. today" (font-size:11px, color:#4b4569)
AND: Dla każdego z 4 modeli wyświetla się wiersz (`.cost-row`: flexbox, align-items:center, gap:9px, background:#13111c, border-radius:7px, padding:7px 11px, margin-bottom:5px) z następującymi polami:
  - **Model** (`.cost-model`: font-size:12px, color:#e6edf3, font-weight:600, flex:1): pełna nazwa modelu — "Kimi K2.5", "GLM-5", "Sonnet 4.6", "Codex 5.3"
  - **Runs** (font-size:11px, color:#6b7280, width:44px, text-align:right): liczba runów danego modelu np. "22 runs"
  - **Avg tokens** (font-size:11px, color:#6b7280, width:70px, text-align:right): średnia liczba tokenów per run w formacie "Xk" (zaokrąglone do tysięcy) np. "12k"
  - **Est. cost/run** (font-size:11px, color:#6b7280, width:75px, text-align:right): szacunkowy koszt jednego runa np. "~$0.00" lub "~$0.15"
  - **Total est. cost** (`.cost-val`: font-size:11px, color:#e6edf3, font-weight:600, width:60px, text-align:right): łączny koszt np. "~$2.10"
AND: Na dole (po ostatnim wierszu modelu), poniżej linii separatora (border-top:1px solid #2a2540), wyświetla się wiersz z "Total today" (font-size:12px, color:#6b7280) i sumą kosztów wszystkich modeli (font-size:14px, font-weight:700, color:#e6edf3) np. "~$4.20"

### AC-7: CostTrackerPanel oblicza koszty po stronie frontendu z hardcoded config

GIVEN: Hook `useRuns()` zwrócił tablicę run obiektów, każdy z polami: `model: string`, `input_tokens: number`, `output_tokens: number`
WHEN: Komponent `CostTrackerPanel` oblicza koszty
THEN: Używa następującej konfiguracji cenowej zaimportowanej z `/src/config/model-costs.ts`:
  ```typescript
  export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
    'kimi-k2.5':  { input: 0.00, output: 0.00 },    // free tier, cena per 1M tokenów
    'glm-5':      { input: 0.00, output: 0.00 },    // free tier, cena per 1M tokenów
    'sonnet-4.6': { input: 3.00, output: 15.00 },   // $3.00/1M input, $15.00/1M output
    'codex-5.3':  { input: 3.00, output: 12.00 },   // $3.00/1M input, $12.00/1M output
  };
  ```
AND: Dla każdego modelu oblicza:
  1. Filtruje `runs.filter(r => r.model === modelKey)` żeby uzyskać runs danego modelu
  2. Liczy `runCount = runs.length`
  3. Oblicza średnie tokeny: `avgInputTokens = sum(r.input_tokens) / runCount`, `avgOutputTokens = sum(r.output_tokens) / runCount`
  4. Oblicza koszt per run: `costPerRun = (avgInputTokens * price.input + avgOutputTokens * price.output) / 1_000_000`
  5. Oblicza total cost: `totalCost = costPerRun * runCount`
AND: Jeśli model nie ma żadnych runów w danych (`runCount === 0`), wyświetla go z wartościami: Runs="0", Avg tokens="—", Est. cost/run="$0.00", Total="$0.00"
AND: Wartości pieniężne są formatowane jako "$X.XX" (dwa miejsca dziesiętne), a gdy koszt > $0.00 — poprzedzone "~" np. "~$2.10"

### AC-8: Doughnut chart rozkładu kosztów per model

GIVEN: `CostTrackerPanel` obliczył koszty dla wszystkich modeli
WHEN: Komponent się renderuje
THEN: Poniżej tabeli wyświetla się sekcja z nagłówkiem "Rozkład kosztów" (lub "Cost Distribution", font-size:11px, font-weight:700, color:#4b4569, text-transform:uppercase, letter-spacing:0.07em)
AND: Renderuje się element `<canvas id="cost-doughnut">` w kontenerze div o wysokości 200px i szerokości 100%
AND: Chart.js jest inicjalizowany w `useEffect` (po mountowaniu komponentu) jako:
  ```javascript
  new Chart(canvasEl, {
    type: 'doughnut',
    data: {
      labels: ['Kimi K2.5', 'GLM-5', 'Sonnet 4.6', 'Codex 5.3'],
      datasets: [{
        data: [totalCostKimi, totalCostGlm, totalCostSonnet, totalCostCodex],
        backgroundColor: ['#3b82f6', '#22c55e', '#7c3aed', '#ef4444'],
        borderColor: '#13111c',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#6b7280', font: { size: 10 }, padding: 12 }
        }
      },
      cutout: '65%',
      animation: false,
    }
  });
  ```
AND: Gdy wszystkie koszty są 0 (np. tylko darmowe modele były używane), chart wyświetla dane z równymi wartościami dla każdego modelu (np. `[1,1,1,1]`) żeby chart był widoczny, z tooltipem pokazującym "$0.00"
AND: Przy unmountowaniu komponentu (cleanup w `useEffect`) wykres jest niszczony: `chart.destroy()` — żeby uniknąć "Canvas is already in use" błędu przy re-renderowaniu

### AC-9: Stan loading — skeleton podczas ładowania danych

GIVEN: Hook `useEval()` lub `useRuns()` jest w trakcie fetchowania danych (stan `isLoading: true`)
WHEN: Komponent EvalTab renderuje panele
THEN: W miejscu score area (`.eval-score-area`) wyświetlają się placeholder elementy (skeleton):
  - Zamiast `.ev-big`: prostokąt div o wymiarach 60px × 60px, background:#2a2540, border-radius:8px, z animacją pulse (opacity zmienia się 0.5↔1 co 1.5s)
  - Zamiast listy kategorii: 5 prostokątów div o wymiarach 100% × 12px, background:#2a2540, border-radius:3px, margin-bottom:6px, z animacją pulse
AND: W miejscu tabeli cost trackera: 4 prostokąty div o wymiarach 100% × 36px, background:#2a2540, border-radius:7px, margin-bottom:5px, z animacją pulse
AND: W miejscu doughnut chart: kółko div o wymiarach 160px × 160px, background:#2a2540, border-radius:50%, z animacją pulse

---

## 🖥️ Szczegóły Frontend

### Lokalizacja w aplikacji

- Route: `/?tab=eval`
- Główny komponent zakładki: `EvalTab`
- Plik: `/src/components/eval/EvalTab.tsx`
- Pliki do stworzenia: `/src/components/eval/EvalFrameworkPanel.tsx`, `/src/components/eval/CostTrackerPanel.tsx`, `/src/config/model-costs.ts`

### Komponenty

| Komponent | Typ | Kluczowe props | Stany |
|-----------|-----|----------------|-------|
| `EvalTab` | Container | brak (hook wewnątrz) | loading, error, filled |
| `EvalFrameworkPanel` | Card z `.card` class | `data: EvalData \| null`, `isLoading: boolean`, `isOffline: boolean` | loading (skeleton), offline, error, filled |
| `CostTrackerPanel` | Card z `.card` class | `runs: Run[] \| null`, `isLoading: boolean` | loading (skeleton), empty, filled |
| `RunEvalButton` | Button wewnątrz EvalFrameworkPanel | `onRun: () => Promise<EvalRunResult>` | idle, loading, success |
| `CostDoughnutChart` | Chart.js canvas wrapper | `costData: {model: string, cost: number}[]` | rendered, all-zero |

### Typy TypeScript (jeśli nie zdefiniowane w STORY-1.2, zdefiniuj lokalnie)

```typescript
// /src/types/eval.ts (lub użyj istniejącego pliku z STORY-1.2)

export interface EvalCategory {
  name: string;       // np. "intent_classification"
  score: number;      // 0.0–1.0 (nie 0–100!)
}

export interface EvalRecentRun {
  id: string;
  date: string;       // ISO 8601, np. "2026-02-19T11:46:00Z"
  total_score: number; // 0.0–100.0
  passed: boolean;
  duration_ms: number; // czas w milisekundach
}

export interface EvalData {
  pass_rate: number;       // 0.0–1.0, np. 1.0 = 100%
  total_passed: number;    // liczba passed runów
  total_runs: number;      // łączna liczba runów (passed + failed)
  categories: EvalCategory[];
  recent_runs: EvalRecentRun[];
}

export interface Run {
  id: string;
  story_id: string;
  model: string;           // "kimi-k2.5" | "glm-5" | "sonnet-4.6" | "codex-5.3"
  input_tokens: number;
  output_tokens: number;
  status: string;
  started_at: string;      // ISO 8601
  duration_ms: number;
}

export interface EvalRunResult {
  success: boolean;
  total_score: number;     // 0.0–100.0
  message?: string;
}
```

### Design Reference

- **Plik mockupu:** `/Users/mariuszkrawczyk/codermariusz/kira-dashboard/epics/kira-dashboard-mockup-v3.html`
- **Sekcja w mockupie:** Tab "Eval" w tabs-bar + karta "Eval Framework" widoczna w sekcji `<!-- ACTIVITY FEED + EVAL -->` (grid-2, prawa kolumna) + karta "Cost Tracker" widoczna w `<!-- NIGHTCLAW + COST + PATTERNS -->` (grid-3, środkowa kolumna)
- **Szczegóły designu:**
  - Tło strony: `#13111c`
  - Tło kart: `#1a1730`, border: `1px solid #2a2540`, border-radius: `10px`, padding: `15px`
  - Kolor nagłówków kart (h3): `#e6edf3`, font-size: 13px, font-weight: 700
  - Sub-tekst nagłówków: `#4b4569`, font-size: 11px
  - Pass rate wielka liczba: font-size 36px, font-weight 800, kolor `#4ade80` (zielony)
  - Score bars wypełnienie: gradient `linear-gradient(90deg, #4ade80, #34d399)`, height 5px
  - Score bars tło: `#2a2540`, height 5px, border-radius 3px
  - Kolor wartości procentowych kategorii: `#4ade80`
  - Wiersze historii runów: tło `#13111c`, border-radius 7px, padding 7px 11px
  - Kolor PASS badge: background `#1a3a1a`, color `#4ade80`
  - Kolor FAIL badge: background `#3a1a1a`, color `#f87171`
  - Cost rows: tło `#13111c`, border-radius 7px, padding 7px 11px
  - Nazwy modeli w cost tracker: font-size 12px, font-weight 600, `#e6edf3`
  - Liczby "runs": font-size 11px, color `#6b7280`, width 44px
  - Wartości kosztów: font-size 11px, font-weight 600, `#e6edf3`
  - Linia separatora totalu: `border-top: 1px solid #2a2540`
  - Total cost: font-size 14px, font-weight 700, `#e6edf3`
  - Kolory doughnut chart per model: Kimi→`#3b82f6` (blue), GLM→`#22c55e` (green), Sonnet→`#7c3aed` (purple), Codex→`#ef4444` (red)
  - Przycisk "Run Eval Now": klasa `.btn-p` lub inline: background `linear-gradient(135deg,#7c3aed,#3b82f6)`, color `#fff`, border-radius 6px, font-size 11px, font-weight 600, padding 5px 10px

### Pola formularza

Brak formularza — ta story to widok read-only + przycisk triggerujący akcję.

### Stany widoku

**Loading (isLoading = true):**
Oba panele (EvalFrameworkPanel i CostTrackerPanel) wyświetlają skeleton placeholders: prostokąty z tłem `#2a2540` i animacją pulse (Tailwind: `animate-pulse`). Konkretnie:
- EvalFrameworkPanel: kółko 60px (pass rate), 8 pasków (kategorie), 5 prostokątów (historia runów)
- CostTrackerPanel: 4 prostokąty 100% × 36px (wiersze tabeli), kółko 160px (doughnut placeholder)

**Empty / Offline (isOffline = true lub data = null):**
W EvalFrameworkPanel wyświetlany jest komunikat: div z ikoną ⚠️ (font-size:24px) nad tekstem "Eval unavailable" (font-size:13px, color:#4b4569, text-align:center). Cały blok ma padding:24px 0.
Przycisk "Run Eval Now" widoczny ale disabled (opacity:0.5, cursor:not-allowed).
CostTrackerPanel: jeśli `useRuns()` też jest offline → komunikat "Brak danych do obliczenia kosztów" (font-size:12px, color:#4b4569, text-align:center, padding:16px 0)

**Error (nieoczekiwany błąd, np. 500 z API):**
Zamiast danych: div z tekstem "Błąd ładowania danych eval. Odśwież stronę." (font-size:12px, color:#f87171, text-align:center, padding:16px 0)

**Filled (normalny stan, dane załadowane):**
EvalFrameworkPanel: widoczny pass rate, lista kategorii z barami, historia 5 runów, aktywny przycisk "Run Eval Now"
CostTrackerPanel: tabela 4 wierszy (jeden per model), total na dole, doughnut chart

### Flow interakcji (krok po kroku)

```
1. Użytkownik wchodzi na http://localhost:3000/?tab=eval
2. Strona renderuje EvalTab (komponent jest lazy-loaded lub statyczny — zależy od setupu z STORY-1.1)
3. EvalTab montuje EvalFrameworkPanel i CostTrackerPanel
4. Oba panele wewnątrz siebie wywołują hooki: useEval() i useRuns()
5. Podczas ładowania (isLoading=true) → oba panele pokazują skeleton UI
6. useEval() pobiera GET http://{BRIDGE_URL}/api/eval/overview
   a. Jeśli OK (200) → isLoading=false, data=EvalData → EvalFrameworkPanel renderuje dane
   b. Jeśli błąd/offline → isLoading=false, data=null, isOffline=true → "Eval unavailable"
7. useRuns() pobiera GET http://{BRIDGE_URL}/api/status/runs
   a. Jeśli OK (200) → isLoading=false, runs=Run[] → CostTrackerPanel oblicza koszty i renderuje tabelę + chart
   b. Jeśli błąd/offline → isLoading=false, runs=null → "Brak danych do obliczenia kosztów"
8. Użytkownik klika "Run Eval Now":
   a. Przycisk → disabled, tekst → "Running...", opcjonalnie spinner
   b. POST http://{BRIDGE_URL}/api/eval/run, body: {}
   c. Oczekiwanie na odpowiedź (bez timeout, UI blocked dla przycisku)
   d. Odpowiedź OK → przycisk → enabled, komunikat sukcesu "✅ Eval completed — score: X%" przez 5s
   e. Po 5s: useEval() jest re-wywoływany (invalidate/refetch) → tabela historii odświeża się
   f. Odpowiedź błąd → przycisk → enabled, komunikat błędu "❌ Eval failed. Bridge API error." przez 5s
9. Użytkownik scrolluje do Cost Trackera — widzi tabelę i doughnut chart
```

### Responsive / Dostępność

- Desktop (1280px+): dwa panele wyświetlone pionowo (jeden nad drugim) w 100% szerokości content area, każdy jako `.card`
- Tablet/Mobile: poza zakresem tej story (epic zakłada desktop-first 1440px+)
- Keyboard navigation:
  - Przycisk "Run Eval Now" dostępny przez Tab, aktywowany przez Enter/Space
  - Przycisk ma `aria-label="Uruchom ewaluację pipeline'u"`
  - Gdy loading: `aria-disabled="true"` i `aria-busy="true"`
- ARIA:
  - Panel eval ma `role="region"` i `aria-label="Eval Framework"`
  - Panel cost tracker ma `role="region"` i `aria-label="Cost Tracker"`
  - Canvas doughnut ma `aria-label="Wykres kołowy rozkładu kosztów per model"`

---

## ⚠️ Edge Cases

### EC-1: POST /api/eval/run nie odpowiada (timeout lub Bridge offline)

Scenariusz: Użytkownik kliknie "Run Eval Now", ale Bridge API jest offline lub endpoint nie odpowiada przez >30s
Oczekiwane zachowanie: Frontend nie czeka wiecznie. `fetch()` ma ustawiony AbortController z timeout 30000ms. Po upływie 30s fetch jest anulowany. Przycisk wraca do stanu normalnego. Wyświetla się komunikat błędu "❌ Eval timeout — Bridge API nie odpowiada" przez 5 sekund.
Komunikat dla użytkownika: "❌ Eval timeout — Bridge API nie odpowiada"

### EC-2: useRuns() zwraca puste array []

Scenariusz: Bridge API jest online ale brak runów (nowy projekt, czysta DB)
Oczekiwane zachowanie: CostTrackerPanel renderuje tabelę ze wszystkimi 4 modelami ale każdy z wartościami: Runs="0", Avg tokens="—", Est. cost/run="$0.00", Total="$0.00". Total na dole: "$0.00". Doughnut chart wyświetla równe ćwiartki z wartościami [1,1,1,1] i tooltipem "$0.00" dla każdego (żeby chart nie był pusty).
Komunikat dla użytkownika: Brak komunikatu — tabela z zerami jest wystarczająca

### EC-3: useRuns() zwraca runy z nieznanym modelem (np. "opus-4.6")

Scenariusz: Dane z Bridge API zawierają model string który nie istnieje w MODEL_COSTS config, np. "opus-4.6" lub "haiku-3.5"
Oczekiwane zachowanie: Nieznane modele są grupowane pod etykietą "Other" w tabeli, z kosztem wyliczonym jako $0.00 (bo nie ma cennika). W doughnut chart "Other" dodawany jako dodatkowy wycinek z kolorem `#6b7280` (szary). NIE crashuje — brak wyjątku TypeError.
Komunikat dla użytkownika: Wiersz "Other" pojawia się na końcu tabeli z wartościami rzeczywistymi runs i avg tokens, ale kosztem $0.00

### EC-4: Chart.js canvas conflict przy hot-reload (Next.js dev mode)

Scenariusz: W trybie development Next.js hot-reload powoduje re-mount komponentu, co próbuje zainicjować Chart.js na tym samym canvas — error: "Canvas is already in use"
Oczekiwane zachowanie: W `useEffect` cleanup function wywołuje `chartInstance.destroy()` przed następnym renderem. Dodatkowo w `useEffect` sprawdzamy `if (chartRef.current)` przed inicjalizacją. Ref do instancji chart jest przechowywany przez `useRef<Chart | null>(null)`.
Komunikat dla użytkownika: Brak — błąd jest zapobiegany na poziomie kodu

### EC-5: EvalData.recent_runs jest puste (brak historii runów)

Scenariusz: Bridge API zwraca `recent_runs: []` (eval framework nigdy nie był uruchamiany)
Oczekiwane zachowanie: Sekcja "Last 5 Eval Runs" wyświetla komunikat "Brak historii eval runów. Kliknij 'Run Eval Now' żeby uruchomić pierwszy eval." (font-size:12px, color:#4b4569, text-align:center, padding:12px 0). Sekcja score area nadal wyświetla pass rate (jeśli jest dostępny) lub "—" jeśli też brak danych.
Komunikat dla użytkownika: "Brak historii eval runów. Kliknij 'Run Eval Now' żeby uruchomić pierwszy eval."

---

## 🚫 Out of Scope tej Story

- Konfiguracja cen modeli przez UI (ceny są hardcoded w config, zmiany tylko przez edycję kodu)
- Filtrowanie historii eval runów (np. per kategoria, per data) — tylko top 5 chronologicznie
- Eksport wyników eval do pliku CSV/JSON
- Edycja kategorii eval (read-only)
- WebSocket real-time update eval scores
- Cost forecasting / predykcja kosztów
- Cost Tracker z zakresem dziennym/tygodniowym/miesięcznym (tylko "today")
- Logowanie użytkownika / autentykacja

---

## ✔️ Definition of Done

- [ ] Plik `/src/components/eval/EvalTab.tsx` istnieje i jest eksportowany jako default
- [ ] Plik `/src/components/eval/EvalFrameworkPanel.tsx` istnieje i renderuje się bez błędów
- [ ] Plik `/src/components/eval/CostTrackerPanel.tsx` istnieje i renderuje się bez błędów
- [ ] Plik `/src/config/model-costs.ts` istnieje z dokładnie 4 modelami i ich cenami (kimi, glm, sonnet, codex)
- [ ] Wszystkie 4 stany widoku zaimplementowane dla EvalFrameworkPanel: loading (skeleton), offline ("Eval unavailable"), error, filled
- [ ] Wszystkie 4 stany widoku zaimplementowane dla CostTrackerPanel: loading (skeleton), empty (zeros), error, filled
- [ ] Przycisk "Run Eval Now" wysyła POST `/api/eval/run`, pokazuje loading state i wynik inline
- [ ] Abort controller dla POST eval z 30s timeout jest zaimplementowany
- [ ] Chart.js doughnut chart renderuje się na canvas bez błędów "Canvas is already in use"
- [ ] Chart.js instancja jest niszczona w useEffect cleanup (chartInstance.destroy())
- [ ] Obliczenia kosztów pokrywają EC-2 (puste runs) i EC-3 (nieznany model)
- [ ] Kod przechodzi linter bez błędów (`npm run lint` — 0 errors)
- [ ] Brak console.error podczas normalnego użytkowania (sprawdzić w DevTools)
- [ ] Strona na ?tab=eval ładuje się poniżej 2s przy Bridge API online
- [ ] Story review przez PO
