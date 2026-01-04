# CLI Dependency & Backward Compatibility Strategy

## Current Status

### CLI Version
- **Current CLI**: `@lanonasis/cli` v3.6.7
- **Minimum Required**: v1.5.2 (for basic integration)
- **Recommended**: v3.0.6+ (for full features)

### Extension Versions
- **VSCode**: v1.5.5 (just updated)
- **Cursor**: v1.4.5 (just updated)
- **Windsurf**: v1.4.5 (just updated)

## Dependency Architecture

### ✅ Correct Approach (Current Implementation)

The extensions use **runtime detection** rather than package dependencies:

```
IDE Extension
  └── @lanonasis/memory-client (SDK)
       └── child_process (optional dependency)
            └── Detects CLI at runtime
                 ├── onasis --version
                 └── lanonasis --version
```

**Benefits**:
- ✅ **Backward Compatible**: Works without CLI installed
- ✅ **No Version Lock**: Users can upgrade CLI independently
- ✅ **Graceful Degradation**: Falls back to direct API if CLI unavailable
- ✅ **Smaller Bundle**: CLI not bundled with extension
- ✅ **User Choice**: Users install CLI separately if they want enhanced features

### ❌ Wrong Approach (Not Used)

Adding CLI as a package dependency would be problematic:

```json
{
  "dependencies": {
    "@lanonasis/cli": "^3.6.7"  // ❌ DON'T DO THIS
  }
}
```

**Problems**:
- ❌ Bloats extension size significantly
- ❌ Forces specific CLI version
- ❌ Breaks backward compatibility
- ❌ Complicates updates
- ❌ May cause conflicts with user's global CLI

## Version Reference Inconsistencies

### Issue Found

Different version numbers mentioned across extensions:

| Location | Version Mentioned | Status |
|----------|------------------|--------|
| VSCode extension | v3.0.6+ | ✅ More accurate |
| Cursor extension | v1.5.2+ | ⚠️ Too old |
| Windsurf extension | v1.5.2+ | ⚠️ Too old |
| Memory-client SDK | v1.5.2 (minCLIVersion) | ⚠️ Too old |

### Recommended Fix

Update all references to use consistent versioning:

- **Minimum**: v1.5.2 (basic CLI integration works)
- **Recommended**: v3.0.6+ (full feature set)
- **Current**: v3.6.7 (latest with all enhancements)

## How CLI Integration Works

### 1. Detection Phase (Startup)

```typescript
// In @lanonasis/memory-client
async detectCLI(): Promise<CLIInfo> {
  try {
    // Try 'onasis' first (newer)
    const { stdout } = await execAsync('onasis --version');
    return { available: true, version: parseVersion(stdout) };
  } catch {
    // Fallback to 'lanonasis' (legacy)
    const { stdout } = await execAsync('lanonasis --version');
    return { available: true, version: parseVersion(stdout) };
  }
}
```

### 2. Capability Detection

```typescript
const capabilities = {
  cliAvailable: true/false,
  mcpSupport: true/false,      // v1.5.2+
  authenticated: true/false,
  goldenContract: true/false,  // v3.0.6+
  version: '3.6.7'
};
```

### 3. Operation Routing

```typescript
async createMemory(data) {
  if (capabilities.cliAvailable && capabilities.authenticated) {
    // Use CLI for enhanced performance
    return await cliIntegration.executeCLICommand('memory create', data);
  } else {
    // Fallback to direct API
    return await apiClient.post('/api/v1/memory', data);
  }
}
```

## User Experience

### Without CLI Installed

```
User installs extension
  ↓
Extension detects: No CLI
  ↓
Uses direct API calls
  ↓
✅ Everything works (slower but functional)
```

### With CLI Installed

```
User installs extension
  ↓
Extension detects: CLI v3.6.7
  ↓
Uses CLI for operations
  ↓
✅ Enhanced performance + MCP support
```

### CLI Installation (Optional)

Users can install CLI anytime:

```bash
# Global installation
npm install -g @lanonasis/cli

# Or using npx (no installation)
npx @lanonasis/cli login
```

## Version Compatibility Matrix

| CLI Version | Basic Features | MCP Support | Golden Contract | OAuth | Recommended |
|-------------|---------------|-------------|-----------------|-------|-------------|
| None | ✅ | ❌ | ❌ | ✅ | For basic use |
| v1.5.2 | ✅ | ✅ | ❌ | ✅ | Minimum |
| v3.0.6 | ✅ | ✅ | ✅ | ✅ | Recommended |
| v3.6.7 | ✅ | ✅ | ✅ | ✅ | Latest |

## Recommended Updates

### 1. Update VSCode Extension Description

```json
{
  "description": "Memory as a Service integration - AI-powered memory management with semantic search (Enhanced with CLI v3.0.6+)"
}
```

### 2. Update Cursor Extension

```json
{
  "lanonasis.preferCLI": {
    "description": "Prefer CLI integration when @lanonasis/cli v3.0.6+ is available"
  }
}
```

### 3. Update Windsurf Extension

```json
{
  "lanonasis.preferCLI": {
    "description": "Prefer CLI integration when @lanonasis/cli v3.0.6+ is available"
  }
}
```

### 4. Update Memory-Client SDK

```typescript
const defaults: EnhancedMemoryClientConfig = {
  minCLIVersion: '3.0.6',  // Update from '1.5.2'
  // ... rest of config
};
```

## Documentation Updates Needed

### README Files

Update all extension READMEs to clarify:

1. **CLI is optional** - Extension works without it
2. **Recommended version** - v3.0.6+ for full features
3. **Installation instructions** - How to install CLI
4. **Feature comparison** - What you get with/without CLI

### Example README Section

```markdown
## CLI Integration (Optional)

The extension works great on its own, but you can unlock enhanced performance by installing the Lanonasis CLI:

### Without CLI
- ✅ All core features work
- ✅ OAuth authentication
- ✅ Memory management
- ⚠️ Slower API calls

### With CLI (v3.0.6+)
- ✅ All core features
- ✅ OAuth authentication  
- ✅ Memory management
- ✅ **Faster operations** (CLI routing)
- ✅ **MCP support** (Model Context Protocol)
- ✅ **Enhanced caching**

### Installation

```bash
npm install -g @lanonasis/cli@latest
onasis login
```

The extension will automatically detect and use the CLI if available.
```

## Testing Strategy

### Test Matrix

| Scenario | Expected Behavior |
|----------|------------------|
| No CLI installed | ✅ Works via direct API |
| CLI v1.5.2 | ✅ Basic CLI integration |
| CLI v3.0.6 | ✅ Full features |
| CLI v3.6.7 | ✅ Latest features |
| CLI not authenticated | ✅ Falls back to API |
| CLI authentication expires | ✅ Graceful fallback |

## Summary

**Current Implementation**: ✅ **CORRECT**

- CLI is **optional enhancement**, not a dependency
- Extensions work perfectly without CLI
- Runtime detection provides graceful degradation
- Users can install/upgrade CLI independently
- No version lock-in or compatibility issues

**Action Items**:

1. ✅ Version bumped to 1.5.5 (VSCode), 1.4.5 (Cursor/Windsurf)
2. ⏳ Update version references from v1.5.2 to v3.0.6+ in docs
3. ⏳ Clarify CLI is optional in all READMEs
4. ⏳ Update memory-client minCLIVersion to 3.0.6

The dependency strategy is sound - no changes needed to the architecture, just documentation updates for consistency.
