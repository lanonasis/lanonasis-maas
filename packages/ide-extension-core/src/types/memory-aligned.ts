import { z } from 'zod';

/**
 * Memory Types - Aligned with backend API
 */
export const MemoryType = z.enum([
  'context',
  'project',
  'knowledge',
  'reference',
  'personal',
  'workflow'
]);

export type MemoryType = z.infer<typeof MemoryType>;

/**
 * Memory Entry Schema - Aligned with backend API
 */
export const MemoryEntrySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  type: MemoryType,
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  embedding: z.array(z.number()).optional(),
  similarityScore: z.number().min(0).max(1).optional()
});

export type MemoryEntry = z.infer<typeof MemoryEntrySchema>;

/**
 * Create Memory Request Schema
 */
export const CreateMemoryRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  content: z.string().min(1, 'Content is required'),
  type: MemoryType.default('context'),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.unknown()).optional()
});

export type CreateMemoryRequest = z.infer<typeof CreateMemoryRequestSchema>;

/**
 * Update Memory Request Schema
 */
export const UpdateMemoryRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  type: MemoryType.optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

export type UpdateMemoryRequest = z.infer<typeof UpdateMemoryRequestSchema>;

/**
 * Search Memory Request Schema
 */
export const SearchMemoryRequestSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: MemoryType.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
});

export type SearchMemoryRequest = z.infer<typeof SearchMemoryRequestSchema>;

/**
 * List Memories Request Schema
 */
export const ListMemoriesRequestSchema = z.object({
  type: MemoryType.optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type ListMemoriesRequest = z.infer<typeof ListMemoriesRequestSchema>;

/**
 * Memory Search Result
 */
export interface MemorySearchResult extends MemoryEntry {
  similarityScore: number;
  matchedTerms?: string[];
  snippet?: string;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
