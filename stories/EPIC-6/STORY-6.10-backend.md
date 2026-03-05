---
story_id: STORY-6.10
title: "Skills API — ls ~/.openclaw/skills/ + skill-usage.log parser"
epic: EPIC-6
module: pipeline
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: should
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-6.9]
tags: [api, skills, openclaw, filesystem, usage-log, parser]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć endpoint API który zwraca listę skilli OpenClaw z metadanymi i datami ostatniego użycia
**Żeby** Skills page mogła wyświetlać zainstalowane skille bez bezpośredniego dostępu do systemu plików

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route: `GET /api/skills/installed`
- Plik: `server/api.cjs` — nowy handler
- Źródło danych: filesystem `~/.openclaw/skills/` + `skill-usage.log` (jeśli istnieje)

### Powiązane pliki
- `server/api.cjs` — Express serwer
- `~/.openclaw/skills/` — katalog zainstalowanych skilli (każdy skill to subkatalog z SKILL.md)
- `~/.openclaw/skills/[skill-name]/SKILL.md` — metadane skilla (name, description)
- `skill-usage.log` — log użycia (ścieżka: `~/.openclaw/skill-usage.log` lub `~/.openclaw/workspace/skill-usage.log`)

### Stan systemu przed tą story
- STORY-0.2 gotowe: serwer Express działa, auth middleware aktywny
- OpenClaw zainstalowany, katalog `~/.openclaw/skills/` istnieje
- Node.js `fs` module dostępny

---

## ✅ Acceptance Criteria

### AC-1: Lista zainstalowanych skilli
GIVEN: `~/.openclaw/skills/` zawiera katalogi: `kira-orchestrator/`, `apple-notes/`, `weather/`
WHEN: klient wywołuje `GET /api/skills/installed`
THEN: serwer zwraca 200 z tablicą 3 obiektów skilli
AND: każdy obiekt zawiera: `name` (nazwa katalogu), `description` (z SKILL.md), `location` (ścieżka absolutna)

### AC-2: Last-used z skill-usage.log
GIVEN: `skill-usage.log` zawiera wpisy: `2026-03-01T10:00:00Z apple-notes` i `2026-02-01T12:00:00Z weather`
WHEN: API zwraca listę skilli
THEN: `apple-notes` ma `last_used: "2026-03-01T10:00:00Z"` i `days_ago: 4`
AND: `weather` ma `last_used: "2026-02-01T12:00:00Z"` i `days_ago: 33`
AND: `kira-orchestrator` (bez wpisów) ma `last_used: null` i `days_ago: null`

### AC-3: Brak skill-usage.log — graceful fallback
GIVEN: plik `skill-usage.log` nie istnieje
WHEN: klient wywołuje `GET /api/skills/installed`
THEN: serwer zwraca 200 z listą skilli gdzie wszystkie mają `last_used: null`
AND: nie zwraca błędu 500 — brak log file to normalny stan

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**GET /api/skills/installed**
```
Method: GET
Path: /api/skills/installed
Auth: Bearer token (Supabase JWT)
Role: admin
```

### Request Schema

```typescript
// GET /api/skills/installed — brak query params
```

### Response Schema

```typescript
// 200 OK
interface SkillsResponse {
  data: Array<{
    name:        string        // nazwa katalogu skilla, np. "apple-notes"
    description: string        // pierwsza linia Description z SKILL.md, lub "Brak opisu"
    location:    string        // absolutna ścieżka, np. "/Users/.../.openclaw/skills/apple-notes"
    last_used:   string | null // ISO 8601 lub null
    days_ago:    number | null // liczba dni od ostatniego użycia lub null
  }>
  meta: {
    total:           number
    skills_dir:      string  // ścieżka do katalogu skills
    log_available:   boolean // czy skill-usage.log istnieje
  }
}
```

### Logika biznesowa

```
GET /api/skills/installed:
1. Sprawdź JWT → brak? 401; zła rola? 403
2. Odczytaj katalog: fs.readdirSync(path.join(os.homedir(), ".openclaw", "skills"))
3. Filtruj tylko katalogi (nie pliki)
4. Dla każdego katalogu: 
   a. Sprawdź czy istnieje SKILL.md → parsuj pole "description" (szukaj linii po "Use when:" lub pierwszą sensowną linię)
   b. Jeśli brak SKILL.md → description = "Brak opisu"
5. Załaduj skill-usage.log:
   a. Sprawdź czy plik istnieje → jeśli nie: log_available = false, wszystkie last_used = null
   b. Jeśli istnieje: parsuj linie formatu: "[ISO_TIMESTAMP] [skill_name]"
   c. Dla każdego skilla znajdź najnowszy wpis
   d. Oblicz days_ago = Math.floor((now - last_used_date) / (1000 * 60 * 60 * 24))
6. Złóż response array
7. Sortuj: najpierw po last_used DESC (najnowsze pierwsze), potem alfabetycznie (null last_used na końcu)
8. Zwróć 200 z response schema
```

### Parsowanie SKILL.md

```
// Szukaj linii zawierającej opis w formacie:
// "<description>Use when: ..." → wyciągnij tekst przed "Use when:"
// lub pierwszą linię po nagłówku # [name]
// Fallback: "Brak opisu"
//
// Przykład SKILL.md:
// <description>Manage Apple Notes via the `memo` CLI... Use when: user asks...</description>
// Wyciągamy: "Manage Apple Notes via the `memo` CLI..."
// Max 150 znaków opisu (truncate z "...")
```

---

## ⚠️ Edge Cases

### EC-1: ~/.openclaw/skills/ nie istnieje
Scenariusz: OpenClaw nie jest zainstalowany lub katalog skills jest pusty
Oczekiwane zachowanie: serwer zwraca 200 z `{ "data": [], "meta": { "total": 0, ... } }` — nie 404 ani 500

### EC-2: skill-usage.log z nieprawidłowymi liniami
Scenariusz: log zawiera linie bez ISO timestamp lub z nieznanym formatem
Oczekiwane zachowanie: serwer pomija nieprawidłowe linie (try/catch per linia), loguje ostrzeżenie do konsoli, zwraca poprawne dane dla poprawnych wpisów

### EC-3: Katalog skills z bardzo dużą liczbą skilli (>50)
Scenariusz: 60 zainstalowanych skilli
Oczekiwane zachowanie: endpoint odpowiada w < 2 sekundy; cachowanie response na 60 sekund (simple in-memory cache)

---

## 🚫 Out of Scope tej Story
- Install/uninstall API (`POST /api/skills/install`, `DELETE /api/skills/uninstall`)
- Available/Community skills (wymaga zewnętrznego rejestru skilli)
- Edycja SKILL.md przez API
- Statystyki użycia (ile razy, nie tylko ostatni raz)

---

## ✔️ Definition of Done
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza
- [ ] Lista skilli zawiera poprawne metadane (name, description z SKILL.md)
- [ ] last_used i days_ago poprawnie obliczone z skill-usage.log
- [ ] Brak skill-usage.log → 200 z null last_used (nie crash)
- [ ] Pusty katalog skills → 200 z pustą tablicą (nie 404)
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z błędną rolą zwraca 403
- [ ] Response time < 2s dla 60 skilli (z cache)
- [ ] Story review przez PO
