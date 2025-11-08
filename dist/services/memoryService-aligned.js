import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config/environment';
import { logger, logPerformance } from '../utils/logger';
import { InternalServerError } from '../middleware/errorHandler';
export class AlignedMemoryService {
    supabase;
    openai;
    constructor() {
        this.supabase = createClient(config.SUPABASE_URL=https://<project-ref>.supabase.co
        this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY=REDACTED_OPENAI_API_KEY
    }
    /**
     * Create vector embedding for text using OpenAI
     */
    async createEmbedding(text) {
        const startTime = Date.now();
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-ada-002',
                input: text.substring(0, 8000)
            });
            logPerformance('embedding_creation', Date.now() - startTime, {
                text_length: text.length,
                model: 'text-embedding-ada-002'
            });
            return response.data[0]?.embedding || [];
        }
        catch (error) {
            logger.error('Failed to create embedding', { error, text_length: text.length });
            throw new InternalServerError('Failed to create text embedding');
        }
    }
    /**
     * Create a new memory entry in the existing memory_entries table
     */
    async createMemory(data) {
        const startTime = Date.now();
        try {
            // Create embedding for the content
            const embedding = await this.createEmbedding(data.content);
            // Prepare memory entry data
            const memoryData = {
                title: data.title,
                content: data.content,
                summary: data.summary,
                memory_type: data.memory_type || 'context',
                status: 'active',
                user_id: data.user_id,
                topic_id: data.topic_id || null,
                project_ref: data.project_ref || null,
                tags: data.tags || [],
                metadata: data.metadata || {},
                embedding: JSON.stringify(embedding), // Supabase expects string format for vector
                access_count: 0
            };
            const { data: memory, error } = await this.supabase
                .from('memory_entries')
                .insert(memoryData)
                .select()
                .single();
            if (error) {
                logger.error('Failed to create memory entry', { error, memory_data: memoryData });
                throw new InternalServerError('Failed to create memory entry');
            }
            logPerformance('memory_creation', Date.now() - startTime, {
                memory_id: memory.id,
                content_length: data.content.length
            });
            return memory;
        }
        catch (error) {
            if (error instanceof InternalServerError)
                throw error;
            logger.error('Unexpected error creating memory', { error });
            throw new InternalServerError('Failed to create memory entry');
        }
    }
    /**
     * Get memory by ID from memory_entries table
     */
    async getMemoryById(id, userId) {
        const { data: memory, error } = await this.supabase
            .from('memory_entries')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Failed to get memory by ID', { error, id, userId });
            throw new InternalServerError('Failed to retrieve memory');
        }
        return memory;
    }
    /**
     * Search memories using the aligned vector search function
     */
    async searchMemories(query, userId, filters = {}) {
        const startTime = Date.now();
        try {
            // Create embedding for the search query
            const queryEmbedding = await this.createEmbedding(query);
            // Call the aligned search function
            const { data: results, error } = await this.supabase
                .rpc('search_memory_entries', {
                query_embedding: JSON.stringify(queryEmbedding),
                user_id_param: userId,
                similarity_threshold: filters.threshold || 0.7,
                match_count: filters.limit || 20,
                memory_types: filters.memory_types || null,
                topic_id_param: filters.topic_id || null,
                status_filter: filters.status || 'active'
            });
            if (error) {
                logger.error('Failed to search memories', { error, query, userId, filters });
                throw new InternalServerError('Failed to search memories');
            }
            logPerformance('memory_search', Date.now() - startTime, {
                query_length: query.length,
                results_count: results?.length || 0,
                filters
            });
            return results || [];
        }
        catch (error) {
            if (error instanceof InternalServerError)
                throw error;
            logger.error('Unexpected error searching memories', { error });
            throw new InternalServerError('Failed to search memories');
        }
    }
    /**
     * Update memory entry
     */
    async updateMemory(id, userId, data) {
        const startTime = Date.now();
        try {
            const updateData = {
                updated_at: new Date().toISOString()
            };
            // Only update fields that are provided
            if (data.title !== undefined)
                updateData.title = data.title;
            if (data.summary !== undefined)
                updateData.summary = data.summary;
            if (data.memory_type !== undefined)
                updateData.memory_type = data.memory_type;
            if (data.status !== undefined)
                updateData.status = data.status;
            if (data.topic_id !== undefined)
                updateData.topic_id = data.topic_id;
            if (data.project_ref !== undefined)
                updateData.project_ref = data.project_ref;
            if (data.tags !== undefined)
                updateData.tags = data.tags;
            if (data.metadata !== undefined)
                updateData.metadata = data.metadata;
            // If content is updated, create new embedding
            if (data.content !== undefined) {
                updateData.content = data.content;
                updateData.embedding = JSON.stringify(await this.createEmbedding(data.content));
            }
            const { data: memory, error } = await this.supabase
                .from('memory_entries')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();
            if (error) {
                logger.error('Failed to update memory', { error, id, updateData });
                throw new InternalServerError('Failed to update memory entry');
            }
            logPerformance('memory_update', Date.now() - startTime, {
                memory_id: id,
                updated_fields: Object.keys(updateData)
            });
            return memory;
        }
        catch (error) {
            if (error instanceof InternalServerError)
                throw error;
            logger.error('Unexpected error updating memory', { error });
            throw new InternalServerError('Failed to update memory entry');
        }
    }
    /**
     * Delete memory entry (soft delete by setting status to deleted)
     */
    async deleteMemory(id, userId) {
        const { error } = await this.supabase
            .from('memory_entries')
            .update({ status: 'deleted', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);
        if (error) {
            logger.error('Failed to delete memory', { error, id, userId });
            throw new InternalServerError('Failed to delete memory entry');
        }
    }
    /**
     * List memories with pagination and filtering
     */
    async listMemories(userId, options = {}) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const offset = (page - 1) * limit;
        let query = this.supabase
            .from('memory_entries')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .eq('status', options.status || 'active');
        // Apply filters
        if (options.memory_type)
            query = query.eq('memory_type', options.memory_type);
        if (options.topic_id)
            query = query.eq('topic_id', options.topic_id);
        if (options.project_ref)
            query = query.eq('project_ref', options.project_ref);
        if (options.tags && options.tags.length > 0) {
            query = query.overlaps('tags', options.tags);
        }
        // Apply sorting
        const sortField = options.sort || 'created_at';
        const sortOrder = options.order || 'desc';
        query = query.order(sortField, { ascending: sortOrder === 'asc' });
        // Apply pagination
        query = query.range(offset, offset + limit - 1);
        const { data: memories, count, error } = await query;
        if (error) {
            logger.error('Failed to list memories', { error, userId, options });
            throw new InternalServerError('Failed to list memories');
        }
        const total = count || 0;
        const pages = Math.ceil(total / limit);
        return {
            memories: memories || [],
            pagination: { page, limit, total, pages }
        };
    }
    /**
     * Update access tracking
     */
    async updateAccessTracking(id) {
        const { error } = await this.supabase
            .rpc('update_memory_access', { memory_id_param: id });
        if (error) {
            logger.warn('Failed to update access tracking', { error, id });
        }
    }
    /**
     * Get user memory statistics
     */
    async getUserMemoryStats(userId) {
        const { data: stats, error } = await this.supabase
            .rpc('get_user_memory_stats', { user_id_param: userId })
            .single();
        if (error) {
            logger.error('Failed to get user memory stats', { error, userId });
            throw new InternalServerError('Failed to get memory statistics');
        }
        return {
            total_memories: stats?.total_memories || 0,
            memories_by_type: stats?.memories_by_type || {},
            total_topics: stats?.total_topics || 0,
            most_accessed_memory: stats?.most_accessed_memory,
            recent_memories: stats?.recent_memories || []
        };
    }
    /**
     * Topic management methods
     */
    async createTopic(data) {
        const { data: topic, error } = await this.supabase
            .from('memory_topics')
            .insert({
            name: data.name,
            description: data.description,
            color: data.color,
            icon: data.icon,
            parent_topic_id: data.parent_topic_id,
            user_id: data.user_id,
            is_system: false
        })
            .select()
            .single();
        if (error) {
            logger.error('Failed to create topic', { error, data });
            throw new InternalServerError('Failed to create topic');
        }
        return topic;
    }
    async getTopics(userId) {
        const { data: topics, error } = await this.supabase
            .from('memory_topics')
            .select('*')
            .eq('user_id', userId)
            .order('name');
        if (error) {
            logger.error('Failed to get topics', { error, userId });
            throw new InternalServerError('Failed to retrieve topics');
        }
        return topics || [];
    }
    async getTopicById(id, userId) {
        const { data: topic, error } = await this.supabase
            .from('memory_topics')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            logger.error('Failed to get topic by ID', { error, id, userId });
            throw new InternalServerError('Failed to retrieve topic');
        }
        return topic;
    }
    /**
     * Bulk operations
     */
    async bulkDeleteMemories(memoryIds, userId) {
        const startTime = Date.now();
        const failedIds = [];
        let deletedCount = 0;
        try {
            const batchSize = 50;
            for (let i = 0; i < memoryIds.length; i += batchSize) {
                const batch = memoryIds.slice(i, i + batchSize);
                const { error } = await this.supabase
                    .from('memory_entries')
                    .update({ status: 'deleted', updated_at: new Date().toISOString() })
                    .in('id', batch)
                    .eq('user_id', userId);
                if (error) {
                    logger.warn('Batch delete failed', { error, batch });
                    failedIds.push(...batch);
                }
                else {
                    deletedCount += batch.length;
                }
            }
            logPerformance('bulk_delete', Date.now() - startTime, {
                requested_count: memoryIds.length,
                deleted_count: deletedCount,
                failed_count: failedIds.length
            });
            return {
                deleted_count: deletedCount,
                failed_ids: failedIds
            };
        }
        catch (error) {
            logger.error('Unexpected error in bulk delete', { error });
            throw new InternalServerError('Failed to bulk delete memories');
        }
    }
}
//# sourceMappingURL=memoryService-aligned.js.map