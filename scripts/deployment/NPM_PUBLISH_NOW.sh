#!/bin/bash

echo "🚀 Publishing @lanonasis/cli v3.0.3 to NPM"
echo "=========================================="
echo ""

# Navigate to CLI directory
cd cli || exit 1

# Verify version
VERSION=$(node -p "require('./package.json').version")
echo "📦 Package: @lanonasis/cli"
echo "📌 Version: $VERSION"
echo ""

# Check if logged in to npm
if ! npm whoami &> /dev/null; then
    echo "❌ Not logged in to npm"
    echo "Please run: npm login"
    exit 1
fi

NPM_USER=$(npm whoami)
echo "👤 NPM User: $NPM_USER"
echo ""

# Confirm publication
read -p "🤔 Publish @lanonasis/cli@$VERSION to npm? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Publication cancelled"
    exit 0
fi

echo ""
echo "📦 Publishing to npm..."
echo ""

# Publish
npm publish --access public

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully published @lanonasis/cli@$VERSION"
    echo ""
    echo "🔍 Verify with:"
    echo "  npm view @lanonasis/cli version"
    echo ""
    echo "📥 Install with:"
    echo "  npm install -g @lanonasis/cli@latest"
    echo ""
    echo "🧪 Test with:"
    echo "  lanonasis --version"
    echo "  lanonasis auth login"
    echo "  lanonasis status"
else
    echo ""
    echo "❌ Publication failed"
    echo "Check error messages above"
    exit 1
fi
