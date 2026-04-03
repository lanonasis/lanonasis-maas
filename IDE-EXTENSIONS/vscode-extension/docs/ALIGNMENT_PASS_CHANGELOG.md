# Safe Alignment Pass - Change Summary

**Date:** 2026-04-03  
**Scope:** Low-risk, high-confidence alignment fixes  
**Validation:** `npm run lint` passes (1 unrelated warning in MemoryCard.tsx)

---

## 1. Drift Audit Corrections

### File: `docs/EXTENSION_ALIGNMENT_DRIFT_AUDIT.md`

| Change | From | To |
|--------|------|-----|
| Intelligence SDK claim | "SDK underutilization: `@lanonasis/mem-intel-sdk` is a dependency but unused" | "Extension gap: Intelligence capabilities are available in CLI via `@lanonasis/mem-intel-sdk`, but not currently surfaced in the extension UI. The SDK is not an extension dependency." |
| Alignment matrix - mem-intel-sdk | "❌ **Not imported** / **Unused dependency**" | "❌ **Not a dependency** / **CLI-only capability**" |
| Intelligence row | "🔴 **MISSING**" | "🟡 **NOT EXPOSED**" |
| Transport row | "🟡 **DORMANT**" | "🟡 **PARTIAL/UNWIRED**" |

---

## 2. Brief Corrections

### File: `docs/EXTENSION_DRIFT_REMEDIATION_BRIEF.md`

| Change | From | To |
|--------|------|-----|
| EnhancedMemoryService version status | "HTTP header (dormant path)" | "HTTP header (**active path via EnhancedMemoryService**)" |
| Version drift explanation | "The `2.0.5` and `2.0.8` versions are in dormant transport code" | "The `2.0.5` in `EnhancedMemoryService.ts` is **active runtime drift** (EnhancedMemoryService is instantiated by the shipped runtime). The `2.0.8` versions are in dormant transport code that is not instantiated." |
| Intelligence conclusion | "The extension would need to ADD it to expose intelligence features" | "Intelligence features could be exposed via the extension either by adding the SDK dependency or by using other implementation approaches" |
| Phase 2 framing | "Phase 2: Legacy Cleanup (Medium Risk)" / "Risk: Low—files are outside the active build path" | "Phase 2: Legacy Coordinated Cleanup (Medium Risk)" / "Risk: Medium—coordinated deletion required across related files; test coverage must be preserved or migrated" |

---

## 3. Active Runtime Version Alignment

### File: `src/extension.ts`

| Line | Change |
|------|--------|
| 33 | Added `const EXTENSION_VERSION = '2.1.1';` |
| 68 | Changed `userAgent: VSCode/${vscode.version} LanOnasis-Memory/2.0.9` to `userAgent: VSCode/${vscode.version} LanOnasis-Memory/${EXTENSION_VERSION}` |
| 232, 1100 | Changed `'CLI v1.5.2+ detected!'` to `'Compatible CLI detected.'` |
| 1198 | Changed `v3.0.6+` reference to `compatible` |

### File: `src/services/EnhancedMemoryService.ts`

| Line | Change |
|------|--------|
| 5-6 | Added `const EXTENSION_VERSION = '2.1.1';` with TODO comment |
| 605 | Changed `'X-Client-Version': '2.0.5'` to `'X-Client-Version': EXTENSION_VERSION` |

**Impact:** All active runtime version strings now use `2.1.1` (matching package.json) via a constant that can be unified with package.json in a future pass.

---

## 4. Legacy Markers Added

### File: `src/enhanced-extension.ts`

Added header comment (lines 1-14):
- Marks file as `@deprecated LEGACY/REFERENCE FILE`
- Explicitly states it is NOT the shipped entrypoint
- Warns about plaintext API key storage
- Provides safe cleanup guidance

### File: `src/services/SecureApiKeyService.ts`

Added header comment (lines 1-15):
- Marks file as `@deprecated LEGACY AUTH SERVICE`
- States it is NOT used by shipped runtime
- Explains why it is retained (enhanced-extension.ts and tests)
- Provides safe cleanup guidance

