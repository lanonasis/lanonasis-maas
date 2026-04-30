# ADR-002: Vector Storage with pgvector

**Status:** Accepted
**Date:** 2025-02-10 (original), Updated 2026-04-30

## Context

The memory service needs to store and search semantic vectors for similarity matching. We evaluated several approaches for vector storage.

## Decision

**Use Supabase PostgreSQL with pgvector extension** for all vector storage and similarity search.

### Why Supabase + pgvector?

1. **PostgreSQL native** - No separate vector database to operate
2. **pgvector extension** - 95% similarity accuracy, good performance
3. **Supabase managed** - Handles backups, scaling, maintenance
4. **RLS policies** - Built-in multi-tenant isolation at database level
5. **Cost effective** - Included in Supabase tier, no separate vector DB cost

## Alternatives Considered

### Pinecone
- **Pros:** Purpose-built vector DB, high accuracy
- **Cons:** Separate service to manage, cost at scale, added complexity

### Weaviate
- **Pros:** Open source, good performance
- **Cons:** Additional infrastructure, more complex deployment

### Chroma
- **Pros:** Simple, good for development
- **Cons:** Not production-ready for enterprise, no multi-tenancy

### OpenAI Embeddings API only
- **Pros:** Simple, managed
- **Cons:** No control over storage, latency for every search, cost at scale

## Implementation

### Vector Configuration
- Model: `text-embedding-ada-002` (OpenAI)
- Dimension: 1536
- Metric: `cosine` similarity
- Threshold: 0.7 (configurable)

### Database Schema
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE memory_entries (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON memory_entries USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Consequences

**Positive:**
- Single database for all data (memory + metadata)
- RLS policies enforce tenant isolation
- Familiar SQL for queries
- Supabase handles operational burden

**Negative:**
- pgvector not as accurate as dedicated vector DBs at very high dimensions
- Need to manage embedding generation separately
- Vector index maintenance on large datasets