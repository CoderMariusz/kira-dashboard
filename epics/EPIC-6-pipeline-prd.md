---
epic_id: EPIC-6
title: "Pipeline: PRD → Project Wizard & Multi-Project View"
module: dashboard
status: draft
priority: must
estimated_size: L
risk: medium
---

## 📋 OPIS

EPIC-6 rozbudowuje stronę `/dashboard/pipeline` w dwóch fazach: najpierw dodaje bulk actions do istniejącego widoku (zaznaczanie wielu stories, masowe operacje), a następnie wprowadza **wizard "New Project"** — użytkownik wkleja PRD, Kira zadaje tylko niezbędne pytania o *zachowanie* produktu (nie o technologię), a następnie auto-generuje epiki i stories i rejestruje projekt w Bridge jednym kliknięciem. Dopełnieniem jest widok multi-project z przełącznikiem projektów i statystykami per projekt.

## 🎯 CEL BIZNESOWY

Mariusz rejestruje nowy projekt z PRD w Bridge w < 5 minut — bez ręcznego pisania epików, stories i JSON-ów — a widok pipeline pokazuje postęp wszystkich aktywnych projektów w jednym miejscu.

## 👤 PERSONA

**Mariusz (Admin / Tech Lead)** — jedyny użytkownik kira-dashboard. Prowadzi równolegle kilka projektów (kira, kira-dashboard, inne). Potrzebuje szybkiej rejestracji nowego projektu na podstawie PRD bez opuszczania dashboardu, możliwości masowych operacji na stories (np. bulk advance po review sesji) oraz przeglądu statusu wszystkich projektów w jednym widoku.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-2: Real-time + Write Operations — FilterBar, SSE, start/advance story, toast system; wymagane jako baza widoku pipeline
- Bridge CLI: komendy `projects add`, `projects list`, `plan-epic --stories-file` — muszą być dostępne i działać lokalnie

### Blokuje (ten epic odblokowuje):
- EPIC-7 (potencjalny): Multi-user PRD flow — granty dostępu per projekt, różne role per projekt
- EPIC-8 (potencjalny): Project analytics — wykres velocity, burndown, koszt per projekt (wymaga project switcher z EPIC-6)

## 📦 ZAKRES (In Scope)

