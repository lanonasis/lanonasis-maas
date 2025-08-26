/**
 * CLI Integration Module for Memory Client SDK
 * 
 * Provides intelligent CLI detection and MCP channel utilization
 * when @lanonasis/cli v1.5.2+ is available in the environment
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import type { ApiResponse } from './client';

const execAsync = promisify(exec);

export interface CLIInfo {
  available: boolean;
  version?: string;
  mcpAvailable?: boolean;
  authenticated?: boolean;
}

export interface CLIExecutionOptions {
  timeout?: number;
  verbose?: boolean;
  outputFormat?: 'json' | 'table' | 'yaml';
}

export interface CLICommand {
  command: string;
  args: string[];
  options?: CLIExecutionOptions;
}

export interface MCPChannel {
  available: boolean;
  version?: string;
  capabilities?: string[];
}

export interface CLICapabilities {
  cliAvailable: boolean;
  mcpSupport: boolean;
  authenticated: boolean;
  goldenContract: boolean;
  version?: string;
}

export type RoutingStrategy = 'cli-first' | 'api-first' | 'cli-only' | 'api-only' | 'auto';

/**
 * CLI Detection and Integration Service
 */
export class CLIIntegration {
  private cliInfo: CLIInfo | null = null;
  private detectionPromise: Promise<CLIInfo> | null = null;

  /**
   * Detect if CLI is available and get its capabilities
   */
  async detectCLI(): Promise<CLIInfo> {
    // Return cached result if already detected
    if (this.cliInfo) {
      return this.cliInfo;
    }

    // Return existing promise if detection is in progress
    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    // Start new detection
    this.detectionPromise = this.performDetection();
    this.cliInfo = await this.detectionPromise;
    return this.cliInfo;
  }

  private async performDetection(): Promise<CLIInfo> {
    try {
      // Check if onasis/lanonasis CLI is available
      let versionOutput = '';
      try {
        const { stdout } = await execAsync('onasis --version 2>/dev/null', { timeout: 5000 });
        versionOutput = stdout;
      } catch {
        // Try lanonasis if onasis fails
        const { stdout } = await execAsync('lanonasis --version 2>/dev/null', { timeout: 5000 });
        versionOutput = stdout;
      }

      const version = versionOutput.trim();
      
      // Verify it's v1.5.2 or higher for Golden Contract support
      const versionMatch = version.match(/(\d+)\.(\d+)\.(\d+)/);
      if (!versionMatch) {
        return { available: false };
      }

      const [, major, minor, patch] = versionMatch.map(Number);
      const isCompatible = major > 1 || (major === 1 && minor > 5) || (major === 1 && minor === 5 && patch >= 2);

      if (!isCompatible) {
        return { 
          available: true, 
          version,
          mcpAvailable: false,
          authenticated: false
        };
      }

      // Check MCP availability
      let mcpAvailable = false;
      try {
        await execAsync('onasis mcp status --output json 2>/dev/null || lanonasis mcp status --output json 2>/dev/null', {
          timeout: 3000
        });
        mcpAvailable = true;
      } catch {
        // MCP not available or not configured
      }

      // Check authentication status
      let authenticated = false;
      try {
        const { stdout: authOutput } = await execAsync('onasis auth status --output json 2>/dev/null || lanonasis auth status --output json 2>/dev/null', {
          timeout: 3000
        });
        
        const authStatus = JSON.parse(authOutput);
        authenticated = authStatus.authenticated === true;
      } catch {
        // Authentication check failed
      }

      return {
        available: true,
        version,
        mcpAvailable,
        authenticated
      };

    } catch {
      return { available: false };
    }
  }

