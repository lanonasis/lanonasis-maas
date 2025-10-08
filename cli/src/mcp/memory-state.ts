/**
 * Memory State Management System
 * Implements comprehensive memory lifecycle management inspired by mem0's state system
 */

import { CLIConfig } from '../utils/config.js';
import { logger } from './logger.js';

export enum MemoryState {
  ACTIVE = "active",
  PAUSED = "paused",
  ARCHIVED = "archived",
  DELETED = "deleted"
}

export interface MemoryStateTransition {
  id: string;
  memory_id: string;
  from_state: MemoryState;
  to_state: MemoryState;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  user_id: string;
}

export interface LanonasisMemory {
  id: string;
  user_id: string;
  app_id: string;
  title: string;
  content: string;
  state: MemoryState;
  metadata: Record<string, any>;
  categories: string[];
  created_at: string;
  updated_at: string;
  archived_at?: string;
  deleted_at?: string;
}

export interface BulkOperationResult {
  memory_id: string;
  success: boolean;
  previous_state: MemoryState;
  new_state: MemoryState;
  error?: string;
}

export class MemoryStateManager {
  private config: CLIConfig;
  private stateTransitions: MemoryStateTransition[] = [];

  constructor() {
    this.config = new CLIConfig();
  }

  async initialize(): Promise<void> {
    logger.info('Memory State Manager initialized');
  }

