#!/bin/bash

# Enhanced UI Build and Test Script
# This script builds the React components and tests the enhanced UI

set -e

echo "🚀 Building Enhanced UI for Lanonasis Extension..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the extension root directory."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Compile TypeScript
echo "🔨 Compiling TypeScript..."
npm run compile

# Build React components
echo "⚛️  Building React components..."
npm run build:react

# Check if React build was successful
if [ ! -f "media/sidebar-react.js" ]; then
    echo "❌ Error: React build failed - sidebar-react.js not found"
    exit 1
fi

echo "✅ React build successful!"

# Test package build
echo "📦 Testing package build..."
npm run build:package

# Check if package was created
if [ ! -f "lanonasis-memory-*.vsix" ]; then
    echo "❌ Warning: Package build may have failed"
else
    echo "✅ Package build successful!"
fi

echo ""
echo "🎉 Enhanced UI build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the enhanced UI by setting 'lanonasis.useEnhancedUI': true in VS Code settings"
echo "2. Reload VS Code to activate the enhanced UI"
echo "3. If issues occur, set 'lanonasis.useEnhancedUI': false to fallback to original UI"
echo ""
echo "🔧 Debug commands:"
echo "   - Enable enhanced UI:   'lanonasis.useEnhancedUI': true"
echo "   - Disable enhanced UI:  'lanonasis.useEnhancedUI': false"
echo "   - Check logs:           View 'Lanonasis' output channel"
echo ""
