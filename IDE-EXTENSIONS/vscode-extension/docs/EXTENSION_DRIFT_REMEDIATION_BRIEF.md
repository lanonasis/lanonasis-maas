# LanOnasis VSCode Extension: Corrected Drift Remediation Brief

**Date:** 2026-04-03  
**Status:** Evidence-validated  
**Scope:** `apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension`

---

## 1. Confirmed Corrections to Current Plan

### 1.1 Build Configuration Validation

**Claim Verified:** The active runtime is definitively `src/extension.ts`.

**Evidence:**
```javascript
// esbuild.config.mjs:41-49
entryPoints: ['src/extension.ts'],
bundle: true,
format: 'cjs',
outfile: 'out/extension.js',

// package.json:32
"main": "./out/extension.js",
```

**Implication:** `src/enhanced-extension.ts` was not bundled into the shipped extension and has now been removed. The shipped entrypoint remains `src/extension.ts`.

---

### 1.2 Legacy Duplicate SecureApiKeyService Removed

**Current State:** The local duplicate `SecureApiKeyService.ts` and its matching legacy test have now been deleted. The active extension only uses the shared-core implementation.

**Evidence:**
```typescript
// Active runtime uses shared core:
// src/extension.ts:14
import { SecureApiKeyService, createVSCodeAdapter } from '@lanonasis/ide-extension-core';
```

**Status:** Resolved. The coordinated cleanup was completed by deleting:
1. `src/enhanced-extension.ts`
2. `src/services/SecureApiKeyService.ts`
3. `src/services/__tests__/SecureApiKeyService.test.ts`

---

### 1.3 @lanonasis/mem-intel-sdk Is NOT an Extension Dependency

**Claim Corrected:** The extension does NOT have `@lanonasis/mem-intel-sdk` as a dependency.

**Evidence:**
```bash
$ grep "mem-intel-sdk" package.json
# No results

$ grep -r "from.*mem-intel-sdk" src/
# No results
```

**The SDK is only a CLI dependency:**
```json
// cli/package.json:55
"@lanonasis/mem-intel-sdk": "2.1.0"
```

**Correction to Previous Plan:** Intelligence features are not currently exposed in the extension UI. The `@lanonasis/mem-intel-sdk` package provides these capabilities for the CLI, but is not an extension dependency. Adding intelligence features to the extension would require either adding this SDK dependency or implementing equivalent functionality through other means.

---

### 1.4 TransportManager Is Dormant (Not Dead, Not Partial)

**Claim Verified:** `TransportManager` is fully implemented but NEVER instantiated.

**Evidence:**
```bash
$ grep -rn "new TransportManager\|createTransportManager" src/
# No results

// Transport settings exist in package.json:547-566
"lanonasis.transportPreference": { ... }
"lanonasis.websocketUrl": { ... }
"lanonasis.enableRealtime": { ... }
```

