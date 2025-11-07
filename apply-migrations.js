#!/usr/bin/env node

/**
 * Script to apply database migrations
 * Run with: node apply-migrations.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = "https://dfqmkjywdzbpysjwllgx.supabase.co";
// NOTE: You need to provide your service role key here (NOT the anon key)
// Get it from: https://supabase.com/dashboard/project/dfqmkjywdzbpysjwllgx/settings/api
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
  console.error('Get your service key from: https://supabase.com/dashboard/project/dfqmkjywdzbpysjwllgx/settings/api');
  console.error('\nUsage: SUPABASE_SERVICE_KEY="your-key-here" node apply-migrations.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  try {
    console.log('📋 Reading migration SQL...');
    const sqlFile = join(__dirname, 'apply_migrations.sql');
    const sql = readFileSync(sqlFile, 'utf-8');
    
    console.log('🚀 Applying migrations to database...');
    
    // Split SQL by statement separator and execute one by one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_string: statement });
        
        if (error) {
          // Try direct execution as fallback
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ sql_string: statement })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }
        }
        
        successCount++;
        process.stdout.write(`\r✅ Progress: ${successCount}/${statements.length} statements executed`);
      } catch (err) {
        errorCount++;
        console.error(`\n⚠️  Error executing statement ${i + 1}:`, err.message);
        if (statement.length < 200) {
          console.error('Statement:', statement);
        }
      }
    }
    
    console.log('\n\n✨ Migration complete!');
    console.log(`   Success: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} statements`);
      console.log('\n⚠️  Some statements failed. You may need to run the SQL manually in the Supabase dashboard.');
    }
    
  } catch (error) {
    console.error('❌ Failed to apply migrations:', error);
    process.exit(1);
  }
}

applyMigrations();
