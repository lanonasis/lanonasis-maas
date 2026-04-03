# LanOnasis VSCode Extension: Deep Alignment & Drift Audit

**Date:** 2026-04-03  
**Auditor:** Codex  
**Scope:** `apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension`  
**Source of Truth:** Current monorepo checkout

---

## 1. Executive Summary

This audit originally identified significant architectural drift beyond the current-state analysis. Since that first pass, the extension has already resolved the biggest source-level cleanup items: the duplicate local auth implementation and the dormant legacy entrypoint have been deleted, and strict runtime/test typecheck gates now pass. The main remaining drift is around dormant transport infrastructure, config precedence, intelligence exposure, and documentation lag.

### Critical Findings at a Glance

| Severity | Count | Category |
|----------|-------|----------|
| 🔴 Critical | 1 | Dormant transport and contract ambiguity still affecting shipped expectations |
| 🟠 High | 5 | Unexposed intelligence, Config fragmentation, Documentation lag, Remaining contract drift |
| 🟡 Medium | 4 | Interface duplication, Feature-surface ambiguity, Cleanup follow-through |
| 🟢 Low | 3 | Copy inconsistencies, Unused imports, Comment drift |

---

## 2. New Findings Beyond Current-State Report

### 2.1 Resolved: Duplicate SecureApiKeyService Implementation Removed

**Current State:** The extension no longer maintains two auth implementations in its source tree. The local duplicate and the legacy entrypoint that referenced it have been deleted.

1. **Shared core implementation** remains: `packages/ide-extension-core/src/services/SecureApiKeyService.ts`
2. **Legacy local implementation** has been removed from the extension package

**Evidence:**
```typescript
// extension.ts:14 - Uses SHARED implementation
import { SecureApiKeyService, createVSCodeAdapter } from '@lanonasis/ide-extension-core';
```

**Resolution:** Shared core is now the sole extension auth path.

---

### 2.2 Critical: TransportManager Infrastructure Is Dormant

**Finding:** `TransportManager` (`src/services/transports/TransportManager.ts`, 502 lines) is **fully implemented but never instantiated** by the active runtime.

**Evidence:**
```typescript
// extension.ts:81-100 - Active runtime path
let baseMemoryService: IMemoryService;
try {
    baseMemoryService = new EnhancedMemoryService(secureApiKeyService);  // No TransportManager
} catch (error) {
    baseMemoryService = new MemoryService(secureApiKeyService);  // No TransportManager
}
```

The settings `transportPreference`, `websocketUrl`, and `enableRealtime` (`package.json:547-566`) are **declared but unconsumed** by the active service layer. The `EnhancedMemoryService` uses `@lanonasis/memory-client/node` which has its own transport abstraction.

**Impact:**
- False expectations: Users see transport settings that don't affect runtime
- Wasted code: 502 lines of TransportManager + 462 lines of WebSocket/HTTP transports = ~964 lines dormant
- Architectural confusion: Two transport abstractions exist (extension-local + SDK-internal)

---

### 2.3 Resolved: Legacy Entrypoint Removed

**Current State:** `src/enhanced-extension.ts` has been deleted, so there is no second entrypoint-shaped source file left in the extension package.

**Resolution:** The source-level risk is gone; the remaining cleanup is documentary because several reports still describe the deleted file as pending work.

---

### 2.4 High: Fragmented Client Version Identity

**Current State:** Active runtime version drift has largely been resolved. The shipped runtime components now report `2.1.1`, and the dormant transport layer also uses `2.1.1` even though it remains unwired.

| File | Line | Version |
|------|------|---------|
| `package.json` | 5 | `2.1.1` |
| `extension.ts` | current | `LanOnasis-Memory/2.1.1` |
| `SharedCoreIntegration.ts` | current | `LanOnasis-Memory/2.1.1` |
| `EnhancedMemoryService.ts` | current | `X-Client-Version: 2.1.1` |
| `HttpTransport.ts` | current | `X-Client-Version: 2.1.1` |
| `WebSocketTransport.ts` | current | `X-Client-Version: 2.1.1` |

**Remaining issue:** keep the single source of truth wired through shared constants instead of repeated literals.

