#!/bin/bash

# GitHub Secrets Configuration Script for LanOnasis MaaS
# This script configures all required secrets for CI/CD pipelines

set -e

echo "🔐 Configuring GitHub Secrets for LanOnasis MaaS"
echo "================================================"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed. Please install it first:"
    echo "   brew install gh"
    exit 1
fi

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if user is authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo "🔑 Please authenticate with GitHub first:"
    gh auth login
fi

echo ""
echo "📋 This script will configure the following secrets:"
echo "   - Supabase credentials (URL, keys)"
echo "   - OpenAI API key"
echo "   - AWS credentials (optional)"
echo "   - Docker registry credentials (optional)"
echo "   - Deployment credentials (optional)"
echo ""

# Function to set secret safely
set_secret() {
    local secret_name=$1
    local secret_description=$2
    local is_required=${3:-true}
    
    echo -n "🔑 Enter $secret_description"
    if [ "$is_required" = "false" ]; then
        echo -n " (optional, press Enter to skip)"
    fi
    echo ": "
    
    read -s secret_value
    
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$secret_name"
        echo "✅ Set $secret_name"
    elif [ "$is_required" = "true" ]; then
        echo "❌ $secret_name is required. Please provide a value."
        exit 1
    else
        echo "⏭️  Skipped $secret_name"
    fi
    echo ""
}

# Function to get Supabase project info
get_supabase_info() {
    echo "🔍 Getting Supabase project information..."
    
    # Try to get project info from local config
    if [ -f "supabase/config.toml" ]; then
        project_id=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
        if [ -n "$project_id" ]; then
            echo "📋 Found Supabase project ID: $project_id"
            
            # Get project details
            supabase projects list > /dev/null 2>&1 || {
                echo "🔑 Please login to Supabase first:"
                supabase login
            }
            
            # Get project URL and keys
            project_url="https://$project_id.supabase.co"
            echo "🌐 Project URL: $project_url"
            
            # Set Supabase secrets automatically
            echo "$project_url" | gh secret set TEST_SUPABASE_URL
            echo "✅ Set TEST_SUPABASE_URL"
            
            echo ""
            echo "🔑 Please get your Supabase keys from: https://supabase.com/dashboard/project/$project_id/settings/api"
            echo ""
        fi
    else
        echo "⚠️  No Supabase config found. You'll need to enter URLs and keys manually."
    fi
}

echo "🚀 Starting secret configuration..."
echo ""

# Get Supabase information
get_supabase_info

# Configure Supabase secrets
echo "📊 SUPABASE CONFIGURATION"
echo "========================"
set_secret "TEST_SUPABASE_KEY" "Supabase Anon Key (for testing)"
set_secret "TEST_SUPABASE_SERVICE_KEY" "Supabase Service Role Key (for testing)"

echo ""
echo "🤖 AI SERVICES CONFIGURATION"
echo "============================"
set_secret "TEST_OPENAI_API_KEY" "OpenAI API Key (for testing)"
set_secret "OPENAI_API_KEY" "OpenAI API Key (for production)"

echo ""
echo "🐘 DATABASE CONFIGURATION"
echo "========================="
set_secret "POSTGRES_PASSWORD" "PostgreSQL Password (for testing)" false

echo ""
echo "☁️  AWS CONFIGURATION (Optional)"
echo "==============================="
set_secret "AWS_ACCESS_KEY_ID" "AWS Access Key ID" false
set_secret "AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key" false

echo ""
echo "🐳 DOCKER CONFIGURATION (Optional)"
echo "=================================="
set_secret "DOCKER_REGISTRY" "Docker Registry URL (e.g., ghcr.io)" false
set_secret "DOCKER_USERNAME" "Docker Registry Username" false
set_secret "DOCKER_PASSWORD" "Docker Registry Password" false

echo ""
echo "🚀 DEPLOYMENT CONFIGURATION (Optional)"
echo "======================================"
set_secret "DEPLOY_KEY" "SSH Deploy Key (private key content)" false
set_secret "PRODUCTION_HOST" "Production Server Host" false

echo ""
echo "📦 NPM CONFIGURATION (Optional)"
echo "==============================="
set_secret "NPM_TOKEN" "NPM Token (for publishing packages)" false

echo ""
echo "💬 NOTIFICATIONS (Optional)"
echo "==========================="
set_secret "SLACK_WEBHOOK" "Slack Webhook URL" false

echo ""
echo "🧪 PERFORMANCE TESTING (Optional)"
echo "================================="
set_secret "PERF_TEST_API_KEY" "Performance Test API Key" false

echo ""
echo "🤖 CLAUDE INTEGRATION (Optional)"
echo "================================"
set_secret "CLAUDE_CODE_OAUTH_TOKEN" "Claude Code OAuth Token" false

echo ""
echo "🎉 Secret configuration completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify secrets: gh secret list"
echo "   2. Update workflow files if needed"
echo "   3. Push changes to trigger CI/CD"
echo ""
echo "🔍 To view configured secrets:"
echo "   gh secret list"
