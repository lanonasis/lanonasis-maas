# API Key Manager Integration with LanOnasis MaaS

## Overview

The Vortex API Key Manager has been successfully integrated into the LanOnasis Memory as a Service (MaaS) platform as an additional service with full MCP (Model Context Protocol) capability. This integration allows users to securely store their API keys and access them via agentic MCP with scoped keys, without exposing any secrets in their development workflow.

## Architecture

### Core Components

1. **Database Schema Extension** (`src/db/schema-api-keys.sql`)
   - New tables for API key storage, projects, MCP tools, sessions, and audit trails
   - Multi-tenant isolation with organization-based access control
   - Encrypted key storage with AES-256-GCM encryption
   - Automatic rotation policies and expiration management

2. **API Key Service** (`src/services/apiKeyService.ts`)
   - Comprehensive service layer for key management
   - Secure encryption/decryption utilities
   - MCP session management and proxy token generation
   - Usage analytics and security event logging

3. **REST API Routes** (`src/routes/api-keys.ts`)
   - Full CRUD operations for API keys and projects
   - MCP tool registration and management
   - Access request handling and approval workflows
   - Analytics and security event endpoints

4. **MCP Integration Routes** (`src/routes/mcp-api-keys.ts`)
   - Dedicated endpoints for AI agent access
   - Proxy token generation and resolution
   - Session management and status tracking
   - Security-first design with automatic token revocation

5. **CLI Extension** (`cli/src/commands/api-keys.ts`)
   - Complete command-line interface for key management
   - Interactive and non-interactive modes
   - Project management and organization
   - MCP tool registration and access requests

## Key Features

### 🔐 Secure Storage
- **AES-256-GCM Encryption**: All API keys are encrypted at rest
- **Zero-Knowledge Architecture**: Raw key values are never logged or cached
- **Scoped Access**: Keys are isolated by organization and project
- **Access Levels**: Public, authenticated, team, admin, and enterprise tiers

### 🤖 MCP Integration
- **AI Agent Access**: Secure proxy tokens for AI agents and MCP tools
- **Temporary Sessions**: Time-limited access with automatic expiration
- **Request/Approval Workflow**: Optional human approval for high-risk operations
- **Audit Trail**: Complete logging of all access and operations

### 🔄 Automated Management
- **Key Rotation**: Configurable automatic rotation schedules
- **Expiration Handling**: Automatic cleanup of expired keys and sessions
- **Usage Analytics**: Real-time tracking of key access patterns
- **Security Events**: Anomaly detection and compliance monitoring

### 👥 Multi-Tenant Support
- **Organization Isolation**: Complete data separation between organizations
- **Role-Based Access**: Admin, user, and viewer roles with appropriate permissions
- **Team Management**: Shared access within project teams
- **Plan-Based Features**: Different capabilities for free, pro, and enterprise plans

## Usage Examples

### CLI Usage

```bash
# Create a new project
memory api-keys projects create --name "Production APIs" --organization-id "<org-id>"

# Store an API key
memory api-keys create \
  --name "stripe_api_key" \
  --value "sk_live_..." \
  --type "api_key" \
  --environment "production" \
  --project-id "<project-id>" \
  --tags "payment,critical"

# Register an MCP tool
memory api-keys mcp register-tool \
  --tool-id "payment-processor" \
  --tool-name "AI Payment Processor" \
  --keys "stripe_api_key,paypal_client_secret" \
  --environments "production" \
  --risk-level "high"

# Request access via MCP
memory api-keys mcp request-access \
  --tool-id "payment-processor" \
  --keys "stripe_api_key" \
  --environment "production" \
  --justification "Processing customer payment for order #12345" \
  --duration 600
```

### API Usage

```typescript
// Create an API key
const apiKey = await fetch('/api/v1/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'stripe_api_key',
    value: 'sk_live_...',
    keyType: 'api_key',
    environment: 'production',
    projectId: 'project-uuid',
    tags: ['payment', 'critical'],
    rotationFrequency: 90
  })
});

// MCP access request (for AI agents)
const accessRequest = await fetch('/api/v1/mcp/api-keys/request-access', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolId: 'payment-processor',
    organizationId: 'org-uuid',
    keyNames: ['stripe_api_key'],
    environment: 'production',
    justification: 'Processing payment for customer order',
    estimatedDuration: 600,
    context: { orderId: '12345', amount: 99.99 }
  })
});

// Get proxy token for secure access
const proxyToken = await fetch(`/api/v1/mcp/api-keys/sessions/${sessionId}/keys/stripe_api_key/proxy-token`, {
  method: 'POST'
});

// Use proxy token instead of real API key
const payment = await stripe.charges.create({
  amount: 9999,
  currency: 'usd',
  source: 'tok_visa'
}, {
  apiKey: proxyToken.proxyToken // This resolves to the real key securely
});
```

### MCP Integration for AI Agents

