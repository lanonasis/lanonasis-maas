# CLAUDE.md - Aligned with sd-ghost-protocol

This file provides guidance to Claude Code (claude.ai/code) when working with the **Memory as a Service (MaaS)** microservice that integrates with the existing **sd-ghost-protocol** system.

## Integration Context

This memory service is designed to plug into the existing **sd-ghost-protocol** repository at:
`https://github.com/thefixer3x/sd-ghost-protocol.git`

The service acts as an enterprise API layer on top of the existing sophisticated vector-enabled memory system.

## Development Commands

### Main Service
- **Development**: `npm run dev` - Start development server with hot reload
- **Build**: `npm run build` - Compile TypeScript to JavaScript
- **Start**: `npm start` - Start production server
- **Type Check**: `npm run type-check` - Run TypeScript type checking
- **Lint**: `npm run lint` - Run ESLint
- **Test**: `npm test` - Run all tests
- **Test Coverage**: `npm run test:coverage` - Run tests with coverage report

### Database Operations
- **Apply aligned schema**: Apply `src/db/schema-aligned.sql` to existing Supabase
- **Note**: Most tables already exist in sd-ghost-protocol - only adds MaaS-specific tables

### Docker & Deployment
- **Local Development**: `docker-compose up`
- **Production**: `docker-compose -f docker-compose.prod.yml up`
- **Kubernetes Deploy**: `kubectl apply -f k8s/`

## Existing Database Schema (sd-ghost-protocol)

### Primary Tables (Already Exist)
- **memory_entries**: Main vector storage with VECTOR(1536) embeddings
- **memory_topics**: Hierarchical topic organization
- **memory_associations**: Memory relationship mapping
- **memories**: Simple session-based memories (legacy)
- **chat_sessions**: Chat conversation storage
- **auth.users**: Supabase authentication (system table)

### Memory Types (Aligned)
- **conversation**: Chat and dialogue memories
- **knowledge**: Educational and reference information
- **project**: Project-specific documentation
- **context**: General contextual information
- **reference**: Quick reference materials

### Memory Status (Aligned)
- **active**: Currently available memories
- **archived**: Archived but accessible
- **draft**: Work-in-progress memories
- **deleted**: Soft-deleted memories

## New MaaS Tables (Added by This Service)

### maas_api_keys
API key management for programmatic access
```sql
CREATE TABLE maas_api_keys (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE,
    user_id TEXT, -- References auth.users(id)
    permissions JSONB,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN
);
```

### maas_service_config
User service configuration and plan management
```sql
CREATE TABLE maas_service_config (
    id UUID PRIMARY KEY,
    user_id TEXT UNIQUE, -- References auth.users(id)
    plan TEXT DEFAULT 'free',
    memory_limit INTEGER,
    api_calls_per_minute INTEGER,
    features JSONB,
    settings JSONB
);
```

## Architecture Integration

### 1. Authentication Layer
- **Supabase Auth**: Uses existing `auth.users` table
- **JWT Tokens**: Supabase-issued JWT tokens
- **API Keys**: Custom API key system for programmatic access
- **Plan Management**: Free/Pro/Enterprise tiers

### 2. Memory Service (`src/services/memoryService-aligned.ts`)
- **Vector Search**: Uses existing `search_memory_entries()` function
- **CRUD Operations**: Works with existing `memory_entries` table
- **Topic Management**: Integrates with `memory_topics` table
- **Access Tracking**: Updates `access_count` and `last_accessed`

### 3. API Endpoints (Aligned)
- **Memory Operations**: CRUD for `memory_entries`
- **Topic Management**: Operations on `memory_topics`
- **Search**: Vector similarity search using existing functions
- **Statistics**: User memory analytics

### 4. CLI Tool (Updated)
- **Authentication**: Works with Supabase auth tokens
- **Memory Types**: Uses aligned enum values
- **Topic Support**: Manages hierarchical topics
- **Project References**: Supports project-based organization

## Environment Variables

### Required (Aligned)
- `SUPABASE_URL`: Existing sd-ghost-protocol Supabase URL
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: OpenAI API key (same as existing system)

### New for MaaS Service
- `JWT_SECRET`: For API token verification (if needed)
- `REDIS_URL`: Optional caching layer
- `LOG_LEVEL`: Service logging level

## Key File Locations

### Aligned Services
- **Memory service**: `src/services/memoryService-aligned.ts`
- **Authentication**: `src/middleware/auth-aligned.ts`
- **Types**: `src/types/memory-aligned.ts`
- **Schema**: `src/db/schema-aligned.sql`

