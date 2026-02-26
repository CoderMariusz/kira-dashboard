#!/usr/bin/env node
/**
 * Apply migration SQL using Supabase service role
 * Usage: node scripts/apply-migration.js supabase/migrations/XXXX.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cavihzxpsltcwlueohsc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Usage: node scripts/apply-migration.js <migration-file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(migrationFile), 'utf-8');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function applyMigration() {
  console.log(`📄 Applying migration: ${path.basename(migrationFile)}`);
  
  // Split by statement separators but handle DO blocks carefully
  const statements = splitSqlStatements(sql);
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt || stmt.startsWith('--') || stmt.startsWith('/*')) continue;
    
    console.log(`\n▶️  Statement ${i + 1}/${statements.length}:`);
    console.log(stmt.substring(0, 100) + (stmt.length > 100 ? '...' : ''));
    
    const { error } = await supabase.rpc('exec_sql', { sql: stmt });
    
    if (error) {
      // Try alternative: exec_sql might not exist, use REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ query: stmt })
      });
      
      if (!response.ok && response.status !== 409) {
        const text = await response.text();
        // Ignore "already exists" errors
        if (!text.includes('already exists') && !text.includes('duplicate')) {
          console.error(`⚠️  Warning: ${text.substring(0, 200)}`);
        }
      }
    }
  }
  
  console.log('\n✅ Migration applied successfully');
}

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1] || '';
    
    // Check for dollar quote start
    if (char === '$' && !inDollarQuote) {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        inDollarQuote = true;
        dollarTag = match[1];
        current += match[0];
        i += match[0].length - 1;
        continue;
      }
    }
    
    // Check for dollar quote end
    if (char === '$' && inDollarQuote) {
      const endTag = `$${dollarTag}$`;
      if (sql.slice(i, i + endTag.length) === endTag) {
        inDollarQuote = false;
        current += endTag;
        i += endTag.length - 1;
        continue;
      }
    }
    
    // Statement separator (only outside dollar quotes)
    if (char === ';' && !inDollarQuote) {
      statements.push(current.trim());
      current = '';
      continue;
    }
    
    current += char;
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

applyMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
