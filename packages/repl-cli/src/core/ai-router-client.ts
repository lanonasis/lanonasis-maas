// Uses global fetch (Node 18+)

/**
 * A failed router call, with the router's own status/code/message preserved.
 * The router's error body is `{ error: { message, code, ... } }` (see the
 * service's INTEGRATION-GUIDE §2). Callers classify on `status`, never on the
 * message text: vendor wording varies ("Too Many Requests" vs "rate limit").
 * `status` is 0 when no HTTP response was received (timeout / network).
 */
export class AIRouterError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryAfter?: number;

  constructor(message: string, opts: { status: number; code?: string; retryAfter?: number }) {
    super(message);
    this.name = 'AIRouterError';
    this.status = opts.status;
    this.code = opts.code;
    this.retryAfter = opts.retryAfter;
  }
}

/** Roles the router rejects with 400 system_role_not_permitted (core/message-policy.js). */
const ROUTER_FORBIDDEN_ROLES = new Set(['system', 'developer']);

/** Client timeout stays under nginx's 60s proxy cap (INTEGRATION-GUIDE §2, 504 row). */
const DEFAULT_TIMEOUT_MS = 45_000;

export interface AIRouterClientConfig {
  baseUrl: string;
  authToken?: string;
  defaultUseCase?: string;
  timeoutMs?: number;
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

    // The router owns the system instruction and answers 400
    // system_role_not_permitted for any caller system/developer message. That
    // is a deliberate security control, so refuse locally instead of making a
    // round-trip that can never succeed.
    request.messages.forEach((m, i) => {
      const role = typeof m?.role === 'string' ? m.role.trim().toLowerCase() : '';
      if (ROUTER_FORBIDDEN_ROLES.has(role)) {
        throw new AIRouterError(
          `AI Router: messages[${i}] has role '${role}', which the router rejects ` +
          `(system instruction is owned by the router; select behaviour with use_case).`,
          { status: 0, code: 'system_role_not_permitted' }
        );
      }
    });

    if (this.config.authToken) {
      const token = this.config.authToken.trim();
      // Exactly one auth header, chosen by credential type (never both):
      //   lano_*        -> X-API-Key   (auth-gateway API key)
      //   lms_* / vx_*  -> refused     (MaaS-scoped; the router cannot use them)
      //   anything else -> Authorization: Bearer
      // "Anything else" includes JWTs AND opaque OAuth access tokens: the
      // auth-gateway issues 64-char base64url tokens with no dots
      // (generateOpaqueToken) and /v1/auth/resolve introspects them. The
      // gateway, not this client, decides whether a bearer token is valid.
      if (token.startsWith('lano_')) {
        headers['X-API-Key'] = token;
      } else if (token.startsWith('lms_') || token.startsWith('vx_')) {
        // MaaS-scoped credentials. api.lanonasis.com accepts these; the router
        // and auth-gateway do not (verified 2026-09-01: lms_ -> 401 on
        // /v1/auth/resolve, lano_ -> 200). Sending one produces a 401 that
        // looks like a router fault rather than a wrong credential.
        const prefix = token.slice(0, token.indexOf('_') + 1);
        throw new AIRouterError(
          `AI Router: '${prefix}' keys are MaaS-scoped and cannot authenticate to the router. ` +
          `Use a 'lano_' API key or an OAuth access token.`,
          { status: 0, code: 'credential_not_supported' }
        );
      } else if (token.toLowerCase().startsWith('bearer ')) {
        headers['Authorization'] = token;
      } else if (token.length > 0) {
        headers['Authorization'] = `Bearer ${token}`;
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

    const timeoutMs = this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const aborted = (err as { name?: string })?.name === 'AbortError';
      throw new AIRouterError(
        aborted
          ? `AI Router did not answer within ${Math.round(timeoutMs / 1000)}s`
          : `AI Router unreachable: ${(err as Error)?.message ?? String(err)}`,
        { status: 0, code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR' }
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw await AIRouterClient.errorFromResponse(response);
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
   * Build an AIRouterError from a non-2xx response. Tolerates non-JSON bodies
   * (nginx 504 pages) and both `{error:{message,code}}` and `{error, code}`.
   */
  static async errorFromResponse(response: Response): Promise<AIRouterError> {
    let raw = '';
    try {
      raw = await response.text();
    } catch {
      /* body unreadable — status alone still tells the story */
    }
    let code: string | undefined;
    let detail: string | undefined;
    try {
      const parsed = JSON.parse(raw);
      const errField = parsed?.error;
      if (errField && typeof errField === 'object') {
        code = typeof errField.code === 'string' ? errField.code : undefined;
        detail = typeof errField.message === 'string' ? errField.message : undefined;
      } else {
        code = typeof parsed?.code === 'string' ? parsed.code : undefined;
        detail = typeof errField === 'string' ? errField
          : typeof parsed?.message === 'string' ? parsed.message : undefined;
      }
    } catch {
      /* not JSON */
    }
    const retryHeader = response.headers?.get?.('Retry-After');
    const retryAfter = retryHeader && Number.isFinite(Number(retryHeader)) ? Number(retryHeader) : undefined;
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    const message =
      `AI Router HTTP ${response.status}` +
      (code ? ` ${code}` : statusText) +
      `: ${detail ?? (raw ? raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : 'no error body')}`;
    return new AIRouterError(message, { status: response.status, code, retryAfter });
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
