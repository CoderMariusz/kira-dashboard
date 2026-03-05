---
story_id: STORY-0.1
title: "Fork LobsterBoard + rebrand na KiraBoard"
epic: EPIC-0
module: infrastructure
domain: infrastructure
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: none
blocks: [STORY-0.2, STORY-0.3, STORY-0.4, STORY-0.5, STORY-0.6, STORY-0.7, STORY-0.8, STORY-0.9, STORY-0.10, STORY-0.11, STORY-0.12, STORY-0.13, STORY-0.14, STORY-0.15, STORY-0.16]
tags: [fork, rebrand, infrastructure, setup]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** sforkować LobsterBoard i zmienić branding na KiraBoard
**Żeby** mieć czysty punkt startowy z nową marką, na którym można budować kolejne EPIC-i

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
Root projektu: `/Users/mariuszkrawczyk/CoderMariusz/kira-dashboard`
Pliki do zmiany: `package.json`, `index.html`, `app.html`, `server.cjs`, `css/builder.css`, `README.md`, pliki logo/favicon

### Stan systemu przed tą story
- Repo `kira-dashboard` istnieje (fork z LobsterBoard lub świeże z archiwum)
- Node.js ≥ 16 zainstalowany
- npm dostępny

---

## ✅ Acceptance Criteria

### AC-1: Package.json zaktualizowany
GIVEN: Repo sklonowane lokalnie
WHEN: Odczytamy `package.json`
THEN: `name = "kira-board"`, `version = "1.0.0"`, `description` zawiera "KiraBoard", `author` zaktualizowany

### AC-2: Tytuł w przeglądarce zmieniony
GIVEN: Serwer uruchomiony (`node server.cjs`)
WHEN: Otworzysz `http://localhost:8080` w przeglądarce
THEN: Tab przeglądarki wyświetla "KiraBoard" (nie "LobsterBoard")

### AC-3: Header serwera zmieniony
GIVEN: `server.cjs` zaktualizowany
WHEN: Uruchomisz `node server.cjs`
THEN: Header/logo aplikacji wyświetla "KiraBoard 🦊"

### AC-4: Initial commit wgrane
GIVEN: Wszystkie zmiany wprowadzone
WHEN: Sprawdzisz `git log --oneline`
THEN: Ostatni commit ma message `feat: fork LobsterBoard → KiraBoard rebrand`

---

## 🔧 Szczegóły implementacji

**Kroki:**
1. Fork `github.com/Curbob/LobsterBoard` → `github.com/[your-org]/kira-board`
2. `git clone` + nowy branch `main`
3. Pliki do zmiany:
   - `package.json`: name → `kira-board`, version → `1.0.0`, description, author
   - `index.html`: title → `KiraBoard`, meta tags
   - `app.html`: title → `KiraBoard`
   - `server.cjs`: header logo text → `KiraBoard 🦊`
   - `css/builder.css`: domyślny theme → kiraboard (STORY-0.8)
4. Logo files: zastąpić `lobsterboard-logo-*.png` nowym logo KiraBoard (lub tymczasowo rename)
5. `favicon.png` → nowy favicon
6. Cleanup: usunąć `lobsterboard-mascot-*.png` (lub zachować jako heritage)
7. `README.md`: nowa treść z KiraBoard branding i linkami
8. Initial commit: `feat: fork LobsterBoard → KiraBoard rebrand`

```bash
# Przykładowe komendy
grep -r "LobsterBoard" . --include="*.html" --include="*.cjs" --include="*.json" -l
# → lista plików do zmiany
sed -i '' 's/LobsterBoard/KiraBoard/g' index.html app.html
# Manualna edycja server.cjs header
```

---

## ⚠️ Edge Cases

### EC-1: Pliki binarne (PNG logo)
Scenariusz: Pliki logo/favicon są binarne — `sed` nie zadziała
Oczekiwane zachowanie: Zastąp ręcznie plikami PNG z nowym logo (lub skopiuj tymczasowo i rename)
Komunikat dla użytkownika: N/A — zadanie agenta

### EC-2: Zależności LobsterBoard specyficzne
Scenariusz: `package-lock.json` zawiera stare odwołania do LobsterBoard
Oczekiwane zachowanie: Po `npm install` zależności instalują się poprawnie mimo rename — `name` w package.json nie wpływa na instalację

---

## 🚫 Out of Scope tej Story
- Dodawanie nowych widgetów
- Zmiany CSS palety kolorów (STORY-0.8)
- Konfiguracja Bridge API proxy (STORY-0.2)
- Inicjalizacja bazy danych (STORY-0.3)

---

## ✔️ Definition of Done
- [ ] `package.json`: `name = "kira-board"`, `version = "1.0.0"`
- [ ] `index.html` i `app.html`: title → "KiraBoard"
- [ ] `server.cjs`: header wyświetla "KiraBoard 🦊"
- [ ] `node server.cjs` startuje bez błędów
- [ ] Przeglądarka pokazuje "KiraBoard" w tytule taba
- [ ] Git commit: `feat: fork LobsterBoard → KiraBoard rebrand`
- [ ] Brak odniesień do "LobsterBoard" w widocznych UI elementach
