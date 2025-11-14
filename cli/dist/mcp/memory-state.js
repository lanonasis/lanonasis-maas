/**
 * Memory State Management System
 * Implements comprehensive memory lifecycle management inspired by mem0's state system
 */
import { CLIConfig } from '../utils/config.js';
import { logger } from './logger.js';
export var MemoryState;
(function (MemoryState) {
    MemoryState["ACTIVE"] = "active";
    MemoryState["PAUSED"] = "paused";
    MemoryState["ARCHIVED"] = "archived";
    MemoryState["DELETED"] = "deleted";
})(MemoryState || (MemoryState = {}));
export class MemoryStateManager {
    config;
    stateTransitions = [];
    constructor() {
        this.config = new CLIConfig();
    }
    async initialize() {
        logger.info('Memory State Manager initialized');
    }
    /**
     * Update memory state with validation and history tracking
     */
    async updateMemoryState(memoryId, newState, reason, metadata) {
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
            const transition = {
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
                archived_at: newState === MemoryState.ARCHIVED
                    ? transition.timestamp
                    : null,
                deleted_at: newState === MemoryState.DELETED
                    ? transition.timestamp
                    : null
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
        }
        catch (error) {
            logger.error('Failed to update memory state', { error, memoryId, newState });
            throw error;
        }
    }
    /**
     * Bulk state update operations
     */
    async bulkUpdateState(memoryIds, operation) {
        const results = [];
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
                await this.updateMemoryState(memoryId, targetState, `Bulk ${operation} operation`);
                results.push({
                    memory_id: memoryId,
                    success: true,
                    previous_state: previousState,
                    new_state: targetState
                });
            }
            catch (error) {
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
    getMemoryStateHistory(memoryId) {
        return this.stateTransitions
            .filter(t => t.memory_id === memoryId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    /**
     * Get memories by state
     */
    async getMemoriesByState(state, userId, appId, limit = 100) {
        try {
            const params = new URLSearchParams({
                state,
                limit: limit.toString(),
                ...(userId && { user_id: userId }),
                ...(appId && { app_id: appId })
            });
            const memories = await this.callMemoryAPI('GET', `/memory?${params}`);
            return memories.memories || [];
        }
        catch (error) {
            logger.error('Failed to get memories by state', { error, state, userId, appId });
            return [];
        }
    }
    /**
     * Archive old memories based on policy
     */
    async archiveOldMemories(beforeDate, userId, appId) {
        try {
            // Get memories created before the specified date
            const params = new URLSearchParams({
                before: beforeDate,
                state: MemoryState.ACTIVE,
                ...(userId && { user_id: userId }),
                ...(appId && { app_id: appId })
            });
            const memories = await this.callMemoryAPI('GET', `/memory?${params}`);
            const memoryIds = memories.memories?.map((m) => m.id) || [];
            if (memoryIds.length === 0) {
                return [];
            }
            return await this.bulkUpdateState(memoryIds, 'archive');
        }
        catch (error) {
            logger.error('Failed to archive old memories', { error, beforeDate, userId, appId });
            return [];
        }
    }
    /**
     * Restore memories from archived/paused state
     */
    async restoreMemories(memoryIds) {
        const results = [];
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
                await this.updateMemoryState(memoryId, MemoryState.ACTIVE, 'Memory restoration');
                results.push({
                    memory_id: memoryId,
                    success: true,
                    previous_state: previousState,
                    new_state: MemoryState.ACTIVE
                });
            }
            catch (error) {
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
    isValidTransition(fromState, toState) {
        const validTransitions = {
            [MemoryState.ACTIVE]: [MemoryState.PAUSED, MemoryState.ARCHIVED, MemoryState.DELETED],
            [MemoryState.PAUSED]: [MemoryState.ACTIVE, MemoryState.ARCHIVED, MemoryState.DELETED],
            [MemoryState.ARCHIVED]: [MemoryState.ACTIVE, MemoryState.DELETED],
            [MemoryState.DELETED]: [] // No transitions from deleted state
        };
        return validTransitions[fromState]?.includes(toState) || false;
    }
    operationToState(operation) {
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
    async getMemory(memoryId) {
        try {
            const response = await this.callMemoryAPI('GET', `/memory/${memoryId}`);
            return response;
        }
        catch (error) {
            logger.error('Failed to get memory', { error, memoryId });
            return null;
        }
    }
    async updateMemoryViaAPI(memoryId, updates) {
        await this.callMemoryAPI('PUT', `/memory/${memoryId}`, updates);
    }
    async callMemoryAPI(method, endpoint, data) {
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
    async getCurrentUserId() {
        const token = this.config.get('token');
        if (token) {
            try {
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                return payload.sub || payload.user_id || 'anonymous';
            }
            catch {
                return 'anonymous';
            }
        }
        return 'anonymous';
    }
    generateTransitionId() {
        return `transition_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
}