- **Bulk selection w PipelinePanel** — checkbox hover-reveal na każdym PipelineRow, "Zaznacz wszystko / Odznacz", sticky bulk action toolbar z akcjami: "Advance (N)", "Assign Model", "Anuluj"; confirmation dialog przed bulk advance
- **Bulk actions endpoint** — `POST /api/stories/bulk-action` wywołujący Bridge CLI seryjnie dla zaznaczonych story IDs; zwraca partial success (lista sukces/błąd per story)
- **Wizard "New Project" — krok 1: PRD input** — modal z textarea na PRD (do 20 000 znaków), przycisk "Analizuj PRD" → loading state → AI generuje max 5 pytań wyjaśniających o funkcjonalność (nie o technologię)
- **Wizard "New Project" — krok 2: Pytania AI** — formularz z pytaniami wygenerowanymi przez Claude: tylko pytania o *co robi* produkt (audience, integracje, scope, kluczowe przepływy) — zero pytań o stack/framework/bazę; użytkownik odpowiada i klika "Generuj projekt"
- **Wizard "New Project" — krok 3: Podgląd + rejestracja** — lista wygenerowanych epików i liczba stories per epic; przycisk "Zarejestruj w Bridge" wywołuje `POST /api/pipeline/create-from-prd` → Bridge CLI → toast sukcesu z linkiem do nowego projektu
- **API endpoint `POST /api/pipeline/prd-questions`** — przyjmuje `{ prd_text }`, wywołuje Claude Haiku przez Anthropic API, zwraca max 5 pytań funkcjonalnych w formacie `{ id, text, type: 'text'|'choice', options? }`
- **API endpoint `POST /api/pipeline/create-from-prd`** — przyjmuje PRD + odpowiedzi, generuje strukturę epików/stories przez AI, wywołuje `bridge projects add` + `bridge plan-epic` dla każdego epiku, zwraca `{ project_key, epics_count, stories_count }`
- **API endpoint `GET /api/projects/stats`** — odpytuje Bridge API/CLI dla każdego projektu, zwraca statystyki: total stories, done, in_progress, blocked, completion_pct
- **Multi-project switcher** — dropdown w nagłówku Pipeline page z listą projektów z Bridge; active project wyróżniony; kliknięcie przełącza kontekst (bridge projects switch) i odświeża pipeline
- **Stats per projekt** — mini stats bar pod switcherem: completion %, story counts kolorami statusów; animowany refresh przy zmianie projektu
- **CTA "Nowy projekt"** — przycisk w nagłówku Pipeline otwierający wizard New Project; widoczny zawsze

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Edycja wygenerowanych epików/stories przed rejestracją** — wizard generuje i rejestruje gotową strukturę; ręczne edycje przez CLI lub oddzielny EPIC-7
- **Obsługa wielu użytkowników w wizard** — wizard jest single-user (Mariusz); RBAC na wizard → EPIC-7
- **Importowanie PRD z URL lub pliku** — tylko paste tekstu; import z URL/Google Docs → osobny epic
- **Historia sesji wizard** — brak persystencji PRD sesji w bazie; sesja żyje tylko w React state; audit log → EPIC-7
- **Mobile responsive pipeline** — desktop-first; responsywność → dedykowany epic
- **Generowanie kodu/plików projektu przez wizard** — rejestracja tylko w Bridge (YAML + DB); scaffolding kodu → Bridge CLI extension poza tym epicem
- **Bulk delete stories** — zbyt destrukcyjna operacja; tylko advance i assign model

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Użytkownik zaznacza 3 stories checkboxami → bulk action toolbar pojawia się na dole → klika "Advance (3)" → confirmation → Bridge CLI wywołany 3 razy → toast z wynikiem "3/3 sukces"
- [ ] Użytkownik klika "Nowy projekt" → wkleja PRD (min 100 znaków) → klik "Analizuj" → pojawia się max 5 pytań funkcjonalnych (żadne nie pyta o technologię) → użytkownik odpowiada → klik "Generuj" → widok podglądu z listą epików → klik "Zarejestruj" → projekt pojawia się w Bridge i w project switcherze
- [ ] `POST /api/pipeline/create-from-prd` wywołuje `bridge projects add` i `bridge plan-epic` dla każdego epiku; projekt widoczny w `bridge projects list`
- [ ] Project switcher w nagłówku Pipeline pokazuje wszystkie projekty z Bridge; kliknięcie na projekt odświeża pipeline view do wybranego projektu
- [ ] Stats per projekt wyświetlają: completion %, counts (done/in_progress/blocked) zaktualizowane po każdej zmianie stanu story
- [ ] Endpoint `POST /api/pipeline/prd-questions` zwraca błąd 400 dla PRD < 50 znaków i 200 z pytaniami dla prawidłowego PRD
- [ ] Bulk action toolbar znika po odznaczeniu wszystkich checkboxów lub po zakończeniu operacji

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-6.1 | backend | Endpoint `POST /api/pipeline/prd-questions` — AI pytania z PRD | Endpoint przyjmuje PRD text, wywołuje Claude Haiku przez Anthropic API i zwraca max 5 pytań funkcjonalnych (nie technicznych) w formacie JSON |
| STORY-6.2 | backend | Endpoint `POST /api/pipeline/create-from-prd` — rejestracja projektu w Bridge | Endpoint przyjmuje PRD + odpowiedzi, generuje strukturę epików przez AI, wywołuje `bridge projects add` + `bridge plan-epic` dla każdego epiku i zwraca podsumowanie |
| STORY-6.3 | backend | Endpoint `POST /api/stories/bulk-action` — masowe operacje na stories | Endpoint przyjmuje listę story IDs i akcję (advance/assign_model), wywołuje Bridge CLI seryjnie i zwraca partial-success results per story |
| STORY-6.4 | backend | Endpoint `GET /api/projects/stats` — statystyki per projekt | Endpoint agreguje dane z Bridge CLI (`projects list` + `status`) i zwraca stats (total, done, in_progress, blocked, completion_pct) per projekt |
| STORY-6.5 | wiring | Typy i serwisy dla PRD wizard, bulk actions i project stats | Typy TypeScript: `PrdQuestion`, `CreateFromPrdRequest/Response`, `BulkActionRequest/Response`, `ProjectStats`; serwisy klienta dla wszystkich 4 nowych endpointów |
| STORY-6.6 | frontend | Wizard "New Project" — 3-krokowy modal (PRD → Pytania → Podgląd) | 3-step modal: textarea na PRD → formularz AI pytań funkcjonalnych → podgląd epików + przycisk "Zarejestruj w Bridge"; loading/error/success states |
| STORY-6.7 | frontend | Multi-project switcher + stats bar w nagłówku Pipeline | Dropdown z listą projektów Bridge w nagłówku Pipeline page, mini stats per projekt (completion %, story counts) i CTA "Nowy projekt" otwierający wizard |
| STORY-6.8 | frontend | Bulk selection i akcje w PipelinePanel | Hover-reveal checkboxy na PipelineRow, "Zaznacz wszystko", sticky bulk action toolbar (Advance N / Assign Model / Anuluj), confirmation dialog i toast z wynikami |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | dashboard |
| Priorytet | Must |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Średnie — AI endpoint wymaga Anthropic API key w Next.js runtime; Bridge CLI musi być dostępne na serwerze; generate-from-prd zależy od jakości modelu |
| Domeny | backend, wiring, frontend |
| Stack | Next.js App Router, shadcn/ui, Tailwind CSS, TypeScript, Sonner (toasty) |
| DB | Brak własnej — dane z Bridge API (localhost:8199) + Bridge CLI |
| Bridge CLI | `bridge projects add/list/switch`, `bridge plan-epic --stories-file`, `bridge advance`, `bridge status` |
| AI | Claude Haiku (Anthropic API) — prd-questions endpoint; Claude Sonnet — create-from-prd (generowanie struktury epików) |
| Kolory | tło `#0d0c1a`, karty `#1a1730`, akcent `#818cf8`, border `#2a2540` |
| Uwagi | STORY-6.1 i 6.2 wymagają `ANTHROPIC_API_KEY` w env; bulk actions (STORY-6.3) działają sekwencyjnie (nie równolegle) by nie przeciążać Bridge CLI; create-from-prd generuje max 5 epików i 25 stories dla MVP |

