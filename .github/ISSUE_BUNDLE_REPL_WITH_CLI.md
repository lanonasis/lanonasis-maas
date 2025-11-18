---
title: 'Bundle REPL with Main CLI for Unified Distribution'
labels: ['enhancement', 'cli', 'repl', 'integration']
assignees: []
milestone: 'CLI v3.7.0'
---

# Bundle REPL with Main CLI for Unified Distribution

## 📋 Overview

Bundle the standalone `@lanonasis/repl-cli` package with the main `@lanonasis/cli` package to provide a unified installation experience for users.

**Current State**: REPL is published as a standalone package (`@lanonasis/repl-cli@0.1.0`)  
**Target State**: REPL bundled within main CLI (`@lanonasis/cli@3.7.0`)  
**Priority**: Medium  
**Effort**: 2-3 hours  
**Risk**: Low

---

## 🎯 Goals

1. **Single Installation**: Users install only `@lanonasis/cli` to get all features including REPL
2. **Seamless Integration**: `lanonasis repl` command works out of the box
3. **Unified Versioning**: REPL version tracks with CLI version
4. **Reduced Maintenance**: Single package to maintain and publish
5. **Better UX**: No separate installation steps for REPL functionality

---

## 📊 Current Architecture

### Standalone REPL (Current)

```
@lanonasis/repl-cli@0.1.0 (standalone npm package)
├── Binary: onasis-repl, lrepl
├── Dependencies: @lanonasis/memory-client@^1.0.0
└── Size: 12.5 KB

@lanonasis/cli@3.6.7 (main CLI)
├── Binary: onasis, lanonasis
├── Command: lanonasis repl (spawns external REPL)
└── Issue: Requires separate REPL installation
```

### Integration Points

- Main CLI has `repl` command at `cli/src/index.ts:306-345`
- Command spawns external process: `packages/repl-cli/dist/index.js`
- Fails if REPL package not installed separately

---

## 🎨 Target Architecture

### Bundled REPL (Target)

```
@lanonasis/cli@3.7.0 (unified package)
├── Binary: onasis, lanonasis
├── Commands:
│   ├── auth, memory, topic, etc. (existing)
│   └── repl (bundled, not spawned)
├── REPL Module: cli/src/repl/
│   ├── core/
│   │   ├── repl-engine.ts
│   │   └── mcp-client.ts
│   ├── commands/
│   │   ├── memory-commands.ts
│   │   ├── system-commands.ts
│   │   └── registry.ts
│   └── config/
│       ├── types.ts
│       └── loader.ts
└── Size: +12.5 KB (minimal overhead)
```

---

## 📝 Implementation Plan

### Phase 1: Restructure REPL into CLI (1 hour)

#### Step 1.1: Move REPL Source

```bash
# Create REPL directory in CLI
mkdir -p apps/lanonasis-maas/cli/src/repl

# Copy REPL source files
cp -r apps/lanonasis-maas/packages/repl-cli/src/* apps/lanonasis-maas/cli/src/repl/

# Verify structure
apps/lanonasis-maas/cli/src/repl/
├── commands/
│   ├── memory-commands.ts
│   ├── registry.ts
│   └── system-commands.ts
├── config/
│   ├── loader.ts
│   └── types.ts
└── core/
    ├── mcp-client.ts
    └── repl-engine.ts
```

#### Step 1.2: Update Import Paths

Update all imports in moved files to use relative paths:

```typescript
// Before
import { MemoryClient } from '@lanonasis/memory-client';

// After (no change needed - external dependency)
import { MemoryClient } from '@lanonasis/memory-client';

// Internal imports stay relative
import { CommandContext } from '../config/types.js';
```

#### Step 1.3: Add REPL Dependencies to CLI

Update `cli/package.json`:

