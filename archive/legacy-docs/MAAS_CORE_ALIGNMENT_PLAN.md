# 🏗️ MaaS Core Alignment Implementation Plan
## Systematic Production Readiness Strategy

**Generated**: 2025-08-25  
**Based On**: maas-core-alignment-issues.csv  
**Scope**: Production deployment readiness for LanOnasis-maas  
**Timeline**: Aug 25 - Sep 12 (3 weeks)

---

## 🎯 Executive Summary

Analysis of the core alignment issues reveals **17 critical production blockers** organized into 4 phases that must be systematically addressed before production deployment. These issues represent fundamental architectural gaps in service discovery, authentication, middleware, and client-server contract compliance.

### Critical Findings:
- **❌ No Service Discovery** - Clients hardcode endpoints
- **❌ Inconsistent Auth Headers** - Mixed Bearer/X-API-Key usage
- **❌ Missing Request Tracking** - No X-Request-ID middleware
- **❌ CORS Not Production-Ready** - No environment-based allowlists
- **❌ Non-Standard Error Envelopes** - Inconsistent error responses
- **❌ WebSocket Path Misalignment** - Legacy paths still in use
- **❌ No Conformance Testing** - No validation of Golden Contract compliance

### **Production Risk Level: 🔴 CRITICAL**
Current state would result in immediate production failures.

---

## 📋 Phase-Based Implementation Strategy

### **Phase 0: Kickoff** (Aug 25-27) 🔴 **CRITICAL**
**Goal**: Foundation and scaffolding for alignment

| Task | Priority | Status | Estimated Time |
|------|----------|--------|----------------|
| P0.1 - Discovery Manifest | P0 | ❌ TODO | 2 hours |
| P0.2 - Middleware Scaffolding | P0 | ❌ TODO | 4 hours |
| P0.3 - Environment Bootstrap | P0 | ❌ TODO | 1 hour |
| P0.4 - Repository Setup | P1 | ❌ TODO | 1 hour |

**Total Phase 0 Time**: 8 hours

### **Phase 1: Semantics** (Aug 28 - Sep 2) 🔴 **CRITICAL**
**Goal**: Header standardization and error envelope consistency

| Task | Priority | Status | Estimated Time |
|------|----------|--------|----------------|
| P1.1 - Header Migration (MaaS) | P0 | ❌ TODO | 3 hours |
| P1.2 - Header Migration (Clients) | P0 | ❌ TODO | 4 hours |
| P1.3 - Error Envelope Standard | P1 | ❌ TODO | 3 hours |
| P1.4 - SDK Discovery Integration | P1 | ❌ TODO | 2 hours |

**Total Phase 1 Time**: 12 hours

### **Phase 2: WS/SSE Parity** (Sep 3-6) 🟡 **HIGH**
**Goal**: WebSocket and SSE alignment

| Task | Priority | Status | Estimated Time |
|------|----------|--------|----------------|
| P2.1 - WS Target Alignment | P0 | ❌ TODO | 2 hours |
| P2.2 - Optional MCP Proxy | P1 | ❌ TODO | 3 hours |
| P2.3 - SSE/WS Tests | P1 | ❌ TODO | 2 hours |

**Total Phase 2 Time**: 7 hours

### **Phase 3: Validation & Rollout** (Sep 7-12) 🟡 **HIGH**
**Goal**: Testing and production deployment

| Task | Priority | Status | Estimated Time |
|------|----------|--------|----------------|
| P3.1 - Conformance Suite | P0 | ❌ TODO | 6 hours |
| P3.2 - Staging Smoke Tests | P0 | ❌ TODO | 3 hours |
| P3.3 - Production Rollout | P0 | ❌ TODO | 2 hours |
| P3.4 - Monitoring Setup | P1 | ❌ TODO | 3 hours |
| P3.5 - Acceptance Sign-off | P0 | ❌ TODO | 1 hour |

**Total Phase 3 Time**: 15 hours

---

## 🔧 Detailed Implementation Roadmap

