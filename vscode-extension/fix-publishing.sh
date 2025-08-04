#!/bin/bash

# VS Code Extension Publishing Script
# Run this after creating PAT token with Marketplace (manage) permission

echo "🔐 Step 1: Login with your new PAT token"
vsce login lanonasis

echo "📦 Step 2: Package the extension"
vsce package

echo "🚀 Step 3: Publish to marketplace"
vsce publish

echo "✅ Step 4: Verify publication"
echo "Waiting 30 seconds for marketplace to update..."
sleep 30
vsce show lanonasis.lanonasis-memory

echo "📋 Step 5: List your published extensions"
vsce ls lanonasis

echo "🔍 Check your extension at:"
echo "https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory"
