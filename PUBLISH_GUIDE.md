# 📦 Extension Publishing Guide

## VS Code Marketplace Publishing (CLI)

### Prerequisites

✅ vsce installed: `npm install -g vsce`
✅ Publisher account: "lanonasis" (confirmed)
✅ Personal Access Token (PAT) from Azure DevOps

### Publishing Commands

#### 1. **Publish VS Code Extension Update**

```bash
cd vscode-extension

# Option A: Publish directly (if you have PAT saved)
vsce publish

# Option B: Publish with PAT (more secure)
vsce publish -p YOUR_PERSONAL_ACCESS_TOKEN

# Option C: Publish specific version
vsce publish 1.3.1

# Option D: Auto-increment version and publish
vsce publish patch  # 1.3.1 -> 1.3.2
vsce publish minor  # 1.3.1 -> 1.4.0
vsce publish major  # 1.3.1 -> 2.0.0
```

#### 2. **Get Personal Access Token (if needed)**

1. Go to: <https://dev.azure.com/lanonasis/_usersSettings/tokens>
2. Click "New Token"
3. Name: "vsce-publishing"
4. Organization: Select your org
5. Scopes: Custom defined → Marketplace → "Manage"
6. Click "Create" and copy the token

#### 3. **Login with PAT (one-time setup)**

```bash
vsce login lanonasis
# Enter your PAT when prompted
```

---

## Cursor Extension Publishing

Cursor uses OpenVSX Registry (alternative to VS Code Marketplace):

### 1. **Create OpenVSX Account**

- Go to: <https://open-vsx.org/>
- Sign in with GitHub
- Get access token from: <https://open-vsx.org/user-settings/tokens>

### 2. **Install OpenVSX CLI**

```bash
npm install -g ovsx
```

### 3. **Publish to OpenVSX**

```bash
cd cursor-extension

# Package first
vsce package --no-dependencies

# Publish to OpenVSX
ovsx publish lanonasis-memory-cursor-1.3.1.vsix -p YOUR_OPENVSX_TOKEN
```

---

## Windsurf Extension Publishing

Windsurf currently doesn't have a public marketplace. Options:

### 1. **GitHub Releases (Recommended)**

```bash
# Create a GitHub release
gh release create v1.3.1 \
  windsurf-extension/lanonasis-memory-windsurf-1.3.1.vsix \
  --title "LanOnasis Memory v1.3.1" \
  --notes "Updated branding and icon improvements"
```

### 2. **Direct Distribution**

- Host the `.vsix` file on your website
- Users install via: Extensions → Install from VSIX

### 3. **NPM Registry**

```bash
cd windsurf-extension
npm publish
```

---

## Publishing All Extensions Script

Create `publish-all.sh`:

```bash
#!/bin/bash

echo "🚀 Publishing LanOnasis Extensions v1.3.1"

# VS Code Marketplace
echo "Publishing to VS Code Marketplace..."
cd vscode-extension
vsce publish
cd ..

# OpenVSX (for Cursor)
echo "Publishing to OpenVSX..."
cd cursor-extension
vsce package --no-dependencies
ovsx publish *.vsix -p $OPENVSX_TOKEN
cd ..

# GitHub Release (for Windsurf)
echo "Creating GitHub Release..."
cd windsurf-extension
vsce package --no-dependencies
gh release create v1.3.1 *.vsix --title "v1.3.1" --notes "See CHANGELOG"
cd ..

echo "✅ All extensions published!"
```

---

## Version Update Checklist

Before publishing, ensure:

- [ ] Version bumped in all `package.json` files
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] Icon and branding consistent
- [ ] All 17 tools tested
- [ ] Build succeeds without errors

---

## Post-Publishing

### Verify Publication

- VS Code: <https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory>
- OpenVSX: <https://open-vsx.org/extension/lanonasis/lanonasis-memory-cursor>
- GitHub: <https://github.com/lanonasis/lanonasis-maas/releases>

### Monitor

- Check reviews and ratings
- Monitor error reports
- Respond to user feedback
