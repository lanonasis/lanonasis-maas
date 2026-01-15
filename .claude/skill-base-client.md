# Skill: Base Client

## Activation
This skill applies when working with:
- `/opt/lanonasis/onasis-gateway/core/base-client.js`
- Any file that extends or uses `BaseClient`
- API client implementations

## Purpose
The `BaseClient` is the **universal API client foundation** that all vendor integrations depend upon. Changes here cascade to every service in the system.

---

## CRITICAL RULES - NEVER DO

### 1. NEVER Remove or Rename Public Methods
These methods are used across the entire codebase:
```javascript
// PROTECTED METHODS - DO NOT MODIFY SIGNATURES
request(config)
retryRequest(config)
healthCheck()
generateMethods(endpoints)
addAuthentication(config, auth)
```

### 2. NEVER Change EventEmitter Event Names
Downstream systems listen for these exact event names:
```javascript
// PROTECTED EVENT NAMES
'request'           // Emitted before each request
'response'          // Emitted after successful response
'error'             // Emitted on request failure
'circuit-breaker-open'  // Emitted when circuit opens
```

### 3. NEVER Modify Authentication Type Identifiers
All vendor clients use these exact strings:
```javascript
// PROTECTED AUTH TYPES
'bearer'   // Bearer token authentication
'apikey'   // API key (header or query)
'basic'    // Basic HTTP auth
'hmac'     // HMAC signature
'oauth2'   // OAuth 2.0 flow
```

### 4. NEVER Log Sensitive Data
```javascript
// FORBIDDEN - leaks auth tokens
this.logRequest({ ...config, headers: config.headers });

// REQUIRED - sanitize all logs
this.logRequest({
  method: config.method,
  url: config.url,
  timestamp: new Date().toISOString()
});
```

### 5. NEVER Reduce Resilience Defaults
```javascript
// PROTECTED DEFAULTS
retryAttempts: 3        // Minimum retry attempts
retryDelay: 1000        // Base delay in ms
circuitBreakerThreshold: 5   // Failures before open
circuitBreakerTimeout: 60000 // Recovery time in ms
```

### 6. NEVER Change Constructor Signature Breaking Compatibility
```javascript
// FORBIDDEN - breaks existing clients
constructor(config, options) // Adding required parameter

// ALLOWED - backward compatible
constructor(config = {})
```

---

## REQUIRED PATTERNS - MUST FOLLOW

### 1. EventEmitter Pattern for State Changes
```javascript
// REQUIRED for any state change
this.emit('state-change', {
  service: this.config.name,
  previousState: oldState,
  newState: newState,
  timestamp: new Date().toISOString()
});
```

### 2. Structured Error Response
```javascript
// REQUIRED error structure
{
  service: this.config.name,
  type: 'CONNECTION_ERROR' | 'TIMEOUT' | 'AUTH_FAILURE' | 'RATE_LIMIT',
  message: error.message,
  status: error.response?.status,
  timestamp: new Date().toISOString(),
  retryable: true | false
}
```

### 3. Circuit Breaker State Machine
```javascript
// REQUIRED state transitions
// CLOSED -> OPEN -> HALF_OPEN -> CLOSED
//
// CLOSED: Normal operation, count failures
// OPEN: Reject all requests immediately
// HALF_OPEN: Allow single test request
//
// NEVER skip states, ALWAYS emit events on transition
```

### 4. Exponential Backoff Formula
```javascript
// REQUIRED retry delay calculation
const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
// Attempt 1: 1000ms
// Attempt 2: 2000ms
// Attempt 3: 4000ms
```

---

## CODE EXAMPLES

### Adding a New Authentication Type
```javascript
// In addAuthentication() method - add new case
case 'new-auth-type':
  // 1. Validate required config
  if (!auth.config?.requiredField) {
    throw new Error('Missing required authentication field');
  }

  // 2. Apply authentication to request
  config.headers['X-Custom-Auth'] = auth.config.value;

  // 3. Emit event for monitoring
  this.emit('auth-applied', {
    type: 'new-auth-type',
    service: this.config.name
  });
  break;
```

