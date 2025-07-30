-- Aligned Schema for sd-ghost-protocol Integration
-- This schema aligns with the existing sd-ghost-protocol database

-- Enable necessary extensions (should already exist)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types (align with existing)
DO $$ BEGIN
    CREATE TYPE memory_type_enum AS ENUM ('conversation', 'knowledge', 'project', 'context', 'reference');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE memory_status_enum AS ENUM ('active', 'archived', 'draft', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Memory Topics (should already exist)
CREATE TABLE IF NOT EXISTS memory_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    user_id TEXT,
    parent_topic_id UUID REFERENCES memory_topics(id),
    is_system BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main Memory Entries Table (should already exist)
CREATE TABLE IF NOT EXISTS memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    embedding VECTOR(1536), -- pgvector for OpenAI embeddings
    memory_type memory_type_enum,
    status memory_status_enum DEFAULT 'active',
    relevance_score NUMERIC,
    access_count BIGINT DEFAULT 0,
    last_accessed TIMESTAMPTZ,
    user_id TEXT, -- References auth.users(id)
    topic_id UUID REFERENCES memory_topics(id),
    project_ref TEXT,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory Associations (should already exist)
CREATE TABLE IF NOT EXISTS memory_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_memory_id UUID REFERENCES memory_entries(id),
    target_memory_id UUID REFERENCES memory_entries(id),
    association_type TEXT,
    strength REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simple memories table for backwards compatibility (should already exist)
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    session_id TEXT NOT NULL,
    content_type TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding_hash TEXT NOT NULL,
    relevance_score REAL DEFAULT 0.0,
    client_type TEXT DEFAULT 'unknown',
    client_version TEXT DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Sessions (should already exist)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    messages JSONB NOT NULL DEFAULT '[]',
    last_message_at TIMESTAMPTZ,
    model_used TEXT DEFAULT 'openai',
    conversation_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Keys for our service (new addition for MaaS API access)
CREATE TABLE IF NOT EXISTS maas_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL, -- References auth.users(id)
    permissions JSONB DEFAULT '{"read": true, "write": false, "delete": false}',
    last_used TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Service configuration for MaaS integration
CREATE TABLE IF NOT EXISTS maas_service_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE, -- References auth.users(id)
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    memory_limit INTEGER DEFAULT 100,
    api_calls_per_minute INTEGER DEFAULT 60,
    features JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (may already exist)
CREATE INDEX IF NOT EXISTS idx_memory_entries_embedding 
    ON memory_entries USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_memory_entries_user_id ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_topic_id ON memory_entries(topic_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_status ON memory_entries(status);
CREATE INDEX IF NOT EXISTS idx_memory_entries_memory_type ON memory_entries(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_entries_created_at ON memory_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_tags ON memory_entries USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_memories_session_id ON memories(session_id);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
CREATE INDEX IF NOT EXISTS idx_memories_content_search ON memories USING gin(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_memory_topics_user_id ON memory_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_topics_parent ON memory_topics(parent_topic_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- Vector search function for memory_entries (aligned with existing structure)
CREATE OR REPLACE FUNCTION search_memory_entries(
    query_embedding VECTOR(1536),
    user_id_param TEXT,
    similarity_threshold FLOAT DEFAULT 0.7,
    match_count INTEGER DEFAULT 20,
    memory_types TEXT[] DEFAULT NULL,
    topic_id_param UUID DEFAULT NULL,
    status_filter TEXT DEFAULT 'active'
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    summary TEXT,
    memory_type memory_type_enum,
    status memory_status_enum,
    relevance_score NUMERIC,
    access_count BIGINT,
    last_accessed TIMESTAMPTZ,
    user_id TEXT,
    topic_id UUID,
    project_ref TEXT,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    similarity_score FLOAT
) LANGUAGE SQL STABLE AS $$
    SELECT 
        me.id,
        me.title,
        me.content,
        me.summary,
        me.memory_type,
        me.status,
        me.relevance_score,
        me.access_count,
        me.last_accessed,
        me.user_id,
        me.topic_id,
        me.project_ref,
        me.tags,
        me.metadata,
        me.created_at,
        me.updated_at,
        1 - (me.embedding <=> query_embedding) AS similarity_score
    FROM memory_entries me
    WHERE 
        me.user_id = user_id_param
        AND me.status = status_filter::memory_status_enum
        AND (memory_types IS NULL OR me.memory_type = ANY(memory_types::memory_type_enum[]))
        AND (topic_id_param IS NULL OR me.topic_id = topic_id_param)
        AND me.embedding IS NOT NULL
        AND (1 - (me.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY me.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Function to update access tracking
CREATE OR REPLACE FUNCTION update_memory_access(memory_id_param UUID)
RETURNS VOID LANGUAGE SQL AS $$
    UPDATE memory_entries 
    SET 
        last_accessed = NOW(),
        access_count = access_count + 1
    WHERE id = memory_id_param;
$$;

-- Function to get memory statistics for a user
CREATE OR REPLACE FUNCTION get_user_memory_stats(user_id_param TEXT)
RETURNS TABLE (
    total_memories BIGINT,
    memories_by_type JSONB,
    total_topics BIGINT,
    most_accessed_memory UUID,
    recent_memories UUID[]
) LANGUAGE SQL STABLE AS $$
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            jsonb_object_agg(memory_type, type_count) as by_type,
            (SELECT COUNT(*) FROM memory_topics WHERE user_id = user_id_param) as topics
        FROM (
            SELECT 
                memory_type,
                COUNT(*) as type_count
            FROM memory_entries 
            WHERE user_id = user_id_param AND status = 'active'
            GROUP BY memory_type
        ) t
    ),
    most_accessed AS (
        SELECT id as memory_id
        FROM memory_entries 
        WHERE user_id = user_id_param AND status = 'active'
        ORDER BY access_count DESC, last_accessed DESC NULLS LAST
        LIMIT 1
    ),
    recent AS (
        SELECT array_agg(id ORDER BY created_at DESC) as memory_ids
        FROM (
            SELECT id, created_at
            FROM memory_entries 
            WHERE user_id = user_id_param AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 5
        ) r
    )
    SELECT 
        s.total,
        s.by_type,
        s.topics,
        ma.memory_id,
        r.memory_ids
    FROM stats s
    CROSS JOIN most_accessed ma
    CROSS JOIN recent r;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (if they don't exist)
DO $$ BEGIN
    CREATE TRIGGER update_memory_entries_updated_at 
        BEFORE UPDATE ON memory_entries 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_memory_topics_updated_at 
        BEFORE UPDATE ON memory_topics 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;