---

## 📐 SZCZEGÓŁY IMPLEMENTACJI (per story)

### STORY-6.1 — Endpoint `POST /api/pipeline/prd-questions`

**Lokalizacja:** `app/api/pipeline/prd-questions/route.ts`

**Request:**
```typescript
{
  prd_text: string  // min 50 znaków, max 20 000 znaków
}
```

**Response 200:**
```typescript
{
  questions: Array<{
    id: string           // "q1", "q2", ...
    text: string         // Pytanie po polsku
    type: 'text' | 'choice'
    options?: string[]   // tylko dla type='choice'
    required: boolean
  }>
}
```

**Logika:**
1. Walidacja: `prd_text.length >= 50` — 400 jeśli za krótki
2. System prompt dla Haiku: *"Jesteś asystentem PM. Na podstawie PRD zadaj max 5 KRÓTKICH pytań wyjaśniających dotyczących WYŁĄCZNIE funkcjonalności i zachowania produktu. NIE pytaj o: technologię, framework, bazę danych, deployment, stack. Pytaj o: kto używa, jakie kluczowe przepływy, jakie integracje zewnętrzne, zakres MVP. Zwróć JSON."*
3. Wywołanie Anthropic API z modelem `claude-haiku-4-5` (lub `claude-3-haiku-20240307` jako fallback)
4. Parsowanie i walidacja odpowiedzi JSON
5. Return 200 z pytaniami

