---
story_id: STORY-0.16
title: "Gate tracking API — CRUD endpoints + Bridge integration hook"
epic: EPIC-0
module: infrastructure
domain: backend
status: ready
difficulty: moderate
recommended_model: sonnet-4.6
priority: must
estimated_effort: 5h
depends_on: [STORY-0.4, STORY-0.15]
blocks: none
tags: [gates, api, pipeline, bridge, backend, quality]
---

## 🎯 User Story

**Jako** Kira (Pipeline Agent)
**Chcę** mieć API do aktualizacji i odpytywania statusu gate'ów per story
**Żeby** pipeline mógł programowo raportować postęp (IMPLEMENT → LINT → TEST → REVIEW → MERGE) i Mariusz widział compliance %

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Modyfikacja: `server.cjs` — 3 nowe route'y:
  - `POST /api/gates/update`
  - `GET /api/gates/story/:projectKey/:storyId`
  - `GET /api/gates/compliance`
- Integracja: `initGatesForStory()` z `db/init.js` — wywoływane gdy Bridge sync dostarczy nową story

### Stan systemu przed tą story
- STORY-0.4 ukończona — `requireRole()` middleware dostępny
- STORY-0.15 ukończona — tabela `kb_story_gates` istnieje, `initGatesForStory()` dostępne, `gate_config.json` istnieje

---

## ✅ Acceptance Criteria

### AC-1: POST /api/gates/update zmienia status
GIVEN: Story STORY-0.1 ma 5 gate'ów w stanie 'pending', zalogowany admin (JWT)
WHEN: `POST /api/gates/update` z body `{ "story_id": "STORY-0.1", "project_key": "kira-board", "gate_name": "implement", "status": "pass" }`
THEN: Response 200 `{ "success": true }` AND `SELECT status FROM kb_story_gates WHERE story_id='STORY-0.1' AND gate_name='implement'` zwraca `'pass'`

### AC-2: POST /api/gates/update ustawia timestamps
GIVEN: Gate w stanie 'pending'
WHEN: Update do `status='active'`
THEN: `started_at` ustawione na current timestamp, `finished_at` NULL
AND: Update do `status='pass'` → `finished_at` ustawione

### AC-3: GET /api/gates/story zwraca posortowane gates
GIVEN: STORY-0.1 ma 5 gate'ów z różnymi statusami
WHEN: `GET /api/gates/story/kira-board/STORY-0.1`
THEN: Response `{ "gates": [...] }` z 5 elementami posortowanymi wg kolejności (implement → lint → test → review → merge)

### AC-4: GET /api/gates/compliance zwraca procent
GIVEN: 10 stories zainicjalizowanych, 5 ma wszystkie gates pass
WHEN: `GET /api/gates/compliance?project=kira-board`
THEN: Response zawiera `{ "total": 10, "all_passed": 5, "compliance_pct": 50 }`

### AC-5: POST /api/gates/update wymaga admin role
GIVEN: Token z role='home_plus'
WHEN: `POST /api/gates/update` z tym tokenem
THEN: Response 403 `{ "error": "Forbidden" }`

---

## ⚙️ Szczegóły Backend

### Endpoint 1: POST /api/gates/update

```javascript
app.post('/api/gates/update', requireRole('admin'), (req, res) => {
  const { story_id, project_key, gate_name, status, details } = req.body;
  
  if (!story_id || !project_key || !gate_name || !status) {
    return res.status(400).json({ error: 'story_id, project_key, gate_name, status required' });
  }
  
  const validStatuses = ['pending','active','pass','fail','skip'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  
  const now = new Date().toISOString();
  const startedAt = status === 'active' ? now : null;
  const finishedAt = ['pass','fail','skip'].includes(status) ? now : null;
  
  const result = db.prepare(`
    UPDATE kb_story_gates 
    SET status = ?,
        started_at = CASE WHEN ? IS NOT NULL THEN ? ELSE started_at END,
        finished_at = CASE WHEN ? IS NOT NULL THEN ? ELSE finished_at END,
        details = COALESCE(?, details)
    WHERE story_id = ? AND project_key = ? AND gate_name = ?
  `).run(
    status,
    startedAt, startedAt,
    finishedAt, finishedAt,
    details ? JSON.stringify(details) : null,
    story_id, project_key, gate_name
  );
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Gate not found. Initialize gates first.' });
  }
  
  res.json({ success: true, story_id, gate_name, status });
});
```

### Endpoint 2: GET /api/gates/story/:projectKey/:storyId

