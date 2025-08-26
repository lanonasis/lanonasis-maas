# 🔗 Core Integration Guide
**Date**: August 26, 2025  
**Version**: MAAS v1.2.0 → onasis-core Integration  
**Purpose**: Guide to integrate MAAS authentication and API calls with onasis-core repository  

## 📋 **Overview**

This guide provides the technical details needed to integrate the MAAS (Memory as a Service) system with the onasis-core repository for unified authentication and API routing.

## 🎯 **Integration Objectives**

1. **Route all MAAS authentication through onasis-core**
2. **Use onasis-core's JWT and vendor key validation**  
3. **Maintain MAAS API autonomy while ensuring security**
4. **Enable seamless CLI, MCP, and REST API integration**

## 🔧 **Core Repository Changes Required**

### **1. Authentication Endpoints**

Add these endpoints to onasis-core to support MAAS authentication:

```typescript
// /api/v1/auth/validate-vendor-key
POST /api/v1/auth/validate-vendor-key
{
  "vendorKey": "pk_orgId_publicKey.sk_secretKey"
}

// Response:
{
  "valid": true,
  "organization_id": "orgId", 
  "permissions": ["memory:read", "memory:write", "api:access"],
  "rate_limits": { "requests_per_minute": 1000 }
}
```

```typescript
// /api/v1/auth/validate-jwt  
POST /api/v1/auth/validate-jwt
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}

// Response:
{
  "valid": true,
  "user": {
    "id": "user_123",
    "email": "user@example.com", 
    "organization_id": "org_456",
    "role": "admin",
    "plan": "pro"
  },
  "expires_at": "2025-08-27T03:38:00Z"
}
```

### **2. Service Registration**

Register MAAS as a service in onasis-core:

```typescript
// /config/services.ts
export const REGISTERED_SERVICES = {
  'lanonasis-maas': {
    name: 'Memory as a Service',
    base_url: process.env.MAAS_API_URL || 'https://api.lanonasis.com',
    auth_required: true,
    supported_auth: ['jwt', 'vendor_key'],
    endpoints: {
      health: '/api/v1/health',
      memory: '/api/v1/memory', 
      api_keys: '/api/v1/api-keys',
      mcp: '/api/v1/mcp'
    },
    rate_limits: {
      free: { requests_per_minute: 100 },
      pro: { requests_per_minute: 1000 },
      enterprise: { requests_per_minute: 10000 }
    }
  }
};
```

### **3. Authentication Middleware**

Add middleware to validate MAAS requests:

```typescript
// /middleware/maas-auth.ts
import { Request, Response, NextFunction } from 'express';
import { validateVendorKey, validateJWT } from '../utils/auth';

export async function validateMAASAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for vendor key authentication
    const vendorKey = req.headers['x-vendor-key'] as string;
    if (vendorKey) {
      const validation = await validateVendorKey(vendorKey);
      if (validation.valid) {
        req.user = {
          type: 'vendor_key',
          organization_id: validation.organization_id,
          permissions: validation.permissions
        };
        return next();
      }
    }

    // Check for JWT authentication
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const validation = await validateJWT(token);
      if (validation.valid) {
        req.user = {
          type: 'jwt',
          ...validation.user
        };
        return next();
      }
    }

    // No valid authentication
    res.status(401).json({
      error: 'Authentication required',
      supported_methods: ['vendor_key', 'jwt'],
      service: 'onasis-core'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Authentication system error',
      service: 'onasis-core' 
    });
  }
}
```

### **4. Vendor Key Validation Logic**

```typescript
// /utils/vendor-key-validator.ts
export interface VendorKeyValidation {
  valid: boolean;
  organization_id?: string;
  permissions?: string[];
  rate_limits?: Record<string, number>;
  error?: string;
}

export function parseVendorKey(vendorKey: string): {
  publicKey: string;
  secretKey: string;
  organizationId: string;
} | null {
  // Validate format: pk_orgId_publicKey.sk_secretKey
  const regex = /^pk_([a-zA-Z0-9]+)_([a-zA-Z0-9]+)\.sk_([a-zA-Z0-9]+)$/;
  const match = vendorKey.match(regex);
  
  if (!match) return null;
  
  return {
    organizationId: match[1],
    publicKey: match[2], 
    secretKey: match[3]
  };
}

export async function validateVendorKey(vendorKey: string): Promise<VendorKeyValidation> {
  const parsed = parseVendorKey(vendorKey);
  if (!parsed) {
    return { valid: false, error: 'Invalid vendor key format' };
  }

  // Check against database
  const organization = await db.organizations.findById(parsed.organizationId);
  if (!organization) {
    return { valid: false, error: 'Organization not found' };
  }

  // Validate key cryptographically
  const isValid = await crypto.validateKeyPair(
    parsed.publicKey, 
    parsed.secretKey,
    organization.key_salt
  );

  if (!isValid) {
    return { valid: false, error: 'Invalid key pair' };
  }

  return {
    valid: true,
    organization_id: parsed.organizationId,
    permissions: organization.permissions || ['memory:read', 'memory:write'],
    rate_limits: organization.rate_limits || { requests_per_minute: 1000 }
  };
}
```