**Obsługa błędów:**
- 400: PRD za krótki (`"PRD musi mieć minimum 50 znaków"`)
- 503: Anthropic API niedostępne (`"Serwis AI tymczasowo niedostępny"`)
- 500: Błąd parsowania AI response

---

### STORY-6.2 — Endpoint `POST /api/pipeline/create-from-prd`

**Lokalizacja:** `app/api/pipeline/create-from-prd/route.ts`

**Request:**
```typescript
{
  prd_text: string
  project_name: string    // np. "Gym Tracker"
  project_key: string     // np. "gym-tracker" (slug, lowercase, hyphens)
  answers: Record<string, string>  // { "q1": "...", "q2": "..." }
}
```

**Response 200:**
```typescript
{
  project_key: string
  epics: Array<{
    epic_id: string      // "EPIC-1", "EPIC-2", ...
    title: string
    stories_count: number
    stories: Array<{ id: string, title: string, domain: string }>
  }>
  epics_count: number
  stories_count: number
  bridge_output: string  // raw CLI output dla debugowania
}
```

**Logika krok po kroku:**
1. Walidacja inputu (project_key: `/^[a-z0-9-]+$/`, max 40 znaków)
2. Wywołanie Claude Sonnet z PRD + answers → generowanie struktury JSON epików/stories
   - System prompt: *"Wygeneruj strukturę projektu: max 5 epików, max 5 stories per epic. Format: JSON. Każdy story ma: id, title, domain (database/auth/backend/wiring/frontend), size (short/medium/long), dod (definicja ukończenia, 1 zdanie)."*
3. Parsowanie wygenerowanego JSON
4. Wywołanie Bridge CLI: `bridge projects add --key <key> --name <name>`
5. Dla każdego epiku: zapis stories do `/tmp/stories-{epic_id}.json`, wywołanie `bridge plan-epic --epic-id ... --title ... --file-path ... --project <key> --stories-file /tmp/...`
6. Cleanup plików tymczasowych
7. Return 200 z podsumowaniem

**Obsługa błędów:**
- 409: Projekt już istnieje (`bridge projects add` zwraca błąd duplikatu)
- 422: AI nie wygenerował poprawnego JSON
- 500: Bridge CLI niedostępne

---

### STORY-6.3 — Endpoint `POST /api/stories/bulk-action`

**Lokalizacja:** `app/api/stories/bulk-action/route.ts`

**Request:**
```typescript
{
  story_ids: string[]        // max 20 IDs
  action: 'advance' | 'assign_model'
  payload?: {
    status?: string          // dla advance: docelowy status
    model?: string           // dla assign_model
  }
}
```

**Response 200:**
```typescript
{
  results: Array<{
    id: string
    success: boolean
    error?: string
  }>
  success_count: number
  failure_count: number
}
```

**Logika:**
1. Walidacja: max 20 story IDs, action w allowlist
2. Sekwencyjne wywołanie Bridge CLI dla każdego story ID (nie równolegle):
   - `advance`: `bridge advance <id> <status>`
   - `assign_model`: `bridge advance <id>` + zmiana modelu (❓WYMAGA WYJAŚNIENIA — czy Bridge CLI obsługuje reassign model?)
3. Zbieranie wyników (partial success — nie przerywamy przy błędzie)
4. Return 200 zawsze (nawet przy partial failure) — 500 tylko przy crash endpointu

**Rate limiting:** max 1 wywołanie CLI co 200ms (debounce) by nie przeciążać Bridge DB

---

### STORY-6.4 — Endpoint `GET /api/projects/stats`

**Lokalizacja:** `app/api/projects/stats/route.ts`