  /**
   * Execute CLI command and return parsed JSON result
   */
  async executeCLICommand<T = any>(command: string, options: CLIExecutionOptions = {}): Promise<ApiResponse<T>> {
    const cliInfo = await this.detectCLI();
    
    if (!cliInfo.available) {
      return { error: 'CLI not available' };
    }

    if (!cliInfo.authenticated) {
      return { error: 'CLI not authenticated. Run: onasis login' };
    }

    try {
      const timeout = options.timeout || 30000;
      const outputFormat = options.outputFormat || 'json';
      const verbose = options.verbose ? '--verbose' : '';
      
      // Determine which CLI command to use (prefer onasis for Golden Contract)
      const cliCmd = await this.getPreferredCLICommand();
      
      const fullCommand = `${cliCmd} ${command} --output ${outputFormat} ${verbose}`.trim();
      
      const { stdout, stderr } = await execAsync(fullCommand, {
        timeout,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      if (stderr && stderr.trim()) {
        console.warn('CLI warning:', stderr);
      }

      if (outputFormat === 'json') {
        try {
          const result = JSON.parse(stdout);
          return { data: result };
        } catch (parseError) {
          return { error: `Failed to parse CLI JSON output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}` };
        }
      }

      return { data: stdout as T };

    } catch (error) {
      if (error instanceof Error && error.message.includes('timeout')) {
        return { error: 'CLI command timeout' };
      }
      
      return { 
        error: error instanceof Error ? error.message : 'CLI command failed' 
      };
    }
  }

  /**
   * Get preferred CLI command (onasis for Golden Contract, fallback to lanonasis)
   */
  private async getPreferredCLICommand(): Promise<string> {
    try {
      execSync('which onasis', { stdio: 'ignore', timeout: 1000 });
      return 'onasis';
    } catch {
      return 'lanonasis';
    }
  }

  /**
   * Memory operations via CLI
   */
  async createMemoryViaCLI(title: string, content: string, options: {
    memoryType?: string;
    tags?: string[];
    topicId?: string;
  } = {}): Promise<ApiResponse<any>> {
    const { memoryType = 'context', tags = [], topicId } = options;
    
    let command = `memory create --title "${title}" --content "${content}" --memory-type ${memoryType}`;
    
    if (tags.length > 0) {
      command += ` --tags "${tags.join(',')}"`;
    }
    
    if (topicId) {
      command += ` --topic-id "${topicId}"`;
    }

    return this.executeCLICommand(command);
  }

  async listMemoriesViaCLI(options: {
    limit?: number;
    memoryType?: string;
    tags?: string[];
    sortBy?: string;
  } = {}): Promise<ApiResponse<any>> {
    let command = 'memory list';
    
    if (options.limit) {
      command += ` --limit ${options.limit}`;
    }
    
    if (options.memoryType) {
      command += ` --memory-type ${options.memoryType}`;
    }
    
    if (options.tags && options.tags.length > 0) {
      command += ` --tags "${options.tags.join(',')}"`;
    }
    
    if (options.sortBy) {
      command += ` --sort-by ${options.sortBy}`;
    }

    return this.executeCLICommand(command);
  }

  async searchMemoriesViaCLI(query: string, options: {
    limit?: number;
    memoryTypes?: string[];
  } = {}): Promise<ApiResponse<any>> {
    let command = `memory search "${query}"`;
    
    if (options.limit) {
      command += ` --limit ${options.limit}`;
    }
    
    if (options.memoryTypes && options.memoryTypes.length > 0) {
      command += ` --memory-types "${options.memoryTypes.join(',')}"`;
    }

    return this.executeCLICommand(command);
  }

  /**
   * Health check via CLI
   */
  async healthCheckViaCLI(): Promise<ApiResponse<any>> {
    return this.executeCLICommand('health');
  }

  /**
   * MCP-specific operations
   */
  async getMCPStatus(): Promise<ApiResponse<any>> {
    const cliInfo = await this.detectCLI();
    
    if (!cliInfo.mcpAvailable) {
      return { error: 'MCP not available via CLI' };
    }

    return this.executeCLICommand('mcp status');
  }

  async listMCPTools(): Promise<ApiResponse<any>> {
    const cliInfo = await this.detectCLI();
    
    if (!cliInfo.mcpAvailable) {
      return { error: 'MCP not available via CLI' };
    }

    return this.executeCLICommand('mcp tools');
  }

  /**
   * Authentication operations
   */
  async getAuthStatus(): Promise<ApiResponse<any>> {
    return this.executeCLICommand('auth status');
  }

  /**
   * Check if specific CLI features are available
   */
  async getCapabilities(): Promise<{
    cliAvailable: boolean;
    version?: string;
    mcpSupport: boolean;
    authenticated: boolean;
    goldenContract: boolean;
  }> {
    const cliInfo = await this.detectCLI();
    
    return {
      cliAvailable: cliInfo.available,
      version: cliInfo.version,
      mcpSupport: cliInfo.mcpAvailable || false,
      authenticated: cliInfo.authenticated || false,
      goldenContract: cliInfo.available && this.isGoldenContractCompliant(cliInfo.version)
    };
  }

  private isGoldenContractCompliant(version?: string): boolean {
    if (!version) return false;
    
    const versionMatch = version.match(/(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) return false;

    const [, major, minor, patch] = versionMatch.map(Number);
    return major > 1 || (major === 1 && minor > 5) || (major === 1 && minor === 5 && patch >= 2);
  }

  /**
   * Force refresh CLI detection
   */
  async refresh(): Promise<CLIInfo> {
    this.cliInfo = null;
    this.detectionPromise = null;
    return this.detectCLI();
  }

  /**
   * Get cached CLI info without re-detection
   */
  getCachedInfo(): CLIInfo | null {
    return this.cliInfo;
  }
}

// Singleton instance for convenient access
export const cliIntegration = new CLIIntegration();