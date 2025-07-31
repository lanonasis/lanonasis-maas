#!/bin/bash

# Lanonasis Memory Service - Production Deployment Script
# Deploys complete end-to-end system to api.lanonasis.com and docs.lanonasis.com

set -e

echo "🚀 Starting Lanonasis Memory Service Production Deployment..."

# Configuration
COMPOSE_FILE="deploy/production.yml"
ENV_FILE=".env.production"

# Check if production environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Production environment file not found: $ENV_FILE"
    echo "Please create $ENV_FILE with your production configuration"
    echo "Use .env.example as a template"
    exit 1
fi

# Load production environment
export $(cat $ENV_FILE | grep -v '^#' | xargs)

echo "📋 Pre-deployment checks..."

# Check required environment variables
REQUIRED_VARS=(
    "SUPABASE_URL"
    "SUPABASE_KEY" 
    "SUPABASE_SERVICE_KEY"
    "JWT_SECRET"
    "OPENAI_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable not set: $var"
        exit 1
    fi
done

echo "✅ Environment variables validated"

# Build and deploy services
echo "🏗️  Building services..."

# Build main API service
echo "Building Memory Service API..."
docker-compose -f $COMPOSE_FILE build lanonasis-api

# Build documentation site
echo "Building documentation site..."
docker-compose -f $COMPOSE_FILE build docs-site

echo "✅ Services built successfully"

# Deploy to production
echo "🚀 Deploying to production..."

# Stop existing services
docker-compose -f $COMPOSE_FILE down

# Start services
docker-compose -f $COMPOSE_FILE up -d

echo "⏳ Waiting for services to start..."
sleep 10

# Health checks
echo "🔍 Running health checks..."

# Check API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health || echo "000")
if [ "$API_HEALTH" = "200" ]; then
    echo "✅ API service healthy"
else
    echo "❌ API service health check failed (HTTP $API_HEALTH)"
fi

# Check docs health
DOCS_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "000")
if [ "$DOCS_HEALTH" = "200" ]; then
    echo "✅ Documentation service healthy"
else
    echo "❌ Documentation service health check failed (HTTP $DOCS_HEALTH)"
fi

# Display deployment status
echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📍 Service Endpoints:"
echo "   • API & Dashboard: https://api.lanonasis.com"
echo "   • Documentation:   https://docs.lanonasis.com"
echo "   • API Docs:        https://api.lanonasis.com/docs"
echo "   • SSE Endpoint:    https://api.lanonasis.com/sse"
echo "   • Metrics:         https://api.lanonasis.com/metrics"
echo ""
echo "🔧 Management:"
echo "   • View logs:       docker-compose -f $COMPOSE_FILE logs -f"
echo "   • Stop services:   docker-compose -f $COMPOSE_FILE down"
echo "   • Restart:         docker-compose -f $COMPOSE_FILE restart"
echo ""
echo "✅ Lanonasis Memory Service is now live!"