**Response 200:**
```typescript
{
  projects: Array<{
    key: string
    name: string
    is_current: boolean
    total: number
    done: number
    in_progress: number
    review: number
    blocked: number
    completion_pct: number   // done / total * 100, zaokrąglone
  }>
  fetched_at: string  // ISO timestamp
}
```

**Logika:**
1. `bridge projects list` → lista projektów (JSON output)
2. `bridge projects current` → aktywny projekt
3. Dla każdego projektu: `bridge status --project <key> --format json` → story counts
4. Agregacja stats i zwrot

**Cache:** 30s stale-while-revalidate (nagłówek `Cache-Control: s-maxage=30, stale-while-revalidate=60`)

---

### STORY-6.5 — Typy i serwisy (wiring)

**Lokalizacja:** `types/pipeline-prd.ts`, `services/prdService.ts`, `services/projectsService.ts`

**Nowe typy TypeScript:**
```typescript
// types/pipeline-prd.ts

export interface PrdQuestion {
  id: string
  text: string
  type: 'text' | 'choice'
  options?: string[]
  required: boolean
}

export interface PrdQuestionsRequest {
  prd_text: string
}

export interface PrdQuestionsResponse {
  questions: PrdQuestion[]
}

export interface CreateFromPrdRequest {
  prd_text: string
  project_name: string
  project_key: string
  answers: Record<string, string>
}

export interface GeneratedEpic {
  epic_id: string
  title: string
  stories_count: number
  stories: Array<{ id: string; title: string; domain: string }>
}

export interface CreateFromPrdResponse {
  project_key: string
  epics: GeneratedEpic[]
  epics_count: number
  stories_count: number
  bridge_output: string
}

export interface BulkActionRequest {
  story_ids: string[]
  action: 'advance' | 'assign_model'
  payload?: {
    status?: string
    model?: string
  }
}

export interface BulkActionResult {
  id: string
  success: boolean
  error?: string
}

export interface BulkActionResponse {
  results: BulkActionResult[]
  success_count: number
  failure_count: number
}

export interface ProjectStats {
  key: string
  name: string
  is_current: boolean
  total: number
  done: number
  in_progress: number
  review: number
  blocked: number
  completion_pct: number
}

export interface ProjectsStatsResponse {
  projects: ProjectStats[]
  fetched_at: string
}
```

**Serwisy klienta:**
```typescript
// services/prdService.ts
export const prdService = {
  getQuestions: (prd_text: string) => fetch('/api/pipeline/prd-questions', ...),
  createFromPrd: (req: CreateFromPrdRequest) => fetch('/api/pipeline/create-from-prd', ...),
}

// services/projectsService.ts
export const projectsService = {
  getStats: () => fetch('/api/projects/stats'),
  bulkAction: (req: BulkActionRequest) => fetch('/api/stories/bulk-action', ...),
}
```

**Mapowanie błędów → komunikaty PL:**
| HTTP | Komunikat |
|------|-----------|
| 400 | `"PRD musi mieć minimum 50 znaków"` |
| 409 | `"Projekt o tym kluczu już istnieje w Bridge"` |
| 422 | `"AI nie zdołało wygenerować struktury projektu — spróbuj ponownie"` |
| 503 | `"Serwis AI tymczasowo niedostępny"` |
| 500 | `"Błąd serwera — sprawdź logi Bridge CLI"` |

---

### STORY-6.6 — Wizard "New Project"

**Lokalizacja:** `components/pipeline/NewProjectWizard.tsx`

**UX flow (3 kroki):**

