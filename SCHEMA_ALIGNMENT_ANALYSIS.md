# Schema & Code Alignment Analysis

## 🚨 Critical Issue Found: `organization_id` vs `group_id` Mismatch

### Problem Summary
The database schema uses `organization_id`, but the application code uses `group_id`. This causes INSERT failures when creating memories.

---

## 📊 Current State Analysis

### 1. **Database Schema** (`src/db/schema.sql`)

```sql
CREATE TABLE memory_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    memory_type memory_type NOT NULL DEFAULT 'context',
    tags TEXT[] DEFAULT '{}',
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,  ⬅️ Uses organization_id
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0
);
```

**Key Points:**
- ✅ Column: `organization_id` (NOT NULL, required)
- ✅ References: `organizations(id)`
- ✅ Type: `UUID NOT NULL`

---

### 2. **Memory Service** (`src/services/memoryService.ts`)

**Line 76:**
```typescript
async createMemory(
  id: string,
  data: CreateMemoryRequest & { user_id: string; group_id: string }  ⬅️ ❌ Uses group_id
): Promise<MemoryEntry>
```

**Line 91:**
```typescript
const memoryData = {
  id,
  title: data.title,
  content: data.content,
  memory_type: data.memory_type,
  tags: data.tags || [],
  topic_id: data.topic_id || null,
  user_id: data.user_id,
  group_id: data.group_id,  ⬅️ ❌ Sends group_id to database
  embedding: JSON.stringify(embedding) as unknown as number[],
  metadata: data.metadata || {} as Record<string, unknown>,
};
```

**What Happens:**
When this INSERT executes:
```sql
INSERT INTO memory_entries (id, title, content, ..., group_id, ...)
VALUES (...)
```

**Result:** ❌ **ERROR: column "group_id" does not exist**

Also, even if `group_id` were ignored, `organization_id` is NOT NULL, so the INSERT would fail anyway.

---

### 3. **Memory Routes** (`src/routes/memory.ts`)

**Line 35:**
```typescript
const resolveUserContext = (user?: UnifiedUser) => {
  const userId = user?.userId ?? user?.sub ?? user?.id ?? user?.user_id;
  const organizationId = user?.organizationId ?? user?.organization_id ?? userId;  ✅ Gets organizationId
  const plan = (user?.plan as string | undefined) ?? 'free';
  return { userId, organizationId, plan };
};
```

**Line 102:**
```typescript
const memory = await memoryService.createMemory(memoryId, {
  ...validatedData,
  user_id: userId,
  group_id: organizationId  ⬅️ ❌ Passes as group_id (should be organization_id)
});
```

---

### 4. **Memory Client SDK** (packages/memory-client)

**Current Request Schema:**
```typescript
export interface CreateMemoryRequest {
  title: string;
  content: string;
  summary?: string;
  memory_type?: string;
  topic_id?: string;
  project_ref?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
```

**Missing Fields:**
- ❌ `organization_id` - Not included in client request
- ❌ `user_id` - Not included in client request

**Why This Works (Currently):**
The server extracts these from the authenticated user context:
```typescript
const { userId, organizationId } = resolveUserContext(req.user);
```

**But there's a bug:** It sends `group_id` instead of `organization_id` to the database!

---

## 🔧 Required Fixes

### Fix 1: Update Memory Service (`src/services/memoryService.ts`)

**Line 76 - Change parameter:**
```typescript
// BEFORE ❌
async createMemory(id: string, data: CreateMemoryRequest & { user_id: string; group_id: string })

// AFTER ✅
async createMemory(id: string, data: CreateMemoryRequest & { user_id: string; organization_id: string })
```

**Line 91 - Change field:**
```typescript
// BEFORE ❌
const memoryData = {
  // ...
  group_id: data.group_id,
  // ...
};

// AFTER ✅
const memoryData = {
  // ...
  organization_id: data.organization_id,
  // ...
};
```

---

### Fix 2: Update Memory Routes (`src/routes/memory.ts`)

