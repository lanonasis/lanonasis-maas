# MCP Configuration Guide - lanonasis-maas

**Created:** August 21, 2025  
**Version:** 1.0  
**Last Updated:** August 21, 2025

## Overview

lanonasis-maas (Memory as a Service) is the backend implementation providing vector-based memory storage, semantic search, and AI context management. It integrates with Onasis-CORE to provide MCP (Model Context Protocol) functionality through a comprehensive API layer.

## Architecture Overview

### Service Components
- **Memory Storage:** PostgreSQL with pgvector extension for embeddings
- **Vector Search:** Semantic similarity search using OpenAI embeddings
- **API Layer:** RESTful endpoints for memory operations
- **MCP Integration:** Serves as backend for Onasis-CORE MCP server
- **Multi-tenant Support:** Organization and project-based isolation

### Core Features
```
Memory Management:
├── Vector Embeddings - OpenAI text-embedding-3-small
├── Semantic Search - Cosine similarity with configurable thresholds
├── Memory Types - context, project, knowledge, reference, personal, workflow
├── Tagging System - Flexible categorization and filtering
├── Topic Organization - Hierarchical memory organization
└── Full-text Search - Combined with vector search for comprehensive results

API Security:
├── API Key Management - Multi-tier access control
├── Rate Limiting - Configurable per endpoint
├── Organization Isolation - Complete data separation
├── Project Scoping - Fine-grained access control
├── Audit Logging - Complete activity tracking
└── Role-based Access - Admin, team, authenticated, public levels
```

## Quick Start Configuration

### 1. Environment Setup

Create `.env` file:

```bash
# Database Configuration
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY

# OpenAI Configuration
OPENAI_API_KEY=REDACTED_OPENAI_API_KEY

# Service Configuration
PORT=8080
NODE_ENV=production
API_VERSION=v1

# Security
JWT_SECRET=REDACTED_JWT_SECRET
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15

# Integration
ONASIS_CORE_URL=http://localhost:9083
MCP_INTEGRATION_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Setup database schema
npm run db:setup

# Run migrations
npm run db:migrate

# Verify pgvector extension
npm run db:verify-vector

# Seed sample data (optional)
npm run db:seed
```

### 3. Start Service

```bash
# Production
npm start

# Development
npm run dev

# With PM2
npm run pm2:start
```

## Integration Methods

### Method 1: Direct API Integration

#### REST API Endpoints

**Memory Operations:**
```
POST   /api/v1/memory              - Create memory
GET    /api/v1/memory              - List memories
GET    /api/v1/memory/:id          - Get specific memory
PUT    /api/v1/memory/:id          - Update memory
DELETE /api/v1/memory/:id          - Delete memory
POST   /api/v1/memory/search       - Semantic search
POST   /api/v1/memory/bulk         - Bulk operations
```

**API Key Management:**
```
POST   /api/v1/keys                - Create API key
GET    /api/v1/keys                - List API keys
PUT    /api/v1/keys/:id            - Update API key
DELETE /api/v1/keys/:id            - Delete API key
POST   /api/v1/keys/:id/rotate     - Rotate API key
GET    /api/v1/keys/:id/usage      - Get usage stats
```

**System Operations:**
```
GET    /api/v1/health              - Health check
GET    /api/v1/status              - Service status
GET    /api/v1/metrics             - Performance metrics
GET    /api/v1/organizations       - List organizations
POST   /api/v1/organizations       - Create organization
GET    /api/v1/projects            - List projects
POST   /api/v1/projects            - Create project
```

#### JavaScript SDK Integration

