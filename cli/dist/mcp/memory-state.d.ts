/**
 * Memory State Management System
 * Implements comprehensive memory lifecycle management inspired by mem0's state system
 */
export declare enum MemoryState {
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
export declare class MemoryStateManager {
    private config;
    private stateTransitions;
    constructor();
    initialize(): Promise<void>;
    /**
     * Update memory state with validation and history tracking
     */
    updateMemoryState(memoryId: string, newState: MemoryState, reason?: string, metadata?: Record<string, any>): Promise<MemoryStateTransition>;
    /**
     * Bulk state update operations
     */
    bulkUpdateState(memoryIds: string[], operation: 'pause' | 'delete' | 'archive'): Promise<BulkOperationResult[]>;
    /**
     * Get memory state history
     */
    getMemoryStateHistory(memoryId: string): MemoryStateTransition[];
    /**
     * Get memories by state
     */
    getMemoriesByState(state: MemoryState, userId?: string, appId?: string, limit?: number): Promise<LanonasisMemory[]>;
    /**
     * Archive old memories based on policy
     */
    archiveOldMemories(beforeDate: string, userId?: string, appId?: string): Promise<BulkOperationResult[]>;
    /**
     * Restore memories from archived/paused state
     */
    restoreMemories(memoryIds: string[]): Promise<BulkOperationResult[]>;
    /**
     * Private helper methods
     */
    private isValidTransition;
    private operationToState;
    private getMemory;
    private updateMemoryViaAPI;
    private callMemoryAPI;
    private getCurrentUserId;
    private generateTransitionId;
}
