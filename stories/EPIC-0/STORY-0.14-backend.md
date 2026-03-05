---
story_id: STORY-0.14
title: "Recurring tasks cron — auto-generowanie tasków z harmonogramu"
epic: EPIC-0
module: infrastructure
domain: backend
status: ready
difficulty: moderate
recommended_model: kimi-k2.5
priority: must
estimated_effort: 4h
depends_on: [STORY-0.6, STORY-0.13]
blocks: none
tags: [cron, recurring, tasks, automation, backend]
---

## 🎯 User Story

**Jako** Angelika (home_plus)
**Chcę** żeby powtarzające się zadania domowe (pranie, sprzątanie, zakupy) tworzyły się automatycznie
**Żeby** nie musieć pamiętać o dodawaniu ich każdego tygodnia i żeby były fair rozdzielane między Zuzę i Izę

---

## 📐 Kontekst implementacyjny

### Gdzie w systemie
- Modyfikacja: `sync_to_supabase.js` — dodanie funkcji `processRecurringTasks()` do głównego cron jobu
- Dane: tabela `kb_recurring_tasks` (STORY-0.13) → tworzy rekordy w `kb_tasks` (STORY-0.3)
- Inspiracja: Grocy chores (recurring + rotation)

### Stan systemu przed tą story
- STORY-0.6 ukończona — `sync_to_supabase.js` z node-cron działa, eksportuje `runSync`
- STORY-0.13 ukończona — tabele `kb_recurring_tasks` i `kb_tasks` istnieją

---

## ✅ Acceptance Criteria

### AC-1: Daily task auto-tworzy się codziennie
GIVEN: Tabela `kb_recurring_tasks` ma rekord `(title='Test', recurrence='daily', active=1, last_created_at=NULL)`
WHEN: Cron wykona pętlę (lub wywołasz `processRecurringTasks()` ręcznie)
THEN: Nowy task pojawia się w `kb_tasks` z `title='Test'`, `column_id='todo'`, `due_date=dzisiaj`

### AC-2: Nie tworzy duplikatu w tym samym dniu
GIVEN: Task "Test" już stworzony dziś (last_created_at = today)
WHEN: Cron wykona pętlę ponownie
THEN: Drugi task NIE jest tworzony (sprawdza `last_created_at < today`)

### AC-3: Weekly task tworzy się w odpowiedni dzień
GIVEN: Rekord `(title='Pranie', recurrence='weekly', day_of_week=0)` — poniedziałek
WHEN: Cron wywołany w poniedziałek
THEN: Task "Pranie" pojawia się w `kb_tasks`
AND: Wywołany we wtorek — NIE tworzy zadania

### AC-4: Rotation logic dla assigned_to
GIVEN: Rekord `(title='Pranie', assigned_to='rotate', rotation_users='["zuza","iza"]', rotation_index=0)`
WHEN: Cron tworzy task po raz pierwszy
THEN: Task ma `assigned_to='zuza'`, `rotation_index` zaktualizowany do 1
AND: Następnym razem task ma `assigned_to='iza'`, `rotation_index` → 2

### AC-5: Activity log zapisywany
GIVEN: Cron auto-stworzył task
WHEN: Sprawdzisz `kb_activity_log`
THEN: Nowy rekord z `user_name='System'`, `action='auto_created'`, `entity_type='task'`

---

## ⚙️ Szczegóły Backend

### Funkcja `processRecurringTasks()` — dodaj do `sync_to_supabase.js`

