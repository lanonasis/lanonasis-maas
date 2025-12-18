# Organization ID Resolution System

## Overview

The Memory Service supports multiple authentication patterns that may provide organization IDs in different formats. To ensure seamless operation across all patterns without failures, we've implemented an **Intelligent Organization ID Resolver**.

## Problem Statement

### Authentication Patterns

Different authentication methods provide organization IDs differently:

| Auth Method | Organization ID Format | Issue |
|-------------|------------------------|-------|
| **Vendor API Keys** | `'vendor_org'` (literal string) | Not a valid UUID, doesn't exist in database |
| **Regular API Keys** | `user_id` | May not have corresponding organization record |
| **JWT Tokens** | `decoded.organization_id` or fallback to `userId` | May be missing or invalid |
| **Legacy Systems** | Various formats | Inconsistent data |

### Database Requirement

The `memory_entries` table requires:
```sql
organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
```

**Conflict:** Authentication provides non-UUID or non-existent organization IDs, but database requires valid UUIDs.

## Solution: Intelligent Organization Resolver

### Service Location
`src/services/organizationResolver.ts`

### How It Works

```typescript
import { resolveOrganizationId } from '@/services/organizationResolver';

const resolution = await resolveOrganizationId(rawOrganizationId, userId);

// resolution contains:
// {
//   organizationId: string,    // Valid UUID that exists in database
//   userId: string,
//   isVendor: boolean,         // true if vendor organization
//   isFallback: boolean,       // true if fallback logic was used
//   source: 'vendor' | 'existing_org' | 'user_default' | 'created'
// }
```

### Resolution Logic

The resolver follows this priority:

#### 1. **Vendor Organization** (`'vendor_org'`)
```typescript
if (organizationIdInput === 'vendor_org' || organizationIdInput === 'vendor') {
  // Returns: Special UUID for vendor org (00000000-0000-0000-0000-000000000001)
  // Ensures vendor org exists in database
}
```

#### 2. **Valid Existing UUID**
```typescript
if (isValidUUID(organizationIdInput)) {
  // Verifies organization exists in database
  // Returns: Provided UUID if valid
}
```

#### 3. **User ID as Organization**
```typescript
if (isValidUUID(userId)) {
  // Checks if userId corresponds to an organization
  // Returns: userId if it's a valid organization
}
```

#### 4. **Create Default Organization**
```typescript
// Last resort: create a default organization for the user
const orgId = uuidv4();
await supabase.from('organizations').insert({
  id: orgId,
  name: `User ${userId.slice(0, 8)} Organization`,
  plan: 'free',
  settings: { type: 'user_default', created_for: userId }
});
// Returns: Newly created organization ID
```

## Features

### 1. **Caching**
- In-memory cache with 5-minute TTL
- Reduces database queries
- Cleared automatically after TTL

```typescript
// Cache structure
Map<`${orgId}:${userId}`, { orgId: string, timestamp: number }>
```

### 2. **Vendor Organization**
- Special UUID: `00000000-0000-0000-0000-000000000001`
- Created automatically on first vendor request
- Shared by all vendor API keys
- Enterprise plan by default

### 3. **User Default Organizations**
- Created on-demand when needed
- Named: `"User {userId} Organization"`
- Free plan by default
- User is linked to organization

### 4. **Batch Resolution**
```typescript
const resolutions = await resolveOrganizationIdsBatch([
  { organizationId: 'vendor_org', userId: 'user-1' },
  { organizationId: undefined, userId: 'user-2' },
  { organizationId: 'uuid-123', userId: 'user-3' }
]);
```

### 5. **Cache Management**
```typescript
// Clear specific organization
clearOrganizationCache('00000000-0000-0000-0000-000000000001');

// Clear all cache
clearOrganizationCache();

// Get cache stats
const stats = getOrganizationCacheStats();
// { size: 42, entries: ['vendor_org:user-1', ...] }
```

## Integration

### Memory Routes
The resolver is integrated into all memory operations:

```typescript
// src/routes/memory.ts

const resolveUserContext = async (user?: UnifiedUser) => {
  const userId = user?.userId ?? user?.sub ?? user?.id ?? user?.user_id;
  const rawOrganizationId = user?.organizationId ?? user?.organization_id;
  const plan = user?.plan ?? 'free';

  // Intelligent resolution
  const resolution = await resolveOrganizationId(rawOrganizationId, userId);

  return {
    userId,
    organizationId: resolution.organizationId,  // Always valid UUID
    plan,
    isResolved: true,
    isVendor: resolution.isVendor
  };
};
```

### Usage in Routes
```typescript
router.post('/memory', asyncHandler(async (req, res) => {
  // Resolve organization ID intelligently
  const { userId, organizationId, isResolved } = await resolveUserContext(req.user);

  if (!userId || !organizationId || !isResolved) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Now organizationId is guaranteed to be a valid UUID
  const memory = await memoryService.createMemory(memoryId, {
    ...data,
    user_id: userId,
    organization_id: organizationId  // ✅ Always valid
  });
}));
```

## Benefits

### ✅ **Zero Failure Drop-offs**
- No more "organization not found" errors
- No more "invalid UUID" errors
- No more INSERT failures due to FK constraints

### ✅ **Multi-Pattern Support**
- Vendor API keys work seamlessly
- Regular API keys work seamlessly
- JWT tokens work seamlessly
- Legacy systems work seamlessly

### ✅ **Automatic Fallbacks**
- Creates organizations on-demand
- Uses intelligent defaults
- Logs special cases for monitoring

### ✅ **Performance**
- Caching reduces database load
- Batch resolution for efficiency
- Minimal overhead

## Monitoring

### Logs
The resolver logs special cases:

```json
{
  "level": "info",
  "message": "Organization ID resolved with special handling",
  "userId": "user-123",
  "rawOrganizationId": "vendor_org",
  "resolvedOrganizationId": "00000000-0000-0000-0000-000000000001",
  "source": "vendor",
  "isVendor": true,
  "isFallback": false
}
```

### Metrics to Track
- Resolution source distribution (vendor vs existing vs created)
- Fallback usage frequency
- Cache hit rate
- Organization creation rate

## Database Schema

### Organizations Table
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  plan plan_type NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor organization
INSERT INTO organizations (id, name, plan, settings) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vendor Organization',
  'enterprise',
  '{"type": "vendor", "description": "System organization for vendor API keys"}'
);
```

### Memory Entries Table
```sql
CREATE TABLE memory_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ... other fields ...
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- ... other fields ...
);
```

## Testing

### Test Scenarios

1. **Vendor API Key**
```typescript
const resolution = await resolveOrganizationId('vendor_org', 'user-123');
expect(resolution.organizationId).toBe('00000000-0000-0000-0000-000000000001');
expect(resolution.isVendor).toBe(true);
```

2. **Valid Organization UUID**
```typescript
const resolution = await resolveOrganizationId('existing-org-uuid', 'user-123');
expect(resolution.source).toBe('existing_org');
expect(resolution.isFallback).toBe(false);
```

3. **Missing Organization**
```typescript
const resolution = await resolveOrganizationId(undefined, 'user-123');
expect(resolution.source).toBe('created');
expect(resolution.isFallback).toBe(true);
```

4. **Invalid UUID**
```typescript
const resolution = await resolveOrganizationId('invalid-uuid', 'user-123');
// Should fall back to creating user default org
expect(resolution.source).toBe('created');
```

## Migration Notes

### Existing Data
- No migration needed for existing data
- Resolver works with both old and new patterns
- Gradual rollout supported

### Backward Compatibility
- All existing authentication methods continue to work
- No breaking changes to API
- Transparent to clients

## Future Improvements

1. **Redis Caching**: Move from in-memory to Redis for multi-instance deployments
2. **Organization Pooling**: Optimize vendor organization usage
3. **Analytics**: Track organization resolution patterns
4. **Alerts**: Notify when fallback logic is used frequently

## Summary

The Intelligent Organization ID Resolver ensures that:
- ✅ **All authentication patterns work seamlessly**
- ✅ **No failure drop-offs due to organization ID mismatches**
- ✅ **Database constraints are always satisfied**
- ✅ **Performance is optimized with caching**
- ✅ **System is production-ready and resilient**