### API Routes (Updated)
- **Memory operations**: `src/routes/memory.ts` (uses aligned service)
- **Topics**: Integrated in memory routes
- **Health**: `src/routes/health.ts`
- **Metrics**: `src/routes/metrics.ts`

### Original Files (Still Relevant)
- **Server**: `src/server.ts`
- **Configuration**: `src/config/environment.ts`
- **Error handling**: `src/middleware/errorHandler.ts`
- **Logging**: `src/utils/logger.ts`

## Integration Points

### 1. Database Functions (Use Existing)
```sql
-- Vector search (already exists)
search_memory_entries(query_embedding, user_id, threshold, ...)

-- Access tracking (already exists)
update_memory_access(memory_id)

-- Statistics (new, added by MaaS)
get_user_memory_stats(user_id)
```

### 2. Memory Types (Aligned with Existing)
```typescript
type MemoryType = 'conversation' | 'knowledge' | 'project' | 'context' | 'reference';
type MemoryStatus = 'active' | 'archived' | 'draft' | 'deleted';
```

### 3. Authentication Flow
1. User authenticates with Supabase (existing system)
2. MaaS service validates token with Supabase
3. Service checks/creates user config in `maas_service_config`
4. Operations performed with user context

### 4. Vector Embeddings
- **Dimension**: VECTOR(1536) - matches existing OpenAI embeddings
- **Model**: text-embedding-ada-002 (same as existing)
- **Search**: Uses existing pgvector indexes and functions

## API Usage Examples (Aligned)

### Authentication
```bash
# Use Supabase auth token (from existing system)
Authorization: Bearer <supabase-jwt-token>
```

### Memory Operations
```bash
# Create memory (uses memory_entries table)
POST /api/v1/memory
{
  "title": "Project Notes",
  "content": "Important project information",
  "memory_type": "project",
  "topic_id": "uuid-topic-id",
  "tags": ["important", "project"]
}

# Search memories (uses existing vector search)
POST /api/v1/memory/search
{
  "query": "project planning",
  "memory_types": ["project", "context"],
  "limit": 10,
  "threshold": 0.7
}
```

### Topic Management
```bash
# Create topic (uses memory_topics table)
POST /api/v1/topics
{
  "name": "Project Alpha",
  "description": "Alpha project documentation",
  "color": "#3B82F6"
}
```

## CLI Usage (Aligned)

```bash
# Initialize with Supabase credentials
memory init --api-url https://your-supabase-url.com

# Authenticate (uses Supabase auth)
memory login

# Create memory with aligned types
memory create -t "Meeting Notes" -c "Discussion points" --type conversation

# Search with existing vector search
memory search "project planning" --type project,context

# Topic management
memory topic create "Development" --description "Dev docs"
memory topic list
```

## Deployment Considerations

### 1. Database Migration
- Most tables already exist in sd-ghost-protocol
- Only need to add MaaS-specific tables (`maas_api_keys`, `maas_service_config`)
- Apply `schema-aligned.sql` to existing database

### 2. Environment Alignment
- Use same Supabase instance as sd-ghost-protocol
- Share OpenAI API key if desired
- Configure service-specific settings separately

### 3. Monitoring Integration
- Can monitor existing memory operations
- Adds API-specific metrics
- Integrates with existing logging if present

## Development Notes

### Working with Existing Schema
- **DO NOT** modify existing tables (`memory_entries`, `memory_topics`, etc.)
- **DO** extend functionality through new service tables
- **DO** use existing vector search functions
- **DO** respect existing data types and constraints

### Authentication Flow
- Service integrates with existing Supabase auth
- Users don't need separate registration for MaaS
- API keys are additional layer for programmatic access
- Plan management is service-specific

### Performance Considerations
- Leverages existing vector indexes
- Uses existing embedding functions
- Adds minimal overhead to existing operations
- Caching layer is optional but recommended

### Testing with Existing Data
- Service works with existing memory entries
- Can test with production data (read-only operations)
- Vector search uses existing embeddings
- Topic hierarchy is preserved

## Future Integration Opportunities

### 1. Agent Banks Integration
- Can integrate with existing `agent_banks.memories` table
- Support agent-specific memory contexts
- Cross-reference agent and user memories

### 2. Chat Session Enhancement
- Link memories to chat sessions
- Automatic memory creation from conversations
- Context-aware responses using memory search

### 3. Advanced Analytics
- Memory usage patterns across existing data
- Topic relationship analysis
- User behavior insights

This MaaS service provides an enterprise API layer while fully respecting and integrating with the sophisticated memory system already built in sd-ghost-protocol.