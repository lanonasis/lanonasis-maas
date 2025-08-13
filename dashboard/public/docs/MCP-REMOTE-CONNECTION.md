# 🔗 MCP Remote Connection Guide

Connect external MCP clients (like Claude Desktop) to your Lanonasis Memory Service via `mcp.lanonasis.com/sse`.

## 🎯 **Overview**

The MCP Remote SSE endpoint enables external clients to connect to your Memory Service using Lanonasis API keys for authentication. This allows tools like Claude Desktop to access your memory data remotely.

## 🔧 **Configuration**

### **For Claude Desktop**

Add this configuration to your Claude Desktop MCP settings:

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

### **For Custom MCP Clients**

Connect to the SSE endpoint with API key authentication:

```javascript
const eventSource = new EventSource(
  'https://mcp.lanonasis.com/sse?client_id=my-client',
  {
    headers: {
      'X-API-Key': 'your-lanonasis-api-key'
    }
  }
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('MCP Message:', data);
};
```

## 🔑 **API Key Authentication**

### **Getting Your API Key**

1. Visit the [Lanonasis Dashboard](https://api.lanonasis.com/dashboard)
2. Navigate to **API Keys** section
3. Click **Generate New Key**
4. Copy your API key for MCP configuration

### **Authentication Methods**

The MCP SSE endpoint supports two authentication methods:

1. **Header Authentication** (Recommended):
   ```
   X-API-Key: your-lanonasis-api-key
   ```

2. **Query Parameter Authentication**:
   ```
   https://mcp.lanonasis.com/sse?api_key=your-lanonasis-api-key
   ```

## 📡 **MCP Protocol Support**

### **Supported Capabilities**

- ✅ **Resources**: Memory entries, topics, search results
- ✅ **Tools**: Memory CRUD operations, search, analytics
- ✅ **Prompts**: Memory-based prompt templates
- ✅ **Logging**: Real-time operation logs
- ✅ **Notifications**: Live memory updates

### **Protocol Messages**

The endpoint implements MCP 2024-11-05 protocol:

```json
{
  "jsonrpc": "2.0",
  "method": "initialized",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "resources": { "subscribe": true, "listChanged": true },
      "tools": { "listChanged": true },
      "prompts": { "listChanged": true },
      "logging": {}
    },
    "serverInfo": {
      "name": "lanonasis-memory-service",
      "version": "1.0.0"
    }
  }
}
```

## 🔄 **Real-time Updates**

### **Memory Operations**

Receive live updates when memories are created, updated, or deleted:

```json
{
  "type": "memory_update",
  "operation": "create",
  "memoryId": "uuid-here",
  "data": { "title": "New Memory", "content": "..." }
}
```

### **Tool Results**

Get real-time results from memory operations:

```json
{
  "type": "tool_result",
  "toolName": "search_memories",
  "result": { "memories": [...], "total": 42 },
  "requestId": "req-123"
}
```

### **Resource Updates**

Monitor changes to memory resources:

```json
{
  "type": "resource_update",
  "resourceUri": "memory://uuid-here",
  "operation": "updated"
}
```

## 🛡️ **Security Features**

### **API Key Validation**

- ✅ Active key verification against database
- ✅ Expiration date checking
- ✅ Usage tracking and rate limiting
- ✅ User-scoped access control

### **Connection Management**

- ✅ Automatic connection cleanup
- ✅ Heartbeat monitoring (30s intervals)
- ✅ Error handling and reconnection
- ✅ Connection logging and audit

## 🚀 **Production Endpoints**

Once deployed, your MCP remote connection will be available at:

| Endpoint | Purpose | Authentication |
|----------|---------|----------------|
| `https://mcp.lanonasis.com/sse` | MCP SSE Connection | API Key |
| `https://api.lanonasis.com/dashboard` | API Key Management | JWT |
| `https://docs.lanonasis.com` | Documentation | None |

## 📋 **Example Usage**

### **Claude Desktop Integration**

1. **Get API Key**: Generate from dashboard
2. **Configure Claude**: Add MCP server configuration
3. **Connect**: Claude will automatically connect on startup
4. **Use**: Access memory commands in Claude conversations

### **Custom Client Integration**

```javascript
// Connect to MCP SSE
const mcp = new EventSource('https://mcp.lanonasis.com/sse', {
  headers: { 'X-API-Key': 'your-key' }
});

// Handle memory updates
mcp.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'memory_update') {
    console.log('Memory updated:', message.memoryId);
    // Update your UI or trigger actions
  }
});

// Send tool requests (via separate HTTP requests)
async function searchMemories(query) {
  const response = await fetch('https://api.lanonasis.com/api/v1/memory/search', {
    method: 'POST',
    headers: {
      'X-API-Key': 'your-key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  return response.json();
}
```

## 🎉 **Ready to Connect**

Your Lanonasis Memory Service now supports remote MCP connections! External clients can connect using your API keys and access your memory data in real-time.

**Start connecting your tools and enjoy seamless memory integration across all your applications!**
