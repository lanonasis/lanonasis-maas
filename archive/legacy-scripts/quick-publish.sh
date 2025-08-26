#!/bin/bash

# Quick VS Code Extension Publishing via Azure CLI
# This is the simplified version

echo "🚀 Quick Publishing Setup"
echo "========================"

# Step 1: Login to Azure
echo "1️⃣ Login to Azure..."
az login

# Step 2: Get your organizations
echo "2️⃣ Available Azure DevOps organizations:"
az devops project list --output table 2>/dev/null || echo "No projects found. You may need to create an organization first."

# Step 3: Create PAT token manually (most reliable)
echo "3️⃣ Create PAT Token manually:"
echo "   📍 Go to: https://dev.azure.com"
echo "   📍 Click Profile → Personal Access Tokens"
echo "   📍 Create token with 'Marketplace (manage)' scope"
echo "   📍 Copy the token"

read -p "Press Enter when you have created your PAT token..."

# Step 4: Use the token with vsce
echo "4️⃣ Publishing with vsce..."
read -s -p "Enter your PAT token: " PAT_TOKEN
echo

# Export the token for vsce
export AZURE_DEVOPS_EXT_PAT=$PAT_TOKEN

# Login with vsce using the token
echo "Logging in with vsce..."
echo $PAT_TOKEN | vsce login lanonasis

# Publish the extension
echo "Publishing extension..."
vsce publish

echo "✅ Done! Check your extension at:"
echo "https://marketplace.visualstudio.com/items?itemName=lanonasis.lanonasis-memory"