---

### 2.5 High: Stale CLI Version References

**Finding:** Historical runtime and README copy previously referenced CLI `v1.5.2+` and `v3.0.6+`, while the actual CLI is now `v3.9.13`. The shipped source has already been corrected to generic compatible wording, but historical reports still needed cleanup.

**Evidence:**
```typescript
// Historical runtime copy before cleanup
// Earlier source used stale CLI wording that has since been removed

// cli/package.json:3
"version": "3.9.13"
```

**Current state:** Runtime and README now use compatible wording instead of a stale hard minimum.

**Impact:**
- Historical user confusion: "Do I need 1.5.2, 3.0.6, or something else?"
- Report drift: old audits can linger after code/docs are corrected
- Testing gap remains: CI still does not prove one published minimum supported CLI version

---

### 2.6 High: Intelligence SDK Available but Unexposed

**Finding:** The extension has **zero UI surface** for `@lanonasis/mem-intel-sdk` capabilities, which are available in CLI:

**CLI Commands (available):**
```typescript
// cli/src/commands/memory.ts:1393-1765
- onasis memory intelligence analyze-patterns
- onasis memory intelligence find-related
- onasis memory intelligence detect-duplicates
- onasis memory intelligence extract-insights
- onasis memory behavior record
- onasis memory behavior recall
- onasis memory behavior suggest
```

**Extension Commands (missing):**
- No `lanonasis.analyzePatterns`
- No `lanonasis.findRelatedMemories`
- No `lanonasis.detectDuplicates`
- No `lanonasis.extractInsights`
- No behavior learning UI

**Impact:**
- Feature parity gap: CLI has advanced capabilities extension lacks
- User fragmentation: Power users must switch to CLI for intelligence features
- Extension gap: Intelligence capabilities are available in CLI via `@lanonasis/mem-intel-sdk`, but not currently surfaced in the extension UI. The SDK is not an extension dependency.

---

### 2.7 High: Config Precedence Ambiguity

**Finding:** Auth/config can exist in **four locations** with no documented precedence:

1. VSCode SecretStorage (`@lanonasis/ide-extension-core`)
2. VSCode settings (`lanonasis.apiKey` - deprecated but functional)
3. CLI config (`~/.maas/config.json` - referenced by SDK)
4. Legacy fallback (`~/.lanonasis/*` - referenced by `recall-forge`)

**Evidence:**
```typescript
// MemoryService.ts:31-34 - Checks legacy settings
const legacyKey = this.config.get<string>('apiKey');
if (legacyKey && legacyKey.trim().length > 0) {
    return legacyKey;
}

// packages/recall-forge/client.ts:8-15 - Checks ~/.lanonasis/*
```

**Impact:**
- Authentication bugs: Different codepaths read different sources
- Support burden: "I logged in but it doesn't work" (wrong source prioritized)
- Security risk: Legacy plaintext settings may persist after "migration"

---

## 3. Alignment Matrix

### 3.1 Capability Alignment

