/**
 * MaaSClientAdapter — wraps @lanonasis/memory-client's MemoryClient as
 * a MemoryBackend so the router can treat it uniformly with the local
 * SQLite backend.
 *
 * Mapping notes:
 *   - searchMemories: MaaS returns MemorySearchResult[] with similarity_score.
 *     We map to MemoryHit with score = similarity_score (0..1).
 *   - listMemories: paginated; the router passes `limit`.
 *   - getMemory: returns MemoryEntry by id; null if not found.
 *   - createMemory: returns { id, maas_id, ... }; we mark syncedToMaaS=true.
 *   - updateMemory / deleteMemory: not in the v1 contract; route through create
 *     (which is upsert by idempotency_key in MaaS) or call deleteMemory.
 *   - health: returns maas:true on success, maas:false on transport failure.
 */

import type {
  BackendHealth,
  ListOptions,
  MemoryBackend,
  MemoryHit,
  MemoryRecord,
  MemoryStatus,
  MemoryType,
  SaveResult,
  SearchOptions,
} from './types.js';
import { MemoryBackendError } from './types.js';

// We type-import only so we don't pull the full package into the type
// graph; the actual MemoryClient is injected by the caller.
interface MemoryClientLike {
  searchMemories(args: {
    query: string;
    limit?: number;
    threshold?: number;
    status?: string;
    memory_types?: string[];
  }): Promise<{
    data?: {
      results?: Array<{
        id: string;
        title?: string;
        content?: string;
        memory_type?: string;
        status?: string;
        tags?: string[];
        similarity_score?: number;
        created_at?: string;
        updated_at?: string;
      }>;
    };
    error?: string;
  }>;
  listMemories(args: {
    limit?: number;
    cursor?: string;
    type?: string;
  }): Promise<{
    data?: {
      data?: Array<{
        id: string;
        title?: string;
        content?: string;
        memory_type?: string;
        status?: string;
        tags?: string[];
        created_at?: string;
        updated_at?: string;
      }>;
    };
    error?: string;
  }>;
  getMemory(id: string): Promise<{
    data?: {
      id: string;
      title?: string;
      content?: string;
      memory_type?: string;
      status?: string;
      tags?: string[];
      created_at?: string;
      updated_at?: string;
    };
    error?: string;
  }>;
  createMemory(args: {
    title: string;
    content: string;
    type?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<{ data?: { id: string }; error?: string }>;
  deleteMemory(id: string): Promise<{ error?: string }>;
}

export class MaaSClientAdapter implements MemoryBackend {
  constructor(private readonly client: MemoryClientLike) {}

  async search(query: string, opts: SearchOptions = {}): Promise<MemoryHit[]> {
    const res = await this.client.searchMemories({
      query,
      limit: opts.limit ?? 10,
      status: opts.status ?? 'active',
      memory_types: opts.type ? [opts.type] : undefined,
    });
    if (res.error) throw new MemoryBackendError(res.error, 'transport');
    const rows = res.data?.results ?? [];
    return rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      content: r.content ?? '',
      score: typeof r.similarity_score === 'number' ? r.similarity_score : 0,
      source: 'maas' as const,
      memory_type: (r.memory_type ?? 'context') as MemoryType,
      tags: Array.isArray(r.tags) ? r.tags : [],
      created_at: r.created_at,
    }));
  }

  async get(id: string): Promise<MemoryRecord | null> {
    const res = await this.client.getMemory(id);
    if (res.error) {
      if (/not found|404/i.test(res.error)) return null;
      throw new MemoryBackendError(res.error, 'transport');
    }
    if (!res.data) return null;
    const d = res.data;
    return {
      id: d.id,
      title: d.title ?? '',
      content: d.content ?? '',
      memory_type: (d.memory_type ?? 'context') as MemoryType,
      status: (d.status ?? 'active') as MemoryStatus,
      tags: Array.isArray(d.tags) ? d.tags : [],
      source: 'maas-sync',
      created_at: d.created_at ?? new Date().toISOString(),
      updated_at: d.updated_at ?? new Date().toISOString(),
    };
  }

  async list(opts: ListOptions = {}): Promise<MemoryRecord[]> {
    const res = await this.client.listMemories({
      limit: opts.limit ?? 50,
      type: opts.type,
    });
    if (res.error) throw new MemoryBackendError(res.error, 'transport');
    const rows = res.data?.data ?? [];
    return rows.map((d) => ({
      id: d.id,
      title: d.title ?? '',
      content: d.content ?? '',
      memory_type: (d.memory_type ?? 'context') as MemoryType,
      status: (d.status ?? 'active') as MemoryStatus,
      tags: Array.isArray(d.tags) ? d.tags : [],
      source: 'maas-sync',
      created_at: d.created_at ?? new Date().toISOString(),
      updated_at: d.updated_at ?? new Date().toISOString(),
    }));
  }

  async save(
    record: Omit<MemoryRecord, 'created_at' | 'updated_at' | 'source'> & { source?: MemoryRecord['source'] },
  ): Promise<SaveResult> {
    const res = await this.client.createMemory({
      title: record.title,
      content: record.content,
      type: record.memory_type,
      tags: record.tags,
      metadata: record.metadata,
    });
    if (res.error) {
      // 4xx → schema/auth error, don't queue.
      if (/400|401|403|validation|schema/i.test(res.error)) {
        throw new MemoryBackendError(res.error, 'schema');
      }
      throw new MemoryBackendError(res.error, 'transport');
    }
    return {
      id: res.data?.id ?? record.id,
      syncedToMaaS: true,
      pendingSync: 0,
    };
  }

  async delete(id: string): Promise<void> {
    const res = await this.client.deleteMemory(id);
    if (res.error && !/not found|404/i.test(res.error)) {
      throw new MemoryBackendError(res.error, 'transport');
    }
  }

  async health(): Promise<BackendHealth> {
    try {
      const res = await this.client.listMemories({ limit: 1 });
      return {
        maas: !res.error,
        local: false,
        pendingSync: 0,
      };
    } catch {
      return { maas: false, local: false, pendingSync: 0 };
    }
  }

  async close(): Promise<void> {
    // MemoryClient has no close; nothing to release.
  }
}
