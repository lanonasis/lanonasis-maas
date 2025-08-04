#!/bin/bash

# Essential GitHub Secrets Setup for LanOnasis MaaS
# This script sets up the minimum required secrets to get CI/CD working

set -e

echo "🔐 Setting up Essential GitHub Secrets for LanOnasis MaaS"
echo "========================================================="

# Check if gh CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo "🔑 Please authenticate with GitHub first:"
    gh auth login
    exit 1
fi

echo ""
echo "📋 This will set up the essential secrets needed for CI/CD:"
echo "   - Supabase test credentials"
echo "   - OpenAI API key for testing"
echo "   - PostgreSQL password for testing"
echo ""

# Essential secrets for CI/CD to work
echo "🔑 Setting up essential secrets..."
echo ""

# Supabase Test URL
echo "Enter your Supabase Project URL (e.g., https://your-project.supabase.co):"
read -r supabase_url
echo "$supabase_url" | gh secret set TEST_SUPABASE_URL
echo "✅ Set TEST_SUPABASE_URL"

# Supabase Anon Key
echo ""
echo "Enter your Supabase Anon Key:"
read -s supabase_anon_key
echo "$supabase_anon_key" | gh secret set TEST_SUPABASE_KEY
echo "✅ Set TEST_SUPABASE_KEY"

# Supabase Service Key
echo ""
echo "Enter your Supabase Service Role Key:"
read -s supabase_service_key
echo "$supabase_service_key" | gh secret set TEST_SUPABASE_SERVICE_KEY
echo "✅ Set TEST_SUPABASE_SERVICE_KEY"

# OpenAI API Key
echo ""
echo "Enter your OpenAI API Key:"
read -s openai_key
echo "$openai_key" | gh secret set TEST_OPENAI_API_KEY
echo "✅ Set TEST_OPENAI_API_KEY"

# PostgreSQL Password for testing
echo ""
echo "Enter a PostgreSQL password for testing (or press Enter for default 'postgres'):"
read -s postgres_password
if [ -z "$postgres_password" ]; then
    postgres_password="test_password_123"
fi
echo "$postgres_password" | gh secret set POSTGRES_PASSWORD
echo "✅ Set POSTGRES_PASSWORD"

echo ""
echo "🎉 Essential secrets configured successfully!"
echo ""
echo "📋 Configured secrets:"
gh secret list
echo ""
echo "🚀 Your CI/CD pipeline should now work!"
echo "   - TypeScript compilation will pass"
echo "   - Tests can run with Supabase"
echo "   - Deploy workflow will use Bun correctly"
echo ""
echo "💡 To configure additional secrets later, run:"
echo "   ./configure-github-secrets.sh"
