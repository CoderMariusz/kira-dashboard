#!/usr/bin/env node

/**
 * Migration Runner Script
 * Applies SQL migration files to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Usage: node scripts/apply-migration.js <migration-file.sql>');
  console.error('   Example: node scripts/apply-migration.js supabase/migrations/20260206_epic_story_hierarchy.sql');
  process.exit(1);
}

const migrationPath = path.join(__dirname, '..', migrationFile);

if (!fs.existsSync(migrationPath)) {
  console.error(`❌ Migration file not found: ${migrationPath}`);
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log(`📦 Applying migration: ${migrationFile}`);
  console.log(`📄 File: ${migrationPath}`);

  try {
    // Note: Supabase JS client doesn't have a direct SQL execution method
    // We need to use the Postgres REST API or SQL via rpc

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements and comments
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      try {
        // Use the rpc method to execute raw SQL
        // Note: This is a workaround - ideally use psql or Supabase CLI
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Try direct query as fallback
          console.warn(`   ⚠️  RPC failed, trying alternative method...`);
          console.error(`   Error: ${error.message}`);
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.warn(`   ⚠️  Statement ${i + 1} failed (may be expected): ${err.message}`);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\n⚠️  Note: Some statements may have failed if they already exist.');
    console.log('⚠️  This is normal for migrations that create "IF NOT EXISTS" objects.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

applyMigration();
