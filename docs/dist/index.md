# 🧠 Lanonasis Memory as a Service

Enterprise-grade memory management with semantic search, multi-tenant support, and AI agent integration.

## 🚀 Quick Start

### 1. Create Account
Visit the [Dashboard](https://api.lanonasis.com/dashboard) to create your account and generate API keys.

### 2. Install SDK
```bash
npm install @lanonasis/memory-client
```

### 3. Start Using
```javascript
import { MemoryClient } from '@lanonasis/memory-client';

const client = new MemoryClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.lanonasis.com'
});

// Create a memory
const memory = await client.createMemory({
  title: 'Important Note',
  content: 'This is my important information',
  type: 'project',
  tags: ['important', 'project-alpha']
});

// Search memories
const results = await client.searchMemories('important information');
```

## 🔗 Key Endpoints

- **API Base URL**: `https://api.lanonasis.com/api/v1`
- **Dashboard**: `https://api.lanonasis.com/dashboard`
- **MCP SSE**: `https://mcp.lanonasis.com/sse`
- **Documentation**: `https://api.lanonasis.com/docs`

## ✨ Features

### 🔍 Semantic Search
Vector-based similarity search using OpenAI embeddings for intelligent memory retrieval.

### 🏷️ Smart Categorization
Organize memories with types, tags, and topics:
- **context**: General contextual information
- **project**: Project-specific knowledge and documentation
- **knowledge**: Educational content and reference materials
- **reference**: Quick reference information and code snippets
- **personal**: User-specific private memories
- **workflow**: Process and procedure documentation

### 👥 Multi-tenant Support
Organization-based isolation with role-based access control.

### 📊 Analytics & Tracking
- Usage statistics and access tracking
- Memory access patterns
- Search analytics
- Performance metrics

### 🔐 Security
- JWT authentication with plan-based limitations
- API key management and rotation
- Role-based access control
- Secure data encryption

### 🤖 AI Integration
- Model Context Protocol (MCP) support
- Claude Desktop integration
- Real-time memory updates via SSE
- AI agent access to memories

## 📋 Memory Operations

### Create Memory
```http
POST /api/v1/memory
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "title": "Memory Title",
  "content": "Memory content here...",
  "type": "project",
  "tags": ["tag1", "tag2"],
  "metadata": {
    "custom": "data"
  }
}
```

### Search Memories
```http
GET /api/v1/memory/search?query=search%20terms
Authorization: Bearer YOUR_JWT_TOKEN
```

### Update Memory
```http
PUT /api/v1/memory/:id
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

### Delete Memory
```http
DELETE /api/v1/memory/:id
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔑 API Key Management

### Create API Key
```http
POST /api/v1/api-keys
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

{
  "name": "My API Key",
  "projectId": "project-uuid",
  "permissions": ["read", "write"],
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### List API Keys
```http
GET /api/v1/api-keys
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔗 MCP Remote Connection

Connect external MCP clients (like Claude Desktop) to your Memory Service:

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "lanonasis-memory": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-sse",
        "https://mcp.lanonasis.com/sse"
      ],
      "env": {
        "MCP_API_KEY": "your-lanonasis-api-key-here"
      }
    }
  }
}
```

### Authentication
- **Header**: `X-API-Key: your-api-key`
- **Query**: `?api_key=your-api-key`

## 🛠️ Development Tools

### CLI Installation
```bash
npm install -g @lanonasis/cli
```

### VS Code Extension
Search for "Lanonasis Memory" in the VS Code marketplace.

### SDKs Available
- **JavaScript/TypeScript**: `@lanonasis/memory-client`
- **Python**: `lanonasis-python` (coming soon)
- **CLI**: `@lanonasis/cli`

## 📈 Plans & Limits

| Plan | Memories | Features |
|------|----------|----------|
| **Free** | 100 | Basic operations, standard search |
| **Pro** | 10,000 | Bulk operations, advanced search, priority support |
| **Enterprise** | Unlimited | Custom features, dedicated support, SLA |

## 🔧 Configuration

### Environment Variables
```bash
LANONASIS_API_KEY=your-api-key
LANONASIS_BASE_URL=https://api.lanonasis.com
LANONASIS_ORGANIZATION_ID=your-org-id
```

### Client Configuration
```javascript
const client = new MemoryClient({
  apiKey: process.env.LANONASIS_API_KEY,
  baseUrl: process.env.LANONASIS_BASE_URL,
  organizationId: process.env.LANONASIS_ORGANIZATION_ID,
  timeout: 30000,
  retries: 3
});
```

## 📚 Resources

- 📊 **Dashboard**: Self-service portal for API key management and analytics
- 🛠️ **CLI Tools**: Command-line interface for developers and automation
- 🔗 **MCP Integration**: Connect AI agents like Claude Desktop
- 📖 **API Documentation**: Complete reference with interactive examples
- 💡 **Examples**: Sample implementations and use cases
- 📞 **Support**: Community and enterprise support options

## 🌟 Getting Started

Ready to get started? [Create your account](https://api.lanonasis.com/dashboard) and begin building with Lanonasis Memory Service today!

For questions and support, visit our [documentation](https://docs.lanonasis.com) or contact us at support@lanonasis.com.
