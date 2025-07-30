import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { table } from 'table';
import wrap from 'word-wrap';
import { format } from 'date-fns';

import { apiClient, MemoryType, MemoryEntry, CreateMemoryRequest, UpdateMemoryRequest } from '../utils/api.js';
import { formatBytes, truncateText } from '../utils/formatting.js';

// Type definitions for command options
interface CreateMemoryOptions {
  title?: string;
  content?: string;
  type?: MemoryType;
  tags?: string;
  topicId?: string;
  interactive?: boolean;
}

interface CreateMemoryAnswers {
  title: string;
  content: string;
  type: MemoryType;
  tags: string;
}

interface ListMemoryOptions {
  page?: string;
  limit?: string;
  type?: MemoryType;
  tags?: string;
  userId?: string;
  sort?: string;
  order?: string;
}

interface SearchMemoryOptions {
  limit?: string;
  threshold?: string;
  type?: string;
  tags?: string;
}

interface UpdateMemoryOptions {
  title?: string;
  content?: string;
  type?: MemoryType;
  tags?: string;
  interactive?: boolean;
}

interface UpdateMemoryAnswers {
  title: string;
  content: string;
  type: MemoryType;
  tags: string;
}

interface DeleteMemoryOptions {
  force?: boolean;
}

interface DeleteConfirmAnswer {
  confirm: boolean;
}

interface SearchParams {
  limit: number;
  threshold: number;
  memory_types?: MemoryType[];
  tags?: string[];
}

interface GetMemoriesParams {
  page: number;
  limit: number;
  sort: string;
  order: string;
  memory_type?: MemoryType;
  tags?: string;
  user_id?: string;
}

