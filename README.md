# 🧠 Memory as a Service (MaaS) - Enterprise Memory Platform

[![CI/CD Pipeline](https://github.com/seyederick/vibe-memory/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/seyederick/vibe-memory/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

**Enterprise-Grade Memory as a Service** - Complete B2B2C Memory platform with vector search, semantic memory management, and comprehensive developer ecosystem. Transform your memory infrastructure into a distributable, monetizable service.

## 🚀 **Live Platform**

- **🌐 Platform Dashboard**: [api.lanonasis.com](https://api.lanonasis.com)
- **📚 Documentation**: [docs.lanonasis.com](https://docs.lanonasis.com)
- **🔧 API Explorer**: [api.lanonasis.com/docs](https://api.lanonasis.com/docs)

## 🎯 **Business Model: B2B2C Distribution**

Transform your existing memory infrastructure into a revenue-generating service:

- **💰 API Usage Pricing** - Free/Pro/Enterprise tiers with usage-based billing
- **🔑 SDK Licensing** - White-label TypeScript SDK for third-party integration
- **☁️ Managed Hosting** - Multi-tenant and dedicated deployment options
- **🤝 Reseller Network** - Enable third parties to embed memory capabilities
- **📊 Analytics Dashboard** - Revenue insights and user behavior tracking

## ✨ **Platform Capabilities**

### **🧠 Advanced Vector Memory Engine**
- **Vector Storage** - OpenAI embeddings (1536D) with PostgreSQL pgvector
- **Semantic Search** - Cosine similarity with configurable thresholds (0.7-0.95)
- **Memory Types** - `context`, `project`, `knowledge`, `reference`, `personal`, `workflow`
- **Topic Organization** - Hierarchical memory organization with nested categories
- **Bulk Operations** - Multi-format import/export (JSON, YAML, Markdown, CSV, PDF)
- **Memory Versioning** - Complete audit trail with version history

### **🔐 Dual Authentication System**
- **Supabase JWT** - Integration with existing auth.users system
- **API Keys** - Custom key system for programmatic access via api.lanonasis.com
- **Plan-Based Access** - Feature gating by subscription tier (Free/Pro/Enterprise)
- **Multi-Tenant** - Complete user isolation and data security with RLS policies
- **Session Management** - Secure cookie-based sessions with refresh tokens

### **🛠 Developer Ecosystem**
- **TypeScript SDK** - Complete client library with React hooks (`@lanonasis/memory-client`)
- **CLI Tool** - Feature-rich command-line interface (`@lanonasis/memory-cli`)
- **Visual Components** - Memory visualizer, bulk uploader, and interactive dashboard
- **REST API** - OpenAPI 3.0 documented endpoints with Swagger UI
- **Memory Visualizer** - Interactive network graphs with D3.js
- **AI Agent Integration** - Tool calling capabilities for autonomous memory operations

## 🏗️ **Architecture Overview**

```
                    ┌─────────────────────────────────────────┐
                    │              RESELLER NETWORK           │
                    │  ┌─────────────┐  ┌─────────────────────┐│
                    │  │ SaaS Apps   │  │ AI Platforms       ││
                    │  │ CRM/ERP     │  │ Agent Systems      ││
                    │  │ E-commerce  │  │ Knowledge Bases    ││
                    │  └─────────────┘  └─────────────────────┘│
                    └─────────────┬───────────────────────────┘
                                  │ @lanonasis/memory-client SDK
                    ┌─────────────▼───────────────────────────┐
                    │         MaaS Distribution Layer         │
                    │  ┌───────────────┐ ┌─────────────────────┐│
                    │  │ TypeScript SDK│ │ Visual Components   ││
                    │  │ React Hooks   │ │ Memory Visualizer   ││
                    │  │ CLI Tool      │ │ Upload Center       ││
                    │  └───────────────┘ └─────────────────────┘│
                    └─────────────┬───────────────────────────┘
                                  │ REST API
┌─────────────────┐ ┌─────────────▼──────────────┐ ┌─────────────────┐
│   Dashboard     │ │    Memory Service API      │ │   AI Agent      │
│ api.lanonasis   │ │    (Express + TypeScript)  │ │   Integration   │
└─────────────────┘ └─────────────┬──────────────┘ └─────────────────┘
                                  │ Vector Operations
                    ┌─────────────▼──────────────┐
                    │     Supabase Database      │
                    │  (PostgreSQL + pgvector)   │
                    │   Multi-tenant with RLS    │
                    └────────────────────────────┘
```

## 🔑 **API Key Generation**

### **Get Your API Keys from [api.lanonasis.com](https://api.lanonasis.com)**

1. **Sign Up/Login**
   ```
   Visit: https://api.lanonasis.com
   → Create account or login with existing credentials
   ```

2. **Generate API Key**
   ```
   Dashboard → API Keys → Generate New Key
   → Choose plan (Free/Pro/Enterprise)
   → Copy your API key securely
   ```

3. **Key Management**
   ```
   • View usage statistics and quotas
   • Regenerate keys for security rotation
   • Monitor API calls and rate limits
   • Upgrade/downgrade plans as needed
   ```

### **API Key Usage**
```bash
# Test your API key
curl -H "X-API-Key: your-api-key-here" \
     https://api.lanonasis.com/api/v1/memory/health

# Expected response:
{
  "status": "healthy",
  "plan": "pro",
  "usage": {
    "memories": 150,
    "limit": 10000,
    "calls_this_month": 1250
  }
}
```

## 🚀 **Quick Start**

### **Prerequisites**
- **Node.js 18+** (LTS recommended)
- **npm** or **yarn** package manager
- **OpenAI API Key** (for embeddings)
- **Supabase Account** (for database and auth)
- **API Key** from [api.lanonasis.com](https://api.lanonasis.com)

### **Option 1: Use the Hosted Service** (Recommended)

Get started immediately without any infrastructure setup:

```bash
# 1. Get your API key from api.lanonasis.com
# 2. Install the SDK
npm install @lanonasis/memory-client

# 3. Start using memories in your app
import { createMemoryClient } from '@lanonasis/memory-client';

const client = createMemoryClient({
  baseURL: 'https://api.lanonasis.com',
  apiKey: 'your-api-key-from-dashboard'
});

// Create your first memory
const memory = await client.createMemory({
  title: 'My First Memory',
  content: 'This is stored in the cloud with vector search!',
  type: 'knowledge'
});
```

### **Option 2: Self-Hosted Deployment**

Deploy your own instance for complete control:

```bash
# 1. Clone the repository
git clone https://github.com/thefixer3x/vibe-memory.git
cd vibe-memory

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 4. Initialize database
npm run db:migrate
npm run db:seed

# 5. Start the service
npm run dev
```

### **Environment Configuration** (.env)

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=24h

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379

# Monitoring & Logging
LOG_LEVEL=info
ENABLE_METRICS=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📱 **CLI Tool - Professional Memory Management**

### **Installation & Setup**

```bash
# Install globally
npm install -g @lanonasis/memory-cli

# Initialize configuration
memory init
# Follow prompts to configure API endpoint and authentication

# Login with API key
memory login --api-key your-api-key-from-dashboard
```

### **Core Commands**

```bash
# Authentication & Configuration
memory auth status              # Check authentication status
memory config show             # Display current configuration
memory config set <key> <val>  # Update configuration

# Memory Operations
memory create \
  --title "Meeting Notes" \
  --content "Discussed Q4 roadmap and priorities" \
  --type project \
  --tags "meeting,roadmap,q4"

memory list                     # List all memories
memory list --type knowledge    # Filter by type
memory list --tags "api,docs"   # Filter by tags
memory list --limit 20          # Limit results

memory search "API documentation" --threshold 0.8
memory get <memory-id>          # Get specific memory
memory update <memory-id> --title "Updated Title"
memory delete <memory-id>       # Delete memory

# Bulk Operations
memory import memories.json     # Import from JSON
memory export --format json    # Export to JSON
memory export --format csv     # Export to CSV

# Analytics
memory stats                    # Usage statistics
memory stats --detailed        # Detailed analytics
```

### **Memory Types**
- **`context`** - General contextual information
- **`project`** - Project-specific knowledge and documentation
- **`knowledge`** - Educational content and reference materials
- **`reference`** - Quick reference information and cheat sheets
- **`personal`** - User-specific private memories and notes
- **`workflow`** - Process documentation and procedures

### **Advanced CLI Features**

```bash
# Interactive Mode
memory interactive              # Start interactive session

# Batch Operations
memory batch create \
  --file batch-memories.csv \
  --type knowledge

# Search with Filters
memory search "machine learning" \
  --type knowledge \
  --tags "ai,ml" \
  --threshold 0.85 \
  --limit 10

# Organization Management
memory topic create "AI Research" --description "Machine learning papers"
memory topic list
memory topic assign <memory-id> <topic-id>
```

## 📚 **SDK Usage & Integration**

### **TypeScript/JavaScript SDK**

```bash
npm install @lanonasis/memory-client
```

#### **Basic Usage**

```typescript
import { createMemoryClient, MemoryType } from '@lanonasis/memory-client';

// Initialize client
const client = createMemoryClient({
  baseURL: 'https://api.lanonasis.com', // or your self-hosted instance
  apiKey: 'your-api-key-here'
});

// Create memory
const memory = await client.createMemory({
  title: 'API Integration Guide',
  content: 'Complete guide for integrating the memory service...',
  type: MemoryType.KNOWLEDGE,
  tags: ['api', 'integration', 'documentation'],
  metadata: {
    source: 'documentation',
    priority: 'high'
  }
});

// Search memories
const results = await client.searchMemories({
  query: 'API integration',
  type: MemoryType.KNOWLEDGE,
  threshold: 0.8,
  limit: 10
});

// List memories with pagination
const { memories, total, hasMore } = await client.listMemories({
  page: 1,
  limit: 20,
  type: MemoryType.PROJECT
});
```

#### **React Hooks Integration**

```typescript
import { useMemories, useMemorySearch } from '@lanonasis/memory-client/react';

function MemoryDashboard() {
  const { 
    memories, 
    loading, 
    error,
    createMemory,
    updateMemory,
    deleteMemory 
  } = useMemories({
    type: MemoryType.PROJECT,
    limit: 20
  });

  const { 
    searchMemories, 
    results, 
    searching 
  } = useMemorySearch();

  const handleSearch = async (query: string) => {
    await searchMemories({
      query,
      threshold: 0.8,
      limit: 10
    });
  };

  return (
    <div>
      <SearchBar onSearch={handleSearch} loading={searching} />
      <MemoryList 
        memories={results || memories} 
        onUpdate={updateMemory}
        onDelete={deleteMemory}
      />
    </div>
  );
}
```

#### **Advanced SDK Features**

```typescript
// Bulk operations
const bulkResult = await client.bulkCreateMemories([
  { title: 'Doc 1', content: '...', type: MemoryType.KNOWLEDGE },
  { title: 'Doc 2', content: '...', type: MemoryType.REFERENCE }
]);

// Memory versioning
const versions = await client.getMemoryVersions(memoryId);
const restored = await client.restoreMemoryVersion(memoryId, versionId);

// Analytics
const stats = await client.getAnalytics({
  period: 'month',
  groupBy: 'type'
});

// Topic management
const topic = await client.createTopic({
  name: 'Machine Learning',
  description: 'AI and ML related memories',
  parent_id: parentTopicId
});
```

### **Python SDK** (Coming Soon)

```python
from lanonasis_memory import MemoryClient, MemoryType

client = MemoryClient(
    base_url="https://api.lanonasis.com",
    api_key="your-api-key-here"
)

# Create memory
memory = client.create_memory(
    title="Python Integration",
    content="How to integrate the memory service with Python",
    type=MemoryType.KNOWLEDGE,
    tags=["python", "integration"]
)

# Search memories
results = client.search_memories(
    query="python integration",
    threshold=0.8,
    limit=10
)
```

## 🌐 **REST API Documentation**

### **Base URL**
- **Production**: `https://api.lanonasis.com/api/v1`
- **Self-hosted**: `https://your-domain.com/api/v1`

### **Authentication**

```bash
# Option 1: API Key (Recommended for integrations)
curl -H "X-API-Key: your-api-key" https://api.lanonasis.com/api/v1/memory

# Option 2: JWT Bearer Token
curl -H "Authorization: Bearer your-jwt-token" https://api.lanonasis.com/api/v1/memory
```

### **Core Endpoints**

#### **Memory Management**

```bash
# Create Memory
POST /api/v1/memory
Content-Type: application/json

{
  "title": "API Documentation",
  "content": "Complete API reference and examples",
  "type": "knowledge",
  "tags": ["api", "docs"],
  "metadata": {
    "source": "documentation",
    "priority": "high"
  }
}

# List Memories
GET /api/v1/memory?page=1&limit=20&type=knowledge&tags=api,docs

# Search Memories
POST /api/v1/memory/search
{
  "query": "API documentation",
  "threshold": 0.8,
  "limit": 10,
  "type": "knowledge"
}

# Get Memory
GET /api/v1/memory/:id

# Update Memory
PUT /api/v1/memory/:id
{
  "title": "Updated Title",
  "content": "Updated content"
}

# Delete Memory
DELETE /api/v1/memory/:id
```

#### **Bulk Operations**

```bash
# Bulk Create
POST /api/v1/memory/bulk
{
  "memories": [
    {
      "title": "Memory 1",
      "content": "Content 1",
      "type": "knowledge"
    },
    {
      "title": "Memory 2", 
      "content": "Content 2",
      "type": "reference"
    }
  ]
}

# Bulk Delete
DELETE /api/v1/memory/bulk
{
  "ids": ["mem_1", "mem_2", "mem_3"]
}
```

#### **Analytics & Statistics**

```bash
# Memory Statistics
GET /api/v1/memory/stats

# Response:
{
  "total_memories": 1250,
  "by_type": {
    "knowledge": 450,
    "project": 300,
    "context": 250,
    "reference": 200,
    "personal": 50
  },
  "usage_this_month": {
    "api_calls": 5420,
    "searches": 890,
    "creates": 67
  }
}
```

### **Interactive API Explorer**

Visit [api.lanonasis.com/docs](https://api.lanonasis.com/docs) for:
- **Swagger UI** - Interactive API testing
- **Complete API Reference** - All endpoints documented
- **Authentication Testing** - Test your API keys
- **Response Examples** - Real response samples
- **Error Code Reference** - Complete error handling guide

## 🧪 **Testing**

### **Run Tests**

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests

# Watch mode for development
npm run test:watch

# Run tests in CI environment
npm run test:ci
```

### **Test Categories**

- **Unit Tests** (90%+ coverage required)
  - Service layer logic
  - Utility functions
  - Memory operations
  - Authentication flow

- **Integration Tests**
  - API endpoint testing
  - Database operations
  - External service integration
  - Memory search functionality

- **End-to-End Tests**
  - Complete user workflows
  - CLI tool functionality
  - SDK integration testing
  - Authentication scenarios

## 📊 **Monitoring & Observability**

### **Health Endpoints**

```bash
# Basic health check
curl https://api.lanonasis.com/api/v1/health

# Detailed health with dependencies
curl https://api.lanonasis.com/api/v1/health/detailed

# Liveness probe (Kubernetes)
curl https://api.lanonasis.com/api/v1/health/live

# Readiness probe (Kubernetes)
curl https://api.lanonasis.com/api/v1/health/ready
```

### **Metrics & Analytics**

```bash
# Prometheus metrics
curl https://api.lanonasis.com/metrics

# JSON metrics (authenticated)
curl -H "X-API-Key: your-key" https://api.lanonasis.com/api/v1/metrics
```

### **Logging**

The platform provides structured JSON logging with:
- **Request/Response logging** - All API calls tracked
- **Performance metrics** - Response times and bottlenecks
- **Error tracking** - Stack traces and error context
- **User activity** - Memory operations and search patterns
- **Security events** - Authentication and authorization

Log levels: `error`, `warn`, `info`, `debug`

## 🚀 **Deployment Options**

### **1. Use Hosted Service** (Recommended)

No deployment needed! Get started immediately:
1. Sign up at [api.lanonasis.com](https://api.lanonasis.com)
2. Generate API key
3. Start building with SDK or API

### **2. Docker Deployment**

```bash
# Development environment
docker-compose up

# Production environment
docker-compose -f docker-compose.prod.yml up -d

# Custom build
docker build -t memory-service .
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_KEY=your_key \
  -e OPENAI_API_KEY=your_openai_key \
  memory-service
```

### **3. Kubernetes Deployment**

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or step by step
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Auto-scaling
kubectl apply -f k8s/hpa.yaml
```

### **4. Serverless Deployment**

```bash
# Vercel
npm install -g vercel
vercel deploy

# Netlify
npm run build
netlify deploy --prod --dir=dist

# Railway
railway deploy

# Render
# Connect GitHub repository and deploy
```

## 💰 **Pricing & Plans**

| Plan | Memory Limit | API Calls/Min | Vector Search | Features | Price |
|------|-------------|---------------|---------------|----------|-------|
| **Free** | 100 memories | 60 calls | ✅ Basic | Community support, API access | **$0/month** |
| **Pro** | 10,000 memories | 300 calls | ✅ Advanced | SDK access, Priority support, Analytics | **$29/month** |
| **Enterprise** | Unlimited | 1,000 calls | ✅ Premium | White-label, Custom SLA, Dedicated support | **Custom** |

### **Enterprise Features**
- **White-label SDK** - Remove branding, use your own
- **Custom domains** - memory.yourcompany.com
- **Dedicated infrastructure** - Isolated deployment
- **Advanced analytics** - Custom dashboards and reporting
- **Priority support** - 24/7 dedicated support team
- **Custom integrations** - Tailored API endpoints
- **SLA guarantees** - 99.9% uptime commitment

## 🛣️ **Roadmap**

### **✅ Phase 1: Core Platform** (Complete)
- ✅ Vector memory storage with OpenAI embeddings
- ✅ Dual authentication system (JWT + API Keys)
- ✅ TypeScript SDK with React hooks
- ✅ CLI tool with full functionality
- ✅ Memory visualizer components
- ✅ Comprehensive API documentation
- ✅ Docker and Kubernetes deployment

### **🔄 Phase 2: Business Features** (In Progress)
- 🔄 Usage-based billing system
- 🔄 Advanced analytics dashboard
- 🔄 Multi-region deployment
- 🔄 Enhanced admin controls
- 🔄 Webhook notifications
- 🔄 API rate limiting improvements

### **📋 Phase 3: Advanced Features** (Q2 2025)
- 📅 Python SDK
- 📅 Real-time collaboration
- 📅 Custom embedding models (Azure, Cohere, etc.)
- 📅 Advanced security features (SSO, RBAC)
- 📅 Memory templates and workflows
- 📅 Marketplace for memory applications

### **🚀 Phase 4: Enterprise & Scale** (Q3 2025)
- 📅 Multi-tenant management
- 📅 Advanced compliance features (SOC2, GDPR)
- 📅 Custom deployment options
- 📅 Advanced search capabilities
- 📅 Memory federation across instances
- 📅 AI-powered memory organization

## 🔒 **Security & Compliance**

### **Data Security**
- **Encryption at rest** - All data encrypted in Supabase
- **Encryption in transit** - TLS 1.3 for all communications
- **API key security** - Secure generation and storage
- **Row-level security** - Multi-tenant data isolation
- **Input validation** - Comprehensive request validation
- **Rate limiting** - DDoS protection and abuse prevention

### **Privacy & Compliance**
- **GDPR compliance** - Right to deletion and data portability
- **Data residency** - Control over data location
- **Audit trails** - Complete operation logging
- **Privacy by design** - Minimal data collection
- **Terms of service** - Clear usage guidelines
- **Privacy policy** - Transparent data handling

### **Best Practices**
- **Environment variables** - No secrets in code
- **Regular updates** - Automated dependency updates
- **Security scanning** - Automated vulnerability detection
- **Access logging** - Complete audit trail
- **Backup strategy** - Regular automated backups
- **Incident response** - Clear security incident procedures

## 🤝 **Contributing**

We welcome contributions! Here's how to get started:

### **Development Setup**

```bash
# 1. Fork and clone
git clone https://github.com/yourusername/vibe-memory.git
cd vibe-memory

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Configure your local environment

# 4. Run tests
npm test

# 5. Start development server
npm run dev
```

### **Contribution Guidelines**

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. **Write tests** for new functionality
4. **Follow TypeScript** best practices
5. **Update documentation** as needed
6. **Commit changes** (`git commit -m 'Add amazing feature'`)
7. **Push to branch** (`git push origin feature/amazing-feature`)
8. **Open Pull Request**

### **Development Standards**
- **TypeScript strict mode** - All code must be strongly typed
- **Test coverage >80%** - Unit and integration tests required
- **ESLint + Prettier** - Code formatting and linting
- **Conventional commits** - Clear commit message format
- **Documentation** - Update README and API docs
- **Performance** - Consider impact on response times

## 📄 **License & Support**

### **License**
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### **Support Channels**
- **📚 Documentation**: [docs.lanonasis.com](https://docs.lanonasis.com)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/thefixer3x/vibe-memory/issues)
- **💬 Community**: [Discord Server](https://discord.gg/memory-service)
- **📧 Email**: support@lanonasis.com
- **🔗 Platform**: [api.lanonasis.com](https://api.lanonasis.com)

### **Enterprise Support**
For enterprise customers:
- **24/7 dedicated support**
- **Priority issue resolution**
- **Custom integration assistance**
- **Performance optimization**
- **Security consultation**

Contact: enterprise@lanonasis.com

---

## 🏆 **Production Ready**

**✅ Complete Memory as a Service Platform**

Transform your memory infrastructure into a revenue-generating distribution platform. Ready for immediate market launch with comprehensive features and enterprise-grade reliability.

### **Quick Links**
- 🚀 **Get Started**: [api.lanonasis.com](https://api.lanonasis.com)
- 📚 **Documentation**: [docs.lanonasis.com](https://docs.lanonasis.com)
- 🔧 **API Explorer**: [api.lanonasis.com/docs](https://api.lanonasis.com/docs)
- 💻 **GitHub**: [github.com/thefixer3x/vibe-memory](https://github.com/thefixer3x/vibe-memory)

Built with ❤️ by [Seye Derick](https://github.com/thefixer3x) | Enterprise Memory Solutions