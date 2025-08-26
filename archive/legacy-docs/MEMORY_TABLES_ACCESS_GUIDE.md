# 🗄️ Memory Tables - Direct Access Guide

Complete guide to accessing memory tables directly via REST API and MCP.

## 📍 **Memory Tables Location**

### **Supabase Project Details:**
- **Project Reference**: `mxtsdgkwzjzlttpotole`
- **Project Name**: `the-fixer-initiative` 
- **Database URL**: `https://mxtsdgkwzjzlttpotole.supabase.co`
- **Region**: West EU (London)
- **Database Version**: PostgreSQL 15

### **Memory System Tables:**

| **Table Name** | **Purpose** | **Columns** |
|----------------|-------------|-------------|
| **`agent_banks_memories`** | Main memory storage | `id`, `title`, `content`, `memory_type`, `tags`, `metadata`, `project_ref`, `relevance_score`, `source_url`, `status`, `summary`, `access_count`, `created_at`, `updated_at` |
| **`agent_banks_memory_search_logs`** | Search analytics & logs | Search queries, results, performance tracking |
| **`agent_banks_sessions`** | Memory sessions management | `id`, `session_name`, `description`, `session_type`, `metadata`, `memory_count`, `status`, `started_at`, `last_activity`, `completed_at` |

## 🔗 **Direct REST API Access**

### **Base URL**: 
```
https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/
```

### **Authentication Headers Required:**
```http
apikey: your_supabase_anon_key_here
Authorization: Bearer your_supabase_anon_key_here
Content-Type: application/json
```

## 📊 **Memory Operations - REST API**

### **1. List All Memories**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories"
```

### **2. Get Specific Memory**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?id=eq.[MEMORY_ID]"
```

### **3. Create New Memory**
```bash
curl -X POST \
     -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "API Documentation",
       "content": "How to use the Memory API...",
       "memory_type": "reference",
       "tags": ["api", "documentation"],
       "metadata": {"source": "manual"}
     }' \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories"
```

### **4. Search Memories by Content**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?content=ilike.*API*"
```

### **5. Filter by Memory Type**
```bash
curl -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?memory_type=eq.reference"
```

### **6. Update Memory**
```bash
curl -X PATCH \
     -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     -H "Content-Type: application/json" \
     -d '{"title": "Updated Title"}' \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?id=eq.[MEMORY_ID]"
```

### **7. Delete Memory**
```bash
curl -X DELETE \
     -H "apikey: [ANON_KEY]" \
     -H "Authorization: Bearer [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?id=eq.[MEMORY_ID]"
```

## 🔄 **MCP (Model Context Protocol) Access**

### **Option 1: Through Lanonasis Memory Service API**
```
Endpoint: http://localhost:3000/api/v1/memory
MCP SSE: http://localhost:3000/sse
```

### **Option 2: Through Unified VPS Router** 
```
Endpoint: https://api.vortexai.io/api/memory
MCP Handler: https://api.vortexai.io/api/mcp-handler
```

### **MCP Connection Configuration:**
```json
{
  "mcpServers": {
    "lanonasis-memory": {
      "command": "npx",
      "args": ["@lanonasis/cli", "mcp", "start"],
      "env": {
        "MEMORY_API_URL": "http://localhost:3000",
        "SUPABASE_URL": "https://mxtsdgkwzjzlttpotole.supabase.co"
      }
    }
  }
}
```

## 🧠 **Memory Sessions Access**

### **List Active Sessions**
```bash
curl -H "apikey: [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_sessions?status=eq.active"
```

### **Create New Session**
```bash
curl -X POST \
     -H "apikey: [ANON_KEY]" \
     -H "Content-Type: application/json" \
     -d '{
       "session_name": "API Learning Session",
       "description": "Learning about API integrations",
       "session_type": "learning",
       "metadata": {"focus": "memory_api"}
     }' \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_sessions"
```

## 📈 **Memory Search Logs**

### **View Search Analytics**
```bash
curl -H "apikey: [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memory_search_logs?limit=10&order=created_at.desc"
```

## 🔍 **Advanced Querying**

### **PostgREST Query Features:**
- **Filters**: `?column=eq.value`, `?column=like.*pattern*`
- **Ordering**: `?order=column.asc` or `?order=column.desc`
- **Limiting**: `?limit=10&offset=20`
- **Selecting**: `?select=title,content,created_at`
- **Counting**: `?select=count`

### **Complex Query Example:**
```bash
curl -H "apikey: [ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?memory_type=in.(reference,documentation)&tags=cs.{api,memory}&order=created_at.desc&limit=5&select=title,content,memory_type,tags"
```

## 🚀 **Production Endpoints**

### **Direct Supabase Access:**
- **REST API**: `https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories`
- **GraphQL**: `https://mxtsdgkwzjzlttpotole.supabase.co/graphql/v1`
- **Realtime**: `wss://mxtsdgkwzjzlttpotole.supabase.co/realtime/v1/websocket`

### **Through Lanonasis API (when deployed):**
- **Memory API**: `https://api.lanonasis.com/api/v1/memory`
- **MCP SSE**: `https://mcp.lanonasis.com/sse`
- **Dashboard**: `https://dashboard.lanonasis.com`

### **Through VPS Unified Router:**
- **Privacy-Protected**: `https://api.vortexai.io/api/memory`
- **MCP Handler**: `https://api.vortexai.io/api/mcp-handler`

## 📚 **Documentation Links**

- **Supabase Dashboard**: https://supabase.com/dashboard/project/mxtsdgkwzjzlttpotole
- **PostgREST API Docs**: https://postgrest.org/en/stable/api.html
- **Memory Service Docs**: `http://localhost:3000/docs` (when running)

## 🔐 **Security Notes**

- **Never commit** the actual API keys above to git
- **Use environment variables** for all production access
- **Rate limiting** applies to direct Supabase calls
- **RLS policies** may restrict access based on user context

## 🎯 **Quick Test**

```bash
# Test connection and list first memory
curl -s -H "apikey: your_supabase_anon_key_here" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/agent_banks_memories?limit=1"
```

**Your memory system is fully accessible via REST API, GraphQL, and MCP!** 🚀