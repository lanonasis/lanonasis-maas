import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPClient {
  private client?: Client;
  
  async connect(serverPath: string): Promise<Client> {
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
    
    await this.client.connect(transport);
    return this.client;
  }
  
  async callTool(name: string, args: any) {
    if (!this.client) throw new Error('MCP not connected');
    
    return await this.client.callTool({
      name,
      arguments: args
    });
  }
  
  isConnected(): boolean {
    return this.client !== undefined;
  }
  
  disconnect() {
    if (this.client) {
      this.client.close();
      this.client = undefined;
    }
  }
}
