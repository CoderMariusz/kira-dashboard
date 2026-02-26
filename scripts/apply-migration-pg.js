#!/usr/bin/env node
/**
 * Apply migration SQL using direct PostgreSQL connection
 * Usage: node scripts/apply-migration-pg.js supabase/migrations/XXXX.sql
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase connection details from .env.local
const SUPABASE_HOST = 'db.cavihzxpsltcwlueohsc.supabase.co';
const SUPABASE_PORT = 5432;
const SUPABASE_DB = 'postgres';
const SUPABASE_USER = 'postgres.cavihzxpsltcwlueohsc';
const SUPABASE_PASSWORD = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_PASSWORD) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node scripts/apply-migration-pg.js <migration-file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(migrationFile), 'utf-8');

const client = new Client({
  host: SUPABASE_HOST,
  port: SUPABASE_PORT,
  database: SUPABASE_DB,
  user: SUPABASE_USER,
  password: SUPABASE_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  console.log(`📄 Applying migration: ${path.basename(migrationFile)}`);
  console.log(`🔗 Connecting to ${SUPABASE_HOST}...`);
  
  await client.connect();
  console.log('✅ Connected to database\n');
  
  try {
    // Execute entire SQL as a single transaction
    console.log('▶️  Executing migration SQL...');
    await client.query(sql);
    console.log('✅ Migration SQL executed successfully\n');
    
    // Verify tables exist
    console.log('🔍 Verifying tables...');
    
    const tables = ['bridge_stories', 'bridge_epics', 'bridge_runs'];
    for (const table of tables) {
      const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (res.rows.length > 0) {
        console.log(`\n📋 ${table} columns:`);
        res.rows.forEach(row => {
          console.log(`   - ${row.column_name}: ${row.data_type}`);
        });
      } else {
        console.log(`⚠️  ${table}: No columns found`);
      }
    }
    
    // Verify RLS is enabled
    console.log('\n🔒 Checking RLS status...');
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('bridge_stories', 'bridge_epics', 'bridge_runs')
    `);
    
    rlsRes.rows.forEach(row => {
      console.log(`   - ${row.tablename}: RLS ${row.rowsecurity ? '✅ enabled' : '❌ disabled'}`);
    });
    
    // Check indexes
    console.log('\n📇 Checking indexes...');
    const idxRes = await client.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      AND tablename IN ('bridge_stories', 'bridge_epics', 'bridge_runs')
      AND indexname LIKE 'idx_bridge_%'
    `);
    
    idxRes.rows.forEach(row => {
      console.log(`   - ${row.tablename}: ${row.indexname}`);
    });
    
    console.log('\n✅ Migration verification complete');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.detail) console.error('   Detail:', err.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
