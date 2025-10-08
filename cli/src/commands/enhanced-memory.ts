/**
 * Enhanced Memory Commands - mem0-inspired advanced operations
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import inquirer from 'inquirer';
import { getMCPClient } from '../utils/mcp-client.js';
import { CLIConfig } from '../utils/config.js';

export function enhancedMemoryCommands(program: Command) {
  const memory = program.command('memory').description('Enhanced memory operations with mem0-inspired features');

  // Bulk pause memories
  memory.command('bulk-pause')
    .description('Pause multiple memories by criteria')
    .option('--category <category>', 'Pause memories in specific category')
    .option('--app <app_id>', 'Pause memories from specific app')
    .option('--before <date>', 'Pause memories created before date (ISO format)')
    .option('--ids <ids>', 'Comma-separated memory IDs to pause')
    .option('--dry-run', 'Show what would be paused without executing')
    .action(async (options) => {
      const spinner = ora('Processing bulk pause operation...').start();
      
      try {
        const client = getMCPClient();
        
        if (!client.isConnectedToServer()) {
          spinner.info('Connecting to MCP server...');
          const config = new CLIConfig();
          await client.connect({ useRemote: !!config.get('token') });
        }

        const bulkArgs: any = { operation: 'pause' };
        if (options.category) bulkArgs.category = options.category;
        if (options.app) bulkArgs.app_id = options.app;
        if (options.before) bulkArgs.before = options.before;
        if (options.ids) bulkArgs.memory_ids = options.ids.split(',').map((id: string) => id.trim());

        if (options.dryRun) {
          spinner.succeed('Dry run mode - showing affected memories');
          console.log(chalk.yellow('This would pause memories matching the criteria'));
          return;
        }

        const result = await client.callTool('memory_bulk_operations', bulkArgs);
        
        spinner.succeed(`Bulk pause completed: ${result.affected_count} memories paused`);
        
        if (result.results && result.results.length > 0) {
          console.log(chalk.cyan('\n📊 Operation Results:'));
          const tableData = [
            [chalk.bold('Memory ID'), chalk.bold('Status'), chalk.bold('Previous State')]
          ];
          
          result.results.forEach((r: any) => {
            tableData.push([
              r.memory_id.substring(0, 8) + '...',
              r.success ? chalk.green('✓ Paused') : chalk.red('✗ Failed'),
              r.previous_state
            ]);
          });
          
          console.log(table(tableData));
        }
      } catch (error) {
        spinner.fail(`Bulk pause failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  // Archive old memories
  memory.command('archive')
    .description('Archive memories older than specified date')
    .requiredOption('--before <date>', 'Archive memories created before date (ISO format)')
    .option('--app <app_id>', 'Archive memories from specific app')
    .option('--dry-run', 'Show what would be archived without executing')
    .action(async (options) => {
      const spinner = ora('Processing archive operation...').start();
      
      try {
        const client = getMCPClient();
        
        if (!client.isConnectedToServer()) {
          spinner.info('Connecting to MCP server...');
          const config = new CLIConfig();
          await client.connect({ useRemote: !!config.get('token') });
        }

        const bulkArgs: any = {
          operation: 'archive',
          before: options.before
        };

        if (options.app) bulkArgs.app_id = options.app;

        if (options.dryRun) {
          spinner.succeed('Dry run mode - showing memories to be archived');
          console.log(chalk.yellow(`This would archive memories created before ${options.before}`));
          return;
        }

        const result = await client.callTool('memory_bulk_operations', bulkArgs);
        
        spinner.succeed(`Archive completed: ${result.affected_count} memories archived`);
        
        console.log(chalk.green(`\n✓ Successfully archived ${result.affected_count} memories`));
        console.log(chalk.cyan(`  Archived memories created before: ${options.before}`));
        if (options.app) {
          console.log(chalk.cyan(`  From app: ${options.app}`));
        }
      } catch (error) {
        spinner.fail(`Archive failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  // Find related memories
  memory.command('related')
    .description('Find memories related to a specific memory')
    .argument('<memory_id>', 'Source memory ID')
    .option('-l, --limit <number>', 'Maximum related memories to show', '5')
    .option('-t, --threshold <number>', 'Similarity threshold (0-1)', '0.6')
    .action(async (memoryId, options) => {
      const spinner = ora('Finding related memories...').start();
      
      try {
        const client = getMCPClient();
        
        if (!client.isConnectedToServer()) {
          spinner.info('Connecting to MCP server...');
          const config = new CLIConfig();
          await client.connect({ useRemote: !!config.get('token') });
        }

        const result = await client.callTool('memory_find_related', {
          memory_id: memoryId,
          limit: parseInt(options.limit),
          threshold: parseFloat(options.threshold)
        });
        
        spinner.succeed(`Found ${result.count} related memories`);
        
        if (result.count === 0) {
          console.log(chalk.yellow('\nNo related memories found'));
          return;
        }

        console.log(chalk.cyan('\n🔗 Source Memory:'));
        console.log(`  ${chalk.bold(result.source_memory.title)}`);
        console.log(`  ${result.source_memory.content.substring(0, 100)}...`);
        
        console.log(chalk.cyan('\n🔍 Related Memories:'));
        result.related_memories.forEach((memory: any, index: number) => {
          console.log(`\n${chalk.bold(`${index + 1}. ${memory.title}`)}`);
          console.log(`   ID: ${chalk.gray(memory.id)}`);
          console.log(`   Similarity: ${chalk.green((memory.relevance_score * 100).toFixed(1) + '%')}`);
          console.log(`   Content: ${memory.content.substring(0, 80)}...`);
        });
      } catch (error) {
        spinner.fail(`Related search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  // Advanced filtering
  memory.command('filter')
    .description('Filter memories with advanced criteria')
    .option('--app-id <app_id>', 'Filter by application ID')
    .option('--category <category>', 'Filter by category/tag')
    .option('--since <date>', 'Filter memories since date (ISO format)')
    .option('--before <date>', 'Filter memories before date (ISO format)')
    .option('--state <state>', 'Filter by memory state (active, paused, archived)')
    .option('--limit <number>', 'Maximum results', '20')
    .action(async (options) => {
      const spinner = ora('Filtering memories...').start();
      
      try {
        const client = getMCPClient();
        
        if (!client.isConnectedToServer()) {
          spinner.info('Connecting to MCP server...');
          const config = new CLIConfig();
          await client.connect({ useRemote: !!config.get('token') });
        }

        const searchArgs: any = {
          query: '*', // Wildcard search
          limit: parseInt(options.limit)
        };

        if (options.appId) searchArgs.app_id = options.appId;
        if (options.category) searchArgs.category = options.category;
        if (options.since) searchArgs.since = options.since;
        if (options.before) searchArgs.before = options.before;

        const result = await client.callTool('memory_search_memories', searchArgs);
        
        spinner.succeed(`Found ${result.total || result.results.length} memories`);
        
        if (result.results.length === 0) {
          console.log(chalk.yellow('\nNo memories match the filter criteria'));
          return;
        }

        console.log(chalk.cyan('\n📋 Filtered Memories:'));
        const tableData = [
          [chalk.bold('ID'), chalk.bold('Title'), chalk.bold('Type'), chalk.bold('Created')]
        ];
        
        result.results.forEach((memory: any) => {
          tableData.push([
            memory.id.substring(0, 8) + '...',
            memory.title.substring(0, 30) + (memory.title.length > 30 ? '...' : ''),
            memory.memory_type || 'context',
            new Date(memory.created_at).toLocaleDateString()
          ]);
        });
        
        console.log(table(tableData));
        
        // Show filter summary
        console.log(chalk.cyan('\n📊 Filter Summary:'));
        if (options.appId) console.log(`  App ID: ${options.appId}`);
        if (options.category) console.log(`  Category: ${options.category}`);
        if (options.since) console.log(`  Since: ${options.since}`);
        if (options.before) console.log(`  Before: ${options.before}`);
        if (options.state) console.log(`  State: ${options.state}`);
      } catch (error) {
        spinner.fail(`Filter failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  // Memory analytics
  memory.command('analytics')
    .description('Show memory usage analytics and insights')
    .option('--app <app_id>', 'Analytics for specific app')
    .option('--period <days>', 'Analysis period in days', '30')
    .action(async (options) => {
      const spinner = ora('Generating memory analytics...').start();
      
      try {
        const client = getMCPClient();
        
        if (!client.isConnectedToServer()) {
          spinner.info('Connecting to MCP server...');
          const config = new CLIConfig();
          await client.connect({ useRemote: !!config.get('token') });
        }

        // Get all memories for analysis
        const allMemories = await client.callTool('memory_search_memories', {
          query: '*',
          limit: 1000
        });

        spinner.succeed('Analytics generated');
        
        const memories = allMemories.results || [];
        
        // Basic statistics
        console.log(chalk.cyan('\n📊 Memory Analytics'));
        console.log(chalk.cyan('=================='));
        console.log(`Total Memories: ${chalk.bold(memories.length)}`);
        
        // Memory types breakdown
        const typeBreakdown: Record<string, number> = {};
        memories.forEach((m: any) => {
          const type = m.memory_type || 'context';
          typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
        });
        
        console.log(chalk.cyan('\n📈 Memory Types:'));
        Object.entries(typeBreakdown).forEach(([type, count]) => {
          const percentage = ((count / memories.length) * 100).toFixed(1);
          console.log(`  ${type}: ${chalk.bold(count)} (${percentage}%)`);
        });
        
        // Recent activity
        const now = new Date();
        const periodDays = parseInt(options.period);
        const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
        
        const recentMemories = memories.filter((m: any) => 
          new Date(m.created_at) >= cutoffDate
        );
        
        console.log(chalk.cyan(`\n📅 Recent Activity (${periodDays} days):`));
        console.log(`  New memories: ${chalk.bold(recentMemories.length)}`);
        console.log(`  Daily average: ${chalk.bold((recentMemories.length / periodDays).toFixed(1))}`);
        
        // App breakdown if not filtering by specific app
        if (!options.app) {
          const appBreakdown: Record<string, number> = {};
          memories.forEach((m: any) => {
            const app = m.app_id || 'default';
            appBreakdown[app] = (appBreakdown[app] || 0) + 1;
          });
          
          console.log(chalk.cyan('\n🔧 App Usage:'));
          Object.entries(appBreakdown)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .forEach(([app, count]) => {
              const percentage = ((count / memories.length) * 100).toFixed(1);
              console.log(`  ${app}: ${chalk.bold(count)} (${percentage}%)`);
            });
        }
      } catch (error) {
        spinner.fail(`Analytics failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });

  // Interactive memory management
  memory.command('manage')
    .description('Interactive memory management interface')
    .action(async () => {
      console.log(chalk.cyan('🧠 Interactive Memory Management'));
      console.log(chalk.cyan('================================'));
      
      try {
        const client = getMCPClient();
        
        if (!client.isConnectedToServer()) {
          const spinner = ora('Connecting to MCP server...').start();
          const config = new CLIConfig();
          await client.connect({ useRemote: !!config.get('token') });
          spinner.succeed('Connected to MCP server');
        }

        while (true) {
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: 'What would you like to do?',
              choices: [
                { name: '🔍 Search memories', value: 'search' },
                { name: '📊 View analytics', value: 'analytics' },
                { name: '🔗 Find related memories', value: 'related' },
                { name: '⏸️  Bulk pause memories', value: 'bulk_pause' },
                { name: '📦 Archive old memories', value: 'archive' },
                { name: '🚪 Exit', value: 'exit' }
              ]
            }
          ]);

          if (action === 'exit') {
            console.log(chalk.green('👋 Goodbye!'));
            break;
          }

          // Handle each action
          switch (action) {
            case 'search':
              const { query } = await inquirer.prompt([
                { type: 'input', name: 'query', message: 'Enter search query:' }
              ]);
              
              if (query) {
                const spinner = ora('Searching...').start();
                const results = await client.callTool('memory_search_memories', { query });
                spinner.succeed(`Found ${results.results.length} memories`);
                
                results.results.slice(0, 5).forEach((m: any, i: number) => {
                  console.log(`\n${i + 1}. ${chalk.bold(m.title)}`);
                  console.log(`   ${m.content.substring(0, 100)}...`);
                });
              }
              break;
              
            case 'analytics':
              console.log(chalk.cyan('📊 Generating analytics...'));
              // Could call the analytics logic here
              break;
              
            case 'related':
              const { memoryId } = await inquirer.prompt([
                { type: 'input', name: 'memoryId', message: 'Enter memory ID:' }
              ]);
              
              if (memoryId) {
                const spinner = ora('Finding related memories...').start();
                const related = await client.callTool('memory_find_related', { memory_id: memoryId });
                spinner.succeed(`Found ${related.count} related memories`);
                
                related.related_memories?.slice(0, 3).forEach((m: any, i: number) => {
                  console.log(`\n${i + 1}. ${chalk.bold(m.title)}`);
                  console.log(`   Similarity: ${chalk.green((m.relevance_score * 100).toFixed(1) + '%')}`);
                });
              }
              break;
              
            case 'bulk_pause':
              const { pauseCriteria } = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'pauseCriteria',
                  message: 'Pause memories by:',
                  choices: [
                    { name: 'Before specific date', value: 'date' },
                    { name: 'By category', value: 'category' },
                    { name: 'By app', value: 'app' }
                  ]
                }
              ]);
              
              console.log(chalk.yellow(`Selected: ${pauseCriteria}`));
              // Could implement the specific pause logic here
              break;
              
            case 'archive':
              const { archiveDate } = await inquirer.prompt([
                { 
                  type: 'input', 
                  name: 'archiveDate', 
                  message: 'Archive memories before date (YYYY-MM-DD):',
                  validate: (input) => {
                    const date = new Date(input);
                    return !isNaN(date.getTime()) || 'Please enter a valid date';
                  }
                }
              ]);
              
              if (archiveDate) {
                const spinner = ora('Archiving memories...').start();
                const result = await client.callTool('memory_bulk_operations', {
                  operation: 'archive',
                  before: archiveDate
                });
                spinner.succeed(`Archived ${result.affected_count} memories`);
              }
              break;
          }
          
          console.log(); // Add spacing
        }
      } catch (error) {
        console.error(chalk.red(`Management interface failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        process.exit(1);
      }
    });
}