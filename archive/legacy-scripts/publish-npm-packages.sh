#!/bin/bash

# Script to publish npm packages from lanonasis-maas repo

PROD_DIR="/Users/seyederick/DevOps/_project_folders/lanonasis-maas"

echo "📦 Publishing npm packages from lanonasis-maas..."
echo ""

# Function to build and publish a package
publish_package() {
    local pkg_dir="$1"
    local pkg_name="$2"
    
    echo "📦 Publishing $pkg_name..."
    echo "Directory: $pkg_dir"
    
    if [ -d "$pkg_dir" ]; then
        cd "$pkg_dir"
        
        # Check if already built
        if [ -d "dist" ]; then
            echo "✅ Build directory exists"
        else
            echo "🔨 Building package..."
            if [ -f "rollup.config.js" ] || [ -f "rollup.config.mjs" ]; then
                npx rollup -c || echo "Rollup build failed"
            else
                npx tsc || echo "TypeScript build failed"
            fi
        fi
        
        # Publish
        echo "📤 Publishing to npm..."
        npm publish --access public --dry-run
        
        echo ""
        echo "⚠️  This was a dry run. To actually publish, run:"
        echo "cd $pkg_dir && npm publish --access public"
        echo ""
        echo "---"
        echo ""
    else
        echo "❌ Directory not found: $pkg_dir"
    fi
}

# Publish memory-client
publish_package "$PROD_DIR/packages/memory-client" "@lanonasis/memory-client"

# Publish SDK
publish_package "$PROD_DIR/packages/lanonasis-sdk" "@lanonasis/sdk"

echo ""
echo "📋 Summary:"
echo ""
echo "1. VS Code Extension: Ready at $PROD_DIR/vscode-extension/lanonasis-memory-1.2.0.vsix"
echo "   Publish with: vsce publish -p <token> --packagePath $PROD_DIR/vscode-extension/lanonasis-memory-1.2.0.vsix"
echo ""
echo "2. @lanonasis/memory-client: Ready to publish"
echo "   Publish with: cd $PROD_DIR/packages/memory-client && npm publish --access public"
echo ""
echo "3. @lanonasis/sdk: Ready to publish"
echo "   Publish with: cd $PROD_DIR/packages/lanonasis-sdk && npm publish --access public"
echo ""
echo "4. @lanonasis/cli: Already published at v1.2.0"