## 🔌 **MAAS Integration Points**

### **1. Environment Configuration**

Update MAAS `.env` to point to onasis-core:

```bash
# Authentication Server (onasis-core)
AUTH_SERVER_URL=https://api.lanonasis.com
CORE_API_URL=https://api.lanonasis.com

# Service Discovery
SERVICE_DISCOVERY_URL=https://api.lanonasis.com/.well-known/onasis.json

# OAuth Configuration  
OAUTH_CLIENT_ID=lanonasis_mcp_client_2024
OAUTH_REDIRECT_URI=https://api.lanonasis.com/auth/oauth/callback

# API Configuration
MEMORY_API_URL=https://api.lanonasis.com/api/v1
```

### **2. Authentication Middleware Update**

Update MAAS auth middleware to validate through core:

```typescript
// /src/middleware/auth-aligned.ts (MAAS)
import axios from 'axios';

export async function validateWithCore(authHeader: string, vendorKey?: string) {
  const coreUrl = process.env.CORE_API_URL || 'https://api.lanonasis.com';
  
  try {
    if (vendorKey) {
      // Validate vendor key with core
      const response = await axios.post(`${coreUrl}/api/v1/auth/validate-vendor-key`, {
        vendorKey
      }, {
        headers: { 'X-Service': 'lanonasis-maas' },
        timeout: 5000
      });
      
      return response.data;
    }
    
    if (authHeader?.startsWith('Bearer ')) {
      // Validate JWT with core
      const token = authHeader.substring(7);
      const response = await axios.post(`${coreUrl}/api/v1/auth/validate-jwt`, {
        token
      }, {
        headers: { 'X-Service': 'lanonasis-maas' },
        timeout: 5000
      });
      
      return response.data;
    }
    
    return { valid: false, error: 'No authentication provided' };
  } catch (error) {
    console.error('Core auth validation failed:', error);
    return { valid: false, error: 'Authentication service unavailable' };
  }
}
```

### **3. Service Discovery Integration**

Update onasis-core service discovery to include MAAS:

```typescript
// /.well-known/onasis.json (onasis-core)
{
  "version": "1.0.0",
  "services": {
    "auth": {
      "base": "https://api.lanonasis.com/api/v1/auth",
      "endpoints": ["login", "register", "oauth", "validate-vendor-key", "validate-jwt"]
    },
    "memory": {
      "base": "https://api.lanonasis.com/api/v1/memory", 
      "service": "lanonasis-maas",
      "auth_required": true,
      "endpoints": ["search", "create", "update", "delete"]
    },
    "api_keys": {
      "base": "https://api.lanonasis.com/api/v1/api-keys",
      "service": "lanonasis-maas", 
      "auth_required": true,
      "endpoints": ["create", "list", "rotate", "delete"]
    },
    "mcp": {
      "base": "https://api.lanonasis.com/api/v1/mcp",
      "service": "lanonasis-maas",
      "protocols": ["stdio", "http", "ws", "sse"],
      "auth_required": true
    }
  },
  "capabilities": {
    "auth_methods": ["jwt", "vendor_key", "oauth"],
    "protocols": ["http", "https", "ws", "wss", "sse"],
    "ai_clients": ["claude-desktop", "mcp-client", "api-client"]
  }
}
```

## 🔒 **Security Implementation**

### **1. Request Flow**

```mermaid
graph LR
    A[Client Request] --> B[MAAS API]
    B --> C[Auth Middleware]
    C --> D[onasis-core Validation]
    D --> E[Database Query]
    E --> F[Response to Client]
    
    C -.-> G[Cache Auth Result]
    G -.-> C
```

### **2. Authentication Headers**

All requests to MAAS must include one of:

