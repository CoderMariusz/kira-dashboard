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
  cron.schedule(SYNC_INTERVAL, runSync);
  console.log(`📡 Supabase sync cron active (every 60s)`);
  runSync(); // initial sync on start
} else {
  console.log('⚠️ Supabase not configured — sync disabled (set SUPABASE_URL + SUPABASE_SERVICE_KEY in .env)');
}

module.exports = { runSync, syncTable };
