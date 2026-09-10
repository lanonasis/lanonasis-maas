/**
 * Shared types for the local-first memory hybrid.
 *
 * The MemoryBackend contract is the seam between:
 *   - Orchestrator (caller)
 *   - LocalBackend (SQLite FTS5, this CLI's source of truth)
 *   - MaaSClientAdapter (wraps @lanonasis/memory-client)
 *   - MemoryBackendRouter (preference chain: local → remote → graceful degrade)
 *
 * Architecture reference: the Pi/Hermes memory comparison and the local-first
 * REPL hybrid design, captured 2026-09-06.
 */

export type MemoryType =
  | 'context'
  | 'project'
  | 'knowledge'
  | 'reference'
  | 'personal'
  | 'workflow';

export type MemoryStatus = 'active' | 'archived' | 'deleted';

export type MemorySource = 'local' | 'maas-sync' | 'import' | 'merge';

export interface MemoryRecord {
  id: string;
  title: string;
  content: string;
  memory_type: MemoryType;
  status: MemoryStatus;
  tags: string[];
  subject_id?: string;
  source: MemorySource;
  /** Local-only: ISO timestamp when MaaS last confirmed this record. NULL if pending. */
  maas_synced_at?: string | null;
  /** MaaS-assigned id once synced. */
  maas_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  /** Last local read access. Updated on every search/get hit. */
  last_accessed_at?: string | null;
}

export interface MemoryHit {
  id: string;
  title: string;
  content: string;
  /** 0..1 — local BM25 normalized score; remote similarity_score from MaaS. */
  score: number;
  source: 'maas' | 'local' | 'merged';
  memory_type?: MemoryType;
  tags?: string[];
  created_at?: string;
  last_accessed_at?: string;
}

export interface SearchOptions {
  limit?: number;
  /** Filter by memory_type (post-query, client-side). */
  type?: MemoryType;
  /** Filter by subject_id. Defaults to the resolved subject in the router. */
  subjectId?: string;
  /** Status filter, default 'active'. */
  status?: MemoryStatus;
}

export interface ListOptions {
  limit?: number;
  cursor?: string;
  type?: MemoryType;
  subjectId?: string;
}

export interface SaveResult {
  id: string;
  /** True if the record was confirmed on MaaS in this call; false if queued for async sync. */
  syncedToMaaS: boolean;
  /** Pending sync count after this save (only meaningful when syncedToMaaS=false). */
  pendingSync?: number;
}

export interface BackendHealth {
  maas: boolean;
  local: boolean;
  pendingSync: number;
  lastSyncAttemptAt?: string;
  lastSyncErrorAt?: string;
  lastSyncError?: string;
}

/**
 * Unified memory backend contract. Every concrete implementation must
 * throw a structured `MemoryBackendError` (see below) so the router
 * can distinguish transport failures from logical no-hits.
 */
export interface MemoryBackend {
  search(query: string, opts?: SearchOptions): Promise<MemoryHit[]>;
  get(id: string): Promise<MemoryRecord | null>;
  list(opts?: ListOptions): Promise<MemoryRecord[]>;
  save(record: Omit<MemoryRecord, 'created_at' | 'updated_at' | 'source'> & { source?: MemorySource }): Promise<SaveResult>;
  delete(id: string): Promise<void>;
  health(): Promise<BackendHealth>;
  /** Close any open handles (DB, fetch agent). Idempotent. */
  close(): Promise<void>;
}

export class MemoryBackendError extends Error {
  constructor(
    message: string,
    public readonly code: 'transport' | 'auth' | 'schema' | 'not_found' | 'unknown',
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'MemoryBackendError';
  }
}

/**
 * Default storage root for local backend state. Matches the convention
 * used by the openclaw-plugin LocalFallbackWriter so the two stay
 * discoverable.
 */
export const DEFAULT_LOCAL_MEMORY_ROOT = '.lanonasis';
export const DEFAULT_LOCAL_MEMORY_DIRNAME = 'repl-cli';
export const DEFAULT_LOCAL_DB_FILENAME = 'memory.db';
