import { z } from 'zod';

/**
 * Memory types supported by the service
 */
export const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'] as const;
export type MemoryType = typeof MEMORY_TYPES[number];

/**
 * Memory status values
 */
export const MEMORY_STATUSES = ['active', 'archived', 'draft', 'deleted'] as const;
export type MemoryStatus = typeof MEMORY_STATUSES[number];

/**
 * Core memory entry interface
 */
export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  summary?: string;
  memory_type: MemoryType;
  status: MemoryStatus;
  relevance_score?: number;
  access_count: number;
  last_accessed?: string;
  user_id: string;
  topic_id?: string;
  project_ref?: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Memory topic for organization
 */
export interface MemoryTopic {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  user_id: string;
  parent_topic_id?: string;
  is_system: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Memory search result with similarity score
 */
export interface MemorySearchResult extends MemoryEntry {
  similarity_score: number;
}

/**
 * User memory statistics
 */
export interface UserMemoryStats {
  total_memories: number;
  memories_by_type: Record<MemoryType, number>;
  total_topics: number;
  most_accessed_memory?: string;
  recent_memories: string[];
}

/**
 * Validation schemas using Zod
 */

export const createMemorySchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(50000),
  summary: z.string().max(1000).optional(),
  memory_type: z.enum(MEMORY_TYPES).default('context'),
  topic_id: z.string().uuid().optional(),
  project_ref: z.string().max(100).optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).default([]),
  metadata: z.record(z.unknown()).optional()
});

export const updateMemorySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(50000).optional(),
  summary: z.string().max(1000).optional(),
  memory_type: z.enum(MEMORY_TYPES).optional(),
  status: z.enum(MEMORY_STATUSES).optional(),
  topic_id: z.string().uuid().nullable().optional(),
  project_ref: z.string().max(100).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const searchMemorySchema = z.object({
  query: z.string().min(1).max(1000),
  memory_types: z.array(z.enum(MEMORY_TYPES)).optional(),
  tags: z.array(z.string()).optional(),
  topic_id: z.string().uuid().optional(),
  project_ref: z.string().optional(),
  status: z.enum(MEMORY_STATUSES).default('active'),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7)
});

export const createTopicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parent_topic_id: z.string().uuid().optional()
});

/**
 * Inferred types from schemas
 */
export type CreateMemoryRequest = z.infer<typeof createMemorySchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemorySchema>;
export type SearchMemoryRequest = z.infer<typeof searchMemorySchema>;
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;