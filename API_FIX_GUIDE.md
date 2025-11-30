# API Organization ID Fix Guide

## Problem
API is returning `{"error":"Organization ID is required","code":"MISSING_ORG_ID"}` because auth tokens don't include valid organization_id.

**User Token:** `lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh`
**User ID:** `c482cb8c-dc40-41dc-986d-daf0bcb078e5`
**Issue:** No organization_id in token, database requires valid UUID

## Solution Overview

1. **Create Organization Resolver Service** - Intelligently resolves organization IDs
2. **Update Auth Middleware** - Use resolver during authentication
3. **Update Memory Routes** - Use resolved organization IDs

---

## Step 1: Create Organization Resolver Service

Create file: `src/services/organizationResolver.ts`

```typescript
/**
 * Organization ID Resolver Service
 * Handles vendor_org, missing orgs, invalid UUIDs, etc.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { v4 as uuidv4, validate as isValidUUID } from 'uuid';

const supabase: SupabaseClient = createClient(config.SUPABASE_URL=https://<project-ref>.supabase.co

export interface OrganizationResolution {
  organizationId: string;
  userId: string;
  isVendor: boolean;
  isFallback: boolean;
  source: 'vendor' | 'existing_org' | 'user_default' | 'created';
}

const VENDOR_ORG_ID = '00000000-0000-0000-0000-000000000001';
const orgCache = new Map<string, { orgId: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Ensure vendor organization exists
 */
async function ensureVendorOrganization(): Promise<string> {
  try {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', VENDOR_ORG_ID)
      .single();

    if (existing) return VENDOR_ORG_ID;

    // Create vendor org
    await supabase
      .from('organizations')
      .upsert({
        id: VENDOR_ORG_ID,
        name: 'Vendor Organization',
        plan: 'enterprise',
        settings: { type: 'vendor' }
      }, { onConflict: 'id', ignoreDuplicates: true });

    return VENDOR_ORG_ID;
  } catch (error) {
    logger.error('Error ensuring vendor organization', { error });
    return VENDOR_ORG_ID;
  }
}

/**
 * Ensure user has default organization
 */
async function ensureUserOrganization(userId: string): Promise<string> {
  try {
    // Check if user has organization
    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (user?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', user.organization_id)
        .single();

      if (org) return user.organization_id;
    }

    // Create default organization
    const orgId = uuidv4();
    await supabase
      .from('organizations')
      .insert({
        id: orgId,
        name: `User ${userId.slice(0, 8)} Organization`,
        plan: 'free',
        settings: { type: 'user_default', created_for: userId }
      });

    // Link user to org
    if (user) {
      await supabase
        .from('users')
        .update({ organization_id: orgId })
        .eq('id', userId);
    }

    logger.info('Created default organization', { userId, orgId });
    return orgId;
  } catch (error) {
    logger.error('Error ensuring user organization', { error, userId });
    return userId; // Fallback
  }
}

/**
 * Resolve organization ID with intelligent fallback
 */
export async function resolveOrganizationId(
  organizationIdInput: string | undefined,
  userId: string
): Promise<OrganizationResolution> {
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

    // Pattern 1: Vendor org
    if (organizationIdInput === 'vendor_org' || organizationIdInput === 'vendor') {
      const vendorOrgId = await ensureVendorOrganization();
      orgCache.set(cacheKey, { orgId: vendorOrgId, timestamp: Date.now() });
      return {
        organizationId: vendorOrgId,
        userId,
        isVendor: true,
        isFallback: false,
        source: 'vendor'
      };
    }

    // Pattern 2: Valid UUID - verify exists
    if (organizationIdInput && isValidUUID(organizationIdInput)) {
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

    // Pattern 3: Use userId if it's a valid org
    if (userId && isValidUUID(userId)) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', userId)
        .single();

      if (org) {
        orgCache.set(cacheKey, { orgId: userId, timestamp: Date.now() });
        return {
          organizationId: userId,
          userId,
          isVendor: false,
          isFallback: true,
          source: 'user_default'
        };
      }
    }

    // Pattern 4: Create default organization
    const resolvedOrgId = await ensureUserOrganization(userId);
    orgCache.set(cacheKey, { orgId: resolvedOrgId, timestamp: Date.now() });
    return {
      organizationId: resolvedOrgId,
      userId,
      isVendor: false,
      isFallback: true,
      source: 'created'
    };

  } catch (error) {
    logger.error('Organization resolution failed', { error, organizationIdInput, userId });
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

## Step 2: Update Authentication Middleware

File: `src/middleware/auth.ts` (or wherever your auth middleware is)

### 2.1: Import the resolver at the top

```typescript
import { resolveOrganizationId } from '@/services/organizationResolver';
```

### 2.2: Update JWT authentication section

**Find this code:**
```typescript
// After JWT verification
const userId = decoded.sub || decoded.userId || decoded.user_id;
const organizationId = decoded.organization_id || decoded.organizationId || userId;

