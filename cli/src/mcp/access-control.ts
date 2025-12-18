/**
 * Memory Access Control System
 * Implements granular permissions and audit logging inspired by mem0's ACL system
 */

import { CLIConfig } from '../utils/config.js';
import { logger } from './logger.js';

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

export class MemoryAccessControl {
  private config: CLIConfig;
  private accessRules: Map<string, AccessControlRule[]> = new Map();
  private accessLogs: AccessLog[] = [];

  constructor() {
    this.config = new CLIConfig();
  }

  /**
   * Check if user has access to create memories in an app
   */
  async checkCreateAccess(userId: string, appId: string): Promise<boolean> {
    try {
      // Default: users can create memories in their own apps
      if (await this.isUserApp(userId, appId)) {
        return true;
      }

      // Check explicit permissions
      const rules = this.getAccessRules(userId, appId);
      return rules.some(rule =>
        rule.permission === 'write' || rule.permission === 'admin'
      );
    } catch (error) {
      logger.error('Access check failed', { error, userId, appId });
      return false;
    }
  }

  /**
   * Check if user has access to a specific memory
   */
  async checkMemoryAccess(memoryId: string, appId: string): Promise<boolean> {
    try {
      const memory = await this.getMemoryInfo(memoryId);
      const currentUserId = await this.getCurrentUserId();

      if (!memory) {
        return false;
      }

      // Owner always has access
      if (memory.user_id === currentUserId) {
        return true;
      }

      // Check app-level permissions using CURRENT user ID, not memory owner
      const rules = this.getAccessRules(currentUserId, appId);
      return rules.some(rule =>
        rule.granted &&
        (!rule.expires_at || new Date(rule.expires_at) > new Date()) &&
        (rule.memory_id === memoryId || !rule.memory_id)
      );
    } catch (error) {
      logger.error('Memory access check failed', { error, memoryId, appId });
      return false;
    }
  }

  /**
   * Get list of accessible memory IDs for user/app combination
   */
  async getAccessibleMemories(userId: string, appId: string): Promise<string[]> {
    try {
      // Get user's own memories
      const ownMemories = await this.getUserMemories(userId);

      // Get shared memories based on permissions
      const sharedMemories = await this.getSharedMemories(userId, appId);

      // Combine and deduplicate
      const combined = [...ownMemories, ...sharedMemories];
      const deduped: string[] = [];
      const seen = new Set<string>();

      combined.forEach(memoryId => {
        if (!seen.has(memoryId)) {
          seen.add(memoryId);
          deduped.push(memoryId);
        }
      });

      return deduped;
    } catch (error) {
      logger.error('Failed to get accessible memories', { error, userId, appId });
      return [];
    }
  }

  /**
   * Log memory access for audit trail
   */
  async logMemoryAccess(
    memoryId: string,
    appId: string,
    accessType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();

      const logEntry: AccessLog = {
        id: this.generateId(),
        user_id: userId,
        app_id: appId,
        memory_id: memoryId,
        access_type: accessType,
        timestamp: new Date().toISOString(),
        success: true,
        metadata
      };

      this.accessLogs.push(logEntry);

      // In production, this would be persisted to database
      logger.debug('Memory access logged', logEntry);

      // Keep only recent logs in memory (last 1000)
      if (this.accessLogs.length > 1000) {
        this.accessLogs = this.accessLogs.slice(-1000);
      }
    } catch (error) {
      logger.error('Failed to log memory access', { error, memoryId, appId, accessType });
    }
  }

  /**
   * Grant access to a memory or app
   */
  async grantAccess(
    userId: string,
    appId: string,
    permission: 'read' | 'write' | 'delete' | 'admin',
    memoryId?: string,
    expiresAt?: string
  ): Promise<void> {
    const rule: AccessControlRule = {
      id: this.generateId(),
      user_id: userId,
      app_id: appId,
      memory_id: memoryId,
      permission,
      granted: true,
      created_at: new Date().toISOString(),
      expires_at: expiresAt
    };

    const key = `${userId}:${appId}`;
    const existingRules = this.accessRules.get(key) || [];
    existingRules.push(rule);
    this.accessRules.set(key, existingRules);

    logger.info('Access granted', { userId, appId, permission, memoryId });
  }

  /**
   * Revoke access to a memory or app
   */
  async revokeAccess(_userId: string, _appId: string, memoryId?: string): Promise<void> {
    const key = `${_userId}:${_appId}`;
    const existingRules = this.accessRules.get(key) || [];

    const updatedRules = existingRules.map(rule => {
      if (!memoryId || rule.memory_id === memoryId) {
        return { ...rule, granted: false };
      }
      return rule;
    });

    this.accessRules.set(key, updatedRules);
    logger.info('Access revoked', { userId: _userId, appId: _appId, memoryId });
  }

  /**
   * Get access logs for audit purposes
   */
  getAccessLogs(
    userId?: string,
    appId?: string,
    memoryId?: string,
    limit: number = 100
  ): AccessLog[] {
    let logs = this.accessLogs;

    if (userId) {
      logs = logs.filter(log => log.user_id === userId);
    }
    if (appId) {
      logs = logs.filter(log => log.app_id === appId);
    }
    if (memoryId) {
      logs = logs.filter(log => log.memory_id === memoryId);
    }

    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Private helper methods
   */
  private getAccessRules(userId: string, appId: string): AccessControlRule[] {
    const key = `${userId}:${appId}`;
    return this.accessRules.get(key) || [];
  }

  private async isUserApp(userId: string, appId: string): Promise<boolean> {
    // In a real implementation, this would check if the app belongs to the user
    // For now, assume apps starting with user ID belong to them
    return appId.startsWith(userId) || appId === 'default';
  }

  private async getCurrentUserId(): Promise<string> {
    const token = this.config.get('token');
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from((token as string).split('.')[1], 'base64').toString());
        return payload.sub || payload.user_id || 'anonymous';
      } catch {
        return 'anonymous';
      }
    }
    return 'anonymous';
  }

  private async getMemoryInfo(memoryId: string): Promise<any> {
    try {
      // This would typically fetch from the API
      const apiUrl = this.config.get('apiUrl') || 'https://api.lanonasis.com';
      const token = this.config.get('token');

      const axios = (await import('axios')).default;

      const response = await axios.get(`${apiUrl}/api/v1/memory/${memoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get memory info', { error, memoryId });
      return null;
    }
  }

  private async getUserMemories(userId: string): Promise<string[]> {
    try {
      const apiUrl = this.config.get('apiUrl') || 'https://api.lanonasis.com';
      const token = this.config.get('token');

      const axios = (await import('axios')).default;

      const response = await axios.get(`${apiUrl}/api/v1/memory?user_id=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.memories?.map((m: any) => m.id) || [];
    } catch (error) {
      logger.error('Failed to get user memories', { error, userId });
      return [];
    }
  }

  private async getSharedMemories(_userId: string, _appId: string): Promise<string[]> {
    // This would implement logic to find memories shared with the user
    // through explicit permissions or app-level sharing
    return [];
  }

  private generateId(): string {
    return `acl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}