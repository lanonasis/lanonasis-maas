// Uses global fetch (Node 18+)

export interface AIRouterClientConfig {
  baseUrl: string;
  authToken?: string;
  defaultUseCase?: string;
}

export interface AIRouterChatRequest {
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  use_case?: string;
  temperature?: number;
  max_tokens?: number;
  tool_choice?: string;
}

export interface AIRouterChatResponse {
  message: {
    role: string;
    content: string;
    tool_calls?: Array<{
      id: string;
      type: 'function';
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  done: boolean;
  done_reason: string;
  tool_calls: any[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  onasis_metadata?: {
    service: string;
    use_case: string;
    privacy_level: string;
    vendor_masked: boolean;
    pii_removed: boolean;
  };
}

/**
 * Client for Onasis AI Router service
 * Provides vendor-agnostic AI chat with tool calling support
 */
export class AIRouterClient {
  private config: AIRouterClientConfig;

  constructor(config: AIRouterClientConfig) {
    this.config = config;
    if (!this.config.baseUrl.endsWith('/')) {
      this.config.baseUrl = this.config.baseUrl.replace(/\/$/, '');
    }
  }

  /**
   * Send chat request to AI router
   */
  async chat(request: AIRouterChatRequest): Promise<AIRouterChatResponse> {
    const url = `${this.config.baseUrl}/api/v1/ai-chat`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    if (request.use_case) {
      headers['X-Use-Case'] = request.use_case;
    }

    const body: any = {
      messages: request.messages,
    };

    // Include optional fields if provided
    if (request.tools) {
      body.tools = request.tools;
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.max_tokens !== undefined) {
      body.max_tokens = request.max_tokens;
    }
    if (request.tool_choice) {
      body.tool_choice = request.tool_choice;
    }
    if (request.use_case && !headers['X-Use-Case']) {
      body.use_case = request.use_case;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI Router request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Map AI router response format to expected interface
    const mapped: AIRouterChatResponse = {
      message: {
        role: 'assistant',
        content: data.response || data.message?.content || '',
        tool_calls: data.message?.tool_calls || data.tool_calls || []
      },
      done: data.done ?? true,
      done_reason: data.done_reason || 'stop',
      tool_calls: data.tool_calls || data.message?.tool_calls || [],
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      onasis_metadata: data.onasis_metadata
    };

    return mapped;
  }

  /**
   * Simplified chat with just messages and use case
   */
  async simpleChat(messages: AIRouterChatRequest['messages'], useCase?: string): Promise<string> {
    const response = await this.chat({ messages, use_case: useCase });
    return response.message.content || '';
  }

  /**
   * Check if AI router is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.config.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }
}