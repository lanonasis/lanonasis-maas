#!/usr/bin/env node

// Fix Supabase OAuth configuration via Management API
import fetch from 'node-fetch';

const PROJECT_REF = 'mxtsdgkwzjzlttpotole';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN; // Personal access token from Supabase Dashboard

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN environment variable');
  console.log('Get your personal access token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

async function updateAuthConfig() {
  console.log('🔧 Updating Supabase auth configuration...');
  
  // Get current auth config
  console.log('📋 Fetching current auth configuration...');
  const getCurrentConfig = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!getCurrentConfig.ok) {
    console.error('❌ Failed to fetch current config:', await getCurrentConfig.text());
    return;
  }

  const currentConfig = await getCurrentConfig.json();
  console.log('📄 Current site URL:', currentConfig.SITE_URL);
  console.log('📄 Current additional redirect URLs:', currentConfig.URI_ALLOW_LIST);

  // Update auth configuration
  const newConfig = {
    ...currentConfig,
    SITE_URL: 'https://LanOnasis.com',
    URI_ALLOW_LIST: 'https://LanOnasis.com/**,https://dashboard.LanOnasis.com/**,https://api.LanOnasis.com/**'
  };

  console.log('\n🔄 Updating configuration...');
  const updateResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newConfig)
  });

  if (!updateResponse.ok) {
    console.error('❌ Failed to update config:', await updateResponse.text());
    return;
  }

  console.log('✅ Auth configuration updated successfully!');
  console.log('📄 New site URL:', newConfig.SITE_URL);
  console.log('📄 New redirect URLs:', newConfig.URI_ALLOW_LIST);
  
  console.log('\n📋 OAuth Provider Settings Summary:');
  console.log('================================');
  console.log('✅ Google OAuth:');
  console.log('   - Authorized JavaScript origins: https://api.LanOnasis.com, https://dashboard.LanOnasis.com');
  console.log('   - Authorized redirect URIs: https://dashboard.LanOnasis.com/auth/callback');
  console.log('✅ Supabase Auth:');
  console.log('   - Site URL: https://LanOnasis.com');
  console.log('   - Additional redirect URLs: https://LanOnasis.com/**, https://dashboard.LanOnasis.com/**, https://api.LanOnasis.com/**');
  
  console.log('\n🧪 Next Steps:');
  console.log('1. Test Google OAuth from https://dashboard.LanOnasis.com/auth/login');
  console.log('2. Test GitHub OAuth from https://dashboard.LanOnasis.com/auth/login');
  console.log('3. Verify redirect goes to https://dashboard.LanOnasis.com/dashboard');
}

updateAuthConfig().catch(console.error);