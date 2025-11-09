import { z } from 'zod';
/**
 * Aligned types for sd-ghost-protocol memory system
 */
export type MemoryType = 'conversation' | 'knowledge' | 'project' | 'context' | 'reference';
export type MemoryStatus = 'active' | 'archived' | 'draft' | 'deleted';
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
 *         summary:
 *           type: string
 *           nullable: true
 *         memory_type:
 *           type: string
 *           enum: [conversation, knowledge, project, context, reference]
 *         status:
 *           type: string
 *           enum: [active, archived, draft, deleted]
 *         relevance_score:
 *           type: number
 *           nullable: true
 *         access_count:
 *           type: integer
 *           minimum: 0
 *         last_accessed:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         user_id:
 *           type: string
 *         topic_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         project_ref:
 *           type: string
 *           nullable: true
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         metadata:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
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
 * @swagger
 * components:
 *   schemas:
 *     MemoryTopic:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         description:
 *           type: string
 *           nullable: true
 *         color:
 *           type: string
 *           nullable: true
 *         icon:
 *           type: string
 *           nullable: true
 *         user_id:
 *           type: string
 *         parent_topic_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         is_system:
 *           type: boolean
 *         metadata:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
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
export declare const createMemorySchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodDefault<z.ZodEnum<["conversation", "knowledge", "project", "context", "reference"]>>;
    topic_id: z.ZodOptional<z.ZodString>;
    project_ref: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    memory_type: "conversation" | "knowledge" | "project" | "context" | "reference";
    tags: string[];
    summary?: string | undefined;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title: string;
    content: string;
    summary?: string | undefined;
    memory_type?: "conversation" | "knowledge" | "project" | "context" | "reference" | undefined;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
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
export declare const updateMemorySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodOptional<z.ZodEnum<["conversation", "knowledge", "project", "context", "reference"]>>;
    status: z.ZodOptional<z.ZodEnum<["active", "archived", "draft", "deleted"]>>;
    topic_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    project_ref: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    content?: string | undefined;
    summary?: string | undefined;
    memory_type?: "conversation" | "knowledge" | "project" | "context" | "reference" | undefined;
    topic_id?: string | null | undefined;
    project_ref?: string | null | undefined;
    status?: "active" | "archived" | "draft" | "deleted" | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title?: string | undefined;
    content?: string | undefined;
    summary?: string | undefined;
    memory_type?: "conversation" | "knowledge" | "project" | "context" | "reference" | undefined;
    topic_id?: string | null | undefined;
    project_ref?: string | null | undefined;
    status?: "active" | "archived" | "draft" | "deleted" | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
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
export declare const searchMemorySchema: z.ZodObject<{
    query: z.ZodString;
    memory_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["conversation", "knowledge", "project", "context", "reference"]>, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    topic_id: z.ZodOptional<z.ZodString>;
    project_ref: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["active", "archived", "draft", "deleted"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "archived" | "draft" | "deleted";
    query: string;
    limit: number;
    threshold: number;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    tags?: string[] | undefined;
    memory_types?: ("conversation" | "knowledge" | "project" | "context" | "reference")[] | undefined;
}, {
    query: string;
    topic_id?: string | undefined;
    project_ref?: string | undefined;
    status?: "active" | "archived" | "draft" | "deleted" | undefined;
    tags?: string[] | undefined;
    limit?: number | undefined;
    threshold?: number | undefined;
    memory_types?: ("conversation" | "knowledge" | "project" | "context" | "reference")[] | undefined;
}>;
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
export declare const createTopicSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    parent_topic_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    parent_topic_id?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    color?: string | undefined;
    icon?: string | undefined;
    parent_topic_id?: string | undefined;
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
 *             similarity_score:
 *               type: number
 *               minimum: 0
 *               maximum: 1
 *               description: Semantic similarity score
 */
export interface MemorySearchResult extends MemoryEntry {
    similarity_score: number;
}
export interface UserMemoryStats {
    total_memories: number;
    memories_by_type: Record<MemoryType, number>;
    total_topics: number;
    most_accessed_memory?: string;
    recent_memories: string[];
}
export type CreateMemoryRequest = z.infer<typeof createMemorySchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemorySchema>;
export type SearchMemoryRequest = z.infer<typeof searchMemorySchema>;
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;
export interface SimpleMemory {
    id: string;
    timestamp: string;
    session_id: string;
    content_type: string;
    content: string;
    metadata: Record<string, unknown>;
    embedding_hash: string;
    relevance_score: number;
    client_type: string;
    client_version: string;
    created_at: string;
    updated_at: string;
}
export interface ChatSession {
    id: string;
    user_id: string;
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp?: string;
        metadata?: Record<string, unknown>;
    }>;
    last_message_at?: string;
    model_used: string;
    conversation_metadata?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}
//# sourceMappingURL=memory-aligned.d.ts.map