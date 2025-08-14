# Core Gateway Integration - lanonasis-maas

This document describes the migration from direct Supabase usage to Onasis-CORE Gateway integration for the lanonasis-maas service.

## Migration Summary

The lanonasis-maas dashboard has been successfully migrated to use the Onasis-CORE Gateway for all authentication and data operations, following Plan B (full centralization).

## Architecture Changes

### Before (Direct Supabase)
- Frontend directly connected to Supabase
- Authentication handled by Supabase Auth
- Data operations performed directly on Supabase tables
- JWT tokens issued by Supabase

### After (Core Gateway)
- Frontend connects to Onasis-CORE Gateway
- Authentication centralized via Core Gateway at `https://api.lanonasis.com/v1/auth/*`
- Data operations routed through Core MaaS API at `https://api.lanonasis.com/api/v1/maas/*`
- Project-scoped JWT tokens with `project_scope: 'maas'`
- Audit logging to `core.logs` table

## Database Schema

A comprehensive memory service schema has been created in Onasis-CORE:

### New Schema: `maas`
- `organizations` - Multi-tenant organization management
- `users` - User management linked to Core auth
- `topics` - Memory organization and categorization  
- `memory_entries` - Core memory storage with vector embeddings
- `memory_versions` - Audit trail and versioning
- `api_key_usage` - Usage tracking for API keys
- `usage_analytics` - Usage analytics partitioned by month

### Key Features
- **Vector Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Semantic Search**: Vector similarity with configurable thresholds
- **Multi-tenancy**: Organization-based data isolation
- **Audit Logging**: Comprehensive activity tracking
- **RLS Policies**: Row-level security enforcement
- **HNSW Indexing**: High-performance vector search

## Updated Components

### Authentication System
- **useAuth.tsx**: Migrated to Core Gateway auth endpoints
- **AuthCallback.tsx**: Updated for Core OAuth callback handling
- **ProtectedRoute.tsx**: Compatible with new auth structure

### API Integration
- **api-client.ts**: New centralized API client for Core Gateway
- **ApiKeyManager.tsx**: Updated to use Core API key management
- **UserProfile.tsx**: Updated profile and password management

### Environment Variables
```env
VITE_AUTH_GATEWAY_URL=https://api.lanonasis.com
VITE_CORE_API_BASE_URL=https://api.lanonasis.com
```

## Core Gateway Endpoints

### Authentication
- `POST /v1/auth/login` - User login with project scope
- `POST /v1/auth/register` - User registration  
- `POST /v1/auth/logout` - User logout
- `GET /v1/auth/session` - Session validation
- `POST /v1/auth/callback` - OAuth callback handling
- `POST /v1/auth/update-password` - Password updates
- `POST /v1/auth/update-profile` - Profile updates

### MaaS Data API
- `GET /api/v1/maas/memories` - List memories with pagination/filtering
- `POST /api/v1/maas/memories` - Create new memory with embeddings
- `GET /api/v1/maas/memories/:id` - Get specific memory
- `PUT /api/v1/maas/memories/:id` - Update memory
- `DELETE /api/v1/maas/memories/:id` - Delete memory
- `POST /api/v1/maas/memories/search` - Semantic search
- `GET /api/v1/maas/organizations` - Get user organizations
- `GET /api/v1/maas/api-keys` - List API keys
- `POST /api/v1/maas/api-keys` - Create API key
- `DELETE /api/v1/maas/api-keys/:id` - Delete API key

## Security Features

### JWT Project Scoping
All requests include `project_scope: 'maas'` in JWT claims and headers, ensuring:
- Proper service isolation
- Audit trail attribution
- Access control enforcement

### Audit Logging
All operations logged to `core.logs` with:
- User identification
- Action performed
- Target resource
- Success/failure status
- Request metadata

### Row Level Security
Database-level access controls ensure:
- Organization-based data isolation
- User-specific access to private memories
- Admin privileges for organization management

## Migration Benefits

1. **Centralized Authentication**: Single sign-on across all Lan Onasis services
2. **Enhanced Security**: Project-scoped tokens and comprehensive audit logging
3. **Scalability**: Centralized infrastructure for multi-service platform
4. **Consistency**: Standardized API patterns across services
5. **Privacy Protection**: Core Gateway masks vendor identities and client data

## Backward Compatibility

- Supabase client still available for legacy operations during transition
- Environment variables maintain both Core and Supabase configurations
- Gradual migration path for remaining components

## Next Steps

1. **Testing**: Comprehensive testing of all auth and data flows
2. **Monitoring**: Set up observability for Core Gateway integration
3. **Performance**: Optimize vector search and API response times
4. **Documentation**: Update API documentation for external integrators
5. **Migration**: Apply same pattern to other Lan Onasis services

## Support

For issues related to Core Gateway integration:
- Check Core Gateway health: `GET /health`
- Review audit logs in `core.logs` table
- Verify project scope in JWT tokens
- Confirm environment variable configuration

## Development Commands

```bash
# Start development server
bun run dev

# Build for production  
bun run build

# Run tests
bun run test

# Check types
bun run type-check

# Lint code
bun run lint
```