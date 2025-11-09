#!/usr/bin/env node

// Hardened Supabase Auth configuration updater
// - Sets a canonical SITE_URL (dashboard) to avoid cross-origin session drops
// - Populates an explicit Additional Redirect URL allowlist (no wildcards)
// - Prints a readable diff before/after
// - Supports DRY_RUN mode
// - Echoes provider console settings for Google/GitHub

import fetch from 'node-fetch';

// -----------------
// Environment
// -----------------
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'mxtsdgkwzjzlttpotole';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN; // Personal access token from Supabase Dashboard

// Canonical web app origin (your dashboard UI)
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://dashboard.lanonasis.com';

// Local development app origins (comma-separated)
const LOCAL_APP_URLS = process.env.LOCAL_APP_URLS || 'http://localhost:3000,http://127.0.0.1:3000';

// CLI callback URLs for local device flow (comma-separated, exact URLs)
const CLI_CALLBACKS = process.env.CLI_CALLBACKS || 'http://localhost:4321/callback,http://127.0.0.1:4321/callback';

// Optional: Staging/preview app origins (comma-separated)
const STAGING_URLS = process.env.STAGING_URLS || '';

// Optional: Extra redirect URLs (comma-separated) if you have others
const EXTRA_REDIRECT_URLS = process.env.EXTRA_REDIRECT_URLS || '';

// Optional: If you use a custom Supabase Auth domain
// Example: AUTH_CUSTOM_DOMAIN=https://auth.lanonasis.com
const AUTH_CUSTOM_DOMAIN = process.env.AUTH_CUSTOM_DOMAIN || '';

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN environment variable');
  console.log('Get your personal access token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean).map(s => s.trim())));
}

function buildAllowList() {
  const pieces = [
    DASHBOARD_URL,
    `${DASHBOARD_URL}/auth/callback`,
    ...LOCAL_APP_URLS.split(','),
    ...CLI_CALLBACKS.split(','),
    ...STAGING_URLS.split(','),
    ...EXTRA_REDIRECT_URLS.split(',')
  ];
  return uniq(pieces);
}

function toList(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  // Supabase Management API returns comma-separated string for URI_ALLOW_LIST
  if (typeof val === 'string') return uniq(val.split(','));
  return [];
}

function printDiff(current, next) {
  const cSite = current.SITE_URL || '';
  const nSite = next.SITE_URL || '';
  const cList = toList(current.URI_ALLOW_LIST);
  const nList = toList(next.URI_ALLOW_LIST);

  console.log('\n📋 Diff (planned changes)');
  console.log('==========================');
  if (cSite !== nSite) {
    console.log(`SITE_URL:\n  - ${cSite}\n  + ${nSite}`);
  } else {
    console.log(`SITE_URL: (no change) ${cSite}`);
  }

  const removed = cList.filter(x => !nList.includes(x));
  const added = nList.filter(x => !cList.includes(x));
  if (added.length || removed.length) {
    console.log('URI_ALLOW_LIST:');
    removed.forEach(x => console.log(`  - ${x}`));
    added.forEach(x => console.log(`  + ${x}`));
  } else {
    console.log('URI_ALLOW_LIST: (no change)');
  }
}

async function getCurrentAuthConfig() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch current config: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function patchAuthConfig(newConfig) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newConfig)
  });
  if (!res.ok) {
    throw new Error(`Failed to update config: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function updateAuthConfig() {
  console.log('🔧 Updating Supabase auth configuration...');
  console.log(`📦 Project: ${PROJECT_REF}`);

  console.log('📋 Fetching current auth configuration...');
  const currentConfig = await getCurrentAuthConfig();

  // Build next config
  const allowList = buildAllowList();
  const nextConfig = {
    ...currentConfig,
    SITE_URL: DASHBOARD_URL,
    URI_ALLOW_LIST: allowList.join(',')
  };

  // Show diff
  printDiff(currentConfig, nextConfig);

  if (DRY_RUN) {
    console.log('\n🧪 DRY_RUN=1 — no changes will be applied.');
  } else {
    console.log('\n🔄 Applying changes...');
    await patchAuthConfig(nextConfig);
    console.log('✅ Auth configuration updated successfully!');
  }

  // Echo provider console guidance
  const defaultCallback = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;
  const customCallback = AUTH_CUSTOM_DOMAIN
    ? `${AUTH_CUSTOM_DOMAIN.replace(/\/$/, '')}/auth/v1/callback`
    : '';

  console.log('\n📑 Provider Console Settings (copy/paste)');
  console.log('========================================');
  console.log('Google OAuth:');
  console.log('  Authorized JavaScript origins:');
  console.log(`    - ${DASHBOARD_URL}`);
  toList(LOCAL_APP_URLS).forEach(o => console.log(`    - ${o}`));
  console.log('  Authorized redirect URIs:');
  console.log(`    - ${defaultCallback}`);
  if (customCallback) console.log(`    - ${customCallback}`);

  console.log('\nGitHub OAuth:');
  console.log('  Authorization callback URL(s):');
  console.log(`    - ${defaultCallback}`);
  if (customCallback) console.log(`    - ${customCallback}`);

  console.log('\n🧭 Supabase Auth settings recap:');
  console.log(`  SITE_URL: ${nextConfig.SITE_URL}`);
  console.log('  Additional redirect URLs:');
  buildAllowList().forEach(url => console.log(`    - ${url}`));

  console.log('\n🧪 Next Steps:');
  console.log(`  1) Test Google/GitHub OAuth from ${DASHBOARD_URL}/auth/login`);
  console.log('  2) Confirm the browser hits Supabase authorize → provider → Supabase callback → returns to redirectTo');
  console.log('  3) Verify session is hydrated in the dashboard and DB writes succeed (warm Neon if needed).');
}

updateAuthConfig().catch(err => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});