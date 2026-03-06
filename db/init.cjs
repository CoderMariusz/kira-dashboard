const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.KB_DB_PATH || path.join(__dirname, '..', 'kiraboard.db');

/**
 * Initialize SQLite database with KiraBoard schema
 * Creates database file if it doesn't exist, sets up WAL mode and foreign keys
 * All CREATE statements are idempotent (IF NOT EXISTS)
 */
function initDatabase() {
  // Ensure directory exists
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let db;
  try {
    db = new Database(DB_PATH);
  } catch (err) {
    console.error(`❌ Cannot create database at ${DB_PATH}: ${err.message}`);
    throw err;
  }

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables (idempotent - IF NOT EXISTS)
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS kb_users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL UNIQUE,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','home_plus','home')),
      avatar TEXT DEFAULT '👤',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Shopping items table
    CREATE TABLE IF NOT EXISTS kb_shopping_items (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Inne',
      quantity INTEGER DEFAULT 1,
      unit TEXT,
      bought INTEGER DEFAULT 0,
      bought_at TEXT,
      added_by TEXT REFERENCES kb_users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Tasks/Kanban table
    CREATE TABLE IF NOT EXISTS kb_tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      title TEXT NOT NULL,
      description TEXT,
      column_id TEXT DEFAULT 'todo' CHECK (column_id IN ('todo','doing','done')),
      assigned_to TEXT REFERENCES kb_users(id),
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      due_date TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Activity log table
    CREATE TABLE IF NOT EXISTS kb_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES kb_users(id),
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT CHECK (entity_type IN ('shopping','task','user','system')),
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Sync log table (for future Supabase sync)
    CREATE TABLE IF NOT EXISTS kb_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      direction TEXT DEFAULT 'up' CHECK (direction IN ('up','down')),
      records_synced INTEGER DEFAULT 0,
      status TEXT CHECK (status IN ('success','error','skipped')),
      error_message TEXT,
      synced_at TEXT DEFAULT (datetime('now'))
    );

    -- Recurring tasks table (for auto-generated tasks via cron)
    CREATE TABLE IF NOT EXISTS kb_recurring_tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      title TEXT NOT NULL,
      description TEXT,
      recurrence TEXT NOT NULL CHECK (recurrence IN ('daily','weekly','biweekly','monthly')),
      day_of_week INTEGER,              -- 0-6 dla weekly (0=poniedziałek)
      day_of_month INTEGER,             -- 1-31 dla monthly
      assigned_to TEXT,                  -- user_id lub 'rotate'
      rotation_index INTEGER DEFAULT 0, -- który user w kolejce (dla rotate)
      rotation_users TEXT,               -- JSON array user_ids np. '["zuza","iza"]'
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
      active INTEGER DEFAULT 1,
      last_created_at TEXT,             -- kiedy ostatnio auto-stworzono task (YYYY-MM-DD)
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Shopping history table (for smart suggestions)
    CREATE TABLE IF NOT EXISTS kb_shopping_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      category TEXT DEFAULT 'Inne',
      buy_count INTEGER DEFAULT 1,
      last_bought_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_name, category)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_shopping_bought ON kb_shopping_items(bought);
    CREATE INDEX IF NOT EXISTS idx_shopping_category ON kb_shopping_items(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_column ON kb_tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON kb_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON kb_activity_log(created_at);
    CREATE INDEX IF NOT EXISTS idx_recurring_active ON kb_recurring_tasks(active);
    CREATE INDEX IF NOT EXISTS idx_shopping_hist_count ON kb_shopping_history(buy_count DESC);
  `);

  return db;
}

/**
 * Get database instance (for use in other modules)
 * Note: initDatabase() must be called first
 */
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    dbInstance = initDatabase();
  }
  return dbInstance;
}

module.exports = { initDatabase, getDatabase, DB_PATH };
