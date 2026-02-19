---
epic_id: EPIC-9
title: "NightClaw Dashboard — pełna strona analizy nocnych runów"
module: nightclaw
status: draft
priority: should
estimated_size: L
risk: low
---

## 📋 OPIS

EPIC-9 dostarcza dedykowaną stronę `/dashboard/nightclaw` w kira-dashboard — rozbudowany panel analizy nocnych runów NightClaw. Strona prezentuje pełny obraz tego, co NightClaw zrobił poprzedniej nocy: renderuje digest w markdown, pokazuje zmodyfikowane skille z diffem, badania z internetu (solutions/), statystyki wydajności modeli z doby oraz historię runów w formie kalendarza (zielony = OK, czerwony = błąd). Użytkownik widzi całość wiedzy zebranej przez NightClaw bez potrzeby ręcznego czytania plików z terminala.

## 🎯 CEL BIZNESOWY

Mariusz widzi pełny raport nocnego runu — digest, zmiany skilli, badania i statystyki modeli — w < 10 sekund po otwarciu strony `/dashboard/nightclaw`, bez otwierania terminala ani czytania plików markdown z CLI.

## 👤 PERSONA

**Mariusz (Admin)** — architekt systemu Kira, który co rano chce wiedzieć: co NightClaw zmienił w nocy, jakie problemy znalazł, co zbadał w internecie i czy modele AI działają poprawnie. Dotychczas musiał ręcznie otwierać `.kira/nightclaw/digest/YYYY-MM-DD.md` z terminala i interpretować surowe pliki. Z tym epiciem dostaje gotowy, czytelny raport.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-1: Kira Dashboard — setup Next.js, Bridge API client, sidebar routing, dark theme (`#0d0c1a` / `#1a1730` / `#818cf8`) — infrastruktura aplikacji gotowa
- STORY-1.7: NightClaw Digest Card (istniejący komponent `NightClawDigestCard.tsx`) — poglądowa wersja karty, z której EPIC-9 czerpie wzorzec UX i hook `useNightClaw`
- Bridge API: działający endpoint `GET /api/nightclaw/summary` (z EPIC-1) — EPIC-9 rozszerza go o nowe endpointy

### Blokuje (ten epic odblokowuje):
- EPIC-10 (TBD): NightClaw alerting — powiadomienia WhatsApp gdy nocny run wykryje krytyczne błędy (wymaga historii runów z EPIC-9)
- EPIC-15 (TBD): Dashboard v2 — zaawansowane analytics, cost forecasting (widok modeli z EPIC-9 stanowi fundament)

## 📦 ZAKRES (In Scope)

