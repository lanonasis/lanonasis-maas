# CLI Drift Analysis and Fixes

**Date**: 2026-03-29
**Author**: Claude (Automated Fix)
**Slack Thread**: https://lanonasis-team.slack.com/archives/C0AN9NV1J10/p1774826690303309
**Branch**: `claude/slack-session-BwqNa`

## Executive Summary

This document details the drift between the CLI implementation and the server-side API endpoints that were discovered during the Memory Context Separation work. Three critical issues were identified and fixed:

1. **API Endpoint Path Drift** (High Severity)
2. **Response Envelope Mismatch** (High Severity)
3. **MCP Args Validation** (Low Severity)

## Issues Identified

### 1. API Endpoint Path Drift (HIGH)

**Problem**: The CLI `api-keys` commands were using stale endpoint paths that don't match the current server routing structure.

**Root Cause**: The CLI was calling bare `/api-keys` paths while the server has standardized on versioned `/api/v1/api-keys` paths.

**Evidence**:
- CLI calls: `/api-keys`, `/api-keys/projects`, `/api-keys/mcp/tools`
- Server mounts at: `/api/v1/keys` and `/api/v1/api-keys` (see `src/server.ts:287-288`)
- Base URL from config strips `/api/v1` suffix (see `cli/src/utils/config.ts:314`)
- Memory operations in CLI correctly use full paths like `/api/v1/memories` (see `cli/src/utils/api.ts:747`)

**Impact**: All CLI `api-keys` commands would fail with 404 errors as they're targeting non-existent endpoints.

**Affected Files**:
- `cli/src/commands/api-keys.ts` (16 occurrences across all commands)

**Fixed Paths**:
```typescript
// Before → After
'/api-keys'                           → '/api/v1/api-keys'
'/api-keys/projects'                  → '/api/v1/api-keys/projects'
'/api-keys/mcp/tools'                 → '/api/v1/api-keys/mcp/tools'
'/api-keys/mcp/request-access'        → '/api/v1/api-keys/mcp/request-access'
'/api-keys/analytics/usage'           → '/api/v1/api-keys/analytics/usage'
'/api-keys/analytics/security-events' → '/api/v1/api-keys/analytics/security-events'
'/api-keys/${keyId}'                  → '/api/v1/api-keys/${keyId}'
```

### 2. Response Envelope Mismatch (HIGH)

**Problem**: The CLI expected raw data arrays/objects but the server returns standardized envelopes.

**Root Cause**: The API client's generic methods (`get`, `post`, `put`, `delete`) return `response.data` which contains the full server envelope `{ success: boolean, data: T }`. The CLI commands were treating this envelope as if it were the actual data.

**Evidence**:
- Server returns: `{ success: true, data: [...] }` (see envelope pattern in `src/middleware/auth-aligned.ts`)
- CLI `apiClient.get()` returns `response.data` which IS the envelope (see `cli/src/utils/api.ts:1021-1023`)
- Memory operations correctly unwrap with `normalizeMemoryEntry()` helper
- API-keys commands were missing this unwrapping step

**Impact**: Runtime errors when CLI code tries to iterate over envelope objects as if they were arrays, or access properties on envelope objects as if they were data objects.

**Example Failure**:
```typescript
// Before (fails):
const projects = await apiClient.get('/api-keys/projects');
projects.forEach(...) // TypeError: projects.forEach is not a function
// Because projects is { success: true, data: [...] }

// After (works):
const response = await apiClient.get('/api/v1/api-keys/projects');
const projects = response.data || response;
projects.forEach(...) // Works correctly
```

**Fixed Commands**:
- `api-keys projects list` - unwrap projects array
- `api-keys projects create` - unwrap created project
- `api-keys create` - unwrap created key
- `api-keys list` - unwrap keys array
- `api-keys get` - unwrap key object
- `api-keys update` - unwrap updated key
- `api-keys delete` - (no response body to unwrap)
- `api-keys mcp register-tool` - unwrap tool object
- `api-keys mcp list-tools` - unwrap tools array
- `api-keys mcp request-access` - unwrap response
- `api-keys analytics usage` - unwrap analytics array
- `api-keys analytics security-events` - unwrap events array

