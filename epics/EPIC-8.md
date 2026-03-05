---
epic_id: EPIC-8
title: "Patterns Page — Knowledge Base, Markdown Browser, Tag Filter"
module: patterns
status: draft
priority: should
estimated_size: S
risk: low
---

## 📋 OPIS

EPIC-8 buduje React page `/pages/patterns/` — przeglądarkę knowledge base Kiry: patterns, anti-patterns i lekcje wyciągnięte z pipeline. Strona parsuje pliki Markdown (`patterns.md`, `anti-patterns.md`, `LESSONS_LEARNED.md`) z repozytorium Kiry, renderuje je z filtrowaniem po tagach i searchem, oraz umożliwia dodawanie nowych wpisów przez formularz (który appenduje do pliku Markdown). To read-heavy narzędzie — Mariusz przegląda patterns zebrane przez NightClaw i ręcznie dodaje nowe obserwacje.

## 🎯 CEL BIZNESOWY

Mariusz wyszukuje "sqlite" i w 3 sekundy widzi wszystkie patterns i anti-patterns dotyczące SQLite zebrane przez Kirę w ostatnich tygodniach.

## 👤 PERSONA

**Mariusz (Admin)** — developer uczący się z błędów Kiry. Przeglądania patterns używa do retrospektyw, code review i planowania nowych epiców. Dodaje własne obserwacje przez formularz zamiast edytować plik Markdown ręcznie.

## 🔗 ZALEŻNOŚCI

### Wymaga (musi być gotowe przed tym epicem):
- EPIC-0: React Pages scaffold; bridge API proxy (pliki patterns mogą być przez Bridge lub bezpośrednio z systemu plików)
- EPIC-3: Auth guard — strona dla roli `admin`

### Blokuje (ten epic odblokowuje):
- EPIC-9: NightClaw Page linkuje do Patterns page (patterns znalezione przez NightClaw)

## 📦 ZAKRES (In Scope)

- **Markdown parser** — backend czyta pliki `patterns.md`, `anti-patterns.md`, `LESSONS_LEARNED.md` z `OPENCLAW_DIR` (konfiguracja przez `.env`); parsuje sekcje po nagłówkach H2/H3; każdy wpis = { tytuł, treść, tagi, data, źródło }; endpoint `GET /api/patterns/list`
- **Pattern browser** — lista wszystkich patterns z kategorią (pattern / anti-pattern / lesson); rendered markdown (react-markdown); tag badges; collapse/expand treść; search input (client-side filter po tytule i treści)
- **Tag filter** — sidebar lub chips z listą tagów (extracted z markdown, np. `#sqlite`, `#auth`, `#performance`); klik tagu → filtruje listę; multi-select tags (OR logic)
- **Search** — client-side fuzzy search po tytule i pierwszych 200 znakach treści; instant filter bez API call
- **Add new entry form** — formularz: tytuł, typ (pattern/anti-pattern/lesson), tagi (comma separated), treść (textarea markdown); `POST /api/patterns/add` → appends do odpowiedniego pliku .md z datą i autorem

## 🚫 POZA ZAKRESEM (Out of Scope)

- **Edycja i usuwanie istniejących wpisów** — append-only (bezpiecznie); edycja przez plik Markdown ręcznie lub NightClaw
- **Wersjonowanie patterns** — git history wystarczy jako wersjonowanie
- **Importowanie patterns z zewnętrznych źródeł** — tylko lokalne pliki .md z Kira repo

## ✅ KRYTERIA AKCEPTACJI EPICA

- [ ] Strona `/pages/patterns/` wyświetla patterns z plików Markdown poprawnie zrenderowane (react-markdown)
- [ ] Search "sqlite" filtruje listę do wpisów zawierających to słowo w tytule lub treści (client-side, instant)
- [ ] Tag filter: klik `#auth` → lista zawiera tylko wpisy z tym tagiem; multi-select działa (OR)
- [ ] "Add Pattern" form: wypełnienie + submit → nowy wpis pojawia się na liście po reload; plik .md ma nową sekcję
- [ ] Strona niedostępna dla roli `home` — redirect na dashboard

## 📊 STORIES W TYM EPICU

| Story ID | Domena | Tytuł | Opis jednym zdaniem |
|----------|--------|-------|---------------------|
| STORY-8.1 | backend | Patterns file parser + CRUD API | Endpoint `GET /api/patterns/list` (parsuje .md files, zwraca strukturę) + `POST /api/patterns/add` (append do pliku z timestamp) |
| STORY-8.2 | wiring | Typy + API client dla Patterns | Typy `Pattern`, `PatternType`, `PatternFilter`; serwis `patternsApi` w `_shared/lib/patterns-api.ts` |
| STORY-8.3 | frontend | Patterns browser + search + tag filter | Komponent `PatternsBrowser`: lista z react-markdown rendering, search input (client-side), tag chips filter, collapse/expand |
| STORY-8.4 | frontend | Add new pattern form | Komponent `AddPatternForm` (modal lub sidebar panel): tytuł, typ select, tagi input, markdown textarea z preview |

## 🏷️ METADANE

| Pole | Wartość |
|------|---------|
| Moduł | patterns |
| Priorytet | Should |
| Szacunek | S (2-3 dni) |
| Ryzyko | Niskie — read-heavy, parsowanie Markdown to proste, UI minimalne |
| Domeny | backend, wiring, frontend |
| Stack | React 19, react-markdown, remark-gfm, shadcn/ui (Input, Badge, Textarea, Dialog), Node.js fs (czytanie plików .md) |
| Uwagi | Parsowanie Markdown: użyj `remark` lub prostego regex per H2/H3 heading. Tag extraction: szukaj `#tag` w treści lub YAML frontmatter. Nie musisz używać pełnego AST parsera — prosty string split po nagłówkach wystarczy. |