```javascript
// Install SDK
npm install @lanonasis/maas-sdk

// Basic usage
import { LanonasisMaaS } from '@lanonasis/maas-sdk';

const client = new LanonasisMaaS({
  baseUrl: 'https://mcp.lanonasis.com',
  apiKey: 'your-api-key',
  organizationId: 'your-org-id'
});

// Memory operations
async function useMemoryService() {
  try {
    // Create memory with auto-embedding
    const memory = await client.memory.create({
      title: 'API Documentation',
      content: 'This endpoint handles user authentication...',
      memory_type: 'knowledge',
      tags: ['api', 'auth', 'docs'],
      metadata: {
        source: 'documentation',
        priority: 'high'
      }
    });

    // Semantic search
    const searchResults = await client.memory.search('authentication', {
      limit: 10,
      threshold: 0.7,
      filters: {
        memory_type: 'knowledge',
        tags: ['api']
      }
    });

    // Vector similarity search
    const similarMemories = await client.memory.findSimilar(memory.id, {
      limit: 5,
      threshold: 0.8
    });

    // Update memory
    await client.memory.update(memory.id, {
      content: 'Updated documentation content...',
      tags: ['api', 'auth', 'docs', 'updated']
    });

    // List with pagination
    const memoryList = await client.memory.list({
      page: 1,
      limit: 20,
      sortBy: 'created_at',
      sortOrder: 'desc',
      filters: {
        memory_type: 'project'
      }
    });

  } catch (error) {
    console.error('Memory operation failed:', error);
  }
}
```

#### Python SDK Integration

```python
# Install SDK
pip install lanonasis-maas

# Basic usage
from lanonasis_maas import LanonasisMaaS

client = LanonasisMaaS(
    base_url='https://mcp.lanonasis.com',
    api_key='your-api-key',
    organization_id='your-org-id'
)

# Memory operations
async def use_memory_service():
    try:
        # Create memory
        memory = await client.memory.create(
            title='Project Requirements',
            content='The system should support...',
            memory_type='project',
            tags=['requirements', 'specs'],
            metadata={'project_id': 'proj_123'}
        )

        # Search memories
        results = await client.memory.search(
            query='system requirements',
            limit=10,
            threshold=0.7,
            filters={
                'memory_type': 'project',
                'tags': ['requirements']
            }
        )

        # Batch operations
        memories_to_create = [
            {'title': 'Memory 1', 'content': 'Content 1'},
            {'title': 'Memory 2', 'content': 'Content 2'}
        ]
        
        batch_result = await client.memory.create_batch(memories_to_create)

    except Exception as error:
        print(f'Memory operation failed: {error}')
```

### Method 2: Onasis-CORE MCP Integration

When integrated through Onasis-CORE, lanonasis-maas provides the backend implementation for all MCP tools:

```javascript
// Onasis-CORE handles MCP protocol
// lanonasis-maas provides memory implementation

// Connection flow:
// Client -> Onasis-CORE MCP Server -> lanonasis-maas API -> Database

// Configuration in Onasis-CORE .env:
MEMORY_SERVICE_URL=https://mcp.lanonasis.com
MEMORY_SERVICE_API_KEY=your_lanonasis_maas_api_key
```

### Method 3: CLI Integration

```bash
# Install CLI
npm install -g @lanonasis/cli

# Configure
lanonasis config set-url https://mcp.lanonasis.com
lanonasis config set-key your-api-key
lanonasis config set-org your-org-id

# Memory operations
lanonasis memory create "Project Notes" "Important project information..."
lanonasis memory search "project information"
lanonasis memory list --type project --limit 10
lanonasis memory get mem_12345
lanonasis memory update mem_12345 --tags "updated,reviewed"
lanonasis memory delete mem_12345

# API key management
lanonasis keys create "Development Key" --access-level authenticated
lanonasis keys list
lanonasis keys rotate key_67890

# Organization management
lanonasis org info
lanonasis org projects
lanonasis org create-project "New Project" "Project description"
```

## Configuration Reference

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
| `SUPABASE_URL=https://<project-ref>.supabase.co
| `SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
| `OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
| `PORT` | Service port | `8080` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `JWT_SECRET=REDACTED_JWT_SECRET
| `RATE_LIMIT_MAX` | Max requests per window | `100` | No |
| `RATE_LIMIT_WINDOW` | Rate limit window (minutes) | `15` | No |
| `LOG_LEVEL` | Logging verbosity | `info` | No |
| `OPENAI_EMBEDDING_MODEL` | Embedding model | `text-embedding-3-small` | No |
| `VECTOR_DIMENSIONS` | Embedding dimensions | `1536` | No |
| `DEFAULT_SIMILARITY_THRESHOLD` | Search threshold | `0.7` | No |

