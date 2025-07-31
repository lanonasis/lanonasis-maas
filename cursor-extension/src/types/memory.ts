import { z } from 'zod';

/**
 * Memory types for Lanonasis Memory Service
 */
export type MemoryType = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  tags: string[];
  topic_id?: string | null;
  user_id: string;
  organization_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_accessed?: string;
  access_count: number;
}

export interface CreateMemoryRequest {
  title: string;
  content: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SearchMemoryRequest {
  query: string;
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string;
  limit?: number;
  threshold?: number;
}

export interface MemorySearchResult extends MemoryEntry {
  relevance_score: number;
}

export interface MemoryStats {
  total_memories: number;
  memories_by_type: Record<MemoryType, number>;
  total_size_bytes: number;
  avg_access_count: number;
  most_accessed_memory?: MemoryEntry;
  recent_memories: MemoryEntry[];
}

// Zod schemas for validation
export const createMemorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  memory_type: z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).default('context'),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  topic_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const updateMemorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  memory_type: z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  topic_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});

export const searchMemorySchema = z.object({
  query: z.string().min(1).max(1000),
  memory_types: z.array(z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'])).optional(),
  tags: z.array(z.string()).optional(),
  topic_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7)
});