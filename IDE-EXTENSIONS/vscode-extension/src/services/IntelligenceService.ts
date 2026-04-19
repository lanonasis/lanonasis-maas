import * as vscode from 'vscode';
import { SecureApiKeyService } from '@lanonasis/ide-extension-core';

interface IntelligenceContextOptions {
  organizationId?: string;
  topicId?: string;
  scope?: string;
  memoryTypes?: string[];
}

interface IntelligenceResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export class IntelligenceService {
  private secureApiKeyService: SecureApiKeyService;
  private config: vscode.WorkspaceConfiguration;

  constructor(secureApiKeyService: SecureApiKeyService) {
    this.secureApiKeyService = secureApiKeyService;
    this.config = vscode.workspace.getConfiguration('lanonasis');
  }

  private getApiUrl(): string {
    const apiUrl = this.config.get<string>('apiUrl', 'https://api.lanonasis.com');
    const useGateway = this.config.get<boolean>('useGateway', false);
    const gatewayUrl = this.config.get<string>('gatewayUrl', 'https://api.lanonasis.com');
    const baseUrl = useGateway ? gatewayUrl : apiUrl;
    return baseUrl.replace(/\/+$/, '').replace(/\/api\/v1$/i, '').replace(/\/api$/i, '');
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const credential = await this.secureApiKeyService.getStoredCredentials();
    if (!credential) {
      throw new Error('Not authenticated. Please run "Lanonasis: Authenticate" first.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credential.apiKey}`
    };
  }

  private buildContextPayload(options: IntelligenceContextOptions): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (options.organizationId) {
      payload.organization_id = options.organizationId;
    }
    if (options.topicId) {
      payload.topic_id = options.topicId;
    }
    if (options.scope) {
      payload.scope = options.scope;
    }
    if (options.memoryTypes && options.memoryTypes.length > 0) {
      payload.memory_types = options.memoryTypes;
    }
    return payload;
  }

  async runHealthCheck(options: IntelligenceContextOptions = {}): Promise<IntelligenceResult> {
    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiUrl();
      
      const response = await fetch(`${baseUrl}/api/v1/intelligence/health-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          response_format: 'json',
          ...this.buildContextPayload(options)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Health check failed: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async suggestTags(
    memoryId: string, 
    maxSuggestions: number = 8,
    options: IntelligenceContextOptions = {}
  ): Promise<IntelligenceResult> {
    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiUrl();
      
      const response = await fetch(`${baseUrl}/api/v1/intelligence/suggest-tags`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          memory_id: memoryId,
          max_suggestions: maxSuggestions,
          include_existing_tags: true,
          response_format: 'json',
          ...this.buildContextPayload(options)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Suggest tags failed: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async findRelated(
    memoryId: string,
    limit: number = 5,
    threshold: number = 0.7,
    options: IntelligenceContextOptions = {}
  ): Promise<IntelligenceResult> {
    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiUrl();
      
      const response = await fetch(`${baseUrl}/api/v1/intelligence/find-related`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          memory_id: memoryId,
          limit: Math.max(1, Math.min(20, limit)),
          similarity_threshold: Math.max(0, Math.min(1, threshold)),
          response_format: 'json',
          ...this.buildContextPayload(options)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Find related failed: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async detectDuplicates(
    threshold: number = 0.88,
    maxPairs: number = 100,
    options: IntelligenceContextOptions = {}
  ): Promise<IntelligenceResult> {
    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiUrl();
      
      const response = await fetch(`${baseUrl}/api/v1/intelligence/detect-duplicates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          similarity_threshold: Math.max(0, Math.min(1, threshold)),
          max_pairs: Math.max(10, Math.min(500, maxPairs)),
          response_format: 'json',
          ...this.buildContextPayload(options)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Detect duplicates failed: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async extractInsights(
    topic?: string,
    memoryType?: string,
    maxMemories: number = 50,
    options: IntelligenceContextOptions = {}
  ): Promise<IntelligenceResult> {
    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiUrl();
      
      const response = await fetch(`${baseUrl}/api/v1/intelligence/extract-insights`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic,
          memory_type: memoryType,
          max_memories: Math.max(5, Math.min(200, maxMemories)),
          response_format: 'json',
          ...this.buildContextPayload(options)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Extract insights failed: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async analyzePatterns(
    days: number = 30,
    options: IntelligenceContextOptions = {}
  ): Promise<IntelligenceResult> {
    try {
      const headers = await this.getAuthHeaders();
      const baseUrl = this.getApiUrl();
      
      const response = await fetch(`${baseUrl}/api/v1/intelligence/analyze-patterns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          time_range_days: Math.max(1, Math.min(365, days)),
          response_format: 'json',
          ...this.buildContextPayload(options)
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Analyze patterns failed: ${error}` };
      }

      const data = await response.json();
      return { success: true, data: data as Record<string, unknown> };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export function createIntelligenceService(secureApiKeyService: SecureApiKeyService): IntelligenceService {
  return new IntelligenceService(secureApiKeyService);
}