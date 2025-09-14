# Archive Migration Log - CLI v1.5.2 Golden Contract Alignment

**Date**: 2025-08-26
**CLI Version**: v1.5.2
**Golden Contract**: Onasis-Core v0.1 Compliant

## Migration Objective
Clean up stale documentation and scripts to establish CLI v1.5.2 as the single source of truth for:
- Authentication flows (vendor key, OAuth, credentials)
- Service discovery integration
- Professional tab completions
- User guidance systems
- Dual command support (LanOnasis/onasis)

## Archive Structure

### 1. Legacy Documentation (archive/legacy-docs/)
**Purpose**: Historical documents that predate Golden Contract alignment
- Old deployment guides
- Legacy authentication documentation
- Outdated setup instructions
- Pre-v1.5.2 CLI documentation

### 2. Legacy Scripts (archive/legacy-scripts/)
**Purpose**: Shell scripts replaced by CLI v1.5.2 functionality
- Manual deployment scripts
- Authentication setup scripts
- Service verification scripts
- Extension packaging scripts

### 3. Deployment History (archive/deployment-history/)
**Purpose**: Historical deployment and migration documentation
- Migration summaries
- Restoration logs
- Deployment synchronization plans
- Implementation audits

### 4. Auth Migration (archive/auth-migration/)
**Purpose**: Authentication system evolution documentation
- OAuth configuration files
- Supabase auth setup
- Security cleanup summaries
- Authentication integration guides

### 5. Extension Documentation (archive/extension-docs/)
**Purpose**: VSCode/Cursor/Windsurf extension documentation
- Extension-specific READMEs
- Publishing guides
- Changelog files
- Extension configuration docs

## Files Kept Active (Source of Truth)

### Core Documentation
- `README.md` (updated for CLI v1.5.2)
- `CLAUDE.md` (project instructions)
- `SECURITY.md` (current security practices)
- `LICENSE` (project license)

### CLI Documentation
- `cli/README.md` (CLI v1.5.2 documentation)
- `cli/MCP_INTEGRATION_README.md` (current MCP integration)

### Active Configuration
- `package.json` (project dependencies)
- `netlify.toml` (deployment configuration)
- `vercel.json` (hosting configuration)
- `tsconfig.json` (TypeScript configuration)

### Service Configuration
- `supabase/` directory (database configuration)
- `src/` directory (current source code)
- `netlify/functions/` (serverless functions)

## Migration Actions

### Phase 1: Archive Legacy Documentation
Move outdated guides and implementation summaries to maintain history while preventing confusion.

### Phase 2: Archive Legacy Scripts
Consolidate functionality into CLI v1.5.2 commands, archive manual scripts.

### Phase 3: Update Active Documentation
Ensure all active documentation reflects CLI v1.5.2 standards and Golden Contract compliance.

### Phase 4: Create Migration Guide
Document transition from legacy methods to CLI v1.5.2 workflows.

## CLI v1.5.2 Command Equivalents

### Authentication
**Legacy**: Manual authentication scripts
**Current**: 
```bash
onasis login --vendor-key pk_xxx.sk_xxx    # Vendor key auth
onasis login --oauth                        # Browser OAuth
onasis login                                # Interactive credentials
```

### Service Verification
**Legacy**: `verify-services.sh`, `confirm-all-services-intact.sh`
**Current**: 
```bash
onasis health                               # Comprehensive health check
onasis status                               # Quick status overview
```

### Setup and Configuration
**Legacy**: Multiple setup scripts
**Current**: 
```bash
onasis guide                                # Interactive setup guide
onasis init                                 # Initialize configuration
onasis quickstart                           # Quick reference
```

### Completion Setup
**Legacy**: Manual completion configuration
**Current**: 
```bash
onasis completion                           # Installation guide
source <(onasis --completion bash)         # Direct bash completion
```

## Post-Migration Validation

1. **CLI Functionality**: All core operations accessible via CLI v1.5.2
2. **Documentation Clarity**: No conflicting or outdated instructions
3. **Golden Contract Compliance**: All authentication flows properly routed
4. **Professional Standards**: Tab completions, user guidance, dual commands functional

## Team Review Notes

This migration establishes CLI v1.5.2 as the authoritative interface for:
- ✅ Authentication (vendor key, OAuth, credentials)
- ✅ Service discovery and health monitoring
- ✅ Professional tab completions (bash/zsh/fish)
- ✅ Interactive user guidance and onboarding
- ✅ Dual command support (LanOnasis/onasis)
- ✅ Golden Contract compliance (Onasis-Core v0.1)

All legacy methods are preserved in archive for historical reference.