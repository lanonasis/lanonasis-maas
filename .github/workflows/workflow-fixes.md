# GitHub Actions Workflows Documentation

## 🚀 Active Workflows

### 1. `publish-cli-trusted.yml` - **RECOMMENDED**

**Purpose**: Automated CLI package publishing with modern security

**Features**:

- ✅ **Trusted Publishing**: Uses OIDC (no NPM tokens required)
- ✅ **Auto-publish**: Triggers on CLI changes to main branch
- ✅ **Manual publish**: Supports workflow_dispatch with version input
- ✅ **Security**: npm provenance attestations
- ✅ **Testing**: Includes CLI functionality tests

**Triggers**:

- Push to `main` branch with CLI changes
- Manual workflow dispatch

**No secrets required** - uses GitHub's trusted publishing!

### 2. Disabled Workflows

- `ci-cd.yml.disabled` - Legacy CI/CD (disabled)
- `deploy.yml.disabled` - Legacy deployment (disabled)

## 🔧 Setup Instructions

### For NPM Trusted Publishing (Recommended)

1. Go to [npmjs.com](https://npmjs.com) → Account Settings → Publishing
2. Add GitHub Actions as trusted publisher:
   - **Repository**: `lanonasis/lanonasis-maas`
   - **Workflow**: `publish-cli-trusted.yml`
   - **Environment**: (leave blank)

### Manual Publishing (if needed)

If you prefer manual control, you can trigger the workflow:

1. Go to Actions tab in GitHub
2. Select "Publish CLI Package (Trusted Publishing)"
3. Click "Run workflow"
4. Enter version number (e.g., `2.0.3`)

## 🧹 Cleanup Completed

**Removed stale workflows**:

- ❌ `publish.yml` - Legacy complex publishing (replaced by trusted publishing)
- ❌ `claude.yml` - Claude Code integration (unused, required secrets)
- ❌ `claude-code-review.yml` - Claude Code reviews (unused, required secrets)

**Benefits**:

- ✅ No more secret management headaches
- ✅ Enhanced security with OIDC
- ✅ Simplified workflow maintenance
- ✅ Automatic provenance attestations
