import {
  type MemoryClient,
  type MemoryEntry,
  type MemorySearchResult,
  type UpdateMemoryRequest,
  createMemoryClient
} from '@lanonasis/memory-client';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../config/types.js';

const VALID_MEMORY_TYPES = [
  'context',
  'project',
  'knowledge',
  'reference',
  'personal',
  'workflow'
] as const;

const VALID_MEMORY_STATUSES = [
  'active',
  'archived',
  'draft',
  'deleted'
] as const;

type MemoryType = (typeof VALID_MEMORY_TYPES)[number];
type MemoryStatus = (typeof VALID_MEMORY_STATUSES)[number];

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
    let memory_type: MemoryType = 'context';
    let tags: string[] = [];
    const filteredArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--type=')) {
        const candidate = arg.substring(7) as MemoryType;
        if ((VALID_MEMORY_TYPES as readonly string[]).includes(candidate)) {
          memory_type = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid memory type "${candidate}". Using default "context".\n` +
              `Valid types: ${VALID_MEMORY_TYPES.join(', ')}`
            )
          );
        }
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

    // Validate title and content are not empty/whitespace
    if (!title.trim()) {
      console.log(chalk.yellow('Error: Title cannot be empty'));
      return;
    }
    if (!content.trim()) {
      console.log(chalk.yellow('Error: Content cannot be empty'));
      return;
    }
    
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
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    }
  }

  async update(args: string[], context: CommandContext) {
    const id = args[0];
    if (!id) {
      console.log(chalk.yellow('Usage: update <id> [--title=...] [--content=...] [--type=<type>] [--status=<status>] [--tags=tag1,tag2]'));
      return;
    }

    const updates: UpdateMemoryRequest = {};
    const positionalContent: string[] = [];

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--title=')) {
        updates.title = arg.substring(8).trim();
      } else if (arg.startsWith('--content=')) {
        updates.content = arg.substring(10).trim();
      } else if (arg.startsWith('--type=')) {
        const candidate = arg.substring(7) as MemoryType;
        if ((VALID_MEMORY_TYPES as readonly string[]).includes(candidate)) {
          updates.memory_type = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid memory type "${candidate}". Ignoring.\n` +
              `Valid types: ${VALID_MEMORY_TYPES.join(', ')}`
            )
          );
        }
      } else if (arg.startsWith('--status=')) {
        const candidate = arg.substring(9) as MemoryStatus;
        if ((VALID_MEMORY_STATUSES as readonly string[]).includes(candidate)) {
          updates.status = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid status "${candidate}". Ignoring.\n` +
              `Valid statuses: ${VALID_MEMORY_STATUSES.join(', ')}`
            )
          );
        }
      } else if (arg.startsWith('--tags=')) {
        updates.tags = arg.substring(7).split(',').map(t => t.trim()).filter(Boolean);
      } else {
        positionalContent.push(arg);
      }
    }

    // Convenience path: treat trailing non-flag args as content.
    if (!updates.content && positionalContent.length > 0) {
      updates.content = positionalContent.join(' ');
    }

    if (Object.keys(updates).length === 0) {
      console.log(chalk.yellow('Nothing to update. Provide at least one update field.'));
      console.log(chalk.gray('Example: update <id> --content=New notes --type=project'));
      return;
    }

    const spinner = ora('Updating memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.updateMemory(id, updates);
      if (result.error) {
        spinner.fail(chalk.red(`Update failed: ${result.error}`));
        return;
      }
      if (result.data) {
        spinner.succeed(chalk.green(`Memory updated: ${result.data.id}`));
        context.lastResult = result.data;
      }
    } catch (error) {
      spinner.fail(chalk.red(`Update failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    }
  }
  
  async search(args: string[], context: CommandContext) {
    let memoryTypeFilter: MemoryType | undefined;
    const queryParts: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('--type=')) {
        const candidate = arg.substring(7) as MemoryType;
        if ((VALID_MEMORY_TYPES as readonly string[]).includes(candidate)) {
          memoryTypeFilter = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid memory type "${candidate}". Ignoring type filter.\n` +
              `Valid types: ${VALID_MEMORY_TYPES.join(', ')}`
            )
          );
        }
      } else {
        queryParts.push(arg);
      }
    }

    const query = queryParts.join(' ');
    if (!query) {
      console.log(chalk.yellow('Usage: search <query> [--type=<type>]'));
      return;
    }
    
    const spinner = ora('Searching...').start();
    try {
      const client = this.getClient(context);
      const result = await client.searchMemories({
        query,
        memory_types: memoryTypeFilter ? [memoryTypeFilter] : undefined,
        status: 'active',
        limit: 20,
        threshold: 0.7
      });

      if (result.error) {
        spinner.fail(chalk.red(`Search failed: ${result.error}`));
        return;
      }

      const results = (result.data?.results || []) as MemorySearchResult[];
      if (results.length === 0) {
        spinner.succeed(chalk.gray('No results found'));
      } else {
        spinner.succeed(chalk.green(`Found ${results.length} result(s)`));
        results.forEach((r: MemorySearchResult, i: number) => {
          console.log(chalk.cyan(`[${i + 1}] ${r.title}`));
          console.log(chalk.gray(`    ${r.content.substring(0, 80)}...`));
        });
      }
      context.lastResult = results;
    } catch (error) {
      spinner.fail(chalk.red(`Search failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    }
  }
  
  async list(args: string[], context: CommandContext) {
    const limit = parseInt(args[0] || '10', 10);
    
    const spinner = ora('Fetching memories...').start();
    try {
      const client = this.getClient(context);
      const result = await client.listMemories({ limit });

      if (result.error) {
        spinner.fail(chalk.red(`List failed: ${result.error}`));
        return;
      }

      const items = (result.data?.data || []) as MemoryEntry[];
      if (items.length > 0) {
        spinner.succeed(chalk.green(`Showing ${items.length} memories`));
        items.forEach((r: MemoryEntry, i: number) => {
          console.log(chalk.cyan(`[${i + 1}] ${r.title} (${r.id})`));
        });
        context.lastResult = items;
      } else {
        spinner.succeed(chalk.gray('No memories found'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`List failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
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

      if (result.error) {
        spinner.fail(chalk.red(`Get failed: ${result.error}`));
        return;
      }

      if (result.data) {
        spinner.succeed(chalk.green(`Memory found`));
        console.log(chalk.cyan(`Title: ${result.data.title}`));
        console.log(chalk.gray(`ID: ${result.data.id}`));
        console.log(chalk.white(`\n${result.data.content}`));
        context.lastResult = result.data;
      } else {
        spinner.fail(chalk.yellow(`Memory not found: ${id}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Get failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
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
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    }
  }
}
