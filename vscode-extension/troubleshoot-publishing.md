# VS Code Extension Publishing Troubleshooting

## Current Issue
Extension "lanonasis.lanonasis-memory" not found in marketplace after deployment.

## Root Cause
Personal Access Token lacks required permissions: `Marketplace (manage)`

## Solution Steps

### 1. Create New PAT Token
1. Go to: https://dev.azure.com
2. Profile → Personal access tokens → New Token
3. Configure:
   - Name: `VS Code Extension Publishing`
   - Organization: All accessible organizations
   - Scopes: **Custom defined** → **Marketplace (manage)** ✅

### 2. Re-authenticate
```bash
cd vscode-extension
vsce login lanonasis
# Enter your new PAT token when prompted
```

### 3. Verify Publisher
```bash
# Check if publisher exists
vsce ls-publishers

# If publisher doesn't exist, create it
vsce create-publisher lanonasis
```

### 4. Publish Extension
```bash
# Package the extension
vsce package

# Publish to marketplace
vsce publish
```

### 5. Verify Publication
```bash
# Check if extension is published
vsce show lanonasis.lanonasis-memory

# List your published extensions
vsce ls lanonasis
```

## Alternative: Manual Publishing

If CLI continues to fail, use the web interface:

1. Go to: https://marketplace.visualstudio.com/manage/publishers/lanonasis
2. Upload your .vsix file manually
3. Fill in the required metadata

## Verification Checklist

- [ ] PAT token has `Marketplace (manage)` permission
- [ ] Publisher "lanonasis" exists and you have access
- [ ] Extension package is valid (.vsix file)
- [ ] Extension metadata is complete in package.json
- [ ] No naming conflicts with existing extensions

## Common Issues

### Publisher Not Found
```bash
vsce create-publisher lanonasis
```

### Authentication Failed
- Regenerate PAT token with correct permissions
- Use `vsce logout` then `vsce login lanonasis`

### Extension Already Exists
- Check if you own the extension
- Use `vsce publish --pre-release` for beta versions
- Increment version number in package.json

## Marketplace Search Tips

Extensions may take 5-15 minutes to appear in search after publishing:
- Search by exact name: "Lanonasis Memory Assistant"
- Search by publisher: "lanonasis"
- Check directly: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
