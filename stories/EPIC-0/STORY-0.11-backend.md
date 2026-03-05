---
story_id: STORY-0.11
title: "Service health check endpoint + konfiguracja"
epic: EPIC-0
module: infrastructure
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 3h
depends_on: [STORY-0.2]
blocks: [STORY-0.9]
tags: [health-check, monitoring, backend, infrastructure]
---

## 🎯 User Story

**Jako** Mariusz (Admin)
**Chcę** mieć endpoint `/api/health-check` sprawdzający status zewnętrznych serwisów
**Żeby** w dashboardzie (i w widgecie EPIC-1) widzieć czy Bridge, OpenClaw i Supabase działają bez wchodzenia do terminala

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- `healthchecks.json` — konfiguracja które URL-e pingować
- `server.cjs` — background job pingujący co N sekund + `GET /api/health-check`
- Inspiracja: Dashy status checking (background ping z cache, nie per-request)

### Stan systemu przed tą story
- STORY-0.2 ukończona — Bridge proxy działa (`/api/bridge/*`)
- `server.cjs` istnieje z Express

---

## ✅ Acceptance Criteria

### AC-1: Health check zwraca status Bridge
GIVEN: Bridge API nie działa (port 8199 zamknięty)
WHEN: Wykonasz `curl http://localhost:8080/api/health-check`
THEN: Response JSON zawiera `{ "checks": [{ "name": "Bridge API", "status": "down", "latency_ms": null }] }`

### AC-2: Health check zwraca status UP gdy serwis działa
GIVEN: Bridge API działa na `localhost:8199`
WHEN: Wykonasz `curl http://localhost:8080/api/health-check`
THEN: Response zawiera `{ "name": "Bridge API", "status": "up", "latency_ms": 12 }` (latency w ms)

### AC-3: Response jest z cache — nie pinguje na każdy request
GIVEN: Serwer uruchomiony, health check endpoint dostępny
WHEN: Wykonasz 10 requestów do `/api/health-check` w ciągu 1 sekundy
THEN: Background ping NIE odpali się 10 razy — cache zwraca ostatnie wyniki

### AC-4: overall status zdegradowany gdy jeden serwis down
GIVEN: Bridge down, OpenClaw up
WHEN: Wykonasz `GET /api/health-check`
THEN: Response zawiera `{ "overall": "degraded" }` (nie "healthy")

---

## ⚙️ Szczegóły Backend

### `healthchecks.json`
```json
{
  "checks": [
    { "name": "Bridge API", "url": "http://localhost:8199/api/health", "interval": 30, "timeout": 5000 },
    { "name": "OpenClaw", "url": "http://localhost:3578/health", "interval": 30, "timeout": 5000 },
    { "name": "Supabase", "url": "$SUPABASE_URL/rest/v1/", "interval": 60, "timeout": 8000,
      "headers": { "apikey": "$SUPABASE_KEY" } }
  ]
}
```

### Implementacja w `server.cjs`

```javascript
// Health check — background pinging with cache
const healthchecksConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'healthchecks.json'), 'utf8')
);

// In-memory cache
const healthResults = healthchecksConfig.checks.map(c => ({
  name: c.name,
  status: 'unknown',
  latency_ms: null,
  last_check: null,
  error: null
}));

async function pingService(check, index) {
  const url = check.url
    .replace('$SUPABASE_URL', process.env.SUPABASE_URL || '')
    .replace('$SUPABASE_KEY', process.env.SUPABASE_KEY || '');
  
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), check.timeout || 5000);
    
    const headers = {};
    if (check.headers) {
      Object.entries(check.headers).forEach(([k, v]) => {
        headers[k] = v.replace('$SUPABASE_KEY', process.env.SUPABASE_KEY || '');
      });
    }
    
    await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timeout);
    
    healthResults[index] = {
      name: check.name,
      status: 'up',
      latency_ms: Date.now() - start,
      last_check: new Date().toISOString(),
      error: null
    };
  } catch (err) {
    healthResults[index] = {
      name: check.name,
      status: 'down',
      latency_ms: null,
      last_check: new Date().toISOString(),
      error: err.name === 'AbortError' ? 'timeout' : err.message
    };
  }
}

// Start background ping jobs
healthchecksConfig.checks.forEach((check, index) => {
  pingService(check, index); // initial ping
  setInterval(() => pingService(check, index), (check.interval || 30) * 1000);
});

// Endpoint — returns cached results
app.get('/api/health-check', (req, res) => {
  res.json({
    checks: healthResults,
    overall: healthResults.every(c => c.status === 'up') ? 'healthy' : 'degraded',
    generated_at: new Date().toISOString()
  });
});
```

---

## ⚠️ Edge Cases

### EC-1: `healthchecks.json` nie istnieje
Scenariusz: Plik skasowany lub nie stworzony
Oczekiwane zachowanie: Catch przy `JSON.parse(fs.readFileSync(...))` → `healthResults = []`, endpoint zwraca `{ checks: [], overall: "healthy" }`, serwer nie crashuje

### EC-2: Supabase URL nie skonfigurowany
Scenariusz: `SUPABASE_URL` nie ustawiony w `.env`
Oczekiwane zachowanie: URL po replace = pustym stringiem → ping do `""` crashuje → catch → `status: 'down'` z `error: "Not configured"`. Alternatywnie: filter out checks z pustym URL.

---

## 🚫 Out of Scope tej Story
- Widget health-check w UI (EPIC-1)
- Alerty/notyfikacje gdy serwis down
- Historia ping results (tylko current state w cache)
- Custom check scripts (tylko HTTP ping)

---

## ✔️ Definition of Done
- [ ] `healthchecks.json` istnieje z konfiguracją 3 serwisów
- [ ] Background ping job startuje przy uruchomieniu serwera
- [ ] `GET /api/health-check` zwraca cached wyniki (nie pinguje na każdy request)
- [ ] Response zawiera `status: 'up'|'down'|'unknown'`, `latency_ms`, `last_check`
- [ ] `overall: 'healthy'|'degraded'` obliczany poprawnie
- [ ] Brak `healthchecks.json` → serwer nie crashuje
- [ ] Timeout handling (nie blokuje request po 5s+)
