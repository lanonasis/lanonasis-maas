# 🧠 Memory as a Service (MaaS) - B2B2C Platform

[![CI/CD Pipeline](https://github.com/seyederick/memory-service/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/seyederick/memory-service/actions)
[![Coverage](https://codecov.io/gh/seyederick/memory-service/branch/main/graph/badge.svg)](https://codecov.io/gh/seyederick/memory-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Transform Memory into Revenue** - Complete B2B2C Memory as a Service platform that turns the sd-ghost-protocol memory infrastructure into a distributable, monetizable service for third-party integration.

## 🎯 **Business Model: B2B2C Distribution**

Transform your existing memory infrastructure into a revenue-generating service:

- **💰 API Usage Pricing** - Free/Pro/Enterprise tiers with usage-based billing
- **🔑 SDK Licensing** - White-label SDK for third-party integration
- **☁️ Managed Hosting** - Multi-tenant and dedicated deployment options
- **🤝 Reseller Network** - Enable third parties to embed memory capabilities

## ✨ **Platform Capabilities**

### **🧠 Advanced Memory Engine**
- **Vector Storage** - OpenAI embeddings (1536D) with PostgreSQL pgvector
- **Semantic Search** - Cosine similarity with configurable thresholds
- **Memory Types** - Conversation, knowledge, project, context, reference
- **Topic Organization** - Hierarchical memory organization
- **Bulk Operations** - Multi-format import/export (JSON, YAML, Markdown, CSV)

### **🔐 Dual Authentication System**
- **Supabase JWT** - Integration with existing auth.users system
- **API Keys** - Custom key system for programmatic access
- **Plan-Based Access** - Feature gating by subscription tier
- **Multi-Tenant** - Complete user isolation and data security

### **🛠 Developer Ecosystem**
- **TypeScript SDK** - Complete client library with React hooks
- **CLI Tool** - Feature-rich command-line interface
- **Visual Components** - Memory visualizer and bulk uploader
- **REST API** - OpenAPI documented endpoints
- **Zero Integration** - Works with existing sd-ghost-protocol

## 🏗️ **B2B2C Architecture**

```
                    ┌─────────────────────────────────────────┐
                    │              RESELLER NETWORK           │
                    │  ┌─────────────┐  ┌─────────────────────┐│
                    │  │ SaaS Apps   │  │ AI Platforms       ││
                    │  │ CRM/ERP     │  │ Agent Systems      ││
                    │  └─────────────┘  └─────────────────────┘│
                    └─────────────┬───────────────────────────┘
                                  │ MaaS SDK Integration
                    ┌─────────────▼───────────────────────────┐
                    │         MaaS Distribution Layer         │
                    │  ┌───────────────┐ ┌─────────────────────┐│
                    │  │ TypeScript SDK│ │ Visual Components   ││
                    │  │ React Hooks   │ │ Memory Visualizer   ││
                    │  └───────────────┘ └─────────────────────┘│
                    └─────────────┬───────────────────────────┘
                                  │ API Calls
┌─────────────────┐ ┌─────────────▼──────────────┐ ┌─────────────────┐
│   Admin Panel   │ │    Memory Service API      │ │   CLI Tool      │
│   MaaS Control  │ │    (Express + TypeScript)  │ │   Full Access   │
└─────────────────┘ └─────────────┬──────────────┘ └─────────────────┘
                                  │ Aligned Integration
                    ┌─────────────▼──────────────┐
                    │     sd-ghost-protocol      │
                    │    Supabase Database       │
                    │  (PostgreSQL + pgvector)   │
                    └────────────────────────────┘
```

## 🛠️ **Technology Stack**

### **Core Platform**
- **Runtime**: Node.js 18+, TypeScript
- **API Framework**: Express.js with enterprise middleware
- **Database**: Supabase (PostgreSQL + pgvector)
- **Vector Engine**: OpenAI embeddings (text-embedding-ada-002)
- **Authentication**: Dual system (Supabase JWT + API keys)

### **Distribution & Integration**
- **SDK**: TypeScript with React hooks
- **CLI**: Commander.js with inquirer prompts
- **Components**: React visualizer and uploader
- **Documentation**: OpenAPI with Swagger UI
- **Schema Alignment**: Zero-breaking integration with sd-ghost-protocol

### **Enterprise Infrastructure**
- **Monitoring**: Prometheus metrics, Winston logging
- **Security**: Helmet.js, CORS, input validation
- **Testing**: Jest with 80%+ coverage requirement
- **Deployment**: Docker + Kubernetes
- **CI/CD**: GitHub Actions with security scanning

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18+, npm/yarn
- Existing sd-ghost-protocol infrastructure
- Supabase account with vector support
- OpenAI API key

### **Integration Setup** (Zero Breaking Changes)

1. **Clone and install**
```bash
git clone https://github.com/seyederick/vibe-memory.git
cd vibe-memory
npm install
```

2. **Apply aligned schema** (adds only 2 tables)
```bash
# Run in your existing Supabase dashboard
psql -f src/db/schema-aligned.sql
```

3. **Configure environment**
```bash
cp .env.example .env
# Use your existing Supabase credentials
```

4. **Launch MaaS platform**
```bash
npm run dev
```

**✅ Your existing memory system is now a B2B2C service!**

### **For Third-Party Developers**

```bash
# Install the SDK
npm install @seyederick/maas-client

# Use in your app
import { createMaaSClient } from '@seyederick/maas-client';
const client = createMaaSClient({ 
  apiUrl: 'https://your-maas.com',
  apiKey: 'your-api-key' 
});
```

### Docker Deployment

```bash
# Development
docker-compose up

# Production
docker-compose -f docker-compose.prod.yml up
```

### Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or use individual components
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## 🔧 Configuration

Key environment variables:

```bash
# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY

# Authentication
JWT_SECRET=REDACTED_JWT_SECRET
JWT_EXPIRES_IN=24h

# AI Services
OPENAI_API_KEY=REDACTED_OPENAI_API_KEY

# Optional: Caching
REDIS_URL=redis://localhost:6379

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

## 🖥️ **CLI Tool - Professional Memory Management**

Install globally for command-line access:

```bash
npm install -g @seyederick/memory-cli
```

### **Memory Operations**
```bash
# Authentication
memory login                    # Supabase JWT authentication
memory auth status             # Check authentication status

# Memory management with aligned types
memory create -t "Title" -c "Content" --type conversation
memory list --type knowledge --limit 20
memory search "semantic query" --threshold 0.8
memory get <memory-id>
memory update <memory-id> -t "New Title"
memory delete <memory-id>

# Topic organization
memory topic create -n "Project X" -d "Documentation"
memory topic list
memory topic get <topic-id>

# Analytics and admin
memory stats                   # Usage statistics
memory config show           # Configuration display
```

### **Available Memory Types**
- `conversation` - Chat and dialogue context
- `knowledge` - Educational and reference content
- `project` - Project-specific documentation  
- `context` - General contextual information
- `reference` - Quick reference materials

## 📚 **API Documentation & SDK Usage**

### **Interactive Documentation**
- Development: `http://localhost:3000/docs`
- Production: `https://your-maas-domain.com/docs`

### **Dual Authentication Support**
```bash
# Option 1: Supabase JWT Token
curl -H "Authorization: Bearer <supabase-jwt>" \
     https://your-maas.com/api/v1/memory

# Option 2: API Key (for integrations)
curl -H "X-API-Key: <your-api-key>" \
     https://your-maas.com/api/v1/memory
```

### **SDK Integration Examples**

**React Application:**
```typescript
import { createMaaSClient, useMemories } from '@seyederick/maas-client';

const client = createMaaSClient({
  apiUrl: 'https://your-maas.com',
  apiKey: 'your-api-key'
});

function MemoryApp() {
  const { memories, search, create } = useMemories(client);
  
  const handleSearch = async (query: string) => {
    const results = await search({ 
      query, 
      memory_types: ['knowledge', 'reference'],
      limit: 10 
    });
    console.log(results);
  };

  return <MemoryVisualizerComponent memories={memories} />;
}
```

**Node.js Backend:**
```typescript
import { createMaaSClient } from '@seyederick/maas-client';

const client = createMaaSClient({
  apiUrl: process.env.MAAS_URL,
  apiKey: process.env.MAAS_API_KEY
});

// Add contextual memory to your application
const memory = await client.createMemory({
  title: 'User Interaction Context',
  content: 'Important user preferences and history',
  memory_type: 'conversation',
  metadata: { user_id: 'user123', session: 'session456' }
});
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode
npm run test:watch
```

## 📊 Monitoring

### Health Checks
- **Liveness**: `GET /api/v1/health/live`
- **Readiness**: `GET /api/v1/health/ready`
- **Full Health**: `GET /api/v1/health`

### Metrics
- **Prometheus**: `GET /metrics`
- **JSON Format**: `GET /metrics/json` (authenticated)

### Logging
Structured logs in JSON format with configurable levels:
- HTTP request/response logging
- Memory operation tracking
- Performance metrics
- Error tracking with stack traces

## 🚀 **Production Deployment**

### **B2B2C Launch Checklist**

- [ ] **Schema Integration**: Apply aligned schema to existing database
- [ ] **Environment Setup**: Configure MaaS-specific environment variables
- [ ] **API Key System**: Initialize API key management tables
- [ ] **Plan Configuration**: Set up free/pro/enterprise tiers
- [ ] **SDK Distribution**: Publish SDK to npm registry
- [ ] **Documentation**: Deploy API docs and integration guides
- [ ] **Monitoring**: Enable metrics and health checks
- [ ] **Security**: Complete security audit and scanning

### **Revenue Model Setup**

```bash
# 1. Configure plan-based pricing
npm run setup:plans

# 2. Deploy to production
docker-compose -f docker-compose.prod.yml up

# 3. Publish SDK for resellers
cd sdk && npm publish

# 4. Enable monitoring
kubectl apply -f k8s/monitoring/
```

### **Scaling for B2B2C Distribution**

- **Multi-Tenant**: Complete user isolation by design
- **API Gateway**: Rate limiting per plan and per user  
- **Horizontal Scaling**: Stateless microservice architecture
- **Database**: Supabase handles vector scaling automatically
- **CDN Integration**: Cache SDK assets and documentation
- **Global Distribution**: Deploy to multiple regions

## 🔒 **Enterprise Security**

### **Authentication & Authorization**
- **Dual Authentication**: Supabase JWT + custom API keys
- **Plan-Based Access**: Feature gating by subscription tier
- **Multi-Tenant Isolation**: Complete data separation
- **Admin Controls**: Role-based administrative access
- **Key Management**: API key generation, rotation, expiration

### **Security Measures**
- **Input Validation**: Zod schema validation for all inputs
- **Rate Limiting**: Plan-based API rate limits
- **CORS Configuration**: Configurable cross-origin policies
- **Security Headers**: Helmet.js security headers
- **Secrets Management**: Environment-based configuration
- **Audit Trails**: Complete operation logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain test coverage above 80%
- Use conventional commit messages
- Update documentation for new features
- Ensure all CI checks pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [docs.seyederick.com/memory-service](https://docs.seyederick.com/memory-service)
- **Issues**: [GitHub Issues](https://github.com/seyederick/memory-service/issues)
- **Email**: support@seyederick.com

## 💼 **Business Use Cases**

### **For Platform Operators**
- **📈 Monetize Memory**: Transform infrastructure into revenue streams
- **🔑 API Economy**: Sell memory access through API keys
- **🏢 Enterprise Sales**: White-label solutions for large clients
- **📊 Usage Analytics**: Revenue insights and user behavior

### **For Third-Party Developers**
- **🚀 Quick Integration**: Add memory to any application in minutes
- **🎨 White-Label**: Fully customizable components and branding
- **⚡ Production Ready**: Enterprise-grade reliability and security
- **📱 Multi-Platform**: SDK works with React, Node.js, Python, etc.

### **Popular Integration Scenarios**
- **AI Agents**: Persistent conversation memory
- **CRM Systems**: Customer interaction history
- **Knowledge Bases**: Semantic document search
- **Support Tools**: Contextual help systems
- **Development Tools**: Project memory and documentation

## 📊 **Revenue Model**

| Plan | Memory Limit | API Calls/Min | Features | Price |
|------|-------------|---------------|----------|-------|
| **Free** | 100 memories | 60 calls | Basic API, Community support | $0/month |
| **Pro** | 10,000 memories | 300 calls | SDK access, Priority support | $29/month |
| **Enterprise** | Unlimited | 1,000 calls | White-label, Custom integration | Custom |

## 🗺️ **Platform Roadmap**

### **✅ Phase 1: Core Platform** (Complete)
- Memory service with vector search
- Dual authentication system
- CLI tool and SDK
- Visual components

### **🔄 Phase 2: Business Features** (In Progress)
- Usage-based billing system
- Advanced analytics dashboard
- Multi-region deployment
- Enhanced admin controls

### **📋 Phase 3: Advanced Features** (Planned)
- Real-time collaboration
- Custom embedding models
- Advanced security features
- Marketplace for memory apps

---

## 🏆 **Status: Production Ready**

**✅ Complete B2B2C Memory as a Service Platform**

Transform your memory infrastructure into a revenue-generating distribution platform. Ready for immediate market launch with existing compatibility and new business opportunities.

Built with ❤️ by [Seye Derick](https://github.com/seyederick) | [Platform Documentation](https://docs.memory-platform.com)