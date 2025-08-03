# Development Workspace Configuration

## Overview
This is the **vibe-memory** prototype/development workspace for the Lanonasis Memory Service. 
All code developed here will be migrated to the official `lanonasis-maas` repository for production deployment.

## Purpose
- **Prototype Development**: Test new features and architectural changes
- **Experimental Features**: Try out new integrations before production
- **Development Isolation**: Avoid conflicts with production codebase
- **Feature Staging**: Prepare features for official release

## Workspace Structure

```
vibe-memory/                    # DEVELOPMENT/PROTOTYPE
  ├── Development code with @lanonasis packages
  ├── Experimental features
  └── Not for npm publication

lanonasis-maas/                # OFFICIAL/PRODUCTION
  ├── Production-ready code
  ├── Published to npm as @lanonasis/*
  └── Deployed to api.lanonasis.com

vortex-api-key-manager/        # SEPARATE SERVICE
  ├── API key management system
  └── Published as @vortex/*
```

## Development Workflow

### 1. Feature Development in vibe-memory
```bash
# Work on new features in vibe-memory
cd vibe-memory
npm run dev

# Test experimental features
npm run test
```

### 2. Migration to Production
When features are ready:
```bash
# Copy tested code to lanonasis-maas
cp -r src/* ../lanonasis-maas/src/

# Switch to production repo
cd ../lanonasis-maas

# Test in production environment
npm run test

# Publish from production repo only
npm publish
```

## Configuration for Development

### Package.json Configuration
```json
{
  "name": "@lanonasis/memory-service",
  "version": "1.2.0-dev",  // Dev version
  "private": true,         // Prevent accidental publishing
  "description": "DEVELOPMENT VERSION - DO NOT PUBLISH"
}
```

### Preventing Accidental Publishing
Add to all package.json files in vibe-memory:
```json
{
  "private": true,
  "publishConfig": {
    "registry": "http://localhost:4873/"  // Local registry only
  }
}
```

### Git Configuration
```bash
# Add pre-push hook to prevent pushing to npm
echo '#!/bin/bash
if [[ "$PWD" == *"vibe-memory"* ]]; then
  echo "ERROR: Cannot publish from vibe-memory development workspace"
  echo "Please use lanonasis-maas for production publishing"
  exit 1
fi' > .git/hooks/pre-push

chmod +x .git/hooks/pre-push
```

## NPM Scripts for Safety

Add these scripts to vibe-memory package.json files:
```json
{
  "scripts": {
    "prepublishOnly": "echo 'ERROR: Publishing blocked in development workspace' && exit 1",
    "migrate-to-prod": "./scripts/migrate-to-production.sh"
  }
}
```

## Development vs Production Checklist

### ✅ vibe-memory (Development)
- [ ] All packages marked as `"private": true`
- [ ] Version includes `-dev` suffix
- [ ] No CI/CD publishing workflows
- [ ] README indicates development status
- [ ] Git hooks prevent npm publish

### ✅ lanonasis-maas (Production)
- [ ] Packages ready for public use
- [ ] Proper versioning (1.2.0)
- [ ] CI/CD configured for npm
- [ ] Documentation complete
- [ ] All tests passing

## Migration Script

Create `scripts/migrate-to-production.sh`:
```bash
#!/bin/bash

PROD_DIR="../lanonasis-maas"

echo "Migrating code to production repository..."

# Check if production repo exists
if [ ! -d "$PROD_DIR" ]; then
  echo "ERROR: Production repository not found at $PROD_DIR"
  exit 1
fi

# Copy source files
cp -r src/* "$PROD_DIR/src/"
cp -r cli/src/* "$PROD_DIR/cli/src/"
cp -r packages/*/src/* "$PROD_DIR/packages/lanonasis-sdk/src/"

echo "Code migrated. Please review and test in production repository."
echo "Remember to:"
echo "1. Update version numbers"
echo "2. Run tests"
echo "3. Update changelog"
echo "4. Publish from production repo only"
```

## Best Practices

1. **Never publish from vibe-memory** - This is development only
2. **Test thoroughly** before migrating to production
3. **Keep versions synchronized** between dev and prod
4. **Document experimental features** clearly
5. **Use feature flags** for experimental code

## Environment Variables

### Development (.env)
```
NODE_ENV=development
API_URL=http://localhost:3000
ENABLE_EXPERIMENTAL=true
```

### Production (lanonasis-maas/.env)
```
NODE_ENV=production
API_URL=https://api.lanonasis.com
ENABLE_EXPERIMENTAL=false
```

## Summary

The vibe-memory workspace is for:
- 🧪 Experimentation and prototyping
- 🔧 Development and testing
- 🚫 NOT for npm publishing
- 🚫 NOT for production deployment

All production releases must go through the official lanonasis-maas repository.