```json
{
  "dependencies": {
    // ... existing dependencies
    "@lanonasis/memory-client": "^1.0.0",
    "@modelcontextprotocol/sdk": "^1.1.1",
    "chalk": "^5.3.0", // Already exists
    "commander": "^12.1.0", // Already exists
    "dotenv": "^16.4.5", // Already exists
    "inquirer": "^9.3.6", // Already exists
    "ora": "^8.0.1", // Already exists
    "zod": "^3.24.4" // Already exists
  }
}
```

**Note**: Most dependencies already exist in CLI! Only need to add:

- `@lanonasis/memory-client`
- `@modelcontextprotocol/sdk` (if not present)

---

### Phase 2: Update CLI Integration (30 minutes)

#### Step 2.1: Update REPL Command Handler

Replace spawn-based approach with direct import:

**Before** (`cli/src/index.ts:306-345`):

```typescript
program
  .command('repl')
  .description('Start lightweight REPL session for memory operations')
  .option('--mcp', 'Use MCP mode')
  .option('--api <url>', 'Override API URL')
  .option('--token <token>', 'Authentication token')
  .action(async (options) => {
    // Spawns external process
    const repl = spawn('node', [replPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  });
```

**After**:

```typescript
import { ReplEngine } from './repl/core/repl-engine.js';
import { loadConfig } from './repl/config/loader.js';

program
  .command('repl')
  .description('Start lightweight REPL session for memory operations')
  .option('--mcp', 'Use MCP mode')
  .option('--api <url>', 'Override API URL')
  .option('--token <token>', 'Authentication token')
  .action(async (options) => {
    try {
      // Load configuration with overrides
      const config = await loadConfig({
        useMCP: options.mcp,
        apiUrl: options.api,
        authToken: options.token,
      });

      // Start REPL directly
      const repl = new ReplEngine(config);
      await repl.start();
    } catch (error) {
      console.error(colors.error('Failed to start REPL:'), error.message);
      process.exit(1);
    }
  });
```

#### Step 2.2: Update TypeScript Configuration

Update `cli/tsconfig.json` to include REPL files:

```json
{
  "include": ["src/**/*", "src/repl/**/*"]
}
```

#### Step 2.3: Update Build Configuration

Ensure REPL files are included in build output (should work automatically with existing setup).

---

### Phase 3: Testing (30 minutes)

#### Step 3.1: Local Build Test

```bash
cd apps/lanonasis-maas/cli

# Clean and rebuild
rm -rf dist
npm run build

# Verify REPL files are in dist
ls -la dist/repl/

# Link for local testing
npm link

# Test REPL command
lanonasis repl --help
lanonasis repl
```

#### Step 3.2: Functional Testing

```bash
# Start REPL
lanonasis repl

# Test commands
onasis> help
onasis> status
onasis> exit

# Test with authentication
LANONASIS_API_KEY=test_key lanonasis repl
onasis> status  # Should show authenticated
onasis> exit

# Test with options
lanonasis repl --api https://custom.api.com
lanonasis repl --mcp
```

#### Step 3.3: Package Testing

```bash
# Create tarball
npm pack

# Install in clean directory
mkdir /tmp/cli-test
cd /tmp/cli-test
npm install -g /path/to/lanonasis-cli-3.7.0.tgz

# Test
lanonasis --version  # Should show 3.7.0
lanonasis repl
```

---

### Phase 4: Documentation & Release (30 minutes)

#### Step 4.1: Update CLI README

Add REPL section to `cli/README.md`:

````markdown
## 🔄 Interactive REPL

Start an interactive REPL session for memory operations:

```bash
# Start REPL
lanonasis repl

# With authentication
LANONASIS_API_KEY=your_key lanonasis repl

# With custom API
lanonasis repl --api https://custom.api.com --token your_token

# Enable MCP mode
lanonasis repl --mcp
```
````

### REPL Commands

| Command                    | Description         |
| -------------------------- | ------------------- |
| `create <title> <content>` | Create a memory     |
| `search <query>`           | Search memories     |
| `list [limit]`             | List memories       |
| `get <id>`                 | Get specific memory |
| `delete <id>`              | Delete memory       |
| `help`                     | Show all commands   |
| `status`                   | Display REPL status |
| `exit`                     | Exit REPL           |

