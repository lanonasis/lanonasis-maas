import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

import { config } from '@/config/environment';
import { logger, logPerformance } from '@/utils/logger';
import { InternalServerError } from '@/middleware/errorHandler';

// Aligned types for existing sd-ghost-protocol schema
export type MemoryType = 'conversation' | 'knowledge' | 'project' | 'context' | 'reference';
export type MemoryStatus = 'active' | 'archived' | 'draft' | 'deleted';

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

export interface MemorySearchResult extends MemoryEntry {
  similarity_score: number;
}

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

export interface CreateMemoryRequest {
  title: string;
  content: string;
  summary?: string;
  memory_type?: MemoryType;
  topic_id?: string;
  project_ref?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMemoryRequest {
  title?: string;
  content?: string;
  summary?: string;
  memory_type?: MemoryType;
  status?: MemoryStatus;
  topic_id?: string;
  project_ref?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchFilters {
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string;
  project_ref?: string;
  status?: MemoryStatus;
  limit?: number;
  threshold?: number;
}

export interface UserMemoryStats {
  total_memories: number;
  memories_by_type: Record<MemoryType, number>;
  total_topics: number;
  most_accessed_memory?: string | undefined;
  recent_memories: string[];
}

export class AlignedMemoryService {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
    this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  /**
   * Create vector embedding for text using OpenAI
   */
  private async createEmbedding(text: string): Promise<number[]> {
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
    } catch (error) {
      logger.error('Failed to create embedding', { error, text_length: text.length });
      throw new InternalServerError('Failed to create text embedding');
    }
  }

  /**
   * Create a new memory entry in the existing memory_entries table
   */
  async createMemory(data: CreateMemoryRequest & { user_id: string }): Promise<MemoryEntry> {
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
        status: 'active' as MemoryStatus,
        user_id: data.user_id,
        topic_id: data.topic_id || null,
        project_ref: data.project_ref || null,
        tags: data.tags || [],
        metadata: data.metadata || {} as Record<string, unknown>,
        embedding: JSON.stringify(embedding) as unknown as number[], // Supabase expects string format for vector
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
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error creating memory', { error });
      throw new InternalServerError('Failed to create memory entry');
    }
  }

  /**
   * Get memory by ID from memory_entries table
   */
  async getMemoryById(id: string, userId: string): Promise<MemoryEntry | null> {
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
  async searchMemories(
    query: string,
    userId: string,
    filters: SearchFilters = {}
  ): Promise<MemorySearchResult[]> {
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
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error searching memories', { error });
      throw new InternalServerError('Failed to search memories');
    }
  }

  /**
   * Update memory entry
   */
  async updateMemory(id: string, userId: string, data: UpdateMemoryRequest): Promise<MemoryEntry> {
    const startTime = Date.now();

    try {
      const updateData: Partial<MemoryEntry> & { updated_at: string; embedding?: string } = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (data.title !== undefined) updateData.title = data.title;
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.memory_type !== undefined) updateData.memory_type = data.memory_type;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.topic_id !== undefined) updateData.topic_id = data.topic_id;
      if (data.project_ref !== undefined) updateData.project_ref = data.project_ref;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.metadata !== undefined) updateData.metadata = data.metadata;

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
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error updating memory', { error });
      throw new InternalServerError('Failed to update memory entry');
    }
  }

  /**
   * Delete memory entry (soft delete by setting status to deleted)
   */
  async deleteMemory(id: string, userId: string): Promise<void> {
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
  async listMemories(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      memory_type?: MemoryType;
      topic_id?: string;
      project_ref?: string;
      status?: MemoryStatus;
      tags?: string[];
      sort?: string;
      order?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    memories: MemoryEntry[];
    pagination: { page: number; limit: number; total: number; pages: number; };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('memory_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', options.status || 'active');

    // Apply filters
    if (options.memory_type) query = query.eq('memory_type', options.memory_type);
    if (options.topic_id) query = query.eq('topic_id', options.topic_id);
    if (options.project_ref) query = query.eq('project_ref', options.project_ref);
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
  async updateAccessTracking(id: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_memory_access', { memory_id_param: id });

    if (error) {
      logger.warn('Failed to update access tracking', { error, id });
    }
  }

  /**
   * Get user memory statistics
   */
  async getUserMemoryStats(userId: string): Promise<UserMemoryStats> {
    const { data: stats, error } = await this.supabase
      .rpc('get_user_memory_stats', { user_id_param: userId })
      .single();

    if (error) {
      logger.error('Failed to get user memory stats', { error, userId });
      throw new InternalServerError('Failed to get memory statistics');
    }

    return {
      total_memories: (stats as UserMemoryStats)?.total_memories || 0,
      memories_by_type: (stats as UserMemoryStats)?.memories_by_type || {} as Record<MemoryType, number>,
      total_topics: (stats as UserMemoryStats)?.total_topics || 0,
      most_accessed_memory: (stats as UserMemoryStats)?.most_accessed_memory,
      recent_memories: (stats as UserMemoryStats)?.recent_memories || []
    };
  }

  /**
   * Topic management methods
   */
  async createTopic(data: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_topic_id?: string;
    user_id: string;
  }): Promise<MemoryTopic> {
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

  async getTopics(userId: string): Promise<MemoryTopic[]> {
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

  async getTopicById(id: string, userId: string): Promise<MemoryTopic | null> {
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
  async bulkDeleteMemories(memoryIds: string[], userId: string): Promise<{
    deleted_count: number;
    failed_ids: string[];
  }> {
    const startTime = Date.now();
    const failedIds: string[] = [];
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
        } else {
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
    } catch (error) {
      logger.error('Unexpected error in bulk delete', { error });
      throw new InternalServerError('Failed to bulk delete memories');
    }
  }
}