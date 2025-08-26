#!/bin/bash

# Supabase Database Sync Script for Vibe Memory (MaaS)
# This script sets up the complete database schema and functions in Supabase

set -e

echo "🚀 Vibe Memory - Supabase Database Sync"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required environment variables are set
check_env_vars() {
    echo -e "${BLUE}📋 Checking environment variables...${NC}"
    
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ SUPABASE_URL environment variable is required${NC}"
        echo "   Set it with: export SUPABASE_URL=https://your-project.supabase.co"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_KEY" ]; then
        echo -e "${RED}❌ SUPABASE_SERVICE_KEY environment variable is required${NC}"
        echo "   Set it with: export SUPABASE_SERVICE_KEY=your-service-role-key"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment variables OK${NC}"
}

# Function to execute SQL with error handling
execute_sql() {
    local sql_file=$1
    local description=$2
    
    echo -e "${BLUE}📝 $description...${NC}"
    
    if [ ! -f "$sql_file" ]; then
        echo -e "${RED}❌ SQL file not found: $sql_file${NC}"
        return 1
    fi
    
    # Use curl to execute SQL via Supabase REST API
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_SERVICE_KEY" \
        -d @- \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" <<EOF
{
  "sql": "$(cat $sql_file | sed 's/"/\\"/g' | tr '\n' ' ')"
}
EOF
    )
    
    # Extract HTTP status
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')
    
    if [ $http_code -eq 200 ] || [ $http_code -eq 201 ]; then
        echo -e "${GREEN}✅ $description completed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed (HTTP $http_code)${NC}"
        echo -e "${RED}Response: $body${NC}"
        return 1
    fi
}

