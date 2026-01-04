#!/bin/bash
# Test CLI authentication and operations

echo "🧪 Testing MaaS CLI Authentication"

# Set test environment
export MEMORY_API_URL="http://localhost:3000/api/v1"
export CLI_VERBOSE=true

# Test credentials
TEST_EMAIL="test@lanonasis.com"
TEST_PASSWORD="Test123!@#"

echo "📍 Using API URL: $MEMORY_API_URL"
echo ""

# Navigate to CLI directory
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas/cli

# Test 1: Health check
echo "1️⃣ Testing API health endpoint..."
curl -s http://localhost:3000/api/v1/health | jq '.' || echo "❌ Health check failed"
echo ""

# Test 2: Registration (will fail if user exists, that's ok)
echo "2️⃣ Testing user registration..."
bun run dev -- auth register --email "$TEST_EMAIL" --password "$TEST_PASSWORD" --org "Test Organization" || echo "⚠️  Registration failed (user may already exist)"
echo ""

# Test 3: Login
echo "3️⃣ Testing user login..."
bun run dev -- auth login --email "$TEST_EMAIL" --password "$TEST_PASSWORD"
echo ""

# Test 4: Memory operations
echo "4️⃣ Testing memory operations..."

# Create memory
echo "   Creating memory..."
bun run dev -- memory create "Test Memory" --content "This is a test memory entry" --type context --tags "test,cli"

# List memories
echo "   Listing memories..."
bun run dev -- memory list --limit 5

# Search memories
echo "   Searching memories..."
bun run dev -- memory search "test"

echo ""
echo "✅ CLI authentication tests complete!"