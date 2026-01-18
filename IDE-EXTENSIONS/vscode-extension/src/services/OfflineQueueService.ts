import * as vscode from 'vscode';
import { randomBytes, randomUUID } from 'crypto';
import type { CreateMemoryRequest, MemoryEntry } from '@lanonasis/memory-client';
import type { IMemoryService } from './IMemoryService';
import { MemoryCache } from './MemoryCache';
import { logExtensionError } from '../utils/errorLogger';

type OfflineOperation =
  | {
      id: string;
      type: 'create';
      tempId: string;
      payload: CreateMemoryRequest;
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'update';
      payload: { id: string; updates: Partial<CreateMemoryRequest> };
      createdAt: number;
      attempts: number;
      lastError?: string;
    }
  | {
      id: string;
      type: 'delete';
      payload: { id: string };
      createdAt: number;
      attempts: number;
      lastError?: string;
    };

export interface OfflineQueueStatus {
  pending: number;
  syncing: boolean;
  lastError?: string;
  lastSyncAt?: number;
}

const QUEUE_STORAGE_KEY = 'lanonasis.offline.queue';

export class OfflineQueueService implements vscode.Disposable {
  private queue: OfflineOperation[] = [];
  private syncing = false;
  private lastError?: string;
  private lastSyncAt?: number;
  private readonly emitter = new vscode.EventEmitter<OfflineQueueStatus>();
  private retryTimer?: NodeJS.Timeout;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly output: vscode.OutputChannel,
    private readonly memoryService: IMemoryService,
    private readonly memoryCache: MemoryCache
  ) {
    this.loadQueue();
  }

  public readonly onDidChangeStatus = this.emitter.event;

  public getStatus(): OfflineQueueStatus {
    return {
      pending: this.queue.length,
      syncing: this.syncing,
      lastError: this.lastError,
      lastSyncAt: this.lastSyncAt
    };
  }

  public enqueueCreate(payload: CreateMemoryRequest): string {
    const tempId = this.generateTempId();
    this.queue.push({
      id: this.generateOperationId(),
      type: 'create',
      tempId,
      payload,
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
    return tempId;
  }

  public enqueueUpdate(id: string, updates: Partial<CreateMemoryRequest>): void {
    this.queue.push({
      id: this.generateOperationId(),
      type: 'update',
      payload: { id, updates },
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
  }

  public enqueueDelete(id: string): void {
    this.queue.push({
      id: this.generateOperationId(),
      type: 'delete',
      payload: { id },
      createdAt: Date.now(),
      attempts: 0
    });
    this.saveQueue();
  }

  public async sync(): Promise<void> {
    if (this.syncing || this.queue.length === 0) {
      return;
    }

    this.syncing = true;
    this.emitStatus();
    this.clearRetry();

    try {
      while (this.queue.length > 0) {
        const current = this.queue[0];
        if (!current) break;

        if (current.type === 'create') {
          const created = await this.memoryService.createMemory(current.payload);
          await this.handleCreateResult(current, created);
          this.queue.shift();
        } else if (current.type === 'update') {
          const targetId = current.payload.id;
          const updated = await this.memoryService.updateMemory(targetId, current.payload.updates);
          await this.memoryCache.upsert(updated);
          this.queue.shift();
        } else {
          const targetId = current.payload.id;
          await this.memoryService.deleteMemory(targetId);
          await this.memoryCache.remove(targetId);
          this.queue.shift();
        }

        this.lastError = undefined;
        this.lastSyncAt = Date.now();
        await this.saveQueue();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const current = this.queue[0];
      if (current) {
        current.attempts += 1;
        current.lastError = message;
      }
      this.lastError = message;
      await this.saveQueue();
      const classified = await logExtensionError(this.context, this.output, error, 'offline-queue-sync');

      if (classified.category === 'conflict') {
        this.output.appendLine(`[OfflineQueue] ${classified.message} Details: ${message}`);
        vscode.window.showWarningMessage(classified.message);
      } else {
        this.scheduleRetry(current?.attempts ?? 1);
      }
    } finally {
      this.syncing = false;
      this.emitStatus();
    }
  }

  public async clear(): Promise<void> {
    this.queue = [];
    this.lastError = undefined;
    this.lastSyncAt = undefined;
    await this.saveQueue();
  }

  private async handleCreateResult(operation: Extract<OfflineOperation, { type: 'create' }>, created: MemoryEntry): Promise<void> {
    await this.memoryCache.replace(operation.tempId, created);

    for (const op of this.queue) {
      if (op.type === 'update' && op.payload.id === operation.tempId) {
        op.payload.id = created.id;
      }
      if (op.type === 'delete' && op.payload.id === operation.tempId) {
        op.payload.id = created.id;
      }
    }
  }

  private scheduleRetry(attempts: number): void {
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.max(attempts - 1, 0)));
    this.retryTimer = setTimeout(() => {
      void this.sync();
    }, delay);
    this.output.appendLine(`[OfflineQueue] Sync failed. Retrying in ${delay}ms`);
  }

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
  }

  private loadQueue(): void {
    try {
      const stored = this.context.globalState.get<OfflineOperation[]>(QUEUE_STORAGE_KEY, []);
      this.queue = Array.isArray(stored) ? stored : [];
    } catch (error) {
      this.output.appendLine(`[OfflineQueue] Failed to load queue: ${error instanceof Error ? error.message : String(error)}`);
      this.queue = [];
    } finally {
      this.emitStatus();
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await this.context.globalState.update(QUEUE_STORAGE_KEY, this.queue);
    } catch (error) {
      this.output.appendLine(`[OfflineQueue] Failed to save queue: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.emitStatus();
    }
  }

  private emitStatus(): void {
    this.emitter.fire(this.getStatus());
  }

  private generateTempId(): string {
    return this.generateId('offline');
  }

  private generateOperationId(): string {
    return this.generateId('op');
  }

  private generateId(prefix: string): string {
    const unique = typeof randomUUID === 'function'
      ? randomUUID()
      : randomBytes(16).toString('hex');
    return `${prefix}-${unique}`;
  }

  public dispose(): void {
    this.clearRetry();
    this.emitter.dispose();
  }
}