```
Krok 1: PRD Input
┌──────────────────────────────────────────┐
│  ✦ Nowy projekt                      [✕] │
│ ──────────────────────────────────────── │
│  Wklej PRD lub opis projektu             │
│  ┌────────────────────────────────────┐  │
│  │  Opisz co ma robić Twój projekt... │  │
│  │                                    │  │
│  │                       0/20000 ▌   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Anuluj]              [Analizuj PRD →]  │
└──────────────────────────────────────────┘

Krok 2: Pytania AI (loading → formularz)
┌──────────────────────────────────────────┐
│  ✦ Nowy projekt — Pytania          [✕]   │
│ ──────────────────────────────────────── │
│  Kira potrzebuje kilku odpowiedzi        │
│                                          │
│  1. Jaka jest główna funkcja aplikacji?  │
│     [_____________ input ___________]    │
│                                          │
│  2. Kto jest głównym użytkownikiem?      │
│     ○ Konsument  ○ Firma  ○ Wewnętrzny  │
│                                          │
│  ... (max 5 pytań)                       │
│                                          │
│  [← Wróć]              [Generuj projekt →│
└──────────────────────────────────────────┘

Krok 3: Podgląd + Rejestracja
┌──────────────────────────────────────────┐
│  ✦ Nowy projekt — Podgląd          [✕]   │
│ ──────────────────────────────────────── │
│  📋 Projekt: "Gym Tracker"               │
│  Klucz: gym-tracker                      │
│                                          │
│  EPIC-1  Auth & Onboarding  (4 stories)  │
│  EPIC-2  Workout Logger     (5 stories)  │
│  EPIC-3  Stats & Progress   (4 stories)  │
│  ──────────────────────────────────────  │
│  Łącznie: 3 epiki, 13 stories            │
│                                          │
│  [← Wróć]       [Zarejestruj w Bridge ✓] │
└──────────────────────────────────────────┘

Success state: toast + modal zamknięty
```

**Stany widoku:**
- `idle` — krok 1, textarea pusta, przycisk disabled
- `analyzing` — spinner + "Kira analizuje PRD..." (krok 1 loading)
- `questioning` — krok 2, formularz pytań
- `generating` — spinner + "Generuję strukturę projektu..." (krok 2→3 transition)
- `preview` — krok 3, lista epików + input na project_name + project_key
- `registering` — spinner + "Rejestruję projekt w Bridge..."
- `success` — toast.success, modal zamknięty, pipeline refresh
- `error` — inline error banner z retry button

**Walidacja project_key (krok 3):**
- Tylko `[a-z0-9-]`, min 3 znaki, max 40 znaków
- Real-time validation z podglądem: `"Klucz: gym-tracker ✓"`

**Styl modalny:**
- Backdrop: `rgba(0,0,0,0.7)` + `blur(6px)`
- Container: `background: #1a1730`, `border: 1px solid #3b3d7a`, `border-radius: 16px`, `width: 560px`
- Gradient header icon: `background: linear-gradient(135deg, #7c3aed, #3b82f6)`
- Progress steps: 3 kropki (`#818cf8` dla aktywnej, `#2a2540` dla nieaktywnych)
- Textarea: `background: #0d0c1a`, `border: 1px solid #2a2540`, focus: `border-color: #818cf8`
- Primary CTA: `background: linear-gradient(135deg, #7c3aed, #3b82f6)`, `color: #fff`

---

### STORY-6.7 — Multi-project switcher + stats bar

**Lokalizacja:** `components/pipeline/ProjectSwitcher.tsx`, integracja w `PipelinePage.tsx`

**Layout (rozszerzenie nagłówka Pipeline):**
```
┌─────────────────────────────────────────────────────────────────┐
│  [kira-dashboard ▼]  ████████░░  72%  ↑12 done  ↔2 active      │
│                      kira         ████░░░  45%  ↑8 done         │
│                      ──────────────────────────────              │
│                      + Nowy projekt                              │
└─────────────────────────────────────────────────────────────────┘
  ▲ dropdown gdy kliknięty
```

**ProjectSwitcher props:**
```typescript
interface ProjectSwitcherProps {
  stats: ProjectStats[]
  currentProject: string
  onSwitch: (projectKey: string) => Promise<void>
  onNewProject: () => void  // otwiera NewProjectWizard
}
```

