import { resolveCommand, ParsedCommand } from './parser';
import { toolRegistry } from '../connectors';

export interface OrchestratorResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  command: ParsedCommand;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

export async function orchestrate(input: string): Promise<OrchestratorResult> {
  const startTime = Date.now();
  
  try {
    // Parse the command
    const command = await resolveCommand(input);
    
    // Validate tool exists
    if (!toolRegistry[command.tool]) {
      throw new Error(`Tool "${command.tool}" not found. Available tools: ${Object.keys(toolRegistry).join(', ')}`);
    }

    // Execute the command
    const data = await toolRegistry[command.tool](command.action, command.args);
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: true,
      data,
      command,
      executionTime
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      command: {
        tool: 'unknown',
        action: 'unknown',
        args: {},
        confidence: 0,
        originalInput: input
      },
      executionTime
    };
  }
}

// Helper function for testing and debugging
export async function parseOnly(input: string): Promise<ParsedCommand> {
  return resolveCommand(input);
}

// Batch orchestration for multiple commands
export async function orchestrateBatch(inputs: string[]): Promise<OrchestratorResult[]> {
  const results: OrchestratorResult[] = [];
  
  for (const input of inputs) {
    const result = await orchestrate(input);
    results.push(result);
  }
  
  return results;
}

// Context-aware orchestration (maintains conversation state)
export class ContextualOrchestrator {
  private context: Map<string, unknown> = new Map();
  
  setContext(key: string, value: unknown) {
    this.context.set(key, value);
  }
  
  getContext(key: string) {
    return this.context.get(key);
  }
  
  clearContext() {
    this.context.clear();
  }
  
  async orchestrate(input: string): Promise<OrchestratorResult> {
    const result = await orchestrate(input);
    
    // Store relevant context from successful operations
    if (result.success && result.data) {
      // Store memory IDs for future reference
      if (result.command.tool === 'memory') {
        if (result.data.id) {
          this.setContext('lastMemoryId', result.data.id);
        }
        if (Array.isArray(result.data.memories) && result.data.memories.length > 0) {
          this.setContext('lastSearchResults', result.data.memories.map((m: { id: unknown }) => m.id));
        }
      }
      
      // Store UI navigation state
      if (result.command.tool === 'ui') {
        this.setContext('lastUIAction', result.command.action);
        if (result.data.url) {
          this.setContext('lastURL', result.data.url);
        }
      }
    }
    
    return result;
  }
}

export { resolveCommand, type ParsedCommand } from './parser';
export { toolRegistry } from '../connectors';