### **🚀 Phase 0: Critical Foundation**

#### **P0.1 — Service Discovery Manifest**
**Production Impact**: 🔴 **BLOCKER** - Clients cannot discover endpoints

**Implementation**:
```typescript
// public/.well-known/onasis.json
{
  "auth_base": "https://api.LanOnasis.com/api/v1",
  "memory_base": "https://api.LanOnasis.com/api/v1/memories",
  "mcp_ws_base": "wss://api.LanOnasis.com",
  "mcp_sse": "https://api.LanOnasis.com/mcp/sse",
  "mcp_message": "https://api.LanOnasis.com/mcp/message",
  "keys_base": "https://api.LanOnasis.com/api/v1/keys",
  "project_scope": "LanOnasis-maas",
  "version": "1.2.0"
}
```

**Files to Create**:
- `public/.well-known/onasis.json`
- Update `vercel.json` to include well-known directory
- Documentation in README.md

#### **P0.2 — Middleware Scaffolding**
**Production Impact**: 🔴 **BLOCKER** - No request tracking, CORS issues, inconsistent errors

**Files to Create**:
```typescript
// src/middleware/httpBasics.ts
export const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
};

export const corsGuard = (req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  // Implementation...
};

export const errorEnvelope = (error: any, req: Request, res: Response, next: NextFunction) => {
  res.status(error.status || 500).json({
    error: {
      message: error.message,
      type: error.constructor.name,
      code: error.code || 'INTERNAL_ERROR'
    },
    request_id: req.id,
    timestamp: new Date().toISOString()
  });
};

// src/middleware/centralAuth.ts
export const centralAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const bearer = req.headers['authorization']?.replace('Bearer ', '');
  // Implementation...
};
```

#### **P0.3 — Environment Configuration**
**Production Impact**: 🔴 **BLOCKER** - Missing production environment variables

**Environment Variables to Add**:
```bash
ALLOWED_ORIGINS=https://dashboard.LanOnasis.com,https://docs.LanOnasis.com,https://api.LanOnasis.com
CENTRAL_AUTH_URL=https://api.LanOnasis.com/auth/validate
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=REDACTED_SUPABASE_SERVICE_ROLE_KEY
ALIGNMENT_ENFORCED=false  # Feature flag for rollout
```

---

### **🎯 Phase 1: Header Semantics & Standards**

#### **P1.1 — MaaS Routes Header Migration**
**Production Impact**: 🔴 **BLOCKER** - Authentication will fail

**Changes Required**:
- Replace all `Authorization: Bearer <api_key>` with `X-API-Key: <api_key>`
- Reserve `Authorization: Bearer` strictly for JWT tokens
- Add `X-Project-Scope: LanOnasis-maas` to all protected calls
- Update all route handlers in `src/routes/`

#### **P1.2 — Client Header Migration**
**Production Impact**: 🔴 **BLOCKER** - SDK/CLI/IDE clients will fail authentication

**Files to Update**:
- SDK: `packages/LanOnasis-sdk/src/`
- CLI: `cli/src/`
- IDE Extensions: `vscode-extension/`, `cursor-extension/`

#### **P1.3 — Uniform Error Envelope**
**Production Impact**: 🟡 **HIGH** - Inconsistent error handling

**Standard Error Format**:
```typescript
interface ErrorEnvelope {
  error: {
    message: string;
    type: string;
    code: string;
  };
  request_id: string;
  timestamp: string;
}
```

**Security Headers to Add**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Privacy-Level: standard`

---

### **🔗 Phase 2: WebSocket/SSE Alignment**

#### **P2.1 — WebSocket Path Standardization**
**Production Impact**: 🟡 **HIGH** - WebSocket connections will fail

**Changes**:
- Update all WS endpoints from `/mcp` to `/mcp/ws`
- Ensure headers include `X-API-Key` and `X-Project-Scope`
- Update clients to use `${mcp_ws_base}/mcp/ws`

#### **P2.2 — MCP Proxy Implementation**
**Production Impact**: 🟡 **MEDIUM** - Optional but recommended for routing

**Implementation**:
```typescript
// src/routes/mcp-proxy.ts
app.use('/mcp/ws', createProxyMiddleware({
  target: process.env.CORE_MCP_URL,
  ws: true,
  changeOrigin: true,
  onProxyReqWs: (proxyReq, req, socket, options, head) => {
    // Preserve headers
    proxyReq.setHeader('X-API-Key', req.headers['x-api-key']);
    proxyReq.setHeader('X-Project-Scope', req.headers['x-project-scope']);
  }
}));
```

---

### **✅ Phase 3: Validation & Production**

#### **P3.1 — Conformance Test Suite**
**Production Impact**: 🔴 **BLOCKER** - No validation of Golden Contract compliance

**Test Categories**:
1. **REST API Tests**:
   - JWT authentication paths
   - X-API-Key authentication paths
   - Error envelope validation
   - Security header verification

2. **CORS Tests**:
   - Allowed origin acceptance
   - Denied origin rejection
   - Preflight request handling

3. **WebSocket Tests**:
   - `/mcp/ws` handshake with valid keys
   - Error envelope on handshake failure
   - Connection close codes

4. **Discovery Tests**:
   - Manifest accessibility
   - Field validation
   - Client resolution testing

#### **P3.2 — Staging Environment Validation**
**Production Impact**: 🔴 **BLOCKER** - Must validate before production

**Test Scenarios**:
- Vendor key requests to `/api/v1/*`
- JWT requests to `/api/v1/*`
- Mixed-mode dashboard (human JWT + machine keys)
- WebSocket connections via SDK/CLI
- Cross-origin requests from dashboard

#### **P3.3 — Production Rollout Strategy**
**Production Impact**: 🔴 **BLOCKER** - Controlled deployment required

**Rollout Plan**:
1. Deploy with `ALIGNMENT_ENFORCED=false`
2. Monitor baseline metrics
3. Enable `ALIGNMENT_ENFORCED=true` for 10% traffic
4. Gradually increase to 100%
5. Monitor error rates and rollback if needed

---

## 📊 Risk Assessment & Mitigation

### **🔴 Critical Risks**

1. **Service Discovery Failure**
   - **Risk**: Clients cannot find endpoints
   - **Mitigation**: Implement discovery with fallbacks
   - **Rollback**: Hardcoded endpoints as backup

2. **Authentication Header Mismatch**
   - **Risk**: All API calls fail authentication
   - **Mitigation**: Thorough testing in staging
   - **Rollback**: Support both header formats during transition

3. **CORS Blocking**
   - **Risk**: Dashboard/clients blocked by CORS
   - **Mitigation**: Comprehensive origin allowlist testing
   - **Rollback**: Temporary wildcard CORS

4. **WebSocket Connection Failures**
   - **Risk**: Real-time features broken
   - **Mitigation**: Dual-path support during transition
   - **Rollback**: Fallback to legacy paths

### **🟡 High Risks**

1. **Error Envelope Inconsistency**
   - **Risk**: Poor error handling user experience
   - **Mitigation**: Comprehensive error handler testing

2. **Request ID Missing**
   - **Risk**: Difficult debugging in production
   - **Mitigation**: Ensure middleware is first in chain

---

## 🛠️ Implementation Resources

### **Files to Create** (17 new files):
```
src/middleware/
├── httpBasics.ts          # Request ID, CORS, Error envelope
├── centralAuth.ts         # Auth validation middleware
└── index.ts              # Export all middleware

public/.well-known/
└── onasis.json           # Service discovery manifest

tests/conformance/
├── rest-api.test.ts      # REST endpoint conformance
├── cors.test.ts          # CORS policy testing
├── websocket.test.ts     # WebSocket handshake testing
├── discovery.test.ts     # Service discovery testing
└── error-envelope.test.ts # Error format validation

src/routes/
└── mcp-proxy.ts          # Optional MCP proxy route

config/
├── cors-origins.ts       # Environment-based CORS config
└── auth-validation.ts    # Central auth validation logic

docs/
├── service-discovery.md  # Discovery implementation guide
├── header-semantics.md   # Authentication header standards
├── error-handling.md     # Error envelope specification
└── websocket-guide.md    # WebSocket implementation guide
```

### **Files to Modify** (12 existing files):
```
src/server.ts             # Wire new middleware
src/routes/*.ts           # Update header semantics
package.json              # Add conformance test scripts
vercel.json              # Include well-known directory
.env.example             # Document new env vars
README.md                # Update with discovery info
cli/src/                 # Update client headers
packages/LanOnasis-sdk/  # Update SDK headers
vscode-extension/        # Update extension headers
cursor-extension/        # Update extension headers
windsurf-extension/      # Update extension headers
```

### **Testing Strategy**:
1. **Unit Tests**: Each middleware function
2. **Integration Tests**: Full request/response cycles
3. **Contract Tests**: Golden Contract compliance
4. **E2E Tests**: Client-to-server flows
5. **Load Tests**: WebSocket connection scaling
6. **Security Tests**: Auth bypass attempts

---

## 📅 Implementation Timeline

### **Week 1 (Aug 25-31)**
- **Mon-Tue**: Phase 0 implementation
- **Wed-Fri**: Phase 1 implementation
- **Weekend**: Testing and validation

### **Week 2 (Sep 1-7)**
- **Mon-Tue**: Phase 2 implementation
- **Wed-Thu**: Phase 3.1-3.2 (Testing)
- **Fri**: Phase 3.3 (Staging deployment)

### **Week 3 (Sep 8-12)**
- **Mon-Tue**: Production rollout monitoring
- **Wed-Thu**: Issue resolution
- **Fri**: Acceptance sign-off

---

## ✅ Success Criteria

### **Must-Pass Requirements**:
- [ ] 100% endpoints honor Auth semantics (JWT vs X-API-Key)
- [ ] 100% clients resolve endpoints via discovery
- [ ] 100% WS clients use `/mcp/ws`
- [ ] 100% protected routes enforce env-allowlisted CORS
- [ ] 100% errors use uniform envelope (with `request_id`)

### **Performance Targets**:
- [ ] Discovery manifest loads < 100ms
- [ ] Auth validation < 50ms per request
- [ ] WebSocket handshake < 200ms
- [ ] Error response time < 10ms

### **Monitoring Metrics**:
- [ ] 4xx/5xx error rates < 1%
- [ ] CORS block rate < 0.1%
- [ ] WebSocket close code 1008 < 0.5%
- [ ] Discovery manifest cache hit > 95%

---

## 🚨 Production Readiness Checklist

Before production deployment, ensure:

### **Infrastructure**
- [ ] Service discovery manifest deployed
- [ ] All middleware active and tested
- [ ] Environment variables configured
- [ ] Monitoring dashboards setup

### **Security**
- [ ] All auth headers standardized
- [ ] CORS policies properly configured
- [ ] Security headers implemented
- [ ] No fallback/default secrets

### **Testing**
- [ ] Conformance suite passing 100%
- [ ] Staging environment validated
- [ ] Load testing completed
- [ ] Rollback procedures tested

### **Documentation**
- [ ] API changes documented
- [ ] Client migration guides created
- [ ] Troubleshooting guides prepared
- [ ] Team training completed

---

## 📞 Escalation & Support

### **Phase 0-1 Blockers**: Immediate attention required
### **Phase 2 Issues**: 24-hour response
### **Phase 3 Problems**: Standard support cycle

### **Rollback Triggers**:
- 4xx rate > 5%
- 5xx rate > 1%
- WebSocket connection success < 90%
- Discovery manifest failures > 1%

---

**This implementation plan provides a systematic, phased approach to achieving production readiness for the MaaS platform while maintaining service availability and minimizing deployment risks.**