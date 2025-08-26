#!/bin/bash

# Complete VS Code Extension Publishing Solution

echo "🎯 Complete Extension Publishing Solution"
echo "========================================"

# Set PAT token from environment variable or prompt user
if [ -z "$AZURE_DEVOPS_EXT_PAT" ]; then
    echo "⚠️  PAT Token not found in environment"
    read -s -p "Enter your Azure DevOps PAT token: " PAT_TOKEN
    export AZURE_DEVOPS_EXT_PAT=$PAT_TOKEN
    echo ""
fi

echo "✅ PAT Token is configured"
echo "✅ Azure account configured"

echo ""
echo "🔍 Step 1: Check current status"
echo "Current publishers you have access to:"
vsce ls-publishers

echo ""
echo "📋 Step 2: Publisher Creation Options"
echo ""
echo "Option A: Create 'lanonasis' publisher"
echo "1. Go to: https://marketplace.visualstudio.com/manage/publishers/"
echo "2. Create publisher with ID: lanonasis"
echo ""
echo "Option B: Use alternative publisher name"
echo "Try publisher names like: info-lanonasis, lanonasis-dev, lanonasis-memory"

echo ""
echo "🚀 Step 3: Once publisher is created, run:"
echo "vsce login [publisher-name]"
echo "vsce publish"

echo ""
echo "💡 Step 4: Manual upload fallback"
echo "If CLI fails, upload manually:"
echo "1. Go to: https://marketplace.visualstudio.com/manage/"
echo "2. Select your publisher"
echo "3. Upload lanonasis-memory-1.2.0.vsix"

echo ""
echo "🔧 Troubleshooting commands:"
echo "# Check if a publisher exists"
echo "curl -s https://marketplace.visualstudio.com/publishers/lanonasis"
echo ""
echo "# Test different publisher names"
echo "vsce login info-lanonasis"
echo "vsce login lanonasis-dev"

echo ""
echo "📋 Your extension details:"
echo "- Package: lanonasis-memory-1.2.0.vsix"
echo "- Size: $(ls -lh lanonasis-memory-1.2.0.vsix | awk '{print $5}')"
echo "- Publisher needed: lanonasis (or alternative)"
echo "- Full name will be: lanonasis.lanonasis-memory"
