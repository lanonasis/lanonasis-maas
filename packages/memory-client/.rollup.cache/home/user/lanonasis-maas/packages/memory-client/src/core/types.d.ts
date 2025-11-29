import { z } from 'zod';
/**
 * Memory types supported by the service
 */
export declare const MEMORY_TYPES: readonly ["context", "project", "knowledge", "reference", "personal", "workflow"];
export type MemoryType = typeof MEMORY_TYPES[number];
/**
 * Memory status values
 */
export declare const MEMORY_STATUSES: readonly ["active", "archived", "draft", "deleted"];
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
export declare const createMemorySchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    summary: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodDefault<z.ZodEnum<{
        context: "context";
        project: "project";
        knowledge: "knowledge";
        reference: "reference";
        personal: "personal";
        workflow: "workflow";
    }>>;
    topic_id: z.ZodOptional<z.ZodString>;
    project_ref: z.ZodOptional<z.ZodString>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const updateMemorySchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    memory_type: z.ZodOptional<z.ZodEnum<{
        context: "context";
        project: "project";
        knowledge: "knowledge";
        reference: "reference";
        personal: "personal";
        workflow: "workflow";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        active: "active";
        archived: "archived";
        draft: "draft";
        deleted: "deleted";
    }>>;
    topic_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    project_ref: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export declare const searchMemorySchema: z.ZodObject<{
    query: z.ZodString;
    memory_types: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        context: "context";
        project: "project";
        knowledge: "knowledge";
        reference: "reference";
        personal: "personal";
        workflow: "workflow";
    }>>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    topic_id: z.ZodOptional<z.ZodString>;
    project_ref: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<{
        active: "active";
        archived: "archived";
        draft: "draft";
        deleted: "deleted";
    }>>;
    limit: z.ZodDefault<z.ZodNumber>;
    threshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const createTopicSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodString>;
    parent_topic_id: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Inferred types from schemas
 */
export type CreateMemoryRequest = z.infer<typeof createMemorySchema>;
export type UpdateMemoryRequest = z.infer<typeof updateMemorySchema>;
export type SearchMemoryRequest = z.infer<typeof searchMemorySchema>;
export type CreateTopicRequest = z.infer<typeof createTopicSchema>;