### API Authentication

#### API Key Format
```
Production: pk_live_<org_id>_<random>.sk_live_<key_hash>
Development: pk_test_<org_id>_<random>.sk_test_<key_hash>
```

#### Authentication Headers
```http
# API Key Authentication
X-API-Key: pk_live_org123_abc456.sk_live_def789ghi012

# Or Bearer Token
Authorization: Bearer pk_live_org123_abc456.sk_live_def789ghi012

# Organization Context
X-Organization-ID: org_12345678
X-Project-ID: proj_87654321
```

### Database Schema

#### Core Tables
```sql
-- Memory storage with vector embeddings
CREATE TABLE memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  memory_type TEXT DEFAULT 'knowledge',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536),
  similarity_threshold REAL DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API key management
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  access_level TEXT DEFAULT 'authenticated',
  permissions JSONB DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Vector Search Optimization
```sql
-- Create vector index for fast similarity search
CREATE INDEX memories_embedding_idx ON memories 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create composite indexes for filtered searches
CREATE INDEX memories_org_type_idx ON memories (organization_id, memory_type);
CREATE INDEX memories_tags_gin_idx ON memories USING gin (tags);
CREATE INDEX memories_metadata_gin_idx ON memories USING gin (metadata);
```

## API Usage Examples

### Memory Management

#### Create Memory with Custom Embedding
```javascript
const response = await fetch('https://mcp.lanonasis.com/api/v1/memory', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key',
    'X-Organization-ID': 'org_123'
  },
  body: JSON.stringify({
    title: 'Technical Specification',
    content: 'System architecture details...',
    memory_type: 'knowledge',
    tags: ['architecture', 'specs', 'technical'],
    metadata: {
      version: '1.0',
      author: 'engineering-team',
      priority: 'high'
    },
    embedding_model: 'text-embedding-3-small' // Optional custom model
  })
});

const memory = await response.json();
console.log('Created memory:', memory.id);
```

#### Advanced Semantic Search
```javascript
const searchResponse = await fetch('https://mcp.lanonasis.com/api/v1/memory/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key',
    'X-Organization-ID': 'org_123'
  },
  body: JSON.stringify({
    query: 'authentication system implementation',
    limit: 20,
    threshold: 0.75,
    filters: {
      memory_type: ['knowledge', 'project'],
      tags: ['authentication', 'security'],
      metadata: {
        priority: 'high'
      },
      date_range: {
        start: '2025-01-01',
        end: '2025-12-31'
      }
    },
    sort_by: 'similarity',
    include_embeddings: false,
    highlight_matches: true
  })
});

const results = await searchResponse.json();
results.memories.forEach(memory => {
  console.log(`${memory.title} (similarity: ${memory.similarity_score})`);
  console.log(`Highlights: ${memory.highlights.join(', ')}`);
});
```

#### Bulk Memory Operations
```javascript
const bulkResponse = await fetch('https://mcp.lanonasis.com/api/v1/memory/bulk', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key',
    'X-Organization-ID': 'org_123'
  },
  body: JSON.stringify({
    operation: 'create',
    memories: [
      {
        title: 'Memory 1',
        content: 'Content for memory 1...',
        memory_type: 'knowledge',
        tags: ['bulk', 'import']
      },
      {
        title: 'Memory 2', 
        content: 'Content for memory 2...',
        memory_type: 'reference',
        tags: ['bulk', 'import']
      }
    ],
    options: {
      skip_duplicates: true,
      batch_size: 10,
      async_processing: true
    }
  })
});

const bulkResult = await bulkResponse.json();
console.log(`Created ${bulkResult.success_count} memories`);
```

### API Key Management

#### Create Scoped API Key
```javascript
const keyResponse = await fetch('https://mcp.lanonasis.com/api/v1/keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-admin-api-key',
    'X-Organization-ID': 'org_123'
  },
  body: JSON.stringify({
    name: 'Frontend Application Key',
    description: 'API key for frontend memory access',
    access_level: 'authenticated',
    permissions: {
      memory: ['read', 'create', 'update'],
      search: ['execute'],
      projects: ['read']
    },
    restrictions: {
      rate_limit: 1000,
      ip_whitelist: ['192.168.1.0/24'],
      project_scope: ['proj_456', 'proj_789']
    },
    expires_in_days: 90
  })
});

const apiKey = await keyResponse.json();
console.log('API Key:', apiKey.key);
console.log('Key ID:', apiKey.id);
```

#### Monitor API Key Usage
```javascript
const usageResponse = await fetch(`https://mcp.lanonasis.com/api/v1/keys/${keyId}/usage`, {
  headers: {
    'X-API-Key': 'your-admin-api-key',
    'X-Organization-ID': 'org_123'
  }
});

const usage = await usageResponse.json();
console.log(`Usage: ${usage.requests_today}/${usage.rate_limit_daily}`);
console.log(`Last used: ${usage.last_used_at}`);
console.log(`Popular endpoints:`, usage.endpoint_stats);
```

## Performance Optimization

### Vector Search Optimization

```sql
-- Optimize vector search performance
SET ivfflat.probes = 10;  -- Adjust based on accuracy vs speed needs

-- Memory-optimized search query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, title, content, 
       1 - (embedding <=> $1::vector) as similarity_score
FROM memories 
WHERE organization_id = $2 
  AND memory_type = ANY($3)
  AND embedding <=> $1::vector < $4
ORDER BY embedding <=> $1::vector
LIMIT $5;
```

### Caching Strategy

```javascript
// Redis caching for frequently accessed memories
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

class MemoryCache {
  static async getCachedMemory(id) {
    const cached = await client.get(`memory:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  static async setCachedMemory(id, memory, ttl = 3600) {
    await client.setex(`memory:${id}`, ttl, JSON.stringify(memory));
  }

  static async getCachedSearch(query, filters) {
    const key = `search:${Buffer.from(JSON.stringify({query, filters})).toString('base64')}`;
    const cached = await client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  static async setCachedSearch(query, filters, results, ttl = 600) {
    const key = `search:${Buffer.from(JSON.stringify({query, filters})).toString('base64')}`;
    await client.setex(key, ttl, JSON.stringify(results));
  }
}
```

### Connection Pooling

```javascript
// Database connection pooling
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000
});

// Monitor pool health
setInterval(() => {
  console.log(`Pool stats: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
}, 30000);
```

## Security Best Practices

### API Key Security

```javascript
// Secure API key validation
const crypto = require('crypto');

class APIKeyValidator {
  static validateKeyFormat(key) {
    const regex = /^pk_(live|test)_[a-zA-Z0-9]+\.[a-z]{2}_[a-zA-Z0-9]+$/;
    return regex.test(key);
  }

  static extractKeyComponents(key) {
    const [prefix, suffix] = key.split('.');
    const [pk, env, orgPart] = prefix.split('_');
    const [sk, hash] = suffix.split('_');
    
    return {
      environment: env,
      organizationId: orgPart,
      keyHash: hash
    };
  }