```javascript
function processRecurringTasks() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const dayOfWeek = (now.getDay() + 6) % 7;    // 0=Pon, 1=Wt, ..., 6=Niedz
  const dayOfMonth = now.getDate();
  
  const tasks = db.prepare(`
    SELECT * FROM kb_recurring_tasks 
    WHERE active = 1 
    AND (last_created_at IS NULL OR last_created_at < ?)
  `).all(today);
  
  for (const task of tasks) {
    let shouldCreate = false;
    
    switch (task.recurrence) {
      case 'daily':
        shouldCreate = true;
        break;
      case 'weekly':
        shouldCreate = dayOfWeek === (task.day_of_week ?? 0);
        break;
      case 'biweekly': {
        const weekNum = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / 604800000);
        shouldCreate = weekNum % 2 === 0 && dayOfWeek === (task.day_of_week ?? 0);
        break;
      }
      case 'monthly':
        shouldCreate = dayOfMonth === (task.day_of_month ?? 1);
        break;
    }
    
    if (!shouldCreate) continue;
    
    // Resolve assigned_to (rotation logic)
    let assignedTo = task.assigned_to;
    if (assignedTo === 'rotate' && task.rotation_users) {
      const users = JSON.parse(task.rotation_users);
      if (users.length > 0) {
        assignedTo = users[task.rotation_index % users.length];
        db.prepare('UPDATE kb_recurring_tasks SET rotation_index = rotation_index + 1 WHERE id = ?').run(task.id);
      }
    }
    
    // Create task in kb_tasks
    const taskId = require('crypto').randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO kb_tasks (id, title, description, column_id, assigned_to, priority, due_date)
      VALUES (?, ?, ?, 'todo', ?, ?, ?)
    `).run(taskId, task.title, task.description || null, assignedTo || null, task.priority || 'medium', today);
    
    // Activity log
    db.prepare(`
      INSERT INTO kb_activity_log (user_name, action, entity_type, entity_id, details)
      VALUES ('System', 'auto_created', 'task', ?, ?)
    `).run(taskId, JSON.stringify({ recurring_id: task.id, recurrence: task.recurrence, assigned_to: assignedTo }));
    
    // Update last_created_at
    db.prepare('UPDATE kb_recurring_tasks SET last_created_at = ? WHERE id = ?').run(today, task.id);
    
    console.log(`🔄 Auto-created task: "${task.title}" → ${assignedTo || 'unassigned'}`);
  }
}

// Dodaj do głównego cron schedule w sync_to_supabase.js:
// cron.schedule(SYNC_INTERVAL, async () => {
//   processRecurringTasks();   // ← DODANE
//   await runSync();
// });
```

---

## ⚠️ Edge Cases

### EC-1: rotation_users NULL lub pusta tablica
Scenariusz: `assigned_to='rotate'` ale `rotation_users=NULL` lub `'[]'`
Oczekiwane zachowanie: `assignedTo = null` → task tworzony bez przypisania (`assigned_to = NULL`)

### EC-2: Cron nie uruchomiony (sync disabled bez Supabase)
Scenariusz: Supabase nie skonfigurowane → sync cron nie startuje → recurring tasks też nie działają
Oczekiwane zachowanie: Recurring tasks cron MUSI działać niezależnie od Supabase config. Rozwiąż: `processRecurringTasks()` w osobnym `setInterval(processRecurringTasks, 60000)` jeśli Supabase nie skonfigurowane

### EC-3: Server wyłączony przez kilka dni (zaległe taski)
Scenariusz: `last_created_at = 3 dni temu`, daily task — missed 2 dni
Oczekiwane zachowanie: Tworzony tylko jeden task (dziś) — nie backfill dla missed days (brak backfill logic w EPIC-0)

---

## 🚫 Out of Scope tej Story
- Backfill dla missed days
- API endpoint do zarządzania recurring tasks
- UI recurring tasks (EPIC-4)
- Notyfikacje o auto-stworzonych taskach
- Sync recurring tasks do Supabase (EPIC-12)

---

## ✔️ Definition of Done
- [ ] `processRecurringTasks()` dodany do `sync_to_supabase.js`
- [ ] Wywołany w każdym cyklu cron (co 60s)
- [ ] `daily` recurrence → tworzy task każdego dnia (jeden per dzień)
- [ ] `weekly` recurrence → tworzy task tylko w odpowiedni dzień tygodnia
- [ ] Rotation logic: `rotate` assign → zmienia assigned_to między userami
- [ ] Aktualizuje `last_created_at` po stworzeniu
- [ ] Działa nawet gdy Supabase nie skonfigurowane (własny interval lub w sync cronie)
- [ ] Wpis w `kb_activity_log` dla każdego auto-created task