- **Dedicated page `/dashboard/nightclaw`** — pełnoekranowy widok nocnych runów z 4 sekcjami: Overview, Digest, Research, Stats; routing zintegrowany z sidebar z EPIC-1
- **Run Overview** — karty statystyk ostatniego runu: ile plików przeanalizował, ile skilli zmodyfikował, jakie błędy znalazł (open / resolved), timestamp i czas trwania runu
- **Digest Viewer** — renderowanie markdown z `.kira/nightclaw/digest/YYYY-MM-DD.md` z syntaktycznym podświetlaniem kodu (react-markdown + rehype-highlight); picker daty pozwala przeglądać archiwalne digesty
- **Skills Diff Panel** — lista skilli zmodyfikowanych przez NightClaw (git diff na plikach SKILL.md) z diffem inline: linie usunięte (czerwone), dodane (zielone), nazwa skilla i data modyfikacji
- **Research Findings** — lista plików z `.kira/nightclaw/solutions/` renderowana jako accordion; każda pozycja zawiera tytuł (nazwa pliku), preview pierwszych 3 linii i przycisk rozwinięcia pełnej treści
- **Model Performance Stats** — tabela i sparklines: success rate, avg duration, stories completed/failed dla każdego modelu (Kimi, GLM, Codex, Sonnet) z danych `model-stats.json`; badge "🔴 poniżej progu" gdy success_rate < 80%
- **Run History Calendar** — widok kalendarza (ostatnie 90 dni): każdy dzień z runem oznaczony kolorem (🟢 zielony = OK, 🔴 czerwony = błąd, ⚪ szary = brak runu); kliknięcie dnia ładuje digest z tego dnia w Digest Viewer
- **Bridge API endpointy** — `GET /api/nightclaw/digest?date=YYYY-MM-DD`, `GET /api/nightclaw/history`, `GET /api/nightclaw/skills-diff`, `GET /api/nightclaw/research`

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Edycja digestów / skilli z UI** — EPIC-9 to read-only view; zapis do plików `.kira/nightclaw/` pozostaje domeną NightClaw CLI i nocnych runów
- **Triggerowanie nocnego runu z dashboardu** — ręczne uruchamianie NightClaw przez UI w przyszłym epicu (wymaga osobnego mechanizmu autoryzacji procesu)
- **WebSocket real-time dla trwającego runu** — nocny run kończy się przed 3:00 AM, dashboard pokazuje gotowe wyniki; live monitoring runu → EPIC-15
- **People profiles viewer** (`.kira/nightclaw/people/`) — analiza profili użytkowników w dedykowanym People EPIC (TBD)
- **Autoryzacja / login** — dashboard lokalny, bez auth zgodnie z EPIC-1
- **Mobile responsive** — desktop-first (1440px+); mobile layout w EPIC-15

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Strona `/dashboard/nightclaw` otwiera się w < 2s i nie crashuje gdy Bridge API jest offline (pokazuje stan "offline")
- [ ] Digest Viewer renderuje markdown z dzisiejszego pliku digest z poprawnym formatowaniem (nagłówki, tabele, kod)
- [ ] Picker daty ładuje archiwalny digest — zmiana daty w pikerze aktualizuje treść Digest Viewer bez przeładowania strony
- [ ] Calendar view pokazuje 90-dniową historię runów z poprawnymi kolorami (zielony/czerwony/szary) i kliknięcie dnia ładuje odpowiedni digest
- [ ] Skills Diff Panel wyświetla co najmniej jeden zmodyfikowany skill z diffem inline (dodane/usunięte linie) lub komunikat "brak zmian w tym runie"
- [ ] Research Findings accordion listuje pliki z `solutions/` — kliknięcie rozwija pełną treść markdown
- [ ] Model Performance Stats pokazuje aktualne dane z `model-stats.json` z badgem ostrzeżenia gdy success_rate < 0.80
- [ ] Wszystkie 4 endpointy API zwracają poprawne dane (`200 OK`) lub obsługiwane błędy (`404` gdy brak digest, `503` gdy filesystem niedostępny)

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-9.1 | backend | Endpoint GET /api/nightclaw/digest | Czyta plik `.kira/nightclaw/digest/YYYY-MM-DD.md` i `model-stats.json`, zwraca JSON z surowym markdown i sparsowanymi statystykami |
| STORY-9.2 | backend | Endpoint GET /api/nightclaw/history | Skanuje katalog `.kira/nightclaw/digest/` i zwraca tablicę `{date, status}` dla calendar view (OK/error/missing) |
| STORY-9.3 | backend | Endpoint GET /api/nightclaw/skills-diff | Wykonuje `git diff` na plikach `SKILL.md` w repozytorium kira i zwraca listę zmodyfikowanych skilli z diffem jako JSON |
| STORY-9.4 | backend | Endpoint GET /api/nightclaw/research | Listuje pliki z `.kira/nightclaw/solutions/`, czyta ich zawartość i zwraca listę `{filename, title, content}` |
| STORY-9.5 | wiring | Typy i serwis kliencki NightClaw | TypeScript interfejsy (`DigestResponse`, `HistoryEntry`, `SkillDiff`, `ResearchFile`) + funkcje `fetchDigest()`, `fetchHistory()`, `fetchSkillsDiff()`, `fetchResearch()` |
| STORY-9.6 | frontend | NightClaw Dashboard page — layout + Run Overview | Strona `/dashboard/nightclaw` z zakładkami i Run Overview cards (pliki, błędy, timestamp runu) |
| STORY-9.7 | frontend | Digest Viewer + Calendar History | Widok markdown digestu z date pickerem i kalendarzem historii 90 dni z kolorami OK/error/missing |
| STORY-9.8 | frontend | Skills Diff Panel + Research Findings + Model Stats | Sekcja diff skilli z kolorowanym diffem inline, accordion research findings i tabela z sparklines wydajności modeli |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | nightclaw |
| Priorytet | Should |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Niskie — dane w plikach lokalnych, Bridge API już działa |
| Domeny | backend, wiring, frontend |
| Stack | Next.js 16 (App Router), shadcn/ui, Tailwind CSS, react-markdown, rehype-highlight, TypeScript |
| Dane | `.kira/nightclaw/digest/`, `solutions/`, `model-stats.json`, git diff |
| API routes | `/api/nightclaw/digest`, `/api/nightclaw/history`, `/api/nightclaw/skills-diff`, `/api/nightclaw/research` |
| Design | Schemat kolorów: `#0d0c1a` tło, `#818cf8` akcent, `#1a1730` karty — spójny z EPIC-1 |
| Istniejące komponenty | `NightClawDigestCard.tsx`, `useNightClaw` hook — reużyć lub rozszerzyć |
| Uwagi | Dashboard read-only. NightClaw schedule: digest 2:00 AM, cleanup 3:00 AM (config.yml). Status OK/error wykrywany na podstawie obecności sekcji "## ❌ Błędy" w markdown digestu. |

