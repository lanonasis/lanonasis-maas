import { z } from 'zod';
import {
  MemoryType as CoreMemoryType,
  CreateMemoryRequestSchema as CoreCreateMemoryRequestSchema,
  UpdateMemoryRequestSchema as CoreUpdateMemoryRequestSchema,
  SearchMemoryRequestSchema as CoreSearchMemoryRequestSchema
} from '@lanonasis/ide-extension-core';

/**
 * Memory types for Lanonasis Memory Service
 */
export type MemoryType = z.infer<typeof CoreMemoryType>;

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
const coreCreate = CoreCreateMemoryRequestSchema.shape;
export const createMemorySchema = z.object({
  title: coreCreate.title,
  content: coreCreate.content,
  memory_type: CoreMemoryType.default('context'),
  tags: coreCreate.tags,
  topic_id: z.string().uuid().optional(),
  metadata: coreCreate.metadata
});

const coreUpdate = CoreUpdateMemoryRequestSchema.shape;
export const updateMemorySchema = z.object({
  title: coreUpdate.title,
  content: coreUpdate.content,
  memory_type: CoreMemoryType.optional(),
  tags: coreUpdate.tags,
  topic_id: z.string().uuid().nullable().optional(),
  metadata: coreUpdate.metadata
});

const coreSearch = CoreSearchMemoryRequestSchema.shape;
export const searchMemorySchema = z.object({
  query: coreSearch.query,
  memory_types: z.array(CoreMemoryType).optional(),
  tags: coreSearch.tags,
  topic_id: z.string().uuid().optional(),
  limit: coreSearch.limit,
  threshold: coreSearch.threshold
});