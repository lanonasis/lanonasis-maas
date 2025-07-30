import { z } from 'zod';
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
 *           maxLength: 500
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 50000
 *         summary:
 *           type: string
 *           maxLength: 1000
 *         memory_type:
 *           type: string
 *           enum: [conversation, knowledge, project, context, reference]
 *           default: context
 *         topic_id:
 *           type: string
 *           format: uuid
 *         project_ref:
 *           type: string
 *           maxLength: 100
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 1
 *             maxLength: 50
 *           maxItems: 20
 *         metadata:
 *           type: object
 */
export const createMemorySchema = z.object({
    title: z.string().min(1).max(500),
    content: z.string().min(1).max(50000),
    summary: z.string().max(1000).optional(),
    memory_type: z.enum(['conversation', 'knowledge', 'project', 'context', 'reference']).default('context'),
    topic_id: z.string().uuid().optional(),
    project_ref: z.string().max(100).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).default([]),
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
 *           maxLength: 500
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 50000
 *         summary:
 *           type: string
 *           maxLength: 1000
 *         memory_type:
 *           type: string
 *           enum: [conversation, knowledge, project, context, reference]
 *         status:
 *           type: string
 *           enum: [active, archived, draft, deleted]
 *         topic_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         project_ref:
 *           type: string
 *           maxLength: 100
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             minLength: 1
 *             maxLength: 50
 *           maxItems: 20
 *         metadata:
 *           type: object
 */
export const updateMemorySchema = z.object({
    title: z.string().min(1).max(500).optional(),
    content: z.string().min(1).max(50000).optional(),
    summary: z.string().max(1000).optional(),
    memory_type: z.enum(['conversation', 'knowledge', 'project', 'context', 'reference']).optional(),
    status: z.enum(['active', 'archived', 'draft', 'deleted']).optional(),
    topic_id: z.string().uuid().nullable().optional(),
    project_ref: z.string().max(100).nullable().optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
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
 *             enum: [conversation, knowledge, project, context, reference]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         topic_id:
 *           type: string
 *           format: uuid
 *         project_ref:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, archived, draft, deleted]
 *           default: active
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
    memory_types: z.array(z.enum(['conversation', 'knowledge', 'project', 'context', 'reference'])).optional(),
    tags: z.array(z.string()).optional(),
    topic_id: z.string().uuid().optional(),
    project_ref: z.string().optional(),
    status: z.enum(['active', 'archived', 'draft', 'deleted']).default('active'),
    limit: z.number().int().min(1).max(100).default(20),
    threshold: z.number().min(0).max(1).default(0.7)
});
/**
 * @swagger
 * components:
 *   schemas:
 *     CreateTopicRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description:
 *           type: string
 *           maxLength: 500
 *         color:
 *           type: string
 *           pattern: '^#[0-9A-Fa-f]{6}$'
 *         icon:
 *           type: string
 *           maxLength: 50
 *         parent_topic_id:
 *           type: string
 *           format: uuid
 */
export const createTopicSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
    parent_topic_id: z.string().uuid().optional()
});
//# sourceMappingURL=memory-aligned.js.map