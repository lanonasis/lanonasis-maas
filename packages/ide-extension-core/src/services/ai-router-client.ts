/**
 * AI Router client for Onasis AI Router service.
 *
 * Centralises auth-header selection, rate-limit handling, response parsing,
 * and timeout so that every IDE extension talks to the router in the same way.
 *
 * Auth-header selection (mirrors vscode-extension, repl-cli, slack/discord
 * concierge):
 *   - `lano_*` keys → `X-API-Key` header
 *   - anything else (OAuth JWT / raw Bearer) → `Authorization: Bearer`
 *
 * Response parsing reads `data.response` first, then falls back to
 * `data.message.content` (the OpenAI-style alias some surfaces use).
 *
 * Rate-limit handling:
 *   - 429 → throw `AIRouterRateLimitError` (caller shows Retry-After to user)
 *   - Timeout → throw `AIRouterTimeoutError` (caller degrades to memory search)
 */

export interface AIRouterClientConfig {
  /** Base URL, e.g. `https://ai.vortexcore.app` */
  baseUrl: string;
  /** Stored token (lano_* API key or OAuth JWT) */
  authToken?: string;
  /** Optional default use_case to include in every request */
  defaultUseCase?: string;
}

export interface AIRouterChatMessage {
  role: string;
  content: string;
}

export interface AIRouterChatRequest {
  messages: AIRouterChatMessage[];
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
  tool_calls: unknown[];
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

/** AI Router returned a 429 — caller should surface Retry-After to the user. */
export class AIRouterRateLimitError extends Error {
  constructor(
    public readonly retryAfterSeconds?: number,
    message = 'AI router rate-limited (429)'
  ) {
    super(message);
    this.name = 'AIRouterRateLimitError';
  }
}

/** Request timed out — caller should degrade to memory search. */
export class AIRouterTimeoutError extends Error {
  constructor(timeoutMs = 45000, message = 'AI router request timed out') {
    super(message);
    this.name = 'AIRouterTimeoutError';
  }
}

/**
 * Build auth headers for the AI router.
 *
 * Rules (must match every caller):
 * 1. `lano_*` → `X-API-Key: <token>`
 * 2. token that already starts with `"Bearer "` → pass through
 * 3. everything else → `Authorization: Bearer <token>`
 */
export function buildAIRouterAuthHeaders(token: string): Record<string, string> {
  if (token.startsWith('lano_')) {
    return { 'X-API-Key': token };
  }
  if (token.toLowerCase().startsWith('bearer ')) {
    return { Authorization: token };
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * Normalise a raw AI-router response into the AIRouterChatResponse shape.
 *
 * The router contract (verified 2026-08-19):
 *   - `response` is the answer text (primary key)
 *   - `message.content` is the OpenAI-style alias (fallback)
 */
function parseAIRouterResponse(raw: unknown): AIRouterChatResponse {
  const data = raw as {
    response?: string;
    message?: { content?: string; tool_calls?: unknown };
    tool_calls?: unknown;
    done?: boolean;
    done_reason?: string;
    usage?: unknown;
    onasis_metadata?: unknown;
    error?: unknown;
  };

  const answer =
    typeof data?.response === 'string'
      ? data.response.trim()
      : typeof data?.message?.content === 'string'
        ? (data.message.content as string).trim()
        : '';

  return {
    message: {
      role: 'assistant',
      content: answer,
      tool_calls:
        (data.message?.tool_calls as
          | Array<{
              id: string;
              type: 'function';
              function: { name: string; arguments: string };
            }>
          | undefined) ??
        (data.tool_calls as
          | Array<{
              id: string;
              type: 'function';
              function: { name: string; arguments: string };
            }>
          | undefined) ??
        [],
    },
    done: Boolean(data?.done ?? true),
    done_reason: (data?.done_reason as string) || 'stop',
    tool_calls: (data.tool_calls as unknown[] | undefined) ?? (data.message?.tool_calls as unknown[] | undefined) ?? [],
    usage: (data?.usage as {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    }) ?? {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
    onasis_metadata: (data.onasis_metadata ?? undefined) as
      | {
          service: string;
          use_case: string;
          privacy_level: string;
          vendor_masked: boolean;
          pii_removed: boolean;
        }
      | undefined,
  };
}

export class AIRouterClient {
  private baseUrl: string;
  private authToken?: string;
  private defaultUseCase?: string;

  constructor(config: AIRouterClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.authToken = config.authToken;
    this.defaultUseCase = config.defaultUseCase;
  }

  /**
   * Send a chat request to the AI router.
   *
   * @param request – messages, optional use_case, etc.
   * @param timeoutMs – milliseconds before abort (default 45 000)
   * @param signal – optional AbortSignal from the caller
   *
   * Throws AIRouterRateLimitError on 429, AIRouterTimeoutError on abort,
   * or Error on other failures.
   */
  async chat(
    request: AIRouterChatRequest,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<AIRouterChatResponse> {
    const url = `${this.baseUrl}/api/v1/ai-chat`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      Object.assign(headers, buildAIRouterAuthHeaders(this.authToken));
    }

    const effectiveUseCase = request.use_case ?? this.defaultUseCase;
    if (effectiveUseCase) {
      headers['X-Use-Case'] = effectiveUseCase;
    }

    const body: Record<string, unknown> = {
      messages: request.messages,
    };

    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.max_tokens !== undefined) body.max_tokens = request.max_tokens;
    if (request.tool_choice) body.tool_choice = request.tool_choice;
    if (request.use_case && !effectiveUseCase) body.use_case = request.use_case;

    const timeoutMs = opts?.timeoutMs ?? 45000;
    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const signal = opts?.signal ?? controller.signal;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw new AIRouterTimeoutError(timeoutMs);
    }
    clearTimeout(timeoutId);

    // 429 handling — read Retry-After header then try body fallback.
    if (response.status === 429) {
      const headerRetry = response.headers.get('Retry-After');
      const headerSeconds = headerRetry ? parseInt(headerRetry, 10) : NaN;

      let bodySeconds: number | undefined;
      try {
        const body = (await response.json()) as { error?: { retry_after_seconds?: number } } | undefined;
        bodySeconds =
          (body?.error as Record<string, unknown>)?.retry_after_seconds as
            | number
            | undefined;
      } catch {
        // Body parse is best-effort; header is authoritative.
      }

      const retryAfter =
        Number.isFinite(bodySeconds)
          ? bodySeconds
          : Number.isFinite(headerSeconds)
            ? headerSeconds
            : undefined;

      throw new AIRouterRateLimitError(retryAfter);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `AI router request failed: ${response.status} ${response.statusText} — ${text}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('AI router returned an unreadable response');
    }

    return parseAIRouterResponse(data);
  }

  /**
   * Simplified one-shot: send messages, return the answer string.
   */
  async simpleChat(messages: AIRouterChatMessage[], useCase?: string): Promise<string> {
    const result = await this.chat({ messages, use_case: useCase });
    return result.message.content;
  }

  /** Health-check — quick GET to /health. */
  async healthCheck(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const ok = await fetch(`${this.baseUrl}/health`, { signal: ctrl.signal })
        .then((r) => r.ok);
      clearTimeout(t);
      return ok;
    } catch {
      return false;
    }
  }
}