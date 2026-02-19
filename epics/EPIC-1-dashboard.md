---
epic_id: EPIC-1
title: "Kira Dashboard — Next.js Monitoring & Intelligence UI"
module: dashboard
status: draft
priority: must
estimated_size: L
risk: low
---

## 📋 OPIS

EPIC-14 dostarcza interaktywny dashboard webowy dla systemu Kira — zbudowany w Next.js 16 z shadcn/ui i Tailwind CSS. Dashboard agreguje dane z Bridge API i prezentuje w czasie rzeczywistym: status pipeline'u, wydajność modeli AI, statystyki projektów, wyniki eval framework oraz inteligentne wzorce i lekcje. Użytkownik (Mariusz) widzi pełny obraz swojego AI pipeline w jednym miejscu — bez potrzeby ręcznego odpytywania API czy czytania logów.

## 🎯 CEL BIZNESOWY

Mariusz widzi stan całego pipeline'u, kosztów i wydajności modeli w < 5 sekund od otwarcia dashboardu, bez żadnych komend CLI.

## 👤 PERSONA

**Mariusz (Admin)** — developer i architekt systemu Kira. Zarządza pipeline'm wieloma modelami AI, monitoruje koszty i jakość implementacji. Potrzebuje szybkiego overview przed każdą sesją pracy i real-time feedbacku podczas aktywnego pipeline'u. Dotychczas musiał ręcznie odpytywać Bridge API curl'em lub przez WhatsApp.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-13: Multi-project DB + `/api/projects/{key}/stats` i `/api/projects/{key}/runs` — dane projektów
- EPIC-12: Eval Framework + `/api/eval/*` endpoints — dane eval
- EPIC-4: Work Registry + `/api/status/pipeline`, `/api/status/runs` — dane pipeline'u
- EPIC-6: Pattern Detection + `pattern_records` table — dane wzorców
- STORY-13.8/9/10: Auto run tracking + lesson hooks + memU events — kompletne dane runs/lessons

### Blokuje (ten epic odblokowuje):
- EPIC-15 (TBD): Dashboard v2 — zaawansowane analytics, cost forecasting
- EPIC-16 (TBD): Multi-user dashboard z RBAC (Angelika, Zuza, Iza views)

## 📦 ZAKRES (In Scope)

