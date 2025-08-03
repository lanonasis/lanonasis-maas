# LanOnasis MaaS Deployment Guide

## Overview

This guide covers the deployment of the LanOnasis Memory as a Service (MaaS) platform, including the API service, CLI tools, and SDK packages. The platform now includes integrated API Key Management with Model Context Protocol (MCP) support.

## Architecture Components

### 1. **Core Service** (`@lanonasis/memory-service`)
- Express.js REST API with TypeScript
- Memory management with vector search
- API key management with encryption
- MCP integration for AI agents
- Multi-tenant architecture with organization isolation

### 2. **CLI Tool** (`@lanonasis/cli`)
- Command-line interface for all operations
- Memory management commands
- API key storage and rotation
- MCP tool registration and access
- Interactive and batch modes

### 3. **SDK Package** (`@lanonasis/sdk`)
- TypeScript SDK for developers
- Memory operations client
- API key management client
- MCP integration client
- Full TypeScript support

## Deployment Methods

### Method 1: Docker Deployment (Recommended)

#### Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
pip install docker-compose
```

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the services
docker-compose up -d

# Check service health
curl http://localhost:3000/api/v1/health
```

#### Production Docker Deployment
```bash
# Build production image
./scripts/deploy.sh docker --env production

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose logs -f memory-service
```

### Method 2: Kubernetes Deployment

#### Prerequisites
```bash
# Install kubectl and helm
curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

#### Deployment Steps
```bash
# Create namespace
kubectl create namespace lanonasis

# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy the service
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Enable auto-scaling
kubectl apply -f k8s/hpa.yaml

# Check deployment status
kubectl get pods -n lanonasis
kubectl rollout status deployment/lanonasis-maas -n lanonasis
```

### Method 3: Manual/VM Deployment

#### Prerequisites
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install PostgreSQL and Redis
sudo apt-get install postgresql postgresql-contrib redis-server
```

#### Deployment Steps
```bash
# Clone and build
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas

# Install dependencies and build
npm run workspace:install
npm run workspace:build

# Set up database
sudo -u postgres createdb lanonasis_maas
psql -U postgres -d lanonasis_maas -f src/db/schema.sql
psql -U postgres -d lanonasis_maas -f src/db/schema-api-keys.sql

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## NPM Package Deployment

### SDK Deployment

#### Automatic via CI/CD
```bash
# Tag and push for automatic deployment
git tag sdk-v1.0.0
git push origin sdk-v1.0.0

# Or trigger manual deployment
git commit -m "feat: new SDK features [publish-sdk]"
git push origin main
```

#### Manual Deployment
```bash
# Build and publish SDK
cd packages/lanonasis-sdk
npm run build
npm version patch
npm publish --access public

# Or use deployment script
./scripts/deploy.sh publish-sdk --version 1.0.1
```

#### Installation and Usage
```bash
# Install SDK
npm install @lanonasis/sdk

# Usage example
import LanOnasis from '@lanonasis/sdk';

const client = new LanOnasis({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: 'your-api-key'
});

// Memory operations
const memory = await client.memory.create({
  title: 'Important Note',
  content: 'AI development best practices',
  type: 'knowledge'
});

// API Key operations
const apiKey = await client.apiKeys.create({
  name: 'openai_api_key',
  value: 'sk-...',
  keyType: 'api_key',
  environment: 'production'
});

// MCP operations
const session = await client.mcp.requestAccess({
  toolId: 'ai-assistant',
  keyNames: ['openai_api_key'],
  justification: 'Processing user query'
});
```

### CLI Deployment

#### Automatic via CI/CD
```bash
# Tag and push for automatic deployment
git tag cli-v1.1.0
git push origin cli-v1.1.0

# Or trigger manual deployment
git commit -m "feat: new CLI features [publish-cli]"
git push origin main
```

#### Manual Deployment
```bash
# Build and publish CLI
cd cli
npm run build
npm version minor
npm publish --access public

# Or use deployment script
./scripts/deploy.sh publish-cli --version 1.1.0
```

#### Installation and Usage
```bash
# Install CLI globally
npm install -g @lanonasis/cli

# Initialize and authenticate
lanonasis init
lanonasis login

# Memory operations
memory create --title "Project Notes" --content "Important information"
memory search "AI development"
memory list --type context

# API Key operations
lanonasis api-keys create --name "stripe_key" --type "api_key"
lanonasis api-keys list --environment production
lanonasis api-keys mcp register-tool --tool-id "payment-processor"

# Get help
lanonasis --help
memory --help
```

## Environment Configuration

### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/lanonasis_maas
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Authentication
JWT_SECRET=your-32-character-secret-key
API_KEY_ENCRYPTION_KEY=your-encryption-key-for-api-keys

# OpenAI Integration
OPENAI_API_KEY=your-openai-api-key

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_METRICS=true
```

### Optional Environment Variables

```bash
# MCP Configuration
MCP_SERVER_PORT=3001
MCP_ENABLE_REMOTE=true

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret

# Storage Configuration
MAX_MEMORY_SIZE=10000
MAX_BATCH_SIZE=100

# Security Configuration
CORS_ORIGIN=https://your-frontend-domain.com
TRUSTED_PROXIES=cloudflare
```

## Deployment Scripts

### Using the Deployment Script