req.user = {
  userId,
  organizationId,  // ❌ Might be invalid
  role: decoded.role || 'user',
  plan: decoded.plan || 'free'
};
```

**Replace with:**
```typescript
// After JWT verification
const userId = decoded.sub || decoded.userId || decoded.user_id;
const rawOrgId = decoded.organization_id || decoded.organizationId || decoded.org_id;

// ✅ Resolve organization ID intelligently
const orgResolution = await resolveOrganizationId(rawOrgId, userId);

req.user = {
  userId,
  organizationId: orgResolution.organizationId,  // ✅ Always valid UUID
  role: decoded.role || 'user',
  plan: decoded.plan || 'free'
};

logger.info(`JWT auth successful (org: ${orgResolution.organizationId}, source: ${orgResolution.source})`);
```

### 2.3: Update API Key authentication section

**Find this code:**
```typescript
// After API key validation
req.user = {
  userId: keyRecord.user_id,
  organizationId: keyRecord.user_id,  // ❌ Simple fallback
  role: 'user',
  plan: keyRecord.plan || 'free'
};
```

**Replace with:**
```typescript
// After API key validation
// ✅ Resolve organization ID intelligently
const orgResolution = await resolveOrganizationId(undefined, keyRecord.user_id);

req.user = {
  userId: keyRecord.user_id,
  organizationId: orgResolution.organizationId,  // ✅ Always valid UUID
  role: 'user',
  plan: keyRecord.plan || 'free'
};
```

---

## Step 3: Update Memory Routes (Optional but Recommended)

File: `src/routes/memory.ts`

### 3.1: Import resolver
```typescript
import { resolveOrganizationId } from '@/services/organizationResolver';
```

### 3.2: Update context resolver

**Find this code:**
```typescript
const resolveUserContext = (user) => {
  const userId = user?.userId || user?.id;
  const organizationId = user?.organizationId || userId;  // Simple fallback
  return { userId, organizationId };
};
```

**Replace with:**
```typescript
const resolveUserContext = async (user) => {
  const userId = user?.userId || user?.id;
  const rawOrgId = user?.organizationId;

  // ✅ Double-check organization resolution
  const resolution = await resolveOrganizationId(rawOrgId, userId);

  return {
    userId,
    organizationId: resolution.organizationId,  // ✅ Guaranteed valid
    isResolved: true
  };
};
```

### 3.3: Update route handlers to use await

**Find:**
```typescript
const { userId, organizationId } = resolveUserContext(req.user);
```

**Replace with:**
```typescript
const { userId, organizationId } = await resolveUserContext(req.user);
```

---

## Step 4: Handle Request Body organization_id (Alternative Approach)

If you can't modify auth middleware, you can check request body for org_id:

File: `src/routes/memory.ts`

**Add before create/search handlers:**
```typescript
router.post('/memory', async (req, res) => {
  const { userId, organizationId: authOrgId } = await resolveUserContext(req.user);

  // Check request body for organization_id
  const bodyOrgId = req.body.organization_id;

  // Resolve final organization ID
  const resolution = await resolveOrganizationId(
    bodyOrgId || authOrgId,
    userId
  );

  // Use resolution.organizationId for database operations
  const memory = await memoryService.createMemory({
    ...req.body,
    user_id: userId,
    organization_id: resolution.organizationId  // ✅ Always valid
  });
});
```

---

## Step 5: Database Schema Verification

Ensure your organizations table exists:

```sql
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vendor organization
INSERT INTO organizations (id, name, plan, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vendor Organization',
  'enterprise',
  '{"type": "vendor", "description": "System organization for vendor API keys"}'
)
ON CONFLICT (id) DO NOTHING;
```

---

## Testing

### Test 1: With Updated Memory Client

```bash
# Install updated client
npm install @lanonasis/memory-client@latest

