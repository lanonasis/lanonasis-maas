/**
 * AI Endpoint Health Check Utility
 * 
 * Provides health monitoring for AI endpoints with automatic fallback detection.
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

export interface HealthCheckResult {
  endpoint: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency: number;
  message: string;
  fallbackAvailable: boolean;
  lastChecked: Date;
}

export interface EndpointConfig {
  name: string;
  url: string;
  type: 'router' | 'openai' | 'local';
  priority: number;
  timeout?: number;
}

export class AIEndpointHealthCheck {
  private endpoints: EndpointConfig[];
  private results: Map<string, HealthCheckResult> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private spinner?: Ora;

  constructor(endpoints: EndpointConfig[]) {
    this.endpoints = endpoints.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Check health of a single endpoint
   */
  async checkEndpoint(endpoint: EndpointConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timeout = endpoint.timeout || 5000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let response: Response | undefined;

      // For AI Router
      if (endpoint.type === 'router') {
        response = await fetch(`${endpoint.url}/health`, {
          method: 'GET',
          signal: controller.signal,
        }).catch(() => 
          // Fallback to main endpoint if health endpoint doesn't exist
          fetch(endpoint.url, {
            method: 'HEAD',
            signal: controller.signal,
          })
        );

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
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'dummy'}`,
          },
          signal: controller.signal,
        });

        const latency = Date.now() - startTime;

        // 401 is expected if key is invalid, but endpoint is healthy
        if (response.status === 401 || response.ok) {
          return {
            endpoint: endpoint.name,
            status: 'healthy',
            latency,
            message: response.ok ? 'API available' : 'API available (auth required)',
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
    const unhealthyCount = results.filter(r => r.status === 'unhealthy').length;
    
    if (unhealthyCount === 0) {
      lines.push(chalk.green(`\n✓ All endpoints healthy (${healthyCount}/${results.length})\n`));
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
    this.checkAllEndpoints();
    this.checkInterval = setInterval(() => {
      this.checkAllEndpoints();
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
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
  openaiApiKey?: string;
  apiUrl?: string;
}): Promise<HealthCheckResult[]> {
  const endpoints: EndpointConfig[] = [];

  if (config.aiRouterUrl) {
    endpoints.push({
      name: 'AI Router',
      url: config.aiRouterUrl,
      type: 'router',
      priority: 1,
      timeout: 3000,
    });
  }

  if (config.openaiApiKey) {
    endpoints.push({
      name: 'OpenAI API',
      url: 'https://api.openai.com',
      type: 'openai',
      priority: 2,
      timeout: 5000,
    });
  }

  // Always add local/fallback
  endpoints.push({
    name: 'Local Fallback',
    url: config.apiUrl || 'http://localhost:3000',
    type: 'local',
    priority: 99,
    timeout: 2000,
  });

  const healthCheck = new AIEndpointHealthCheck(endpoints);
  return healthCheck.checkAllEndpoints(true);
}

export default AIEndpointHealthCheck;