```javascript
const GATE_ORDER = { implement: 1, lint: 2, test: 3, review: 4, merge: 5 };

app.get('/api/gates/story/:projectKey/:storyId', (req, res) => {
  const { projectKey, storyId } = req.params;
  
  const gates = db.prepare(`
    SELECT * FROM kb_story_gates 
    WHERE story_id = ? AND project_key = ?
  `).all(storyId, projectKey);
  
  const sorted = gates.sort((a, b) => (GATE_ORDER[a.gate_name] || 99) - (GATE_ORDER[b.gate_name] || 99));
  
  res.json({ 
    story_id: storyId,
    project_key: projectKey,
    gates: sorted,
    summary: {
      total: gates.length,
      passed: gates.filter(g => g.status === 'pass').length,
      failed: gates.filter(g => g.status === 'fail').length,
      pending: gates.filter(g => g.status === 'pending').length,
    }
  });
});
```

### Endpoint 3: GET /api/gates/compliance

```javascript
app.get('/api/gates/compliance', (req, res) => {
  const projectKey = req.query.project;
  const whereClause = projectKey ? 'WHERE project_key = ?' : '';
  const params = projectKey ? [projectKey] : [];
  
  // Total unique stories
  const totalRow = db.prepare(
    `SELECT COUNT(DISTINCT story_id || '|' || project_key) as cnt FROM kb_story_gates ${whereClause}`
  ).get(...params);
  const total = totalRow?.cnt || 0;
  
  if (total === 0) {
    return res.json({ total: 0, all_passed: 0, skipped: 0, failed: 0, compliance_pct: 100 });
  }
  
  // Stories with any fail
  const failedRow = db.prepare(
    `SELECT COUNT(DISTINCT story_id || '|' || project_key) as cnt FROM kb_story_gates 
     ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'fail'`
  ).get(...params);
  const failed = failedRow?.cnt || 0;
  
  // Stories with any skip
  const skippedRow = db.prepare(
    `SELECT COUNT(DISTINCT story_id || '|' || project_key) as cnt FROM kb_story_gates 
     ${whereClause ? whereClause + ' AND' : 'WHERE'} status = 'skip'`
  ).get(...params);
  const skipped = skippedRow?.cnt || 0;
  
  // Stories with ALL required gates passed (no fails, no pending for required)
  const allPassed = total - failed - Math.max(0, skipped - failed);
  
  res.json({
    total,
    all_passed: Math.max(0, allPassed),
    skipped,
    failed,
    compliance_pct: Math.round(Math.max(0, allPassed) / total * 100),
    project_key: projectKey || 'all'
  });
});
```

### Bridge integration hook — auto-init gates

```javascript
// Dodaj do Bridge sync lub jako endpoint POST /api/gates/init-story
app.post('/api/gates/init-story', requireRole('admin'), (req, res) => {
  const { story_id, project_key } = req.body;
  if (!story_id || !project_key) return res.status(400).json({ error: 'story_id, project_key required' });
  
  const { initGatesForStory } = require('./db/init');
  initGatesForStory(db, story_id, project_key);
  res.json({ success: true, story_id, project_key, gates_initialized: 5 });
});
```

---

## ⚠️ Edge Cases

### EC-1: Update non-existent gate
Scenariusz: `POST /api/gates/update` dla story która nie ma zainicjowanych gates
Oczekiwane zachowanie: `result.changes === 0` → 404 `{ "error": "Gate not found. Initialize gates first." }`

### EC-2: compliance_pct przy 0 stories
Scenariusz: Pusty projekt — brak stories
Oczekiwane zachowanie: `total = 0` → `compliance_pct = 100` (nic nie jest złe) z early return

### EC-3: details jako duży JSON
Scenariusz: details zawiera pełny error log (kilka KB)
Oczekiwane zachowanie: SQLite TEXT nie ma limitu — działa. Rozważ truncate w przyszłości.

---

## 🚫 Out of Scope tej Story
- UI dla gate tracking (EPIC-5)
- Automatyczna zmiana gate przy Bridge event (WebSocket — EPIC-2)
- Gate blocking (teraz tylko `enforcement: "report"`) — pełna blokada w EPIC-5
- Supabase sync gates (EPIC-12)
- Batch gate update (wiele gates naraz)

---

## ✔️ Definition of Done
- [ ] `POST /api/gates/update` aktualizuje status gate'a — 200 lub 404
- [ ] `POST /api/gates/update` bez admin JWT → 403
- [ ] `POST /api/gates/update` z brakującymi polami → 400
- [ ] `started_at` ustawiane gdy `status='active'`, `finished_at` gdy `pass/fail/skip`
- [ ] `GET /api/gates/story/:projectKey/:storyId` zwraca posortowane gates + summary
- [ ] `GET /api/gates/compliance?project=kira-board` zwraca `{ total, all_passed, skipped, failed, compliance_pct }`
- [ ] `POST /api/gates/init-story` inicjalizuje 5 pending gates dla story
- [ ] Edge case: compliance przy total=0 → 100%
