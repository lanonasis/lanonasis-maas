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
    topic_id?: string;
    user_id: string;
    organization_id: string;
    metadata?: Record<string, any>;
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
export declare const createMemorySchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    memory_type: z.ZodDefault<z.ZodEnum<["context", "project", "knowledge", "reference", "personal", "workflow"]>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    topic_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    memory_type: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow";
    tags: string[];
    topic_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    title: string;
    content: string;
    memory_type?: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow" | undefined;
    tags?: string[] | undefined;
    topic_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
}>;
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
export declare const updateMemorySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodOptional<z.ZodEnum<["context", "project", "knowledge", "reference", "personal", "workflow"]>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topic_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    memory_type?: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow" | undefined;
    tags?: string[] | undefined;
    topic_id?: string | null | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    memory_type?: "context" | "project" | "knowledge" | "reference" | "personal" | "workflow" | undefined;
    tags?: string[] | undefined;
    topic_id?: string | null | undefined;
    metadata?: Record<string, any> | undefined;
}>;
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
export declare const searchMemorySchema: z.ZodObject<{
    query: z.ZodString;
    memory_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["context", "project", "knowledge", "reference", "personal", "workflow"]>, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topic_id: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    threshold: number;
    tags?: string[] | undefined;
    topic_id?: string | undefined;
    memory_types?: ("context" | "project" | "knowledge" | "reference" | "personal" | "workflow")[] | undefined;
}, {
    query: string;
    tags?: string[] | undefined;
    topic_id?: string | undefined;
    memory_types?: ("context" | "project" | "knowledge" | "reference" | "personal" | "workflow")[] | undefined;
    limit?: number | undefined;
    threshold?: number | undefined;
}>;
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
export interface MemoryStats {
    total_memories: number;
    memories_by_type: Record<MemoryType, number>;
    total_size_bytes: number;
    avg_access_count: number;
    most_accessed_memory?: MemoryEntry;
    recent_memories: MemoryEntry[];
}
//# sourceMappingURL=memory.d.ts.map