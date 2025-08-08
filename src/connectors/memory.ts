/**
 * Memory Connector for Orchestrator
 * Integrates with the Memory as a Service (MaaS) platform
 */

export interface MemoryConnectorOptions {
  apiUrl?: string;
  apiKey?: string | undefined;
  authToken?: string | undefined;
}

export interface MemorySearchArgs {
  query: string;
  limit?: number;
  type?: string[];
  threshold?: number;
}

export interface MemoryCreateArgs {
  title: string;
  content: string;
  memory_type?: string;
  tags?: string[];
  topic_id?: string;
}

export interface MemoryListArgs {
  limit?: number;
  offset?: number;
  memory_types?: string[];
  tags?: string[];
}

export class MemoryConnector {
  private apiUrl: string;
  private apiKey?: string | undefined;
  private authToken?: string | undefined;
  private useUnifiedRouter: boolean;

  constructor(options: MemoryConnectorOptions = {}) {
    // Check if we should use unified router for privacy-protected routing
    this.useUnifiedRouter = process.env.USE_UNIFIED_ROUTER === 'true' || process.env.NODE_ENV === 'production';
    
    if (this.useUnifiedRouter) {
      this.apiUrl = process.env.UNIFIED_ROUTER_URL || 'https://api.vortexai.io';
    } else {
      this.apiUrl = options.apiUrl || process.env.MEMORY_API_URL || 'http://localhost:3000';
    }
    
    this.apiKey = options.apiKey || process.env.MEMORY_API_KEY || undefined;
    this.authToken = options.authToken || process.env.MEMORY_AUTH_TOKEN || undefined;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add unified router headers if using unified routing
    if (this.useUnifiedRouter) {
      headers['X-Service'] = 'lanonasis-maas';
      headers['X-Client'] = 'orchestrator';
      headers['User-Agent'] = 'Lanonasis-Orchestrator/1.0';
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.apiUrl}/api/v1${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Memory API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async search(args: MemorySearchArgs) {
    const params = new URLSearchParams();
    params.append('query', args.query);
    if (args.limit) params.append('limit', args.limit.toString());
    if (args.threshold) params.append('threshold', args.threshold.toString());
    if (args.type?.length) {
      args.type.forEach(t => params.append('memory_types', t));
    }

    return this.makeRequest(`/memory/search?${params.toString()}`, {
      method: 'POST',
    });
  }

  async create(args: MemoryCreateArgs) {
    return this.makeRequest('/memory', {
      method: 'POST',
      body: JSON.stringify({
        title: args.title,
        content: args.content,
        memory_type: args.memory_type || 'context',
        tags: args.tags || [],
        topic_id: args.topic_id,
      }),
    });
  }

  async list(args: MemoryListArgs = {}) {
    const params = new URLSearchParams();
    if (args.limit) params.append('limit', args.limit.toString());
    if (args.offset) params.append('offset', args.offset.toString());
    if (args.memory_types?.length) {
      args.memory_types.forEach(t => params.append('memory_types', t));
    }
    if (args.tags?.length) {
      args.tags.forEach(t => params.append('tags', t));
    }

    return this.makeRequest(`/memory?${params.toString()}`);
  }

  async get(id: string) {
    return this.makeRequest(`/memory/${id}`);
  }

  async update(id: string, updates: Partial<MemoryCreateArgs>) {
    return this.makeRequest(`/memory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async delete(id: string) {
    return this.makeRequest(`/memory/${id}`, {
      method: 'DELETE',
    });
  }

  async getStats() {
    return this.makeRequest('/memory/admin/stats');
  }

  async getTopics() {
    return this.makeRequest('/topics');
  }

  async createTopic(name: string, description?: string, parent_id?: string) {
    return this.makeRequest('/topics', {
      method: 'POST',
      body: JSON.stringify({ name, description, parent_id }),
    });
  }
}

// Factory function for orchestrator integration
export function memoryConnector(action: string, args: any) {
  const connector = new MemoryConnector();

  switch (action) {
    case 'search':
      return connector.search(args as MemorySearchArgs);
    case 'create':
      return connector.create(args as MemoryCreateArgs);
    case 'list':
      return connector.list(args as MemoryListArgs);
    case 'get':
      return connector.get(args.id);
    case 'update':
      return connector.update(args.id, args.updates);
    case 'delete':
      return connector.delete(args.id);
    case 'stats':
      return connector.getStats();
    case 'list-topics':
      return connector.getTopics();
    case 'create-topic':
      return connector.createTopic(args.name, args.description, args.parent_id);
    default:
      throw new Error(`Unknown memory action: ${action}`);
  }
}

export default memoryConnector;