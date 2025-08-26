# Workspace Conflict Resolution Strategy

## Overview
This document outlines how to resolve workspace naming conflicts while maintaining the official @lanonasis branding across all published packages and services.

## Problem Analysis
The workspace conflicts occur because multiple projects use the same package names:
1. `@lanonasis/memory-service` exists in both `vibe-memory` and `lanonasis-maas`
2. Similar conflicts for CLI, SDK, and other packages

## Resolution Strategy

### 1. **Primary Principle**
- **@lanonasis** remains the official published package scope
- All public-facing packages, CLIs, and services use @lanonasis branding
- Internal development directories can have different names to avoid conflicts

### 2. **Directory-Based Isolation**
Instead of changing package names, we use directory-based isolation:

```bash
# Development structure
vibe-memory/                    # Development directory name
  package.json                  # @lanonasis/memory-service (official)
  cli/
    package.json               # @lanonasis/cli (official)
  packages/
    lanonasis-sdk/
      package.json             # @lanonasis/sdk (official)
    memory-client/
      package.json             # @lanonasis/memory-client (official)

lanonasis-maas/                # Production directory
  # Same package names as above

vortex-api-key-manager/        # Separate service
  packages/
    vortex-mcp-sdk/
      package.json             # @vortex/mcp-sdk (different scope)
```

### 3. **Workspace Configuration Solution**

Add workspace configuration to prevent conflicts:

```json
// In vibe-memory/package.json
{
  "name": "@lanonasis/memory-service-dev",  // Add -dev suffix for workspace
  "publishConfig": {
    "name": "@lanonasis/memory-service"    // Publish with official name
  }
}
```

### 4. **Environment-Based Resolution**

Use environment variables to handle workspace conflicts:

```bash
# .env.development
NPM_CONFIG_WORKSPACE_PREFIX=vibe-memory

# When working in vibe-memory
cd vibe-memory
npm config set workspace-prefix vibe-memory
```

### 5. **Git Configuration**

Use git worktrees to isolate workspaces:

```bash
# Main repository
git worktree add ../vibe-memory-dev development
git worktree add ../lanonasis-prod main
```

## Implementation Steps

### Step 1: Configure NPM Workspaces
```bash
# In each conflicting directory, create .npmrc
echo "workspace-prefix=$(basename $PWD)" > .npmrc
```

### Step 2: Update Package Names for Development
Only change the package.json name field for development, keep publishConfig official:

```json
{
  "name": "@lanonasis/memory-service-vibe-dev",
  "publishConfig": {
    "name": "@lanonasis/memory-service",
    "registry": "https://registry.npmjs.org/"
  }
}
```

### Step 3: Use Aliases in Development
```bash
# In development scripts
alias npm-vibe='npm --workspace-prefix=vibe-memory'
alias npm-prod='npm --workspace-prefix=lanonasis-maas'
```

## Alternative Solutions

### Option A: Monorepo Structure
Combine all projects into a single monorepo:
```
lanonasis-platform/
  apps/
    memory-service/
    api-gateway/
    dashboard/
  packages/
    cli/
    sdk/
    memory-client/
  extensions/
    vscode/
    cursor/
    windsurf/
```

### Option B: Docker-Based Development
Use Docker containers to isolate each project:
```dockerfile
# docker-compose.dev.yml
services:
  vibe-dev:
    build: ./vibe-memory
    volumes:
      - ./vibe-memory:/app
    environment:
      - NPM_CONFIG_CACHE=/app/.npm-cache
  
  lanonasis-prod:
    build: ./lanonasis-maas
    volumes:
      - ./lanonasis-maas:/app
    environment:
      - NPM_CONFIG_CACHE=/app/.npm-cache
```

### Option C: Symbolic Links
Use symbolic links to share code while maintaining separate workspaces:
```bash
# In vibe-memory
ln -s ../shared/memory-service src/memory-service

# In lanonasis-maas  
ln -s ../shared/memory-service src/memory-service
```

## Recommended Approach

1. **Keep @lanonasis branding** for all published packages
2. **Use development suffixes** in local package.json files
3. **Configure publishConfig** to ensure correct names when publishing
4. **Use npm workspaces** properly with unique workspace names
5. **Document the setup** clearly for all developers

## Publishing Workflow

```bash
# Before publishing, ensure correct name
npm run prepublish-check

# Prepublish check script
node -e "
const pkg = require('./package.json');
if (!pkg.publishConfig?.name?.startsWith('@lanonasis/')) {
  console.error('ERROR: Package must publish under @lanonasis scope');
  process.exit(1);
}
"

# Publish with correct configuration
npm publish --access public
```

## Benefits
- Maintains official @lanonasis branding
- Resolves workspace conflicts
- Allows parallel development
- Ensures consistent publishing
- No changes to import statements or documentation

## Next Steps
1. Implement development suffixes in conflicting packages
2. Add publishConfig to all packages
3. Create workspace-specific .npmrc files
4. Update CI/CD to handle the configuration
5. Document the setup for team members