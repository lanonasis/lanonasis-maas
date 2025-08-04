# Azure CLI VS Code Extension Publishing Guide

## ✅ You're Now Set Up!

Azure CLI is installed and you're logged in. Here's how to publish your extension:

## 🔑 Create Personal Access Token

1. **Go to Azure DevOps**: https://dev.azure.com
2. **Create or select organization** (if you don't have one, create it)
3. **Click your profile picture** → **Personal access tokens**
4. **New Token** with these settings:
   - **Name**: `VSCode Extension Publishing`
   - **Organization**: All accessible organizations
   - **Scopes**: Custom defined → **Marketplace (manage)** ✅

## 🚀 Quick Publish Commands

Once you have your PAT token, run these commands:

```bash
# Method 1: Direct publish with token
cd /Users/seyederick/DevOps/_project_folders/lanonasis-maas/vscode-extension
vsce login lanonasis
# Enter your PAT token when prompted
vsce publish

# Method 2: Use environment variable
export VSCE_PAT='your-pat-token-here'
vsce publish --pat $VSCE_PAT

# Method 3: Run our quick script
./quick-publish.sh
```

## 🔍 Verify Publication

```bash
# Check if published
vsce show lanonasis.lanonasis-memory

# List your extensions
vsce ls lanonasis
```

## 🌐 Direct Marketplace Links

- **Your Extension**: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory
- **Publisher Management**: https://marketplace.visualstudio.com/manage/publishers/lanonasis
- **Azure DevOps**: https://dev.azure.com

## 🔧 Troubleshooting

If you get authentication errors:
1. Make sure PAT token has `Marketplace (manage)` permission
2. Try `vsce logout` then `vsce login lanonasis` again
3. Verify your publisher exists at marketplace.visualstudio.com

## 📋 Alternative: Manual Upload

If CLI fails, you can always upload the `.vsix` file manually:
1. Go to: https://marketplace.visualstudio.com/manage/publishers/lanonasis
2. Click "New extension" → "Visual Studio Code"
3. Upload your `lanonasis-memory-1.2.0.vsix` file

The CLI method is usually more reliable than the web interface!