**Classification:** DORMANT—not "partial" (it works), not "dead" (it's maintained), but **unwired** into the active runtime.

**Root Cause:** The `EnhancedMemoryService` uses `@lanonasis/memory-client/node` which has its own transport abstraction. The extension-local `TransportManager` was built but never integrated.

---

### 1.5 MCP Discovery Is Status-Only (Not Request Routing)

**Claim Verified:** `MCPDiscoveryService` discovers servers and shows status, but does NOT route memory requests through MCP.

**Evidence:**
```typescript
// src/extension.ts:38-54
let mcpDiscoveryService: MCPDiscoveryService | null = null;
if (enableMCP && mcpAutoDiscover) {
    mcpDiscoveryService = await createMCPDiscoveryService(outputChannel);
    const mcpServer = mcpDiscoveryService.getDiscoveredServer();
    // Only logs and status - no request routing
}

// src/extension.ts:415-435 - Only used for showServerDetails()
vscode.commands.registerCommand('lanonasis.showMCPStatus', async () => {
    if (mcpDiscoveryService) {
        await mcpDiscoveryService.showServerDetails();
    }
});
```

**Correction:** MCP discovery is NOT partial—it does exactly what it was designed to do. The misunderstanding was assuming discovery implies request routing.

---

## 2. Overstatements or Inaccuracies

### 2.1 Overstatement: "Security Risk in Legacy Entrypoint"

**Previous Claim:** `enhanced-extension.ts` was a "security risk" because it stored API keys in plaintext settings.

**Correction:** That source-level concern is now resolved because the dormant legacy entrypoint has been deleted. The original lesson still matters for audit history: the old file was never part of the shipped bundle, so it was always a cleanup issue rather than an active production vuln.

---

### 2.2 Overstatement: "Version Drift Across Runtime Components"

**Previous Claim:** Four different versions causing "debugging chaos."

**Evidence Review:**
| Location | Version | Context |
|----------|---------|---------|
| `package.json:5` | `2.1.1` | Package identity |
| `extension.ts:64` | `2.0.9` | User-agent string |
| `SharedCoreIntegration.ts:47` | `2.0.9` | User-agent string (duplicate) |
| `EnhancedMemoryService.ts:600` | `2.0.5` | HTTP header (**active path via EnhancedMemoryService**) |
| `HttpTransport.ts:39` | `2.0.8` | HTTP header (dormant path) |
| `WebSocketTransport.ts:77` | `2.0.8` | HTTP header (dormant path) |

**Correction:** Only TWO versions matter:
1. `2.1.1` (package) - correct
2. `2.0.9` (active runtime user-agent) - should match package

The `2.0.5` in `EnhancedMemoryService.ts` is **active runtime drift** (EnhancedMemoryService is instantiated by the shipped runtime). The `2.0.8` versions are in dormant transport code that is not instantiated.

---

### 2.3 Inaccuracy: "TransportManager Should Be Deleted"

**Previous Recommendation:** Delete `TransportManager` and transport infrastructure.

**Correction:** This is an **architecture decision**, not a cleanup task. Options:
1. **Integrate** `TransportManager` into `EnhancedMemoryService` for WebSocket MCP support
2. **Delete** if WebSocket MCP is not in the product roadmap
3. **Deprecate** with warning if decision is pending

The transport layer is functional code—deleting it removes the option to enable WebSocket MCP later without rewriting.

---

### 2.4 Inaccuracy: "Intelligence SDK Is an Unused Dependency"

**Previous Claim:** `@lanonasis/mem-intel-sdk` is an unused extension dependency.

**Correction:** The SDK is **not an extension dependency at all**. It is only in the CLI's dependencies. Intelligence features could be exposed via the extension either by adding the SDK dependency or by using other implementation approaches.

---

## 3. Safe Remediation Sequence

### Phase 1: Version Alignment (Low Risk)

| Step | Action | Evidence Target | Verification |
|------|--------|-----------------|--------------|
| 1.1 | Unify user-agent version | `extension.ts:64`, `SharedCoreIntegration.ts:47` | Both derive from `package.json` version |
| 1.2 | Update dormant transport versions | `EnhancedMemoryService.ts:600`, `HttpTransport.ts:39`, `WebSocketTransport.ts:77` | Match package version for consistency |
| 1.3 | Update CLI version references | `extension.ts:232,1100,1198` | Reference actual minimum tested version |

**Risk:** None (string changes only)

---

### Phase 2: Legacy Coordinated Cleanup (Medium Risk)

**Prerequisite:** Verify no build scripts or imports reference the legacy files.

| Step | Action | Dependencies | Verification |
|------|--------|--------------|--------------|
| 2.1 | Delete `src/enhanced-extension.ts` | Completed | Extension still builds successfully |
| 2.2 | Delete `src/services/SecureApiKeyService.ts` | Completed | Shared-core auth is sole implementation |
| 2.3 | Delete `src/services/__tests__/SecureApiKeyService.test.ts` | Completed | Test suite passes on the remaining active test surface |

**Risk:** Medium—coordinated deletion required across related files; test coverage must be preserved or migrated

---

### Phase 3: Transport Decision (Requires Architecture Input)

| Step | Action | Decision Required | Verification |
|------|--------|-------------------|--------------|
| 3.1 | Evaluate WebSocket MCP priority | Product/Architecture | Decision documented |
| 3.2a | If YES: Integrate TransportManager | Engineering | Transport settings affect runtime |
| 3.2b | If NO: Deprecate transport settings | Engineering | Settings show deprecation warning |

**Risk:** Medium—requires product decision

---

### Phase 4: Documentation Alignment (Low Risk)

| Step | Action | Target Files | Verification |
|------|--------|--------------|--------------|
| 4.1 | Sync README version | `README.md:5` | Claims v2.1.1 (matching package) |
| 4.2 | Document CLI minimum version | `README.md:54-58` | Matches tested minimum |
| 4.3 | Document config precedence | New doc or README | SecretStorage > settings > env |
| 4.4 | Document refine endpoint settings | `README.md` | `refineEndpoint`, `refineApiKey` explained |

**Risk:** None (documentation only)

---

## 4. Open Questions Requiring Product/Architecture Decisions

### Q1: TransportManager Fate
**Options:**
- **A) Integrate:** Wire `TransportManager` into `EnhancedMemoryService` for WebSocket MCP routing
- **B) Deprecate:** Mark transport settings as deprecated, plan removal
- **C) Status Quo:** Keep dormant with no changes

**Information Needed:**
- Is WebSocket MCP a Q2/Q3 priority?
- Does `@lanonasis/memory-client/node` support WebSocket, or do we need extension-local transport?

**Recommendation:** Decision required before Phase 3. If no decision by end of quarter, default to (B) deprecation.

---

### Q2: CLI Minimum Version Contract
**Current State:**
- Active runtime and README now use generic "compatible CLI" wording
- Actual CLI: v3.9.13

**Question:** What is the actual minimum CLI version the extension requires?

**Information Needed:**
- Test matrix: Does extension work with CLI v2.x?
- Does extension work with CLI v3.0.x?
- What CLI version introduced the "golden contract" capabilities?

**Recommendation:** Test and document actual minimum before updating version strings.

---