  static async validateKey(key, organizationId) {
    if (!this.validateKeyFormat(key)) {
      throw new Error('Invalid API key format');
    }

    const components = this.extractKeyComponents(key);
    
    if (components.organizationId !== organizationId) {
      throw new Error('API key organization mismatch');
    }

    // Check against database
    const result = await pool.query(
      'SELECT id, access_level, permissions, expires_at FROM api_keys WHERE key_hash = $1 AND organization_id = $2',
      [components.keyHash, organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid API key');
    }

    const keyData = result.rows[0];
    
    if (keyData.expires_at && new Date() > keyData.expires_at) {
      throw new Error('API key expired');
    }

    return keyData;
  }
}
```

### Rate Limiting

```javascript
// Advanced rate limiting with Redis
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const createRateLimiter = (keyPrefix, maxRequests, windowMs) => {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `rate_limit:${keyPrefix}:`
    }),
    max: maxRequests,
    windowMs: windowMs,
    keyGenerator: (req) => {
      return req.headers['x-api-key'] || req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Apply different limits based on access level
app.use('/api/v1/memory', createRateLimiter('memory', 100, 15 * 60 * 1000)); // 100 req/15min
app.use('/api/v1/search', createRateLimiter('search', 50, 15 * 60 * 1000));  // 50 req/15min
```

## Testing and Validation

### Unit Tests

```javascript
// tests/memory.test.js
const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');

describe('Memory API', () => {
  let apiKey, organizationId, memoryId;

  before(async () => {
    // Setup test organization and API key
    const org = await createTestOrganization();
    organizationId = org.id;
    apiKey = await createTestAPIKey(organizationId);
  });

  describe('POST /api/v1/memory', () => {
    it('should create a new memory', async () => {
      const response = await request(app)
        .post('/api/v1/memory')
        .set('X-API-Key', apiKey)
        .set('X-Organization-ID', organizationId)
        .send({
          title: 'Test Memory',
          content: 'This is a test memory for unit testing',
          memory_type: 'knowledge',
          tags: ['test', 'unit']
        })
        .expect(201);

      expect(response.body).to.have.property('id');
      expect(response.body.title).to.equal('Test Memory');
      expect(response.body.embedding).to.be.an('array');
      memoryId = response.body.id;
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/v1/memory')
        .set('X-API-Key', apiKey)
        .set('X-Organization-ID', organizationId)
        .send({
          content: 'Missing title'
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/memory/search', () => {
    it('should find similar memories', async () => {
      const response = await request(app)
        .post('/api/v1/memory/search')
        .set('X-API-Key', apiKey)
        .set('X-Organization-ID', organizationId)
        .send({
          query: 'test memory unit testing',
          limit: 10,
          threshold: 0.5
        })
        .expect(200);

      expect(response.body.memories).to.be.an('array');
      expect(response.body.memories.length).to.be.greaterThan(0);
      expect(response.body.memories[0]).to.have.property('similarity_score');
    });
  });

  after(async () => {
    // Cleanup test data
    await cleanupTestData(organizationId);
  });
});
```

### Integration Tests

```javascript
// tests/integration/mcp-integration.test.js
const WebSocket = require('ws');
const { expect } = require('chai');

describe('MCP Integration', () => {
  let ws;

  before(async () => {
    ws = new WebSocket('ws://localhost:9083/mcp');
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });
  });

  it('should handle MCP memory operations', async () => {
    // Send MCP initialize message
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    }));

    // Wait for initialize response
    const initResponse = await new Promise(resolve => {
      ws.once('message', data => resolve(JSON.parse(data)));
    });

    expect(initResponse.id).to.equal(1);
    expect(initResponse.result).to.have.property('capabilities');

    // Test memory creation via MCP
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'create_memory',
        arguments: {
          title: 'MCP Test Memory',
          content: 'Created via MCP protocol'
        }
      }
    }));

    const createResponse = await new Promise(resolve => {
      ws.once('message', data => resolve(JSON.parse(data)));
    });

    expect(createResponse.id).to.equal(2);
    expect(createResponse.result).to.have.property('content');
  });

  after(() => {
    ws.close();
  });
});
```

### Performance Tests

```javascript
// tests/performance/load.test.js
const autocannon = require('autocannon');

