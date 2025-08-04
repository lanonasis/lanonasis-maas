#!/bin/bash

# VS Code Extension Publishing via Azure CLI
# This script publishes your extension to the Visual Studio Marketplace

set -e  # Exit on any error

echo "🚀 Publishing VS Code Extension via Azure CLI"
echo "=============================================="

# Configuration
PUBLISHER="lanonasis"
EXTENSION_NAME="lanonasis-memory"
PACKAGE_FILE="lanonasis-memory-1.2.0.vsix"

# Step 1: Login to Azure (if not already logged in)
echo "📋 Step 1: Checking Azure login status..."
if ! az account show &>/dev/null; then
    echo "Please login to Azure first:"
    az login
else
    echo "✅ Already logged into Azure"
fi

# Step 2: Configure Azure DevOps organization (if needed)
echo "📋 Step 2: Configuring Azure DevOps..."
echo "If you don't have an organization, create one at: https://dev.azure.com"
read -p "Enter your Azure DevOps organization name: " ORG_NAME

# Set the default organization
az devops configure --defaults organization=https://dev.azure.com/$ORG_NAME

# Step 3: Create Personal Access Token via CLI
echo "📋 Step 3: Creating Personal Access Token..."
echo "We'll create a PAT token with Marketplace permissions"

# Create PAT token with required scopes
TOKEN_NAME="VSCode-Extension-Publishing-$(date +%Y%m%d)"
EXPIRY_DATE=$(date -v +1y +%Y-%m-%d)  # 1 year from now

echo "Creating PAT token: $TOKEN_NAME"
PAT_RESULT=$(az devops security group create \
    --name "$TOKEN_NAME" \
    --description "Token for VS Code Extension Publishing" \
    --organization https://dev.azure.com/$ORG_NAME 2>/dev/null || echo "Group may already exist")

# Alternative: Manual PAT creation instructions
echo "⚠️  If automatic token creation fails, create manually:"
echo "1. Go to: https://dev.azure.com/$ORG_NAME/_usersSettings/tokens"
echo "2. Create new token with these scopes:"
echo "   - Marketplace (manage)"
echo "   - Extensions (read & manage)"
echo "3. Copy the token and run: export AZURE_DEVOPS_EXT_PAT='your-token-here'"

# Step 4: Package the extension (if not already done)
echo "📦 Step 4: Packaging extension..."
if [ ! -f "$PACKAGE_FILE" ]; then
    echo "Creating package file..."
    vsce package
else
    echo "✅ Package file exists: $PACKAGE_FILE"
fi

# Step 5: Upload to marketplace using Azure CLI
echo "🚀 Step 5: Publishing to Visual Studio Marketplace..."

# Method 1: Using vsce with Azure CLI token
if [ -n "$AZURE_DEVOPS_EXT_PAT" ]; then
    echo "Using Azure DevOps PAT token..."
    vsce publish --pat $AZURE_DEVOPS_EXT_PAT
else
    echo "Please set your PAT token:"
    read -s -p "Enter your PAT token: " PAT_TOKEN
    export AZURE_DEVOPS_EXT_PAT=$PAT_TOKEN
    vsce publish --pat $PAT_TOKEN
fi

# Step 6: Verify publication
echo "✅ Step 6: Verifying publication..."
sleep 10
vsce show $PUBLISHER.$EXTENSION_NAME

echo "🎉 Extension published successfully!"
echo "🔗 Check your extension at:"
echo "   https://marketplace.visualstudio.com/items?itemName=$PUBLISHER.$EXTENSION_NAME"
echo "🔗 Manage at:"
echo "   https://marketplace.visualstudio.com/manage/publishers/$PUBLISHER"

# Step 7: Optional - Set up automated publishing
echo "📋 Setting up automated publishing workflow..."
cat > .github/workflows/publish-extension.yml << 'EOF'
name: Publish VS Code Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Package extension
        run: npx vsce package
        
      - name: Publish to marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: npx vsce publish --pat $VSCE_PAT

EOF

echo "✅ GitHub Actions workflow created at .github/workflows/publish-extension.yml"
echo "💡 Add your PAT token as VSCE_PAT secret in GitHub repository settings"
