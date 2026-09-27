/**
 * AI Endpoint Health Check Utility
 * 
 * Provides health monitoring for AI endpoints with automatic fallback detection.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { AIRouterClient } from './ai-router-client.js';

/** Labels say what each check actually proves. */
export const ROUTER_REACHABILITY = 'AI Router reachability (GET /health, no auth)';
export const ROUTER_CHAT = 'AI Router chat (authenticated POST /api/v1/ai-chat, use_case repl-nlp)';
export const OPENAI_KEY_CHECK = 'OpenAI API direct (GET /v1/models, key only)';
export const MEMORY_API_REACHABILITY = 'Memory API reachability (HEAD, no auth)';

export interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency: number;
  message: string;
  fallbackAvailable: boolean;
  lastChecked: Date;
  /** True for checks that exercise an authenticated request (i.e. prove chat works). */
  authenticated?: boolean;
}

export interface EndpointConfig {
  name: string;
  url: string;
  type: 'router' | 'router-chat' | 'openai' | 'local';
  priority: number;
  timeout?: number;
  /** router-chat only: the credential the REPL would use for chat. */
  authToken?: string;
}

export class AIEndpointHealthCheck {
  private endpoints: EndpointConfig[];
  private results: Map<string, HealthCheckResult> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private spinner?: Ora;
  private openaiApiKey?: string;

  constructor(endpoints: EndpointConfig[], openaiApiKey?: string) {
    this.endpoints = endpoints.sort((a, b) => a.priority - b.priority);
    this.openaiApiKey = openaiApiKey;
  }

