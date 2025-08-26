# 🚀 Lanonasis Memory Service - Production Deployment Guide

Complete end-to-end production deployment for the **Lanonasis Memory as a Service (MaaS)** platform with full custom domain configuration.

## 🎯 **Complete Production Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                 Lanonasis Memory Service Suite              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  api.lanonasis.com          │  dashboard.lanonasis.com      │
│  ├── /api/v1/*             │  ├── / (Dashboard Home)       │
│  ├── /sse                  │  ├── /login                   │
│  ├── /docs (Swagger)       │  ├── /dashboard               │
│  └── /metrics              │  └── /settings                │
│                             │                               │
│  docs.lanonasis.com         │  mcp.lanonasis.com           │
│  ├── / (Documentation)     │  ├── /sse (MCP Remote)       │
│  ├── /guides               │  └── /health                  │
│  └── /api-reference        │                               │
└─────────────────────────────────────────────────────────────┘
```

## 🌐 **Custom Domain Configuration**

### **Required Custom Domains & Netlify Site Mapping**

| **Domain** | **Purpose** | **Netlify Site** | **Site ID** | **Content** |
|------------|-------------|------------------|-------------|-------------|
| **api.lanonasis.com** | Backend API & SSE Services | onasis-gateway | d8903f18-f595-4c5d-8f16-a88f0bf20b76 | Express backend, Memory API, SSE endpoint |
| **dashboard.lanonasis.com** | SaaS Dashboard Frontend | onasis-maas | 3292422f-eabd-4860-a849-9795cfb40d43 | React dashboard, API key management |
| **docs.lanonasis.com** | Documentation Site | lanonasis-docs | 9bd27611-dcb7-4d8c-a9b9-30f7164024d5 | VitePress docs, guides, API reference |
| **mcp.lanonasis.com** | MCP Remote Connection | lanonasis-mcp | cce8abf3-c454-4ae9-b6e7-299ce339c862 | MCP SSE endpoint for external clients |

### **🔧 Manual Configuration Steps**

For each domain, follow these steps in the Netlify Dashboard:

#### **1. Add Custom Domain**
- Navigate to: **Site Settings → Domain Management**
- Click **Add custom domain**
- Enter the domain name (e.g., `dashboard.lanonasis.com`)
- Click **Verify**

#### **2. DNS Configuration**
Add the following DNS records in your domain registrar:

```dns
Type: CNAME
Name: dashboard
Value: onasis-maas.netlify.app
TTL: 3600

Type: CNAME
Name: docs
Value: lanonasis-docs.netlify.app
TTL: 3600

Type: CNAME
Name: mcp
Value: lanonasis-mcp.netlify.app
TTL: 3600

# api.lanonasis.com already configured via onasis-gateway
```

#### **3. SSL Certificate**
- Netlify will auto-provision **Let's Encrypt** certificates
- Verify HTTPS is working for all domains
- Force HTTPS redirect in site settings

## 📦 **Deployment Content & Build Commands**

### **api.lanonasis.com (Backend)**
- **Content**: Express.js backend with Memory Service API
- **Build**: Already deployed via onasis-gateway
- **Endpoints**:
  - `/api/v1/*` - Memory Service REST API
  - `/sse` - Server-Sent Events for real-time updates
  - `/docs` - Swagger API documentation
  - `/metrics` - Prometheus metrics

### **dashboard.lanonasis.com (Frontend)**
- **Content**: React SaaS dashboard from `/dashboard/dist`
- **Build Command**: `cd dashboard && npm install && npm run build`
- **Publish Directory**: `dashboard/dist`
- **Features**:
  - Self-service API key management
  - Memory CRUD operations
  - Usage analytics and insights
  - Professional Lanonasis branding

### **docs.lanonasis.com (Documentation)**
- **Content**: VitePress documentation from `/docs/.vitepress/dist`
- **Build Command**: `cd docs && npm install && npm run build`
- **Publish Directory**: `docs/.vitepress/dist`
- **Sections**:
  - Getting Started guides
  - API reference
  - CLI documentation
  - MCP integration guides

### **mcp.lanonasis.com (MCP Remote)**
- **Content**: MCP connection endpoint and documentation
- **Build**: Static site with proxy configuration
- **Purpose**: External MCP client connections (Claude Desktop, etc.)

## 🚀 **Current Deployment Status**

### **✅ Completed**
- [x] All 4 Netlify sites created and configured
- [x] Dashboard built and production-ready
- [x] Backend API with all endpoints implemented
- [x] MCP remote SSE endpoint implemented
- [x] Complete documentation prepared
- [x] Environment variables configured
- [x] Security headers and CORS configured

### **📋 Manual Steps Required**
- [ ] Configure custom domains in Netlify Dashboard
- [ ] Update DNS records with domain registrar
- [ ] Verify SSL certificates are active
- [ ] Test all endpoints and functionality
- [ ] Deploy documentation site (fix VitePress build)

## 🔐 **Environment Variables**

### **Production Environment (.env.production)**
```env
# Supabase Configuration
SUPABASE_URL=https://mxtsdgkwzjzlttpotole.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Authentication
JWT_SECRET=your-production-jwt-secret-key

# External APIs
OPENAI_API_KEY=your-openai-api-key

# Environment
NODE_ENV=production
PORT=3000
```

### **Client-Safe Environment (.env.production.secure)**
```env
# Public URLs (safe for frontend)
VITE_API_URL=https://api.lanonasis.com
VITE_DASHBOARD_URL=https://dashboard.lanonasis.com
VITE_DOCS_URL=https://docs.lanonasis.com
VITE_MCP_URL=https://mcp.lanonasis.com

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_MCP=true
VITE_ENABLE_REAL_TIME=true
```

## 🛠️ **Build & Deploy Commands**

### **Dashboard Deployment**
```bash
# Build dashboard
cd dashboard
npm install
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist --site=onasis-maas
```

### **Documentation Deployment**
```bash
# Build documentation
cd docs
npm install
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=.vitepress/dist --site=lanonasis-docs
```

### **Backend Deployment**
```bash
# Backend is deployed via onasis-gateway
# Ensure environment variables are configured
# Verify all endpoints are responding
```

## 🔍 **Testing & Verification**

### **Endpoint Testing**
After deployment, verify all endpoints:

```bash
# API Health Check
curl https://api.lanonasis.com/health

# Dashboard Access
curl -I https://dashboard.lanonasis.com

# Documentation Access
curl -I https://docs.lanonasis.com

# MCP SSE Connection
curl https://mcp.lanonasis.com/sse
```

### **Functionality Testing**
1. **Dashboard**: Login, API key management, memory operations
2. **API**: CRUD operations, authentication, rate limiting
3. **SSE**: Real-time updates and notifications
4. **MCP**: External client connections (Claude Desktop)
5. **Documentation**: All guides and references accessible

## 📊 **Monitoring & Analytics**

### **Available Metrics**
- **API Usage**: Request counts, response times, error rates
- **User Activity**: Dashboard usage, API key usage
- **System Health**: Uptime, performance, resource usage
- **Security**: Authentication attempts, rate limiting

### **Monitoring Endpoints**
- `https://api.lanonasis.com/metrics` - Prometheus metrics
- `https://api.lanonasis.com/health` - Health check
- Netlify Analytics for frontend performance

## 🎯 **Production Features**

### **Enterprise-Grade Capabilities**
- ✅ **Self-Service SaaS Dashboard**
- ✅ **API Key Management & Authentication**
- ✅ **Real-Time Updates via SSE**
- ✅ **External MCP Integration**
- ✅ **Comprehensive Documentation**
- ✅ **Professional Branding**
- ✅ **Security Headers & CORS**
- ✅ **Rate Limiting & Usage Tracking**
- ✅ **Audit Logging**
- ✅ **SSL/TLS Encryption**

## 🚀 **Go Live Checklist**

- [ ] Configure all 4 custom domains in Netlify
- [ ] Update DNS records with domain registrar
- [ ] Verify SSL certificates are active
- [ ] Deploy dashboard to dashboard.lanonasis.com
- [ ] Deploy documentation to docs.lanonasis.com
- [ ] Configure MCP endpoint at mcp.lanonasis.com
- [ ] Test all endpoints and functionality
- [ ] Verify external MCP connections work
- [ ] Monitor logs and metrics
- [ ] Update any hardcoded URLs in code
- [ ] Announce launch to users

---

## 🎉 **Final Result**

Once deployed, you'll have a complete **Memory as a Service (MaaS)** platform:

- **🌐 dashboard.lanonasis.com**: Professional SaaS dashboard
- **🔧 api.lanonasis.com**: Robust Memory Service API
- **📚 docs.lanonasis.com**: Comprehensive documentation
- **🔗 mcp.lanonasis.com**: External tool integration

**Your enterprise-grade Memory Service platform is ready for production!**
│  🌐 api.lanonasis.com                                       │
│  ├── /              → Dashboard (React SPA)                 │
│  ├── /api/v1/       → Memory Service API                    │
│  ├── /docs          → Swagger API Documentation             │
│  ├── /sse           → Server-Sent Events                    │
│  └── /metrics       → Prometheus Metrics                    │
│                                                             │
│  📚 docs.lanonasis.com                                      │
│  └── /              → VitePress Documentation Site          │
└─────────────────────────────────────────────────────────────┘
```

## ⚡ **Quick Production Deployment**

### 1. **Configure Production Environment**

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Required Configuration:**
- ✅ **Supabase**: Production database credentials
- ✅ **JWT Secret**: 256-bit production secret key
- ✅ **OpenAI API**: Production API key for embeddings
- ✅ **Domains**: SSL certificates for api.lanonasis.com & docs.lanonasis.com

### 2. **Deploy to Production**

```bash
# Run complete deployment
./deploy.sh
```

This single command:
- ✅ Validates environment configuration
- ✅ Builds Memory Service API + Dashboard
- ✅ Builds documentation site
- ✅ Deploys with SSL/TLS (Let's Encrypt)
- ✅ Configures reverse proxy (Traefik)
- ✅ Sets up Redis caching
- ✅ Runs health checks

### 3. **Verify Deployment**

After deployment, verify all services:

```bash
# Check service status
docker-compose -f deploy/production.yml ps

# View logs
docker-compose -f deploy/production.yml logs -f

# Test endpoints
curl https://api.lanonasis.com/health
curl https://docs.lanonasis.com/health
```

## 🔧 **Production Services**

### **Memory Service API** (`api.lanonasis.com`)
- **Dashboard**: Self-service API key management
- **REST API**: Complete memory CRUD operations
- **Authentication**: JWT + API key security
- **Real-time**: Server-sent events at `/sse`
- **Documentation**: Swagger UI at `/docs`
- **Monitoring**: Prometheus metrics at `/metrics`

### **Documentation Site** (`docs.lanonasis.com`)
- **VitePress**: Static documentation site
- **Guides**: Getting started, API reference, CLI docs
- **Examples**: Code samples and tutorials
- **Search**: Built-in documentation search

### **Infrastructure**
- **Reverse Proxy**: Traefik with automatic SSL
- **Caching**: Redis for performance
- **Monitoring**: Health checks and metrics
- **Security**: Rate limiting, CORS, security headers

## 🛠️ **Management Commands**

```bash
# View service status
docker-compose -f deploy/production.yml ps

# View logs (all services)
docker-compose -f deploy/production.yml logs -f

# View specific service logs
docker-compose -f deploy/production.yml logs -f lanonasis-api
docker-compose -f deploy/production.yml logs -f docs-site

# Restart services
docker-compose -f deploy/production.yml restart

# Stop services
docker-compose -f deploy/production.yml down

# Update and redeploy
git pull
./deploy.sh
```

## 📊 **Monitoring & Health**

### **Health Endpoints**
- API Health: `https://api.lanonasis.com/health`
- Docs Health: `https://docs.lanonasis.com/health`
- Metrics: `https://api.lanonasis.com/metrics`

### **Service Monitoring**
- **Traefik Dashboard**: `http://your-server:8080`
- **Application Logs**: `docker-compose logs -f`
- **System Metrics**: Prometheus metrics endpoint

## 🔐 **Security Features**

- ✅ **SSL/TLS**: Automatic Let's Encrypt certificates
- ✅ **Authentication**: JWT + API key validation
- ✅ **Rate Limiting**: Configurable request limits
- ✅ **CORS**: Restricted cross-origin requests
- ✅ **Security Headers**: XSS, CSRF, clickjacking protection
- ✅ **Audit Logging**: Comprehensive request logging

## 🚀 **Production Endpoints**

Once deployed, your complete Memory Service will be available at:

| Service | URL | Description |
|---------|-----|-------------|
| **Dashboard** | `https://api.lanonasis.com/dashboard` | Self-service portal |
| **API** | `https://api.lanonasis.com/api/v1` | REST API |
| **SSE** | `https://api.lanonasis.com/sse` | Real-time updates |
| **API Docs** | `https://api.lanonasis.com/docs` | Swagger UI |
| **Documentation** | `https://docs.lanonasis.com` | Complete docs |
| **Metrics** | `https://api.lanonasis.com/metrics` | Prometheus |

## 🎉 **You're Ready!**

Your complete **Lanonasis Memory Service** is now production-ready with:

- 🧠 **Memory Management**: Full CRUD with semantic search
- 🔐 **Enterprise Security**: JWT + API keys + audit logging  
- ⚡ **Real-time Updates**: Server-sent events
- 📊 **Analytics**: Usage metrics and insights
- 🛠️ **Developer Tools**: CLI, SDKs, comprehensive docs
- 🚀 **Production Infrastructure**: SSL, caching, monitoring

**Start building with Memory as a Service today!**