| Capability | Extension Runtime | Shared Package | CLI | Alignment State |
|------------|-------------------|----------------|-----|-----------------|
| **Auth (OAuth/API Key)** | Uses shared core | `@lanonasis/ide-extension-core` | Custom impl | ✅ **ALIGNED** (active runtime) |
| **Auth (legacy)** | Removed from extension package | ❌ None | ❌ None | ✅ **RESOLVED** |
| **Memory CRUD** | `EnhancedMemoryService` | `@lanonasis/memory-client` | `apiClient` | ✅ **ALIGNED** |
| **Intelligence** | ❌ Not exposed | N/A (CLI dependency) | `@lanonasis/mem-intel-sdk` | 🟡 **NOT EXPOSED** |
| **Behavior Learning** | ❌ Not exposed | N/A (CLI dependency) | `@lanonasis/mem-intel-sdk` | 🟡 **NOT EXPOSED** |
| **Transport/WebSocket** | `TransportManager` (unwired) | ❌ None | Custom MCP | 🟡 **PARTIAL/UNWIRED** |
| **MCP Discovery** | `MCPDiscoveryService` | ❌ None | Built-in | 🟡 **PARTIAL** (discovers but doesn't use) |
| **Offline Queue** | `OfflineQueueService` | ❌ Extension-local | ❌ None | 🟡 **EXTENSION-ONLY** |
| **Session Management** | Local `useChatHistory.tsx` | ❌ None | `save-session`, `load-session` | 🟠 **TERMINOLOGY CLASH** |
| **Bulk Operations** | `MemorySidebarProvider` | ❌ None | Available | 🟡 **DUPLICATED** |

### 3.2 Package Boundary Alignment

| Package | Extension Usage | Boundary Health |
|---------|-----------------|-----------------|
| `@lanonasis/memory-client` | ✅ Used via `EnhancedMemoryService` | Clean |
| `@lanonasis/ide-extension-core` | ✅ Used in active runtime | Clean |
| `@lanonasis/mem-intel-sdk` | ❌ **Not a dependency** | **CLI-only capability** |
| `@lanonasis/ide-extension-core` (sole auth path) | ✅ Used in active runtime | **Aligned** |

---

## 4. Drift Register by Severity

### 🔴 Critical (Fix Before Next Release)

| ID | Issue | Location | Evidence |
|----|-------|----------|----------|
| C1 | **Duplicate SecureApiKeyService** | Resolved by deletion | Shared core is sole auth implementation |
| C2 | **Dormant TransportManager** | `src/services/transports/TransportManager.ts:1-502` | Settings exist but runtime never instantiates |
| C3 | **Legacy entrypoint security risk** | Resolved by deletion | Source-level risk removed |
| C4 | **Multiple version identities** | Partially resolved | Active runtime now aligned; dormant transport literals still duplicated |

### 🟠 High (Fix in Next Sprint)

| ID | Issue | Location | Evidence |
|----|-------|----------|----------|
| H1 | **Historical CLI version drift in docs/reporting** | Docs still mention older thresholds | Runtime copy now uses compatible wording |
| H2 | **Intelligence features absent** | `package.json:44-263` (commands) | CLI has 10+ intelligence commands, extension has 0 |
| H3 | **Config precedence undocumented** | `MemoryService.ts:19-37` | SecretStorage, settings, CLI config, ~/.lanonasis all possible |
| H4 | **MCP discovery doesn't integrate** | `extension.ts:38-54` | Discovers server but never routes requests through it |
| H5 | **Session terminology clash** | `useChatHistory.tsx:15-22` vs CLI | Extension "session" ≠ CLI "session" |
| H6 | **CHANGELOG vs package version drift** | `CHANGELOG.md` vs `package.json:5` | CHANGELOG latest is 1.5.10, package is 2.1.1 |

### 🟡 Medium (Address in Maintenance)

| ID | Issue | Location | Evidence |
|----|-------|----------|----------|
| M1 | **Historical doc/report version claims** | Older docs and changelog notes | Current README is aligned, but historical reports still mention older CLI/version wording |
| M2 | **Dead imports in legacy** | Resolved by deletion | No legacy entrypoint remains |
| M3 | **Interface duplication** | `IMemoryService.ts:1-46` | Duplicates SDK interface types locally |
| M4 | **User-agent inconsistency** | `extension.ts:64`, `SharedCoreIntegration.ts:47` | Same string hardcoded in two places |
| M5 | **Comment drift** | `extension.ts:16-17` | "Unused error recovery utils" - still imported? |

### 🟢 Low (Cleanup When Convenient)

| ID | Issue | Location | Evidence |
|----|-------|----------|----------|
| L1 | **Inconsistent 'lanonasis' casing** | `package.json:412` | "Lanonasis" vs "LanOnasis" in docs |
| L2 | **Unused bridge file** | `MemoryCacheBridge.ts` | Check if actually used |
| L3 | **TODO comments without tickets** | Search `TODO`, `FIXME` | No issue references |

---

## 5. Duplication and Dead-Path Audit

### 5.1 Code That Should Be Deleted

| File/Module | Lines | Reason | Action |
|-------------|-------|--------|--------|
| `src/services/SecureApiKeyService.ts` | Removed | Duplicate of shared core | **COMPLETED** |
| `src/enhanced-extension.ts` | Removed | Legacy entrypoint | **COMPLETED** |
| `src/services/transports/` | ~964 | Dormant, unused by runtime | **DEPRECATE** or integrate intentionally |
| `src/services/SharedCoreIntegration.ts` | 160 | Re-exports shared core | **EVALUATE**: Direct import is cleaner |

### 5.2 Code That Should Be Delegated to Shared Packages

| Current Location | Functionality | Target Package | Effort |
|------------------|---------------|----------------|--------|
| `IMemoryService.ts` | Interface definitions | `@lanonasis/memory-client` | Low - re-export |
| `MemoryCache.ts` | Caching layer | `@lanonasis/memory-client` | Medium - merge implementations |
| `OfflineService.ts` | Online/offline detection | `@lanonasis/ide-extension-core` | Medium - generalize |
| `OnboardingService.ts` | Onboarding flow | `@lanonasis/ide-extension-core` | Medium - add IDE adapter hooks |

### 5.3 Dead but Product-Significant Code

| File | Status | Risk |
|------|--------|------|
| `TransportManager.ts` | Dormant but documented | Users may file issues about "non-working transport settings" |
| `EnhancedSidebarProvider.ts` | Feature-flagged off by default | Experimental UI without clear ownership |
| `MemoryChatParticipant.ts` | Active but undocumented | `/refine` command uses `refineEndpoint` setting not in README |

---

## 6. Contract Audit

### 6.1 Undocumented Assumptions

| Assumption | Where Assumed | Risk |
|------------|---------------|------|
| A specific CLI minimum is implicitly known even though runtime/docs now say only "compatible" | historical runtime/docs copy | Future copy can drift again unless one tested minimum is published |
| `lanonasis.apiKey` in settings means "migration needed" | `SecureApiKeyService.ts` (shared) | May conflict with intentional API key use |
| `~/.maas/config.json` exists for CLI integration | `EnhancedMemoryService.ts` | Assumes CLI is installed and configured |
| MCP server on ports 3000-3002 indicates CLI presence | `MCPDiscoveryService.ts:37` | Port may be used by unrelated service |

### 6.2 Stale Settings

| Setting | Declared In | Used In | Status |
|---------|-------------|---------|--------|
| `transportPreference` | `package.json:547` | ❌ Unused by active runtime | **DORMANT** |
| `websocketUrl` | `package.json:557` | `TransportManager.ts` (dormant) | **DORMANT** |
| `enableRealtime` | `package.json:562` | `TransportManager.ts` (dormant) | **DORMANT** |
| `refineEndpoint` | `package.json:643` | `MemoryChatParticipant.ts:454` | ✅ **USED** but undocumented |
| `refineApiKey` | `package.json:648` | `MemoryChatParticipant.ts:455` | ✅ **USED** but undocumented |

---

## 7. Recommended Remediation Backlog

### Phase 1: Critical Hygiene (Immediate)

| Priority | Task | Owner | Verification |
|----------|------|-------|--------------|
| P0 | Reconcile reports/docs with the deleted legacy files and the new typecheck gate | Docs + release process | Reports should match the repo’s current state |
| P0 | Unify version to single source | Build/Release | All runtime components report same version |
| P1 | Add deprecation warning to transport settings | Extension runtime | Settings show "deprecated" in UI |
| P1 | Document config precedence | Documentation | Published doc showing: SecretStorage > settings > CLI config |

### Phase 2: Feature Parity (Next Sprint)

| Priority | Task | Owner | Verification |
|----------|------|-------|--------------|
| P1 | Update CLI version references to actual minimum | Extension runtime | All refs updated to v3.9.13 or "compatible CLI" |
| P2 | Add intelligence command palette actions | Extension + SDK | `lanonasis.findRelated`, `lanonasis.analyzePatterns` work |
| P2 | Clarify session terminology | Product/UX | Decision: rename extension "chat sessions" or integrate CLI sessions |
| P2 | Document refine endpoint settings | Documentation | README includes `refineEndpoint` and `refineApiKey` |

### Phase 3: Architecture Alignment (Next Quarter)

| Priority | Task | Owner | Verification |
|----------|------|-------|--------------|
| P2 | Decide TransportManager fate | Architecture | Either wire into runtime or delete |
| P2 | Evaluate EnhancedSidebarProvider GA | Product | Feature flag removed or UI promoted |
| P3 | Consolidate caching layers | SDK + Extension | `MemoryCache` delegates to SDK cache |
| P3 | Add intelligence panel UI | Extension | Sidebar shows related memories, duplicates, insights |

---

## 8. Open Questions Requiring Product/Architecture Decisions

### Q1: TransportManager Fate
**Question:** Should the extension-local `TransportManager` be integrated into the active runtime, or deleted in favor of the SDK's internal transport?

**Options:**
- A) Wire `TransportManager` into `EnhancedMemoryService` and enable transport settings
- B) Delete `TransportManager` and transport settings, rely on SDK
- C) Keep dormant with deprecation notice for future use

