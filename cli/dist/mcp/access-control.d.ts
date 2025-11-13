/**
 * Memory Access Control System
 * Implements granular permissions and audit logging inspired by mem0's ACL system
 */
export interface AccessControlRule {
    id: string;
    user_id: string;
    app_id: string;
    memory_id?: string;
    permission: 'read' | 'write' | 'delete' | 'admin';
    granted: boolean;
    created_at: string;
    expires_at?: string;
}
export interface AccessLog {
    id: string;
    user_id: string;
    app_id: string;
    memory_id: string;
    access_type: string;
    timestamp: string;
    success: boolean;
    metadata?: Record<string, any>;
}
export declare class MemoryAccessControl {
    private config;
    private accessRules;
    private accessLogs;
    constructor();
    /**
     * Check if user has access to create memories in an app
     */
    checkCreateAccess(userId: string, appId: string): Promise<boolean>;
    /**
     * Check if user has access to a specific memory
     */
    checkMemoryAccess(memoryId: string, appId: string): Promise<boolean>;
    /**
     * Get list of accessible memory IDs for user/app combination
     */
    getAccessibleMemories(userId: string, appId: string): Promise<string[]>;
    /**
     * Log memory access for audit trail
     */
    logMemoryAccess(memoryId: string, appId: string, accessType: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Grant access to a memory or app
     */
    grantAccess(userId: string, appId: string, permission: 'read' | 'write' | 'delete' | 'admin', memoryId?: string, expiresAt?: string): Promise<void>;
    /**
     * Revoke access to a memory or app
     */
    revokeAccess(_userId: string, _appId: string, memoryId?: string): Promise<void>;
    /**
     * Get access logs for audit purposes
     */
    getAccessLogs(userId?: string, appId?: string, memoryId?: string, limit?: number): AccessLog[];
    /**
     * Private helper methods
     */
    private getAccessRules;
    private isUserApp;
    private getCurrentUserId;
    private getMemoryInfo;
    private getUserMemories;
    private getSharedMemories;
    private generateId;
}
