#!/bin/bash

# Publish VS Code Extension to Marketplace
# Version 1.4.0 - OAuth2 + Secure API Key Management

echo "🚀 Publishing LanOnasis Memory Extension to VS Code Marketplace"
echo "=========================================================="

# Ensure we're in the IDE-EXTENSIONS directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/vscode-extension" || exit 1

# Check current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version: $CURRENT_VERSION"

# Pre-publish checks
echo ""
echo "🔍 Running pre-publish checks..."
if [ ! -f "images/icon.png" ]; then
    echo "❌ Error: Icon file missing (images/icon.png)"
    exit 1
fi
if [ ! -f "README.md" ]; then
    echo "❌ Error: README.md missing"
    exit 1
fi
if [ ! -f "CHANGELOG.md" ]; then
    echo "⚠️  Warning: CHANGELOG.md missing (recommended)"
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Build extension
echo "🔨 Building extension..."
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

# Package extension
echo "📦 Packaging extension..."
vsce package --no-dependencies

if [ -f "lanonasis-memory-${CURRENT_VERSION}.vsix" ]; then
    echo "✅ Package created: lanonasis-memory-${CURRENT_VERSION}.vsix"
    
    # Publish
    echo ""
    echo "📤 Publishing to VS Code Marketplace..."
    echo "Note: You may be prompted for your Personal Access Token"
    echo ""
    
    vsce publish
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully published version ${CURRENT_VERSION}!"
        echo "🌐 View at: https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory"
        echo ""
        echo "Next steps:"
        echo "1. Wait 5-10 minutes for marketplace to update"
        echo "2. Users will auto-update or can manually update"
        echo "3. Monitor reviews and feedback"
    else
        echo ""
        echo "❌ Publishing failed. Common issues:"
        echo "1. Invalid or expired PAT token"
        echo "2. Network connectivity issues"
        echo "3. Version already exists"
        echo ""
        echo "To get a new PAT:"
        echo "1. Go to: https://dev.azure.com/lanonasis/_usersSettings/tokens"
        echo "2. Create token with 'Marketplace > Manage' scope"
        echo "3. Run: vsce publish -p YOUR_TOKEN"
    fi
else
    echo "❌ Package creation failed!"
fi