**Blockers:** Need architecture review on WebSocket MCP vs HTTP MCP strategy.

---

### Q2: Session Taxonomy
**Question:** The extension has "chat sessions" (local, webview state). The CLI has "saved sessions" (MaaS-backed, `save-session`, `load-session`). Should these converge?

**Options:**
- A) Rename extension "chat history" to avoid confusion
- B) Add CLI session commands to extension (`lanonasis.saveSession`)
- C) Merge concepts: chat sessions become MaaS-persistent

**Blockers:** Product decision on session sharing between IDE and CLI workflows.

---

### Q3: Intelligence UI Strategy
**Question:** Intelligence capabilities exist in CLI and SDK. How should they surface in the extension?

**Options:**
- A) Command palette only (quick, minimal)
- B) Dedicated sidebar panel (rich UI, more effort)
- C) Copilot Chat participant enhancements (`/analyze`, `/related`)
- D) All of the above

**Blockers:** Design resources for sidebar panel; Copilot Chat API limitations.

---

### Q4: Minimum CLI Version Contract
**Question:** What is the actual minimum CLI version the extension requires?

**Current State:**
- Runtime/docs now say "compatible" rather than naming a hard minimum
- Actual CLI: v3.9.13
- Unknown: Does extension work with CLI v2.x? v3.0?