**Stats bar (mini-widget per projekt):**
- Completion bar: `height: 4px`, kolorowa (gradient `#818cf8 → #3b82f6`)
- Liczniki: `done` (zielony `#4ade80`), `in_progress` (niebieski `#60a5fa`), `blocked` (czerwony `#f87171`)
- Refresh animacja: po zmianie projektu stats bar animuje się (pulse 600ms)
- Tooltip na hover z pełnymi danymi projektu

**Zachowanie switch:**
1. Optimistic UI — dropdown zaznacza nowy projekt natychmiast
2. `POST /api/projects/switch` (istniejący endpoint z EPIC-14/2) → Bridge CLI `bridge projects switch`
3. `mutate()` dla SWR kluczy stories i runs
4. Toast: `"Przełączono na projekt: kira-dashboard"`

**SWR hook `useProjectStats`:**
```typescript
const { stats, isLoading } = useProjectStats()
// SWR z refreshInterval: 60_000 (1 min)
// Revalidate on focus: true
```

---

### STORY-6.8 — Bulk selection i akcje w PipelinePanel

**Lokalizacja:** `components/pipeline/PipelineRow.tsx` (checkbox), `components/pipeline/BulkActionBar.tsx` (nowy), `components/pipeline/PipelinePanel.tsx` (stan selekcji)

**Zachowanie checkboxów:**
- Domyślnie ukryte; pojawiają się przy hover na PipelineRow (opacity: 0 → 1 w 150ms)
- Po zaznaczeniu co najmniej 1 — checkboxy na wszystkich rows stają się widoczne permanentnie
- Keyboard: `Space` na focused row toggleuje checkbox

**Stan selekcji w PipelinePanel:**
```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
const isSelecting = selectedIds.size > 0

const toggleSelect = (id: string) => { ... }
const selectAll = () => setSelectedIds(new Set(filteredStories.map(s => s.id)))
const clearSelection = () => setSelectedIds(new Set())
```

**BulkActionBar — sticky bottom toolbar:**
```
┌────────────────────────────────────────────────────────┐
│  ☑ 3 zaznaczone  [Advance ▼]  [Assign Model ▼]  [✕]   │
└────────────────────────────────────────────────────────┘
```
- `position: sticky; bottom: 0` w PipelinePanel
- `background: #1a1730`, `border-top: 1px solid #818cf8`
- Slide-up animacja (transform: translateY(100%) → translateY(0), 200ms ease)
- "Zaznacz wszystko" link po lewej stronie

**Bulk Advance flow:**
1. Klik "Advance ▼" → dropdown z opcjami statusów (REVIEW, DONE, MERGE)
2. Confirmation dialog: *"Czy chcesz przesunąć 3 stories do statusu REVIEW? Tej operacji nie można cofnąć."* — shadcn AlertDialog
3. Loading state na BulkActionBar (spinner + "Przetwarzanie 3 stories...")
4. `POST /api/stories/bulk-action` → partial success handling
5. Toast sukces: `"3/3 stories przesunięte do REVIEW"` lub `"2/3 sukces, 1 błąd: STORY-1.5 — invalid state"`
6. `clearSelection()` + SWR mutate

**Assign Model flow:**
1. Klik "Assign Model ▼" → dropdown z modelami (kimi, glm, sonnet, codex, haiku, opus)
2. Brak confirmation — immediate action
3. Loading + toast jak wyżej

**Modyfikacje PipelineRow:**
```typescript
interface PipelineRowProps {
  // ... existing props
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  showCheckbox?: boolean  // true gdy isSelecting || hover
}
```

**Styl checkboxa:**
- `appearance: none`, custom styled: `16px × 16px`, `border: 1.5px solid #3b3d7a`, `border-radius: 4px`
- Checked: `background: #818cf8`, `border-color: #818cf8`, biały ✓
- Hover: `border-color: #818cf8`
- Transition: all 150ms ease

**Styl zaznaczonego row:**
- `background: #1e1b38` (lekko jaśniejsze niż `#13111c`)
- `border: 1px solid #818cf8` (zamiast transparent)