See full REPL documentation: https://docs.lanonasis.com/cli/repl

````

#### Step 4.2: Update CHANGELOG
Add to `cli/CHANGELOG.md`:

```markdown
## [3.7.0] - 2025-11-XX

### 🎉 New Features

- **Bundled REPL**: Interactive REPL now included with main CLI
  - No separate installation required
  - Access via `lanonasis repl` command
  - Full memory operations support
  - MCP integration ready
  - Configuration persistence

### 🔧 Improvements

- Unified installation experience
- Reduced dependency management
- Better integration with main CLI
- Shared configuration between CLI and REPL

### 📦 Dependencies

- Added `@lanonasis/memory-client@^1.0.0`
- Added `@modelcontextprotocol/sdk@^1.1.1`

### 🗑️ Deprecations

- Standalone `@lanonasis/repl-cli` package deprecated (use main CLI instead)
````

#### Step 4.3: Version Bump

```bash
cd apps/lanonasis-maas/cli
npm version minor  # 3.6.7 → 3.7.0
```

#### Step 4.4: Commit and Push

```bash
git add .
git commit -m "feat(cli): bundle REPL with main CLI for unified distribution

- Move REPL source from packages/repl-cli to cli/src/repl
- Update REPL command to use direct import instead of spawn
- Add REPL dependencies to CLI package.json
- Update documentation with REPL usage
- Bump version to 3.7.0

Closes #XXX"

git push origin main
```

---

## 🧪 Testing Checklist

### Pre-Integration Tests

- [ ] Standalone REPL works (`@lanonasis/repl-cli@0.1.0`)
- [ ] All REPL commands functional
- [ ] Authentication methods work
- [ ] Configuration persists

### Integration Tests

- [ ] CLI builds successfully with REPL
- [ ] `lanonasis repl` command starts REPL
- [ ] All REPL commands work from bundled version
- [ ] No import/path errors
- [ ] TypeScript compilation succeeds
- [ ] Package size acceptable (<100 KB increase)

### Functional Tests

- [ ] Memory create works
- [ ] Memory search works
- [ ] Memory list works
- [ ] Memory get works
- [ ] Memory delete works
- [ ] Help command shows all commands
- [ ] Status command displays correctly
- [ ] Mode switching works
- [ ] Exit command works cleanly

### Cross-Platform Tests

- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Works on Windows
- [ ] Works in CI/CD environment

### Regression Tests

- [ ] Existing CLI commands still work
- [ ] Authentication still works
- [ ] MCP commands still work
- [ ] No breaking changes to existing functionality

---

## 📦 Dependencies Analysis

### Existing CLI Dependencies (Already Present)

```json
{
  "chalk": "^5.3.0",           ✅ Already in CLI
  "commander": "^12.1.0",      ✅ Already in CLI
  "dotenv": "^16.4.5",         ✅ Already in CLI
  "inquirer": "^9.3.6",        ✅ Already in CLI
  "ora": "^8.0.1",             ✅ Already in CLI
  "zod": "^3.24.4"             ✅ Already in CLI
}
```

### New Dependencies to Add

```json
{
  "@lanonasis/memory-client": "^1.0.0",      ➕ New (34 KB)
  "@modelcontextprotocol/sdk": "^1.1.1"      ➕ New (check if exists)
}
```

### Size Impact

- REPL source code: ~12.5 KB
- New dependencies: ~34 KB (memory-client)
- **Total increase**: ~46.5 KB (acceptable)

---

## 🔄 Migration Path for Users

### Current Users of Standalone REPL

```bash
# Old way (standalone)
npm install -g @lanonasis/repl-cli
onasis-repl start

