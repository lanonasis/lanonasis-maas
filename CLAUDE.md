# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Main Service
- **Development**: `npm run dev` - Start development server with hot reload
- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Start**: `npm start` - Start production server
- **Type Check**: `npm run type-check` - Run TypeScript type checking
- **Lint**: `npm run lint` - Run ESLint
- **Test**: `npm test` - Run all tests
- **Test Coverage**: `npm run test:coverage` - Run tests with coverage report
- **Database Migration**: `npm run db:migrate` - Apply database migrations
- **Database Seed**: `npm run db:seed` - Seed database with test data

### CLI Tool
- **Development**: `npm run dev` (from cli/ directory)
- **Build**: `npm run build` (from cli/ directory) 
- **Test CLI**: `memory --help` after building
- **Publish**: `npm publish` (from cli/ directory)

### Docker & Deployment
- **Local Development**: `docker-compose up`
- **Production**: `docker-compose -f docker-compose.prod.yml up`
- **Build Image**: `docker build -t memory-service .`
- **Kubernetes Deploy**: `kubectl apply -f k8s/`

## Architecture Overview

This is an enterprise-grade Memory as a Service (MaaS) microservice with the following architecture:

### 1. API Server (`src/server.ts`)
- **Express.js** with TypeScript for the REST API
- **Enterprise Middleware**: Authentication, rate limiting, error handling, logging, metrics
- **OpenAPI Documentation**: Swagger UI available at `/docs`
- **Health Checks**: Kubernetes-ready health endpoints
- **Security**: Helmet.js, CORS, input validation

### 2. Authentication System (`src/routes/auth.ts`, `src/middleware/auth.ts`)
- **JWT-based authentication** with bcrypt password hashing
- **Multi-tenant support** with organization-based isolation
- **Role-based access control**: admin, user, viewer roles
- **Plan-based features**: free, pro, enterprise tiers

### 3. Memory Service (`src/services/memoryService.ts`)
- **Vector-based storage** using OpenAI embeddings (text-embedding-ada-002)
- **Semantic search** with configurable similarity thresholds
- **Memory types**: context, project, knowledge, reference, personal, workflow
- **Access tracking** and analytics
- **Bulk operations** for enterprise use

### 4. Database Layer (`src/db/schema.sql`)
- **Supabase (PostgreSQL + pgvector)** for vector storage
- **Multi-tenant schema** with organizations and users
- **RLS policies** for data isolation
- **Audit trails** with memory versions
- **Performance optimized** with proper indexes

### 5. CLI Tool (`cli/src/`)
- **Professional CLI** with commands for all memory operations
- **Interactive mode** with inquirer prompts
- **Configuration management** with local config storage
- **Output formatting**: table, JSON, colored terminal output
- **Authentication handling** with token storage

### 6. Monitoring & Observability
- **Prometheus metrics** (`src/utils/metrics.ts`)
- **Structured logging** with Winston
- **Health checks**: liveness, readiness, dependency health
- **Performance tracking** for all operations
- **Error tracking** with stack traces

## Database Schema

The system uses a comprehensive multi-tenant schema:

### Core Tables
- **organizations**: Multi-tenant isolation, plan management
- **users**: Authentication, roles, organization membership  
- **memory_entries**: Main memory storage with vector embeddings
- **topics**: Memory organization and categorization
- **memory_versions**: Audit trail and versioning
- **api_keys**: Programmatic access management
- **usage_analytics**: Usage tracking and analytics (partitioned)

### Key Functions
- **match_memories()**: Vector similarity search with filters
- **update_memory_access()**: Access tracking
- **create_memory_version()**: Automatic versioning on updates

## Environment Variables

### Required
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key  
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `JWT_SECRET`: JWT signing secret (min 32 chars)
- `OPENAI_API_KEY`: OpenAI API key for embeddings

### Optional
- `REDIS_URL`: Redis for caching (optional)
- `LOG_LEVEL`: debug, info, warn, error
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `ENABLE_METRICS`: Enable Prometheus metrics

