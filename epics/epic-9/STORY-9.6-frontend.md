---
story_id: STORY-9.6
title: "NightClaw page — layout, sidebar nav, Run Overview cards"
epic: EPIC-9
domain: frontend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-9.5]
blocks: [STORY-9.7, STORY-9.8]
tags: [page, layout, sidebar, overview, cards]
---

## 🎯 User Story
Admin wchodzi na `/dashboard/nightclaw` i widzi kartę runu z dzisiejszą datą, statusem i statystykami.

## Pliki
- `app/dashboard/nightclaw/page.tsx`
- Sidebar: dodaj „🌙 NightClaw" do sekcji Intelligence

## Kolory
```
tło: #0d0c1a  |  karty: #1a1730  |  border: #3b3d7a  |  accent: #818cf8
text: #e6edf3  |  muted: #4b4569
ok: #22c55e    |  error: #ef4444  |  miss: #374151
```

## Layout strony
```
/dashboard/nightclaw
├── Header: "🌙 NightClaw Digest" + date badge (dziś) + 4 tabs [Overview | Digest | Research | Stats]
├── Tab: Overview
│   ├── Karta "Ostatni run" — data, czas trwania, status badge
│   ├── Stat cards (4): Nowe wzorce | Lekcje | Otwarte problemy | Zmodyfikowane skille
│   └── Bridge status (online/offline)
└── [pozostałe taby → STORY-9.7 i STORY-9.8]
```

## AC
- Strona ładuje się <2s, nie crashuje gdy Bridge offline
- Sidebar ma „🌙 NightClaw" podświetlone na aktywnej stronie
- 4 stat cards z danymi z `useNightClawDigest()` (summary + model_stats)
- Stany: loading (skeleton 4 karty), error (komunikat + retry), offline (badge "Bridge offline")
- Nawigacja tab URL state: `?tab=overview|digest|research|stats`

## DoD
- [ ] Strona renderuje bez błędu
- [ ] Sidebar nav aktywny
- [ ] 4 stat cards z danymi lub skeleton
- [ ] Tab URL state działa
- [ ] Mobile 375px bez horizontal scroll
