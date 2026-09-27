import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import ora from 'ora';

import { LocalMemoryBackend } from '../local-memory/local-backend.js';
import { MemoryBackendRouter } from '../local-memory/router.js';
import { MaaSClientAdapter } from '../local-memory/maas-adapter.js';
import { AsyncSyncQueueRunner, type SyncSubmitter } from '../local-memory/sync-queue.js';
import type { MemoryBackend } from '../local-memory/types.js';

/**
 * Resolve the local-memory root directory. Honors XDG-style layout:
 *   - $LANONASIS_LOCAL_MEMORY_DIR if set
 *   - ~/.lanonasis/repl-cli/        default
 *
 * Matches the openclaw-plugin convention (~/.lanonasis/...) so the
 * two stay discoverable in `ls ~/.lanonasis/`.
 */
function joinLocalMemoryRoot(): string {
  return join(homedir(), '.lanonasis', 'repl-cli');
}

// VortexAI L0 Integration - Universal Work Orchestrator
import {
  L0Orchestrator,
  createPluginManager,
  configureMemoryPlugin,
  type L0Response
} from 'vortexai-l0';

// Onasis AI Router client
import { AIRouterClient, AIRouterError } from './ai-router-client';
import type { L0Config } from '../config/types.js';
import { DEFAULT_OPENAI_MODEL } from '../config/constants.js';
import type { Persona } from '../personas/types.js';

export interface OrchestratorConfig {
  apiUrl: string;
  authToken?: string;
  openaiApiKey?: string;
  model?: string;
  aiRouterUrl?: string;
  aiRouterAuthToken?: string;
  aiRouterApiKey?: string; // Dedicated API key for AI Router (lano_...)
  /**
   * Opt-in: when the AI Router is configured and fails, retry the turn
   * directly against api.openai.com with `openaiApiKey`. Off by default — the
   * router owns vendor choice and failover, and a silent direct fallback hid
   * every router error behind an unrelated OpenAI one. Also enabled by
   * LANONASIS_OPENAI_FALLBACK=1.
   */
  openaiFallback?: boolean;
  l0?: L0Config;
  userContext?: {
    name?: string;
    projects?: string[];
    preferences?: Record<string, any>;
  };
}

/**
 * A conversation turn. Deliberately no 'system' role: the AI Router rejects
 * caller system/developer messages (400 system_role_not_permitted), so the
 * persona prompt is held separately (see `systemPrompt`) and only ever sent on
 * the direct-OpenAI path.
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type AIErrorKind = 'auth' | 'rate_limit' | 'rejected' | 'service' | 'network' | 'other';

/** A failed direct call to api.openai.com, with status preserved for classification. */
export class OpenAIRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, opts: { status: number; code?: string }) {
    super(message);
    this.name = 'OpenAIRequestError';
    this.status = opts.status;
    this.code = opts.code;
  }
}

/** Every AI backend tried for a turn failed. `failures[0]` is the primary. */
export class AIBackendsFailedError extends Error {
  readonly failures: Array<{ backend: string; error: unknown }>;

  constructor(failures: Array<{ backend: string; error: unknown }>) {
    super(
      failures
        .map((f) => `${f.backend}: ${f.error instanceof Error ? f.error.message : String(f.error)}`)
        .join(' | ')
    );
    this.name = 'AIBackendsFailedError';
    this.failures = failures;
  }
}

/**
 * Classify an AI backend failure by HTTP status, not by message text. The old
 * string match looked for "429"/"rate limit", but OpenAI's statusText is "Too
 * Many Requests", so a 429 fell through to "Something went wrong".
 */
export function classifyAIError(error: unknown): AIErrorKind {
  const primary = error instanceof AIBackendsFailedError ? error.failures[0]?.error : error;
  const status = typeof (primary as { status?: unknown })?.status === 'number'
    ? (primary as { status: number }).status
    : undefined;
  const code = (primary as { code?: unknown })?.code;

  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status !== undefined && status >= 500) return 'service';
  if (status !== undefined && status >= 400) return 'rejected';
  if (status === 0) {
    if (code === 'TIMEOUT' || code === 'NETWORK_ERROR') return 'network';
    if (code === 'credential_not_supported') return 'auth';
    return 'rejected';
  }
  const message = primary instanceof Error ? primary.message : String(primary ?? '');
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed|network/i.test(message)) return 'network';
  return 'other';
}

export interface OrchestratorResponse {
  response: string;
  mainAnswer?: string;
  additionalContext?: Array<{
    title: string;
    content: string;
    relevance?: number;
  }>;
  action?: {
    type: 'create' | 'update' | 'search' | 'list' | 'get' | 'delete' | 'optimize_prompt';
    params: Record<string, any>;
  };
  context?: any;
}

export class NaturalLanguageOrchestrator {
  private client: MemoryClient;
  private conversationHistory: ConversationMessage[] = [];
  /** Persona/system prompt. Only sent on the direct-OpenAI path, never to the router. */
  private systemPrompt: string = '';
  private openaiFallback: boolean = false;
  private openaiApiKey?: string;
  private model: string;
  private userContext?: OrchestratorConfig['userContext'];
  private cachedUserPreferences: string[] = []; // Cached user preferences/profile info
  private contextInitialized: boolean = false;

  // VortexAI L0 - Universal Work Orchestrator for broader capabilities
  private l0Orchestrator?: L0Orchestrator;
  private l0Config: Required<Pick<L0Config, 'enabled' | 'enableCampaigns' | 'enableTrends' | 'enableContentCreation'>>;
  private aiRouterClient?: AIRouterClient;

  /** Local-first memory hybrid (Phase 1-4 of the hybrid plan).
   *  When set, search/get/save/delete all flow through this router.
   *  Initialized in constructor when LANONASIS_LOCAL_MEMORY !== '0'. */
  private memoryRouter?: MemoryBackendRouter;
  private localBackend?: LocalMemoryBackend;
  /** Drains sync_queue rows on a periodic interval. */
  private syncRunner?: AsyncSyncQueueRunner;
  /** Handle for the periodic sync-tick schedule (cleared on close). */
  private syncTickTimer?: ReturnType<typeof setInterval>;

  private formatError(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private resolveOpenAIModel(): string {
    const selected = (this.model || '').trim();
    // Branded alias for the default router-first experience.
    if (!selected || /^l[-\s]?zero$/i.test(selected)) {
      return process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';
    }
    return selected;
  }

  private isCampaignIntent(lowerInput: string): boolean {
    return /campaign|launch|marketing|tiktok|instagram|viral/.test(lowerInput);
  }

  private isTrendIntent(lowerInput: string): boolean {
    return /trend|trending|hashtag|viral/.test(lowerInput);
  }

  private isContentIntent(lowerInput: string): boolean {
    return /content|calendar|copy|caption|script|post/.test(lowerInput);
  }

  private shouldUseL0(lowerInput: string): boolean {
    if (!this.l0Config.enabled || !this.l0Orchestrator) return false;
    if (this.isCampaignIntent(lowerInput)) return this.l0Config.enableCampaigns;
    if (this.isTrendIntent(lowerInput)) return this.l0Config.enableTrends;
    if (this.isContentIntent(lowerInput)) return this.l0Config.enableContentCreation;
    return true;
  }

  constructor(config: OrchestratorConfig) {
    this.client = createMemoryClient({
      apiUrl: config.apiUrl,
      authToken: config.authToken,
      timeout: 30000
    });

    // Configure L0's memory plugin with the same credentials
    configureMemoryPlugin({
      apiUrl: config.apiUrl,
      authToken: config.authToken,
      timeout: 30000
    });

    // Local-first memory hybrid. When LANONASIS_LOCAL_MEMORY !== '0' (default
    // ON), open a SQLite-backed LocalMemoryBackend, wrap it with the MaaS
    // adapter through MemoryBackendRouter, and schedule a periodic sync
    // queue drain so saves that fall back to local persistence are eventually
    // pushed to MaaS. Without this wiring every search hits MaaS over the
    // network and every save that fails the direct remote write sits in the
    // sync_queue table forever.
    if (process.env.LANONASIS_LOCAL_MEMORY !== '0') {
      try {
        const rootDir = process.env.LANONASIS_LOCAL_MEMORY_DIR
          || joinLocalMemoryRoot();
        this.localBackend = new LocalMemoryBackend({ rootDir });
        // Note: we don't await init() here — the router will lazy-init
        // on first use. SQLite open is fast enough that doing it during
        // REPL construction would block the welcome banner.
        const remote: MemoryBackend = new MaaSClientAdapter(
          this.client as unknown as ConstructorParameters<typeof MaaSClientAdapter>[0],
        );
        this.memoryRouter = new MemoryBackendRouter(this.localBackend, remote, {
          remoteTimeoutMs: 800,
          offlineGracePeriodMs: 30_000,
          debug: process.env.LANONASIS_LOCAL_MEMORY_DEBUG === '1',
        });

        const submitter: SyncSubmitter = {
          submitSave: async (payload) => {
            const res = await this.client.createMemory({
              title: String(payload.title ?? ''),
              content: String(payload.content ?? ''),
              type: payload.memory_type as string | undefined,
              tags: Array.isArray(payload.tags) ? (payload.tags as string[]) : undefined,
              metadata: (payload.metadata ?? undefined) as Record<string, unknown> | undefined,
            });
            if (res.error) {
              const msg = typeof (res.error as { message?: unknown }).message === 'string'
                ? (res.error as { message: string }).message
                : JSON.stringify(res.error);
              throw new Error(msg);
            }
            return { maas_id: res.data?.id ?? '' };
          },
          submitDelete: async (payload) => {
            const res = await this.client.deleteMemory(String(payload.id));
            if (res.error) {
              const errMsg = typeof (res.error as { message?: unknown }).message === 'string'
                ? (res.error as { message: string }).message
                : JSON.stringify(res.error);
              if (!/not found|404/i.test(errMsg)) throw new Error(errMsg);
            }
          },
        };
        this.syncRunner = new AsyncSyncQueueRunner(this.localBackend.getSyncQueueDeps(), {
          batchSize: 5,
          submitTimeoutMs: 8000,
          baseBackoffSeconds: 2,
          maxBackoffSeconds: 300,
        });
        // Drain every 30s; AsyncSyncQueueRunner.tick() is a no-op when no
        // rows are ready. The timer is unref'd (runtime-only) so it never
        // holds the event loop.
        const intervalMs = Number(process.env.LANONASIS_SYNC_TICK_MS) || 30_000;
        this.syncTickTimer = setInterval(() => {
          this.syncRunner?.tick(submitter).catch(() => { /* best effort */ });
        }, intervalMs);
        const timer = this.syncTickTimer as unknown as { unref?: () => void };
        if (typeof timer.unref === 'function') timer.unref();
      } catch (err) {
        // Local memory init failure must not break the chat flow.
        // Fall back to direct MaaS calls, same as before this work.
        // eslint-disable-next-line no-console
        console.warn(`[local-memory] init skipped: ${(err as Error).message}`);
      }
    }

    this.l0Config = {
      enabled: config.l0?.enabled !== false,
      enableCampaigns: config.l0?.enableCampaigns !== false,
      enableTrends: config.l0?.enableTrends !== false,
      enableContentCreation: config.l0?.enableContentCreation !== false,
    };

    if (this.l0Config.enabled) {
      // Initialize L0 with all plugins including memory services
      this.l0Orchestrator = new L0Orchestrator(
        createPluginManager({ includeBuiltins: true, includeMemoryServices: true })
      );
    }

    this.openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY
    this.model = config.model || process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
    this.userContext = config.userContext;

    // Initialize AI Router client if URL provided
    // Priority: aiRouterApiKey (lano_...) > aiRouterAuthToken
    if (config.aiRouterUrl) {
      const routerKey = config.aiRouterApiKey || config.aiRouterAuthToken;
      this.aiRouterClient = new AIRouterClient({
        baseUrl: config.aiRouterUrl,
        authToken: routerKey,
        defaultUseCase: 'repl-nlp',
      });
    }

    const envFallback = String(process.env.LANONASIS_OPENAI_FALLBACK || '').toLowerCase();
    this.openaiFallback = config.openaiFallback === true || envFallback === '1' || envFallback === 'true';

    // The persona prompt is kept locally. The router owns the system prompt for
    // the repl-nlp use case; this one is only used on the direct-OpenAI path.
    this.systemPrompt = this.buildSystemPrompt(config.userContext);
  }

  /**
   * Initialize context by loading user preferences and profile from memories
   * This should be called at startup to make the assistant context-aware
   */
  async initializeContext(): Promise<void> {
    if (this.contextInitialized) return;

    try {
      // Search for user preferences and profile information
      // Hard-timeout the search so it can't block startup indefinitely.
      const preferencesSearch = await Promise.race([
        this.client.searchMemories({
          query: 'user preferences settings profile configuration style',
          status: 'active',
          limit: 5,
          threshold: 0.6
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('searchMemories timeout')), 3000)
        )
      ]);

      if (preferencesSearch.data?.results && preferencesSearch.data.results.length > 0) {
        this.cachedUserPreferences = preferencesSearch.data.results
          .filter((r: any) => r && r.title && r.content)
          .map((r: any) => {
            const content = r.content || '';
            const title = r.title || 'Untitled';
            return `[${title}]: ${content.substring(0, 200)}`;
          });

        // Update the system prompt with user context
        this.updateSystemPromptWithContext();
      }

      this.contextInitialized = true;
    } catch (error) {
      // Silently fail - context loading is optional
      this.contextInitialized = true;
    }
  }

