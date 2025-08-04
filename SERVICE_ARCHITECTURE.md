# 🚀 Lanonasis MaaS - Multi-Entry Point Service Architecture

## Overview
Lanonasis Memory as a Service (MaaS) provides multiple access points to accommodate different user workflows and integration patterns. All services are **INTACT** and fully functional.

## 🎯 Service Entry Points

### 1. 🔌 MCP (Model Context Protocol) Access
**For AI tools, IDEs, and context-aware applications**

#### Server Components
- **📁 Location**: `/src/routes/mcp-sse.ts`
- **📁 CLI Support**: `/cli/src/commands/mcp.ts`
- **📁 Integration Docs**: `/cli/MCP_INTEGRATION_*.md`

#### Features
```typescript
// MCP Server capabilities
- Real-time SSE connections
- AI context sharing
- Memory retrieval for LLMs
- Cross-application memory sync
```

#### Usage
```bash
# Initialize MCP server
npx lanonasis mcp-server init

# Connect MCP client
npx lanonasis mcp connect --server memory-service
```

---

### 2. 💻 CLI (Command Line Interface)
**For developers, DevOps, and automation**

#### Core Commands
- **📁 Location**: `/cli/src/commands/`
- **🔑 API Keys**: `api-keys.ts`
- **🧠 Memory**: `memory.ts`
- **🔐 Auth**: `auth.ts`
- **🔌 MCP**: `mcp.ts`
- **⚙️ Config**: `config.ts`

#### Features
```bash
# Memory operations
lanonasis memory create "Important note"
lanonasis memory search "keyword"
lanonasis memory list --project myapp

# API key management
lanonasis api-keys create --name "dev-key"
lanonasis api-keys list

# MCP integration
lanonasis mcp init
lanonasis mcp status
```

---

### 3. 🎨 IDE Extensions
**For seamless developer workflow integration**

#### VS Code Extension ✅ PUBLISHED
- **📁 Location**: `/vscode-extension/`
- **🏪 Marketplace**: `lanonasis.lanonasis-memory`
- **📦 Package**: `lanonasis-memory-1.2.0.vsix`

#### Cursor Extension
- **📁 Location**: `/cursor-extension/`
- **🎯 Status**: Ready for publishing

#### Windsurf Extension  
- **📁 Location**: `/windsurf-extension/`
- **🎯 Status**: Ready for publishing

#### Extension Features
```typescript
// Common capabilities across all extensions
- Memory search within editor
- Create memory from code selection
- API key management
- Project-specific memories
- Context-aware suggestions
```

---

### 4. 🌐 REST API
**For direct HTTP access and web applications**

#### Core Endpoints
- **📁 Server**: `/src/server.ts`
- **📁 Routes**: `/src/routes/`

#### API Routes
```typescript
// Memory Operations
POST   /api/memories          // Create memory
GET    /api/memories          // List memories  
GET    /api/memories/:id      // Get memory
PUT    /api/memories/:id      // Update memory
DELETE /api/memories/:id      // Delete memory
POST   /api/memories/search   // Search memories

// API Key Management
POST   /api/api-keys          // Create API key
GET    /api/api-keys          // List API keys
DELETE /api/api-keys/:id      // Delete API key

// Authentication
POST   /api/auth/login        // User login
POST   /api/auth/refresh      // Refresh token
POST   /api/auth/logout       // User logout

// MCP Integration
GET    /api/mcp/sse           // MCP SSE endpoint
POST   /api/mcp/api-keys      // MCP-specific keys
```

---

### 5. 📦 SDK Integration
**For programmatic access in applications**

#### Available SDKs
- **📁 Core SDK**: `/packages/lanonasis-sdk/`
- **📁 Memory Client**: `/packages/memory-client/`
- **📁 Memory Engine**: `/packages/memory-engine/`
- **📁 Internal SDK**: `/src/sdk/`

#### Usage Examples
```typescript
// TypeScript/JavaScript SDK
import { LanonasisSDK } from '@lanonasis/sdk';

const client = new LanonasisSDK({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.lanonasis.com'
});

// Create memory
const memory = await client.memories.create({
  content: "Important information",
  type: "note",
  tags: ["important"]
});

// Search memories
const results = await client.memories.search("important");
```

---

## 🔄 User Workflow Mapping

### For Developers
```mermaid
Developer Workflow:
IDE Extension → Memory Service ← CLI Tools
     ↓              ↑              ↓
  VS Code      REST API        Automation
  Cursor       MCP Server      CI/CD
  Windsurf     SDK Client      Scripts
```

### For AI Tools
```mermaid
AI Integration:
MCP Client → MCP Server → Memory Service
     ↓            ↑            ↓
  Claude      Real-time     Database
  GPT-4       SSE Stream    Vector Search
  Local LLM   Context       Embeddings
```

### For Applications
```mermaid
Application Integration:
Web App → REST API → Memory Service
Mobile  → SDK Client → Memory Service
Backend → Direct DB → Memory Service
```

---

## 🛠️ Service Architecture

### Core Services (All Intact ✅)
```
📦 Memory Service Layer
├── 🧠 Memory Management
│   ├── Create, Read, Update, Delete
│   ├── Vector search with embeddings
│   └── Multi-tenant isolation
├── 🔑 API Key Management  
│   ├── Key generation and validation
│   ├── Scope and permission control
│   └── Usage tracking
├── 🔐 Authentication
│   ├── JWT token management
│   ├── OAuth integration
│   └── Session handling
└── 🔌 MCP Protocol
    ├── Real-time connections
    ├── Context synchronization
    └── AI tool integration
```

---

## 🚀 Getting Started by Workflow

### For VS Code Users
1. Install extension: `lanonasis.lanonasis-memory`
2. Configure API key in extension settings
3. Start creating and searching memories

### For CLI Users
```bash
npm install -g @lanonasis/cli
lanonasis auth login
lanonasis memory create "My first memory"
```

### For MCP Integration
```bash
cd cli/
npm run mcp-server:init
# Configure your AI tool to connect to MCP server
```

### For API Integration
```bash
curl -X POST https://api.lanonasis.com/api/memories \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"content": "API memory", "type": "note"}'
```

---

## ✅ Verification: All Services Intact

After the security cleanup, **ALL** critical services remain fully functional:

- ✅ **MCP Server**: `/src/routes/mcp-sse.ts` + CLI commands
- ✅ **CLI Tools**: Complete command suite in `/cli/src/commands/`
- ✅ **IDE Extensions**: All three extensions preserved
- ✅ **REST API**: Full API suite in `/src/routes/`
- ✅ **SDK Libraries**: All SDKs in `/packages/`
- ✅ **Core Services**: Memory, auth, API keys all intact

**The cleanup only removed:**
- Development artifacts (node_modules, build files)
- Log files and caches  
- OS-specific temporary files
- Hardcoded secrets (replaced with secure templates)

**All business logic and service functionality preserved!** 🎉
