/**
 * MemoryBackendRouter — preference chain for read/write operations.
 *
 * READ path:
 *   1. Local backend (sub-ms, authoritative for this CLI)
 *   2. MaaS (semantic enrichment, ≤ syncTimeoutMs)
 *   3. Merge + dedup by content-hash
 *
 * WRITE path:
 *   1. Local backend (immediate, durable)
 *   2. Try MaaS direct write if healthy (≤ syncTimeoutMs)
 *   3. If MaaS fails → enqueue async sync (drained by AsyncSyncQueueRunner)
 *
 * HEALTH:
 *   - maas: false when last health probe failed AND we're within
 *     `offlineGracePeriodMs`. After grace expires, every read skips
 *     the remote probe entirely (fast offline mode).
 *
 * The router is what the orchestrator sees — `client.searchMemories`
 * is replaced by `router.search`. See COMPARISON.md and
 * pi-maas-integration-review.md for rationale.
 */

import { createHash } from 'node:crypto';

import type {
  BackendHealth,
  ListOptions,
  MemoryBackend,
  MemoryHit,
  MemoryRecord,
  SaveResult,
  SearchOptions,
} from './types.js';
import { MemoryBackendError } from './types.js';

export interface RouterOptions {
  preferRemote?: boolean;        // default: false (local wins on tie)
  remoteTimeoutMs?: number;      // default: 800
  cacheTtlMs?: number;           // default: 5 * 60_000
  offlineGracePeriodMs?: number; // default: 30_000
  healthProbeIntervalMs?: number;// default: 60_000
  /** When true, log routing decisions to stderr (debug aid). */
  debug?: boolean;               // default: false
}

const DEFAULTS: Required<RouterOptions> = {
  preferRemote: false,
  remoteTimeoutMs: 800,
  cacheTtlMs: 5 * 60_000,
  offlineGracePeriodMs: 30_000,
  healthProbeIntervalMs: 60_000,
  debug: false,
};

interface CacheEntry<T> {
  expiresAt: number;
  hits: number;
  value: T;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new MemoryBackendError(`timeout after ${ms}ms`, 'transport')), ms);
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

function contentHash(content: string, title: string): string {
  return createHash('sha256').update(`${title}::${content}`).digest('hex').slice(0, 16);
}

export class MemoryBackendRouter implements MemoryBackend {
  private readonly local: MemoryBackend;
  private readonly remote: MemoryBackend | null;
  private readonly options: Required<RouterOptions>;
  private readonly cache = new Map<string, CacheEntry<MemoryHit[]>>();
  private maasHealthy = true;
  private lastHealthProbeAt = 0;
  private lastHealthProbeResult = false;
  private consecutiveProbeFailures = 0;

  constructor(local: MemoryBackend, remote: MemoryBackend | null, options: RouterOptions = {}) {
    this.local = local;
    this.remote = remote;
    this.options = { ...DEFAULTS, ...options };
  }

  /** Force-clear the in-memory cache. Useful after a sync write. */
  invalidateCache(): void {
    this.cache.clear();
  }

  private cacheKey(query: string, opts: SearchOptions | undefined): string {
    return JSON.stringify({ q: query, type: opts?.type, limit: opts?.limit, status: opts?.status });
  }

