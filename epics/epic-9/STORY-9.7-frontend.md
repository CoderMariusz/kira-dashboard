---
story_id: STORY-9.7
title: "Digest Viewer + Calendar History (date picker + 90-day calendar)"
epic: EPIC-9
domain: frontend
difficulty: moderate
recommended_model: sonnet-4.6
depends_on: [STORY-9.6]
blocks: [STORY-9.8]
tags: [markdown, calendar, date-picker, digest, viewer]
---

## 🎯 User Story
Admin czyta markdown digest z date pickerem i widzi 90-dniowy kalendarz historii.

## Komponenty
- `components/nightclaw/DigestViewer.tsx` — react-markdown + rehype-highlight
- `components/nightclaw/RunCalendar.tsx` — 90-dniowy grid kalendarza
- Zainstaluj jeśli brak: `npm install react-markdown rehype-highlight`

## Tab Digest (w page.tsx z STORY-9.6)
```
┌─────────────────────────────────────┐
│  📅 Date picker  [← Poprzedni] [Następny →]  │
├─────────────────────────────────────┤
│  Markdown content (react-markdown)  │
│  Podświetlanie składni kodu         │
└─────────────────────────────────────┘
```

- Date picker: input type="date" + przyciski prev/next; zmiana → `useNightClawDigest(date)`
- Markdown render: `<ReactMarkdown rehypePlugins={[rehypeHighlight]}>` 
- Styling markdown: `.prose` klasa Tailwind (tailwindcss-typography jeśli zainstalowane, jeśli nie — custom)
- Heading 1 → text-xl bold accent `#818cf8`; tabele → bordered; code blocks → `#13111c`

## Tab Calendar (opcjonalnie inline w Digest lub osobny tab)
```
[Luty 2026]
Pon  Wt  Śr  Czw  Pt   Sob  Nie
 1   2   3   4   5🟢  6🟢  7
 ...
18🟢 19🟢 20🔴 21🟢 22   23   24
```

Koła: 🟢 ok (#22c55e) | 🔴 error (#ef4444) | ⚪ missing (#374151)
Kliknięcie dnia z runem → ładuje ten digest w DigestViewer

## AC
- react-markdown renderuje nagłówki, tabele, bloki kodu
- Date picker zmienia datę → nowe dane (bez przeładowania strony)
- Kalendarz 90 dni z kolorowymi kółkami
- Klik w dzień z runem → update digest content
- 404 (brak digest na dany dzień) → komunikat "Brak digestu dla {date}"
- Stany: loading skeleton, error, empty (brak treści)

## DoD
- [ ] react-markdown działa, kod podświetlany
- [ ] Date picker prev/next + input
- [ ] Kalendarz 90 dni poprawnie kolorowany
- [ ] Klik kalendarza ładuje digest dla dnia
- [ ] Brak console.error