```typescript
// AI agent requesting access to API keys
class PaymentAgent {
  async processPayment(orderId: string, amount: number) {
    // Request access to payment keys
    const accessRequest = await this.requestMCPAccess({
      toolId: 'payment-agent-v2',
      keyNames: ['stripe_api_key', 'paypal_client_secret'],
      environment: 'production',
      justification: `Processing payment for order ${orderId}`,
      estimatedDuration: 300,
      context: { orderId, amount, agentVersion: '2.1.0' }
    });

    if (accessRequest.status === 'approved') {
      // Get proxy tokens for the keys
      const stripeToken = await this.getProxyToken(accessRequest.sessionId, 'stripe_api_key');
      
      // Use proxy token - it automatically resolves to the real key
      const stripe = new Stripe(stripeToken.proxyToken);
      
      return await stripe.charges.create({
        amount: amount * 100,
        currency: 'usd',
        // ... other payment details
      });
    } else {
      throw new Error('Payment key access requires manual approval');
    }
  }
}
```

## Security Model

### Zero-Trust Architecture
- **No Persistent Access**: All access is session-based with automatic expiration
- **Proxy Tokens**: AI agents never see the actual API key values
- **Audit Everything**: Complete logging of all access, usage, and modifications
- **Least Privilege**: Keys are only accessible to explicitly authorized tools/sessions

### Encryption and Storage
- **At-Rest Encryption**: AES-256-GCM with derived keys from master secret
- **In-Transit Security**: HTTPS/TLS 1.3 for all API communications
- **Memory Protection**: Keys are cleared from memory immediately after use
- **No Logging**: Raw key values are never logged, cached, or persisted in plaintext

### Access Control
- **Multi-Factor Authorization**: Tool registration + session approval + key-specific permissions
- **Risk-Based Approval**: High-risk operations require human approval
- **Environment Isolation**: Development, staging, and production keys are completely isolated
- **Time-Limited Access**: All sessions have maximum duration limits

## Integration Benefits

### For Developers
- **Seamless Workflow**: No need to manage secrets in environment variables or config files
- **Development Safety**: Separate keys for different environments prevent accidental production usage
- **Team Collaboration**: Secure sharing of keys within project teams
- **Audit Compliance**: Complete audit trail for security and compliance requirements

### For AI Agents
- **Secure Access**: Proxy tokens provide secure access without key exposure
- **Contextual Requests**: Rich context allows for intelligent approval decisions
- **Automatic Cleanup**: Sessions and tokens are automatically revoked after use
- **Usage Analytics**: Detailed tracking of how keys are used by AI systems

### For Organizations
- **Centralized Management**: Single platform for all secret management needs
- **Compliance Ready**: Built-in audit trails and security controls
- **Cost Effective**: Reduces security overhead and manual key management
- **Scalable**: Supports growth from small teams to enterprise organizations

## Database Schema

### Key Tables

- **`stored_api_keys`**: Encrypted API key storage with metadata
- **`api_key_projects`**: Organizational structure for key management
- **`mcp_key_tools`**: Registered AI tools and their permissions
- **`mcp_key_sessions`**: Active sessions for AI agent access
- **`mcp_proxy_tokens`**: Temporary proxy tokens for secure key access
- **`key_usage_analytics`**: Usage tracking and analytics
- **`key_security_events`**: Security event monitoring and alerting

### Security Features

- **Row Level Security (RLS)**: Database-level access control
- **Automatic Triggers**: Usage counting, rotation scheduling, audit logging
- **Partitioned Analytics**: Efficient storage and querying of usage data
- **Cleanup Functions**: Automated removal of expired sessions and tokens

## Deployment

### Environment Variables

```bash
# Required for API key encryption
API_KEY_ENCRYPTION_KEY=your-32-char-encryption-key

# Database connection
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# For MCP integration
MCP_SERVER_PORT=3001
MCP_ENABLE_REMOTE=true
```

### Database Migration

```bash
# Apply the API key schema extension
psql -h your-db-host -U postgres -d your-database -f src/db/schema-api-keys.sql

# Or using the CLI
memory db:migrate --schema api-keys
```

### Service Configuration

The API key service is automatically integrated into the existing MaaS platform. No additional services need to be deployed - it shares the same Express server, database connection, and infrastructure as the memory service.

## Monitoring and Analytics

### Usage Metrics
- Key access frequency and patterns
- Session duration and success rates
- Tool usage and adoption metrics
- Security event frequency and severity

### Security Monitoring
- Failed access attempts and anomalies
- Unusual usage patterns and potential breaches
- Compliance violations and policy exceptions
- Token leakage and unauthorized access attempts

### Performance Metrics
- API response times for key operations
- Database query performance and optimization
- Session creation and cleanup efficiency
- Proxy token resolution latency

## Future Enhancements

### Planned Features
- **Hardware Security Module (HSM)** integration for enterprise customers
- **Advanced Key Rotation** with blue-green deployment support
- **Integration Templates** for popular APIs (Stripe, OpenAI, AWS, etc.)
- **Compliance Packages** for SOC2, HIPAA, PCI-DSS requirements
- **Advanced Analytics** with ML-based anomaly detection
- **Multi-Region Support** for global deployments

### API Improvements
- **GraphQL Interface** for more flexible queries
- **Webhook Notifications** for key events and security alerts
- **Batch Operations** for bulk key management
- **Advanced Filtering** and search capabilities
- **Import/Export Tools** for migration and backup

This integration provides a comprehensive, enterprise-grade solution for API key management that seamlessly integrates with the existing LanOnasis MaaS platform while maintaining the highest security standards and providing excellent developer experience.