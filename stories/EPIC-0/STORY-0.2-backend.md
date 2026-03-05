---
story_id: STORY-0.2
title: "Bridge API proxy w server.cjs"
epic: EPIC-0
module: infrastructure
domain: backend
status: ready
difficulty: simple
recommended_model: kimi-k2.5
priority: must
estimated_effort: 2h
depends_on: [STORY-0.1]
blocks: [STORY-0.9, STORY-0.11]
tags: [proxy, bridge, api, backend]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć route `/api/bridge/*` w server.cjs proxy'ujący requesty do Bridge API
**Żeby** dashboard mógł odpytywać Bridge API przez lokalny serwer (bez cross-origin issues) z obsługą offline state

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
`server.cjs` — nowa sekcja routes po istniejących route'ach

### Stan systemu przed tą story
- STORY-0.1 ukończona — repo jest sforkowane, `server.cjs` istnieje
- Bridge API działa na `localhost:8199` (lub nie — serwer musi to obsłużyć)
- `express` i `node-fetch` dostępne w projekcie

---

## ✅ Acceptance Criteria

### AC-1: Proxy GET request do Bridge
GIVEN: Bridge API działa na `http://localhost:8199`
WHEN: Wykonasz `curl http://localhost:8080/api/bridge/status`
THEN: Serwer zwraca response z Bridge API (status 200, JSON z danymi Bridge)

### AC-2: Proxy POST request
GIVEN: Bridge API przyjmuje POST na `/api/stories`
WHEN: Wykonasz `curl -X POST http://localhost:8080/api/bridge/stories -d '{"test":1}'`
THEN: Request dociera do Bridge API z body, response wraca do klienta

### AC-3: Offline state — Bridge niedostępny
GIVEN: Bridge API nie działa (`localhost:8199` nie odpowiada)
WHEN: Wykonasz `curl http://localhost:8080/api/bridge/status`
THEN: Serwer zwraca status 503 z JSON `{ "error": "Bridge API offline", "bridge_url": "http://localhost:8199", "detail": "..." }` (nie crashuje)

### AC-4: Timeout handling
GIVEN: Bridge API odpowiada bardzo wolno (> 5 sekund)
WHEN: Wykonasz request do `/api/bridge/*`
THEN: Serwer zwraca 504 z JSON `{ "error": "Bridge API timeout", "bridge_url": "..." }` po 5 sekundach

---

## 🔧 Szczegóły implementacji

```javascript
// server.cjs — Bridge API proxy
const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:8199';
const BRIDGE_TIMEOUT = 5000; // 5s timeout

app.all('/api/bridge/*', async (req, res) => {
  const bridgePath = req.params[0]; // everything after /api/bridge/
  const url = `${BRIDGE_URL}/api/${bridgePath}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BRIDGE_TIMEOUT);
    
    const response = await fetch(url, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['POST','PATCH','PUT'].includes(req.method) ? JSON.stringify(req.body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'Bridge API timeout', bridge_url: BRIDGE_URL });
    } else {
      res.status(503).json({ error: 'Bridge API offline', bridge_url: BRIDGE_URL, detail: err.message });
    }
  }
});
```

**Zmienna środowiskowa:** `BRIDGE_URL` z `.env` (domyślnie `http://localhost:8199`)

---

## ⚠️ Edge Cases

### EC-1: Bridge zwraca non-JSON response
Scenariusz: Bridge API zwraca HTML error page lub plain text
Oczekiwane zachowanie: `response.json()` rzuca błąd → catch zwraca 503 z `detail: "invalid JSON"`

### EC-2: Bridge URL skonfigurowane inaczej
Scenariusz: `BRIDGE_URL` ustawione na inny host/port przez `.env`
Oczekiwane zachowanie: Proxy używa skonfigurowanego URL, nie hardcoded `localhost:8199`

---

## 🚫 Out of Scope tej Story
- Autentykacja requestów do Bridge (Bridge jest lokalne, bez auth)
- Cachowanie odpowiedzi Bridge
- WebSocket proxy (EPIC-2)
- Transformacja danych z Bridge

---

## ✔️ Definition of Done
- [ ] `GET /api/bridge/status` proxy'uje do Bridge i zwraca dane
- [ ] `POST /api/bridge/*` przesyła body do Bridge
- [ ] Gdy Bridge offline → 503 JSON (nie crash serwera)
- [ ] Gdy Bridge timeout → 504 JSON po 5 sekundach
- [ ] `BRIDGE_URL` konfigurowalne przez zmienną środowiskową
- [ ] Nie crashuje gdy brak `node-fetch` (sprawdź wersję Node — Node 18+ ma natywny `fetch`)
