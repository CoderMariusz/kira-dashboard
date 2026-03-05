---
story_id: STORY-9.1
title: "NightClaw API — czytaj digest/, model-stats.json, LESSONS_LEARNED.md"
epic: EPIC-9
module: nightclaw
domain: backend
status: draft
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-9.2, STORY-9.3, STORY-9.4]
tags: [api, proxy, file-read, markdown, nightclaw]
---

## 🎯 User Story

**Jako** admin KiraBoard
**Chcę** mieć endpointy API zwracające dane z plików NightClaw (digesty, statystyki modeli, lekcje)
**Żeby** frontend mógł wyświetlać nocny raport i dane analityczne bez bezpośredniego dostępu do systemu plików

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Route handler: `/app/api/nightclaw/digest/route.ts` — lista digestów + najnowszy
- Route handler: `/app/api/nightclaw/stats/route.ts` — model-stats.json
- Route handler: `/app/api/nightclaw/lessons/route.ts` — LESSONS_LEARNED.md jako strukturowane dane

### Powiązane pliki
- Source files (read-only, filesystem):
  - Digesty: `~/.openclaw/memory/` lub `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/digest/YYYY-MM-DD.md`
  - Model stats: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw/model-stats.json`
  - Lekcje: `/Users/mariuszkrawczyk/codermariusz/kira/.kira/LESSONS_LEARNED.md`
- Server proxy pattern z STORY-0.2 (`/app/api/bridge/[...slug]/route.ts`)

### Stan systemu przed tą story
- STORY-0.2 (Bridge API proxy) musi być gotowa — dostęp do systemu plików przez server-side route handlers
- Pliki NightClaw istnieją na dysku (produkcja)
- Next.js app router skonfigurowany

---

## ✅ Acceptance Criteria

### AC-1: GET /api/nightclaw/digest — ostatni digest
GIVEN: katalog digest/ zawiera pliki `YYYY-MM-DD.md`, użytkownik ma rolę `admin`
WHEN: wysyła `GET /api/nightclaw/digest`
THEN: serwer zwraca 200 z obiektem `{ date: "2026-03-03", content: "<markdown string>", filename: "2026-03-03.md" }` — treść ostatniego pliku (sortowanie desc po nazwie)
AND: `content` zawiera surowy Markdown (nie HTML)

### AC-2: GET /api/nightclaw/digest?list=true — lista digestów
GIVEN: katalog digest/ zawiera co najmniej 1 plik `.md`, użytkownik ma rolę `admin`
WHEN: wysyła `GET /api/nightclaw/digest?list=true`
THEN: serwer zwraca 200 z tablicą `[{ date: "2026-03-03", filename: "2026-03-03.md" }, ...]` posortowaną desc po dacie
AND: parametr `?date=YYYY-MM-DD` pozwala pobrać konkretny digest po dacie

### AC-3: GET /api/nightclaw/stats — statystyki modeli
GIVEN: plik `model-stats.json` istnieje i jest poprawnym JSON, użytkownik ma rolę `admin`
WHEN: wysyła `GET /api/nightclaw/stats`
THEN: serwer zwraca 200 z zawartością `model-stats.json` jako obiekt `{ models: { ... } }`
AND: odpowiedź zawiera pole `last_updated` (mtime pliku jako ISO 8601)

### AC-4: GET /api/nightclaw/lessons — lekcje
GIVEN: plik `LESSONS_LEARNED.md` istnieje, użytkownik ma rolę `admin`
WHEN: wysyła `GET /api/nightclaw/lessons`
THEN: serwer zwraca 200 z obiektem `{ content: "<markdown string>", last_updated: "ISO 8601" }`
AND: `content` to surowy Markdown całego pliku (parsowanie po stronie frontendu)

### AC-5: Brak dostępu bez roli admin
GIVEN: użytkownik zalogowany z rolą `home` lub `home_plus`
WHEN: wysyła GET na dowolny endpoint `/api/nightclaw/*`
THEN: serwer zwraca 403 `{ error: "Brak uprawnień. Strona dostępna tylko dla administratora." }`

---

## ⚙️ Szczegóły Backend

### Endpoint(y)

**1. GET /api/nightclaw/digest**
```
Path: /api/nightclaw/digest
Auth: Bearer token (Supabase JWT) — server-side verify
Role: admin only
Query params:
  list?: boolean   // jeśli true → zwróć listę metadata, nie content
  date?: string    // YYYY-MM-DD → pobierz konkretny digest
```

**2. GET /api/nightclaw/stats**
```
Path: /api/nightclaw/stats
Auth: Bearer token (Supabase JWT) — server-side verify
Role: admin only
```

**3. GET /api/nightclaw/lessons**
```
Path: /api/nightclaw/lessons
Auth: Bearer token (Supabase JWT) — server-side verify
Role: admin only
```

### Response Schema

```typescript
// GET /api/nightclaw/digest (domyślnie — ostatni)
interface DigestResponse {
  date: string        // "2026-03-03"
  filename: string    // "2026-03-03.md"
  content: string     // surowy Markdown
}

// GET /api/nightclaw/digest?list=true
interface DigestListResponse {
  digests: Array<{
    date: string      // "2026-03-03"
    filename: string  // "2026-03-03.md"
  }>
}

// GET /api/nightclaw/digest?date=YYYY-MM-DD
// → DigestResponse lub 404

// GET /api/nightclaw/stats
interface StatsResponse {
  models: Record<string, {
    stories_completed: number
    stories_failed: number
    success_rate: number
    avg_duration_min: number
    last_story_id: string
    notes?: string
  }>
  last_updated: string  // ISO 8601 (mtime pliku)
}

// GET /api/nightclaw/lessons
interface LessonsResponse {
  content: string       // surowy Markdown
  last_updated: string  // ISO 8601 (mtime pliku)
}

// Błędy
// 403 → rola nie jest admin
// 404 → plik nie istnieje (np. brak digestu dla podanej daty)
// 500 → błąd odczytu systemu plików
```

### Logika biznesowa (krok po kroku)

```
GET /api/nightclaw/digest:
1. Verify JWT token → brak? zwróć 401
2. Sprawdź rolę z token claims → nie admin? zwróć 403
3. Jeśli ?list=true:
   a. fs.readdirSync(DIGEST_DIR) → filtruj pliki *.md
   b. Sortuj desc (alphabetically = chronologically dla YYYY-MM-DD)
   c. Zwróć 200 z tablicą { date, filename }
4. Jeśli ?date=YYYY-MM-DD:
   a. Sprawdź czy plik `date.md` istnieje → nie? zwróć 404
   b. fs.readFileSync(plik) → zwróć 200 z DigestResponse
5. Domyślnie (brak params):
   a. fs.readdirSync(DIGEST_DIR) → filtruj *.md, sort desc, weź pierwszy
   b. Brak plików? zwróć 404 { error: "Brak digestów NightClaw" }
   c. fs.readFileSync(najnowszy) → zwróć 200 z DigestResponse

GET /api/nightclaw/stats:
1. Verify JWT → brak? 401; nie admin? 403
2. fs.readFileSync(STATS_FILE) → JSON.parse
3. fs.statSync(STATS_FILE).mtime → ISO 8601
4. Zwróć 200 { ...parsedJSON, last_updated }

GET /api/nightclaw/lessons:
1. Verify JWT → brak? 401; nie admin? 403
2. fs.readFileSync(LESSONS_FILE) → string
3. fs.statSync(LESSONS_FILE).mtime → ISO 8601
4. Zwróć 200 { content, last_updated }
```

### Stałe konfiguracyjne (environment)
```typescript
// /lib/nightclaw-config.ts
const NIGHTCLAW_BASE = process.env.NIGHTCLAW_PATH
  ?? '/Users/mariuszkrawczyk/codermariusz/kira/.kira/nightclaw'

export const DIGEST_DIR   = `${NIGHTCLAW_BASE}/digest`
export const STATS_FILE   = `${NIGHTCLAW_BASE}/model-stats.json`
export const LESSONS_FILE = process.env.LESSONS_PATH
  ?? '/Users/mariuszkrawczyk/codermariusz/kira/.kira/LESSONS_LEARNED.md'
```

---

## ⚠️ Edge Cases

### EC-1: Pusty katalog digest/
Scenariusz: katalog `digest/` istnieje ale nie zawiera żadnych plików `.md`
Oczekiwane zachowanie: `GET /api/nightclaw/digest` zwraca 404 `{ error: "Brak digestów NightClaw" }`; `?list=true` zwraca 200 `{ digests: [] }`

### EC-2: Plik model-stats.json zawiera niepoprawny JSON
Scenariusz: plik istnieje ale jest uszkodzony (np. przerwany zapis)
Oczekiwane zachowanie: serwer zwraca 500 `{ error: "Błąd parsowania danych statystyk modeli" }` — nie crashuje Node.js procesu (try/catch)

### EC-3: Katalog digest/ nie istnieje (świeża instalacja)
Scenariusz: NightClaw nie uruchamiał się jeszcze, katalog nie istnieje
Oczekiwane zachowanie: zwraca 404 `{ error: "Katalog digestów nie istnieje" }`, NIE 500

### EC-4: Żądanie z ?date=2026-99-99 (nieprawidłowa data)
Scenariusz: klient wysyła datę w złym formacie lub nieistniejącą
Oczekiwane zachowanie: walidacja regex `^\d{4}-\d{2}-\d{2}$` → błędny format → 400 `{ error: "Nieprawidłowy format daty. Użyj YYYY-MM-DD" }`; prawidłowy format ale brak pliku → 404

---

## 🚫 Out of Scope tej Story
- Parsowanie Markdown (frontend job)
- Zapisywanie/edytowanie jakichkolwiek plików NightClaw
- Skills diff viewer (to EPIC-9 oryginalnie, ale w tym PRD zakres to digest + stats + lessons)
- Supabase sync digestów (EPIC-12)
- Triggering NightClaw manualnie

---

## ✔️ Definition of Done
- [ ] Kod przechodzi linter bez błędów (`npm run lint`)
- [ ] Endpoint zwraca poprawne kody HTTP dla każdego scenariusza z logiki
- [ ] Walidacja inputu odrzuca nieprawidłowe dane z czytelnym komunikatem
- [ ] Endpointy nie crashują na braku plików — graceful 404/500
- [ ] Nieautoryzowane wywołanie (bez tokena) zwraca 401
- [ ] Wywołanie z rolą `home`/`home_plus` zwraca 403
- [ ] Ścieżki do plików skonfigurowane przez env vars (nie hardkodowane)
- [ ] Story review przez PO