**Defensive Pattern Applied**:
```typescript
const response = await apiClient.get(url);
const data = response.data || response;

// Also added array checks:
if (!Array.isArray(data) || data.length === 0) {
  console.log('No items found');
  return;
}
```

### 3. MCP Call Args Validation (LOW)

**Problem**: The MCP `call` command accepts any JSON value (string, number, array, object) and passes it directly to the MCP protocol layer without validation.

**Root Cause**: `JSON.parse()` can return any JSON value, but MCP tools expect an object of named parameters.

**Evidence**:
```typescript
// Before (cli/src/commands/mcp.ts:482):
args = JSON.parse(options.args); // Could be "hello", 123, [], etc.
const result = await client.callTool(toolName, args);
```

**Impact**: Low severity. Errors surface deep in the MCP protocol layer instead of at the CLI boundary, making debugging harder.

**Example Failure**:
```bash
# These would fail with cryptic MCP protocol errors:
memory mcp call my-tool --args '"hello"'
memory mcp call my-tool --args '["item1", "item2"]'
memory mcp call my-tool --args '42'

# Only this should work:
memory mcp call my-tool --args '{"param": "value"}'
```

**Fix Applied**:
```typescript
args = JSON.parse(options.args);

// Validate that args is a plain object (not array or primitive)
if (typeof args !== 'object' || args === null || Array.isArray(args)) {
  spinner.fail('Arguments must be a JSON object, not an array or primitive value');
  console.log(chalk.yellow('Example: --args \'{"key": "value"}\''));
  process.exit(1);
}
```

## Additional Context: Field Shape Mismatch

While not fixed in this PR (marked as blocking dependency for P3), the analysis revealed that the CLI `api-keys` commands are shaped for **project-stored secrets** (V-Secure style), not **platform API keys**:

**Current CLI Fields** (Project Secrets):
- `keyType`, `environment`, `projectId`, `accessLevel`, `tags`, `expiresAt`, `rotationFrequency`
- These match V-Secure's stored-key routes for things like "store my Stripe API key"

**Expected Platform API Key Fields**:
- `name`, `access_level`, `expires_in_days`, `scopes`, `organization_id`
- These are for Memory Context Separation platform access keys with scope notation

**Implication**: The CLI `api-keys` subtree is currently unusable for creating context-bound platform keys (needed for P3/P5 of Memory Context Separation). This is a separate issue that should be tracked as a P3 dependency.

## Verification Steps

1. **Endpoint Path Verification**:
   ```bash
   # Server side - confirm routing
   grep -n "api-keys" src/server.ts
   # Should show: app.use(`${config.API_PREFIX}/${config.API_VERSION}/api-keys`, ...)

   # CLI side - confirm paths updated
   grep -n "/api/v1/api-keys" cli/src/commands/api-keys.ts
   # Should show all 16+ occurrences updated
   ```

2. **Response Unwrapping Verification**:
   ```bash
   # Check all commands unwrap response.data
   grep -n "response.data \|\| response" cli/src/commands/api-keys.ts
   # Should show unwrapping for all API calls
   ```

3. **MCP Args Validation Verification**:
   ```bash
   # Check validation logic added
   grep -A5 "typeof args !== 'object'" cli/src/commands/mcp.ts
   # Should show validation block with helpful error message
   ```

## Testing Checklist

- [ ] Build CLI: `cd cli && npm run build`
- [ ] Test api-keys list: `memory api-keys list`
- [ ] Test api-keys create: `memory api-keys create --interactive`
- [ ] Test api-keys get: `memory api-keys get <id>`
- [ ] Test MCP call with valid args: `memory mcp call tool --args '{"key":"value"}'`
- [ ] Test MCP call with invalid args: `memory mcp call tool --args '["array"]'` (should error with helpful message)

## Related Work

### Memory Context Separation (P1-P5)
This fix unblocks the ability to create properly scoped API keys once the field shape is aligned (P3 dependency).

