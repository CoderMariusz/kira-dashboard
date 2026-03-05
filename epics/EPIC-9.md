---
epic_id: EPIC-9
title: "NightClaw Page — Digest Viewer, Skills Diff, Calendar Heatmap, Model Performance"
module: nightclaw
status: draft
priority: should
estimated_size: M
risk: low
---

## 📋 OPIS

EPIC-9 buduje React page `/pages/nightclaw/` — centrum dowodzenia nocnym cyklem samo-uczenia Kiry. Wyświetla rendered Markdown digest ostatnich sesji NightClaw, diff viewer zmian skilli (co zostało zaktualizowane), calendar heatmap (historia runów: zielony = sukces, czerwony = błąd), statystyki wydajności modeli z ostatnich 24h, oraz listę znalezisk (research findings). Strona jest read-only — tylko Mariusz jako admin ma do niej dostęp.

## 🎯 CEL BIZNESOWY

Mariusz otwiera rano NightClaw page i w 30 sekund wie: co Kira robiła w nocy, które skille zostały zaktualizowane i czy jest jakiś błąd wymagający jego interwencji.

## 👤 PERSONA

**Mariusz (Admin)** — developer nadzorujący autonomiczny system Kiry. Rano sprawdza NightClaw digest jak "raport nocnego dyżurnego" — co się zdarzyło, co się nauczyła, czy coś poszło nie tak.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: Bridge API proxy; React Pages scaffold; sync script (`sync_to_supabase.js` — NightClaw digesty mogą być w Supabase)
- EPIC-3: Auth guard — strona wymaga roli `admin`
- EPIC-8: Patterns Page — NightClaw page linkuje "Nowe patterns znalezione tej nocy" → Patterns page

### Blokuje (ten epic odblokowuje):
- EPIC-1: Widget `nightclaw-card` konsumuje ten sam endpoint co NightClaw page

## 📦 ZAKRES (In Scope)

- **Digest viewer** — lista digestów NightClaw z `GET /api/bridge/nightclaw/digests?limit=30`; per digest: data, status (success/partial/error), rendered Markdown (react-markdown + remark-gfm); collapse/expand; search w treści digestu
- **Skills diff viewer** — per digest: lista skilli które zostały zmodyfikowane; code diff komponent (unified diff format) — co zostało dodane/usunięte w SKILL.md; biblioteka: `diff2html` lub Prism.js z syntaktycznym podświetleniem
- **Calendar heatmap** — ostatnie 90 dni: kolor kwadratu per dzień = status NightClaw run (zielony=pass, czerwony=fail, szary=brak); hover → tooltip z datą, status, ile patterns znaleziono; biblioteka: `react-calendar-heatmap`
- **Model performance stats** — z `GET /api/bridge/nightclaw/stats`: per model z ostatnich 24h podczas NightClaw: liczba runów, success rate, avg token count; spark charts (mini Recharts)
- **Research findings list** — lista znalezisk z digest (sekcja "Research" z Markdown): linki, tytuły, krótkie notatki; ekstrahowane przy parsowaniu Markdown

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Uruchamianie NightClaw z UI** — NightClaw jest uruchamiany przez cron (OpenClaw); ręczny trigger to future
- **Edycja digestów** — read-only; digesty są auto-generowane przez NightClaw skill
- **Konfiguracja NightClaw schedule** — przez OpenClaw cron config, nie przez KiraBoard UI

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Strona `/pages/nightclaw/` wyświetla ostatni digest NightClaw jako zrenderowany Markdown z poprawnym formatowaniem
- [ ] Calendar heatmap pokazuje ostatnie 90 dni z kolorami per status runy; hover tooltip działa
- [ ] Skills diff viewer wyświetla diff zmian skilli z ostatniego NightClaw run (jeśli jakieś były)
- [ ] Model performance stats wyświetla dane per model z ostatnich 24h z spark charts
- [ ] Strona niedostępna dla roli `home` / `home_plus` — redirect na dashboard

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-9.1 | backend | NightClaw API — digests + stats + skills diff | Endpointy `GET /api/bridge/nightclaw/digests`, `GET /api/bridge/nightclaw/stats`, `GET /api/bridge/nightclaw/skills-diff` — proxy Bridge API + parsowanie digest plików Markdown |
| STORY-9.2 | wiring | Typy + API client dla NightClaw module | Typy `NightClawDigest`, `NightClawStats`, `SkillDiff`, `ResearchFinding`; serwis `nightclawApi` w `_shared/lib/nightclaw-api.ts` |
| STORY-9.3 | frontend | Digest viewer + research findings | Komponent `DigestViewer`: lista digestów, react-markdown rendering, search, collapse/expand; `ResearchFindings` extrahowane z Markdown |
| STORY-9.4 | frontend | Calendar heatmap + model performance + skills diff | Komponent `NightClawCalendar` (react-calendar-heatmap, 90 dni), `ModelPerfStats` (spark charts), `SkillsDiffViewer` (diff2html lub własny diff renderer) |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | nightclaw |
| Priorytet | Should |
| Szacunek | M (4-5 dni) |
| Ryzyko | Niskie — read-only, dane z Bridge API; największe ryzyko to format digestów NightClaw (czy API zwraca spójną strukturę) |
| Domeny | backend, wiring, frontend |
| Stack | React 19, react-markdown, remark-gfm, react-calendar-heatmap, diff2html (lub Prism.js), Recharts (spark charts), shadcn/ui |
| Uwagi | `react-calendar-heatmap` to lekka biblioteka bez heavy deps. Sprawdź format digestów NightClaw przed implementacją backendu — może wymagać parsowania plików .md z `~/.openclaw/memory/`. |
