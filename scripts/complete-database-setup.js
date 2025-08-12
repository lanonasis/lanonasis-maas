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

async function completeDatabaseSetup() {
  const superadminApiKey = process.env.LANONASIS_API_KEY || 'sk_live_superadmin_placeholder';
  const superadminUserId = '00000000-0000-0000-0000-000000000001';
  const superadminOrgId = '00000000-0000-0000-0000-000000000001';
  
  try {
    console.log('🔧 Setting up complete database schema for MCP integration...');
    
    // Step 1: Create or verify organizations table
    console.log('📋 Setting up organizations table...');
    const { error: orgTableError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    
    if (orgTableError && orgTableError.code === '42P01') {
      console.log('🔧 Creating organizations table...');
      // Table doesn't exist, we'll handle this in the comprehensive SQL
    }
    
    // Step 2: Create or verify users table  
    console.log('👤 Setting up users table...');
    const { error: userTableError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (userTableError && userTableError.code === '42P01') {
      console.log('🔧 Creating users table...');
      // Table doesn't exist, we'll handle this in the comprehensive SQL
    }
    
    // Step 3: Check if we can insert directly or need to use SQL
    console.log('🔑 Attempting to insert superadmin API key...');
    
    // Try to insert the API key first to see what constraints exist
    const { data: insertResult, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        key: apiKey,
        key_hash: null, // Will be handled by Edge Function
        user_id: null, // Remove foreign key constraint temporarily
        organization_id: null, // Remove foreign key constraint temporarily
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
      if (insertError.code === '23503') {
        console.log('⚠️ Foreign key constraint detected. Creating required tables and records...');
        
        // Create the complete schema with all required tables
        console.log('📝 Please execute this SQL in your Supabase SQL Editor:');
        console.log(`
-- Complete LanOnasis MCP Database Schema Setup
-- Execute this in Supabase SQL Editor

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  plan TEXT DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create users table (simplified for MCP)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  organization_id UUID REFERENCES organizations(id),
  role TEXT DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create or update api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  key_hash TEXT,
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  access_level TEXT DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- 5. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 6. Create policies
CREATE POLICY IF NOT EXISTS "Service role can manage organizations" ON organizations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can manage users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role can manage api_keys" ON api_keys
  FOR ALL USING (auth.role() = 'service_role');

-- 7. Insert superadmin organization
INSERT INTO organizations (
  id, name, slug, description, plan, is_active
) VALUES (
  '${superadminOrgId}',
  'LanOnasis Superadmin',
  'lanonasis-superadmin',
  'Superadmin organization for MCP integration',
  'enterprise',
  true
) ON CONFLICT (id) DO NOTHING;

-- 8. Insert superadmin user
INSERT INTO users (
  id, email, name, organization_id, role, is_active
) VALUES (
  '${superadminUserId}',
  'superadmin@lanonasis.com',
  'LanOnasis Superadmin',
  '${superadminOrgId}',
  'superadmin',
  true
) ON CONFLICT (id) DO NOTHING;

-- 9. Insert superadmin API key
INSERT INTO api_keys (
  key, key_hash, user_id, organization_id, name, description, 
  access_level, is_active, rate_limit, expires_at
) VALUES (
  '${apiKey}',
  '${apiKey}',
  '${superadminUserId}',
  '${superadminOrgId}',
  'Superadmin Master Key',
  'Master API key for MCP SSE authentication and admin operations',
  'admin',
  true,
  10000,
  NOW() + INTERVAL '1 year'
) ON CONFLICT (key) DO NOTHING;

-- 10. Verify the setup
SELECT 
  'Organizations' as table_name,
  COUNT(*) as record_count
FROM organizations
WHERE id = '${superadminOrgId}'

UNION ALL

SELECT 
  'Users' as table_name,
  COUNT(*) as record_count
FROM users
WHERE id = '${superadminUserId}'

UNION ALL

SELECT 
  'API Keys' as table_name,
  COUNT(*) as record_count
FROM api_keys
WHERE key = '${apiKey}';
        `);
        
        return;
        
      } else if (insertError.code === '23505') {
        console.log('✅ Superadmin API key already exists in database');
        
        // Get existing key details
        const { data: existingKey } = await supabase
          .from('api_keys')
          .select('*')
          .eq('key', apiKey)
          .single();
        
        if (existingKey) {
          console.log('📋 Existing key details:', {
            id: existingKey.id,
            name: existingKey.name,
            access_level: existingKey.access_level,
            is_active: existingKey.is_active,
            created_at: existingKey.created_at
          });
        }
      } else {
        console.error('❌ Unexpected error inserting API key:', insertError);
        return;
      }
    } else {
      console.log('✅ Successfully inserted superadmin API key!');
      console.log('📋 Inserted key details:', {
        id: insertResult.id,
        name: insertResult.name,
        access_level: insertResult.access_level,
        is_active: insertResult.is_active,
        created_at: insertResult.created_at
      });
    }
    
    // Test the Edge Function
    await testEdgeFunction(apiKey);
    
    // Test the SSE endpoint
    await testSSEEndpoint(apiKey);
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function testEdgeFunction(apiKey) {
  console.log('🧪 Testing Edge Function API key validation...');
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/hash-api-key`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: superadminApiKey
      })
    });
    
    const result = await response.json();
    
    console.log('📡 Edge Function Response:', {
      status: response.status,
      body: result
    });
    
    if (response.status === 200) {
      console.log('✅ Edge Function validation successful!');
    }
    
  } catch (error) {
    console.error('❌ Error testing Edge Function:', error);
  }
}

async function testSSEEndpoint(apiKey) {
  console.log('🧪 Testing SSE endpoint with API key...');
  
  try {
    const response = await fetch('https://api.lanonasis.com/sse', {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'text/event-stream'
      }
    });
    
    console.log('📡 SSE Test Response:', {
      status: response.status,
      statusText: response.statusText
    });
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS! SSE authentication working. MCP integration is complete!');
    } else {
      const errorText = await response.text();
      console.log('⚠️ SSE response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing SSE endpoint:', error);
  }
}

completeDatabaseSetup();
