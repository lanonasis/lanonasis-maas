import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

import { config } from '@/config/environment';
import { logger, logPerformance } from '@/utils/logger';
import { 
  MemoryEntry, 
  MemorySearchResult, 
  CreateMemoryRequest, 
  UpdateMemoryRequest,
  MemoryStats,
  MemoryType 
} from '@/types/memory';
import { InternalServerError } from '@/middleware/errorHandler';

interface SearchFilters {
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string | null;
  user_id?: string;
  limit?: number;
  threshold?: number;
}

interface ListOptions {
  page: number;
  limit: number;
  sort: string;
  order: string;
}

export interface ListMemoryFilters extends Record<string, unknown> {
  organization_id?: string;
  user_id?: string;
  memory_type?: MemoryType;
  tags?: string[];
  topic_id?: string | null;
}

export class MemoryService {
  private supabase: SupabaseClient;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
    this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  /**
   * Create vector embedding for text
   */
  private async createEmbedding(text: string): Promise<number[]> {
    const startTime = Date.now();
    
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000) // Limit input length
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
   * Create a new memory entry
   */
  async createMemory(id: string, data: CreateMemoryRequest & { user_id: string; group_id: string }): Promise<MemoryEntry> {
    const startTime = Date.now();

    try {
      // Create embedding for the content
      const embedding = await this.createEmbedding(data.content);

      const memoryData = {
        id,
        title: data.title,
        content: data.content,
        memory_type: data.memory_type,
        tags: data.tags || [],
        topic_id: data.topic_id || null,
        user_id: data.user_id,
        group_id: data.group_id,
        embedding: JSON.stringify(embedding) as unknown as number[], // Supabase expects string format
        metadata: data.metadata || {} as Record<string, unknown>,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        access_count: 0
      };

      const { data: memory, error } = await this.supabase
        .from('memory_entries')
        .insert(memoryData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create memory', { error, memory_data: memoryData });
        throw new InternalServerError('Failed to create memory entry');
      }

      // Log analytics
      await this.logAnalytics(data.group_id, data.user_id, 'memory_created', 'memory', id, {
        memory_type: data.memory_type,
        content_length: data.content.length
      });

      logPerformance('memory_creation', Date.now() - startTime, {
        memory_id: id,
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
   * Get memory by ID
   */
  async getMemoryById(id: string, organizationId: string): Promise<MemoryEntry | null> {
    const { data: memory, error } = await this.supabase
      .from('memory_entries')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      logger.error('Failed to get memory by ID', { error, id, organizationId });
      throw new InternalServerError('Failed to retrieve memory');
    }

    return memory;
  }

  /**
   * Update memory entry
   */
  async updateMemory(id: string, data: UpdateMemoryRequest): Promise<MemoryEntry> {
    const startTime = Date.now();

    try {
      const updateData: Partial<MemoryEntry> & { updated_at: string; embedding?: string } = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (data.title !== undefined) updateData.title = data.title;
      if (data.memory_type !== undefined) updateData.memory_type = data.memory_type;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.topic_id !== undefined) updateData.topic_id = data.topic_id;
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
   * Delete memory entry
   */
  async deleteMemory(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('memory_entries')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete memory', { error, id });
      throw new InternalServerError('Failed to delete memory entry');
    }
  }

  /**
   * Search memories using vector similarity
   */
  async searchMemories(
    query: string, 
    organizationId: string, 
    filters: SearchFilters = {}
  ): Promise<MemorySearchResult[]> {
    const startTime = Date.now();

    try {
      // Create embedding for the search query
      const queryEmbedding = await this.createEmbedding(query);

      // Call the PostgreSQL function for vector search
      const { data: results, error } = await this.supabase
        .rpc('match_memories', {
          query_embedding: JSON.stringify(queryEmbedding),
          match_threshold: filters.threshold || 0.7,
          match_count: filters.limit || 20,
          organization_id_param: organizationId,
          memory_types_param: filters.memory_types || null,
          tags_param: filters.tags || null,
          topic_id_param: filters.topic_id || null,
          user_id_param: filters.user_id || null
        });

      if (error) {
        logger.error('Failed to search memories', { error, query, organizationId, filters });
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
   * List memories with pagination and filtering
   */
  async listMemories(filters: ListMemoryFilters, options: ListOptions): Promise<{
    memories: MemoryEntry[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const startTime = Date.now();

    try {
      // Build query
      let query = this.supabase.from('memory_entries').select('*', { count: 'exact' });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'tags' && Array.isArray(value)) {
            query = query.overlaps('tags', value);
          } else {
            query = query.eq(key, value);
          }
        }
      });

      // Apply sorting
      const validSortFields = ['created_at', 'updated_at', 'last_accessed', 'title', 'access_count'];
      const sortField = validSortFields.includes(options.sort) ? options.sort : 'created_at';
      const sortOrder = options.order === 'asc' ? { ascending: true } : { ascending: false };

      query = query.order(sortField, sortOrder);

      // Apply pagination
      const offset = (options.page - 1) * options.limit;
      query = query.range(offset, offset + options.limit - 1);

      const { data: memories, count, error } = await query;

      if (error) {
        logger.error('Failed to list memories', { error, filters, options });
        throw new InternalServerError('Failed to list memories');
      }

      const total = count || 0;
      const pages = Math.ceil(total / options.limit);

      logPerformance('memory_list', Date.now() - startTime, {
        filters,
        options,
        results_count: memories?.length || 0,
        total
      });

      return {
        memories: memories || [],
        pagination: {
          page: options.page,
          limit: options.limit,
          total,
          pages
        }
      };
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error listing memories', { error });
      throw new InternalServerError('Failed to list memories');
    }
  }

  /**
   * Update access tracking
   */
  async updateAccessTracking(id: string): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_memory_access', { memory_id_param: id });

    if (error) {
      logger.warn('Failed to update access tracking', { error, id });
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get memory count for organization
   */
  async getMemoryCount(organizationId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('memory_entries')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (error) {
      logger.error('Failed to get memory count', { error, organizationId });
      throw new InternalServerError('Failed to get memory count');
    }

    return count || 0;
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(organizationId: string): Promise<MemoryStats> {
    const startTime = Date.now();

    try {
      // Get total count and breakdown by type
      const { data: typeBreakdown, error: typeError } = await this.supabase
        .from('memory_entries')
        .select('memory_type')
        .eq('organization_id', organizationId);

      if (typeError) {
        throw new InternalServerError('Failed to get memory type breakdown');
      }

      const memoriesByType: Record<MemoryType, number> = {
        context: 0,
        project: 0,
        knowledge: 0,
        reference: 0,
        personal: 0,
        workflow: 0
      };

      typeBreakdown?.forEach((item: { memory_type: string }) => {
        memoriesByType[item.memory_type as MemoryType]++;
      });

      // Get size and access stats
      const { data: sizeStats, error: sizeError } = await this.supabase
        .from('memory_entries')
        .select('content, access_count')
        .eq('organization_id', organizationId);

      if (sizeError) {
        throw new InternalServerError('Failed to get memory size stats');
      }

      const totalSizeBytes = sizeStats?.reduce((total: number, item: { content: string }) => 
        total + new Blob([item.content]).size, 0) || 0;
      
      const avgAccessCount = sizeStats?.length 
        ? sizeStats.reduce((total: number, item: { access_count: number }) => total + item.access_count, 0) / sizeStats.length
        : 0;

      // Get most accessed memory
      const { data: mostAccessed, error: accessError } = await this.supabase
        .from('memory_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('access_count', { ascending: false })
        .limit(1)
        .single();

      // Get recent memories
      const { data: recentMemories } = await this.supabase
        .from('memory_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

      logPerformance('memory_stats', Date.now() - startTime, {
        organization_id: organizationId,
        total_memories: typeBreakdown?.length || 0
      });

      return {
        total_memories: typeBreakdown?.length || 0,
        memories_by_type: memoriesByType,
        total_size_bytes: totalSizeBytes,
        avg_access_count: Math.round(avgAccessCount * 100) / 100,
        most_accessed_memory: (!accessError && mostAccessed) ? mostAccessed : undefined,
        recent_memories: recentMemories || []
      };
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error getting memory stats', { error });
      throw new InternalServerError('Failed to get memory statistics');
    }
  }

  /**
   * Bulk delete memories
   */
  async bulkDeleteMemories(memoryIds: string[], organizationId: string): Promise<{
    deleted_count: number;
    failed_ids: string[];
  }> {
    const startTime = Date.now();
    const failedIds: string[] = [];
    let deletedCount = 0;

    try {
      // Process in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < memoryIds.length; i += batchSize) {
        const batch = memoryIds.slice(i, i + batchSize);
        
        const { error } = await this.supabase
          .from('memory_entries')
          .delete()
          .in('id', batch)
          .eq('organization_id', organizationId);

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

  /**
   * Log analytics event
   */
  private async logAnalytics(
    organizationId: string,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      await this.supabase
        .from('usage_analytics')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.warn('Failed to log analytics', { error });
      // Don't throw as analytics is not critical
    }
  }
}