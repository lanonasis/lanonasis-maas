import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import chalk from 'chalk';
import ora from 'ora';

export interface OrchestratorConfig {
  apiUrl: string;
  authToken?: string;
  openaiApiKey?: string;
  model?: string;
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
    type: 'create' | 'search' | 'list' | 'get' | 'delete' | 'optimize_prompt';
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

  constructor(config: OrchestratorConfig) {
    this.client = createMemoryClient({
      apiUrl: config.apiUrl,
      authToken: config.authToken,
      timeout: 30000
    });

    this.openaiApiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this.userContext = config.userContext;

    // Initialize conversation with enhanced system prompt
    this.conversationHistory.push({
      role: 'system',
      content: this.buildSystemPrompt(config.userContext)
    });
  }

  private buildSystemPrompt(userContext?: OrchestratorConfig['userContext']): string {
    const userName = userContext?.name ? `, ${userContext.name}` : '';
    const projects = userContext?.projects && userContext.projects.length > 0
      ? `\n\nActive Projects: ${userContext.projects.join(', ')}`
      : '';
    
    return `You are LZero, the intelligent AI assistant for LanOnasis Memory Service${userName}. You are part of the LanOnasis ecosystem - a unified AI-driven platform powering financial, lifestyle, and digital infrastructure tools.

Your role is to be a helpful, conversational, and context-aware assistant that helps users manage their knowledge and memories through natural language interactions.

${projects}

Your capabilities:
- Create memories: When users want to save information, preferences, notes, or knowledge
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
        model: this.model,
        messages: this.conversationHistory,
        tools: [
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
        ],
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    const message = data.choices[0].message;

    // Map function/tool names to internal action types
    const actionMap: Record<string, 'create' | 'search' | 'list' | 'get' | 'delete' | 'optimize_prompt'> = {
      'create_memory': 'create',
      'search_memories': 'search',
      'list_memories': 'list',
      'get_memory': 'get',
      'delete_memory': 'delete',
      'optimize_prompt': 'optimize_prompt'
    };

    // Preferred: tools API (tool_calls)
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
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
      'search_memories': 'Searching your memories...',
      'list_memories': 'Fetching your recent memories...',
      'get_memory': 'Retrieving that memory...',
      'delete_memory': 'Deleting that memory...',
      'optimize_prompt': 'Optimizing your prompt...'
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
        return null;
    }
  }

  private async optimizePrompt(originalPrompt: string, context?: string): Promise<any> {
    if (!this.openaiApiKey) {
      return {
        error: 'OpenAI API key required for prompt optimization'
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: this.model,
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
      const content = data.choices[0].message.content;
      
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
        error: error instanceof Error ? error.message : 'Failed to optimize prompt'
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
