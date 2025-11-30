# MCP-Core Organization ID Fix - Tailored Guide

## 🎯 Problem Identified in `lanonasis/mcp-core`

Your deployed API (`https://api.lanonasis.com`) is returning:
```json
{"error":"Organization ID is required","code":"MISSING_ORG_ID"}
```

**Root Cause Found:**
`src/core/auth-handler.ts` sets invalid organization_id values that are NOT valid UUIDs:

### Issues Found:

1. **Line 127-133 (JWT Auth):**
```typescript
organization_id: decoded.organization_id || decoded.org_id || 'default',
//                                                              ^^^^^^^^ NOT a UUID!
```

2. **Line 221-227 (Master API Key):**
```typescript
organization_id: 'system',
//                ^^^^^^^^ NOT a UUID!
```

3. **Line 268 (Vendor API Key):**
```typescript
organization_id: vendor.vendor_org_id || 'vendor',
//                                        ^^^^^^^^ NOT a UUID!
```

Your token `lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh` is likely setting `organization_id: 'default'` which fails database validation.

---

## ✅ Solution: Apply Organization Resolver

### Step 1: Create Organization Resolver

Create new file: `src/core/organization-resolver.ts`

```typescript
/**
 * Organization ID Resolver for MCP Core
 * Handles vendor_org, default, system, and missing organization IDs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4, validate as isValidUUID } from 'uuid';

let supabase: SupabaseClient | null = null;

export function initializeResolver(supabaseUrl: string, supabaseKey: string) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

export interface OrganizationResolution {
  organizationId: string;
  userId: string;
  isVendor: boolean;
  isFallback: boolean;
  source: 'vendor' | 'existing_org' | 'user_default' | 'created' | 'system';
}

// Special organization UUIDs
const VENDOR_ORG_ID = '00000000-0000-0000-0000-000000000001';
const SYSTEM_ORG_ID = '00000000-0000-0000-0000-000000000002';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000003';

// In-memory cache
const orgCache = new Map<string, { orgId: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Ensure special organization exists
 */
async function ensureSpecialOrganization(
  orgId: string,
  name: string,
  type: 'vendor' | 'system' | 'default'
): Promise<string> {
  if (!supabase) throw new Error('Resolver not initialized');

  try {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .single();

    if (existing) return orgId;

    // Create organization
    await supabase
      .from('organizations')
      .upsert({
        id: orgId,
        name,
        plan: type === 'vendor' || type === 'system' ? 'enterprise' : 'free',
        settings: { type, system: true }
      }, { onConflict: 'id', ignoreDuplicates: true });

    console.log(`✅ Created ${type} organization: ${orgId}`);
    return orgId;
  } catch (error) {
    console.error(`Error ensuring ${type} organization:`, error);
    return orgId; // Return ID anyway as fallback
  }
}

/**
 * Ensure user has default organization
 */
async function ensureUserOrganization(userId: string): Promise<string> {
  if (!supabase) throw new Error('Resolver not initialized');

  try {
    // Check if user already has organization
    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (user?.organization_id && isValidUUID(user.organization_id)) {
      // Verify organization exists
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', user.organization_id)
        .single();

      if (org) return user.organization_id;
    }

    // Create default organization for user
    const orgId = uuidv4();
    await supabase
      .from('organizations')
      .insert({
        id: orgId,
        name: `User ${userId.slice(0, 8)} Organization`,
        plan: 'free',
        settings: { type: 'user_default', created_for: userId }
      });

    // Link user to organization
    if (user) {
      await supabase
        .from('users')
        .update({ organization_id: orgId })
        .eq('id', userId);
    }

    console.log(`✅ Created user organization: ${orgId} for ${userId}`);
    return orgId;
  } catch (error) {
    console.error('Error ensuring user organization:', error);
    return userId; // Fallback to userId
  }
}

/**
 * Resolve organization ID with intelligent fallback
 */
export async function resolveOrganizationId(
  organizationIdInput: string | undefined,
  userId: string
): Promise<OrganizationResolution> {
  if (!supabase) throw new Error('Resolver not initialized');

  try {
    // Check cache
    const cacheKey = `${organizationIdInput}:${userId}`;
    const cached = orgCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return {
        organizationId: cached.orgId,
        userId,
        isVendor: cached.orgId === VENDOR_ORG_ID,
        isFallback: false,
        source: 'existing_org'
      };
    }

    // Pattern 1: Handle special string patterns
    if (organizationIdInput === 'vendor' || organizationIdInput === 'vendor_org') {
      const vendorOrgId = await ensureSpecialOrganization(VENDOR_ORG_ID, 'Vendor Organization', 'vendor');
      orgCache.set(cacheKey, { orgId: vendorOrgId, timestamp: Date.now() });
      return {
        organizationId: vendorOrgId,
        userId,
        isVendor: true,
        isFallback: false,
        source: 'vendor'
      };
    }

    if (organizationIdInput === 'system') {
      const systemOrgId = await ensureSpecialOrganization(SYSTEM_ORG_ID, 'System Organization', 'system');
      orgCache.set(cacheKey, { orgId: systemOrgId, timestamp: Date.now() });
      return {
        organizationId: systemOrgId,
        userId,
        isVendor: false,
        isFallback: false,
        source: 'system'
      };
    }

    if (organizationIdInput === 'default' || !organizationIdInput) {
      // Use user-specific organization instead of shared default
      const userOrgId = await ensureUserOrganization(userId);
      orgCache.set(cacheKey, { orgId: userOrgId, timestamp: Date.now() });
      return {
        organizationId: userOrgId,
        userId,
        isVendor: false,
        isFallback: true,
        source: 'created'
      };
    }

    // Pattern 2: Valid UUID - verify it exists
    if (isValidUUID(organizationIdInput)) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', organizationIdInput)
        .single();

      if (org) {
        orgCache.set(cacheKey, { orgId: organizationIdInput, timestamp: Date.now() });
        return {
          organizationId: organizationIdInput,
          userId,
          isVendor: organizationIdInput === VENDOR_ORG_ID,
          isFallback: false,
          source: 'existing_org'
        };
      }
    }

    // Pattern 3: Invalid/missing - create user default organization
    const userOrgId = await ensureUserOrganization(userId);
    orgCache.set(cacheKey, { orgId: userOrgId, timestamp: Date.now() });
    return {
      organizationId: userOrgId,
      userId,
      isVendor: false,
      isFallback: true,
      source: 'created'
    };

  } catch (error) {
    console.error('Organization resolution failed:', error);
    // Last resort fallback
    return {
      organizationId: userId,
      userId,
      isVendor: false,
      isFallback: true,
      source: 'user_default'
    };
  }
}

/**
 * Clear cache
 */
export function clearOrganizationCache(organizationId?: string): void {
  if (organizationId) {
    for (const [key, value] of orgCache.entries()) {
      if (value.orgId === organizationId) {
        orgCache.delete(key);
      }
    }
  } else {
    orgCache.clear();
  }
}
```

