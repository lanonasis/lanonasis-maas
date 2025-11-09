import { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseClient } from '../utils/supabaseClient';
import {
  CreateMemoryRequest,
  ListMemoryFilters,
  MemoryEntry,
  MemorySearchResult,
  PaginatedMemories,
  PaginationOptions,
  SearchFilters,
  UpdateMemoryRequest
} from '../types/memory';
import { EmbeddingService } from './embedding';

import { logger, logPerformance } from '../../../../src/utils/logger';
import { metrics } from '../../../../src/utils/metrics';
import {
  InternalServerError,
  NotFoundError,
  AuthorizationError
} from '../../../../src/middleware/errorHandler';

type SupabaseError = PostgrestError | null;

interface CreateMemoryParams extends CreateMemoryRequest {
  user_id: string;
  organization_id: string;
  trace_id?: string;
}

interface UpdateMemoryParams extends UpdateMemoryRequest {
  organization_id: string;
  user_id: string;
  trace_id?: string;
}

interface DeleteMemoryParams {
  id: string;
  organization_id: string;
  user_id: string;
  trace_id?: string;
  requireOwnership?: boolean;
}

interface MemoryListContext {
  filters?: ListMemoryFilters;
  pagination: PaginationOptions;
}

const SUPPORTED_SORT_FIELDS: Set<string> = new Set([
  'created_at',
  'updated_at',
  'last_accessed',
  'title',
  'access_count'
]);

const DEFAULT_SEARCH_THRESHOLD = 0.7;
const DEFAULT_SEARCH_LIMIT = 20;

const isPermissionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = (error as PostgrestError).code;
  return code === '42501';
};

const ensureMetadataObject = (
  original?: Record<string, unknown>,
  additional?: Record<string, unknown>
): Record<string, unknown> => ({
  ...(original ?? {}),
  ...(additional ?? {})
});

export class MemoryService {
  private readonly supabase = getSupabaseClient();
  private readonly embeddingService: EmbeddingService;

  constructor(embeddingService: EmbeddingService = new EmbeddingService()) {
    this.embeddingService = embeddingService;
  }