# Use with organization ID
const client = new CoreMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  authToken: 'lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh',
  organizationId: 'c482cb8c-dc40-41dc-986d-daf0bcb078e5',  // Your user ID as fallback
  userId: 'c482cb8c-dc40-41dc-986d-daf0bcb078e5'
});

await client.createMemory({
  title: 'Test',
  content: 'Test content',
  memory_type: 'context'
});
// ✅ Should work - client includes organization_id in request body
```

### Test 2: Direct API Call

```bash
curl -X POST "https://api.lanonasis.com/api/v1/memory" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "content": "Test content",
    "memory_type": "context",
    "organization_id": "c482cb8c-dc40-41dc-986d-daf0bcb078e5"
  }'
# ✅ Should work with explicit organization_id in body
```

### Test 3: Search

```bash
curl -X POST "https://api.lanonasis.com/api/v1/memory/search" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "test",
    "limit": 10,
    "organization_id": "c482cb8c-dc40-41dc-986d-daf0bcb078e5"
  }'
# ✅ Should work with explicit organization_id
```

---

## Priority Implementation Order

**Quick Fix (30 minutes):**
1. Check request body for `organization_id` in routes (Step 4)
2. Fallback to `userId` if not provided

**Proper Fix (2-3 hours):**
1. Create organization resolver service (Step 1)
2. Update auth middleware (Step 2)
3. Update routes (Step 3)
4. Test thoroughly

**Best Solution:**
- Implement both: resolver in auth middleware + allow request body override
- This handles all cases: vendor keys, JWT tokens, explicit org IDs

---

## Summary

### What This Fixes

✅ **Vendor API keys** - Maps `'vendor_org'` to valid UUID
✅ **Missing org IDs** - Creates default organization
✅ **Invalid UUIDs** - Validates and creates if needed
✅ **Token without org** - Uses user_id or creates org

### Zero Changes Needed for Clients

If you implement Step 2 (auth middleware), existing clients work immediately - no changes needed.

### Memory Client Already Updated

The memory client in this repo now supports `organizationId` and `userId` config options, so users can explicitly provide them.

---

## Deployment Checklist

- [ ] Copy `organizationResolver.ts` to API repo
- [ ] Update auth middleware to use resolver
- [ ] Update memory routes (optional)
- [ ] Run database migration for vendor org
- [ ] Deploy to staging
- [ ] Test with actual token
- [ ] Deploy to production
- [ ] Monitor logs for resolution sources

---

## Questions?

- **Q: Do I need to update all routes?**
  A: No, if you fix auth middleware (Step 2), all routes automatically get valid org IDs.

- **Q: What if I can't modify auth middleware?**
  A: Use Step 4 - check request body in each route handler.

- **Q: Will this break existing clients?**
  A: No, it's backward compatible. Existing valid org IDs work as before.

- **Q: Performance impact?**
  A: Minimal - uses in-memory cache with 5-min TTL.