  /**
   * Swap the active persona at runtime. Replaces the system prompt and
   * updates the model. Conversation history (turns 1+) is preserved so the
   * new persona enters with full prior context. Cached user-preference
   * context, if any, is re-applied on top of the new system prompt.
   */
  setPersona(persona: Persona): void {
    // Held locally, never injected into router-bound history (the router
    // rejects system roles). With the router, persona selection affects the
    // local UX only; the router's use case owns the prompt.
    this.systemPrompt = persona.systemPrompt;
    this.model = persona.model;
    // Re-append cached user context to the fresh system prompt, if loaded.
    if (this.cachedUserPreferences.length > 0) {
      this.updateSystemPromptWithContext();
    }
  }

  /**
   * Update the system prompt with loaded user context
   */
  private updateSystemPromptWithContext(): void {
    if (this.cachedUserPreferences.length === 0) return;

    const contextBlock = `\n\n--- USER CONTEXT (from their memories) ---\n${this.cachedUserPreferences.join('\n')}\n---\n\nUse this context to personalize your responses. Reference the user's stored preferences, projects, and knowledge when relevant.`;

    // Append context to the (locally held) system prompt
    this.systemPrompt += contextBlock;
  }

  /**
   * Fetch relevant context for a specific query from user's memories
   */
  async fetchRelevantContext(query: string, limit: number = 3): Promise<string[]> {
    try {
      const result = await this.client.searchMemories({
        query,
        status: 'active',
        limit,
        threshold: 0.65
      });

      if (result.data?.results && result.data.results.length > 0) {
        return result.data.results
          .filter((r: any) => r && r.title && r.content) // Filter out invalid results
          .map((r: any) => {
            const content = r.content || '';
            const title = r.title || 'Untitled';
            return `📌 ${title}: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`;
          });
      }
    } catch (error) {
      // Silently fail - context fetching is optional
    }
    return [];
  }

  /**
   * Expose the local-first memory router so ReplEngine can attach it
   * to the CommandContext (MemoryCommands reads/writes through it).
   * Returns undefined when local memory is disabled.
   */
  getMemoryRouter(): MemoryBackendRouter | undefined {
    return this.memoryRouter;
  }