## Key File Locations

### Server Core
- **Main server**: `src/server.ts`
- **Configuration**: `src/config/environment.ts`
- **Database schema**: `src/db/schema.sql`

### Services & Logic
- **Memory service**: `src/services/memoryService.ts`
- **Authentication**: `src/middleware/auth.ts`
- **Error handling**: `src/middleware/errorHandler.ts`
- **Logging**: `src/utils/logger.ts`
- **Metrics**: `src/utils/metrics.ts`

### API Routes
- **Health**: `src/routes/health.ts`
- **Authentication**: `src/routes/auth.ts` 
- **Memory operations**: `src/routes/memory.ts`
- **Metrics**: `src/routes/metrics.ts`

### CLI Tool
- **Main CLI**: `cli/src/index.ts`
- **Commands**: `cli/src/commands/`
- **Configuration**: `cli/src/utils/config.ts`
- **API client**: `cli/src/utils/api.ts`

### Testing
- **Unit tests**: `tests/unit/`
- **Integration tests**: `tests/integration/`
- **E2E tests**: `tests/e2e/`
- **Test setup**: `tests/setup.ts`

### Deployment
- **Docker**: `Dockerfile`, `docker-compose.yml`
- **Kubernetes**: `k8s/` directory with all manifests
- **CI/CD**: `.github/workflows/ci-cd.yml`

## Development Notes

### Testing Strategy
- **Unit tests** for services and utilities (Jest)
- **Integration tests** for API endpoints (Supertest)
- **E2E tests** for complete workflows
- **Mocking** for external services (OpenAI, Supabase)
- **Coverage requirement**: 80% minimum

### Security Considerations
- **Authentication required** for all memory operations
- **Multi-tenant isolation** enforced at database level
- **Input validation** with Zod schemas
- **Rate limiting** to prevent abuse
- **Security headers** via Helmet.js
- **Environment-based secrets** management

### Performance Optimizations
- **Connection pooling** for database
- **Vector indexes** for fast similarity search
- **Caching layer** (Redis optional)
- **Metrics collection** for monitoring
- **Horizontal scaling** ready (stateless design)

### Error Handling
- **Comprehensive error types** with proper HTTP status codes
- **Structured error responses** with details
- **Async error handling** with proper propagation
- **Logging integration** for debugging
- **Development vs production** error details

## Memory Types and Usage

- **context**: General contextual information
- **project**: Project-specific knowledge
- **knowledge**: Educational or reference material  
- **reference**: Quick reference information
- **personal**: User-specific private memories
- **workflow**: Process and procedure documentation

## CLI Usage Examples

```bash
# Initialize and authenticate
memory init
memory login

# Memory operations
memory create -t "Title" -c "Content" --type context
memory search "query text" --limit 10
memory list --type project --tags "work,important"
memory get <memory-id>
memory update <memory-id> -t "New Title"
memory delete <memory-id>

# Admin operations
memory stats  # Memory statistics
memory config show  # Show configuration
```

## API Usage Examples

All API endpoints require authentication via `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh token

### Memory Operations  
- `POST /api/v1/memory` - Create memory
- `GET /api/v1/memory` - List memories (paginated)
- `POST /api/v1/memory/search` - Semantic search
- `GET /api/v1/memory/:id` - Get specific memory
- `PUT /api/v1/memory/:id` - Update memory
- `DELETE /api/v1/memory/:id` - Delete memory

### Admin Operations
- `GET /api/v1/memory/admin/stats` - Memory statistics
- `POST /api/v1/memory/bulk/delete` - Bulk delete (pro/enterprise)

## Deployment Environments

### Development
- Local development with hot reload
- Docker Compose for full stack
- Test database and mocked services

### Staging  
- Kubernetes deployment
- Staging database
- Full monitoring stack
- Security scanning

### Production
- Multi-replica deployment
- Production database with backups
- Full observability (logs, metrics, traces)
- SSL/TLS termination
- Rate limiting and security policies