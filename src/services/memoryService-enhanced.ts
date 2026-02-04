/**
 * Enhanced Memory Service with mem0-inspired features
 * Builds upon existing memoryService.ts with advanced state management and access control
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

import { config } from '@/config/environment';
import { logger, logPerformance } from '@/utils/logger';
import { 
  MemoryEntry, 
  MemorySearchResult, 
  CreateMemoryRequest, 
  MemoryStats,
  MemoryType 
} from '@/types/memory';
import { InternalServerError } from '@/middleware/errorHandler';

// Enhanced types for mem0-inspired features
export enum MemoryState {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export interface EnhancedMemoryEntry extends MemoryEntry {
  state: MemoryState;
  app_id: string;
  archived_at?: string;
  deleted_at?: string;
}

export interface MemoryStateTransition {
  id: string;
  memory_id: string;
  from_state: MemoryState;
  to_state: MemoryState;
  reason?: string;
  metadata?: Record<string, unknown>;
  changed_by: string;
  created_at: string;
}

export interface BulkOperationResult {
  memory_id: string;
  success: boolean;
  previous_state: MemoryState;
  new_state: MemoryState;
  error?: string;
}

export interface AccessControlRule {
  id: string;
  memory_id?: string;
  app_id: string;
  user_id: string;
  organization_id: string;
  permission: 'read' | 'write' | 'delete' | 'admin';
  granted: boolean;
  expires_at?: string;
  created_by: string;
  created_at: string;
}

export interface MemoryAccessLog {
  id: string;
  memory_id?: string;
  app_id: string;
  user_id: string;
  organization_id: string;
  access_type: string;
  success: boolean;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

function isBulkOperationResult(value: unknown): value is BulkOperationResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.success === 'boolean';
}

export interface EnhancedSearchFilters {
  memory_types?: MemoryType[];
  tags?: string[];
  topic_id?: string | null;
  user_id?: string;
  app_id?: string;
  states?: MemoryState[];
  since?: string;
  before?: string;
  limit?: number;
  threshold?: number;
}

export class EnhancedMemoryService {
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
   * Enhanced memory creation with state management
   */
  async createMemoryEnhanced(
    id: string, 
    data: CreateMemoryRequest & { 
      user_id: string; 
      organization_id: string; 
      app_id?: string;
    }
  ): Promise<EnhancedMemoryEntry> {
    const startTime = Date.now();

    try {
      const embedding = await this.createEmbedding(data.content);

      const memoryData = {
        id,
        title: data.title,
        content: data.content,
        memory_type: data.memory_type,
        tags: data.tags || [],
        topic_id: data.topic_id || null,
        user_id: data.user_id,
        organization_id: data.organization_id,
        app_id: data.app_id || 'default',
        state: MemoryState.ACTIVE,
        embedding,
        metadata: data.metadata || {},
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
        logger.error('Failed to create enhanced memory', { error, memory_data: memoryData });
        throw new InternalServerError('Failed to create memory entry');
      }

      // Log memory access
      await this.logMemoryAccess({
        memory_id: id,
        app_id: data.app_id || 'default',
        user_id: data.user_id,
        organization_id: data.organization_id,
        access_type: 'create',
        success: true,
        metadata: { memory_type: data.memory_type, content_length: data.content.length }
      });

      logPerformance('enhanced_memory_creation', Date.now() - startTime, {
        memory_id: id,
        content_length: data.content.length
      });

      return memory;
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error creating enhanced memory', { error });
      throw new InternalServerError('Failed to create memory entry');
    }
  }

  /**
   * Enhanced memory search with advanced filtering
   */
  async searchMemoriesEnhanced(
    query: string,
    organizationId: string,
    filters: EnhancedSearchFilters = {}
  ): Promise<MemorySearchResult[]> {
    const startTime = Date.now();

    try {
      const queryEmbedding = await this.createEmbedding(query);

      const { data: results, error } = await this.supabase
        .rpc('match_memories_enhanced', {
          query_embedding: JSON.stringify(queryEmbedding),
          match_threshold: filters.threshold || 0.7,
          match_count: filters.limit || 20,
          organization_id_param: organizationId,
          memory_types_param: filters.memory_types || null,
          tags_param: filters.tags || null,
          topic_id_param: filters.topic_id || null,
          user_id_param: filters.user_id || null,
          app_id_param: filters.app_id || null,
          states_param: filters.states || [MemoryState.ACTIVE],
          since_param: filters.since ? new Date(filters.since).toISOString() : null,
          before_param: filters.before ? new Date(filters.before).toISOString() : null
        });

      if (error) {
        logger.error('Failed to search enhanced memories', { error, query, organizationId, filters });
        throw new InternalServerError('Failed to search memories');
      }

      // Log search access
      await this.logMemoryAccess({
        app_id: filters.app_id || 'default',
        user_id: filters.user_id || 'system',
        organization_id: organizationId,
        access_type: 'search',
        success: true,
        metadata: { query, filters, results_count: results?.length || 0 }
      });

      logPerformance('enhanced_memory_search', Date.now() - startTime, {
        query_length: query.length,
        results_count: results?.length || 0,
        filters
      });

      return results || [];
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error searching enhanced memories', { error });
      throw new InternalServerError('Failed to search memories');
    }
  }

  /**
   * Update memory state with transition logging
   */
  async updateMemoryState(
    memoryId: string,
    newState: MemoryState,
    changedBy: string,
    reason?: string,
    metadata?: Record<string, unknown>
  ): Promise<MemoryStateTransition> {
    const startTime = Date.now();

    try {
      const { data: result, error } = await this.supabase
        .rpc('update_memory_state', {
          memory_id_param: memoryId,
          new_state: newState,
          reason_param: reason,
          changed_by_param: changedBy,
          metadata_param: metadata || {}
        });

      if (error || !result) {
        logger.error('Failed to update memory state', { error, memoryId, newState });
        throw new InternalServerError('Failed to update memory state');
      }

      // Get the transition record
      const { data: transition, error: transitionError } = await this.supabase
        .from('memory_state_transitions')
        .select('*')
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (transitionError) {
        logger.error('Failed to get state transition', { transitionError, memoryId });
        throw new InternalServerError('Failed to get state transition');
      }

      logPerformance('memory_state_update', Date.now() - startTime, {
        memory_id: memoryId,
        new_state: newState
      });

      return transition;
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error updating memory state', { error });
      throw new InternalServerError('Failed to update memory state');
    }
  }

  /**
   * Bulk state update operations
   */
  async bulkUpdateMemoryState(
    memoryIds: string[],
    newState: MemoryState,
    changedBy: string,
    reason?: string
  ): Promise<BulkOperationResult[]> {
    const startTime = Date.now();

    try {
      const { data: results, error } = await this.supabase
        .rpc('bulk_update_memory_state', {
          memory_ids: memoryIds,
          new_state: newState,
          reason_param: reason,
          changed_by_param: changedBy
        });

      if (error) {
        logger.error('Failed to bulk update memory state', { error, memoryIds, newState });
        throw new InternalServerError('Failed to bulk update memory state');
      }

      const typedResults = Array.isArray(results) ? results.filter(isBulkOperationResult) : [];
      const successfulCount = typedResults.filter((r) => r.success).length;

      logPerformance('bulk_memory_state_update', Date.now() - startTime, {
        memory_count: memoryIds.length,
        new_state: newState,
        successful: successfulCount
      });

      return results || [];
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error in bulk state update', { error });
      throw new InternalServerError('Failed to bulk update memory state');
    }
  }

  /**
   * Find related memories using enhanced algorithms
   */
  async findRelatedMemories(
    memoryId: string,
    limit: number = 5,
    threshold: number = 0.6
  ): Promise<MemorySearchResult[]> {
    const startTime = Date.now();

    try {
      const { data: results, error } = await this.supabase
        .rpc('find_related_memories', {
          source_memory_id: memoryId,
          limit_param: limit,
          threshold_param: threshold
        });

      if (error) {
        logger.error('Failed to find related memories', { error, memoryId });
        throw new InternalServerError('Failed to find related memories');
      }

      logPerformance('find_related_memories', Date.now() - startTime, {
        source_memory_id: memoryId,
        results_count: results?.length || 0
      });

      return results || [];
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error finding related memories', { error });
      throw new InternalServerError('Failed to find related memories');
    }
  }

  /**
   * Get memories by state with filtering
   */
  async getMemoriesByState(
    state: MemoryState,
    organizationId: string,
    filters: {
      user_id?: string;
      app_id?: string;
      limit?: number;
      before?: string;
    } = {}
  ): Promise<EnhancedMemoryEntry[]> {
    try {
      let query = this.supabase
        .from('memory_entries')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('state', state);

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.app_id) {
        query = query.eq('app_id', filters.app_id);
      }

      if (filters.before) {
        query = query.lt('created_at', filters.before);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      const { data: memories, error } = await query;

      if (error) {
        logger.error('Failed to get memories by state', { error, state, organizationId, filters });
        throw new InternalServerError('Failed to get memories by state');
      }

      return memories || [];
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error getting memories by state', { error });
      throw new InternalServerError('Failed to get memories by state');
    }
  }

  /**
   * Archive old memories based on date criteria
   */
  async archiveOldMemories(
    beforeDate: string,
    organizationId: string,
    changedBy: string,
    filters: {
      user_id?: string;
      app_id?: string;
    } = {}
  ): Promise<BulkOperationResult[]> {
    try {
      // Get memories to archive
      const memoriesToArchive = await this.getMemoriesByState(
        MemoryState.ACTIVE,
        organizationId,
        {
          ...filters,
          before: beforeDate,
          limit: 1000 // Process in batches
        }
      );

      if (memoriesToArchive.length === 0) {
        return [];
      }

      const memoryIds = memoriesToArchive.map(m => m.id);
      
      return await this.bulkUpdateMemoryState(
        memoryIds,
        MemoryState.ARCHIVED,
        changedBy,
        `Archived memories created before ${beforeDate}`
      );
    } catch (error) {
      logger.error('Failed to archive old memories', { error, beforeDate, organizationId });
      throw new InternalServerError('Failed to archive old memories');
    }
  }

  /**
   * Check memory access permissions
   */
  async checkMemoryAccess(
    memoryId: string,
    userId: string,
    appId: string,
    requiredPermission: 'read' | 'write' | 'delete' | 'admin'
  ): Promise<boolean> {
    try {
      const { data: hasAccess, error } = await this.supabase
        .rpc('check_memory_access', {
          memory_id_param: memoryId,
          user_id_param: userId,
          app_id_param: appId,
          required_permission: requiredPermission
        });

      if (error) {
        logger.error('Failed to check memory access', { error, memoryId, userId, appId });
        return false;
      }

      return hasAccess || false;
    } catch (error) {
      logger.error('Unexpected error checking memory access', { error });
      return false;
    }
  }

  /**
   * Log memory access for audit trail
   */
  async logMemoryAccess(logData: {
    memory_id?: string;
    app_id: string;
    user_id: string;
    organization_id: string;
    access_type: string;
    success?: boolean;
    metadata?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('log_memory_access', {
          memory_id_param: logData.memory_id || null,
          app_id_param: logData.app_id,
          user_id_param: logData.user_id,
          organization_id_param: logData.organization_id,
          access_type_param: logData.access_type,
          success_param: logData.success !== false,
          metadata_param: logData.metadata || {},
          ip_address_param: logData.ip_address || null,
          user_agent_param: logData.user_agent || null
        });

      if (error) {
        logger.warn('Failed to log memory access', { error, logData });
      }
    } catch (error) {
      logger.warn('Unexpected error logging memory access', { error });
    }
  }

  /**
   * Get memory access logs for audit purposes
   */
  async getMemoryAccessLogs(
    organizationId: string,
    filters: {
      memory_id?: string;
      user_id?: string;
      app_id?: string;
      access_type?: string;
      since?: string;
      limit?: number;
    } = {}
  ): Promise<MemoryAccessLog[]> {
    try {
      let query = this.supabase
        .from('memory_access_logs')
        .select('*')
        .eq('organization_id', organizationId);

      if (filters.memory_id) {
        query = query.eq('memory_id', filters.memory_id);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.app_id) {
        query = query.eq('app_id', filters.app_id);
      }

      if (filters.access_type) {
        query = query.eq('access_type', filters.access_type);
      }

      if (filters.since) {
        query = query.gte('created_at', filters.since);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 100);

      const { data: logs, error } = await query;

      if (error) {
        logger.error('Failed to get memory access logs', { error, organizationId, filters });
        throw new InternalServerError('Failed to get memory access logs');
      }

      return logs || [];
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error getting memory access logs', { error });
      throw new InternalServerError('Failed to get memory access logs');
    }
  }

  /**
   * Enhanced memory statistics with state breakdown
   */
  async getEnhancedMemoryStats(organizationId: string): Promise<MemoryStats & {
    memories_by_state: Record<MemoryState, number>;
    app_breakdown: Record<string, number>;
    recent_access_logs: MemoryAccessLog[];
  }> {
    const startTime = Date.now();

    try {
      // Get basic stats
      const basicStats = await this.getMemoryStats(organizationId);

      // Get state breakdown
      const { data: stateBreakdown, error: stateError } = await this.supabase
        .from('memory_entries')
        .select('state')
        .eq('organization_id', organizationId);

      if (stateError) {
        throw new InternalServerError('Failed to get memory state breakdown');
      }

      const memoriesByState: Record<MemoryState, number> = {
        [MemoryState.ACTIVE]: 0,
        [MemoryState.PAUSED]: 0,
        [MemoryState.ARCHIVED]: 0,
        [MemoryState.DELETED]: 0
      };

      stateBreakdown?.forEach((item: { state: MemoryState }) => {
        memoriesByState[item.state]++;
      });

      // Get app breakdown
      const { data: appBreakdown, error: appError } = await this.supabase
        .from('memory_entries')
        .select('app_id')
        .eq('organization_id', organizationId)
        .eq('state', MemoryState.ACTIVE);

      if (appError) {
        throw new InternalServerError('Failed to get app breakdown');
      }

      const appBreakdownMap: Record<string, number> = {};
      appBreakdown?.forEach((item: { app_id: string }) => {
        appBreakdownMap[item.app_id] = (appBreakdownMap[item.app_id] || 0) + 1;
      });

      // Get recent access logs
      const recentAccessLogs = await this.getMemoryAccessLogs(organizationId, {
        limit: 10
      });

      logPerformance('enhanced_memory_stats', Date.now() - startTime, {
        organization_id: organizationId
      });

      return {
        ...basicStats,
        memories_by_state: memoriesByState,
        app_breakdown: appBreakdownMap,
        recent_access_logs: recentAccessLogs
      };
    } catch (error) {
      if (error instanceof InternalServerError) throw error;
      logger.error('Unexpected error getting enhanced memory stats', { error });
      throw new InternalServerError('Failed to get enhanced memory statistics');
    }
  }

  // Inherit all methods from the base MemoryService
  async getMemoryStats(_organizationId: string): Promise<MemoryStats> {
    // Implementation would call the original method or reimplement
    // For now, return a basic implementation
    return {
      total_memories: 0,
      memories_by_type: {
        context: 0,
        project: 0,
        knowledge: 0,
        reference: 0,
        personal: 0,
        workflow: 0
      },
      total_size_bytes: 0,
      avg_access_count: 0,
      recent_memories: []
    };
  }
}