- **Overview page** — stat cards (stories done, runs, success rate, est. cost), velocity chart 30 dni, Kira version banner z unlocked capabilities
- **Model Agent cards** — 4 karty (Kimi/GLM/Sonnet/Codex) ze sparkline chart, success rate, avg duration, przycisk Analyze → modal z historią runów
- **Pipeline view** — aktywne stories (IN_PROGRESS/REVIEW), merge queue, done today; każdy wiersz klikalny → story detail modal
- **Activity Feed** — lista ostatnich 20 eventów pipeline'u (story state changes) w czasie rzeczywistym lub z odświeżeniem co 30s
- **Eval Framework panel** — score per kategoria, pass rate, historia 5 ostatnich runów, przycisk "Run Eval Now"
- **Cost Tracker** — szacunkowy koszt per model, per dzień/tydzień (na podstawie liczby runów i znanych cen API)
- **NightClaw Digest** — karta z linkiem do dzisiejszego digestu, stats (new patterns, lessons, anti-patterns)
- **Patterns panel** — top confirmed patterns z typem, topic, occurrence count
- **System Health** — Bridge API status, memU status, DB size, ostatni run, alerty (4 typy)
- **Multi-project switcher** w sidebarze — dropdown między zarejestrowanymi projektami (kira, gym-tracker, ...)
- **Story Detail Modal** — po kliknięciu story: metadata, DoD, lista runów, wyekstrahowane lekcje, akcje
- **Dwupoziomowy sidebar** — icon rail + text nav z sekcjami; aktywna zakładka z tabs bar
- **Dane z Bridge API** — wszystkie dane live z `http://localhost:8199` (lub skonfigurowany URL)

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Autentykacja / login** — dashboard lokalny, bez auth (EPIC-16 będzie miał multi-user)
- **Edycja stories z UI** — tylko read/view, nie write (pipeline kontrolowany przez CLI/WhatsApp)
- **WebSocket real-time** — polling co 30s wystarczy dla MVP (WebSocket w EPIC-15)
- **Mobile responsive** — desktop-first (1440px+); mobile w EPIC-15
- **Wdrożenie na Vercel/produkcja** — lokalnie `localhost:3000`; deploy w osobnym zadaniu (vercel-deploy skill)
- **Angelika/Zuza/Iza views** — RBAC dashboard w EPIC-16

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] `npm run dev` startuje dashboard na `localhost:3000` bez błędów
- [ ] Overview page ładuje dane z Bridge API i wyświetla poprawne liczby (stories done, runs, success rate)
- [ ] Model Agent cards pokazują rzeczywiste dane z `runs` table (nie mock)
- [ ] Kliknięcie story w Pipeline view otwiera Story Detail Modal z danymi z DB
- [ ] Activity Feed pokazuje ostatnie 10+ eventów pipeline'u
- [ ] Eval panel wyświetla score z `/api/eval/overview` i umożliwia trigger `bridge eval run`
- [ ] Cost Tracker wyświetla szacunkowy koszt per model
- [ ] System Health pokazuje live status Bridge API i memU
- [ ] Multi-project switcher zmienia kontekst dashboardu między projektami
- [ ] Dashboard działa przy Bridge API offline — pokazuje "offline" state, nie crashuje

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-1.1 | database | Next.js projekt setup + Bridge API client | Inicjalizacja projektu Next.js 16 z shadcn/ui, Tailwind, konfiguracja klienta HTTP do Bridge API z obsługą offline |
| STORY-1.2 | backend | Bridge API data layer — hooks i typy | Zestaw React hooks (`useStats`, `usePipeline`, `useRuns`, `useEval`) z TypeScript typami mapującymi Bridge API responses |
| STORY-1.3 | frontend | Overview page — stat cards, velocity chart, Kira banner | Strona główna z 4 stat cards, velocity chart (Chart.js), Kira v1.0 banner z unlocked capabilities tags |
| STORY-1.4 | frontend | Model Agent cards — sparklines, metrics, modal | 4 karty modeli (Kimi/GLM/Sonnet/Codex) ze sparkline charts i Story Detail Modal po kliknięciu |
| STORY-1.5 | frontend | Pipeline view + Activity Feed | Sekcja aktywnego pipeline'u z listą stories, merge queue i live activity feed z ostatnimi eventami |
| STORY-1.6 | frontend | Eval panel + Cost Tracker | Panel eval framework z score bars i run history oraz Cost Tracker z szacowanym kosztem per model |
| STORY-1.7 | frontend | NightClaw Digest + Patterns + System Health | Karty: NightClaw digest z clickable raportem, top patterns, system health z alertami |
| STORY-1.8 | wiring | Multi-project switcher + sidebar navigation | Dwupoziomowy sidebar (icon rail + text nav), project switcher dropdown, tabs bar, routing między widokami |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | dashboard |
| Priorytet | Must |
| Szacunek | L (1–2 tygodnie) |
| Ryzyko | Niskie — Bridge API już działa, endpointy zdefiniowane |
| Domeny | database, backend, wiring, frontend |
| Stack | Next.js 16, shadcn/ui, Tailwind CSS, Chart.js, TypeScript |
| DB | Brak własnej — dane z Bridge API (SQLite przez HTTP) |
| Bridge API | http://localhost:8199 (lub BRIDGE_URL env var) |
| Design reference | kira-dashboard-mockup.html (workspace) + AgentSys dark theme |
| Uwagi | Dashboard read-only MVP. WebSocket i write operations w EPIC-15. |