### Q3: Intelligence SDK Integration
**Current State:**
- CLI has 10+ intelligence commands
- Extension has 0 intelligence commands
- Extension does NOT have `@lanonasis/mem-intel-sdk` dependency

**Question:** Should intelligence features be added to the extension?

**Information Needed:**
- Product priority for IDE intelligence features
- Dependency size impact of `@lanonasis/mem-intel-sdk`
- Design resources for intelligence UI

**Recommendation:** If YES, add dependency and command palette actions. If NO, document CLI as intelligence interface.

---

### Q4: Session Taxonomy Resolution
**Current State:**
- Extension: "Chat sessions" (local, webview state)
- CLI: "Saved sessions" (MaaS-backed, `save-session` command)

**Question:** Are these the same concept or different?

**Options:**
- **A) Rename:** Call extension "chat history" to avoid confusion
- **B) Integrate:** Add CLI session commands to extension
- **C) Converge:** Make chat sessions MaaS-persistent

**Recommendation:** Product decision on session sharing between IDE and CLI workflows.

---

## 5. Optional Follow-On Implementation Plan

### Option A: Conservative (Documentation + Cleanup Only)

**Scope:**
- Phase 1: Version alignment
- Phase 2: Legacy cleanup
- Phase 4: Documentation alignment

**Effort:** ~2 days
**Risk:** Minimal
**Outcome:** Clean codebase, accurate docs, no behavioral changes

---

### Option B: Moderate (Add Intelligence Commands)

**Scope:**
- Conservative scope PLUS:
- Add `@lanonasis/mem-intel-sdk` dependency
- Add 3-5 command palette intelligence commands:
  - `lanonasis.findRelatedMemories`
  - `lanonasis.detectDuplicates`
  - `lanonasis.extractInsights`

**Effort:** ~1 week
**Risk:** Low (additive only)
**Outcome:** Feature parity with CLI for power users

---

### Option C: Ambitious (Full Transport Integration)

**Scope:**
- Moderate scope PLUS:
- Integrate `TransportManager` into active runtime
- Enable WebSocket MCP routing
- Deprecate or remove CLI-only transport paths

**Effort:** ~2-3 weeks
**Risk:** Medium (changes request routing)
**Outcome:** WebSocket real-time updates, unified transport layer

---

## 6. Evidence Summary

### Active Runtime (Shipped)
| Component | Entry Point | Key Imports |
|-----------|-------------|-------------|
| Extension | `src/extension.ts` | `@lanonasis/ide-extension-core`, `@lanonasis/memory-client` |
| Memory Service | `EnhancedMemoryService.ts` | `@lanonasis/memory-client/node` |
| Auth | Shared core | `SecureApiKeyService` from `@lanonasis/ide-extension-core` |
| MCP | `MCPDiscoveryService.ts` | Status/discovery only |

### Legacy Code (Not Shipped)
| Component | File | Issue |
|-----------|------|-------|
| Entry point | `src/extension.ts` | Sole shipped/runtime entrypoint |
| Auth | `@lanonasis/ide-extension-core` | Sole auth implementation |
| Tests | `tsconfig.test.json` + Vitest suite | Active test surface only |

### Dormant Code (Present but Unexecuted)
| Component | File | Status |
|-----------|------|--------|
| Transport | `TransportManager.ts` | Fully implemented, never instantiated |
| HTTP Transport | `HttpTransport.ts` | Referenced only by TransportManager |
| WebSocket Transport | `WebSocketTransport.ts` | Referenced only by TransportManager |

### Version Strings (Evidence)
```
esbuild.config.mjs:41  → entryPoints: ['src/extension.ts']
package.json:5         → "version": "2.1.1"
package.json:32        → "main": "./out/extension.js"

extension.ts:64        → userAgent: `VSCode/${vscode.version} LanOnasis-Memory/2.0.9`
SharedCoreIntegration.ts:47 → userAgent: `VSCode/${vscode.version} LanOnasis-Memory/2.0.9`
EnhancedMemoryService.ts:600 → 'X-Client-Version': '2.0.5'
HttpTransport.ts:39    → 'X-Client-Version': '2.0.8'
WebSocketTransport.ts:77 → 'X-Client-Version': '2.0.8'

cli/package.json:3     → "version": "3.9.13"
```

### Dependency Evidence
```
extension package.json dependencies:
- @lanonasis/ide-extension-core
- @lanonasis/memory-client
- (NO mem-intel-sdk)

cli package.json dependencies:
- @lanonasis/mem-intel-sdk: 2.1.0
```

---

## 7. Validation Checklist

Before implementation, verify:

- [x] Build script inspection confirms the legacy entrypoint was excluded before deletion
- [x] Legacy local-auth test inventory removed from the extension package
- [ ] Decision recorded: TransportManager fate (integrate/deprecate/keep)
- [ ] CLI version matrix: Document tested CLI versions
- [ ] Product decision: Intelligence SDK integration priority
- [ ] Product decision: Session taxonomy (chat vs saved sessions)

---

*Brief validated against current source. All claims backed by line-numbered evidence.*