**Current Status**:
- ✅ Paths aligned to server routing
- ✅ Response envelopes properly unwrapped
- ⚠️  Field shape still points to project secrets, not platform keys
- 🚧 Blocking dependency for P3: CLI must be updated to support `scopes`, `organization_id` fields

### Capstone Page vs. Validated Decisions
The drift analysis also identified that the Capstone page contains stale assumptions that were corrected on March 26:

**Stale Capstone Items**:
1. ❌ Create `organization_memberships` table → Use existing `security_service.org_members`
2. ❌ Add `scopes text[]` column → Use existing `permissions` column
3. ❌ Make `lms_p_` / `lms_t_` prefixes a dependency → Keep `lano_`, use `key_context` to differentiate

**Source of Truth**: `docs/plans/memory-context-separation.md` (not found in this repo, may be in monorepo)

## Files Modified

1. `cli/src/commands/api-keys.ts` (16 path updates + response unwrapping)
2. `cli/src/commands/mcp.ts` (args validation)
3. `docs/cli-drift-analysis-and-fixes.md` (this document)

## Commit Message

```text
fix(cli): align api-keys endpoints and fix response handling

Three critical drift issues fixed:

1. API endpoint paths: Update all /api-keys paths to /api/v1/api-keys
   to match server routing at src/server.ts:287-288

2. Response envelope handling: Extract .data from { success, data }
   envelopes returned by server. Adds defensive array checks.

3. MCP args validation: Ensure --args is a JSON object, not array/primitive

Impact:
- Fixes 404 errors on all api-keys CLI commands
- Fixes runtime errors from treating envelopes as raw data
- Improves error messages for MCP tool calls

Related:
- Slack thread: https://lanonasis-team.slack.com/archives/C0AN9NV1J10/p1774826690303309
- Blocking for Memory Context Separation P3 (scope-based key creation)

Files changed:
- cli/src/commands/api-keys.ts (16 endpoints + envelope unwrapping)
- cli/src/commands/mcp.ts (args validation)
```

## Next Steps

1. **Immediate**: Test fixes locally and commit to `claude/slack-session-BwqNa`
2. **P3 Dependency**: File issue to align CLI field shape for platform API keys
   - Need: `scopes`, `organization_id` instead of `keyType`, `projectId`
   - Enables: Context-bound key creation for Memory Context Separation
3. **Documentation**: Update Capstone page or add deprecation banner pointing to canonical spec

## Appendix: Server Route Structure

For reference, the current server routing structure (from `src/server.ts`):

```typescript
// Line 287-288: API key routes mounted at both paths
app.use(`${config.API_PREFIX}/${config.API_VERSION}/keys`, validateProjectScope, alignedAuthMiddleware, apiKeyRoutes);
app.use(`${config.API_PREFIX}/${config.API_VERSION}/api-keys`, validateProjectScope, alignedAuthMiddleware, apiKeyRoutes);

// Where:
// config.API_PREFIX = '/api'
// config.API_VERSION = 'v1'
// Result: Routes available at /api/v1/keys and /api/v1/api-keys
```

## Appendix: CLI URL Construction Pattern

For reference, the CLI's URL construction pattern (from `cli/src/utils/api.ts` and `config.ts`):

```typescript
// config.ts:309-315
getApiUrl(): string {
  const baseUrl = process.env.MEMORY_API_URL ||
    this.config.apiUrl ||
    'https://api.lanonasis.com';
  // Ensure we don't double-append /api/v1 - strip it if present since APIClient adds it
  return baseUrl.replace(/\/api\/v1\/?$/, '');
}

// api.ts:589 - Sets baseURL dynamically
config.baseURL = apiBaseUrl;

// api.ts:747 - Memory operations correctly include full path
async createMemory(data: CreateMemoryRequest): Promise<MemoryEntry> {
  const response = await this.client.post('/api/v1/memories', data);
  return this.normalizeMemoryEntry(response.data);
}
```

**Pattern**: CLI code MUST include the full `/api/v1/...` prefix in the path, because the baseURL has it stripped.
