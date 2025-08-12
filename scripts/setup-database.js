#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  const apiKey = process.env.LANONASIS_API_KEY || 'sk_live_superadmin_placeholder';
  
  try {
    console.log('🔧 Creating api_keys table using SQL...');
    
    // Execute the table creation SQL
    const { data: createResult, error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS api_keys (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          key_hash TEXT UNIQUE,
          user_id UUID,
          organization_id UUID,
          name TEXT NOT NULL,
          description TEXT,
          access_level TEXT DEFAULT 'public',
          is_active BOOLEAN DEFAULT true,
          rate_limit INTEGER DEFAULT 100,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
        CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
        CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
        
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "Service role can manage api_keys" ON api_keys
          FOR ALL USING (auth.role() = 'service_role');
      `
    });
    
    if (createError) {
      console.log('⚠️ Table creation via RPC failed, trying direct SQL execution...');
      
      // Try alternative approach using raw SQL
      const { error: altError } = await supabase
        .from('_supabase_admin')
        .select('*')
        .limit(1);
        
      if (altError) {
        console.log('📝 Manual setup required. Please execute this SQL in Supabase SQL Editor:');
        console.log(`
-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  key_hash TEXT UNIQUE,
  user_id UUID,
  organization_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  access_level TEXT DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "Service role can manage api_keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- Insert superadmin key
INSERT INTO api_keys (
  key, key_hash, user_id, organization_id, name, description, 
  access_level, is_active, rate_limit, expires_at
) VALUES (
  '${apiKey}',
  '${apiKey}',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Superadmin Master Key',
  'Master API key for MCP SSE authentication',
  'admin',
  true,
  10000,
  NOW() + INTERVAL '1 year'
) ON CONFLICT (key) DO NOTHING;
        `);
        return;
      }
    } else {
      console.log('✅ Table created successfully');
    }
    
    console.log('🔑 Inserting superadmin API key...');
    
    // Insert the superadmin API key
    const { data: insertedKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        key: apiKey,
        key_hash: apiKey,
        user_id: '00000000-0000-0000-0000-000000000001',
        organization_id: '00000000-0000-0000-0000-000000000001',
        name: 'Superadmin Master Key',
        description: 'Master API key for MCP SSE authentication and admin operations',
        access_level: 'admin',
        is_active: true,
        rate_limit: 10000,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error inserting API key:', insertError);
      
      // Check if key already exists
      const { data: existingKey } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key', apiKey)
        .single();
        
      if (existingKey) {
        console.log('✅ Superadmin API key already exists in database');
        console.log('📋 Key details:', {
          id: existingKey.id,
          name: existingKey.name,
          access_level: existingKey.access_level,
          is_active: existingKey.is_active
        });
      }
    } else {
      console.log('✅ Successfully inserted superadmin API key!');
      console.log('📋 Inserted key details:', {
        id: insertedKey.id,
        name: insertedKey.name,
        access_level: insertedKey.access_level,
        is_active: insertedKey.is_active
      });
    }
    
    // Test the SSE endpoint
    console.log('🧪 Testing SSE endpoint with API key...');
    const testResponse = await fetch('https://api.lanonasis.com/sse', {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'text/event-stream'
      }
    });
    
    console.log('📡 SSE Test Response:', {
      status: testResponse.status,
      statusText: testResponse.statusText
    });
    
    if (testResponse.status === 200) {
      console.log('🎉 SUCCESS! SSE authentication working. MCP integration is complete!');
    } else {
      const errorText = await testResponse.text();
      console.log('⚠️ SSE response body:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

setupDatabase();
