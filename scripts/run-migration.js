#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ""

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL environment variable is required
  console.log('Make sure you have a .env file with these variables');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log(`URL: ${supabaseUrl.substring(0, 30)}...`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('\n🔄 Applying API keys table updates...');
    
    // Check current table structure first
    console.log('📊 Checking current api_keys table...');
    const { data: existingKeys, error: checkError } = await supabase
      .from('api_keys')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error accessing api_keys table:', checkError);
      return;
    }
    
    console.log('✅ API keys table is accessible');
    
    // Apply the missing columns using RPC (SQL function call)
    console.log('\n📝 Applying missing columns...');
    
    const migrationSQL = `
      -- Add the missing columns if they don't exist
      DO $$ 
      BEGIN
          -- Add service column
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'api_keys' AND column_name = 'service'
          ) THEN
              ALTER TABLE api_keys ADD COLUMN service TEXT DEFAULT 'all';
              RAISE NOTICE 'Added service column to api_keys table';
          ELSE
              RAISE NOTICE 'Column service already exists in api_keys table';
          END IF;

          -- Add rate_limited column
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'api_keys' AND column_name = 'rate_limited'
          ) THEN
              ALTER TABLE api_keys ADD COLUMN rate_limited BOOLEAN DEFAULT true;
              RAISE NOTICE 'Added rate_limited column to api_keys table';
          ELSE
              RAISE NOTICE 'Column rate_limited already exists in api_keys table';
          END IF;

          -- Add key column for raw key storage (separate from key_hash)
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'api_keys' AND column_name = 'key'
          ) THEN
              ALTER TABLE api_keys ADD COLUMN key TEXT;
              RAISE NOTICE 'Added key column to api_keys table';
          ELSE
              RAISE NOTICE 'Column key already exists in api_keys table';
          END IF;

      END $$;

      -- Create indexes for the new columns to improve query performance
      CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service);
      CREATE INDEX IF NOT EXISTS idx_api_keys_rate_limited ON api_keys(rate_limited);
    `;
    
    // Try to execute the migration SQL
    try {
      const { data: migrationResult, error: migrationError } = await supabase.rpc('exec_sql', { 
        sql_query: migrationSQL 
      });
      
      if (migrationError) {
        // If RPC doesn't work, provide manual instructions
        console.log('⚠️  Direct SQL execution not available. Please run this SQL manually in Supabase SQL Editor:');
        console.log('\n' + migrationSQL);
      } else {
        console.log('✅ Migration SQL executed successfully');
      }
    } catch (rpcError) {
      console.log('⚠️  RPC method not available. Please run this SQL manually in Supabase SQL Editor:');
      console.log('\n' + migrationSQL);
    }
    
    // Test if we can insert with the required fields
    console.log('\n📝 Testing API key insertion with new structure...');
    
    const testKey = {
      name: 'Migration Test Key',
      key: 'vx_test_key_' + Date.now(),
      user_id: '00000000-0000-0000-0000-000000000000', // placeholder
      organization_id: '00000000-0000-0000-0000-000000000000', // placeholder
      is_active: false,
      service: 'all',
      rate_limited: true
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('api_keys')
      .insert(testKey)
      .select();
    
    if (insertError) {
      console.log('⚠️  Insert test failed:', insertError.message);
      console.log('\n📋 Required columns that may still be missing:');
      console.log('- service (TEXT DEFAULT \'all\')');
      console.log('- rate_limited (BOOLEAN DEFAULT true)');  
      console.log('- key (TEXT) for raw key storage');
      console.log('\n🔧 Please add these columns manually via Supabase Dashboard SQL Editor:');
      console.log('\nALTER TABLE api_keys ADD COLUMN IF NOT EXISTS service TEXT DEFAULT \'all\';');
      console.log('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rate_limited BOOLEAN DEFAULT true;');
      console.log('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key TEXT;');
      console.log('CREATE INDEX IF NOT EXISTS idx_api_keys_service ON api_keys(service);');
      console.log('CREATE INDEX IF NOT EXISTS idx_api_keys_rate_limited ON api_keys(rate_limited);');
    } else {
      console.log('✅ Test insertion successful! All required columns exist.');
      console.log('📄 Test key inserted:', insertResult[0]);
      
      // Clean up test key
      await supabase
        .from('api_keys')
        .delete()
        .eq('key', testKey.key);
      
      console.log('🧹 Test key cleaned up');
    }
    
    // Final verification - show current table structure
    console.log('\n📊 Verifying table structure...');
    try {
      const { data: columnInfo, error: columnError } = await supabase.rpc('get_table_columns', {
        table_name: 'api_keys'
      });
      
      if (!columnError && columnInfo) {
        console.log('📋 Current api_keys table columns:');
        columnInfo.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} ${col.column_default ? '(default: ' + col.column_default + ')' : ''}`);
        });
      }
    } catch (e) {
      console.log('ℹ️  Column verification unavailable (this is normal)');
    }
    
    console.log('\n🎉 Migration verification completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();