# lanonasis-maas Reorganization Plan

**Date**: December 29, 2025  
**Status**: Ready to Execute  
**Based on**: `MONOREPO_REORGANIZATION_PLAN.md`

---

## Overview

This plan provides a systematic approach to reorganizing the `apps/lanonasis-maas` codebase. The reorganization will:

1. ✅ Clean up the root directory (currently 57 files)
2. ✅ Group documentation by domain
3. ✅ Archive historical fix summaries
4. ✅ Organize scripts by purpose
5. ✅ Maintain canonical references for active development
6. ✅ Improve discoverability and maintainability
7. ✅ Preserve 100% functionality with easy referencing

---

## Current State Analysis

### Root Directory Issues

- **57 files** in the root directory
- Mix of active docs, historical fixes, and scripts
- Difficult to find relevant documentation
- No clear organization

### File Inventory

**Documentation** (46 MD files):
- VSCODE_EXTENSION_REVIEW.md
- OAUTH_FIX_v3.0.13.md
- SCHEMA_ALIGNMENT_ANALYSIS.md
- MULTI_PATTERN_AUTH_FIX_SUMMARY.md
- API_FIX_GUIDE.md
- CHECKPOINT_CLI_SECURITY_MILESTONE.md
- CLI_DEPLOYMENT_PLAN.md
- ISSUES_31-36_REVIEW_AND_REFINEMENT.md
- ISSUES_31-36_REFINEMENTS_APPLIED.md
- REORGANIZATION_PLAN.md
- UPDATE_README.md
- CLI_V3.0.3_DEPLOYMENT.md
- PR_COMPILATION_FIXES.md
- AUTH_FIX.md
- MCP_CLI_INTEGRATION_PLAN.md
- PHASE_2_COMPLETION_SUMMARY.md
- VSCODE_EXTENSION_UPDATES_APPLIED.md
- UNIVERSAL_SDK_MIGRATION_SUMMARY.md
- PR28_ANALYSIS.md
- TRANSPORT_CONFIGURATION.md

**Scripts** (11 files):
- onasis-proxy-integration.js
- start-dev-backend.sh
- test-supabase-connection.js
- jest.config.js
- run-migration.js
- verify-deployment.sh
- fix-supabase-auth-config.js
- test-orchestrator.mjs
- test-orchestrator.js
- eslint.config.js
- test-cli-auth.sh

---

## Reorganization Plan

### Phase 0: Canonical References (DO NOT MOVE)

These locations are the **source of truth** and must remain in root:

| Area | Location | Contents |
|------|----------|----------|
| App Config | Root | `package.json`, `tsconfig.json`, etc. |
| Build Config | Root | `vite.config.ts`, `netlify.toml`, etc. |
| Main Docs | Root | `README.md` |

### Phase 1: New Folder Structure

```
apps/lanonasis-maas/
├── docs/                          # All documentation organized by domain
│   ├── architecture/              # Architecture documentation
│   ├── deployment/                # Deployment guides
│   ├── fixes/                     # Historical fixes
│   ├── guides/                    # User/developer guides
│   └── [domain-specific]/         # App-specific domains
│
├── scripts/                       # All scripts organized by purpose
│   ├── test/                      # Test scripts
│   ├── setup/                     # Setup scripts
│   ├── migration/                 # Migration scripts
│   ├── deployment/                # Deployment scripts
│   └── fix/                       # Fix scripts
│
├── config/                        # Non-essential configuration files
│   └── [config-type]/             # Config categories
│
├── .archive/                      # Historical archives
│   ├── fixes/                     # Completed fixes
│   └── status/                    # Status reports
│
└── [Root files]                   # Only essential files remain
    ├── README.md
    ├── package.json
    └── [essential-configs]
```

---

## File Movement Mapping

### Documentation

**Move to `docs/architecture/`**:
- ARCHIVE_MIGRATION_LOG.md

**Move to `docs/deployment/`**:
- CLI_DEPLOYMENT_PLAN.md
- CLI_V3.0.3_DEPLOYMENT.md
- DEPLOYMENT_COMPLETE_v3.0.12.md
- DEPLOYMENT_COMPLETE.md

**Move to `docs/fixes/`**:
- OAUTH_FIX_v3.0.13.md
- MULTI_PATTERN_AUTH_FIX_SUMMARY.md
- API_FIX_GUIDE.md
- PR_COMPILATION_FIXES.md
- AUTH_FIX.md
- ONASIS_CORE_FIX.md
- COMPILATION_FIXES.md
- IMMEDIATE_CLI_FIX.md
- GITHUB-ACTIONS-FIX-REPORT.md
- GITHUB_ACTIONS_FIX_COMPLETE.md
- MCP_CORE_TAILORED_FIX.md
- JWT_AUTH_FIX.md

**Move to `docs/guides/`**:
- API_FIX_GUIDE.md
- UPDATE_README.md
- README.md
- CLI_MIGRATION_GUIDE.md
- PUBLISH_GUIDE.md
- README-ENHANCED.md

**Move to `docs/`** (other documentation):
- VSCODE_EXTENSION_REVIEW.md
- SCHEMA_ALIGNMENT_ANALYSIS.md
- CHECKPOINT_CLI_SECURITY_MILESTONE.md
- ISSUES_31-36_REVIEW_AND_REFINEMENT.md
- ISSUES_31-36_REFINEMENTS_APPLIED.md
- REORGANIZATION_PLAN.md
- MCP_CLI_INTEGRATION_PLAN.md
- PHASE_2_COMPLETION_SUMMARY.md
- VSCODE_EXTENSION_UPDATES_APPLIED.md
- UNIVERSAL_SDK_MIGRATION_SUMMARY.md

### Scripts

**Move to `scripts/test/`**:
- test-supabase-connection.js
- test-orchestrator.mjs
- test-orchestrator.js
- test-cli-auth.sh

**Move to `scripts/setup/`**:


**Move to `scripts/migration/`**:


**Move to `scripts/deployment/`**:
- verify-deployment.sh

**Move to `scripts/fix/`**:
- fix-supabase-auth-config.js

**Move to `scripts/`** (other scripts):
- onasis-proxy-integration.js
- start-dev-backend.sh
- jest.config.js
- run-migration.js
- eslint.config.js

---

## Execution Strategy

### Option 1: Automated Script (Recommended)

Create `apps/lanonasis-maas/REORGANIZE_lanonasis-maas.sh` based on this plan.

### Option 2: Manual Execution

Execute in phases following the same pattern as monorepo root.

---

## Post-Reorganization Tasks

1. Update cross-references in documentation
2. Update external references (CI/CD, READMEs)
3. Create README files in each new folder
4. Test all links
5. Verify all tests pass

---

## Success Criteria

The reorganization is successful when:

1. ✅ Root directory has ≤10 essential files
2. ✅ All documentation is in appropriate folders
3. ✅ All scripts are organized by purpose
4. ✅ README files exist in each new folder
5. ✅ No broken links in documentation
6. ✅ Git history is preserved (using `git mv`)
7. ✅ All tests pass
8. ✅ Functionality remains at 100%

---

## Timeline

**Estimated Time**: 30-45 minutes

---

## Related Documents

- `MONOREPO_REORGANIZATION_PLAN.md` - Monorepo root reorganization
- `apps/onasis-core/REORGANIZATION_GUIDE.md` - Onasis-core specific guide

---

**Ready to reorganize?** Review this plan and execute when ready! 🚀
