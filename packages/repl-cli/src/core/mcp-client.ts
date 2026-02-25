import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client?: Client;
  private connectionTimeout = 10000; // 10 seconds
  
  async connect(serverPath: string): Promise<Client> {
    let timeoutHandle: NodeJS.Timeout | undefined;
    
    try {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath]
      });
      
      this.client = new Client({
        name: 'lanonasis-repl',
        version: '0.1.0'
      }, {
        capabilities: {}
      });
      
      // Add timeout to connection
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('MCP connection timeout')), this.connectionTimeout);
      });
      
      await Promise.race([
        this.client.connect(transport),
        timeoutPromise
      ]);
      
      return this.client;
    } catch (error) {
      this.client = undefined;
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error && error.message ? error.message : String(error)}`);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
  
  async callTool(name: string, args: { [x: string]: unknown } | undefined, timeout = 30000) {
    if (!this.client) throw new Error('MCP not connected');

    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      // Add timeout to tool calls
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Tool call timeout: ${name}`)), timeout);
      });

      return await Promise.race([
        this.client.callTool({
          name,
          arguments: args
        }),
        timeoutPromise
      ]);
    } catch (error) {
      throw new Error(`MCP tool call failed: ${error instanceof Error && error.message ? error.message : String(error)}`);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
  
  isConnected(): boolean {
    return this.client !== undefined;
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch (error) {
        console.error('Error closing MCP client:', error);
      } finally {
        this.client = undefined;
      }
    }
  }
}
