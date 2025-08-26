#!/bin/bash

# Get Supabase Credentials Helper Script
# This script helps you get your Supabase project credentials

set -e

echo "🔍 Getting Supabase Project Credentials"
echo "======================================="

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Installing now..."
    if command -v npm &> /dev/null; then
        npm install -g supabase
    elif command -v bun &> /dev/null; then
        bun add -g supabase
    else
        echo "Please install Node.js or Bun first, then run: npm install -g supabase"
        exit 1
    fi
fi

# Check if user is authenticated
if ! supabase projects list &> /dev/null; then
    echo "🔑 Please login to Supabase first:"
    supabase login
fi

echo ""
echo "📋 Your Supabase Projects:"
supabase projects list

echo ""
echo "🔍 To get your project credentials:"
echo "   1. Go to https://supabase.com/dashboard"
echo "   2. Select your project"
echo "   3. Go to Settings > API"
echo "   4. Copy the following:"
echo "      - Project URL"
echo "      - Anon (public) key"
echo "      - Service role (secret) key"
echo ""
echo "💡 Or run this command to open your project settings:"
echo "   supabase projects list"
echo "   # Then visit: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api"
echo ""
echo "🚀 Once you have your credentials, run:"
echo "   ./setup-essential-secrets.sh"