  private async probeMaaS(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthProbeAt < this.options.healthProbeIntervalMs) {
      return this.lastHealthProbeResult;
    }
    this.lastHealthProbeAt = now;
    if (!this.remote) {
      this.lastHealthProbeResult = false;
      return false;
    }
    try {
      const h = await this.remote.health();
      this.lastHealthProbeResult = h.maas;
      this.consecutiveProbeFailures = h.maas ? 0 : this.consecutiveProbeFailures + 1;
      if (!h.maas) {
        this.maasHealthy = false;
      } else if (this.consecutiveProbeFailures === 0) {
        this.maasHealthy = true;
      }
    } catch {
      this.lastHealthProbeResult = false;
      this.consecutiveProbeFailures++;
      this.maasHealthy = false;
    }
    return this.lastHealthProbeResult;
  }

  private debugLog(...args: unknown[]): void {
    if (this.options.debug) {
      // eslint-disable-next-line no-console
      console.warn('[memory-router]', ...args);
    }
  }

  async search(query: string, opts: SearchOptions = {}): Promise<MemoryHit[]> {
    const key = this.cacheKey(query, opts);
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      cached.hits++;
      return cached.value;
    }

    const localHits = await this.local.search(query, opts).catch((err) => {
      this.debugLog('local.search failed', err);
      return [] as MemoryHit[];
    });

    // Decide whether to probe remote.
    const remoteHealthy = await this.probeMaaS();
    const withinGrace = this.consecutiveProbeFailures * this.options.healthProbeIntervalMs
      < this.options.offlineGracePeriodMs;

    if (!this.remote || !remoteHealthy || !withinGrace) {
      this.debugLog('skip remote', { remoteHealthy, consecutiveProbeFailures: this.consecutiveProbeFailures });
      this.cache.set(key, { expiresAt: Date.now() + this.options.cacheTtlMs, hits: 0, value: localHits });
      return localHits;
    }

    let remoteHits: MemoryHit[] = [];
    try {
      remoteHits = await withTimeout(this.remote.search(query, opts), this.options.remoteTimeoutMs);
    } catch (err) {
      this.debugLog('remote.search failed', err);
      // Treat as transient — bump probe failures.
      this.consecutiveProbeFailures++;
      this.lastHealthProbeAt = 0; // force re-probe next call
    }

    const merged = mergeHits(localHits, remoteHits, this.options.preferRemote);
    this.cache.set(key, { expiresAt: Date.now() + this.options.cacheTtlMs, hits: 0, value: merged });
    return merged;
  }

  async get(id: string): Promise<MemoryRecord | null> {
    const local = await this.local.get(id).catch(() => null);
    if (local) return local;
    if (!this.remote) return null;
    try {
      const remote = await withTimeout(this.remote.get(id), this.options.remoteTimeoutMs);
      // Best-effort backfill into local so future reads are fast.
      if (remote) {
        // Use 'maas-sync' source — it represents a remote-pulled record.
        try {
          await this.local.save({ ...remote, source: 'maas-sync' });
        } catch { /* best effort */ }
      }
      return remote;
    } catch {
      return null;
    }
  }

  async list(opts: ListOptions = {}): Promise<MemoryRecord[]> {
    const local = await this.local.list(opts).catch(() => []);
    if (!this.remote) return local;
    let remote: MemoryRecord[] = [];
    try {
      remote = await withTimeout(this.remote.list(opts), this.options.remoteTimeoutMs);
    } catch {
      return local;
    }
    // Merge by id; local wins.
    const seen = new Set(local.map((r) => r.id));
    return [...local, ...remote.filter((r) => !seen.has(r.id))];
  }

  async save(
    record: Omit<MemoryRecord, 'created_at' | 'updated_at' | 'source'> & { source?: MemoryRecord['source'] },
  ): Promise<SaveResult> {
    // Local-first, durable immediately.
    const result = await this.local.save({ ...record, source: record.source ?? 'local' });

    // Best-effort direct sync. If it fails, the sync_queue (populated by
    // local.save()) will retry on the next tick.
    if (this.remote) {
      try {
        await withTimeout(
          this.remote.save({ ...record, source: 'maas-sync' }),
          this.options.remoteTimeoutMs,
        );
        // Remote succeeded — drain the queue row we just enqueued so
        // AsyncSyncQueueRunner doesn't redundantly re-submit later.
        // The LocalMemoryBackend.removeQueuedForRecord() call is best-effort;
        // if it fails, the queue still drains correctly on the next tick
        // (the submitter will be idempotent on duplicate submit).
        if (this.local && 'removeQueuedForRecord' in this.local) {
          (this.local as unknown as {
            removeQueuedForRecord(id: string): number;
          }).removeQueuedForRecord(record.id);
        }
        this.invalidateCache();
        return {
          id: result.id,
          syncedToMaaS: true,
          pendingSync: 0,
        };
      } catch (err) {
        this.debugLog('remote.save failed; falling back to queue', err);
        this.consecutiveProbeFailures++;
        this.lastHealthProbeAt = 0;
        // pendingSync from local.save() reflects the queued retry.
      }
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    await this.local.delete(id).catch(() => { /* best effort */ });
    if (this.remote) {
      try {
        await withTimeout(this.remote.delete(id), this.options.remoteTimeoutMs);
      } catch (err) {
        this.debugLog('remote.delete failed; will retry via queue', err);
        this.consecutiveProbeFailures++;
        this.lastHealthProbeAt = 0;
      }
    }
    this.invalidateCache();
  }

  async health(): Promise<BackendHealth> {
    const local = await this.local.health().catch(() => ({ local: false, maas: false, pendingSync: 0 } as BackendHealth));
    let remoteMaas = false;
    if (this.remote) {
      try {
        const h = await withTimeout(this.remote.health(), this.options.remoteTimeoutMs);
        remoteMaas = h.maas;
      } catch {
        remoteMaas = false;
      }
    }
    return {
      maas: remoteMaas,
      local: local.local,
      pendingSync: local.pendingSync,
    };
  }

  async close(): Promise<void> {
    await Promise.all([
      this.local.close().catch(() => { /* best effort */ }),
      this.remote?.close().catch(() => { /* best effort */ }) ?? Promise.resolve(),
    ]);
    this.cache.clear();
  }
}

/**
 * Merge local + remote hits by content-hash, dedup, keep the higher score.
 * When preferRemote is true and a record exists on both, the remote wins.
 */
export function mergeHits(
  local: MemoryHit[],
  remote: MemoryHit[],
  preferRemote: boolean,
): MemoryHit[] {
  if (remote.length === 0) return local;
  if (local.length === 0) return remote.map((r) => ({ ...r, source: r.source === 'local' ? 'local' : 'maas' }));

  const merged = new Map<string, MemoryHit>();
  for (const h of local) {
    merged.set(contentHash(h.content, h.title), { ...h, source: 'local' });
  }
  for (const h of remote) {
    const key = contentHash(h.content, h.title);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...h, source: 'maas' });
      continue;
    }
    const takeRemote = preferRemote || h.score > existing.score;
    merged.set(key, takeRemote
      ? { ...h, source: 'merged' }
      : { ...existing, source: 'merged' });
  }

  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}