```bash
# Build all components
./scripts/deploy.sh build

# Deploy to staging
./scripts/deploy.sh deploy --env staging

# Deploy to production (with confirmation)
./scripts/deploy.sh deploy --env production

# Publish SDK and CLI
./scripts/deploy.sh publish-sdk --version 1.0.0
./scripts/deploy.sh publish-cli --version 1.1.0

# Build Docker images
./scripts/deploy.sh docker --env production

# Run tests
./scripts/deploy.sh test

# Clean build artifacts
./scripts/deploy.sh clean

# Dry run (show what would happen)
./scripts/deploy.sh deploy --env production --dry-run

# Force deployment without confirmation
./scripts/deploy.sh deploy --env production --force
```

### NPM Scripts

```bash
# Workspace operations
npm run workspace:install    # Install all dependencies
npm run workspace:build      # Build all components
npm run workspace:test       # Run all tests
npm run workspace:lint       # Lint all code

# Deployment operations
npm run deploy              # Deploy to default environment
npm run deploy:staging      # Deploy to staging
npm run deploy:production   # Deploy to production

# Publishing operations
npm run publish:all         # Publish both SDK and CLI
npm run publish:sdk         # Publish SDK only
npm run publish:cli         # Publish CLI only

# Docker operations
npm run docker:build        # Build Docker image
npm run docker:run          # Run Docker container locally
npm run docker:push         # Push to registry
```

## CI/CD Pipeline

### GitHub Actions Workflow

The repository includes a comprehensive CI/CD pipeline (`.github/workflows/deploy.yml`) that:

1. **Tests**: Runs tests for all components with coverage reporting
2. **Security**: Vulnerability scanning and dependency auditing
3. **Build**: Compiles all TypeScript code and creates artifacts
4. **Publish SDK**: Automatically publishes SDK on version tags
5. **Publish CLI**: Automatically publishes CLI on version tags
6. **Deploy Service**: Deploys the service to staging/production
7. **Performance**: Runs load tests after deployment

### Triggering Deployments

```bash
# Trigger SDK deployment
git tag sdk-v1.0.0
git push origin sdk-v1.0.0

# Trigger CLI deployment
git tag cli-v1.1.0
git push origin cli-v1.1.0

# Trigger service deployment
git tag service-v1.0.0
git push origin service-v1.0.0

# Trigger via commit message
git commit -m "feat: new features [publish-sdk] [publish-cli]"
git push origin main
```

## Monitoring and Health Checks

### Health Endpoints

```bash
# Basic health check
curl https://api.lanonasis.com/api/v1/health

# Detailed health with dependencies
curl https://api.lanonasis.com/api/v1/health/detailed

# Metrics endpoint (Prometheus format)
curl https://api.lanonasis.com/metrics
```

### Monitoring Stack

The deployment includes a monitoring stack with:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboards and visualization  
- **Redis**: Caching and session storage
- **Logs**: Structured JSON logging with Winston

### Performance Monitoring

```bash
# Check response times
curl -w "@curl-format.txt" -s -o /dev/null https://api.lanonasis.com/api/v1/health

# Monitor database performance
curl https://api.lanonasis.com/api/v1/health/database

# Check memory usage
curl https://api.lanonasis.com/api/v1/health/memory
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Verify schema
   psql $DATABASE_URL -c "\\dt"
   ```

2. **API Key Encryption Issues**
   ```bash
   # Verify encryption key length
   echo -n "$API_KEY_ENCRYPTION_KEY" | wc -c  # Should be 32+ characters
   ```

3. **Memory Service Issues**
   ```bash
   # Check OpenAI API connectivity
   curl -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models
   ```

4. **CLI Installation Issues**
   ```bash
   # Reinstall CLI
   npm uninstall -g @lanonasis/cli
   npm install -g @lanonasis/cli
   
   # Check installation
   which lanonasis
   lanonasis --version
   ```

### Logs and Debugging

```bash
# View service logs
docker-compose logs -f memory-service

# Enable debug logging
export LOG_LEVEL=debug
npm start

# CLI debug mode
lanonasis --verbose memory search "test"

# SDK debug mode
const client = new LanOnasis({ debug: true, ... });
```

### Performance Optimization

```bash
# Database optimization
VACUUM ANALYZE memory_entries;
REINDEX INDEX idx_memory_entries_embedding;

# Redis cache optimization
redis-cli FLUSHDB  # Clear cache if needed

# Memory cleanup
pm2 restart lanonasis-maas
```

## Security Considerations

### API Key Security
- All API keys are encrypted using AES-256-GCM
- Proxy tokens provide secure access without exposing raw keys
- Automatic token expiration and cleanup
- Comprehensive audit logging

### Network Security
- HTTPS/TLS 1.3 for all communications
- Rate limiting and DDoS protection
- CORS configuration for browser security
- Security headers via Helmet.js

### Database Security
- Row Level Security (RLS) for multi-tenant isolation
- Encrypted connections to database
- Regular security updates and patches
- Database connection pooling and monitoring

### Deployment Security
- Environment variable management
- Secrets stored in secure vaults
- Container security scanning
- Regular dependency updates

## Support and Documentation

- **API Documentation**: https://api.lanonasis.com/docs
- **CLI Documentation**: `lanonasis --help` or https://docs.lanonasis.com/cli
- **SDK Documentation**: https://docs.lanonasis.com/sdk
- **GitHub Issues**: https://github.com/lanonasis/lanonasis-maas/issues
- **Community Discord**: https://discord.gg/lanonasis

## License

MIT License - see LICENSE file for details.