-- Enhanced Database Schema with mem0-inspired features
-- Builds upon existing schema.sql with advanced state management and access control

-- Add memory state enum (inspired by mem0's state management)
CREATE TYPE memory_state AS ENUM ('active', 'paused', 'archived', 'deleted');

-- Add memory state column to existing memory_entries table
ALTER TABLE memory_entries 
ADD COLUMN IF NOT EXISTS state memory_state NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS app_id VARCHAR(255) DEFAULT 'default';

-- Memory state transitions table (audit trail for state changes)
CREATE TABLE IF NOT EXISTS memory_state_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
    from_state memory_state NOT NULL,
    to_state memory_state NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Memory access control rules (inspired by mem0's ACL system)
CREATE TABLE IF NOT EXISTS memory_access_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID REFERENCES memory_entries(id) ON DELETE CASCADE,
    app_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'write', 'delete', 'admin')),
    granted BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enhanced indexes for new features
CREATE INDEX IF NOT EXISTS idx_memory_entries_state ON memory_entries(state);
CREATE INDEX IF NOT EXISTS idx_memory_entries_app_id ON memory_entries(app_id);
CREATE INDEX IF NOT EXISTS idx_memory_state_transitions_memory_id ON memory_state_transitions(memory_id);
CREATE INDEX IF NOT EXISTS idx_memory_access_rules_memory_id ON memory_access_rules(memory_id);

-- Function to update memory state with transition logging
CREATE OR REPLACE FUNCTION update_memory_state(
    memory_id_param UUID,
    new_state memory_state,
    reason_param TEXT DEFAULT NULL,
    changed_by_param UUID DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    current_state memory_state;
BEGIN
    SELECT state INTO current_state FROM memory_entries WHERE id = memory_id_param;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    
    UPDATE memory_entries 
    SET state = new_state, updated_at = NOW()
    WHERE id = memory_id_param;
    
    INSERT INTO memory_state_transitions (memory_id, from_state, to_state, reason, changed_by)
    VALUES (memory_id_param, current_state, new_state, reason_param, changed_by_param);
    
    RETURN TRUE;
END;
$$;