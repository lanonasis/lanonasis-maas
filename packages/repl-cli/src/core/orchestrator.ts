import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import chalk from 'chalk';
import ora from 'ora';

// VortexAI L0 Integration - Universal Work Orchestrator
import {
  L0Orchestrator,
  createPluginManager,
  configureMemoryPlugin,
  type L0Response
} from 'vortexai-l0';

// Onasis AI Router client
import { AIRouterClient } from './ai-router-client';
import type { L0Config } from '../config/types.js';
import { DEFAULT_OPENAI_MODEL } from '../config/constants.js';

export interface OrchestratorConfig {
  apiUrl: string;
  authToken?: string;
  openaiApiKey?: string;
  model?: string;
  aiRouterUrl?: string;
  aiRouterAuthToken?: string;
  aiRouterApiKey?: string; // Dedicated API key for AI Router (lano_...)
  l0?: L0Config;
  userContext?: {
    name?: string;
    projects?: string[];
    preferences?: Record<string, any>;
  };
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
  private openaiApiKey?: string;
  private model: string;
  private userContext?: OrchestratorConfig['userContext'];
  private cachedUserPreferences: string[] = []; // Cached user preferences/profile info
  private contextInitialized: boolean = false;

  // VortexAI L0 - Universal Work Orchestrator for broader capabilities
  private l0Orchestrator?: L0Orchestrator;
  private l0Config: Required<Pick<L0Config, 'enabled' | 'enableCampaigns' | 'enableTrends' | 'enableContentCreation'>>;
  private aiRouterClient?: AIRouterClient;

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

    // Initialize conversation with enhanced system prompt
    this.conversationHistory.push({
      role: 'system',
      content: this.buildSystemPrompt(config.userContext)
    });
  }

  /**
   * Initialize context by loading user preferences and profile from memories
   * This should be called at startup to make the assistant context-aware
   */
  async initializeContext(): Promise<void> {
    if (this.contextInitialized) return;

    try {
      // Search for user preferences and profile information
      const preferencesSearch = await this.client.searchMemories({
        query: 'user preferences settings profile configuration style',
        status: 'active',
        limit: 5,
        threshold: 0.6
      });

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
   * Update the system prompt with loaded user context
   */
  private updateSystemPromptWithContext(): void {
    if (this.cachedUserPreferences.length === 0) return;

    const contextBlock = `\n\n--- USER CONTEXT (from their memories) ---\n${this.cachedUserPreferences.join('\n')}\n---\n\nUse this context to personalize your responses. Reference the user's stored preferences, projects, and knowledge when relevant.`;

    // Append context to the system prompt
    if (this.conversationHistory.length > 0 && this.conversationHistory[0].role === 'system') {
      this.conversationHistory[0].content += contextBlock;
    }
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
    const spinner = ora('Processing...').start();

    try {
      const response = await this.callOpenAI();
      spinner.stop();

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

      // Log the actual error for debugging
      const errorMessage = this.formatError(error);

      // Check for specific error types to provide better feedback
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('AUTH_REQUIRED')) {
        console.log(chalk.yellow('\n⚠️  AI Router authentication failed.'));
        console.log(chalk.gray('  The AI Router (ai.vortexcore.app) requires a valid API key.'));
        console.log(chalk.gray('  Set AI_ROUTER_API_KEY env var or use --ai-router-key option.'));
        console.log(chalk.gray('  Falling back to pattern matching...\n'));
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        console.log(chalk.yellow('\n⚠️  Rate limited. Please wait a moment.'));
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
        console.log(chalk.yellow('\n⚠️  Network issue connecting to AI service.'));
        console.log(chalk.gray('  Falling back to pattern matching...\n'));
      }

      // Fall back to basic processing with personality and context
      console.log(chalk.gray('Falling back to pattern matching...\n'));
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

    if (this.aiRouterClient) {
      try {
        const response = await this.aiRouterClient.chat({
          messages: this.conversationHistory,
          tools,
          use_case: useCase,
          temperature,
          max_tokens: maxTokens,
          tool_choice: toolChoice,
        });
        message = response.message;
        toolCalls = message.tool_calls;
      } catch (error) {
        console.error('AI Router request failed, falling back to OpenAI:', error);
        // Fall through to OpenAI
      }
    }

    // Fallback to OpenAI if AI Router not configured or failed
    if (!message && this.openaiApiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.resolveOpenAIModel(),
          messages: this.conversationHistory,
          tools,
          tool_choice: toolChoice,
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data: any = await response.json();
      message = data.choices[0].message;
      toolCalls = message.tool_calls;
    }

    if (!message) {
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
      formattedResponse += '\n\n📋 **Workflow:**\n' + l0Response.workflow.map(step => `  ${step}`).join('\n');
    }

    // Add agents if present
    if (l0Response.agents && l0Response.agents.length > 0) {
      formattedResponse += '\n\n🤖 **Agents:**\n' + l0Response.agents.map(agent => `  • ${agent}`).join('\n');
    }

    return {
      response: formattedResponse,
      mainAnswer: l0Response.message,
      additionalContext: l0Response.related?.map((item, i) => ({
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
        const response = await this.aiRouterClient.chat({
          messages: [
            { role: 'system', content: 'You are an expert at optimizing AI prompts. Always respond with valid JSON.' },
            { role: 'user', content: optimizationPrompt }
          ],
          use_case: 'content-generation',
          temperature: 0.7,
          max_tokens: 1000
        });
        content = response.message.content;
      } else {
        // Fallback to OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          },
          body: JSON.stringify({
            model: this.resolveOpenAIModel(),
            messages: [
              { role: 'system', content: 'You are an expert at optimizing AI prompts. Always respond with valid JSON.' },
              { role: 'user', content: optimizationPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data: any = await response.json();
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
    this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep only system prompt
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }
}
