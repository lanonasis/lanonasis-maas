# Vercel Deployment Guide - Lanonasis MaaS

This guide covers deploying the entire Lanonasis Memory as a Service platform to Vercel with multi-domain support.

## Architecture Overview

The deployment serves multiple domains from a single Vercel project:

- **api.lanonasis.com** - API endpoints and serverless functions
- **dashboard.lanonasis.com** - React dashboard SPA
- **docs.lanonasis.com** - Documentation static site
- **mcp.lanonasis.com/sse** - MCP SSE endpoint (no separate interface, just endpoint)

## Deployment Configuration

### 1. Repository Setup

The `vercel.json` configuration handles:

```json
{
  "builds": [
    "dashboard/package.json" → React SPA build
    "docs/package.json" → Static documentation
    "api/functions/*.js" → Serverless functions
  ],
  "routes": [
    "/api/v1/*" → API functions
    "/mcp/sse" → MCP SSE endpoint
    "/health" → Health check
  ],
  "rewrites": [
    "dashboard.lanonasis.com/*" → "/dashboard/*"
    "docs.lanonasis.com/*" → "/docs/*"
  ]
}
```

### 2. Domain Routing

#### API Domain (api.lanonasis.com)
- All `/api/v1/*` routes → `api/functions/api.js`
- `/mcp/sse` → `api/functions/mcp-sse.js` 
- `/sse` → `api/functions/mcp-sse.js`
- `/health` → `api/functions/api.js`
- `/metrics` → `api/functions/api.js`
- `/api/v1/orchestrate` → `api/functions/orchestrate.js`

#### Dashboard Domain (dashboard.lanonasis.com)
- All routes → `dashboard/dist/index.html` (SPA routing)
- OAuth callback: `https://dashboard.lanonasis.com/auth/callback`
- Dashboard access: `https://dashboard.lanonasis.com/dashboard`

#### Docs Domain (docs.lanonasis.com)  
- All routes → `docs/dist/index.html` (Static site)

#### MCP SSE Endpoint
- **mcp.lanonasis.com/sse** - This is NOT a separate interface
- It's just an endpoint that returns SSE connection data
- Used by MCP clients for real-time communication
- No UI - pure API endpoint

## Step-by-Step Deployment

### 1. Prepare Repository

```bash
# Ensure all builds work locally
cd dashboard && bun install && bun run build
cd ../docs && npm install && npm run build

# Verify API functions exist
ls -la api/functions/
# Should show: api.js, mcp-sse.js, orchestrate.js
```

### 2. Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key

# OpenAI (for embeddings)
OPENAI_API_KEY=your_openai_key

# Production URLs
MEMORY_API_URL=https://api.lanonasis.com/api/v1
LANONASIS_API_URL=https://api.lanonasis.com

# Node Configuration
NODE_ENV=production
NODE_VERSION=18
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

#### Option B: GitHub Integration
1. Connect repository to Vercel
2. Import project
3. Configure build settings (auto-detected from vercel.json)
4. Deploy

### 4. Domain Configuration

In Vercel Dashboard → Project Settings → Domains:

1. Add domains:
   - `api.lanonasis.com`
   - `dashboard.lanonasis.com` 
   - `docs.lanonasis.com`

2. Configure DNS records:
   ```
   CNAME api.lanonasis.com → cname.vercel-dns.com
   CNAME dashboard.lanonasis.com → cname.vercel-dns.com
   CNAME docs.lanonasis.com → cname.vercel-dns.com
   ```

### 5. OAuth Configuration

Update Supabase Auth settings:

```sql
-- In Supabase Dashboard → Authentication → URL Configuration
Site URL: https://dashboard.lanonasis.com
Redirect URLs: https://dashboard.lanonasis.com/auth/callback
```

## Testing Deployment

### 1. API Endpoints
```bash
# Health check
curl https://api.lanonasis.com/health

# API endpoints  
curl https://api.lanonasis.com/api/v1/health

# MCP SSE endpoint
curl https://api.lanonasis.com/mcp/sse
```

### 2. Dashboard
- Visit: https://dashboard.lanonasis.com
- Test login flow
- Verify OAuth callback works

### 3. Documentation
- Visit: https://docs.lanonasis.com
- Ensure all pages load correctly

### 4. MCP Integration
```bash
# Test MCP server connection
curl -H "X-API-Key: your_api_key" https://api.lanonasis.com/mcp/sse
```

## CLI Configuration Update

Update CLI to use new endpoints:

```typescript
// cli/src/utils/config.ts
getApiUrl(): string {
  return process.env.MEMORY_API_URL || 
         this.config.apiUrl || 
         'https://api.lanonasis.com/api/v1';  // ✅ Updated
}

getMCPServerUrl(): string {
  return this.config.mcpServerUrl || 'https://api.lanonasis.com';  // ✅ Updated
}
```

## MCP Server Configuration

```typescript
// cli/src/mcp-server.ts
const apiUrl = process.env.LANONASIS_API_URL || 'https://api.lanonasis.com';  // ✅ Updated
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs in Vercel Dashboard
   # Ensure all dependencies are in package.json
   ```

2. **Function Timeouts**
   ```json
   // Increase timeout in vercel.json
   "functions": {
     "api/functions/api.js": { "maxDuration": 30 }
   }
   ```

3. **CORS Errors**
   ```javascript
   // Ensure CORS headers in functions
   headers: {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
   }
   ```

4. **Environment Variables**
   ```bash
   # Verify in Vercel Dashboard
   # Check function logs for missing variables
   ```

## Performance Optimization

### 1. Function Configuration
- Set appropriate `maxDuration` for each function
- Use `regions: ["iad1"]` for optimal performance
- Enable function analytics

### 2. Static Assets
- Dashboard and docs are automatically optimized
- Images are compressed and served via CDN
- Gzip compression enabled

### 3. Caching
- API responses: `cache-control: no-cache` for dynamic content
- Static assets: Automatic CDN caching
- Function results: 60s cache for health checks

## Security

### 1. Headers
- Security headers automatically applied
- CORS properly configured
- Rate limiting via Vercel's built-in protection

### 2. Environment Variables
- All secrets stored in Vercel environment
- No sensitive data in code
- Proper JWT validation

### 3. API Security
- API key authentication required
- Supabase RLS policies active
- Input validation in all functions

## Monitoring

### 1. Vercel Analytics
- Function performance metrics
- Error tracking and logging
- Real-time monitoring dashboard

### 2. Custom Monitoring
```javascript
// Add to functions for custom metrics
console.log('Function execution time:', Date.now() - startTime);
```

### 3. Health Checks
- `/health` endpoint monitors system status
- Automatic alerting via Vercel integrations

## Cost Optimization

### 1. Function Usage
- Optimize function execution time
- Use appropriate timeout values
- Monitor bandwidth usage

### 2. Build Optimization
- Efficient build processes
- Minimal dependencies
- Tree shaking enabled

This deployment setup provides a robust, scalable foundation for the Lanonasis MaaS platform with proper domain separation and optimal performance.