---

## 5. Dormant Transport Markers

### File: `src/services/transports/HttpTransport.ts`

| Line | Change |
|------|--------|
| 1-6 | Added header comment noting dormant status and TODO |
| 42 | Changed `'2.0.8'` to `'2.1.1'` with TODO comment |

### File: `src/services/transports/WebSocketTransport.ts`

| Line | Change |
|------|--------|
| 1-6 | Added header comment noting dormant status and TODO |
| 80 | Changed `'2.0.8'` to `'2.1.1'` with TODO comment |

---

## 6. Transport Settings Softened

### File: `package.json`

| Setting | Change |
|---------|--------|
| `lanonasis.transportPreference` | Description prefixed with "**Experimental**:" and "Currently not fully integrated into the active runtime" |
| `lanonasis.websocketUrl` | Description prefixed with "**Experimental**:" and note about transport infrastructure |
| `lanonasis.enableRealtime` | Description prefixed with "**Experimental**:" and note about real-time infrastructure |

---

## 7. README Stale Version Claims Removed

### File: `README.md`

| Location | From | To |
|----------|------|-----|
| Line 5 | "New in v1.4.1" | "Security & Authentication Enhancements" |
| Line 28 | "CLI v3.0.6 Integration" | "CLI Integration" |
| Line 57 | "@lanonasis/cli v3.0.6+" | "Compatible @lanonasis/cli" |
| Line 123 | "CLI Integration Settings (v3.0.6+)" | "CLI Integration Settings" |
| Line 146 | "(NEW in v1.4.1!)" | "(Authentication Commands)" |
| Line 167 | "(v1.4.1+)" | "(Credential Storage)" |

---

## Validation Results

### Commands Run
```bash
cd apps/lanonasis-maas/IDE-EXTENSIONS/vscode-extension
npm run lint
```

### Results
- ✅ No new ESLint errors introduced
- ✅ 1 pre-existing warning (unrelated: MemoryCard.tsx unused import)

### Spot Checks
- ✅ `v1.5.2+` no longer appears in active runtime
- ✅ `v3.0.6+` no longer appears in active runtime
- ✅ `EXTENSION_VERSION` constant used in extension.ts and EnhancedMemoryService.ts
- ✅ Legacy markers present in both legacy files
- ✅ Transport settings marked as Experimental

---

## Files Modified

| File | Changes |
|------|---------|
| `docs/EXTENSION_ALIGNMENT_DRIFT_AUDIT.md` | Corrected intelligence/transport/mem-intel-sdk claims |
| `docs/EXTENSION_DRIFT_REMEDIATION_BRIEF.md` | Corrected version status, intelligence framing, cleanup risk |
| `src/extension.ts` | Version constant, CLI copy fixes |
| `src/services/EnhancedMemoryService.ts` | Version constant, header version fix |
| `src/services/transports/HttpTransport.ts` | Dormant marker, version fix |
| `src/services/transports/WebSocketTransport.ts` | Dormant marker, version fix |
| `src/enhanced-extension.ts` | Legacy header comment |
| `src/services/SecureApiKeyService.ts` | Legacy header comment |
| `package.json` | Transport settings marked experimental |
| `README.md` | Stale version claims removed, VS Code engine version corrected (1.74.0), plaintext storage claim corrected |

---

## Remaining Work (Not in This Pass)

The following were intentionally NOT done in this safe alignment pass:

1. **Delete legacy files** (`enhanced-extension.ts`, `SecureApiKeyService.ts`) - Requires coordinated cleanup
2. **Unify EXTENSION_VERSION with package.json** - Requires build-time constant injection or dynamic import
3. **Integrate TransportManager** - Requires architecture decision
4. **Add intelligence UI** - Requires adding SDK dependency and product decision
5. **CHANGELOG update** - Separate documentation task

---

*Alignment pass complete. All changes are additive (comments, constants) or rephrasing (wording, versions). No destructive cleanup performed.*
