# 🗄️ Database Setup Guide - LanOnasis Memory Service

Complete setup guide for the Supabase database schema and configuration.

## 📋 **Prerequisites**

1. **Supabase Project**: `mxtsdgkwzjzlttpotole` (existing)
2. **Extensions Required**: `uuid-ossp`, `vector` (pgvector)
3. **Domain Whitelisting**: Configure allowed origins in Supabase

## 🚀 **Step 1: Apply Database Schema**

### **Method 1: Using Supabase CLI (Recommended)**
```bash
# Navigate to project directory
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/LanOnasis-maas

# Apply migrations
supabase db push

# Or apply specific migration
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.mxtsdgkwzjzlttpotole.supabase.co:5432/postgres"
```

### **Method 2: Manual SQL Execution**
1. **Open Supabase Dashboard**: https://supabase.com/dashboard/project/mxtsdgkwzjzlttpotole
2. **Go to SQL Editor**
3. **Execute schema files in order**:
   ```sql
   -- 1. Execute: setup-memory-schema.sql
   -- 2. Execute: src/db/schema.sql  
   -- 3. Execute: src/db/schema-api-keys.sql
   -- 4. Execute: supabase/migrations/*.sql
   ```

## 🛡️ **Step 2: Configure Domain Whitelisting**

### **Supabase Dashboard Configuration**
1. **Navigate to**: Settings → API → CORS
2. **Add allowed origins**:
   ```
   Development:
   http://localhost:3000
   http://localhost:5173
   http://127.0.0.1:3000
   
   Production:
   https://api.LanOnasis.com
   https://dashboard.LanOnasis.com
   https://mcp.LanOnasis.com
   https://docs.LanOnasis.com
   https://api.vortexai.io
   https://gateway.apiendpoint.net
   https://onasis.io
   https://connectionpoint.tech
   https://vortexcore.app
   ```

### **Environment Configuration**
Update `.env` file with correct credentials:
```env
# Supabase Configuration
SUPABASE_URL=https://mxtsdgkwzjzlttpotole.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Unified Router Configuration
USE_UNIFIED_ROUTER=false  # true for production
UNIFIED_ROUTER_URL=https://api.vortexai.io

# Memory Service Configuration
MEMORY_API_URL=http://localhost:3000
```

## 🔗 **Step 3: Test Database Connection**

### **Connection Test**
```bash
# Test direct Supabase connection
curl -H "apikey: [SUPABASE_ANON_KEY]" \
     -H "Authorization: Bearer [SUPABASE_ANON_KEY]" \
     "https://mxtsdgkwzjzlttpotole.supabase.co/rest/v1/organizations"

# Test via unified router (production)
curl -H "X-Service: LanOnasis-maas" \
     -H "Content-Type: application/json" \
     "https://api.vortexai.io/health"
```

### **Health Check**
```bash
# Test memory service health
npm run dev  # Start development server
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "services": ["memory", "auth", "metrics"]
}
```

## 🧠 **Step 4: Test Orchestrator Routing**

### **Auto-Routing Configuration**
The orchestrator automatically routes based on environment:

**Development** → Direct Supabase connection
**Production** → VPS Unified Router → Supabase (privacy-protected)

### **Test Natural Language Commands**
```bash
# Run orchestrator test
npm run test:orchestrator

# Or manual test:
npx tsx test-orchestrator.ts
```

## 📊 **Database Schema Overview**

### **Core Tables Created**:
- **`organizations`** - Multi-tenant isolation
- **`users`** - Authentication and roles
- **`memory_entries`** - Main memory storage with vector embeddings
- **`topics`** - Memory organization
- **`api_keys`** - Programmatic access
- **`usage_analytics`** - Usage tracking (partitioned)

### **Key Functions**:
- **`match_memories()`** - Vector similarity search
- **`update_memory_access()`** - Access tracking
- **`create_memory_version()`** - Audit versioning

### **Required Extensions**:
- **`uuid-ossp`** - UUID generation
- **`vector`** - pgvector for semantic search

## 🚨 **Troubleshooting**

### **Common Issues**:

1. **"Invalid API key"**
   - Check Supabase key expiration
   - Verify domain whitelisting
   - Confirm CORS configuration

2. **"Extension does not exist: vector"**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **CORS errors**
   - Add localhost to allowed origins
   - Check port numbers (3000, 5173)
   - Verify production domains

4. **Connection refused**
   - Check Supabase URL format
   - Verify service role permissions
   - Test network connectivity

### **Verification Checklist**:
- [ ] Database schema applied successfully
- [ ] Vector extension enabled
- [ ] CORS origins configured
- [ ] API keys valid and not expired
- [ ] Environment variables set correctly
- [ ] Health endpoint returns 200 OK
- [ ] Orchestrator can parse commands
- [ ] Memory operations work via API

## 🌐 **Production Deployment**

### **Unified Router Setup**:
1. **Deploy VPS unified router** (already deployed)
2. **Set environment variables**:
   ```env
   USE_UNIFIED_ROUTER=true
   UNIFIED_ROUTER_URL=https://api.vortexai.io
   ```
3. **Configure domain DNS** to point to VPS
4. **Test end-to-end routing**

### **Domain Configuration**:
- **Primary**: api.LanOnasis.com → Memory Service API
- **Dashboard**: dashboard.LanOnasis.com → React Dashboard  
- **Docs**: docs.LanOnasis.com → API Documentation
- **MCP**: mcp.LanOnasis.com → External MCP connections

## ✅ **Success Indicators**

When properly configured, you should see:
- ✅ Health endpoint responds with database: "connected"
- ✅ Orchestrator parses commands with 80-95% confidence
- ✅ Memory operations work through both direct and unified routing
- ✅ CORS allows requests from all configured domains
- ✅ No console errors about blocked origins

Your Memory as a Service platform is now ready for production! 🚀