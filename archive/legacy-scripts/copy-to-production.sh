#!/bin/bash

# Script to copy updated code from vibe-memory to lanonasis-maas

VIBE_DIR="/Users/seyederick/DevOps/_project_folders/vibe-memory"
PROD_DIR="/Users/seyederick/DevOps/_project_folders/lanonasis-maas"

echo "🚀 Copying updated code to production repository..."

# Check if production directory exists
if [ ! -d "$PROD_DIR" ]; then
    echo "❌ Error: Production directory not found at $PROD_DIR"
    exit 1
fi

# Copy VS Code Extension
echo "📁 Copying VS Code extension..."
mkdir -p "$PROD_DIR/vscode-extension/src"
cp -r "$VIBE_DIR/vscode-extension/src/"* "$PROD_DIR/vscode-extension/src/" 2>/dev/null || echo "  ⚠️  No src files to copy"
cp "$VIBE_DIR/vscode-extension/package.json" "$PROD_DIR/vscode-extension/" 2>/dev/null || echo "  ⚠️  No package.json"
cp "$VIBE_DIR/vscode-extension/tsconfig.json" "$PROD_DIR/vscode-extension/" 2>/dev/null || echo "  ⚠️  No tsconfig.json"
cp "$VIBE_DIR/vscode-extension/README-v1.2.0.md" "$PROD_DIR/vscode-extension/README.md" 2>/dev/null || echo "  ⚠️  No README"

# Copy SDK
echo "📁 Copying SDK..."
mkdir -p "$PROD_DIR/packages/lanonasis-sdk/src"
cp -r "$VIBE_DIR/packages/lanonasis-sdk/src/"* "$PROD_DIR/packages/lanonasis-sdk/src/" 2>/dev/null || echo "  ⚠️  No SDK src files"
cp "$VIBE_DIR/packages/lanonasis-sdk/package.json" "$PROD_DIR/packages/lanonasis-sdk/" 2>/dev/null || echo "  ⚠️  No SDK package.json"

# Copy Memory Client
echo "📁 Copying Memory Client..."
mkdir -p "$PROD_DIR/packages/memory-client"
cp -r "$VIBE_DIR/packages/memory-client/"* "$PROD_DIR/packages/memory-client/" 2>/dev/null || echo "  ⚠️  No memory-client files"

# Copy CLI updates
echo "📁 Copying CLI..."
mkdir -p "$PROD_DIR/cli/src"
cp -r "$VIBE_DIR/cli/src/"* "$PROD_DIR/cli/src/" 2>/dev/null || echo "  ⚠️  No CLI src files"
cp "$VIBE_DIR/cli/package.json" "$PROD_DIR/cli/" 2>/dev/null || echo "  ⚠️  No CLI package.json"

echo ""
echo "✅ Files copied to production repository!"
echo ""
echo "⚠️  IMPORTANT: Next steps:"
echo "1. Go to $PROD_DIR"
echo "2. Remove 'private: true' and '-dev' suffixes from package.json files"
echo "3. Run npm install in each directory"
echo "4. Build and publish packages"
echo ""
echo "📝 Package.json files to update:"
echo "- $PROD_DIR/vscode-extension/package.json"
echo "- $PROD_DIR/packages/lanonasis-sdk/package.json"
echo "- $PROD_DIR/packages/memory-client/package.json"
echo "- $PROD_DIR/cli/package.json"