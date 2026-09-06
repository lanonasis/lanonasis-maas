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
      const token = this.config.authToken.trim();
      // Two supported schemes, chosen by credential type — never guessed:
      //   lano_*            -> X-API-Key   (auth-gateway API key)
      //   OAuth / JWT       -> Authorization: Bearer
      // Anything else is rejected loudly. Previously an unrecognised token fell
      // through to Bearer, which turned an unsupported credential into an
      // indistinguishable 401 and cost real debugging time.
      if (token.startsWith('lano_')) {
        headers['X-API-Key'] = token;
      } else if (token.toLowerCase().startsWith('bearer ')) {
        headers['Authorization'] = token;
      } else if (token.includes('.') && token.length > 100) {
        // OAuth/JWT access token.
        headers['Authorization'] = `Bearer ${token}`;
      } else if (token.startsWith('lms_') || token.startsWith('vx_')) {
        // MaaS-scoped credentials. api.lanonasis.com accepts these; the router
        // and auth-gateway do not (verified 2026-09-01: lms_ -> 401 on
        // /v1/auth/resolve, lano_ -> 200). Sending one as Bearer produces a
        // 401 that looks like a router fault rather than a wrong credential.
        const prefix = token.slice(0, token.indexOf('_') + 1);
        throw new Error(
          `AI Router: '${prefix}' keys are MaaS-scoped and cannot authenticate to the router. ` +
          `Use a 'lano_' API key or an OAuth access token.`
        );
      } else {
        throw new Error(
          'AI Router: unrecognised credential format. Expected a \'lano_\' API key ' +
          'or an OAuth/JWT access token.'
        );
      }
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
    // Sent in the body as well as the X-Use-Case header. The router reads
    // body.use_case first (resolveUseCaseFromRequest); the previous guard was
    // unreachable because the header is set from the same value above, so the
    // body field never shipped.
    if (request.use_case) {
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

    // The router contract is `data.response` (see the service's
    // INTEGRATION-GUIDE §2). There is deliberately no `data.message.content`
    // fallback: that shape does not exist on this API, and accepting it meant a
    // 200 carrying no answer was treated as success instead of falling through
    // to local synthesis. Tool calls are still read from either position — the
    // router does emit top-level tool_calls.
    if (typeof data.response !== 'string' || data.response.trim() === '') {
      const hasToolCalls =
        (Array.isArray(data.tool_calls) && data.tool_calls.length > 0) ||
        (Array.isArray(data.message?.tool_calls) && data.message.tool_calls.length > 0);
      if (!hasToolCalls) {
        throw new Error(
          'AI Router returned 200 without a `response` field — treating as a failed turn.'
        );
      }
    }

    // Map AI router response format to expected interface
    const mapped: AIRouterChatResponse = {
      message: {
        role: 'assistant',
        content: typeof data.response === 'string' ? data.response : '',
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
