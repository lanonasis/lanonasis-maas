#!/bin/bash
# Development backend startup script

echo "🚀 Starting MaaS Backend Development Server"

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Creating from template..."
  cp .env.template .env
  echo "📝 Please update .env with your actual values"
  exit 1
fi

# Start the backend server
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/lanonasis-maas
echo "📦 Installing dependencies..."
bun install

echo "🔧 Starting backend server..."
bun run dev