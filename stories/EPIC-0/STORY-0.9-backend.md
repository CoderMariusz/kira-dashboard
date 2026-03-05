---
story_id: STORY-0.9
title: "Server.cjs rozszerzenia — pages auto-discovery, env vars, smart routing"
epic: EPIC-0
module: infrastructure
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-0.2, STORY-0.3, STORY-0.4, STORY-0.7, STORY-0.11]
blocks: [STORY-0.10]
tags: [server, backend, infrastructure, routing, cors]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** żeby `server.cjs` automatycznie odkrywał pages z `dist/` i ładował ich API routes
**Żeby** każda nowa React page (EPIC-2+) była automatycznie serwowana bez ręcznej edycji server.cjs

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Modyfikacja: `server.cjs` — 4 nowe sekcje:
  1. `require('dotenv').config()` na początku
  2. CORS middleware
  3. Pages auto-discovery z `dist/` support
  4. Conditional sync startup

### Stan systemu przed tą story
- STORY-0.2 ukończona — Bridge proxy działa
- STORY-0.3 ukończona — SQLite inicjalizowany
- STORY-0.4 ukończona — Auth middleware dostępny
- STORY-0.7 ukończona — `pages/_example/dist/` istnieje
- STORY-0.11 ukończona — Health check endpoint działa

---

## ✅ Acceptance Criteria

### AC-1: Dotenv loading przy starcie
GIVEN: Plik `.env` istnieje z `PORT=9090`
WHEN: Uruchomisz `node server.cjs`
THEN: Serwer startuje na porcie 9090 (nie domyślnym 8080), loguje port z `.env`

### AC-2: Pages auto-discovery serwuje dist/
GIVEN: `pages/_example/dist/index.html` istnieje
WHEN: Otworzysz `http://localhost:8080/pages/_example/`
THEN: React app z `_example` ładuje się (nie 404)

### AC-3: CORS headers obecne
GIVEN: Serwer uruchomiony
WHEN: Wykonasz `curl -I -X OPTIONS http://localhost:8080/api/auth/login`
THEN: Response zawiera `Access-Control-Allow-Origin: *` i `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`

### AC-4: Page API route ładowane automatycznie
GIVEN: `pages/my-page/api.cjs` istnieje i eksportuje Express router
WHEN: Uruchomisz serwer
THEN: Endpoint `/api/pages/my-page/data` działa bez ręcznego dodania do server.cjs

### AC-5: Sync startuje automatycznie gdy Supabase skonfigurowany
GIVEN: `SUPABASE_URL` ustawiony w `.env`
WHEN: Uruchomisz `node server.cjs`
THEN: Sync cron startuje — widoczny log `📡 Supabase sync cron active`

---

## ⚙️ Szczegóły Backend

### Sekcja 1: Dotenv (na początku server.cjs, przed innymi require)
```javascript
require('dotenv').config();
```

### Sekcja 2: CORS middleware (przed routes)
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

### Sekcja 3: Pages auto-discovery
```javascript
const pagesDir = path.join(__dirname, 'pages');
if (fs.existsSync(pagesDir)) {
  fs.readdirSync(pagesDir).forEach(dir => {
    if (dir.startsWith('_')) return; // skip _shared, _example
    const pageDir = path.join(pagesDir, dir);
    const stat = fs.statSync(pageDir);
    if (!stat.isDirectory()) return;
    
    const distDir = path.join(pageDir, 'dist');
    const apiFile = path.join(pageDir, 'api.cjs');
    
    // Serve built React page from dist/
    if (fs.existsSync(distDir)) {
      app.use(`/pages/${dir}`, express.static(distDir));
      console.log(`📄 Page served: /pages/${dir}/`);
    }
    
    // Load page API if exists
    if (fs.existsSync(apiFile)) {
      const pageApi = require(apiFile);
      if (typeof pageApi === 'function') {
        app.use(`/api/pages/${dir}`, pageApi);
        console.log(`⚙️  Page API loaded: /api/pages/${dir}`);
      }
    }
  });
}
```

### Sekcja 4: Sync startup (po inicjalizacji DB)
```javascript
if (process.env.SUPABASE_URL) {
  require('./sync_to_supabase');
}
```

### Logika routingu — smart data routing
```javascript
// Przykład: gdy Supabase dostępny, używaj go dla remote reads
// gdy nie — fallback do SQLite
// (pełna implementacja w EPIC-12; teraz tylko local SQLite)
const DATA_SOURCE = process.env.SUPABASE_URL ? 'supabase' : 'local';
console.log(`📊 Data source: ${DATA_SOURCE}`);
```

---

## ⚠️ Edge Cases

### EC-1: `pages/` katalog nie istnieje
Scenariusz: Repo sklonowane bez katalogu `pages/`
Oczekiwane zachowanie: `fs.existsSync(pagesDir)` → false → skip discovery, serwer startuje normalnie

### EC-2: `api.cjs` eksportuje nie-funkcję
Scenariusz: Błędny plik `api.cjs` eksportuje obiekt zamiast Express router
Oczekiwane zachowanie: Sprawdzenie `typeof pageApi === 'function'` → pomiń z logiem `⚠️ Skipping invalid api.cjs in pages/${dir}`

### EC-3: `dist/` istnieje ale jest pusty
Scenariusz: Build się nie udał — pusty `dist/`
Oczekiwane zachowanie: `express.static` serwuje 404 dla plików — nie crashuje serwera

---

## 🚫 Out of Scope tej Story
- Hot reload pages przy `npm run build` w dev (EPIC-11)
- Page manifest / navigation menu (EPIC-1 lub EPIC-2)
- Autoryzacja per-page w server (EPIC-3)
- Proxy do Vite dev server (dev mode)

---

## ✔️ Definition of Done
- [ ] `require('dotenv').config()` na początku `server.cjs`
- [ ] CORS middleware aktywny — OPTIONS zwraca 200
- [ ] Pages auto-discovery skanuje `pages/` przy starcie (skip `_` prefix dirs)
- [ ] `pages/*/dist/` serwowane jako static files
- [ ] `pages/*/api.cjs` ładowane jako Express sub-router na `/api/pages/[name]`
- [ ] Sync startuje automatycznie gdy `SUPABASE_URL` w `.env`
- [ ] Serwer loguje wszystkie załadowane pages i API routes
- [ ] Brak `pages/` katalogu → serwer startuje bez błędów