  /**
   * Update memory state with validation and history tracking
   */
  async updateMemoryState(
    memoryId: string,
    newState: MemoryState,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<MemoryStateTransition> {
    try {
      // Get current memory state
      const memory = await this.getMemory(memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }

      const currentState = memory.state;

      // Validate state transition
      if (!this.isValidTransition(currentState, newState)) {
        throw new Error(`Invalid state transition from ${currentState} to ${newState}`);
      }

      // Create state transition record
      const transition: MemoryStateTransition = {
        id: this.generateTransitionId(),
        memory_id: memoryId,
        from_state: currentState,
        to_state: newState,
        reason,
        metadata,
        timestamp: new Date().toISOString(),
        user_id: await this.getCurrentUserId()
      };

      // Update memory state via API
      await this.updateMemoryViaAPI(memoryId, {
        state: newState,
        updated_at: transition.timestamp,
        ...(newState === MemoryState.ARCHIVED && { archived_at: transition.timestamp }),
        ...(newState === MemoryState.DELETED && { deleted_at: transition.timestamp })
      });

      // Record transition
      this.stateTransitions.push(transition);

      logger.info('Memory state updated', {
        memoryId,
        fromState: currentState,
        toState: newState,
        reason
      });

      return transition;
    } catch (error) {
      logger.error('Failed to update memory state', { error, memoryId, newState });
      throw error;
    }
  }

  /**
   * Bulk state update operations
   */
  async bulkUpdateState(
    memoryIds: string[],
    operation: 'pause' | 'delete' | 'archive'
  ): Promise<BulkOperationResult[]> {
    const results: BulkOperationResult[] = [];
    const targetState = this.operationToState(operation);

    for (const memoryId of memoryIds) {
      try {
        const memory = await this.getMemory(memoryId);
        if (!memory) {
          results.push({
            memory_id: memoryId,
            success: false,
            previous_state: MemoryState.ACTIVE,
            new_state: targetState,
            error: 'Memory not found'
          });
          continue;
        }

        const previousState = memory.state;

        // Skip if already in target state
        if (previousState === targetState) {
          results.push({
            memory_id: memoryId,
            success: true,
            previous_state: previousState,
            new_state: targetState
          });
          continue;
        }

        // Perform state transition
        await this.updateMemoryState(
          memoryId,
          targetState,
          `Bulk ${operation} operation`
        );

        results.push({
          memory_id: memoryId,
          success: true,
          previous_state: previousState,
          new_state: targetState
        });
      } catch (error) {
        results.push({
          memory_id: memoryId,
          success: false,
          previous_state: MemoryState.ACTIVE,
          new_state: targetState,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info('Bulk state update completed', {
      operation,
      totalMemories: memoryIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Get memory state history
   */
  getMemoryStateHistory(memoryId: string): MemoryStateTransition[] {
    return this.stateTransitions
      .filter(t => t.memory_id === memoryId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get memories by state
   */
  async getMemoriesByState(
    state: MemoryState,
    userId?: string,
    appId?: string,
    limit: number = 100
  ): Promise<LanonasisMemory[]> {
    try {
      const params = new URLSearchParams({
        state,
        limit: limit.toString(),
        ...(userId && { user_id: userId }),
        ...(appId && { app_id: appId })
      });

      const memories = await this.callMemoryAPI('GET', `/memory?${params}`);
      return memories.memories || [];
    } catch (error) {
      logger.error('Failed to get memories by state', { error, state, userId, appId });
      return [];
    }
  }

  /**
   * Archive old memories based on policy
   */
  async archiveOldMemories(
    beforeDate: string,
    userId?: string,
    appId?: string
  ): Promise<BulkOperationResult[]> {
    try {
      // Get memories created before the specified date
      const params = new URLSearchParams({
        before: beforeDate,
        state: MemoryState.ACTIVE,
        ...(userId && { user_id: userId }),
        ...(appId && { app_id: appId })
      });

      const memories = await this.callMemoryAPI('GET', `/memory?${params}`);
      const memoryIds = memories.memories?.map((m: any) => m.id) || [];

      if (memoryIds.length === 0) {
        return [];
      }

      return await this.bulkUpdateState(memoryIds, 'archive');
    } catch (error) {
      logger.error('Failed to archive old memories', { error, beforeDate, userId, appId });
      return [];
    }
  }

  /**
   * Restore memories from archived/paused state
   */
  async restoreMemories(memoryIds: string[]): Promise<BulkOperationResult[]> {
    const results: BulkOperationResult[] = [];

    for (const memoryId of memoryIds) {
      try {
        const memory = await this.getMemory(memoryId);
        if (!memory) {
          results.push({
            memory_id: memoryId,
            success: false,
            previous_state: MemoryState.ARCHIVED,
            new_state: MemoryState.ACTIVE,
            error: 'Memory not found'
          });
          continue;
        }

        const previousState = memory.state;

        // Only restore from paused or archived states
        if (previousState !== MemoryState.PAUSED && previousState !== MemoryState.ARCHIVED) {
          results.push({
            memory_id: memoryId,
            success: false,
            previous_state: previousState,
            new_state: MemoryState.ACTIVE,
            error: `Cannot restore from ${previousState} state`
          });
          continue;
        }

        await this.updateMemoryState(
          memoryId,
          MemoryState.ACTIVE,
          'Memory restoration'
        );

        results.push({
          memory_id: memoryId,
          success: true,
          previous_state: previousState,
          new_state: MemoryState.ACTIVE
        });
      } catch (error) {
        results.push({
          memory_id: memoryId,
          success: false,
          previous_state: MemoryState.ARCHIVED,
          new_state: MemoryState.ACTIVE,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Private helper methods
   */
  private isValidTransition(fromState: MemoryState, toState: MemoryState): boolean {
    const validTransitions: Record<MemoryState, MemoryState[]> = {
      [MemoryState.ACTIVE]: [MemoryState.PAUSED, MemoryState.ARCHIVED, MemoryState.DELETED],
      [MemoryState.PAUSED]: [MemoryState.ACTIVE, MemoryState.ARCHIVED, MemoryState.DELETED],
      [MemoryState.ARCHIVED]: [MemoryState.ACTIVE, MemoryState.DELETED],
      [MemoryState.DELETED]: [] // No transitions from deleted state
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  private operationToState(operation: string): MemoryState {
    switch (operation) {
      case 'pause':
        return MemoryState.PAUSED;
      case 'archive':
        return MemoryState.ARCHIVED;
      case 'delete':
        return MemoryState.DELETED;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async getMemory(memoryId: string): Promise<LanonasisMemory | null> {
    try {
      const response = await this.callMemoryAPI('GET', `/memory/${memoryId}`);
      return response;
    } catch (error) {
      logger.error('Failed to get memory', { error, memoryId });
      return null;
    }
  }

  private async updateMemoryViaAPI(memoryId: string, updates: Partial<LanonasisMemory>): Promise<void> {
    await this.callMemoryAPI('PUT', `/memory/${memoryId}`, updates);
  }

  private async callMemoryAPI(method: string, endpoint: string, data?: any): Promise<any> {
    const apiUrl = this.config.get('apiUrl') || 'https://api.lanonasis.com';
    const token = this.config.get('token');

    const axios = (await import('axios')).default;
    
    const response = await axios({
      method,
      url: `${apiUrl}/api/v1${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data
    });

    return response.data;
  }

  private async getCurrentUserId(): Promise<string> {
    const token = this.config.get('token');
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.sub || payload.user_id || 'anonymous';
      } catch {
        return 'anonymous';
      }
    }
    return 'anonymous';
  }

  private generateTransitionId(): string {
    return `transition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}