# Deployment Coexistence Strategy

## Overview

This repository supports **dual deployment** strategy allowing both Netlify and Vercel to run simultaneously without conflicts.

## Domain Architecture

### Netlify Deployment
- **api.LanOnasis.com** - API endpoints and functions
- **dashboard.LanOnasis.com** - Dashboard SPA 
- **docs.LanOnasis.com** - Documentation site

### Vercel Deployment  
- **developer.LanOnasis.com** - Single domain with path-based routing
  - `/` - Landing page
  - `/dashboard` - Dashboard SPA
  - `/api/v1/*` - API endpoints
  - `/docs/*` - Documentation
  - `/mcp/sse` - MCP SSE endpoint

## Why This Works

### 1. **No DNS Conflicts**
- Different subdomains prevent routing conflicts
- Each platform handles its own domain(s)
- No overlapping endpoints

### 2. **Separate Build Processes**
- Netlify uses `netlify.toml` configuration
- Vercel uses `vercel.json` configuration
- Both reference same source files but deploy independently

### 3. **Environment Isolation**
- Each platform has its own environment variables
- API keys and secrets managed separately
- No cross-platform dependencies

### 4. **Function Compatibility**
- Netlify functions in `netlify/functions/`
- Vercel functions in `api/functions/`
- Same source files, different runtime adaptations

## Configuration Files

### Netlify Configuration (`netlify.toml`)
```toml
[build]
  command = "bun install && bun run build && cd dashboard && bun install && bun run build"
  publish = "dashboard/dist"
  functions = "netlify/functions"

# Multi-domain redirects for subdomain routing
[[redirects]]
  from = "/api/v1/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

### Vercel Configuration (`vercel.json`)
```json
{
  "name": "LanOnasis-developer",
  "builds": [
    {
      "src": "dashboard/package.json",
      "use": "@vercel/static-build"
    },
    {
      "src": "api/functions/api.js",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/v1/(.*)",
      "destination": "/api/functions/api"
    }
  ]
}
```

## Deployment Commands

### Deploy to Netlify
```bash
# Using Netlify CLI
netlify deploy --prod

# Or connect GitHub repository to Netlify dashboard
```

### Deploy to Vercel
```bash
# Using Vercel CLI
vercel --prod

# Or connect GitHub repository to Vercel dashboard
```

## Testing Both Deployments

### Netlify Endpoints
```bash
curl https://api.LanOnasis.com/health
curl https://dashboard.LanOnasis.com
curl https://docs.LanOnasis.com
```

### Vercel Endpoints  
```bash
curl https://developer.LanOnasis.com/health
curl https://developer.LanOnasis.com/dashboard
curl https://developer.LanOnasis.com/docs
```

## Environment Variables

Both platforms need the same environment variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=your_openai_key
NODE_ENV=production
```

## Benefits of Dual Deployment

### 1. **High Availability**
- Failover between platforms if one has issues
- Load distribution across different CDNs

### 2. **A/B Testing**
- Test new features on one platform first
- Compare performance between deployments

### 3. **Development Flexibility**
- Use Netlify for production-stable features
- Use Vercel for experimental/developer features

### 4. **Cost Optimization**
- Leverage different pricing models
- Optimize based on usage patterns

## CI/CD Considerations

### GitHub Actions Example
```yaml
name: Dual Deployment
on:
  push:
    branches: [main]

jobs:
  deploy-netlify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Netlify
        run: netlify deploy --prod

  deploy-vercel:
    runs-on: ubuntu-latest  
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod
```

## Maintenance

### Keeping Deployments in Sync
1. **Source Control** - Single repository for both
2. **Environment Parity** - Same variables on both platforms
3. **Testing** - Verify both deployments after changes
4. **Monitoring** - Health checks for both endpoints

This strategy provides maximum flexibility while maintaining deployment reliability and avoiding conflicts.