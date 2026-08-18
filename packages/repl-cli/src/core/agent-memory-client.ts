// Uses global fetch (Bun/Node 18+)

export interface AgentMemoryClientConfig {
  /** Base URL of onasis-ai-router — same host as AIRouterClient. */
  baseUrl: string;
  /** Same credential already used for AIRouterClient (lano_* key or OAuth token). */
  authToken?: string;
}

export type AgentMemoryRole = 'USER' | 'ASSISTANT';

export interface AgentMemoryEvent {
  eventId: string;
  sessionId: string;
  actorId: string;
  role: AgentMemoryRole;
  content: Array<{ text: string }>;
  createdAt: string;
  systemTimestamp?: string;
}

export interface AgentMemorySessionSummary {
  text: string;
  summarizedUpToEventId: string;
}

export interface AgentMemorySession {
  events: AgentMemoryEvent[];
  summary?: AgentMemorySessionSummary;
}

/**
 * Client for onasis-ai-router's session-memory proxy (core/session-memory-proxy.js
 * on that service) — NOT a direct client of the Redis Agent Memory API. This
 * package is published publicly, so it must never hold the raw
 * AGENT_MEMORY_API_KEY; the router holds that credential server-side and
 * scopes access to the caller's own authenticated identity. See that file's
 * header comment for the full rationale.
 *
 * Every method is best-effort: callers should treat failures as "session
 * memory unavailable, continue without persistence" rather than a hard
 * error — the same fail-soft pattern orchestrator.ts already uses for
 * fetchRelevantContext()/initializeContext() against the memory-client.
 */
export class AgentMemoryClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(config: AgentMemoryClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.authToken = config.authToken;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      const token = this.authToken.trim();
      // Mirrors AIRouterClient's auth-header selection: lano_* keys go as
      // X-API-Key, OAuth/JWT-shaped tokens go as Bearer.
      if (token.startsWith('lano_')) {
        headers['X-API-Key'] = token;
      } else {
        headers['Authorization'] = token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}`;
      }
    }
    return headers;
  }

  async addEvent(sessionId: string, role: AgentMemoryRole, text: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/session-memory/events`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ sessionId, role, text }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Session memory addEvent failed: ${response.status} ${detail.slice(0, 200)}`);
    }
  }

  async getSession(sessionId: string): Promise<AgentMemorySession> {
    const response = await fetch(`${this.baseUrl}/api/v1/session-memory/${sessionId}`, {
      headers: this.headers(),
    });

    if (response.status === 404 || response.status === 501) {
      // 404: brand new session, no events yet. 501: router doesn't have
      // session memory configured — degrade the same way either way.
      return { events: [] };
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Session memory getSession failed: ${response.status} ${detail.slice(0, 200)}`);
    }

    const data = await response.json();
    return { events: data.events || [], summary: data.summary };
  }
}
