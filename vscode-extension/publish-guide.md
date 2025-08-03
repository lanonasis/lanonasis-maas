# VS Code Extension Publishing Guide

## 🎯 Your Extension is Ready!

✅ **Extension Packaged**: `lanonasis-memory-1.2.0.vsix` (33.16 KB)
✅ **Local Installation**: Successfully tested
✅ **Compatibility**: Fixed for VS Code ^1.99.0
✅ **Features Included**: 
- API Key Management
- Project Management
- Memory operations
- Tree view providers

## 🔑 Publishing Options

### Option 1: Azure DevOps PAT Token (Recommended)

1. **Go to Azure DevOps**: https://dev.azure.com
2. **Create new PAT token**:
   - Click your profile → Personal access tokens
   - Click "New Token"
   - Name: `VS Code Marketplace Publishing`
   - Scopes: **Custom defined**
   - Check: **Marketplace (Full)** or **Marketplace (Manage)**

3. **Publish with new token**:
   ```bash
   cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas/vscode-extension
   vsce publish --packagePath lanonasis-memory-1.2.0.vsix --pat YOUR_NEW_TOKEN
   ```

### Option 2: Manual Upload

1. **Go to**: https://marketplace.visualstudio.com/manage/publishers/lanonasis
2. **Click "Update"** on your existing extension
3. **Upload**: `lanonasis-memory-1.2.0.vsix`
4. **Add release notes**: Mention API key management features

## 📋 Release Notes for v1.2.0

```markdown
### 🚀 New Features
- **API Key Management**: Create, view, and manage API keys directly in VS Code
- **Project Management**: Organize API keys by projects
- **Enhanced Tree Views**: New API Keys panel in Explorer
- **Keyboard Shortcuts**: 
  - `Cmd+Shift+K` (Mac) / `Ctrl+Shift+K` (Windows) - Manage API Keys
  - `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` (Windows) - Search Memories

### 🔧 Configuration
- Added `lanonasis.enableApiKeyManagement` setting
- Added `lanonasis.defaultEnvironment` setting
- Added `lanonasis.organizationId` setting

### 🐛 Fixes
- Updated VS Code engine compatibility to ^1.99.0
- Improved error handling in API operations
```

## 🎯 Current Status

- **Published v1.0.0**: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
- **Ready v1.2.0**: With full API key management features
- **Next Step**: Publish v1.2.0 using one of the options above

## 🔍 Testing Commands

Test the extension locally:
```bash
# Install the extension
code --install-extension lanonasis-memory-1.2.0.vsix

# Test commands in VS Code Command Palette (Cmd+Shift+P):
- "Lanonasis: Manage API Keys"
- "Lanonasis: Create API Key Project"  
- "Lanonasis: View API Key Projects"
- "Lanonasis: Search Memories"
```
