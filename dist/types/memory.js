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
 *           maxLength: 200
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 50000
 *         memory_type:
 *           type: string
 *           enum: [context, project, knowledge, reference, personal, workflow]
 *           default: context
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
 *         metadata:
 *           type: object
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
//# sourceMappingURL=memory.js.map