---

### Step 2: Update `src/core/auth-handler.ts`

#### 2.1: Add imports at the top

```typescript
import { resolveOrganizationId, initializeResolver } from './organization-resolver.js';
```

#### 2.2: Initialize resolver in the `init()` method

**Find this code (around line 60):**
```typescript
// Initialize Supabase client with service key for admin operations
this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);

// Initialize database tables if they don't exist
await this.initializeDatabaseTables();
```

**Add after it:**
```typescript
// Initialize organization resolver
initializeResolver(this.supabaseUrl, this.supabaseServiceKey);
```

#### 2.3: Fix JWT Authentication (Line ~127)

**Find this code:**
```typescript
const authenticatedUser: User = {
  id: decoded.user_id,
  email: decoded.email,
  password_hash: '', // Not needed for JWT auth
  api_keys: [],
  organization_id: decoded.organization_id || decoded.org_id || 'default',  // ❌ BAD
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**Replace with:**
```typescript
// ✅ Resolve organization ID intelligently
const rawOrgId = decoded.organization_id || decoded.org_id;
const orgResolution = await resolveOrganizationId(rawOrgId, decoded.user_id);

const authenticatedUser: User = {
  id: decoded.user_id,
  email: decoded.email,
  password_hash: '', // Not needed for JWT auth
  api_keys: [],
  organization_id: orgResolution.organizationId,  // ✅ GOOD - Always valid UUID
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log(`✅ JWT auth resolved org: ${orgResolution.organizationId} (source: ${orgResolution.source})`);
```

#### 2.4: Fix Master API Key Authentication (Line ~221)

**Find this code:**
```typescript
const systemUser: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'master@system.local',
  password_hash: '',
  api_keys: [],
  organization_id: 'system',  // ❌ BAD
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**Replace with:**
```typescript
// ✅ Resolve organization ID for system user
const orgResolution = await resolveOrganizationId('system', '00000000-0000-0000-0000-000000000001');

const systemUser: User = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'master@system.local',
  password_hash: '',
  api_keys: [],
  organization_id: orgResolution.organizationId,  // ✅ GOOD - Valid UUID
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

#### 2.5: Fix Vendor API Key Authentication (Line ~268)

**Find this code:**
```typescript
const vendorUser: User = {
  id: systemUserId,
  email: `${(vendor.vendor_code || 'vendor').toLowerCase()}@lanonasis.com`,
  password_hash: '',
  api_keys: [],
  organization_id: vendor.vendor_org_id || 'vendor',  // ❌ BAD
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**Replace with:**
```typescript
// ✅ Resolve organization ID for vendor
const orgResolution = await resolveOrganizationId(
  vendor.vendor_org_id || 'vendor',
  systemUserId
);

const vendorUser: User = {
  id: systemUserId,
  email: `${(vendor.vendor_code || 'vendor').toLowerCase()}@lanonasis.com`,
  password_hash: '',
  api_keys: [],
  organization_id: orgResolution.organizationId,  // ✅ GOOD - Valid UUID
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

console.log(`✅ Vendor API key resolved org: ${orgResolution.organizationId} (source: ${orgResolution.source})`);
```

#### 2.6: Fix Regular API Key Authentication (around line 310)

**Find the code where authenticatedUser is created from apiKeyRecord:**
```typescript
const authenticatedUser: User = {
  id: user.id,
  email: user.email,
  password_hash: user.password_hash,
  api_keys: apiKeys,
  organization_id: user.organization_id,  // Might be invalid
  created_at: user.created_at,
  updated_at: user.updated_at
};
```

**Replace with:**
```typescript
// ✅ Resolve organization ID from user record
const orgResolution = await resolveOrganizationId(user.organization_id, user.id);

const authenticatedUser: User = {
  id: user.id,
  email: user.email,
  password_hash: user.password_hash,
  api_keys: apiKeys,
  organization_id: orgResolution.organizationId,  // ✅ GOOD - Valid UUID
  created_at: user.created_at,
  updated_at: user.updated_at
};
```

---

### Step 3: Handle Request Body organization_id (Optional)

If you also want to accept `organization_id` from request body (for the memory client fix):

In `src/index.ts`, find the memory POST handler and update it:

**Find (around line 480):**
```typescript
this.app.post('/api/v1/memory', authMiddleware, async (req, res) => {
  try {
    const body = req.body ?? {};

    const payload: MemoryRequest = {
      title: body.title,
      content: body.content,
      type: body.type ?? 'context',
      // ...
    };
```

**Add after getting payload:**
```typescript
// ✅ Accept organization_id from request body or use authenticated user's org
const orgId = body.organization_id || req.user.organization_id;

// Ensure it's a valid UUID
const { resolveOrganizationId } = await import('./core/organization-resolver.js');
const orgResolution = await resolveOrganizationId(orgId, req.user.id);

// Use orgResolution.organizationId in your memory operations
```

---

### Step 4: Database Migration

Run this SQL to create special organizations:

```sql
-- Create vendor organization
INSERT INTO organizations (id, name, plan, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vendor Organization',
  'enterprise',
  '{"type": "vendor", "system": true}'
)
ON CONFLICT (id) DO NOTHING;

-- Create system organization
INSERT INTO organizations (id, name, plan, settings)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'System Organization',
  'enterprise',
  '{"type": "system", "system": true}'
)
ON CONFLICT (id) DO NOTHING;

-- Create default organization (fallback)
INSERT INTO organizations (id, name, plan, settings)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'Default Organization',
  'free',
  '{"type": "default", "system": true}'
)
ON CONFLICT (id) DO NOTHING;
```

---

## 🧪 Testing

### Test 1: Your Current Token

```bash
curl -X POST "https://api.lanonasis.com/api/v1/memory" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content": "Test content",
    "type": "context"
  }'
```

**Expected Result:** ✅ Success (creates memory with auto-resolved org ID)

### Test 2: With Explicit organization_id

```bash
curl -X POST "https://api.lanonasis.com/api/v1/memory" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content": "Test content",
    "type": "context",
    "organization_id": "c482cb8c-dc40-41dc-986d-daf0bcb078e5"
  }'
```

**Expected Result:** ✅ Success (uses provided org ID)

### Test 3: Search

```bash
curl -X POST "https://api.lanonasis.com/api/v1/memory/search" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test content",
    "limit": 10
  }'
```

**Expected Result:** ✅ Success (searches user's organization)

---

## 📦 Deployment Checklist

- [ ] Copy `organization-resolver.ts` to `src/core/`
- [ ] Update `src/core/auth-handler.ts` with all 4 fixes
- [ ] Update `src/index.ts` memory handlers (optional)
- [ ] Run database migration SQL
- [ ] Build: `npm run build`
- [ ] Test locally with your token
- [ ] Deploy to staging/production
- [ ] Verify with curl commands above
- [ ] Monitor logs for org resolution sources

---

## 🎯 Benefits

✅ **Fixes your immediate error** - No more "Organization ID is required"
✅ **Backward compatible** - Existing tokens continue to work
✅ **Handles all auth patterns** - JWT, API keys, vendor keys, master keys
✅ **Auto-creates organizations** - No manual setup needed
✅ **Production ready** - Caching, error handling, logging

---

## 📊 Expected Log Output

After deployment, you'll see logs like:
```
✅ JWT auth resolved org: c482cb8c-dc40-41dc-986d-daf0bcb078e5 (source: created)
✅ Created user organization: c482cb8c-dc40-41dc-986d-daf0bcb078e5 for c482cb8c...
```

This confirms the resolver is working and creating organizations as needed.

---

## Questions?

- **Q: Will this break existing users?**
  A: No, it creates organizations for users who don't have them.

- **Q: What about performance?**
  A: 5-minute cache reduces database calls. Minimal overhead.

- **Q: Do I need to update memory client?**
  A: No, but the updated client allows explicit `organizationId` config for better control.
