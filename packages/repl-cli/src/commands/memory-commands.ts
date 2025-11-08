import { MemoryClient, createMemoryClient } from '@lanonasis/memory-client';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../config/types.js';

export class MemoryCommands {
  private client: MemoryClient | null = null;
  
  private getClient(context: CommandContext): MemoryClient {
    if (!this.client) {
      this.client = createMemoryClient({
        apiUrl: context.config.apiUrl,
        authToken: context.config.authToken,
        timeout: 30000
      });
    }
    return this.client;
  }
  
  async create(args: string[], context: CommandContext) {
    if (args.length < 2) {
      console.log(chalk.yellow('Usage: create <title> <content> [--type=<type>] [--tags=tag1,tag2]'));
      return;
    }
    
    // Parse arguments for type and tags
    let memory_type = 'context';
    let tags: string[] = [];
    const filteredArgs: string[] = [];
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--type=')) {
        memory_type = arg.substring(7);
      } else if (arg.startsWith('--tags=')) {
        tags = arg.substring(7).split(',').map(t => t.trim()).filter(Boolean);
      } else {
        filteredArgs.push(arg);
      }
    }
    
    if (filteredArgs.length < 2) {
      console.log(chalk.yellow('Error: Title and content are required'));
      return;
    }
    
    const [title, ...contentParts] = filteredArgs;
    const content = contentParts.join(' ');
    
    const spinner = ora('Creating memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.createMemory({ 
        title, 
        content,
        memory_type,
        tags
      });
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      if (result.data) {
        spinner.succeed(chalk.green(`Memory created: ${result.data.id}`));
        context.lastResult = result.data;
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  
  async search(args: string[], context: CommandContext) {
    const query = args.join(' ');
    if (!query) {
      console.log(chalk.yellow('Usage: search <query>'));
      return;
    }
    
    const spinner = ora('Searching...').start();
    try {
      const client = this.getClient(context);
      const result = await client.searchMemories({ 
        query,
        status: 'active',
        limit: 20,
        threshold: 0.7
      });
      spinner.stop();
      
      if (result.error) {
        console.log(chalk.red(`Error: ${result.error}`));
        return;
      }
      
      const results = result.data?.results || [];
      if (results.length === 0) {
        console.log(chalk.gray('No results found'));
      } else {
        results.forEach((r, i) => {
          console.log(chalk.cyan(`[${i+1}] ${r.title}`));
          console.log(chalk.gray(`    ${r.content.substring(0, 80)}...`));
        });
      }
      context.lastResult = results;
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  
  async list(args: string[], context: CommandContext) {
    const limit = parseInt(args[0] || '10', 10);
    
    const spinner = ora('Fetching memories...').start();
    try {
      const client = this.getClient(context);
      const result = await client.listMemories({ limit });
      spinner.stop();
      
      if (result.error) {
        console.log(chalk.red(`Error: ${result.error}`));
        return;
      }
      
      if (result.data && result.data.data && result.data.data.length > 0) {
        result.data.data.forEach((r, i) => {
          console.log(chalk.cyan(`[${i+1}] ${r.title} (${r.id})`));
        });
        context.lastResult = result.data.data;
      } else {
        console.log(chalk.gray('No memories found'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  
  async get(args: string[], context: CommandContext) {
    const id = args[0];
    if (!id) {
      console.log(chalk.yellow('Usage: get <id>'));
      return;
    }
    
    const spinner = ora('Fetching memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.getMemory(id);
      spinner.stop();
      
      if (result.error) {
        console.log(chalk.red(`Error: ${result.error}`));
        return;
      }
      
      if (result.data) {
        console.log(chalk.cyan(`Title: ${result.data.title}`));
        console.log(chalk.gray(`ID: ${result.data.id}`));
        console.log(chalk.white(`\n${result.data.content}`));
        context.lastResult = result.data;
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  
  async delete(args: string[], context: CommandContext) {
    const id = args[0];
    if (!id) {
      console.log(chalk.yellow('Usage: delete <id>'));
      return;
    }
    
    const spinner = ora('Deleting memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.deleteMemory(id);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      spinner.succeed(chalk.green('Memory deleted'));
      context.lastResult = { deleted: id };
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}
