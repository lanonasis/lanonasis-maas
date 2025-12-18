"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTopicSchema = exports.searchMemorySchema = exports.updateMemorySchema = exports.createMemorySchema = void 0;
const zod_1 = require("zod");
const ide_extension_core_1 = require("@lanonasis/ide-extension-core");
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
const coreCreate = ide_extension_core_1.CreateMemoryRequestSchema.shape;
const ExtendedMemoryType = zod_1.z.union([ide_extension_core_1.MemoryType, zod_1.z.literal('conversation')]);
exports.createMemorySchema = zod_1.z.object({
    title: coreCreate.title.max(500),
    content: coreCreate.content.max(50000),
    summary: zod_1.z.string().max(1000).optional(),
    memory_type: ExtendedMemoryType.default('context'),
    topic_id: zod_1.z.string().uuid().optional(),
    project_ref: zod_1.z.string().max(100).optional(),
    tags: coreCreate.tags.max(20),
    metadata: coreCreate.metadata
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
const coreUpdate = ide_extension_core_1.UpdateMemoryRequestSchema.shape;
exports.updateMemorySchema = zod_1.z.object({
    title: coreUpdate.title?.max(500),
    content: coreUpdate.content?.max(50000),
    summary: zod_1.z.string().max(1000).optional(),
    memory_type: ExtendedMemoryType.optional(),
    status: zod_1.z.enum(['active', 'archived', 'draft', 'deleted']).optional(),
    topic_id: zod_1.z.string().uuid().nullable().optional(),
    project_ref: zod_1.z.string().max(100).nullable().optional(),
    tags: coreUpdate.tags?.max(20),
    metadata: coreUpdate.metadata
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
const coreSearch = ide_extension_core_1.SearchMemoryRequestSchema.shape;
exports.searchMemorySchema = zod_1.z.object({
    query: coreSearch.query.max(1000),
    memory_types: zod_1.z.array(ExtendedMemoryType).optional(),
    tags: coreSearch.tags,
    topic_id: zod_1.z.string().uuid().optional(),
    project_ref: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'archived', 'draft', 'deleted']).default('active'),
    limit: coreSearch.limit,
    threshold: coreSearch.threshold
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
exports.createTopicSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: zod_1.z.string().max(50).optional(),
    parent_topic_id: zod_1.z.string().uuid().optional()
});
//# sourceMappingURL=memory-aligned.js.map