# New way (bundled)
npm install -g @lanonasis/cli@latest
lanonasis repl
```

### Migration Notice

Add deprecation notice to `@lanonasis/repl-cli`:

```json
{
  "deprecated": "This package is deprecated. Use @lanonasis/cli@latest instead. The REPL is now bundled with the main CLI. Run 'lanonasis repl' to start."
}
```

---

## 🚨 Risks & Mitigations

### Risk 1: Breaking Changes

**Risk**: Bundling might break existing CLI functionality  
**Mitigation**: Comprehensive testing, gradual rollout  
**Severity**: Low

### Risk 2: Increased Package Size

**Risk**: CLI package becomes too large  
**Mitigation**: Only ~46 KB increase, acceptable  
**Severity**: Low

### Risk 3: Dependency Conflicts

**Risk**: REPL dependencies conflict with CLI dependencies  
**Mitigation**: Most dependencies already exist, version alignment  
**Severity**: Very Low

### Risk 4: Import Path Issues

**Risk**: Relative imports break after moving files  
**Mitigation**: Thorough testing, TypeScript compilation checks  
**Severity**: Low

---

## 📈 Success Metrics

### Installation Metrics

- [ ] Single `npm install` command
- [ ] No additional setup required
- [ ] Package size < 200 KB total

### Functionality Metrics

- [ ] All REPL commands work
- [ ] No regression in existing CLI commands
- [ ] Performance equivalent to standalone

### User Experience Metrics

- [ ] Reduced installation steps (2 → 1)
- [ ] Unified documentation
- [ ] Consistent versioning

---

## 🔗 Related Issues & PRs

- Related to: Standalone REPL publication (#XXX)
- Depends on: `@lanonasis/memory-client@1.0.0` (published)
- Blocks: CLI v4.0.0 planning

---

## 📚 References

### Documentation

- REPL Status: `packages/repl-cli/STATUS.md`
- REPL Implementation: `packages/repl-cli/IMPLEMENTATION_SUMMARY.md`
- CLI README: `cli/README.md`
- Standalone Publish Plan: `REPL_STANDALONE_PUBLISH_PLAN.md`

### Code Locations

- Current REPL: `packages/repl-cli/src/`
- Target Location: `cli/src/repl/`
- CLI Integration: `cli/src/index.ts:306-345`

### Published Packages

- Main CLI: https://www.npmjs.com/package/@lanonasis/cli
- Standalone REPL: https://www.npmjs.com/package/@lanonasis/repl-cli
- Memory Client: https://www.npmjs.com/package/@lanonasis/memory-client

---

## 🎯 Acceptance Criteria

### Must Have

- [ ] REPL source moved to `cli/src/repl/`
- [ ] `lanonasis repl` command works without external dependencies
- [ ] All REPL commands functional
- [ ] Documentation updated
- [ ] Tests passing
- [ ] Published as `@lanonasis/cli@3.7.0`

### Should Have

- [ ] Deprecation notice on standalone package
- [ ] Migration guide for existing users
- [ ] Performance benchmarks
- [ ] Cross-platform testing

### Nice to Have

- [ ] Automated migration script
- [ ] Video tutorial
- [ ] Blog post announcement

---

## 🚀 Timeline

| Phase                  | Duration      | Status     |
| ---------------------- | ------------- | ---------- |
| Phase 1: Restructure   | 1 hour        | ⏳ Pending |
| Phase 2: Integration   | 30 min        | ⏳ Pending |
| Phase 3: Testing       | 30 min        | ⏳ Pending |
| Phase 4: Documentation | 30 min        | ⏳ Pending |
| **Total**              | **2.5 hours** | ⏳ Pending |

**Target Completion**: Within 1 week of standalone REPL publication

---

## 👥 Stakeholders

- **Developer**: CLI team
- **Reviewer**: Tech lead
- **Tester**: QA team
- **Users**: All CLI users (automatic upgrade)

---

## 📝 Notes

- Standalone REPL will remain available for users who prefer separate installation
- Deprecation will be gradual (6-month notice period)
- Both packages will be maintained during transition period
- Documentation will clearly indicate recommended approach

---

**Created**: 2025-11-18  
**Last Updated**: 2025-11-18  
**Status**: 📋 Ready for Implementation  
**Assignee**: TBD  
**Milestone**: CLI v3.7.0