**Line 102 - Change parameter name:**
```typescript
// BEFORE ❌
const memory = await memoryService.createMemory(memoryId, {
  ...validatedData,
  user_id: userId,
  group_id: organizationId
});

// AFTER ✅
const memory = await memoryService.createMemory(memoryId, {
  ...validatedData,
  user_id: userId,
  organization_id: organizationId
});
```

---

### Fix 3: Search/List Operations

Check all other places where `group_id` might be used:

**In `memoryService.ts`:**
- `listMemories()` method
- `searchMemories()` method
- `updateMemory()` method
- `deleteMemory()` method
- Any SQL queries or Supabase calls

**Grep for all occurrences:**
```bash
grep -r "group_id" src/services/memoryService.ts
grep -r "group_id" src/routes/memory.ts
```

Replace all with `organization_id`.

---

## 📋 Verification Checklist

After applying fixes:

- [ ] Update `memoryService.createMemory()` parameter from `group_id` to `organization_id`
- [ ] Update `memoryData` object to use `organization_id` field
- [ ] Update route to pass `organization_id` instead of `group_id`
- [ ] Search for all `group_id` references in memory service
- [ ] Search for all `group_id` references in memory routes
- [ ] Verify database schema has `organization_id` column
- [ ] Test memory creation with a real request
- [ ] Verify no `group_id` references remain in memory-related code

---

## 🧪 Test Case

**Before Fix:**
```bash
curl -X POST http://localhost:3001/api/v1/memory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Memory",
    "content": "This is a test"
  }'
```

**Expected Error (Before Fix):**
```json
{
  "error": "Internal Server Error",
  "message": "column \"group_id\" does not exist"
}
```

**Expected Success (After Fix):**
```json
{
  "id": "uuid-here",
  "title": "Test Memory",
  "content": "This is a test",
  "organization_id": "org-uuid",
  "user_id": "user-uuid",
  ...
}
```

---

## 🎯 Why This Happened

Looking at the code history, it appears there was a refactoring where:
1. Original schema used `groups` table (for families, teams, projects)
2. Later changed to `organizations` table (for multi-tenant architecture)
3. Database schema was updated: `groups` → `organizations`
4. Column was renamed: `group_id` → `organization_id`
5. **BUT** the application code wasn't fully updated!

**Evidence:**
- Line 12-27 in `schema.sql` shows `groups` table exists
- Line 34 in `schema.sql` shows `users.organization_id` references `organizations(id)`
- But service code still uses old `group_id` name

---

## 💡 Additional Recommendations

### 1. Add TypeScript Type Safety

Create a proper interface:
```typescript
// src/types/memory.ts
export interface CreateMemoryData extends CreateMemoryRequest {
  user_id: string;
  organization_id: string;  // Enforce correct field name
}

// In memoryService.ts
async createMemory(id: string, data: CreateMemoryData): Promise<MemoryEntry>
```

### 2. Add Database-Level Check

If both `groups` and `organizations` exist, clarify:
- Are they separate concepts?
- Should `groups` be child entities under `organizations`?
- If not needed, remove deprecated `groups` table

### 3. Update Memory Client Documentation

Clarify that:
- `user_id` is automatically extracted from authentication token
- `organization_id` is automatically extracted from user context
- Clients don't need to provide these fields

### 4. Add Server-Side Validation

```typescript
if (!userId || !organizationId) {
  throw new BadRequestError('Missing user or organization context');
}
```

---

## 📁 Files That Need Changes

1. **`src/services/memoryService.ts`** - Change all `group_id` to `organization_id`
2. **`src/routes/memory.ts`** - Change `group_id` to `organization_id` in route handlers
3. **`src/types/memory.ts`** - Add proper type for CreateMemoryData (optional but recommended)

---

## ✅ Summary

**Root Cause:** Naming inconsistency between database schema (`organization_id`) and application code (`group_id`)

**Impact:** All memory creation requests fail with "column does not exist" error

**Fix:** Global search-and-replace `group_id` → `organization_id` in memory service and routes

**Verification:** Test memory creation after fix to confirm INSERT succeeds
