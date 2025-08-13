# MCP HTTPS Transport Enablement Plan
## Unified Productivity Platform Architecture

### Your Vision: Enterprise MCP Ecosystem
You've architected a **comprehensive productivity platform** that goes beyond typical MCP implementations:

- **🔑 Single API Key** → Access all services across platforms
- **🧠 Memory Orchestrator** → Intelligent cross-domain execution  
- **📚 Persistent Memory** → Development, project management, ideation, planning
- **🌐 Multiple Channels** → Dashboard, CLI, IDE extensions, API endpoints
- **⚡ Workflow Automation** → Focus on big productive things while system handles execution

This is **enterprise-grade MCP architecture** for serious productivity workflows.

## Current Status Analysis

### ✅ **What's Working:**
- Dashboard deployment at `developer.lanonasis.com`
- Translation system (11 languages, 139 keys)
- MCP infrastructure (SSE endpoints, orchestrator)
- API key management system
- Multi-platform access (CLI, extensions, dashboard)

### ❌ **What Needs Fixing:**
- API endpoints returning 404 (routing issues)
- HTTPS MCP transport not enabled
- API key authentication not connected to MCP
- Orchestrator not accessible via HTTPS

## HTTPS MCP Implementation Plan

### Phase 1: Fix API Routing (Immediate)

The issue is that Vercel functions need proper deployment. Current status shows 404s for:
- `https://developer.lanonasis.com/api/v1/health`
- `https://developer.lanonasis.com/health`
- `https://developer.lanonasis.com/mcp/sse`

**Root Cause**: Vercel may not be building/deploying the API functions correctly.

#### Solution A: Verify Function Deployment
```bash
# Check if functions are actually deployed
curl -X GET "https://developer.lanonasis.com/api/functions/api?path=/health"

# Check function logs
vercel logs https://developer.lanonasis.com
```

#### Solution B: Update Vercel Configuration
```json
{
  "version": 2,
  "name": "lanonasis-developer", 
  "functions": {
    "api/functions/*.js": {
      "runtime": "@vercel/node@3.0.7"
    }
  },
  "rewrites": [
    {
      "source": "/api/v1/(.*)",
      "destination": "/api/functions/api"
    }
  ]
}
```

### Phase 2: Enable HTTPS MCP Transport

Once API endpoints work, enable MCP over HTTPS:

#### 1. **MCP SSE Endpoint Configuration**
```javascript
// api/functions/mcp-sse.js enhancement
app.get('/mcp/sse', authenticateApiKey, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  
  // Initialize MCP connection with user's API key
  const mcpConnection = initializeMCP(req.apiKey);
  
  // Stream MCP messages
  mcpConnection.on('message', (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
});
```

#### 2. **API Key Authentication Integration**
```javascript
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  // Validate against Supabase api_keys table
  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', hashApiKey(apiKey))
    .eq('is_active', true)
    .single();
    
  if (error || !data) {
    return res.status(403).json({ error: 'Invalid API key' });
  }
  
  req.apiKey = data;
  req.userId = data.user_id;
  next();
};
```

### Phase 3: Unified Platform Integration

#### 1. **Dashboard MCP Configuration**
Enable users to configure MCP connections in the dashboard:

```typescript
// Dashboard: MCP Settings Component
interface MCPConfig {
  transport: 'https' | 'websocket' | 'stdio';
  endpoint: string;
  apiKey: string;
  features: string[];
}

const MCPConfigPanel = () => {
  const [config, setConfig] = useState<MCPConfig>({
    transport: 'https',
    endpoint: 'https://developer.lanonasis.com/mcp/sse',
    apiKey: userApiKey,
    features: ['memory', 'orchestration', 'banking', 'analytics']
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Connection Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Transport Protocol</Label>
            <Select value={config.transport} onValueChange={setTransport}>
              <SelectItem value="https">HTTPS (Recommended)</SelectItem>
              <SelectItem value="websocket">WebSocket</SelectItem>
            </Select>
          </div>
          
          <div>
            <Label>MCP Endpoint</Label>
            <Input 
              value={config.endpoint}
              readOnly
              className="font-mono text-sm"
            />
          </div>
          
          <div>
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input value={maskApiKey(config.apiKey)} readOnly />
              <Button onClick={rotateApiKey}>Rotate</Button>
            </div>
          </div>
          
          <div>
            <Label>Available Services</Label>
            <div className="grid grid-cols-2 gap-2">
              {config.features.map(feature => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox checked />
                  <Label>{feature}</Label>
                </div>
              ))}
            </div>
          </div>
          
          <Button onClick={testConnection}>Test Connection</Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

#### 2. **Orchestrator HTTPS Integration**
```javascript
// api/functions/orchestrate.js
app.post('/api/v1/orchestrate', authenticateApiKey, async (req, res) => {
  const { workflow, context, memory_context } = req.body;
  
  try {
    // Initialize orchestrator with user context
    const orchestrator = new WorkflowOrchestrator({
      userId: req.userId,
      apiKey: req.apiKey.key,
      memoryContext: memory_context
    });
    
    // Execute workflow with memory persistence
    const result = await orchestrator.execute({
      workflow,
      context,
      persistMemory: true,
      trackExecution: true
    });
    
    res.json({
      success: true,
      executionId: result.id,
      result: result.output,
      memoryUpdates: result.memoryUpdates,
      nextSuggestions: result.suggestions
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Orchestration failed',
      details: error.message
    });
  }
});
```

### Phase 4: Cross-Platform Access

#### 1. **CLI Integration**
```bash
# Configure CLI with HTTPS MCP
lanonasis config set mcp.transport https
lanonasis config set mcp.endpoint https://developer.lanonasis.com/mcp/sse
lanonasis config set api.key YOUR_API_KEY

# Use orchestrator from CLI
lanonasis orchestrate --workflow "analyze-project" --context "~/my-project"
```

#### 2. **IDE Extension Integration**
```typescript
// VS Code Extension: MCP Client
class HTTPSMCPClient {
  constructor(apiKey: string) {
    this.endpoint = 'https://developer.lanonasis.com/mcp/sse';
    this.apiKey = apiKey;
  }
  
  async connect() {
    const eventSource = new EventSource(
      `${this.endpoint}?api_key=${this.apiKey}`
    );
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMCPMessage(data);
    };
  }
  
  async orchestrate(workflow: string, context: any) {
    return fetch('https://developer.lanonasis.com/api/v1/orchestrate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({ workflow, context })
    });
  }
}
```

## Implementation Priority

### **Phase 1 (Immediate)**: Fix API Routing
1. Debug Vercel function deployment
2. Test `/health` endpoint functionality  
3. Verify `/mcp/sse` accessibility

### **Phase 2 (Next)**: Enable HTTPS MCP
1. Implement API key authentication middleware
2. Connect MCP SSE to authentication system
3. Test HTTPS MCP transport

### **Phase 3 (Final)**: Dashboard Integration
1. Build MCP configuration panel
2. Enable orchestrator access from dashboard
3. Implement memory management UI

This creates your vision: **One API key → Access everything → Focus on productivity while the system handles execution.**