---
story_id: STORY-10.8
title: "Widok /settings/system — health panel, API keys, cron jobs, restart Bridge"
epic: EPIC-10
domain: frontend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-10.6, STORY-10.2]
blocks: none
tags: [settings, system, health, bridge, cron, frontend]
---

## 🎯 User Story
Admin widzi stan infrastruktury i może restartować Bridge — bez terminala.

## Plik
`app/settings/system/page.tsx`

## Layout (4 sekcje)

### Sekcja 1 — Status kart (2-column grid)
```
┌─ OpenClaw ──────────────┐  ┌─ Bridge ─────────────────┐
│ ⚙️ v2026.2.22           │  │ 🔗 Status: [UP ✅]         │
│ Uptime: 3d 12h 45m      │  │ v1.4.2                    │
│ WhatsApp ✅  Telegram ✅  │  │ Ostatni błąd: brak ✓      │
└─────────────────────────┘  └──────────────────────────┘
```
- `useSystemStatus()` — loading: skeleton; error: "Nie można pobrać statusu"
- Uptime: format `{d}d {h}h {m}m` z sekund
- Bridge DOWN badge: `bg-red-500/20 text-red-400`

### Sekcja 2 — API Keys tabela
```
┌─ Klucz ─────────────┬─ Masked ─────────┬─ Status ─┬─ Wygasa ─┐
│ Anthropic API Key   │ sk-••••••••abcd  │  ✅ OK   │ —        │
│ Moonshot (Kimi)     │ sk-••••••••1234  │  ✅ OK   │ —        │
└─────────────────────┴──────────────────┴──────────┴──────────┘
```
Uwaga nad tabelą: "🔒 Pełne wartości kluczy nie są wyświetlane ze względów bezpieczeństwa."
`useApiKeys()` — loading: skeleton; empty: "Brak kluczy API"

### Sekcja 3 — Cron Jobs tabela
```
┌─ Nazwa ──────────────┬─ Harmonogram ─┬─ Ostatni run ─┬─ Status ─┐
│ nightclaw-digest     │ 0 2 * * *     │ 25 lut 02:01  │ ✅ OK    │
│ sync-bridge          │ */5 * * * *   │ 25 lut 20:55  │ ✅ OK    │
│ kira-watchdog        │ co 10 min     │ 25 lut 20:50  │ ✅ OK    │
└──────────────────────┴───────────────┴───────────────┴──────────┘
```
RunStatusBadge: success (emerald), error (red), running (blue pulsing), never (slate)
`useCronJobs()` — loading: skeleton; empty: "Brak zarejestrowanych cron jobów"

### Sekcja 4 — Akcje systemowe
Karta z przyciskiem "🔄 Restart Bridge" (czerwone obramowanie):
- Kliknięcie → ConfirmModal:
  - Tytuł: "Restart Bridge"
  - Body: "Spowoduje chwilową niedostępność. Czy kontynuować?"
  - "Anuluj" / "Restart" (czerwony)
- Po confirm: loading spinner → `SystemService.restartBridge()` → toast sukces/błąd
- Przycisk disabled gdy Bridge DOWN lub w trakcie restartu

## AC
- Karty statusu OpenClaw + Bridge z danymi lub skeleton/error
- Tabela API keys z masked values (nie ujawnia pełnych)
- Tabela cron jobs z RunStatusBadge
- Restart Bridge z ConfirmModal + toast
- Bridge DOWN → przycisk Restart disabled
- Sub-nav Users/System działa

## DoD
- [ ] Sekcja status — 2 karty, skeleton, error
- [ ] API keys tabela z masked, uwaga o bezpieczeństwie
- [ ] Cron jobs tabela z RunStatusBadge
- [ ] RestartBridge: modal + toast sukcesu + disabled gdy DOWN
- [ ] Brak console.error
- [ ] Mobile: tabele ze scrollem poziomym