describe('Performance Tests', () => {
  it('should handle concurrent memory creation', async () => {
    const result = await autocannon({
      url: 'http://localhost:8080/api/v1/memory',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TEST_API_KEY,
        'X-Organization-ID': process.env.TEST_ORG_ID
      },
      body: JSON.stringify({
        title: 'Load Test Memory',
        content: 'This is a load testing memory entry with substantial content to test embedding generation and storage performance under concurrent load conditions.',
        memory_type: 'knowledge',
        tags: ['load-test', 'performance']
      }),
      connections: 10,
      duration: 30
    });

    expect(result.errors).to.equal(0);
    expect(result.non2xx).to.equal(0);
    expect(result.latency.average).to.be.lessThan(500); // < 500ms average
    expect(result.requests.average).to.be.greaterThan(50); // > 50 req/sec
  });

  it('should handle concurrent search operations', async () => {
    const result = await autocannon({
      url: 'http://localhost:8080/api/v1/memory/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TEST_API_KEY,
        'X-Organization-ID': process.env.TEST_ORG_ID
      },
      body: JSON.stringify({
        query: 'performance testing memory search',
        limit: 10,
        threshold: 0.7
      }),
      connections: 20,
      duration: 30
    });

    expect(result.errors).to.equal(0);
    expect(result.latency.average).to.be.lessThan(200); // < 200ms for search
    expect(result.requests.average).to.be.greaterThan(100); // > 100 req/sec
  });
});
```

## Monitoring and Observability

### Health Checks

```javascript
// Health check endpoint with comprehensive status
app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    checks: {}
  };

  try {
    // Database connectivity
    const dbResult = await pool.query('SELECT 1');
    health.checks.database = { status: 'healthy', latency: dbResult.duration };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }

  try {
    // Vector search functionality
    const vectorTest = await pool.query(
      'SELECT 1 WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = $1)',
      ['vector']
    );
    health.checks.vector_search = { status: vectorTest.rows.length > 0 ? 'healthy' : 'unhealthy' };
  } catch (error) {
    health.checks.vector_search = { status: 'unhealthy', error: error.message };
    health.status = 'unhealthy';
  }

  try {
    // OpenAI API connectivity
    const openaiTest = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
    });
    health.checks.openai = { status: openaiTest.ok ? 'healthy' : 'unhealthy' };
  } catch (error) {
    health.checks.openai = { status: 'unhealthy', error: error.message };
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### Metrics Collection

```javascript
// Prometheus metrics
const prometheus = require('prom-client');

const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const memoryOperations = new prometheus.Counter({
  name: 'memory_operations_total',
  help: 'Total number of memory operations',
  labelNames: ['operation', 'status']
});

const vectorSearchDuration = new prometheus.Histogram({
  name: 'vector_search_duration_seconds',
  help: 'Duration of vector search operations',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware to collect metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

## File References

### Core Implementation Files
- **`/src/app.js`** - Main application entry point
- **`/src/routes/memory.js`** - Memory API routes
- **`/src/routes/keys.js`** - API key management routes
- **`/src/services/memory-service.js`** - Memory operations service
- **`/src/services/embedding-service.js`** - OpenAI embedding integration
- **`/src/services/vector-search.js`** - Vector similarity search
- **`/src/middleware/auth.js`** - Authentication middleware
- **`/src/models/memory.js`** - Memory data model
- **`/src/utils/database.js`** - Database utilities

### Configuration Files
- **`/.env`** - Environment configuration
- **`/package.json`** - Dependencies and scripts
- **`/docker-compose.yml`** - Development environment
- **`/ecosystem.config.js`** - PM2 configuration

### Database Files
- **`/migrations/`** - Database migration files
- **`/seeds/`** - Database seed data
- **`/database-setup.sql`** - Initial schema setup

### Documentation Files
- **`/DATABASE_SETUP_GUIDE.md`** - Database configuration guide
- **`/MEMORY_TABLES_ACCESS_GUIDE.md`** - Database access patterns
- **`/API_DOCUMENTATION.md`** - Complete API reference

## Production Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY migrations/ ./migrations/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S lanonasis -u 1001

USER lanonasis

EXPOSE 8080

CMD ["node", "src/app.js"]
```

### Container Orchestration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  lanonasis-maas:
    build: .
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: production
      DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
      OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
      REDIS_URL: ${REDIS_URL}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: lanonasis_maas
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Process Management

```javascript
// ecosystem.config.js - PM2 configuration
module.exports = {
  apps: [{
    name: 'lanonasis-maas',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

## Support and Updates

- **Issues:** Report to lanonasis-maas repository issues
- **Documentation:** Updated with new features and API changes
- **SDK Updates:** Available via npm (@lanonasis/maas-sdk)
- **Migration Guides:** Provided for breaking changes

---

**Generated:** August 21, 2025  
**API Version:** v1  
**SDK Version:** Latest  
**Database Schema Version:** 1.0.0  
**Vector Extension:** pgvector 0.5.0+