  /**
   * Triggered on REPL shutdown — stop the sync-tick timer and close
   * the local SQLite handle. Safe to call when local memory is disabled.
   */
  async closeMemory(): Promise<void> {
    if (this.syncTickTimer) {
      clearInterval(this.syncTickTimer);
      this.syncTickTimer = undefined;
    }
    if (this.localBackend) {
      try {
        await this.localBackend.close();
      } catch { /* best effort */ }
    }
  }

  private buildSystemPrompt(userContext?: OrchestratorConfig['userContext']): string {
    const userName = userContext?.name ? `, ${userContext.name}` : '';
    const projects = userContext?.projects && userContext.projects.length > 0
      ? `\n\nActive Projects: ${userContext.projects.join(', ')}`
      : '';

    return `You are LZero, the context-aware memory assistant for LanOnasis Memory Service${userName}. You are part of the LanOnasis ecosystem - a unified AI-driven platform powering financial, lifestyle, and digital infrastructure tools.

Your role is to be a helpful, conversational, and context-aware assistant that helps users manage their knowledge and memories through natural language interactions.

${projects}

Your capabilities:
- Create memories: When users want to save information, preferences, notes, or knowledge
- Update memories: When users want to edit titles, content, types, or tags
- Search memories: When users want to find information using semantic search
- List memories: When users want to see what's stored
- Get specific memories: When users reference a specific memory by ID or context
- Delete memories: When users want to remove information
- Optimize prompts: When users ask you to refine, improve, or enhance prompts for better AI results
- Provide context: Help users understand their stored information with rich, contextual responses

Response Guidelines:
1. Always provide a MAIN ANSWER first - the direct response to the user's question
2. When search results are available, include ADDITIONAL CONTEXT showing related information with relevance scores
3. Be conversational, friendly, and personalized - use the user's name and project context when available
4. When performing actions, explain what you're doing in natural language
5. For search results, highlight the most relevant result as the main answer, then show related results as additional context
6. Always be helpful and proactive - suggest related actions or information when relevant

Example interactions:
User: "remind me the url i setup for security sdk?"
LZero: "The security SDK URL you configured is: https://api.security.lanonasis.com/v1

Related contexts found:
- Security SDK setup notes (relevance: 95%)
- Authentication flow documentation (relevance: 80%)
- API gateway configuration (relevance: 65%)

Would you like me to help with anything else regarding the security setup?"

User: "Please refine this prompt for better results: 'xxxxxxx'"
LZero: "Here's an optimized version of your prompt: [OPTIMIZED PROMPT]

Key improvements:
- Added specific context requirements
- Clarified expected output format
- Included examples for better understanding

Would you like me to save this optimized prompt as a memory?"

User: "Remember that I prefer dark mode"
LZero: "I'll save that preference for you. [CREATE action]"

User: "What do I know about project X?"
LZero: "Let me search your memories for information about project X. [SEARCH action]"

Remember: You are LZero - be helpful, conversational, and make the experience feel natural and personalized.`;
  }

  async processNaturalLanguage(input: string): Promise<OrchestratorResponse> {
    // Ensure context is initialized (runs once)
    if (!this.contextInitialized) {
      await this.initializeContext();
    }

    // Proactively fetch relevant context from user's memories for this query
    // This makes the assistant "context-aware" - it knows what the user has stored
    const relevantContext = await this.fetchRelevantContext(input, 3);

    // Add user message to history, optionally with context
    const userMessage = relevantContext.length > 0
      ? `${input}\n\n[Relevant context from your memories:\n${relevantContext.join('\n')}]`
      : input;

    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // If no AI backend is available, fall back to pattern matching.
    if (!this.aiRouterClient && !this.openaiApiKey) {
      const response = await this.fallbackProcessor(input, relevantContext);
      // Add to history for context continuity
      this.conversationHistory.push({
        role: 'assistant',
        content: response.response
      });
      return response;
    }

    // Use OpenAI to understand intent and generate response
    // Pause readline to prevent ora from interfering with the prompt
    const rlInterface = (global as any).rlInterface;
    if (rlInterface) {
      rlInterface.pause();
    }

    // P1: Show "thinking..." indicator BEFORE the API call starts.
    // Without this the user sees nothing for 2-3s and may think the REPL is frozen.
    const spinner = ora('Thinking…').start();

    try {
      const response = await this.callOpenAI();
      spinner.succeed(chalk.green('✓ Processed'));

      // Resume readline after spinner stops
      if (rlInterface) {
        rlInterface.resume();
      }

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.response
      });

      // Include fetched context in the response for display
      if (relevantContext.length > 0 && !response.action) {
        response.additionalContext = relevantContext.map((ctx, i) => ({
          title: `Related Memory ${i + 1}`,
          content: ctx.replace(/^📌\s*/, ''),
          relevance: 85 - (i * 10) // Decreasing relevance
        }));
      }

      return response;
    } catch (error) {
      // Always stop spinner in error cases
      spinner.stop();

      // Resume readline after spinner stops (even on error)
      const rlInterface = (global as any).rlInterface;
      if (rlInterface) {
        rlInterface.resume();
      }

      // Tell the user what actually failed: backend, HTTP status, error code
      // and message. Classification is by status (see classifyAIError).
      this.reportAIFailure(error);

      // Fall back to basic processing with personality and context
      console.log(chalk.gray('Falling back to local mode…\n'));
      const response = await this.fallbackProcessor(input, relevantContext);
      this.conversationHistory.push({
        role: 'assistant',
        content: response.response
      });
      return response;
    }
  }

  private async callOpenAI(): Promise<OrchestratorResponse> {
    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_memory',
          description: 'Create a new memory entry',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Title of the memory' },
              content: { type: 'string', description: 'Content to remember' },
              memory_type: {
                type: 'string',
                enum: ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'],
                description: 'Type of memory'
              },
              tags: { type: 'array', items: { type: 'string' }, description: 'Tags for categorization' }
            },
            required: ['title', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_memory',
          description: 'Update an existing memory entry',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Memory ID to update' },
              title: { type: 'string', description: 'Updated title' },
              content: { type: 'string', description: 'Updated content' },
              memory_type: {
                type: 'string',
                enum: ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'],
                description: 'Updated memory type'
              },
              tags: { type: 'array', items: { type: 'string' }, description: 'Updated tags' },
              status: {
                type: 'string',
                enum: ['active', 'archived', 'draft', 'deleted'],
                description: 'Updated memory status'
              }
            },
            required: ['id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_memories',
          description: 'Search for memories using semantic search',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Maximum number of results' },
              memory_type: { type: 'string', description: 'Filter by memory type' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_memories',
          description: 'List recent memories',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Maximum number of results', default: 10 }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_memory',
          description: 'Get a specific memory by ID',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Memory ID' }
            },
            required: ['id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_memory',
          description: 'Delete a memory by ID',
          parameters: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Memory ID' }
            },
            required: ['id']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'optimize_prompt',
          description: 'Optimize or refine a prompt for better AI results. Use this when users ask to improve, refine, enhance, or optimize a prompt.',
          parameters: {
            type: 'object',
            properties: {
              original_prompt: { type: 'string', description: 'The original prompt to optimize' },
              context: { type: 'string', description: 'Additional context about what the prompt should achieve' },
              improvements: { type: 'array', items: { type: 'string' }, description: 'List of specific improvements made' }
            },
            required: ['original_prompt']
          }
        }
      }
    ];

    const temperature = 0.7;
    const maxTokens = 500;
    const toolChoice = 'auto';
    const useCase = 'repl-nlp';

    let message: any;
    let toolCalls: any[] | undefined;
    const failures: Array<{ backend: string; error: unknown }> = [];

    if (this.aiRouterClient) {
      try {
        const response = await this.aiRouterClient.chat({
          messages: this.routerMessages(),
          tools,
          use_case: useCase,
          temperature,
          max_tokens: maxTokens,
          tool_choice: toolChoice,
        });
        message = response.message;
        toolCalls = message.tool_calls;
      } catch (error) {
        // Recorded and surfaced to the user — never swallowed.
        failures.push({ backend: 'AI Router', error });
      }
    }

    // Direct OpenAI: the primary path only when no router is configured, and
    // otherwise only when the user opted in to it as a fallback.
    const useDirectOpenAI = !!this.openaiApiKey && (!this.aiRouterClient || this.openaiFallback);
    if (!message && useDirectOpenAI) {
      try {
        const data = await this.directOpenAIChat({
          messages: [{ role: 'system', content: this.systemPrompt }, ...this.conversationHistory],
          tools,
          tool_choice: toolChoice,
          temperature,
          max_tokens: maxTokens,
        });
        message = data.choices?.[0]?.message;
        toolCalls = message?.tool_calls;
      } catch (error) {
        failures.push({
          backend: this.aiRouterClient ? 'OpenAI (direct fallback)' : 'OpenAI (direct)',
          error,
        });
      }
    }

    if (!message) {
      if (failures.length === 1) throw failures[0].error;
      if (failures.length > 1) throw new AIBackendsFailedError(failures);
      throw new Error('No AI service available. Please configure either AI Router URL or OpenAI API key.');
    }

    // Map function/tool names to internal action types
    const actionMap: Record<string, 'create' | 'update' | 'search' | 'list' | 'get' | 'delete' | 'optimize_prompt'> = {
      'create_memory': 'create',
      'update_memory': 'update',
      'search_memories': 'search',
      'list_memories': 'list',
      'get_memory': 'get',
      'delete_memory': 'delete',
      'optimize_prompt': 'optimize_prompt'
    };

    // Preferred: tools API (tool_calls)
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const functionName = toolCall.function.name;
      const functionArgs = toolCall.function.arguments
        ? JSON.parse(toolCall.function.arguments)
        : {};

      return {
        response: message.content || this.getDefaultResponse(functionName),
        action: {
          type: actionMap[functionName],
          params: functionArgs
        }
      };
    }

    // Backwards compatibility: legacy function_call API
    if (message.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = message.function_call.arguments
        ? JSON.parse(message.function_call.arguments)
        : {};

      return {
        response: message.content || this.getDefaultResponse(functionName),
        action: {
          type: actionMap[functionName],
          params: functionArgs
        }
      };
    }

    // For non-function responses, extract main answer and structure response
    const responseText = message.content || '';
    return {
      response: responseText,
      mainAnswer: responseText
    };
  }

  private getDefaultResponse(functionName: string): string {
    const responses: Record<string, string> = {
      'create_memory': 'Creating that memory for you...',
      'update_memory': 'Updating that memory for you...',
      'search_memories': 'Searching your memories...',
      'list_memories': 'Fetching your recent memories...',
      'get_memory': 'Retrieving that memory...',
      'delete_memory': 'Deleting that memory...',
      'optimize_prompt': 'Optimizing your prompt...'
    };
    return responses[functionName] || 'Processing...';
  }

  private async fallbackProcessor(input: string, relevantContext: string[] = []): Promise<OrchestratorResponse> {
    const lowerInput = input.toLowerCase().trim();
    const userName = this.userContext?.name;
    const greeting = userName ? `${userName}` : 'there';

    // If we have relevant context and the user seems to be asking a question, reference it
    if (relevantContext.length > 0 && (lowerInput.includes('?') || lowerInput.startsWith('what') || lowerInput.startsWith('how') || lowerInput.startsWith('where') || lowerInput.startsWith('when') || lowerInput.startsWith('why'))) {
      const contextSummary = relevantContext.slice(0, 2).join('\n  ');
      return {
        response: `Based on what I found in your memories, ${greeting}:\n\n  ${contextSummary}\n\nWould you like me to search for more details?`,
        mainAnswer: `Based on what I found in your memories:\n\n  ${contextSummary}`,
        additionalContext: relevantContext.map((ctx, i) => ({
          title: `Memory ${i + 1}`,
          content: ctx.replace(/^📌\s*/, ''),
          relevance: 90 - (i * 10)
        }))
      };
    }

    // Greeting patterns - LZero should respond conversationally
    if (this.isGreeting(lowerInput)) {
      const greetings = [
        `Hey ${greeting}! 👋 I'm LZero, your memory assistant. What can I help you with today?`,
        `Hello ${greeting}! Great to see you. Ready to help you manage your knowledge!`,
        `Hi ${greeting}! 🧠 What's on your mind? I can remember things, search your knowledge, or help refine your prompts.`,
      ];
      return {
        response: greetings[Math.floor(Math.random() * greetings.length)],
        mainAnswer: greetings[Math.floor(Math.random() * greetings.length)]
      };
    }

    // Pattern matching for common intents with personality
    if (lowerInput.includes('remember') || lowerInput.includes('save') || lowerInput.includes('store') || lowerInput.includes('note')) {
      // Extract content after keywords
      const content = input.replace(/^(remember|save|store|note|keep|record)\s+(that\s+)?/i, '');
      if (!content.trim()) {
        return {
          response: `Sure ${greeting}, I can remember that for you! What would you like me to save?`,
          mainAnswer: `Sure ${greeting}, I can remember that for you! What would you like me to save?`
        };
      }
      return {
        response: `Got it, ${greeting}! 📝 I'll save that for you right now...`,
        mainAnswer: `Got it, ${greeting}! 📝 I'll save that for you right now...`,
        action: {
          type: 'create',
          params: {
            title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
            content: content,
            memory_type: 'context'
          }
        }
      };
    }

    if (lowerInput.includes('update') || lowerInput.includes('edit') || lowerInput.includes('revise')) {
      const idMatch = input.match(/[a-f0-9-]{36}/i);
      if (!idMatch) {
        return {
          response: `I can update it for you, ${greeting}, but I need the memory ID.\n\n💡 Tip: Run "list" to get IDs, then say: "update <id> --content=..."`,
          mainAnswer: `I can update it for you, ${greeting}, but I need the memory ID.`
        };
      }

      const normalized = input
        .replace(idMatch[0], '')
        .replace(/^(update|edit|revise)\s+/i, '')
        .trim();

      if (!normalized) {
        return {
          response: `Got the ID. What should I change in that memory?`,
          mainAnswer: `Got the ID. What should I change in that memory?`
        };
      }

      return {
        response: `✏️ Updating that memory now...`,
        mainAnswer: `✏️ Updating that memory now...`,
        action: {
          type: 'update',
          params: {
            id: idMatch[0],
            content: normalized
          }
        }
      };
    }

    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('what do i know') || lowerInput.includes('look for') || lowerInput.includes('where is')) {
      // Extract search query
      const query = input.replace(/^(search|find|look for|where is|what do i know about)\s+/i, '').replace(/\?$/, '');
      if (!query.trim()) {
        return {
          response: `What would you like me to search for, ${greeting}? Just tell me what you're looking for!`,
          mainAnswer: `What would you like me to search for, ${greeting}? Just tell me what you're looking for!`
        };
      }
      return {
        response: `🔍 Let me search your memories for "${query}"...`,
        mainAnswer: `🔍 Let me search your memories for "${query}"...`,
        action: {
          type: 'search',
          params: {
            query: query,
            limit: 10
          }
        }
      };
    }

    if (lowerInput.includes('list') || lowerInput.includes('show me') || lowerInput.includes('my memories') || lowerInput.includes('what have i saved') || lowerInput.includes('what do i have')) {
      return {
        response: `📚 Here's what I've got saved for you, ${greeting}:`,
        mainAnswer: `📚 Here's what I've got saved for you, ${greeting}:`,
        action: {
          type: 'list',
          params: {
            limit: 10
          }
        }
      };
    }

    if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('forget')) {
      // Check if there's an ID provided
      const idMatch = input.match(/[a-f0-9-]{36}/i);
      if (idMatch) {
        return {
          response: `🗑️ Removing that memory for you...`,
          mainAnswer: `🗑️ Removing that memory for you...`,
          action: {
            type: 'delete',
            params: { id: idMatch[0] }
          }
        };
      }
      return {
        response: `I can help you forget something, ${greeting}! To delete a memory, I need its ID.\n\n💡 Tip: Run "list" or say "show my memories" to see IDs, then tell me which one to remove.`,
        mainAnswer: `I can help you forget something, ${greeting}! To delete a memory, I need its ID.\n\n💡 Tip: Run "list" or say "show my memories" to see IDs, then tell me which one to remove.`
      };
    }

    // Help patterns
    if (lowerInput.includes('help') || lowerInput === '?' || lowerInput.includes('what can you do')) {
      return {
        response: `Hey ${greeting}! 🌪️ I'm LZero, your context-aware memory assistant. Here's what I can do:

✨ **Memory & Knowledge**
   "Remember that API key is xyz123"
   "Update memory <id> with new content"
   "What do I know about TypeScript?"
   "Show my memories"
   "Search project docs --type=project"

🛠️ **Prompt Optimization**
   "Please refine this prompt: ..."

⚡ **Optional L0 Orchestration**
   "Create a campaign plan"
   "Analyze trends"
   "Build content workflow"

💡 **Pro Tips:**
   • Just talk naturally - I understand intent!
   • Powered by memory-client actions first
   • Your memories make me context-aware`,
        mainAnswer: `I'm LZero, your context-aware memory assistant!`
      };
    }

    // Route to VortexAI L0 for broader orchestration (campaigns, content, trends, etc.)
    if (this.shouldUseL0(lowerInput) && this.l0Orchestrator) {
      try {
        const l0Response = await this.l0Orchestrator.query(input);

        // If L0 handled it with a meaningful response (not general fallback), use it
        if (l0Response && l0Response.type !== 'help' && l0Response.message) {
          return this.convertL0Response(l0Response, greeting);
        }
      } catch (error) {
        // L0 failed, continue to conversational fallback
      }
    }

    // Conversational responses for truly unknown input
    const conversationalResponses = [
      `Hmm, I'm not quite sure what you mean, ${greeting}. Could you rephrase that?\n\n💡 I can help you save information, update memories, search memories, and list your knowledge.`,
      `I want to help, ${greeting}, but I'm not sure how to handle that request.\n\nTry saying things like:\n• "Remember that..."\n• "Update memory <id> ..."\n• "Search for..."`,
      `That's interesting, ${greeting}! But I'm not sure how to act on it.\n\n🤔 Did you want me to save this as a memory? Just say "remember that" followed by what you want to save.`,
    ];

    return {
      response: conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)],
      mainAnswer: conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)]
    };
  }

  /**
   * Convert L0 response to orchestrator response format
   */
  private convertL0Response(l0Response: L0Response, greeting: string): OrchestratorResponse {
    let formattedResponse = l0Response.message;

    // Add workflow steps if present
    if (l0Response.workflow && l0Response.workflow.length > 0) {
      formattedResponse += '\n\n📋 **Workflow:**\n' + l0Response.workflow.map((step: string) => `  ${step}`).join('\n');
    }

    // Add agents if present
    if (l0Response.agents && l0Response.agents.length > 0) {
      formattedResponse += '\n\n🤖 **Agents:**\n' + l0Response.agents.map((agent: string) => `  • ${agent}`).join('\n');
    }

    return {
      response: formattedResponse,
      mainAnswer: l0Response.message,
      additionalContext: l0Response.related?.map((item: string, i: number) => ({
        title: `Related ${i + 1}`,
        content: item,
        relevance: 80 - (i * 10)
      }))
    };
  }

  /**
   * Check if input is a greeting
   */
  private isGreeting(input: string): boolean {
    const greetings = ['hi', 'hello', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy', "what's up", 'yo', 'sup'];
    return greetings.some(g => input === g || input.startsWith(g + ' ') || input.startsWith(g + ',') || input.startsWith(g + '!'));
  }

  async executeAction(action: OrchestratorResponse['action']): Promise<any> {
    if (!action) return null;

    try {
      switch (action.type) {
        case 'create':
          return await this.client.createMemory({
            title: action.params.title || '',
            content: action.params.content || '',
            memory_type: (action.params.memory_type || 'context') as 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow',
            tags: action.params.tags || []
          });

        case 'update': {
          const { id, ...updates } = action.params;
          if (!id) {
            return { error: 'Missing memory id for update action.' };
          }
          return await this.client.updateMemory(id, updates);
        }

        case 'search':
          const searchResult = await this.client.searchMemories({
            query: action.params.query || '',
            status: 'active',
            limit: action.params.limit || 10,
            threshold: action.params.threshold || 0.7
          });

          // Enhance search results with structured response
          if (searchResult.data?.results && searchResult.data.results.length > 0) {
            const results = searchResult.data.results;
            const mainResult = results[0]; // Most relevant result
            const additionalResults = results.slice(1); // Other relevant results

            return {
              ...searchResult,
              enhanced: {
                mainResult,
                additionalResults: additionalResults.map((r: any) => ({
                  title: r.title,
                  content: r.content.substring(0, 200),
                  relevance: r.similarity ? r.similarity * 100 : undefined
                }))
              }
            };
          }
          return searchResult;

        case 'list':
          return await this.client.listMemories({
            limit: action.params.limit || 10
          });

        case 'get':
          return await this.client.getMemory(action.params.id);

        case 'delete':
          return await this.client.deleteMemory(action.params.id);

        case 'optimize_prompt':
          // Optimize prompt using OpenAI
          return await this.optimizePrompt(action.params.original_prompt, action.params.context);

        default:
          return { error: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      // Return error object instead of throwing - keeps REPL alive
      const errorMessage = this.formatError(error);

      // Provide helpful context based on error type
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        return { error: 'Authentication failed. Try running: onasis-repl login' };
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return { error: 'Memory not found. It may have been deleted.' };
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
        return { error: 'Could not connect to the memory service. Check your network or API URL.' };
      }

      return { error: errorMessage };
    }
  }

  private async optimizePrompt(originalPrompt: string, context?: string): Promise<any> {
    // If neither AI Router nor OpenAI is configured, return error
    if (!this.aiRouterClient && !this.openaiApiKey) {
      return {
        error: 'AI service not configured. Please configure either AI Router URL or OpenAI API key.'
      };
    }

    const optimizationPrompt = `You are an expert at optimizing prompts for AI models. Your task is to refine and improve the following prompt to get better, more accurate, and more useful results.

Original prompt:
${originalPrompt}

${context ? `Additional context: ${context}` : ''}

Please provide:
1. An optimized version of the prompt
2. A list of specific improvements made
3. Explanation of why each improvement helps

Format your response as JSON with:
- optimized_prompt: The improved prompt
- improvements: Array of improvement descriptions
- explanation: Brief explanation of the optimization strategy`;

    try {
      let content: string;

      // Try AI Router first if available
      if (this.aiRouterClient) {
        // No system message: the router rejects it. The JSON-format request is
        // already part of the user prompt above.
        const response = await this.aiRouterClient.chat({
          messages: [{ role: 'user', content: optimizationPrompt }],
          use_case: 'content-generation',
          temperature: 0.7,
          max_tokens: 1000
        });
        content = response.message.content;
      } else {
        // Direct OpenAI (only reached when no router is configured)
        const data = await this.directOpenAIChat({
          messages: [
            { role: 'system', content: 'You are an expert at optimizing AI prompts. Always respond with valid JSON.' },
            { role: 'user', content: optimizationPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        });
        content = data.choices[0].message.content;
      }

      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content);
        return {
          data: {
            original_prompt: originalPrompt,
            optimized_prompt: parsed.optimized_prompt || content,
            improvements: parsed.improvements || [],
            explanation: parsed.explanation || ''
          }
        };
      } catch {
        // If not JSON, return as text
        return {
          data: {
            original_prompt: originalPrompt,
            optimized_prompt: content,
            improvements: [],
            explanation: 'Prompt optimized successfully'
          }
        };
      }
    } catch (error) {
      return {
        error: this.formatError(error) || 'Failed to optimize prompt'
      };
    }
  }

  clearHistory() {
    // The persona prompt lives in `systemPrompt`, so clearing history is total.
    this.conversationHistory = [];
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /** The active persona prompt (used only on the direct-OpenAI path). */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }

  /**
   * History as sent to the router: user/assistant turns only. The filter is
   * defence in depth — `conversationHistory` is typed without 'system', but
   * tests and older callers reach into it directly.
   */
  private routerMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.conversationHistory
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));
  }

  /** POST to api.openai.com; failures keep their HTTP status and error code. */
  private async directOpenAIChat(body: Record<string, unknown>): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({ model: this.resolveOpenAIModel(), ...body })
    });

    if (!response.ok) {
      let code: string | undefined;
      let detail: string | undefined;
      try {
        const parsed: any = JSON.parse(await response.text());
        code = parsed?.error?.code || parsed?.error?.type || undefined;
        detail = parsed?.error?.message;
      } catch {
        /* non-JSON body */
      }
      throw new OpenAIRequestError(
        `OpenAI HTTP ${response.status}${code ? ` ${code}` : response.statusText ? ` ${response.statusText}` : ''}` +
        (detail ? `: ${detail}` : ''),
        { status: response.status, code }
      );
    }

    return response.json();
  }

  /** Print an honest, classified description of an AI backend failure. */
  private reportAIFailure(error: unknown): void {
    const failures = error instanceof AIBackendsFailedError
      ? error.failures
      : [{ backend: error instanceof OpenAIRequestError ? 'OpenAI' : 'AI Router', error }];
    const kind = classifyAIError(error);

    const headline: Record<AIErrorKind, string> = {
      auth: 'The AI service rejected my credentials.',
      rate_limit: 'The AI service is rate-limiting requests (busy) — wait a little and try again.',
      rejected: 'The AI service rejected the request.',
      service: 'The AI service failed on its side.',
      network: 'I can\'t reach the AI service right now.',
      other: 'The AI request failed.',
    };
    console.log(chalk.yellow(`\n⚠️  ${headline[kind]}`));
    for (const f of failures) {
      console.log(chalk.gray(`  ${f.backend}: ${this.formatError(f.error)}`));
      const retryAfter = (f.error as { retryAfter?: unknown })?.retryAfter;
      if (typeof retryAfter === 'number') {
        console.log(chalk.gray(`  Retry after ${retryAfter}s.`));
      }
    }
    if (kind === 'auth') {
      console.log(chalk.gray('  Check aiRouterApiKey in ~/.lanonasis/repl-config.json or run `onasis-repl login`.'));
    } else if (kind === 'network') {
      console.log(chalk.gray('  Check your connection, or run "health" to see which checks pass.'));
    }
    if (this.aiRouterClient && this.openaiApiKey && !this.openaiFallback) {
      console.log(chalk.gray('  (Direct OpenAI fallback is off; set openaiFallback: true to enable it.)'));
    }
  }
}
