# Lanonasis Memory as a Service (MaaS) - Enhanced Edition

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lanonasis/lanonasis-maas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP Integration](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-purple)](https://modelcontextprotocol.com)
[![Golden Contract](https://img.shields.io/badge/Onasis--Core-v0.1%20Compliant-gold)](https://api.lanonasis.com/.well-known/onasis.json)
[![CLI Version](https://img.shields.io/npm/v/@lanonasis/cli?label=CLI%20v3.0.2&color=blue)](https://www.npmjs.com/package/@lanonasis/cli)

🚀 **NEW ENHANCED EDITION**: Enterprise-grade Memory as a Service platform with **mem0-inspired architecture**, featuring advanced state management, granular access control, multi-vector store support, and production-ready deployment capabilities.

## 🎯 What's New in Enhanced Edition

### 🧠 mem0-Inspired Architecture
- **Advanced State Management**: Active, paused, archived, deleted states with full transition history
- **Granular Access Control**: App-level and memory-level permissions with comprehensive audit trails
- **Multi-Vector Store Support**: Qdrant, Chroma, PGVector, and local vector storage
- **Bulk Operations**: Pause, archive, and delete memories by criteria (category, app, date)
- **Related Memory Discovery**: AI-powered memory relationship detection
- **Enhanced Search**: Advanced filtering by state, app, category, date ranges

### 🏗️ Production-Ready Infrastructure
- **Docker-First Development**: Complete containerized environment with one-command setup
- **Multiple Vector Stores**: Choose between Qdrant, Chroma, or local storage
- **Enhanced Database Schema**: State management, access control, and audit logging
- **Monitoring & Analytics**: Prometheus, Grafana, and comprehensive usage analytics
- **Load Balancing**: Nginx reverse proxy with SSL support

### 🔧 Enhanced CLI Experience
- **Interactive Management**: Guided workflows for complex operations
- **Bulk Operations**: `onasis memory bulk-pause`, `archive`, `filter`
- **Advanced Analytics**: Memory usage insights and relationship analysis
- **Related Memory Discovery**: `onasis memory related <id>`
- **State Management**: Full memory lifecycle control

## 🚀 Quick Start (Enhanced)

### Prerequisites

Before getting started, ensure you have:

- **Node.js**: v18.0.0 or higher
- **Docker**: v20.10 or higher (for containerized deployment)
- **Docker Compose**: v2.0 or higher
- **npm** or **bun**: Latest version
- **Operating System**: macOS, Linux, or Windows with WSL2

**Optional** (for vector stores):
- Qdrant instance URL and API key (if using Qdrant)
- Chroma instance URL (if using Chroma)
- PostgreSQL with pgvector extension (if using PGVector)

### One-Command Installation
```bash
# Complete setup with enhanced features
curl -fsSL https://raw.githubusercontent.com/lanonasis/lanonasis-maas/main/scripts/install-enhanced.sh | bash
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas

# Start enhanced development environment
docker-compose -f docker-compose.enhanced.yml up

# Install CLI globally
cd cli && npm install && npm link
```

### First Steps with Enhanced Features
```bash
# Initialize with enhanced configuration
onasis init --enhanced

# Login with vendor key
onasis login --vendor-key pk_xxx.sk_xxx

# Create memory with app context
onasis memory create --title "Enhanced Memory" --content "Advanced features" --app-id "my-app"

# Search with advanced filters
onasis memory filter --app-id "my-app" --since "2024-01-01" --state active

# Find related memories
onasis memory related <memory-id>

# Bulk operations
onasis memory bulk-pause --category "old-notes" --before "2024-01-01"
onasis memory archive --before "2023-12-01"

# Interactive management
onasis memory manage
```

## 🏗️ Enhanced Architecture

### Core Components

#### 1. Enhanced Memory Service
```typescript
// Advanced state management
await memoryService.updateMemoryState(memoryId, 'archived', userId, 'Cleanup operation');

// Bulk operations
await memoryService.bulkUpdateMemoryState(memoryIds, 'paused', userId);

// Related memory discovery
const related = await memoryService.findRelatedMemories(memoryId, 5, 0.7);

// Advanced search with filters
const results = await memoryService.searchMemoriesEnhanced(query, orgId, {
  states: ['active', 'paused'],
  app_id: 'my-app',
  since: '2024-01-01',
  categories: ['work', 'project']
});
```

#### 2. Multi-Vector Store Support
```typescript
// Configure vector store
const vectorStore = new LanonasisVectorStore({
  provider: 'qdrant', // 'qdrant', 'chroma', 'pgvector', 'local'
  url: 'http://localhost:6333',
  collection: 'memories'
});

// Advanced similarity search
const similar = await vectorStore.searchMemories(query, {
  threshold: 0.8,
  limit: 10,
  filters: { app_id: 'my-app', state: 'active' }
});
```

#### 3. Access Control System

**Note**: The CLI-side AccessControl class provides client-side caching and validation. 
The authoritative access control is enforced by the backend API with persistent database storage.

```typescript
// Check permissions (CLI-side validation + API enforcement)
const hasAccess = await accessControl.checkMemoryAccess(
  memoryId, userId, appId, 'write'
);

// Grant app-level access (persisted to backend)
await accessControl.grantAccess(
  userId, appId, 'read', null, '2024-12-31'
);

// Audit trail (fetched from backend)
const logs = await accessControl.getAccessLogs(orgId, {
  user_id: userId,
  access_type: 'bulk_operation',
  since: '2024-01-01'
});
```

### Database Schema Enhancements

#### Memory States & Transitions
```sql
-- Memory state management
CREATE TYPE memory_state AS ENUM ('active', 'paused', 'archived', 'deleted');

-- State transition history
CREATE TABLE memory_state_transitions (
    id UUID PRIMARY KEY,
    memory_id UUID REFERENCES memory_entries(id),
    from_state memory_state,
    to_state memory_state,
    reason TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Access Control & Audit
```sql
-- Granular access control
CREATE TABLE memory_access_rules (
    id UUID PRIMARY KEY,
    memory_id UUID REFERENCES memory_entries(id), -- NULL for app-level
    app_id VARCHAR(255),
    user_id UUID REFERENCES users(id),
    permission VARCHAR(20) CHECK (permission IN ('read', 'write', 'delete', 'admin')),
    granted BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ
);

-- Comprehensive audit logging
CREATE TABLE memory_access_logs (
    id UUID PRIMARY KEY,
    memory_id UUID,
    app_id VARCHAR(255),
    user_id UUID,
    access_type VARCHAR(50),
    success BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

## 🔧 Enhanced CLI Commands

### Memory State Management
```bash
# Bulk pause memories by criteria
onasis memory bulk-pause --category "work" --app "cursor" --dry-run
onasis memory bulk-pause --before "2024-01-01" --app "vscode"

# Archive old memories
onasis memory archive --before "2023-12-01" --dry-run
onasis memory archive --before "2023-12-01" --app "old-project"

# Advanced filtering
onasis memory filter --app-id "my-app" --category "coding" --since "2024-10-01"
onasis memory filter --state "paused" --before "2024-01-01"
```

### Related Memory Discovery
```bash
# Find related memories
onasis memory related <memory-id> --limit 10 --threshold 0.7

# Interactive relationship exploration
onasis memory manage
# Choose "Find related memories" -> Enter memory ID
```

### Advanced Analytics
```bash
# Comprehensive memory analytics
onasis memory analytics --period 90

# App-specific analytics
onasis memory analytics --app "cursor" --period 30

# Interactive analytics dashboard
onasis memory manage
# Choose "View analytics"
```

### Enhanced MCP Operations
```bash
# Enhanced MCP server with vector store support
lanonasis-mcp-server --verbose --vector-store qdrant

# MCP health check with detailed diagnostics
onasis mcp health --verbose

# List enhanced MCP tools
onasis mcp tools
# Shows: memory_bulk_operations, memory_find_related, memory_filter_advanced
```

## 🐳 Docker Development Environment

### Complete Development Stack
```bash
# Start full development environment
docker-compose -f docker-compose.enhanced.yml up

# With monitoring (Prometheus + Grafana)
docker-compose -f docker-compose.enhanced.yml --profile monitoring up

# With Chroma vector store
docker-compose -f docker-compose.enhanced.yml --profile chroma up

# Production setup with Nginx
docker-compose -f docker-compose.enhanced.yml --profile production up
```

### Services Included

**Core Services** (always available):
- **API Server** (`lanonasis-api`): Enhanced with state management and access control
- **Dashboard** (`lanonasis-dashboard`): Real-time memory management interface
- **MCP Server** (`lanonasis-mcp`): Enhanced with vector store integration
- **PostgreSQL** (`postgres`): With pgvector extension and enhanced schema
- **Redis** (`redis`): Caching and session management
- **Qdrant** (`qdrant`): Vector database for semantic search (default)

**Optional Services** (profile-based):
- **Chroma** (`chroma`): Alternative vector database (use `--profile chroma`)
- **Nginx** (`nginx`): Reverse proxy and load balancer (use `--profile production`)
- **Prometheus** (`prometheus`): Metrics collection (use `--profile monitoring`)
- **Grafana** (`grafana`): Analytics dashboards (use `--profile monitoring`)
- **Elasticsearch** (`elasticsearch`): Advanced search capabilities (use `--profile monitoring`)
- **Kibana** (`kibana`): Log visualization (use `--profile monitoring`)

## 📊 Enhanced Features Deep Dive

### 1. Memory State Management
```typescript
// Memory lifecycle states
enum MemoryState {
  ACTIVE = 'active',     // Normal operation
  PAUSED = 'paused',     // Temporarily disabled
  ARCHIVED = 'archived', // Long-term storage
  DELETED = 'deleted'    // Soft delete
}

// State transitions with validation
const validTransitions = {
  active: ['paused', 'archived', 'deleted'],
  paused: ['active', 'archived', 'deleted'],
  archived: ['active', 'deleted'],
  deleted: [] // No transitions from deleted
};
```

### 2. Bulk Operations
```bash
# Pause memories by multiple criteria
onasis memory bulk-pause \
  --category "work" \
  --app "cursor" \
  --before "2024-01-01" \
  --dry-run

# Archive with confirmation
onasis memory archive \
  --before "2023-12-01" \
  --confirm

# Filter and operate
onasis memory filter \
  --app-id "old-app" \
  --state "active" \
  --before "2023-01-01" | \
onasis memory bulk-pause --from-stdin
```

### 3. Access Control Matrix
```typescript
// Permission levels
type Permission = 'read' | 'write' | 'delete' | 'admin';

// Access control rules
interface AccessRule {
  memory_id?: string;  // Specific memory or null for app-level
  app_id: string;      // Application context
  user_id: string;     // Target user
  permission: Permission;
  granted: boolean;
  expires_at?: Date;
}
```

### 4. Vector Store Flexibility
```typescript
// Multiple vector store providers
const vectorStores = {
  qdrant: new QdrantVectorStore({
    url: 'http://localhost:6333',
    collection: 'memories'
  }),
  chroma: new ChromaVectorStore({
    url: 'http://localhost:8000',
    collection: 'memories'
  }),
  local: new LocalVectorStore({
    dimensions: 1536,
    storage: './vector-data'
  })
};
```

## 🔍 Advanced Search & Discovery

### Enhanced Search Capabilities
```bash
# Multi-criteria search
onasis memory search "API integration" \
  --memory-types context,reference \
  --tags "api,integration" \
  --app-id "cursor" \
  --since "2024-01-01" \
  --threshold 0.8

# State-aware search
onasis memory search "project notes" \
  --states active,paused \
  --before "2024-06-01"

# Category-based discovery
onasis memory filter \
  --category "machine-learning" \
  --app-id "jupyter" \
  --limit 50
```

### Related Memory Discovery
```typescript
// Find related memories with multiple algorithms
const related = await memoryService.findRelatedMemories(memoryId, {
  algorithms: ['embedding', 'category', 'tag'],
  limit: 10,
  threshold: 0.6,
  includeMetadata: true
});

// Relationship types
type RelationshipType = 
  | 'similar'      // Semantic similarity
  | 'referenced'   // Explicit references
  | 'derived'      // Derived from source
  | 'category'     // Same category
  | 'temporal';    // Time-based relation
```

## 📈 Analytics & Monitoring

### Memory Analytics Dashboard
```bash
# Comprehensive analytics
onasis memory analytics --period 90 --format json

# Output includes:
# - Memory count by state, type, app
# - Usage patterns and trends
# - Access frequency analysis
# - Relationship network metrics
# - Storage utilization
```

### Monitoring Integration
```yaml
# Prometheus metrics
memory_operations_total{operation="create",app="cursor"} 150
memory_operations_total{operation="search",app="cursor"} 1250
memory_state_transitions_total{from="active",to="archived"} 45
memory_access_violations_total{app="unauthorized"} 2

# Grafana dashboards
- Memory Operations Dashboard
- Access Control Audit Dashboard
- Vector Store Performance Dashboard
- User Activity Dashboard
```

## 🚀 Production Deployment

### Enhanced Deployment Options

#### 1. Docker Swarm
```bash
# Deploy to Docker Swarm
docker stack deploy -c docker-compose.enhanced.yml lanonasis-stack
```

#### 2. Kubernetes
```bash
# Kubernetes deployment (Helm chart included)
helm install lanonasis ./helm/lanonasis-maas \
  --set vectorStore.provider=qdrant \
  --set monitoring.enabled=true
```

#### 3. Cloud Deployment
```bash
# AWS ECS with enhanced features
aws ecs create-service \
  --cluster lanonasis-cluster \
  --service-name lanonasis-enhanced \
  --task-definition lanonasis-enhanced:1
```

### Environment Configuration
```env
# Enhanced environment variables
VECTOR_STORE_PROVIDER=qdrant
QDRANT_URL=http://qdrant:6333
CHROMA_URL=http://chroma:8000

# Access control
ACCESS_CONTROL_ENABLED=true
AUDIT_LOGGING_ENABLED=true

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
METRICS_ENDPOINT=/metrics

# Performance
BULK_OPERATION_BATCH_SIZE=100
VECTOR_SEARCH_CACHE_TTL=300
```

## 🔒 Security Enhancements

### Enhanced Security Features
- **Granular Permissions**: Memory-level and app-level access control
- **Audit Logging**: Comprehensive access and operation logging
- **State-Based Security**: Different permissions for different memory states
- **Request Correlation**: Full request tracing with UUIDs
- **Rate Limiting**: Per-app and per-user rate limiting
- **Data Encryption**: At-rest and in-transit encryption

### Security Configuration
```typescript
// Enhanced security middleware
app.use(enhancedAuth({
  accessControl: true,
  auditLogging: true,
  rateLimiting: {
    perApp: 1000,
    perUser: 100,
    window: '1h'
  }
}));
```

## 🤝 Contributing to Enhanced Edition

### Development Setup
```bash
# Clone with enhanced features
git clone https://github.com/lanonasis/lanonasis-maas.git
cd lanonasis-maas

# Install enhanced development environment
./scripts/install-enhanced.sh

# Start development with all services
docker-compose -f docker-compose.enhanced.yml up
```

### Testing Enhanced Features
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run conformance tests
npm run test:conformance

# Run all tests (unit + conformance)
npm run test:all

# Note: Enhanced feature-specific tests (vector-stores, access-control, bulk-operations)
# are included in the main test suite above
```

## 📚 Documentation

### Enhanced Documentation
- **[Enhanced API Reference](./docs/api-enhanced.md)**: Complete API documentation with new endpoints
- **[Vector Store Guide](./docs/vector-stores.md)**: Multi-vector store configuration and usage
- **[Access Control Guide](./docs/access-control.md)**: Granular permissions and audit logging
- **[Bulk Operations Guide](./docs/bulk-operations.md)**: Advanced memory management
- **[Deployment Guide](./docs/deployment-enhanced.md)**: Production deployment with monitoring

### Interactive Documentation
```bash
# Start documentation server with enhanced features
npm run docs:serve

# Access at http://localhost:3004
# Includes interactive API explorer and tutorials
```

## 🎯 Roadmap

### Upcoming Enhanced Features
- **AI-Powered Categorization**: Automatic memory categorization using LLMs
- **Advanced Relationship Detection**: ML-based memory relationship discovery
- **Multi-Tenant Architecture**: Complete organization isolation
- **Real-Time Collaboration**: Shared memory spaces with live updates
- **Advanced Analytics**: Predictive analytics and usage insights
- **Plugin System**: Extensible architecture for custom integrations

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Enhanced Links

- **Enhanced Demo**: [https://enhanced.lanonasis.com](https://enhanced.lanonasis.com)
- **Vector Store Docs**: [https://docs.lanonasis.com/vector-stores](https://docs.lanonasis.com/vector-stores)
- **Access Control Guide**: [https://docs.lanonasis.com/access-control](https://docs.lanonasis.com/access-control)
- **Monitoring Dashboard**: [https://monitoring.lanonasis.com](https://monitoring.lanonasis.com)
- **Enhanced CLI**: [https://www.npmjs.com/package/@lanonasis/cli](https://www.npmjs.com/package/@lanonasis/cli)

---

## 🎉 Migration from Standard Edition

### Automatic Migration
```bash
# Migrate existing installation to enhanced edition
./scripts/migrate-to-enhanced.sh

# Backup existing data
./scripts/backup-data.sh

# Apply enhanced database schema
npm run db:migrate:enhanced
```

### Feature Comparison

| Feature | Standard | Enhanced |
|---------|----------|----------|
| Memory States | Basic | Active/Paused/Archived/Deleted |
| Access Control | Basic | Granular + Audit |
| Vector Stores | Local only | Qdrant/Chroma/PGVector/Local |
| Bulk Operations | None | Full support |
| Related Discovery | Basic | AI-powered |
| Monitoring | Basic | Prometheus/Grafana |
| Docker Support | Basic | Complete stack |
| CLI Features | Standard | Interactive + Advanced |

---

*Enhanced Memory as a Service - Inspired by mem0's architecture, built for enterprise scale*

🚀 **Ready to experience the future of memory management?** Try the enhanced edition today!