import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     MemoryEntry:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         memory_type:
 *           type: string
 *           enum: [context, project, knowledge, reference, personal, workflow]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         topic_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         user_id:
 *           type: string
 *           format: uuid
 *         organization_id:
 *           type: string
 *           format: uuid
 *         metadata:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         last_accessed:
 *           type: string
 *           format: date-time
 *         access_count:
 *           type: integer
 *           minimum: 0
 */
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

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateMemoryRequest:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *           description: Title of the memory entry
 *           example: "React Performance Optimization Tips"
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 50000
 *           description: Main content of the memory entry
 *           example: "Use React.memo() to prevent unnecessary re-renders of expensive components. This is particularly useful for components that receive complex props."
 *         memory_type:
 *           type: string
 *           enum: [context, project, knowledge, reference, personal, workflow]
 *           default: context
 *           description: Type of memory for categorization
 *           example: "knowledge"
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 1
 *             maxLength: 50
 *           maxItems: 10
 *           description: Tags for organization and filtering
 *           example: ["react", "performance", "optimization", "frontend"]
 *         topic_id:
 *           type: string
 *           format: uuid
 *           description: Optional topic ID for grouping memories
 *           example: "550e8400-e29b-41d4-a716-446655440002"
 *         metadata:
 *           type: object
 *           description: Additional metadata for the memory
 *           example:
 *             source: "documentation"
 *             difficulty: "intermediate"
 *             last_updated: "2025-01-01"
 */
export const createMemorySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  memory_type: z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).default('context'),
  tags: z.array(z.string().min(1).max(50)).max(10).default([]),
  topic_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateMemoryRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 50000
 *         memory_type:
 *           type: string
 *           enum: [context, project, knowledge, reference, personal, workflow]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 1
 *             maxLength: 50
 *           maxItems: 10
 *         topic_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         metadata:
 *           type: object
 */
export const updateMemorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  memory_type: z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  topic_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional()
});

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchMemoryRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *         memory_types:
 *           type: array
 *           items:
 *             type: string
 *             enum: [context, project, knowledge, reference, personal, workflow]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         topic_id:
 *           type: string
 *           format: uuid
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         threshold:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *           default: 0.7
 */
export const searchMemorySchema = z.object({
  query: z.string().min(1).max(1000),
  memory_types: z.array(z.enum(['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'])).optional(),
  tags: z.array(z.string()).optional(),
  topic_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  threshold: z.number().min(0).max(1).default(0.7)
});

/**
 * @swagger
 * components:
 *   schemas:
 *     MemorySearchResult:
 *       allOf:
 *         - $ref: '#/components/schemas/MemoryEntry'
 *         - type: object
 *           properties:
 *             relevance_score:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               description: Semantic similarity score
 */
export interface MemorySearchResult extends MemoryEntry {
  relevance_score: number;
}

export type MemoryType = 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow';

export type CreateMemoryRequest = z.infer<typeof createMemorySchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemorySchema>;
export type SearchMemoryRequest = z.infer<typeof searchMemorySchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     MemoryStats:
 *       type: object
 *       properties:
 *         total_memories:
 *           type: integer
 *           description: Total number of memories in the organization
 *           example: 1250
 *         memories_by_type:
 *           type: object
 *           description: Memory count breakdown by type
 *           properties:
 *             context:
 *               type: integer
 *               example: 300
 *             project:
 *               type: integer
 *               example: 450
 *             knowledge:
 *               type: integer
 *               example: 200
 *             reference:
 *               type: integer
 *               example: 150
 *             personal:
 *               type: integer
 *               example: 100
 *             workflow:
 *               type: integer
 *               example: 50
 *         total_size_bytes:
 *           type: integer
 *           description: Total size of all memories in bytes
 *           example: 52428800
 *         avg_access_count:
 *           type: number
 *           description: Average access count across all memories
 *           example: 3.7
 *         most_accessed_memory:
 *           $ref: '#/components/schemas/MemoryEntry'
 *         recent_memories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/MemoryEntry'
 *           description: Recently created or updated memories
 */
export interface MemoryStats {
  total_memories: number;
  memories_by_type: Record<MemoryType, number>;
  total_size_bytes: number;
  avg_access_count: number;
  most_accessed_memory?: MemoryEntry;
  recent_memories: MemoryEntry[];
}