  async createMemory(id: string, params: CreateMemoryParams): Promise<MemoryEntry> {
    const startTime = Date.now();
    const operationLabels = {
      operation: 'create',
      organization_id: params.organization_id
    };

    try {
      const embedding = await this.embeddingService.generateEmbedding(params.content, {
        organizationId: params.organization_id,
        userId: params.user_id,
        memoryId: id,
        operation: 'create'
      });

      const now = new Date().toISOString();

      const metadata = ensureMetadataObject(params.metadata, {
        embedding_provider: embedding.provider,
        embedding_model: embedding.model,
        embedding_tokens_used: embedding.tokensUsed,
        embedding_cost_usd: embedding.costUSD
      });

      const payload = {
        id,
        title: params.title,
        content: params.content,
        memory_type: params.memory_type,
        tags: params.tags ?? [],
        topic_id: params.topic_id ?? null,
        user_id: params.user_id,
        organization_id: params.organization_id,
        embedding: embedding.embedding,
        metadata,
        created_at: now,
        updated_at: now,
        access_count: 0
      };

      const { data, error } = await this.supabase
        .from('memory_entries')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to create memory', { error, payload });
        throw this.mapSupabaseError(error, 'Failed to create memory entry');
      }

      metrics.incrementCounter('memory_operations_total', {
        ...operationLabels,
        outcome: 'success'
      });

      metrics.incrementCounter('memory_embedding_cost_usd_total', {
        provider: embedding.provider
      }, embedding.costUSD);

      await this.logAuditEvent('memory.created', params.organization_id, params.user_id, id, {
        memory_type: params.memory_type,
        tokens_used: embedding.tokensUsed,
        embedding_provider: embedding.provider,
        trace_id: params.trace_id
      });

      logPerformance('mcp_core_memory_create', Date.now() - startTime, {
        memory_id: id,
        organization_id: params.organization_id,
        user_id: params.user_id
      });

      return data as MemoryEntry;
    } catch (error) {
      metrics.incrementCounter('memory_operations_total', {
        ...operationLabels,
        outcome: 'failure'
      });

      if (error instanceof InternalServerError || error instanceof AuthorizationError) {
        throw error;
      }

      logger.error('Unexpected error creating memory', {
        error: error instanceof Error ? error.message : error
      });
      throw new InternalServerError('Failed to create memory entry');
    }
  }

  async getMemoryById(id: string, organizationId: string): Promise<MemoryEntry | null> {
    const { data, error } = await this.supabase
      .from('memory_entries')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      logger.error('Failed to fetch memory by id', { id, organizationId, error });
      throw this.mapSupabaseError(error, 'Failed to retrieve memory');
    }

    return data as MemoryEntry;
  }

  async listMemories(
    organizationId: string,
    context: MemoryListContext
  ): Promise<PaginatedMemories> {
    const filters = context.filters ?? {};
    const pagination = context.pagination;

    const sortField = pagination.sort && SUPPORTED_SORT_FIELDS.has(pagination.sort)
      ? pagination.sort
      : 'created_at';
    const sortOrder = pagination.order === 'asc' ? 'asc' : 'desc';

    const limit = Math.min(Math.max(pagination.limit, 1), 100);
    const page = Math.max(pagination.page, 1);
    const rangeStart = (page - 1) * limit;
    const rangeEnd = rangeStart + limit - 1;

    let query = this.supabase
      .from('memory_entries')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.memory_type) {
      query = query.eq('memory_type', filters.memory_type);
    }

    if (filters.topic_id !== undefined) {
      query = query.eq('topic_id', filters.topic_id);
    }

    if (filters.tags?.length) {
      query = query.overlaps('tags', filters.tags);
    }

    query = query
      .order(sortField, { ascending: sortOrder === 'asc' })
      .range(rangeStart, rangeEnd);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to list memories', {
        organizationId,
        filters,
        pagination,
        error
      });
      throw this.mapSupabaseError(error, 'Failed to list memories');
    }

    return {
      memories: (data ?? []) as MemoryEntry[],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: count ? Math.max(1, Math.ceil(count / limit)) : 1
      }
    };
  }

  async searchMemories(
    query: string,
    organizationId: string,
    filters: SearchFilters = {}
  ): Promise<MemorySearchResult[]> {
    const sanitizedLimit = filters.limit && filters.limit > 0
      ? Math.min(filters.limit, 100)
      : DEFAULT_SEARCH_LIMIT;
    const sanitizedThreshold = filters.threshold
      ? Math.min(Math.max(filters.threshold, 0), 1)
      : DEFAULT_SEARCH_THRESHOLD;

    const startTime = Date.now();

    try {
      const embedding = await this.embeddingService.generateEmbedding(query, {
        organizationId,
        userId: filters.user_id,
        operation: 'search'
      });

      const rpcPayload = {
        query_embedding: embedding.embedding,
        match_threshold: sanitizedThreshold,
        match_count: sanitizedLimit,
        organization_id_param: organizationId,
        memory_types_param: filters.memory_types ?? null,
        tags_param: filters.tags ?? null,
        topic_id_param: filters.topic_id ?? null,
        user_id_param: filters.user_id ?? null
      };

      const { data, error } = await this.supabase
        .rpc('match_memories', rpcPayload);

      if (error) {
        logger.error('Failed to execute semantic search', { filters, organizationId, error });
        throw this.mapSupabaseError(error, 'Failed to search memories');
      }

      logPerformance('mcp_core_memory_search', Date.now() - startTime, {
        organization_id: organizationId,
        results_count: data?.length ?? 0
      });

      await this.logAuditEvent('memory.searched', organizationId, filters.user_id ?? 'system', undefined, {
        query,
        results_count: data?.length ?? 0,
        tokens_used: embedding.tokensUsed,
        embedding_provider: embedding.provider
      });

      return (data ?? []) as MemorySearchResult[];
    } catch (error) {
      metrics.incrementCounter('memory_operations_total', {
        operation: 'search',
        organization_id: organizationId,
        outcome: 'failure'
      });

      if (error instanceof InternalServerError || error instanceof AuthorizationError) {
        throw error;
      }

      logger.error('Unexpected error performing memory search', {
        error: error instanceof Error ? error.message : error
      });
      throw new InternalServerError('Failed to search memories');
    }
  }

  async updateMemory(id: string, params: UpdateMemoryParams): Promise<MemoryEntry> {
    const startTime = Date.now();
    const operationLabels = {
      operation: 'update',
      organization_id: params.organization_id
    };

    try {
      const existing = await this.getMemoryById(id, params.organization_id);
      if (!existing) {
        throw new NotFoundError('Memory not found');
      }

      if (existing.user_id !== params.user_id) {
        throw new AuthorizationError('You can only update memories you created');
      }

      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };

      if (params.title !== undefined) updatePayload.title = params.title;
      if (params.memory_type !== undefined) updatePayload.memory_type = params.memory_type;
      if (params.tags !== undefined) updatePayload.tags = params.tags;
      if (params.topic_id !== undefined) updatePayload.topic_id = params.topic_id;

      let metadata = ensureMetadataObject(existing.metadata, params.metadata);
      let embeddingTokens = 0;
      let embeddingProvider: string | undefined;

      if (params.content !== undefined) {
        const embedding = await this.embeddingService.generateEmbedding(params.content, {
          organizationId: params.organization_id,
          userId: params.user_id,
          memoryId: id,
          operation: 'update'
        });

        updatePayload.content = params.content;
        updatePayload.embedding = embedding.embedding;
        embeddingTokens = embedding.tokensUsed;
        embeddingProvider = embedding.provider;

        metadata = ensureMetadataObject(metadata, {
          embedding_provider: embedding.provider,
          embedding_model: embedding.model,
          embedding_tokens_used: embedding.tokensUsed,
          embedding_cost_usd: embedding.costUSD,
          embedding_updated_at: new Date().toISOString()
        });
      }

      if (Object.keys(metadata).length) {
        updatePayload.metadata = metadata;
      }

      const { data, error } = await this.supabase
        .from('memory_entries')
        .update(updatePayload)
        .eq('id', id)
        .eq('organization_id', params.organization_id)
        .select('*')
        .single();

      if (error) {
        logger.error('Failed to update memory', { id, updatePayload, error });
        throw this.mapSupabaseError(error, 'Failed to update memory entry');
      }

      metrics.incrementCounter('memory_operations_total', {
        ...operationLabels,
        outcome: 'success'
      });

      await this.logAuditEvent('memory.updated', params.organization_id, params.user_id, id, {
        updated_fields: Object.keys(updatePayload),
        embedding_tokens_used: embeddingTokens,
        embedding_provider: embeddingProvider,
        trace_id: params.trace_id
      });

      logPerformance('mcp_core_memory_update', Date.now() - startTime, {
        memory_id: id,
        organization_id: params.organization_id
      });

      return data as MemoryEntry;
    } catch (error) {
      metrics.incrementCounter('memory_operations_total', {
        ...operationLabels,
        outcome: 'failure'
      });

      if (
        error instanceof InternalServerError ||
        error instanceof NotFoundError ||
        error instanceof AuthorizationError
      ) {
        throw error;
      }

      logger.error('Unexpected error updating memory', {
        error: error instanceof Error ? error.message : error
      });
      throw new InternalServerError('Failed to update memory entry');
    }
  }

  async deleteMemory(params: DeleteMemoryParams): Promise<void> {
    const { id, organization_id, user_id, requireOwnership = true } = params;
    const operationLabels = {
      operation: 'delete',
      organization_id
    };

    const existing = await this.getMemoryById(id, organization_id);

    if (!existing) {
      throw new NotFoundError('Memory not found');
    }

    if (requireOwnership && existing.user_id !== user_id) {
      throw new AuthorizationError('You can only delete memories you created');
    }

    const { error } = await this.supabase
      .from('memory_entries')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization_id);

    if (error) {
      logger.error('Failed to delete memory', { id, organization_id, error });
      throw this.mapSupabaseError(error, 'Failed to delete memory entry');
    }

    metrics.incrementCounter('memory_operations_total', {
      ...operationLabels,
      outcome: 'success'
    });

    await this.logAuditEvent('memory.deleted', organization_id, user_id, id, {
      memory_type: existing.memory_type,
      trace_id: params.trace_id
    });
  }

  async updateAccessTracking(id: string): Promise<void> {
    const { error } = await this.supabase.rpc('update_memory_access', {
      memory_id_param: id
    });

    if (error) {
      logger.warn('Failed to update access tracking', { id, error });
    }
  }

  async bulkDeleteMemories(
    memoryIds: string[],
    organizationId: string,
    userId: string
  ): Promise<{ deleted_count: number; failed_ids: string[] }> {
    const failedIds: string[] = [];
    const startTime = Date.now();
    let deletedCount = 0;

    for (const memoryId of memoryIds) {
      try {
        await this.deleteMemory({
          id: memoryId,
          organization_id: organizationId,
          user_id: userId,
          requireOwnership: false
        });
        deletedCount += 1;
      } catch (error) {
        failedIds.push(memoryId);
        logger.warn('Failed to delete memory during bulk operation', {
          memoryId,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    await this.logAuditEvent('memory.bulk_deleted', organizationId, userId, undefined, {
      requested_count: memoryIds.length,
      deleted_count: deletedCount,
      failed_ids: failedIds
    });

    logPerformance('mcp_core_memory_bulk_delete', Date.now() - startTime, {
      organization_id: organizationId,
      requested_count: memoryIds.length,
      deleted_count: deletedCount,
      failed_count: failedIds.length
    });

    return {
      deleted_count: deletedCount,
      failed_ids: failedIds
    };
  }

  private async logAuditEvent(
    action: string,
    organizationId: string,
    userId: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await this.supabase
        .from('usage_analytics')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          action,
          resource_type: 'memory',
          resource_id: resourceId ?? null,
          metadata: metadata ?? {},
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.warn('Failed to log audit event', {
        action,
        organizationId,
        userId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private mapSupabaseError(error: SupabaseError, fallbackMessage: string): Error {
    if (!error) {
      return new InternalServerError(fallbackMessage);
    }

    if (isPermissionError(error)) {
      return new AuthorizationError('Operation not permitted by security policies');
    }

    if (error.code === '23505') {
      return new InternalServerError('Duplicate memory entry detected');
    }

    if (error.code === 'PGRST116') {
      return new NotFoundError('Requested resource was not found');
    }

    return new InternalServerError(fallbackMessage);
  }
}
