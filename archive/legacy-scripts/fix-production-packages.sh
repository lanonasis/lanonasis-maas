#!/bin/bash

# Script to fix package.json files in production repository

PROD_DIR="/Users/seyederick/DevOps/_project_folders/lanonasis-maas"

echo "🔧 Fixing package.json files in production repository..."
echo ""

# Function to fix package.json
fix_package_json() {
    local file="$1"
    local name="$2"
    
    if [ -f "$file" ]; then
        echo "Fixing $file..."
        
        # Remove -dev suffix from version
        sed -i '' 's/"version": "1.2.0-dev"/"version": "1.2.0"/g' "$file"
        
        # Remove private: true
        sed -i '' '/"private": true,/d' "$file"
        
        # Remove prepublishOnly script that blocks publishing
        sed -i '' '/"prepublishOnly": "echo.*exit 1",/d' "$file"
        
        # Update description to remove [DEVELOPMENT]
        sed -i '' 's/\[DEVELOPMENT\] //g' "$file"
        
        echo "✅ Fixed $name"
    else
        echo "⚠️  $file not found"
    fi
}

# Fix CLI package.json
fix_package_json "$PROD_DIR/cli/package.json" "CLI"

# Fix SDK package.json
fix_package_json "$PROD_DIR/packages/lanonasis-sdk/package.json" "SDK"

# Fix Memory Client package.json
fix_package_json "$PROD_DIR/packages/memory-client/package.json" "Memory Client"

# Fix VS Code Extension package.json
fix_package_json "$PROD_DIR/vscode-extension/package.json" "VS Code Extension"

echo ""
echo "✅ All package.json files fixed!"
echo ""
echo "📋 Next steps:"
echo "1. cd $PROD_DIR"
echo "2. Build and publish each package:"
echo "   - VS Code Extension: cd vscode-extension && npm install && npm run compile && vsce package && vsce publish"
echo "   - Memory Client: cd packages/memory-client && npm publish --access public"
echo "   - SDK: cd packages/lanonasis-sdk && npm publish --access public"
echo ""
echo "Note: CLI is already published at v1.2.0"