/**
 * Base Agent Class
 * Foundation for all specialized agents in the orchestration system
 */

export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  priority: number;
  timeout?: number;
  retries?: number;
}

export interface AgentContext {
  user_id?: string;
  session_id?: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  memory_context?: Array<{
    id: string;
    title: string;
    content: string;
    relevance?: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface AgentRequest {
  input: string;
  context: AgentContext;
  parameters?: Record<string, unknown>;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  next_agents?: string[];
  confidence?: number;
  processing_time?: number;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected isActive: boolean = true;
  protected stats = {
    requests_processed: 0,
    success_rate: 0,
    average_response_time: 0,
    last_executed: null as Date | null
  };

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Main processing method - must be implemented by each agent
   */
  abstract process(request: AgentRequest): Promise<AgentResponse>;

  /**
   * Check if agent can handle this request
   */
  canHandle(request: AgentRequest): boolean {
    return this.isActive && this.isCapable(request);
  }

  /**
   * Determine if agent has capability to handle request
   */
  protected isCapable(request: AgentRequest): boolean {
    // Default implementation - can be overridden
    return this.config.capabilities.some(cap => 
      request.input.toLowerCase().includes(cap.toLowerCase()) ||
      request.parameters?.[cap] !== undefined
    );
  }

  /**
   * Execute with monitoring and error handling
   */
  async execute(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      this.stats.requests_processed++;
      
      // Set timeout if configured
      const timeout = this.config.timeout || 30000; // 30 seconds default
      const timeoutPromise = new Promise<AgentResponse>((_, reject) =>
        setTimeout(() => reject(new Error(`Agent ${this.config.name} timeout`)), timeout)
      );

      const response = await Promise.race([
        this.process(request),
        timeoutPromise
      ]);

      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);

      return {
        ...response,
        processing_time: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processing_time: processingTime
      };
    }
  }

  /**
   * Update agent statistics
   */
  private updateStats(success: boolean, responseTime: number) {
    this.stats.last_executed = new Date();
    
    // Update success rate
    const totalRequests = this.stats.requests_processed;
    const previousSuccesses = (this.stats.success_rate / 100) * (totalRequests - 1);
    const currentSuccesses = success ? previousSuccesses + 1 : previousSuccesses;
    this.stats.success_rate = (currentSuccesses / totalRequests) * 100;
    
    // Update average response time
    const previousTotal = this.stats.average_response_time * (totalRequests - 1);
    this.stats.average_response_time = (previousTotal + responseTime) / totalRequests;
  }

  /**
   * Get agent information and statistics
   */
  getInfo() {
    return {
      ...this.config,
      status: this.isActive ? 'active' : 'inactive',
      stats: this.stats
    };
  }

  /**
   * Activate/deactivate agent
   */
  setActive(active: boolean) {
    this.isActive = active;
  }

  /**
   * Reset agent statistics
   */
  resetStats() {
    this.stats = {
      requests_processed: 0,
      success_rate: 0,
      average_response_time: 0,
      last_executed: null
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Basic health check - can be overridden for more complex checks
      return this.isActive;
    } catch {
      return false;
    }
  }

  /**
   * Utility method for logging
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    console.log(`[${level.toUpperCase()}] ${this.config.name}: ${message}`, data || '');
  }
}