#!/bin/bash

echo "Creating VS Code extension package v1.2.0..."

# Check if vsce is available
if ! command -v vsce &> /dev/null; then
    echo "ERROR: vsce not found. Please install with: npm install -g vsce"
    exit 1
fi

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Copy extension files
cp -r . "$TEMP_DIR/"
cd "$TEMP_DIR"

# Remove unnecessary files
rm -rf node_modules .git .vscode lanonasis-memory-*.vsix

# Try to install dependencies locally
echo "Installing dependencies..."
npm install --no-package-lock --legacy-peer-deps 2>/dev/null || echo "Warning: npm install failed, continuing..."

# Package the extension
echo "Packaging extension..."
vsce package --no-dependencies

# Copy the vsix back
cp *.vsix "$OLDPWD/"

# Cleanup
cd "$OLDPWD"
rm -rf "$TEMP_DIR"

echo "Extension packaged successfully!"
ls -la *.vsix