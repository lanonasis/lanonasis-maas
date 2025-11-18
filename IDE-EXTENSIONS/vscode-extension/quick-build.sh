#!/bin/bash

# Quick build script for testing (no publish)

set -e

echo "🔨 Quick Build - LanOnasis VS Code Extension"
echo "============================================="
echo ""

# Clean
echo "Cleaning..."
rm -rf out/
rm -f *.vsix

# Install
echo "Installing dependencies..."
if command -v bun &> /dev/null; then
    bun install --silent
else
    npm install --silent
fi

# Compile
echo "Compiling..."
npm run compile

# Package
echo "Packaging..."
npm run package

VERSION=$(node -p "require('./package.json').version")
VSIX_FILE="lanonasis-memory-${VERSION}.vsix"

echo ""
echo "✅ Build complete!"
echo "📦 Package: ${VSIX_FILE}"
echo ""
echo "To test locally:"
echo "  code --install-extension ${VSIX_FILE} --force"
echo ""
