require('dotenv').config();
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');

const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '*/60 * * * * *'; // co 60s
const db = new Database(process.env.KB_DB_PATH || './kiraboard.db');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncTable(tableName, localTable, remoteTable) {
  const lastSync = db.prepare(
    'SELECT synced_at FROM kb_sync_log WHERE table_name = ? ORDER BY synced_at DESC LIMIT 1'
  ).get(tableName);
  
  const since = lastSync?.synced_at || '1970-01-01T00:00:00Z';
  const rows = db.prepare(
    `SELECT * FROM ${localTable} WHERE updated_at > ? OR created_at > ?`
  ).all(since, since);
  
  if (rows.length === 0) {
    db.prepare(
      'INSERT INTO kb_sync_log (table_name, direction, records_synced, status) VALUES (?, ?, ?, ?)'
    ).run(tableName, 'up', 0, 'skipped');
    return { synced: 0, status: 'skipped' };
  }
  
  const { error } = await supabase.from(remoteTable).upsert(rows, { onConflict: 'id' });
  const status = error ? 'error' : 'success';
  db.prepare(
    'INSERT INTO kb_sync_log (table_name, direction, records_synced, status, error_message) VALUES (?, ?, ?, ?, ?)'
  ).run(tableName, 'up', rows.length, status, error?.message || null);
  
  return { synced: rows.length, status, error: error?.message };
}

async function runSync() {
  console.log(`🔄 [${new Date().toISOString()}] Sync starting...`);
  try {
    const results = {
      shopping: await syncTable('shopping', 'kb_shopping_items', 'shopping_items'),
      tasks: await syncTable('tasks', 'kb_tasks', 'tasks'),
      activity: await syncTable('activity', 'kb_activity_log', 'activity_log'),
    };
    const total = Object.values(results).reduce((s, r) => s + r.synced, 0);
    console.log(`✅ Sync complete: ${total} records`, results);
  } catch (err) {
    console.error('❌ Sync error:', err.message);
  }
}

if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
  cron.schedule(SYNC_INTERVAL, async () => {
    processRecurringTasks();  // Auto-generate recurring tasks first
    await runSync();
  });
  console.log(`📡 Supabase sync cron active (every 60s)`);
  processRecurringTasks(); // initial run on start
  runSync(); // initial sync on start
} else {
  console.log('⚠️ Supabase not configured — sync disabled (set SUPABASE_URL + SUPABASE_SERVICE_KEY in .env)');
  // Recurring tasks still need to run even without Supabase
  setInterval(processRecurringTasks, 60000);
  console.log(`🔄 Recurring tasks cron active (every 60s, standalone mode)`);
  processRecurringTasks(); // initial run on start
}

/**
 * Process recurring tasks - auto-generate tasks from recurring schedule
 * Runs independently of Supabase sync (works even without Supabase config)
 */
function processRecurringTasks() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const dayOfWeek = (now.getDay() + 6) % 7;    // 0=Pon, 1=Wt, ..., 6=Niedz
  const dayOfMonth = now.getDate();

  try {
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
        try {
          const users = JSON.parse(task.rotation_users);
          if (users.length > 0) {
            assignedTo = users[task.rotation_index % users.length];
            db.prepare('UPDATE kb_recurring_tasks SET rotation_index = rotation_index + 1 WHERE id = ?').run(task.id);
          }
        } catch (e) {
          console.warn(`⚠️ Invalid rotation_users JSON for recurring task ${task.id}:`, e.message);
          assignedTo = null;
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

    if (tasks.length > 0) {
      console.log(`✅ Processed ${tasks.length} recurring tasks`);
    }
  } catch (err) {
    console.error('❌ Error processing recurring tasks:', err.message);
  }
}

module.exports = { runSync, syncTable, processRecurringTasks };