```bash
# Vendor Key Authentication
X-Vendor-Key: pk_orgId_publicKey.sk_secretKey

# JWT Authentication  
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

# Service-to-Service
X-Service: onasis-core
X-Request-ID: req_123456789
```

### **3. Rate Limiting Integration**

```typescript
// Rate limiting based on core auth response
export function createAuthBasedRateLimit() {
  return rateLimit({
    keyGenerator: (req) => {
      // Use organization_id for vendor keys
      if (req.user?.organization_id) {
        return `org:${req.user.organization_id}`;
      }
      // Fallback to IP
      return req.ip;
    },
    max: (req) => {
      // Use limits from core auth response
      return req.user?.rate_limits?.requests_per_minute || 100;
    },
    windowMs: 60 * 1000 // 1 minute
  });
}
```

## 🚀 **Deployment Steps**

### **1. onasis-core Changes**
```bash
# Add validation endpoints
git checkout -b feature/maas-auth-integration
# Implement authentication endpoints
# Add service registration
# Deploy to staging
```

### **2. MAAS Configuration**
```bash
# Update environment variables
cp .env.production-ready .env
# Update authentication middleware  
# Test integration with core
# Deploy to production
```

### **3. Testing Protocol**
```bash
# Test vendor key validation
curl -X POST https://api.lanonasis.com/api/v1/auth/validate-vendor-key \
  -H "Content-Type: application/json" \
  -d '{"vendorKey": "pk_test_key.sk_test_secret"}'

# Test MAAS authentication  
curl -H "X-Vendor-Key: pk_test_key.sk_test_secret" \
  https://api.lanonasis.com/api/v1/memory/search

# Test service discovery
curl https://api.lanonasis.com/.well-known/onasis.json
```

## 📊 **Monitoring & Metrics**

### **1. Core Metrics to Track**
- Authentication success/failure rates
- Response times for auth validation
- Vendor key validation frequency  
- JWT token validation frequency
- Service-to-service communication health

### **2. Alerting Thresholds**
- Auth failure rate > 5%
- Core response time > 500ms
- Service unavailability > 1 minute

### **3. Logging Requirements**
```typescript
// Log all auth attempts
logger.info('Auth validation request', {
  service: 'maas',
  auth_type: 'vendor_key', 
  organization_id: 'org_123',
  success: true,
  response_time: 45
});
```

## 🔄 **Backwards Compatibility**

### **1. Gradual Migration**
1. **Phase 1**: Add core validation alongside existing auth
2. **Phase 2**: Route all new requests through core  
3. **Phase 3**: Deprecate old authentication methods
4. **Phase 4**: Remove legacy auth code

### **2. Fallback Strategy**
```typescript
// Fallback to local validation if core unavailable
export async function authenticateWithFallback(req: Request) {
  try {
    // Try core validation first
    const coreResult = await validateWithCore(req.headers.authorization);
    if (coreResult.valid) return coreResult;
  } catch (error) {
    logger.warn('Core auth unavailable, using fallback');
  }
  
  // Fallback to local validation
  return await validateLocally(req.headers.authorization);
}
```

## 📝 **Implementation Checklist**

### **onasis-core Repository**
- [ ] Add `/api/v1/auth/validate-vendor-key` endpoint
- [ ] Add `/api/v1/auth/validate-jwt` endpoint  
- [ ] Implement vendor key parsing and validation
- [ ] Add MAAS service registration
- [ ] Update service discovery endpoint
- [ ] Add authentication middleware
- [ ] Implement rate limiting integration
- [ ] Add monitoring and logging
- [ ] Create migration scripts
- [ ] Update documentation

### **MAAS Repository**  
- [ ] Update environment configuration
- [ ] Modify authentication middleware
- [ ] Add core integration client
- [ ] Implement fallback strategy
- [ ] Update error handling
- [ ] Add integration tests
- [ ] Update CLI configuration
- [ ] Update MCP server configuration
- [ ] Verify IDE extension compatibility
- [ ] Deploy and monitor

## 🎯 **Success Criteria**

✅ **All MAAS authentication routes through onasis-core**  
✅ **Vendor key and JWT validation work seamlessly**  
✅ **CLI, MCP server, and REST API all use same auth**  
✅ **Service discovery provides dynamic configuration**  
✅ **AI clients receive proper JSON responses**  
✅ **Performance impact < 50ms additional latency**  
✅ **99.9% authentication success rate maintained**  

---

**Next Steps**: Implement core authentication endpoints and update MAAS configuration for seamless integration.