### Adding a New Public Method
```javascript
// Follow existing method pattern
async newMethod(endpoint, options = {}) {
  // 1. Check circuit breaker FIRST
  if (this.isCircuitOpen()) {
    throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
  }

  // 2. Build request config
  const config = {
    url: endpoint.path,
    method: endpoint.method,
    ...options
  };

  // 3. Apply authentication
  this.addAuthentication(config, this.config.authentication);

  // 4. Use retry mechanism
  return this.retryRequest(config);
}
```

### Extending BaseClient for a New Service
```javascript
const BaseClient = require('../core/base-client');

class NewServiceClient extends BaseClient {
  constructor(apiKey) {
    super({
      name: 'new-service',
      baseUrl: 'https://api.newservice.com',
      timeout: 30000,
      retryAttempts: 3,
      authentication: {
        type: 'bearer',
        config: { token: apiKey }
      }
    });
  }

  // Add service-specific methods
  async getResource(id) {
    return this.request({
      method: 'GET',
      url: `/resources/${id}`
    });
  }
}
```

---

## INTEGRATION POINTS

| Component | How It Integrates | Events to Use |
|-----------|-------------------|---------------|
| VendorAbstraction | Extends BaseClient | All events |
| MetricsCollector | `client.on('request', ...)` | request, response, error |
| ComplianceManager | Pre-request validation hooks | request |
| VersionManager | Config version validation | constructor |

### Event Listening Example
```javascript
const client = new BaseClient(config);

// MetricsCollector integration
client.on('request', (data) => {
  metricsCollector.recordRequest(data);
});

client.on('response', (data) => {
  metricsCollector.recordResponse(data);
});

client.on('error', (data) => {
  metricsCollector.recordError(data);
});

client.on('circuit-breaker-open', (data) => {
  metricsCollector.recordCircuitBreakerState(data);
});
```

---

## TESTING REQUIREMENTS

### Before Any Change
```bash
# Run BaseClient tests
npm test -- --grep "BaseClient"

# Verify no breaking changes
npm run test:integration -- --grep "client"
```

### Required Test Coverage
1. All public methods work with existing signatures
2. All authentication types authenticate correctly
3. Circuit breaker state transitions work
4. Retry mechanism respects exponential backoff
5. Events emit with correct payload structure

### Contract Tests
```javascript
describe('BaseClient Events', () => {
  it('should emit request event with required fields', () => {
    expect(eventPayload).toHaveProperty('service');
    expect(eventPayload).toHaveProperty('method');
    expect(eventPayload).toHaveProperty('url');
    expect(eventPayload).toHaveProperty('timestamp');
  });
});
```

---

## ROLLBACK PROCEDURES

### Immediate Rollback (Breaking Change Detected)
```bash
git revert HEAD --no-commit
git checkout HEAD~1 -- core/base-client.js
git commit -m "Rollback base-client.js due to breaking change"
```

### Staged Deprecation (Preferred)
```javascript
// Add deprecation notice, keep old method working
/**
 * @deprecated Use newMethod() instead. Will be removed in v2.0
 */
oldMethod() {
  console.warn('oldMethod is deprecated, use newMethod instead');
  return this.newMethod();
}
```

### Feature Flag Rollback
```javascript
// If feature flag exists, disable new behavior
if (!process.env.ENABLE_NEW_CLIENT_FEATURE) {
  return this.legacyBehavior();
}
```

---

## QUICK REFERENCE

| Action | Allowed? | Notes |
|--------|----------|-------|
| Add new method | YES | Follow existing patterns |
| Add new event | YES | Document in this skill |
| Add new auth type | YES | Never modify existing types |
| Change method signature | NO | Breaking change |
| Remove method | NO | Deprecate first, wait 30 days |
| Change event name | NO | Breaking change |
| Reduce retry attempts | NO | Requires explicit approval |
| Log request headers | NO | Security violation |