  /**
   * Check health of a single endpoint
   */
  async checkEndpoint(endpoint: EndpointConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timeout = endpoint.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (endpoint.type === 'router-chat') {
      clearTimeout(timeoutId);
      return this.checkRouterChat(endpoint, startTime);
    }

    try {
      let response: Response | undefined;

      // For AI Router
      if (endpoint.type === 'router') {
        const tryHead = () => fetch(endpoint.url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        response = await fetch(`${endpoint.url}/health`, {
          method: 'GET',
          signal: controller.signal,
        }).then(async (r) => {
          if (r.status === 404) {
            // Routers without a health endpoint can still be reachable.
            return tryHead().catch(() => r);
          }
          return r;
        }).catch(() => tryHead());

        const latency = Date.now() - startTime;

        if (response.ok || response.status === 405) { // 405 is ok for HEAD on some endpoints
          return {
            endpoint: endpoint.name,
            status: latency < 1000 ? 'healthy' : 'degraded',
            latency,
            message: `Responsive (${latency}ms)`,
            fallbackAvailable: true,
            lastChecked: new Date(),
          };
        }
      }

      // For OpenAI API
      if (endpoint.type === 'openai') {
        response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey || process.env.OPENAI_API_KEY || 'dummy'}`,
          },
          signal: controller.signal,
        });

        const latency = Date.now() - startTime;

        // Listing models proves the key is accepted, not that it has credits:
        // a quota-exhausted account still gets 200 here and 429 on chat.
        if (response.ok) {
          return {
            endpoint: endpoint.name,
            status: 'healthy',
            latency,
            message: 'Key accepted (does not check quota/credits)',
            fallbackAvailable: true,
            lastChecked: new Date(),
          };
        }
      }

      // Local/L0 endpoints
      if (endpoint.type === 'local') {
        response = await fetch(endpoint.url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        const latency = Date.now() - startTime;

        if (response.ok || response.status === 405) {
          return {
            endpoint: endpoint.name,
            status: 'healthy',
            latency,
            message: 'Local service available',
            fallbackAvailable: false,
            lastChecked: new Date(),
          };
        }
      }

      if (!response) {
        throw new Error(`Unknown endpoint type: ${endpoint.type}`);
      }

      throw new Error(`HTTP ${response.status}`);

    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        endpoint: endpoint.name,
        status: 'unhealthy',
        latency,
        message: errorMessage.includes('abort') ? 'Timeout' : errorMessage,
        fallbackAvailable: this.hasFallback(endpoint),
        lastChecked: new Date(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * A real, minimal chat request — the only check that proves chat works.
   * Uses the same client (auth header selection, message policy) as the REPL.
   */
  private async checkRouterChat(endpoint: EndpointConfig, startTime: number): Promise<HealthCheckResult> {
    const base = {
      endpoint: endpoint.name,
      fallbackAvailable: false,
      authenticated: true,
    };
    if (!endpoint.authToken || !endpoint.authToken.trim()) {
      return {
        ...base,
        status: 'unhealthy',
        latency: 0,
        message: 'No router credential configured (set aiRouterApiKey or run `onasis-repl login`) — chat cannot work',
        lastChecked: new Date(),
      };
    }
    try {
      const client = new AIRouterClient({
        baseUrl: endpoint.url,
        authToken: endpoint.authToken,
        timeoutMs: endpoint.timeout || 45000,
      });
      await client.chat({
        messages: [{ role: 'user', content: 'Health check: reply with OK.' }],
        use_case: 'repl-nlp',
        max_tokens: 5,
      });
      const latency = Date.now() - startTime;
      return {
        ...base,
        // repl-nlp is a local-first lane (15-60s is normal per the router docs).
        status: latency < 20000 ? 'healthy' : 'degraded',
        latency,
        message: `Chat OK (${latency}ms)`,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        ...base,
        status: 'unhealthy',
        latency: Date.now() - startTime,
        message: error instanceof Error ? error.message : String(error),
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Check all endpoints and return results
   */
  async checkAllEndpoints(showSpinner = false): Promise<HealthCheckResult[]> {
    if (showSpinner) {
      this.spinner = ora('Checking AI endpoints...').start();
    }

    const results: HealthCheckResult[] = [];

    for (const endpoint of this.endpoints) {
      const result = await this.checkEndpoint(endpoint);
      this.results.set(endpoint.name, result);
      results.push(result);

      if (showSpinner && this.spinner) {
        this.spinner.text = `Checking ${endpoint.name}... ${result.status}`;
      }
    }

    if (showSpinner && this.spinner) {
      const healthyCount = results.filter(r => r.status === 'healthy').length;
      this.spinner.succeed(`Health check complete: ${healthyCount}/${results.length} healthy`);
    }

    return results;
  }

  /**
   * Get the best available endpoint
   */
  getBestEndpoint(): EndpointConfig | null {
    for (const endpoint of this.endpoints) {
      const result = this.results.get(endpoint.name);
      if (result && (result.status === 'healthy' || result.status === 'degraded')) {
        return endpoint;
      }
    }
    return null;
  }

  /**
   * Check if fallback is available for an endpoint
   */
  private hasFallback(endpoint: EndpointConfig): boolean {
    const currentIndex = this.endpoints.findIndex(e => e.name === endpoint.name);
    return currentIndex < this.endpoints.length - 1;
  }

  /**
   * Format health results for display
   */
  formatResults(results: HealthCheckResult[]): string {
    const lines: string[] = [];
    lines.push(chalk.cyan('\n🔍 AI Endpoint Health Check\n'));
    lines.push(chalk.gray('─'.repeat(60)));

    for (const result of results) {
      const statusIcon = {
        healthy: chalk.green('●'),
        degraded: chalk.yellow('◐'),
        unhealthy: chalk.red('○'),
        unknown: chalk.gray('?'),
      }[result.status];

      const statusFormatter = {
        healthy: chalk.green,
        degraded: chalk.yellow,
        unhealthy: chalk.red,
        unknown: chalk.gray,
      }[result.status];

      lines.push(`\n${statusIcon} ${chalk.bold(result.endpoint)}`);
      lines.push(`  Status: ${statusFormatter(result.status)}`);
      lines.push(`  Latency: ${result.latency}ms`);
      lines.push(`  Message: ${chalk.gray(result.message)}`);
      
      if (result.fallbackAvailable && result.status !== 'healthy') {
        lines.push(`  ${chalk.yellow('⚠ Fallback available')}`);
      }
    }

    lines.push('\n' + chalk.gray('─'.repeat(60)));

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const degradedCount = results.filter(r => r.status === 'degraded').length;
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    const failedChat = results.find(r => r.authenticated && r.status === 'unhealthy');

    if (failedChat) {
      // Reachability checks passing does not mean chat works — say so plainly.
      lines.push(chalk.red(`\n✗ AI chat is NOT working: ${failedChat.message}`));
      lines.push(chalk.gray(`  (${healthyCount + degradedCount}/${results.length} checks passed; reachability checks do not prove chat works)\n`));
    } else if (unhealthyCount === 0 && degradedCount === 0) {
      lines.push(chalk.green(`\n✓ All endpoints healthy (${healthyCount}/${results.length})\n`));
    } else if (unhealthyCount === 0 && degradedCount > 0) {
      lines.push(chalk.yellow(`\n⚠ ${degradedCount} endpoint(s) degraded — system functional but slow\n`));
    } else if (healthyCount > 0) {
      lines.push(chalk.yellow(`\n⚠ ${healthyCount} healthy, ${unhealthyCount} unhealthy (fallback active)\n`));
    } else {
      lines.push(chalk.red(`\n✗ No healthy endpoints - using local fallback\n`));
    }

    return lines.join('\n');
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks(intervalMs = 60000): void {
    const loop = async () => {
      if (!this.checkInterval) return;
      await this.checkAllEndpoints();
      this.checkInterval = setTimeout(loop, intervalMs) as unknown as NodeJS.Timeout;
    };
    // Use a sentinel value so loop() knows it has been started
    this.checkInterval = setTimeout(loop, 0) as unknown as NodeJS.Timeout;
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearTimeout(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  /**
   * Get last check results
   */
  getLastResults(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }
}

/**
 * Quick health check for common endpoints
 */
export async function quickHealthCheck(config: {
  aiRouterUrl?: string;
  /** Credential the REPL uses for chat (aiRouterApiKey > aiRouterAuthToken > authToken). */
  aiRouterAuthToken?: string;
  openaiApiKey?: string;
  apiUrl?: string;
}): Promise<HealthCheckResult[]> {
  const endpoints: EndpointConfig[] = [];

  if (config.aiRouterUrl) {
    endpoints.push({
      name: ROUTER_REACHABILITY,
      url: config.aiRouterUrl,
      type: 'router',
      priority: 1,
      timeout: 3000,
    });
    endpoints.push({
      name: ROUTER_CHAT,
      url: config.aiRouterUrl,
      type: 'router-chat',
      priority: 2,
      timeout: 45000,
      authToken: config.aiRouterAuthToken,
    });
  }

  if (config.openaiApiKey) {
    endpoints.push({
      name: OPENAI_KEY_CHECK,
      url: 'https://api.openai.com',
      type: 'openai',
      priority: 3,
      timeout: 5000,
    });
  }

  // Memory API reachability (the local-mode fallback talks to it)
  endpoints.push({
    name: MEMORY_API_REACHABILITY,
    url: config.apiUrl || 'http://localhost:3000',
    type: 'local',
    priority: 99,
    timeout: 2000,
  });

  const healthCheck = new AIEndpointHealthCheck(endpoints, config.openaiApiKey);
  return healthCheck.checkAllEndpoints(true);
}

export default AIEndpointHealthCheck;
