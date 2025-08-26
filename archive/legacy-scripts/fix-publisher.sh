#!/bin/bash

# Fix VS Code Extension Publishing - Publisher Setup Required

echo "🔧 Publisher Setup Required"
echo "==========================="

echo "The error indicates the publisher 'lanonasis' doesn't exist yet."
echo "You need to create it via the web interface first."

echo ""
echo "📋 Step 1: Create Publisher"
echo "1. Go to: https://marketplace.visualstudio.com/manage/publishers/"
echo "2. Click 'Create Publisher'"
echo "3. Fill in the details:"
echo "   - Publisher ID: lanonasis"
echo "   - Display Name: Lanonasis"
echo "   - Description: Memory as a Service solutions"
echo "   - Website: https://github.com/lanonasis/lanonasis-maas"

echo ""
echo "📋 Step 2: After creating publisher, run:"
echo "export AZURE_DEVOPS_EXT_PAT='your-pat-token-here'"
echo "vsce login lanonasis"
echo "vsce publish"

echo ""
echo "🔍 Alternative: Check if publisher already exists"
echo "If you think the publisher should exist, check:"
echo "https://marketplace.visualstudio.com/publishers/lanonasis"

echo ""
echo "💡 Quick verification:"
echo "After creating the publisher, you can verify with:"
echo "vsce ls-publishers"