# Alternative method using psql if available
execute_sql_psql() {
    local sql_file=$1
    local description=$2
    
    echo -e "${BLUE}📝 $description...${NC}"
    
    if ! command -v psql &> /dev/null; then
        echo -e "${YELLOW}⚠️  psql not found, using curl method${NC}"
        execute_sql "$sql_file" "$description"
        return $?
    fi
    
    # Extract database connection info from SUPABASE_URL
    db_host=$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*|.supabase.co|')
    
    # Use psql with SSL
    PGPASSWORD="$SUPABASE_PASSWORD" psql \
        -h "$db_host" \
        -p 5432 \
        -U postgres \
        -d postgres \
        -f "$sql_file" \
        --set sslmode=require
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $description completed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Create temporary SQL files for step-by-step execution
create_temp_sql_files() {
    echo -e "${BLUE}📝 Creating temporary SQL files...${NC}"
    
    mkdir -p tmp/sql
    
    # Split main schema into smaller parts for better error handling
    
    # 1. Extensions and types
    cat > tmp/sql/01_extensions_types.sql << 'EOF'
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Custom types
DO $$ BEGIN
    CREATE TYPE memory_type AS ENUM ('context', 'project', 'knowledge', 'reference', 'personal', 'workflow');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
EOF

    # 2. Core tables
    cat > tmp/sql/02_core_tables.sql << 'EOF'
-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    plan plan_type NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT organizations_name_check CHECK (LENGTH(name) >= 2)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'user',
    plan plan_type NOT NULL DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    color VARCHAR(7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT topics_name_length CHECK (LENGTH(name) >= 1),
    CONSTRAINT topics_color_format CHECK (color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$'),
    UNIQUE(organization_id, name)
);
EOF

    # 3. Memory tables
    cat > tmp/sql/03_memory_tables.sql << 'EOF'
-- Memory entries table
CREATE TABLE IF NOT EXISTS memory_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    memory_type memory_type NOT NULL DEFAULT 'context',
    tags TEXT[] DEFAULT '{}',
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT memory_entries_title_length CHECK (LENGTH(title) >= 1),
    CONSTRAINT memory_entries_content_length CHECK (LENGTH(content) >= 1),
    CONSTRAINT memory_entries_access_count_positive CHECK (access_count >= 0)
);

-- Memory versions table
CREATE TABLE IF NOT EXISTS memory_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    memory_type memory_type NOT NULL,
    tags TEXT[] DEFAULT '{}',
    topic_id UUID,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_number INTEGER NOT NULL,
    
    -- Constraints
    UNIQUE(memory_id, version_number)
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '{"read": true, "write": false, "delete": false}',
    last_used TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    CONSTRAINT api_keys_name_length CHECK (LENGTH(name) >= 1)
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
EOF

    # 4. Indexes
    cat > tmp/sql/04_indexes.sql << 'EOF'
-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organization_role ON users(organization_id, role);

CREATE INDEX IF NOT EXISTS idx_topics_organization_id ON topics(organization_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);

CREATE INDEX IF NOT EXISTS idx_memory_entries_organization_id ON memory_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_user_id ON memory_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_memory_type ON memory_entries(memory_type);
CREATE INDEX IF NOT EXISTS idx_memory_entries_topic_id ON memory_entries(topic_id);
CREATE INDEX IF NOT EXISTS idx_memory_entries_created_at ON memory_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_updated_at ON memory_entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_last_accessed ON memory_entries(last_accessed DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_memory_entries_access_count ON memory_entries(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_memory_entries_tags ON memory_entries USING GIN(tags);

-- Vector similarity index
DO $$ BEGIN
    CREATE INDEX idx_memory_entries_embedding ON memory_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_memory_versions_memory_id ON memory_versions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_versions_created_at ON memory_versions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

CREATE INDEX IF NOT EXISTS idx_usage_analytics_organization_id ON usage_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_action ON usage_analytics(action);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_timestamp ON usage_analytics(timestamp DESC);
EOF

    # 5. Functions
    cat > tmp/sql/05_functions.sql << 'EOF'
-- Vector search function
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20,
  organization_id_param uuid DEFAULT NULL,
  memory_types_param memory_type[] DEFAULT NULL,
  tags_param text[] DEFAULT NULL,
  topic_id_param uuid DEFAULT NULL,
  user_id_param uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title varchar(200),
  content text,
  memory_type memory_type,
  tags text[],
  topic_id uuid,
  user_id uuid,
  organization_id uuid,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_accessed timestamptz,
  access_count integer,
  relevance_score float
) LANGUAGE sql STABLE AS $$
  SELECT
    me.id,
    me.title,
    me.content,
    me.memory_type,
    me.tags,
    me.topic_id,
    me.user_id,
    me.organization_id,
    me.metadata,
    me.created_at,
    me.updated_at,
    me.last_accessed,
    me.access_count,
    1 - (me.embedding <=> query_embedding) AS relevance_score
  FROM memory_entries me
  WHERE
    (organization_id_param IS NULL OR me.organization_id = organization_id_param)
    AND (memory_types_param IS NULL OR me.memory_type = ANY(memory_types_param))
    AND (tags_param IS NULL OR me.tags && tags_param)
    AND (topic_id_param IS NULL OR me.topic_id = topic_id_param)
    AND (user_id_param IS NULL OR me.user_id = user_id_param)
    AND (me.embedding <=> query_embedding) < (1 - match_threshold)
    AND me.embedding IS NOT NULL
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Access tracking function
CREATE OR REPLACE FUNCTION update_memory_access(memory_id_param uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE memory_entries 
  SET 
    last_accessed = NOW(),
    access_count = access_count + 1
  WHERE id = memory_id_param;
$$;

-- Updated timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Memory versioning function
CREATE OR REPLACE FUNCTION create_memory_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM memory_versions
  WHERE memory_id = NEW.id;
  
  INSERT INTO memory_versions (
    memory_id, title, content, memory_type, tags, topic_id, 
    metadata, created_by, version_number
  ) VALUES (
    NEW.id, NEW.title, NEW.content, NEW.memory_type, NEW.tags, 
    NEW.topic_id, NEW.metadata, NEW.user_id, next_version
  );
  
  RETURN NEW;
END;
$$;
EOF

    # 6. Triggers
    cat > tmp/sql/06_triggers.sql << 'EOF'
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS memory_version_trigger ON memory_entries;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_topics_updated_at ON topics;
DROP TRIGGER IF EXISTS update_memory_entries_updated_at ON memory_entries;

-- Create triggers
CREATE TRIGGER memory_version_trigger
  AFTER UPDATE ON memory_entries
  FOR EACH ROW
  EXECUTE FUNCTION create_memory_version();

CREATE TRIGGER update_organizations_updated_at 
  BEFORE UPDATE ON organizations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_topics_updated_at 
  BEFORE UPDATE ON topics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_entries_updated_at 
  BEFORE UPDATE ON memory_entries 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF

    echo -e "${GREEN}✅ Temporary SQL files created${NC}"
}

# Execute the sync
main() {
    echo -e "${YELLOW}🔧 Starting Supabase sync for Vibe Memory...${NC}"
    
    # Check environment
    check_env_vars
    
    # Create SQL files
    create_temp_sql_files
    
    echo -e "${BLUE}📝 Executing database schema...${NC}"
    
    # Execute SQL files in order
    execute_sql "tmp/sql/01_extensions_types.sql" "Creating extensions and types" || exit 1
    execute_sql "tmp/sql/02_core_tables.sql" "Creating core tables" || exit 1
    execute_sql "tmp/sql/03_memory_tables.sql" "Creating memory tables" || exit 1
    execute_sql "tmp/sql/04_indexes.sql" "Creating indexes" || exit 1
    execute_sql "tmp/sql/05_functions.sql" "Creating functions" || exit 1
    execute_sql "tmp/sql/06_triggers.sql" "Creating triggers" || exit 1
    
    # Cleanup
    rm -rf tmp/
    
    echo -e "${GREEN}🎉 Supabase sync completed successfully!${NC}"
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "${YELLOW}1. Update your .env file with Supabase credentials${NC}"
    echo -e "${YELLOW}2. Run the memory service: npm run dev${NC}"
    echo -e "${YELLOW}3. Test the API endpoints${NC}"
    echo -e "${YELLOW}4. Configure the CLI: npx @lanonasis/cli config set api-url <your-service-url>${NC}"
}

# Script help
show_help() {
    echo "Vibe Memory - Supabase Database Sync Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Environment Variables (Required):"
    echo "  SUPABASE_URL          Your Supabase project URL"
    echo "  SUPABASE_SERVICE_KEY  Your Supabase service role key"
    echo "  SUPABASE_PASSWORD     Your database password (optional, for psql)"
    echo ""
    echo "Example:"
    echo "  export SUPABASE_URL=https://your-project.supabase.co"
    echo "  export SUPABASE_SERVICE_KEY=your-service-role-key"
    echo "  $0"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac