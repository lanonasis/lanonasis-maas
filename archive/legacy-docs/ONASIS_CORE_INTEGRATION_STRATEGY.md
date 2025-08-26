# Onasis-CORE Integration Strategy for vibe-memory

## Recommended Approach: Progressive Integration

### Phase 1: Proxy Integration (Immediate)
```javascript
// Add to Onasis-CORE unified-router.js
const { createProxyMiddleware } = require('http-proxy-middleware');

// Memory Service Proxy with Privacy Layer
app.use('/api/memory', [
  authMiddleware,
  privacyMiddleware,
  createProxyMiddleware({
    target: process.env.MEMORY_SERVICE_URL || 'https://api.lanonasis.com',
    changeOrigin: true,
    pathRewrite: {'^/api/memory': '/api/v1'},
    onProxyReq: (proxyReq, req) => {
      // Add internal service headers
      proxyReq.setHeader('X-Service-Name', 'onasis-core');
      proxyReq.setHeader('X-Internal-Request', 'true');
    }
  })
]);
```

### Phase 2: Submodule Integration (Short-term)
```bash
# Add as submodule for development
cd Onasis-CORE
git submodule add https://github.com/thefixer3x/vibe-memory services/memory-service-external

# Update turbo.json
{
  "pipeline": {
    "memory-external": {
      "cache": false,
      "dependsOn": []
    }
  }
}
```

### Phase 3: Package Federation (Medium-term)
1. Keep vibe-memory in its own repo
2. Publish packages to npm
3. Consume in Onasis-CORE as dependencies
4. Use Turbo to orchestrate builds

### Phase 4: Full Integration (Long-term)
Only after validating the integration works well:
1. Migrate code into Onasis-CORE structure
2. Unify build and deployment pipelines
3. Consolidate monitoring and logging

## Benefits of This Approach

1. **Zero Downtime** - Existing service continues running
2. **Gradual Migration** - Test each phase before proceeding
3. **Rollback Capability** - Can revert at any stage
4. **Minimal Risk** - Production service remains untouched
5. **Learning Opportunity** - Understand integration challenges

## Implementation Checklist

### Immediate Actions (Phase 1)
- [ ] Add proxy configuration to Onasis-CORE
- [ ] Test proxy connection to memory service
- [ ] Add privacy middleware wrapper
- [ ] Update Onasis-CORE documentation

### Short-term Actions (Phase 2)
- [ ] Setup submodule in development
- [ ] Create development docker-compose
- [ ] Test local integration
- [ ] Document developer workflow

### Medium-term Actions (Phase 3)
- [ ] Setup private npm registry (if needed)
- [ ] Create CI/CD for package publishing
- [ ] Update Onasis-CORE to use packages
- [ ] Test package versioning workflow

### Long-term Actions (Phase 4)
- [ ] Plan full migration strategy
- [ ] Create migration scripts
- [ ] Test in staging environment
- [ ] Execute production migration

## Configuration Examples

### Environment Variables
```env
# Onasis-CORE .env
MEMORY_SERVICE_URL=https://api.lanonasis.com
MEMORY_SERVICE_INTERNAL=http://memory-service:3000
ENABLE_MEMORY_PROXY=true
```

### Docker Compose Integration
```yaml
# docker-compose.yml
version: '3.8'
services:
  onasis-core:
    build: .
    environment:
      - MEMORY_SERVICE_URL=http://memory-service:3000
    depends_on:
      - memory-service
  
  memory-service:
    image: lanonasis/memory-service:latest
    environment:
      - NODE_ENV=production
    volumes:
      - ./services/memory-service-external:/app
```

### Nginx Configuration
```nginx
# For production deployment
upstream memory_service {
    server memory-service-1:3000;
    server memory-service-2:3000;
}

location /api/memory {
    proxy_pass http://memory_service;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Risk Mitigation

1. **Service Discovery** - Use environment variables for service URLs
2. **Authentication** - Share JWT secrets between services
3. **Monitoring** - Unified logging with service tags
4. **Rate Limiting** - Apply at gateway level
5. **Circuit Breaker** - Implement failover mechanisms

## Success Criteria

- [ ] Memory service accessible through Onasis-CORE gateway
- [ ] No performance degradation
- [ ] Unified authentication working
- [ ] Privacy layer applied to memory data
- [ ] Monitoring and logging integrated
- [ ] Documentation updated
- [ ] Team trained on new architecture