---
story_id: STORY-9.8
title: "Skills Diff Panel + Research Findings + Model Performance Stats"
epic: EPIC-9
domain: frontend
difficulty: complex
recommended_model: sonnet-4.6
depends_on: [STORY-9.7]
blocks: none
tags: [diff, research, accordion, model-stats, sparklines]
---

## 🎯 User Story
Admin widzi zmiany w skillach (diff inline), badania (accordion) i wydajność modeli (tabela z ostrzeżeniami).

## Sekcje (na stronie /dashboard/nightclaw, taby Research i Stats)

### Tab Research — Skills Diff Panel + Research Findings

**Skills Diff Panel:**
```
component: components/nightclaw/SkillsDiffPanel.tsx
data: useNightClawSkillsDiff()

Layout per skill:
┌─ kira-orchestrator ──────────────── +2 / -1 ┐
│ @@ -10,3 +10,5 @@                            │
│   stała linia                                │
│ - usunięta linia     (bg:#7f1d1d text:#f87171)│
│ + dodana linia       (bg:#166534 text:#4ade80)│
└──────────────────────────────────────────────┘
```
- Monospace font (`font-mono text-xs`) dla diff
- Badge linie: `+N` zielony, `-N` czerwony
- Empty state: "Brak zmian w skillach w tym runie ✓"

**Research Findings Accordion:**
```
component: components/nightclaw/ResearchAccordion.tsx
data: useNightClawResearch()

Per plik:
┌─ cost-optimization-research.md ─────────── ▼ ┐
│ Preview: pierwsze 3 linie...                  │
│ [ROZWINIĘTY]: pełna treść (react-markdown)   │
└──────────────────────────────────────────────┘
```
- shadcn Accordion lub własny (domyślnie zwinięty)
- Pełna treść renderowana react-markdown
- Empty state: "Brak plików badań"

### Tab Stats — Model Performance Stats

```
component: components/nightclaw/ModelStatsTable.tsx
data: useNightClawDigest() → model_stats

Kolumny tabeli:
Model | Stories OK | Stories Failed | Success Rate | Avg Duration
Kimi  |     15     |       2        |   88% ✅     |   4.2 min
GLM-5 |      8     |       3        |   73% 🔴     |   6.1 min
```

- `success_rate < 0.80` → badge `🔴 Poniżej progu (80%)`
- `success_rate >= 0.80` → badge `✅`
- Sortowane malejąco po success_rate
- Brak danych → "Brak statystyk modeli"

## AC
- Skills diff panel wyświetla diff z kolorami (zielony/czerwony)
- Research accordion otwiera/zamyka pliki
- Model stats tabela z poprawnym badgem ostrzeżenia gdy < 80%
- Empty states dla każdej sekcji
- Brak console.error

## DoD
- [ ] SkillsDiffPanel — diff kolorowany, empty state
- [ ] ResearchAccordion — rozwijany, react-markdown w środku
- [ ] ModelStatsTable — badge < 80%, sortowanie
- [ ] Zero console.error na normalnym użytkowaniu