export function memoryCommands(program: Command): void {
  // Create memory
  program
    .command('create')
    .alias('add')
    .description('Create a new memory entry')
    .option('-t, --title <title>', 'memory title')
    .option('-c, --content <content>', 'memory content')
    .option('--type <type>', 'memory type (conversation, knowledge, project, context, reference)', 'context')
    .option('--tags <tags>', 'comma-separated tags')
    .option('--topic-id <id>', 'topic ID')
    .option('-i, --interactive', 'interactive mode')
    .action(async (options: CreateMemoryOptions) => {
      try {
        let { title, content, type, tags, topicId, interactive } = options;

        if (interactive || (!title || !content)) {
          const answers = await inquirer.prompt<CreateMemoryAnswers>([
            {
              type: 'input',
              name: 'title',
              message: 'Memory title:',
              default: title,
              validate: (input: string) => input.length > 0 || 'Title is required'
            },
            {
              type: 'editor',
              name: 'content',
              message: 'Memory content:',
              default: content,
              validate: (input: string) => input.length > 0 || 'Content is required'
            },
            {
              type: 'list',
              name: 'type',
              message: 'Memory type:',
              choices: ['conversation', 'knowledge', 'project', 'context', 'reference'],
              default: type || 'context'
            },
            {
              type: 'input',
              name: 'tags',
              message: 'Tags (comma-separated):',
              default: tags || ''
            }
          ]);

          title = answers.title;
          content = answers.content;
          type = answers.type;
          tags = answers.tags;
        }

        const spinner = ora('Creating memory...').start();

        const memoryData: CreateMemoryRequest = {
          title,
          content,
          memory_type: type as MemoryType
        };

        if (tags) {
          memoryData.tags = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }

        if (topicId) {
          memoryData.topic_id = topicId;
        }

        const memory = await apiClient.createMemory(memoryData);
        spinner.succeed('Memory created successfully');

        console.log();
        console.log(chalk.green('✓ Memory created:'));
        console.log(`  ID: ${chalk.cyan(memory.id)}`);
        console.log(`  Title: ${memory.title}`);
        console.log(`  Type: ${memory.memory_type}`);
        if (memory.tags && memory.tags.length > 0) {
          console.log(`  Tags: ${memory.tags.join(', ')}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to create memory:'), errorMessage);
        process.exit(1);
      }
    });

  // List memories
  program
    .command('list')
    .alias('ls')
    .description('List memory entries')
    .option('-p, --page <page>', 'page number', '1')
    .option('-l, --limit <limit>', 'number of entries per page', '20')
    .option('--type <type>', 'filter by memory type')
    .option('--tags <tags>', 'filter by tags (comma-separated)')
    .option('--user-id <id>', 'filter by user ID (admin only)')
    .option('--sort <field>', 'sort by field (created_at, updated_at, title, last_accessed)', 'created_at')
    .option('--order <order>', 'sort order (asc, desc)', 'desc')
    .action(async (options: ListMemoryOptions) => {
      try {
        const spinner = ora('Fetching memories...').start();

        const params: GetMemoriesParams = {
          page: parseInt(options.page || '1'),
          limit: parseInt(options.limit || '20'),
          sort: options.sort || 'created_at',
          order: options.order || 'desc'
        };

        if (options.type) params.memory_type = options.type;
        if (options.tags) params.tags = options.tags;
        if (options.userId) params.user_id = options.userId;

        const result = await apiClient.getMemories(params);
        spinner.stop();

        if (result.memories.length === 0) {
          console.log(chalk.yellow('No memories found'));
          return;
        }

        console.log(chalk.blue.bold(`\n📚 Memories (${result.pagination.total} total)`));
        console.log(chalk.gray(`Page ${result.pagination.page} of ${result.pagination.pages}`));
        console.log();

        const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'table';
        
        if (outputFormat === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          // Table format
          const tableData = result.memories.map((memory: MemoryEntry) => [
            truncateText(memory.title, 30),
            memory.memory_type,
            memory.tags.slice(0, 3).join(', '),
            format(new Date(memory.created_at), 'MMM dd, yyyy'),
            memory.access_count
          ]);

          const tableConfig = {
            header: ['Title', 'Type', 'Tags', 'Created', 'Access'],
            columnDefault: {
              width: 20,
              wrapWord: true
            },
            columns: [
              { width: 30 },
              { width: 12 },
              { width: 20 },
              { width: 12 },
              { width: 8 }
            ]
          };

          console.log(table([tableConfig.header, ...tableData], tableConfig));

          // Pagination info
          if (result.pagination.pages > 1) {
            console.log(chalk.gray(`\nUse --page ${result.pagination.page + 1} for next page`));
          }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to list memories:'), errorMessage);
        process.exit(1);
      }
    });

  // Search memories
  program
    .command('search')
    .description('Search memories using semantic search')
    .argument('<query>', 'search query')
    .option('-l, --limit <limit>', 'number of results', '20')
    .option('--threshold <threshold>', 'similarity threshold (0-1)', '0.7')
    .option('--type <types>', 'filter by memory types (comma-separated)')
    .option('--tags <tags>', 'filter by tags (comma-separated)')
    .action(async (query: string, options: SearchMemoryOptions) => {
      try {
        const spinner = ora(`Searching for "${query}"...`).start();

        const searchOptions: SearchParams = {
          limit: parseInt(options.limit || '20'),
          threshold: parseFloat(options.threshold || '0.7')
        };

        if (options.type) {
          searchOptions.memory_types = options.type.split(',').map((t: string) => t.trim());
        }

        if (options.tags) {
          searchOptions.tags = options.tags.split(',').map((t: string) => t.trim());
        }

        const result = await apiClient.searchMemories(query, searchOptions);
        spinner.stop();

        if (result.results.length === 0) {
          console.log(chalk.yellow('No memories found matching your search'));
          return;
        }

        console.log(chalk.blue.bold(`\n🔍 Search Results (${result.total_results} found)`));
        console.log(chalk.gray(`Query: "${query}" | Search time: ${result.search_time_ms}ms`));
        console.log();

        result.results.forEach((memory: MemoryEntry & { relevance_score: number }, index: number) => {
          const score = (memory.relevance_score * 100).toFixed(1);
          console.log(chalk.green(`${index + 1}. ${memory.title}`) + chalk.gray(` (${score}% match)`));
          console.log(chalk.white(`   ${truncateText(memory.content, 100)}`));
          console.log(chalk.cyan(`   ID: ${memory.id}`) + chalk.gray(` | Type: ${memory.memory_type}`));
          if (memory.tags.length > 0) {
            console.log(chalk.yellow(`   Tags: ${memory.tags.join(', ')}`));
          }
          console.log();
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Search failed:'), errorMessage);
        process.exit(1);
      }
    });

  // Get memory details
  program
    .command('get')
    .alias('show')
    .description('Get detailed information about a memory')
    .argument('<id>', 'memory ID')
    .action(async (id: string) => {
      try {
        const spinner = ora('Fetching memory...').start();
        const memory = await apiClient.getMemory(id);
        spinner.stop();

        console.log(chalk.blue.bold('\n📄 Memory Details'));
        console.log();
        console.log(chalk.green('Title:'), memory.title);
        console.log(chalk.green('ID:'), chalk.cyan(memory.id));
        console.log(chalk.green('Type:'), memory.memory_type);
        console.log(chalk.green('Created:'), format(new Date(memory.created_at), 'PPpp'));
        console.log(chalk.green('Updated:'), format(new Date(memory.updated_at), 'PPpp'));
        
        if (memory.last_accessed) {
          console.log(chalk.green('Last Accessed:'), format(new Date(memory.last_accessed), 'PPpp'));
        }
        
        console.log(chalk.green('Access Count:'), memory.access_count);
        
        if (memory.tags && memory.tags.length > 0) {
          console.log(chalk.green('Tags:'), memory.tags.join(', '));
        }
        
        if (memory.topic_id) {
          console.log(chalk.green('Topic ID:'), memory.topic_id);
        }

        console.log();
        console.log(chalk.green('Content:'));
        console.log(wrap(memory.content, { width: 80, indent: '  ' }));

        if (memory.metadata && Object.keys(memory.metadata).length > 0) {
          console.log();
          console.log(chalk.green('Metadata:'));
          console.log(JSON.stringify(memory.metadata, null, 2));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to get memory:'), errorMessage);
        process.exit(1);
      }
    });

  // Update memory
  program
    .command('update')
    .description('Update a memory entry')
    .argument('<id>', 'memory ID')
    .option('-t, --title <title>', 'new title')
    .option('-c, --content <content>', 'new content')
    .option('--type <type>', 'new memory type')
    .option('--tags <tags>', 'new tags (comma-separated)')
    .option('-i, --interactive', 'interactive mode')
    .action(async (id: string, options: UpdateMemoryOptions) => {
      try {
        let updateData: UpdateMemoryRequest = {};

        if (options.interactive) {
          // First, get current memory data
          const spinner = ora('Fetching current memory...').start();
          const currentMemory = await apiClient.getMemory(id);
          spinner.stop();

          const answers = await inquirer.prompt<UpdateMemoryAnswers>([
            {
              type: 'input',
              name: 'title',
              message: 'Title:',
              default: currentMemory.title
            },
            {
              type: 'editor',
              name: 'content',
              message: 'Content:',
              default: currentMemory.content
            },
            {
              type: 'list',
              name: 'type',
              message: 'Memory type:',
              choices: ['conversation', 'knowledge', 'project', 'context', 'reference'],
              default: currentMemory.memory_type
            },
            {
              type: 'input',
              name: 'tags',
              message: 'Tags (comma-separated):',
              default: currentMemory.tags.join(', ')
            }
          ]);

          updateData = {
            title: answers.title,
            content: answers.content,
            memory_type: answers.type,
            tags: answers.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          };
        } else {
          if (options.title) updateData.title = options.title;
          if (options.content) updateData.content = options.content;
          if (options.type) updateData.memory_type = options.type;
          if (options.tags) {
            updateData.tags = options.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
          }
        }

        if (Object.keys(updateData).length === 0) {
          console.log(chalk.yellow('No updates specified'));
          return;
        }

        const spinner = ora('Updating memory...').start();
        const memory = await apiClient.updateMemory(id, updateData);
        spinner.succeed('Memory updated successfully');

        console.log();
        console.log(chalk.green('✓ Memory updated:'));
        console.log(`  ID: ${chalk.cyan(memory.id)}`);
        console.log(`  Title: ${memory.title}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to update memory:'), errorMessage);
        process.exit(1);
      }
    });

  // Delete memory
  program
    .command('delete')
    .alias('rm')
    .description('Delete a memory entry')
    .argument('<id>', 'memory ID')
    .option('-f, --force', 'skip confirmation')
    .action(async (id: string, options: DeleteMemoryOptions) => {
      try {
        if (!options.force) {
          const memory = await apiClient.getMemory(id);
          const answer = await inquirer.prompt<DeleteConfirmAnswer>([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to delete "${memory.title}"?`,
              default: false
            }
          ]);

          if (!answer.confirm) {
            console.log(chalk.yellow('Deletion cancelled'));
            return;
          }
        }

        const spinner = ora('Deleting memory...').start();
        await apiClient.deleteMemory(id);
        spinner.succeed('Memory deleted successfully');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to delete memory:'), errorMessage);
        process.exit(1);
      }
    });

  // Memory statistics
  program
    .command('stats')
    .description('Show memory statistics (admin only)')
    .action(async () => {
      try {
        const spinner = ora('Fetching statistics...').start();
        const stats = await apiClient.getMemoryStats();
        spinner.stop();

        console.log(chalk.blue.bold('\n📊 Memory Statistics'));
        console.log();
        console.log(chalk.green('Total Memories:'), stats.total_memories.toLocaleString());
        console.log(chalk.green('Total Size:'), formatBytes(stats.total_size_bytes));
        console.log(chalk.green('Average Access Count:'), stats.avg_access_count);
        
        console.log();
        console.log(chalk.yellow('Memories by Type:'));
        Object.entries(stats.memories_by_type).forEach(([type, count]: [string, number]) => {
          console.log(`  ${type}: ${count}`);
        });

        if (stats.most_accessed_memory) {
          console.log();
          console.log(chalk.yellow('Most Accessed Memory:'));
          console.log(`  ${stats.most_accessed_memory.title} (${stats.most_accessed_memory.access_count} times)`);
        }

        if (stats.recent_memories.length > 0) {
          console.log();
          console.log(chalk.yellow('Recent Memories:'));
          stats.recent_memories.forEach((memory: MemoryEntry, index: number) => {
            console.log(`  ${index + 1}. ${truncateText(memory.title, 50)}`);
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to get statistics:'), errorMessage);
        process.exit(1);
      }
    });
}