---

## 📐 SZCZEGÓŁY IMPLEMENTACJI (dla implementatora)

### Struktura plików danych

```
kira/
└── .kira/
    └── nightclaw/
        ├── digest/
        │   ├── 2026-02-19.md     ← format: YYYY-MM-DD.md
        │   └── 2026-02-18.md
        ├── solutions/
        │   ├── cost-optimization-research.md
        │   ├── temporal-worker-macos.md
        │   ├── macos-sleep-background-processes.md
        │   └── model-routing-research.md
        ├── model-stats.json      ← wydajność modeli per model
        ├── patterns.md
        └── anti-patterns.md
```

### Schemat model-stats.json

```typescript
interface ModelStats {
  models: Record<string, {
    stories_completed: number
    stories_failed: number
    success_rate: number          // 0.0–1.0
    avg_duration_min: number
    last_story_id: string
    stories_with_refactor: number
  }>
  last_updated: string            // YYYY-MM-DD
  next_review: string
}
```

### Logika statusu runu w kalendarzu

Digest `YYYY-MM-DD.md` ma status:
- **OK** (`🟢`) — plik istnieje i NIE zawiera sekcji "❌" lub "Błędy" z > 0 pozycjami
- **ERROR** (`🔴`) — plik istnieje i zawiera `## 🔍 Otwarte problemy` z niepustą listą
- **MISSING** (`⚪`) — plik nie istnieje dla danej daty

### Paletа barw komponentów

```css
--bg-page:      #0d0c1a;   /* tło strony */
--bg-card:      #1a1730;   /* karty, panele */
--bg-surface:   #13111c;   /* zagłębione sekcje */
--accent:       #818cf8;   /* indigo — akcenty, aktywne elementy */
--accent-glow:  rgba(129,140,248,0.15);
--border:       #3b3d7a;   /* krawędzie kart */
--text-primary: #e6edf3;
--text-muted:   #4b4569;
--diff-add:     #166534;   /* tło linii dodanych (+) */
--diff-add-fg:  #4ade80;
--diff-del:     #7f1d1d;   /* tło linii usuniętych (-) */
--diff-del-fg:  #f87171;
--status-ok:    #22c55e;   /* calendar OK */
--status-err:   #ef4444;   /* calendar ERROR */
--status-miss:  #374151;   /* calendar MISSING */
```

### Response shapes API

**GET /api/nightclaw/digest?date=2026-02-19**
```json
{
  "date": "2026-02-19",
  "markdown": "# NightClaw Digest — 2026-02-19\n...",
  "summary": {
    "new_patterns": 0,
    "lessons_extracted": 0,
    "anti_patterns_flagged": 0,
    "open_issues": 2,
    "generated_at": "2026-02-19T02:00:00Z"
  },
  "model_stats": { /* zawartość model-stats.json */ }
}
```

**GET /api/nightclaw/history**
```json
{
  "entries": [
    { "date": "2026-02-19", "status": "ok" },
    { "date": "2026-02-18", "status": "ok" },
    { "date": "2026-02-17", "status": "ok" }
  ],
  "total_runs": 3,
  "total_errors": 0
}
```

**GET /api/nightclaw/skills-diff**
```json
{
  "skills": [
    {
      "name": "epic-writing",
      "path": "skills/epic-writing/SKILL.md",
      "diff": "@@ -10,3 +10,5 @@\n-old line\n+new line",
      "lines_added": 2,
      "lines_removed": 1,
      "modified_at": "2026-02-19T02:15:00Z"
    }
  ],
  "total_modified": 1
}
```

**GET /api/nightclaw/research**
```json
{
  "files": [
    {
      "filename": "cost-optimization-research.md",
      "title": "Research: AI Coding Agents Cost Optimization",
      "preview": "Problem: Kimi K2.5 kosztuje pieniądze...",
      "content": "# Research: AI Coding Agents Cost Optimization\n...",
      "modified_at": "2026-02-17T02:30:00Z"
    }
  ]
}
```
