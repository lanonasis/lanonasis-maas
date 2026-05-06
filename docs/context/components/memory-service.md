# Memory Service (MaaS API) - Component Context

**Package:** `@lanonasis/memory-service-maas`
**Version:** 1.2.0-dev
**Type:** Main backend service
**Authentication**: OAuth2 PKCE (not basic auth)

---

## Purpose

Enterprise Memory as a Service API backend. Provides semantic memory storage and retrieval via REST API with OAuth2 authentication, multi-tenant isolation, and vector search.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server.ts` | Main Express server entry point |
| `src/config/environment.ts` | Environment configuration loading |
| `src/routes/auth.ts` | OAuth2 endpoints (authorize, token, refresh) |
| `src/routes/memory.ts` | Memory CRUD endpoints |
| `src/routes/health.ts` | Health check endpoints |
| `src/middleware/auth.ts` | JWT authentication middleware |
| `src/middleware/errorHandler.ts` | Global error handling |
| `src/services/memoryService.ts` | Core memory business logic |
| `src/db/schema.sql` | Database schema with pgvector |

---

## Dependencies

### External
- **express** (5.2.1) - Web framework
- **@supabase/supabase-js** (2.56.1) - Database client
- **openai** (4.76.1) - Embeddings
- **jsonwebtoken** (9.0.3) - JWT auth
- **bcrypt** (6.0.0) - Password hashing
- **zod** (3.24.4) - Validation
- **helmet** (8.1.0) - Security headers
- **winston** (3.17.0) - Logging

### Internal
- None (this is the core service)

---

## Integration Points

| Component | Connection |
|-----------|------------|
| SDK packages | All `@lanonasis/*` packages call this API |
| CLI tool | `memory` CLI communicates with this API |
| Supabase | PostgreSQL with pgvector for vector storage |
| OpenAI | Embeddings via text-embedding-ada-002 |

---

## API Endpoints

### Authentication (OAuth2)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/oauth/authorize` | OAuth2 authorization endpoint |
| POST | `/auth/oauth/token` | Exchange code for access token |
| POST | `/api/v1/auth/refresh` | Refresh access token |

**Architecture Note**: The service uses OAuth2 PKCE (Proof Key for Code Exchange) as the primary authentication mechanism. This replaced basic email/password authentication (register/login) endpoints to improve security and support multi-tenant scenarios. All `/api/v1/*` endpoints require a valid JWT Bearer token obtained through the OAuth2 flow.

### Memory Operations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/memory` | Create memory |
| GET | `/api/v1/memory` | List memories (paginated) |
| POST | `/api/v1/memory/search` | Semantic vector search |
| GET | `/api/v1/memory/:id` | Get specific memory |
| PUT | `/api/v1/memory/:id` | Update memory |
| DELETE | `/api/v1/memory/:id` | Delete memory |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/memory/admin/stats` | Memory statistics |
| POST | `/api/v1/memory/bulk/delete` | Bulk delete (pro/enterprise) |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/ready` | Readiness check |
| GET | `/metrics` | Prometheus metrics |

---

## Architecture Decisions

- **Express 5**: Async middleware support, improved performance
- **JWT multi-tenant**: Organization-based isolation with RLS policies
- **pgvector**: Native vector similarity search in PostgreSQL
- **Zod validation**: Runtime schema validation on all inputs

---

## Development Commands

```bash
npm run dev        # Development with hot reload (tsx watch)
npm run build      # Compile TypeScript
npm start          # Production server
npm run type-check # TypeScript checking
npm run lint       # ESLint
npm test           # Run tests
npm run db:migrate # Apply database migrations
npm run db:seed    # Seed test data
```

---

## Docker

```bash
docker build -t memory-service .
docker run -p 3000:3000 memory-service
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Yes | Service role key |
| `JWT_SECRET` | Yes | JWT signing secret |
| `OPENAI_API_KEY` | Yes | For embeddings |
| `REDIS_URL` | No | Optional caching |
| `LOG_LEVEL` | No | debug/info/warn/error |