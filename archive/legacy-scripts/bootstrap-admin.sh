#!/bin/bash

# Bootstrap Admin Script
# This creates the first admin API key for initial system access

# Set emergency token (change this to a secure value)
EMERGENCY_TOKEN="${EMERGENCY_BOOTSTRAP_TOKEN:-your-secure-emergency-token-here}"

# API endpoint
API_URL="${API_URL:-http://localhost:3000}"

# Admin details
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@lanonasis.com}"
ORG_NAME="${ORG_NAME:-Lanonasis Admin}"

echo "🚨 Emergency Admin Bootstrap Script"
echo "=================================="
echo "API URL: $API_URL"
echo "Admin Email: $ADMIN_EMAIL"
echo "Organization: $ORG_NAME"
echo ""

# Check if emergency route is active
echo "Checking emergency route status..."
STATUS=$(curl -s "$API_URL/api/v1/emergency/status")
if [[ $? -ne 0 ]]; then
    echo "❌ Failed to connect to API. Is the server running?"
    echo "Start the server with: EMERGENCY_BOOTSTRAP_TOKEN='$EMERGENCY_TOKEN' bun run dev"
    exit 1
fi

echo "✅ Emergency route is active"
echo ""

# Create admin API key
echo "Creating bootstrap admin API key..."
RESPONSE=$(curl -s -X POST "$API_URL/api/v1/emergency/bootstrap-admin" \
    -H "Content-Type: application/json" \
    -H "X-Emergency-Token: $EMERGENCY_TOKEN" \
    -d '{
        "email": "'$ADMIN_EMAIL'",
        "organizationName": "'$ORG_NAME'"
    }')

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Bootstrap successful!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo "⚠️  IMPORTANT: Save the API key above - it won't be shown again!"
    echo ""
    echo "Next steps:"
    echo "1. Save the API key to a secure location"
    echo "2. Use it to authenticate and fix the main auth system"
    echo "3. Delete src/routes/emergency-admin.ts after fixing auth"
    echo "4. Remove EMERGENCY_BOOTSTRAP_TOKEN from environment"
else
    echo "❌ Bootstrap failed!"
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi