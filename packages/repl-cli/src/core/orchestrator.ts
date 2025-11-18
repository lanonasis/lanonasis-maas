import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import chalk from 'chalk';
import ora from 'ora';

export interface OrchestratorConfig {
  apiUrl: string;
  authToken?: string;
  openaiApiKey?: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OrchestratorResponse {
  response: string;
  action?: {
    type: 'create' | 'search' | 'list' | 'get' | 'delete' | 'update';
    params: Record<string, any>;
  };
  context?: any;
}

export class NaturalLanguageOrchestrator {
  private client: MemoryClient;
  private conversationHistory: ConversationMessage[] = [];
  private openaiApiKey?: string;

  constructor(config: OrchestratorConfig) {
    this.client = createMemoryClient({
      apiUrl: config.apiUrl,
      authToken: config.authToken,
      timeout: 30000
    });

    this.openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;

    // Initialize conversation with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: `You are an intelligent assistant for LanOnasis Memory Service. You help users manage their memories through natural language interactions.

Your capabilities:
- Create memories: When users want to save information
- Search memories: When users want to find information
- List memories: When users want to see what's stored
- Get specific memories: When users reference a specific memory
- Delete memories: When users want to remove information
- Provide context: Help users understand their stored information

Always be helpful, concise, and actionable. When you identify a user intent that requires memory operations, provide the appropriate action.

Response format:
- If the user wants to perform an action, provide both a natural language response AND the action details
- If the user is just asking questions, provide helpful information based on available context
- Be conversational and friendly

Example interactions:
User: "Remember that I prefer dark mode"
Response: I'll save that preference for you. [CREATE action]

User: "What do I know about project X?"
Response: Let me search your memories for information about project X. [SEARCH action]

User: "Show me my recent memories"
Response: Here are your recent memories. [LIST action]`
    });
  }

  async processNaturalLanguage(input: string): Promise<OrchestratorResponse> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: input
    });

    // Use OpenAI to understand intent and generate response
    const spinner = ora('Processing...').start();

    try {
      // If no OpenAI key, fall back to basic pattern matching
      if (!this.openaiApiKey) {
        spinner.stop();
        return await this.fallbackProcessor(input);
      }

      const response = await this.callOpenAI();
      spinner.stop();

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response.response
      });

      return response;
    } catch (error) {
      spinner.fail('Error processing request');
      // Fall back to basic processing
      return await this.fallbackProcessor(input);
    }
  }

  private async callOpenAI(): Promise<OrchestratorResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: this.conversationHistory,
        functions: [
          {
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
          },
          {
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
          },
          {
            name: 'list_memories',
            description: 'List recent memories',
            parameters: {
              type: 'object',
              properties: {
                limit: { type: 'number', description: 'Maximum number of results', default: 10 }
              }
            }
          },
          {
            name: 'get_memory',
            description: 'Get a specific memory by ID',
            parameters: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Memory ID' }
              },
              required: ['id']
            }
          },
          {
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
        ],
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const message = data.choices[0].message;

    // Check if OpenAI wants to call a function
    if (message.function_call) {
      const functionName = message.function_call.name;
      const functionArgs = JSON.parse(message.function_call.arguments);

      // Map function names to action types
      const actionMap: Record<string, 'create' | 'search' | 'list' | 'get' | 'delete' | 'update'> = {
        'create_memory': 'create',
        'search_memories': 'search',
        'list_memories': 'list',
        'get_memory': 'get',
        'delete_memory': 'delete'
      };

      return {
        response: message.content || this.getDefaultResponse(functionName),
        action: {
          type: actionMap[functionName],
          params: functionArgs
        }
      };
    }

    return {
      response: message.content
    };
  }

  private getDefaultResponse(functionName: string): string {
    const responses: Record<string, string> = {
      'create_memory': 'Creating that memory for you...',
      'search_memories': 'Searching your memories...',
      'list_memories': 'Fetching your recent memories...',
      'get_memory': 'Retrieving that memory...',
      'delete_memory': 'Deleting that memory...'
    };
    return responses[functionName] || 'Processing...';
  }

  private async fallbackProcessor(input: string): Promise<OrchestratorResponse> {
    const lowerInput = input.toLowerCase();

    // Pattern matching for common intents
    if (lowerInput.includes('remember') || lowerInput.includes('save') || lowerInput.includes('store')) {
      // Extract content after "remember" or similar keywords
      const content = input.replace(/^(remember|save|store)\s+/i, '');
      return {
        response: "I'll save that for you.",
        action: {
          type: 'create',
          params: {
            title: content.substring(0, 50),
            content: content,
            memory_type: 'context'
          }
        }
      };
    }

    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('what do i know about')) {
      // Extract search query
      const query = input.replace(/^(search|find|what do i know about)\s+/i, '');
      return {
        response: "Searching your memories...",
        action: {
          type: 'search',
          params: {
            query: query,
            limit: 10
          }
        }
      };
    }

    if (lowerInput.includes('list') || lowerInput.includes('show me') || lowerInput.includes('my memories')) {
      return {
        response: "Here are your recent memories:",
        action: {
          type: 'list',
          params: {
            limit: 10
          }
        }
      };
    }

    if (lowerInput.includes('delete') || lowerInput.includes('remove') || lowerInput.includes('forget')) {
      // This requires a memory ID, so we'll ask for clarification
      return {
        response: "To delete a memory, please provide the memory ID. You can find it by listing your memories first."
      };
    }

    // Default response for unrecognized input
    return {
      response: `I'm not sure how to help with that. I can help you:
- Save information: "remember that..."
- Find information: "search for..."
- List memories: "show my memories"
- Get help: "help" or "?"

You can also use direct commands like: create, search, list, get, delete`
    };
  }

  async executeAction(action: OrchestratorResponse['action']): Promise<any> {
    if (!action) return null;

    switch (action.type) {
      case 'create':
        return await this.client.createMemory({
          title: action.params.title || '',
          content: action.params.content || '',
          memory_type: (action.params.memory_type || 'context') as 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow',
          tags: action.params.tags || []
        });

      case 'search':
        return await this.client.searchMemories({
          query: action.params.query || '',
          status: 'active',
          limit: action.params.limit || 10,
          threshold: action.params.threshold || 0.7
        });

      case 'list':
        return await this.client.listMemories({
          limit: action.params.limit || 10
        });

      case 'get':
        return await this.client.getMemory(action.params.id);

      case 'delete':
        return await this.client.deleteMemory(action.params.id);

      default:
        return null;
    }
  }

  clearHistory() {
    this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep only system prompt
  }

  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }
}
