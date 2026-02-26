#!/usr/bin/env ts-node
/**
 * sync-bridge-to-supabase.ts
 * 
 * Syncs stories and epics from Bridge SQLite DB to Supabase.
 * Reads from: /Users/mariuszkrawczyk/codermariusz/kira/data/bridge.db
 * Writes to: bridge_stories, bridge_epics tables in Supabase
 * 
 * Usage:
 *   npm run sync:bridge
 * 
 * Environment variables (from .env.local):
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import Database from 'better-sqlite3'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load env from .env.local
const envPath = resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })

// ─── Config ───────────────────────────────────────────────────────────────

const BRIDGE_DB_PATH = '/Users/mariuszkrawczyk/codermariusz/kira/data/bridge.db'
const PROJECT_ID = 'kira-dashboard'

// ─── Types ─────────────────────────────────────────────────────────────────

interface BridgeStory {
  project_id: string
  id: string
  epic_id: string
  title: string
  file_path: string
  status: string
  size: string
  expected_duration_min: number
  depends_on: string | null
  parallel_with: string | null
  assigned_worker: string | null
  branch: string | null
  definition_of_done: string
  created_at: string
  updated_at: string
  started_at: string | null
  model: string | null
}

interface BridgeEpic {
  project_id: string
  id: string
  title: string
  file_path: string
  status: string
  created_at: string
  org_id: string | null
  workspace_id: string | null
}

interface SupabaseStory {
  id: string
  project_id: string
  epic_id: string
  title: string
  file_path: string | null
  status: string
  size: string
  expected_duration_min: number
  depends_on: string[]
  parallel_with: string[]
  assigned_worker: string | null
  branch: string | null
  definition_of_done: string
  created_at: string
  updated_at: string
  started_at: string | null
  model: string | null
  difficulty: string | null
  recommended_model: string | null
  assigned_model: string | null
  domain: string | null
  priority: string | null
  estimated_effort: string | null
  blocks: string[]
  synced_at: string
}

interface SupabaseEpic {
  id: string
  project_id: string
  title: string
  file_path: string | null
  status: string
  total_stories: number
  done_stories: number
  created_at: string
  updated_at: string
  synced_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function parseJsonArray(val: string | null): string[] {
  if (!val || val === '[]' || val === 'null' || val === 'NULL') {
    return []
  }
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) {
      return parsed.map(String)
    }
  } catch {
    // If not valid JSON, treat as comma-separated string
    return val.split(',').filter(Boolean)
  }
  return []
}

export function normalizeTimestamp(val: string | null): string | null {
  if (!val || val.trim() === '') {
    return null
  }
  return val.trim()
}

export function normalizeText(val: string | null): string | null {
  if (val === null || val === '') {
    return null
  }
  return val
}

// ─── Sync Functions ───────────────────────────────────────────────────────

export async function syncStories(supabase: SupabaseClient): Promise<number> {
  console.log('[sync:bridge] Connecting to Bridge DB...')
  const db = new Database(BRIDGE_DB_PATH, { readonly: true })
  
  try {
    // Read stories from SQLite (only columns that exist in Supabase)
    const stmt = db.prepare(`
      SELECT 
        project_id, id, epic_id, title, file_path, status, size, expected_duration_min,
        depends_on, parallel_with, assigned_worker, branch,
        definition_of_done, created_at, updated_at, started_at,
        model
      FROM stories 
      WHERE project_id = ?
    `)
    
    const rows = stmt.all(PROJECT_ID) as BridgeStory[]
    
    if (rows.length === 0) {
      console.log(`[sync:bridge] No stories found for project ${PROJECT_ID}`)
      return 0
    }
    
    console.log(`[sync:bridge] Found ${rows.length} stories in SQLite`)
    
    const now = new Date().toISOString()
    
    // Map to Supabase format (only columns that exist in Supabase)
    const records: SupabaseStory[] = rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      epic_id: row.epic_id,
      title: row.title,
      file_path: row.file_path || null,
      status: row.status || 'BACKLOG',
      size: row.size || 'short',
      expected_duration_min: row.expected_duration_min || 30,
      depends_on: parseJsonArray(row.depends_on),
      parallel_with: parseJsonArray(row.parallel_with),
      assigned_worker: normalizeText(row.assigned_worker),
      branch: normalizeText(row.branch),
      definition_of_done: row.definition_of_done || '',
      created_at: normalizeTimestamp(row.created_at) || now,
      updated_at: normalizeTimestamp(row.updated_at) || now,
      started_at: normalizeTimestamp(row.started_at),
      model: normalizeText(row.model),
      // Extended fields from spec (can be null)
      difficulty: null,
      recommended_model: null,
      assigned_model: null,
      domain: null,
      priority: null,
      estimated_effort: null,
      blocks: [],
      synced_at: now,
    }))
    
    // Upsert to Supabase in batches of 100
    const batchSize = 100
    let totalUpserted = 0
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase
        .from('bridge_stories')
        .upsert(batch as any, { 
          onConflict: 'id,project_id',
          ignoreDuplicates: false 
        })
      
      if (error) {
        throw new Error(`Supabase upsert error (stories batch ${i / batchSize + 1}): ${error.message}`)
      }
      
      totalUpserted += batch.length
    }
    
    console.log(`[sync:bridge] ✅ Synced ${totalUpserted} stories to Supabase`)
    return totalUpserted
    
  } finally {
    db.close()
  }
}

export async function syncEpics(supabase: SupabaseClient): Promise<number> {
  const db = new Database(BRIDGE_DB_PATH, { readonly: true })
  
  try {
    // Read epics with computed story counts
    const stmt = db.prepare(`
      SELECT 
        e.project_id, e.id, e.title, e.file_path, e.status, e.created_at,
        e.org_id, e.workspace_id,
        COUNT(s.id) as total_stories,
        SUM(CASE WHEN s.status = 'DONE' THEN 1 ELSE 0 END) as done_stories
      FROM epics e
      LEFT JOIN stories s ON s.epic_id = e.id AND s.project_id = e.project_id
      WHERE e.project_id = ?
      GROUP BY e.project_id, e.id, e.title, e.file_path, e.status, e.created_at, e.org_id, e.workspace_id
    `)
    
    const rows = stmt.all(PROJECT_ID) as (BridgeEpic & { total_stories: number; done_stories: number })[]
    
    if (rows.length === 0) {
      console.log(`[sync:bridge] No epics found for project ${PROJECT_ID}`)
      return 0
    }
    
    console.log(`[sync:bridge] Found ${rows.length} epics in SQLite`)
    
    const now = new Date().toISOString()
    
    // Map to Supabase format
    const records: SupabaseEpic[] = rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      file_path: row.file_path || null,
      status: row.status || 'DRAFT',
      total_stories: row.total_stories || 0,
      done_stories: row.done_stories || 0,
      created_at: normalizeTimestamp(row.created_at) || now,
      updated_at: now,
      synced_at: now,
    }))
    
    // Upsert to Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase
      .from('bridge_epics')
      .upsert(records as any, { 
        onConflict: 'id,project_id',
        ignoreDuplicates: false 
      })
    
    if (error) {
      throw new Error(`Supabase upsert error (epics): ${error.message}`)
    }
    
    console.log(`[sync:bridge] ✅ Synced ${records.length} epics to Supabase`)
    return records.length
    
  } finally {
    db.close()
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔄 [sync:bridge] Starting Bridge → Supabase sync...')
  console.log(`   Project: ${PROJECT_ID}`)
  console.log(`   DB: ${BRIDGE_DB_PATH}`)
  
  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  
  if (!supabaseUrl) {
    console.error('❌ [sync:bridge] NEXT_PUBLIC_SUPABASE_URL not set in .env.local')
    process.exit(1)
  }
  
  if (!serviceKey) {
    console.error('❌ [sync:bridge] SUPABASE_SERVICE_KEY not set in .env.local')
    process.exit(1)
  }
  
  // Check if Bridge DB exists
  try {
    const { existsSync } = await import('fs')
    if (!existsSync(BRIDGE_DB_PATH)) {
      console.error(`❌ [sync:bridge] Bridge DB not found: ${BRIDGE_DB_PATH}`)
      process.exit(1)
    }
  } catch (err) {
    // Continue anyway, better-sqlite3 will throw if file doesn't exist
  }
  
  // Create Supabase client with service key (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  
  const startTime = Date.now()
  
  try {
    // Sync stories
    const storiesCount = await syncStories(supabase)
    
    // Sync epics
    const epicsCount = await syncEpics(supabase)
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log(`\n🎉 [sync:bridge] Sync complete in ${duration}s`)
    console.log(`   Stories: ${storiesCount}`)
    console.log(`   Epics: ${epicsCount}`)
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n❌ [sync:bridge] Sync failed:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run when executed directly via ts-node / node
const runningDirectly = process.argv[1]?.includes('sync-bridge-to-supabase')
if (runningDirectly) {
  main()
}