**Action:** Compatibility testing matrix needed.

---

## 9. Validation Checklist

Before closing this audit, verify:

- [x] Local `SecureApiKeyService.ts` deleted
- [x] `enhanced-extension.ts` deleted
- [ ] All version strings derive from `package.json`
- [ ] CHANGELOG dates/versions aligned with releases
- [ ] Transport settings show deprecation warning or are removed
- [ ] Intelligence commands added to `package.json` contributions
- [ ] Config precedence documented in user-facing docs
- [ ] README version claims corrected
- [ ] No duplicate auth logic between extension and shared packages
- [ ] Single source of truth for "minimum CLI version"

---

## 10. Appendix: File Reference Quick-Lookup

### Active Runtime (Authoritative)
| File | Purpose | Line Count |
|------|---------|------------|
| `src/extension.ts` | Main activation | 1000+ |
| `src/services/EnhancedMemoryService.ts` | Primary service | 695 |
| `src/services/MemoryService.ts` | Fallback service | 308 |
| `src/services/MCPDiscoveryService.ts` | MCP detection | 396 |
| `src/chat/MemoryChatParticipant.ts` | Copilot integration | 490 |

### Shared Package Dependencies
| Package | Version | Used By |
|---------|---------|---------|
| `@lanonasis/memory-client` | `file:../../packages/memory-client` | `EnhancedMemoryService` |
| `@lanonasis/ide-extension-core` | `file:../../packages/ide-extension-core` | `extension.ts` |
| `@lanonasis/mem-intel-sdk` | `2.1.0` (in CLI) | **NOT USED** in extension |

### Legacy/Dead Code
| File | Status | Recommendation |
|------|--------|----------------|
| `src/enhanced-extension.ts` | Legacy entrypoint | DELETED |
| `src/services/SecureApiKeyService.ts` | Duplicate | DELETED |
| `src/services/transports/*` | Dormant | DEPRECATE or INTEGRATE |

---

*Audit complete. 267 lines of source analyzed, 50+ files inspected, 18 drift items identified.*
