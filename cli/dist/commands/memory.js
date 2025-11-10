"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryCommands = memoryCommands;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const table_1 = require("table");
const word_wrap_1 = __importDefault(require("word-wrap"));
const date_fns_1 = require("date-fns");
const api_js_1 = require("../utils/api.js");
const formatting_js_1 = require("../utils/formatting.js");
function memoryCommands(program) {
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
        .action(async (options) => {
        try {
            let { title, content, type, tags, topicId, interactive } = options;
            if (interactive || (!title || !content)) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'title',
                        message: 'Memory title:',
                        default: title,
                        validate: (input) => input.length > 0 || 'Title is required'
                    },
                    {
                        type: 'editor',
                        name: 'content',
                        message: 'Memory content:',
                        default: content,
                        validate: (input) => input.length > 0 || 'Content is required'
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
            const spinner = (0, ora_1.default)('Creating memory...').start();
            const memoryData = {
                title,
                content,
                memory_type: type
            };
            if (tags) {
                memoryData.tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
            }
            if (topicId) {
                memoryData.topic_id = topicId;
            }
            const memory = await api_js_1.apiClient.createMemory(memoryData);
            spinner.succeed('Memory created successfully');
            console.log();
            console.log(chalk_1.default.green('✓ Memory created:'));
            console.log(`  ID: ${chalk_1.default.cyan(memory.id)}`);
            console.log(`  Title: ${memory.title}`);
            console.log(`  Type: ${memory.memory_type}`);
            if (memory.tags && memory.tags.length > 0) {
                console.log(`  Tags: ${memory.tags.join(', ')}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to create memory:'), errorMessage);
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
        .action(async (options) => {
        try {
            const spinner = (0, ora_1.default)('Fetching memories...').start();
            const params = {
                page: parseInt(options.page || '1'),
                limit: parseInt(options.limit || '20'),
                sort: options.sort || 'created_at',
                order: options.order || 'desc'
            };
            if (options.type)
                params.memory_type = options.type;
            if (options.tags)
                params.tags = options.tags;
            if (options.userId)
                params.user_id = options.userId;
            const result = await api_js_1.apiClient.getMemories(params);
            spinner.stop();
            const memories = result.memories || result.data || [];
            if (memories.length === 0) {
                console.log(chalk_1.default.yellow('No memories found'));
                return;
            }
            console.log(chalk_1.default.blue.bold(`\n📚 Memories (${result.pagination.total} total)`));
            console.log(chalk_1.default.gray(`Page ${result.pagination.page || 1} of ${result.pagination.pages || Math.ceil(result.pagination.total / result.pagination.limit)}`));
            console.log();
            const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'table';
            if (outputFormat === 'json') {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                // Table format
                const tableData = memories.map((memory) => [
                    (0, formatting_js_1.truncateText)(memory.title, 30),
                    memory.memory_type,
                    memory.tags.slice(0, 3).join(', '),
                    (0, date_fns_1.format)(new Date(memory.created_at), 'MMM dd, yyyy'),
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
                console.log((0, table_1.table)([tableConfig.header, ...tableData], {
                    columnDefault: tableConfig.columnDefault,
                    columns: tableConfig.columns
                }));
                // Pagination info
                if (result.pagination.pages > 1) {
                    console.log(chalk_1.default.gray(`\nUse --page ${result.pagination.page + 1} for next page`));
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to list memories:'), errorMessage);
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
        .action(async (query, options) => {
        try {
            const spinner = (0, ora_1.default)(`Searching for "${query}"...`).start();
            const searchOptions = {
                limit: parseInt(options.limit || '20'),
                threshold: parseFloat(options.threshold || '0.7')
            };
            if (options.type) {
                searchOptions.memory_types = options.type.split(',').map((t) => t.trim());
            }
            if (options.tags) {
                searchOptions.tags = options.tags.split(',').map((t) => t.trim());
            }
            const result = await api_js_1.apiClient.searchMemories(query, searchOptions);
            spinner.stop();
            const results = result.results || result.data || [];
            if (results.length === 0) {
                console.log(chalk_1.default.yellow('No memories found matching your search'));
                return;
            }
            console.log(chalk_1.default.blue.bold(`\n🔍 Search Results (${result.total_results || results.length} found)`));
            console.log(chalk_1.default.gray(`Query: "${query}" | Search time: ${result.search_time_ms || 0}ms`));
            console.log();
            results.forEach((memory, index) => {
                const score = (memory.relevance_score * 100).toFixed(1);
                console.log(chalk_1.default.green(`${index + 1}. ${memory.title}`) + chalk_1.default.gray(` (${score}% match)`));
                console.log(chalk_1.default.white(`   ${(0, formatting_js_1.truncateText)(memory.content, 100)}`));
                console.log(chalk_1.default.cyan(`   ID: ${memory.id}`) + chalk_1.default.gray(` | Type: ${memory.memory_type}`));
                if (memory.tags.length > 0) {
                    console.log(chalk_1.default.yellow(`   Tags: ${memory.tags.join(', ')}`));
                }
                console.log();
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Search failed:'), errorMessage);
            process.exit(1);
        }
    });
    // Get memory details
    program
        .command('get')
        .alias('show')
        .description('Get detailed information about a memory')
        .argument('<id>', 'memory ID')
        .action(async (id) => {
        try {
            const spinner = (0, ora_1.default)('Fetching memory...').start();
            const memory = await api_js_1.apiClient.getMemory(id);
            spinner.stop();
            console.log(chalk_1.default.blue.bold('\n📄 Memory Details'));
            console.log();
            console.log(chalk_1.default.green('Title:'), memory.title);
            console.log(chalk_1.default.green('ID:'), chalk_1.default.cyan(memory.id));
            console.log(chalk_1.default.green('Type:'), memory.memory_type);
            console.log(chalk_1.default.green('Created:'), (0, date_fns_1.format)(new Date(memory.created_at), 'PPpp'));
            console.log(chalk_1.default.green('Updated:'), (0, date_fns_1.format)(new Date(memory.updated_at), 'PPpp'));
            if (memory.last_accessed) {
                console.log(chalk_1.default.green('Last Accessed:'), (0, date_fns_1.format)(new Date(memory.last_accessed), 'PPpp'));
            }
            console.log(chalk_1.default.green('Access Count:'), memory.access_count);
            if (memory.tags && memory.tags.length > 0) {
                console.log(chalk_1.default.green('Tags:'), memory.tags.join(', '));
            }
            if (memory.topic_id) {
                console.log(chalk_1.default.green('Topic ID:'), memory.topic_id);
            }
            console.log();
            console.log(chalk_1.default.green('Content:'));
            console.log((0, word_wrap_1.default)(memory.content, { width: 80, indent: '  ' }));
            if (memory.metadata && Object.keys(memory.metadata).length > 0) {
                console.log();
                console.log(chalk_1.default.green('Metadata:'));
                console.log(JSON.stringify(memory.metadata, null, 2));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to get memory:'), errorMessage);
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
        .action(async (id, options) => {
        try {
            let updateData = {};
            if (options.interactive) {
                // First, get current memory data
                const spinner = (0, ora_1.default)('Fetching current memory...').start();
                const currentMemory = await api_js_1.apiClient.getMemory(id);
                spinner.stop();
                const answers = await inquirer_1.default.prompt([
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
                    tags: answers.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                };
            }
            else {
                if (options.title)
                    updateData.title = options.title;
                if (options.content)
                    updateData.content = options.content;
                if (options.type)
                    updateData.memory_type = options.type;
                if (options.tags) {
                    updateData.tags = options.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
                }
            }
            if (Object.keys(updateData).length === 0) {
                console.log(chalk_1.default.yellow('No updates specified'));
                return;
            }
            const spinner = (0, ora_1.default)('Updating memory...').start();
            const memory = await api_js_1.apiClient.updateMemory(id, updateData);
            spinner.succeed('Memory updated successfully');
            console.log();
            console.log(chalk_1.default.green('✓ Memory updated:'));
            console.log(`  ID: ${chalk_1.default.cyan(memory.id)}`);
            console.log(`  Title: ${memory.title}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to update memory:'), errorMessage);
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
        .action(async (id, options) => {
        try {
            if (!options.force) {
                const memory = await api_js_1.apiClient.getMemory(id);
                const answer = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete "${memory.title}"?`,
                        default: false
                    }
                ]);
                if (!answer.confirm) {
                    console.log(chalk_1.default.yellow('Deletion cancelled'));
                    return;
                }
            }
            const spinner = (0, ora_1.default)('Deleting memory...').start();
            await api_js_1.apiClient.deleteMemory(id);
            spinner.succeed('Memory deleted successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to delete memory:'), errorMessage);
            process.exit(1);
        }
    });
    // Memory statistics
    program
        .command('stats')
        .description('Show memory statistics (admin only)')
        .action(async () => {
        try {
            const spinner = (0, ora_1.default)('Fetching statistics...').start();
            const stats = await api_js_1.apiClient.getMemoryStats();
            spinner.stop();
            console.log(chalk_1.default.blue.bold('\n📊 Memory Statistics'));
            console.log();
            console.log(chalk_1.default.green('Total Memories:'), stats.total_memories.toLocaleString());
            console.log(chalk_1.default.green('Total Size:'), (0, formatting_js_1.formatBytes)(stats.total_size_bytes));
            console.log(chalk_1.default.green('Average Access Count:'), stats.avg_access_count);
            console.log();
            console.log(chalk_1.default.yellow('Memories by Type:'));
            Object.entries(stats.memories_by_type).forEach(([type, count]) => {
                console.log(`  ${type}: ${count}`);
            });
            if (stats.most_accessed_memory) {
                console.log();
                console.log(chalk_1.default.yellow('Most Accessed Memory:'));
                console.log(`  ${stats.most_accessed_memory.title} (${stats.most_accessed_memory.access_count} times)`);
            }
            if (stats.recent_memories.length > 0) {
                console.log();
                console.log(chalk_1.default.yellow('Recent Memories:'));
                stats.recent_memories.forEach((memory, index) => {
                    console.log(`  ${index + 1}. ${(0, formatting_js_1.truncateText)(memory.title, 50)}`);
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to get statistics:'), errorMessage);
            process.exit(1);
        }
    });
}
