import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { table } from 'table';
import { format } from 'date-fns';

import { apiClient, MemoryTopic, CreateTopicRequest, UpdateTopicRequest } from '../utils/api.js';
import { truncateText } from '../utils/formatting.js';

// Type definitions for command options
interface CreateTopicOptions {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  parent?: string;
  interactive?: boolean;
}

interface CreateTopicAnswers {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface UpdateTopicOptions {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  interactive?: boolean;
}

interface UpdateTopicAnswers {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface DeleteTopicOptions {
  force?: boolean;
}

interface DeleteConfirmAnswer {
  confirm: boolean;
}

export function topicCommands(program: Command): void {
  // Create topic
  program
    .command('create')
    .alias('add')
    .description('Create a new topic')
    .option('-n, --name <name>', 'topic name')
    .option('-d, --description <description>', 'topic description')
    .option('-c, --color <color>', 'topic color (hex format)')
    .option('--icon <icon>', 'topic icon')
    .option('--parent <parentId>', 'parent topic ID')
    .option('-i, --interactive', 'interactive mode')
    .action(async (options: CreateTopicOptions) => {
      try {
        let { name, description, color, icon, parent, interactive } = options;

        if (interactive || !name) {
          const answers = await inquirer.prompt<CreateTopicAnswers>([
            {
              type: 'input',
              name: 'name',
              message: 'Topic name:',
              default: name,
              validate: (input: string) => input.length > 0 || 'Name is required'
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description (optional):',
              default: description || ''
            },
            {
              type: 'input',
              name: 'color',
              message: 'Color (hex format, e.g., #3B82F6):',
              default: color || '#3B82F6',
              validate: (input: string) => {
                if (!input) return true;
                return /^#[0-9A-Fa-f]{6}$/.test(input) || 'Please enter a valid hex color (e.g., #3B82F6)';
              }
            },
            {
              type: 'input',
              name: 'icon',
              message: 'Icon (optional):',
              default: icon || ''
            }
          ]);

          name = answers.name;
          description = answers.description;
          color = answers.color;
          icon = answers.icon;
        }

        const spinner = ora('Creating topic...').start();

        const topicData: CreateTopicRequest = { name };
        if (description) topicData.description = description;
        if (color) topicData.color = color;
        if (icon) topicData.icon = icon;
        if (parent) topicData.parent_topic_id = parent;

        const topic = await apiClient.createTopic(topicData);
        spinner.succeed('Topic created successfully');

        console.log();
        console.log(chalk.green('✓ Topic created:'));
        console.log(`  ID: ${chalk.cyan(topic.id)}`);
        console.log(`  Name: ${topic.name}`);
        if (topic.description) {
          console.log(`  Description: ${topic.description}`);
        }
        if (topic.color) {
          console.log(`  Color: ${topic.color}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to create topic:'), errorMessage);
        process.exit(1);
      }
    });

  // List topics
  program
    .command('list')
    .alias('ls')
    .description('List topics')
    .action(async () => {
      try {
        const spinner = ora('Fetching topics...').start();
        const topics = await apiClient.getTopics();
        spinner.stop();

        if (topics.length === 0) {
          console.log(chalk.yellow('No topics found'));
          return;
        }

        console.log(chalk.blue.bold(`\n📁 Topics (${topics.length} total)`));
        console.log();

        const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'table';
        
        if (outputFormat === 'json') {
          console.log(JSON.stringify(topics, null, 2));
        } else {
          // Table format
          const tableData = topics.map((topic: MemoryTopic) => [
            truncateText(topic.name, 25),
            truncateText(topic.description || '', 40),
            topic.color || '',
            format(new Date(topic.created_at), 'MMM dd, yyyy'),
            topic.parent_topic_id ? '✓' : ''
          ]);

          const tableConfig = {
            columnDefault: {
              width: 20,
              wrapWord: true
            },
            columns: [
              { width: 25 },
              { width: 40 },
              { width: 10 },
              { width: 12 },
              { width: 8 }
            ]
          };

          const tableHeaders = ['Name', 'Description', 'System', 'Created'];
          console.log(table([tableHeaders, ...tableData], tableConfig));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to list topics:'), errorMessage);
        process.exit(1);
      }
    });

  // Get topic details
  program
    .command('get')
    .alias('show')
    .description('Get detailed information about a topic')
    .argument('<id>', 'topic ID')
    .action(async (id: string) => {
      try {
        const spinner = ora('Fetching topic...').start();
        const topic = await apiClient.getTopic(id);
        spinner.stop();

        console.log(chalk.blue.bold('\n📁 Topic Details'));
        console.log();
        console.log(chalk.green('Name:'), topic.name);
        console.log(chalk.green('ID:'), chalk.cyan(topic.id));
        
        if (topic.description) {
          console.log(chalk.green('Description:'), topic.description);
        }
        
        if (topic.color) {
          console.log(chalk.green('Color:'), topic.color);
        }
        
        if (topic.icon) {
          console.log(chalk.green('Icon:'), topic.icon);
        }
        
        if (topic.parent_topic_id) {
          console.log(chalk.green('Parent Topic:'), topic.parent_topic_id);
        }
        
        console.log(chalk.green('System Topic:'), topic.is_system ? 'Yes' : 'No');
        console.log(chalk.green('Created:'), format(new Date(topic.created_at), 'PPpp'));
        console.log(chalk.green('Updated:'), format(new Date(topic.updated_at), 'PPpp'));

        if (topic.metadata && Object.keys(topic.metadata).length > 0) {
          console.log();
          console.log(chalk.green('Metadata:'));
          console.log(JSON.stringify(topic.metadata, null, 2));
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to get topic:'), errorMessage);
        process.exit(1);
      }
    });

  // Update topic
  program
    .command('update')
    .description('Update a topic')
    .argument('<id>', 'topic ID')
    .option('-n, --name <name>', 'new name')
    .option('-d, --description <description>', 'new description')
    .option('-c, --color <color>', 'new color (hex format)')
    .option('--icon <icon>', 'new icon')
    .option('-i, --interactive', 'interactive mode')
    .action(async (id: string, options: UpdateTopicOptions) => {
      try {
        let updateData: UpdateTopicRequest = {};

        if (options.interactive) {
          // First, get current topic data
          const spinner = ora('Fetching current topic...').start();
          const currentTopic = await apiClient.getTopic(id);
          spinner.stop();

          const answers = await inquirer.prompt<UpdateTopicAnswers>([
            {
              type: 'input',
              name: 'name',
              message: 'Name:',
              default: currentTopic.name
            },
            {
              type: 'input',
              name: 'description',
              message: 'Description:',
              default: currentTopic.description || ''
            },
            {
              type: 'input',
              name: 'color',
              message: 'Color (hex format):',
              default: currentTopic.color || '',
              validate: (input: string) => {
                if (!input) return true;
                return /^#[0-9A-Fa-f]{6}$/.test(input) || 'Please enter a valid hex color';
              }
            },
            {
              type: 'input',
              name: 'icon',
              message: 'Icon:',
              default: currentTopic.icon || ''
            }
          ]);

          updateData = {
            name: answers.name,
            description: answers.description || undefined,
            color: answers.color || undefined,
            icon: answers.icon || undefined
          };
        } else {
          if (options.name) updateData.name = options.name;
          if (options.description) updateData.description = options.description;
          if (options.color) updateData.color = options.color;
          if (options.icon) updateData.icon = options.icon;
        }

        if (Object.keys(updateData).length === 0) {
          console.log(chalk.yellow('No updates specified'));
          return;
        }

        const spinner = ora('Updating topic...').start();
        const topic = await apiClient.updateTopic(id, updateData);
        spinner.succeed('Topic updated successfully');

        console.log();
        console.log(chalk.green('✓ Topic updated:'));
        console.log(`  ID: ${chalk.cyan(topic.id)}`);
        console.log(`  Name: ${topic.name}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to update topic:'), errorMessage);
        process.exit(1);
      }
    });

  // Delete topic
  program
    .command('delete')
    .alias('rm')
    .description('Delete a topic')
    .argument('<id>', 'topic ID')
    .option('-f, --force', 'skip confirmation')
    .action(async (id: string, options: DeleteTopicOptions) => {
      try {
        if (!options.force) {
          const topic = await apiClient.getTopic(id);
          const answer = await inquirer.prompt<DeleteConfirmAnswer>([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to delete topic "${topic.name}"?`,
              default: false
            }
          ]);

          if (!answer.confirm) {
            console.log(chalk.yellow('Deletion cancelled'));
            return;
          }
        }

        const spinner = ora('Deleting topic...').start();
        await apiClient.deleteTopic(id);
        spinner.succeed('Topic deleted successfully');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(chalk.red('✖ Failed to delete topic:'), errorMessage);
        process.exit(1);
      }
    });
}