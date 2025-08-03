#!/bin/bash

# Script to package the VS Code extension from lanonasis-maas repo

PROD_DIR="/Users/seyederick/DevOps/_project_folders/lanonasis-maas"
WORK_DIR="/Users/seyederick/DevOps/_project_folders/vibe-memory/temp-vscode-ext"

echo "📦 Packaging VS Code extension from lanonasis-maas..."
echo ""

# Create temporary working directory
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"

# Copy extension files
echo "Copying extension files..."
cp -r "$PROD_DIR/vscode-extension/"* "$WORK_DIR/"

# Navigate to temp directory and package
cd "$WORK_DIR"

echo "Creating VSIX package..."
vsce package --no-yarn

# Copy the vsix back to original location
if [ -f *.vsix ]; then
    cp *.vsix "$PROD_DIR/vscode-extension/"
    echo ""
    echo "✅ Extension packaged successfully!"
    echo "📦 Package location: $PROD_DIR/vscode-extension/"
    ls -la "$PROD_DIR/vscode-extension/"*.vsix
else
    echo "❌ Failed to create VSIX package"
    exit 1
fi

# Clean up
cd ..
rm -rf "$WORK_DIR"

echo ""
echo "🚀 Ready to publish!"
echo "Run: vsce publish -p <your-token> --packagePath $PROD_DIR/vscode-extension/*.vsix"