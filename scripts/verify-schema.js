#!/usr/bin/env node
/**
 * Verify bridge tables schema using Supabase service role
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cavihzxpsltcwlueohsc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifySchema() {
  console.log('🔍 Verifying bridge tables schema...\n');
  
  try {
    // Check if we can query the tables
    const tables = ['bridge_stories', 'bridge_epics', 'bridge_runs'];
    
    for (const table of tables) {
      console.log(`📋 Checking ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Table exists and is accessible`);
        if (data && data.length > 0) {
          const columns = Object.keys(data[0]);
          console.log(`   📊 Columns: ${columns.join(', ')}`);
        } else {
          console.log(`   ℹ️  Table is empty`);
        }
      }
      console.log('');
    }
    
    // Test RLS - try a write operation (should fail without service_role)
    console.log('🔒 Testing RLS (write should work with service_role)...');
    
    const testData = {
      id: 'TEST-' + Date.now(),
      project_id: 'test-project',
      title: 'Test Epic',
      status: 'DRAFT',
      total_stories: 0,
      done_stories: 0
    };
    
    // This should work with service_role
    const { error: writeError } = await supabase
      .from('bridge_epics')
      .upsert(testData, { onConflict: ['id', 'project_id'] });
    
    if (writeError) {
      console.log(`   ⚠️  Write test: ${writeError.message}`);
    } else {
      console.log('   ✅ Write operation succeeded (service_role working)');
      
      // Clean up test data
      await supabase
        .from('bridge_epics')
        .delete()
        .eq('id', testData.id)
        .eq('project_id', testData.project_id);
    }
    
    console.log('\n✅ Verification complete');
    
  } catch (err) {
    console.error('\n❌ Verification failed:', err.message);
    process.exit(1);
  }
}

verifySchema();
