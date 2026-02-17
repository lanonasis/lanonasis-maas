import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { table } from 'table';
import wrap from 'word-wrap';
import { format } from 'date-fns';
import { apiClient } from '../utils/api.js';
import { formatBytes, truncateText } from '../utils/formatting.js';
import { CLIConfig } from '../utils/config.js';
import { createTextInputHandler } from '../ux/index.js';
import * as fs from 'fs/promises';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execCb);
const MEMORY_TYPE_CHOICES = [
    'context',
    'project',
    'knowledge',
    'reference',
    'personal',
    'workflow',
];
const coerceMemoryType = (value) => {
    if (typeof value !== 'string')
        return undefined;
    const normalized = value.trim().toLowerCase();
    // Backward compatibility for older docs/examples.
    if (normalized === 'conversation')
        return 'context';
    if (MEMORY_TYPE_CHOICES.includes(normalized)) {
        return normalized;
    }
    return undefined;
};
const resolveInputMode = async () => {
    const config = new CLIConfig();
    await config.init();
    const directMode = config.get('inputMode');
    const userPrefs = config.get('userPreferences');
    const resolved = (directMode || userPrefs?.inputMode);
    return resolved === 'editor' ? 'editor' : 'inline';
};
const collectMemoryContent = async (prompt, inputMode, defaultContent) => {
    if (inputMode === 'editor') {
        const { content } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'content',
                message: prompt,
                default: defaultContent,
            },
        ]);
        return content;
    }
    const handler = createTextInputHandler();
    return handler.collectMultilineInput(prompt, {
        defaultContent,
    });
};
export function memoryCommands(program) {
    // Create memory
    program
        .command('create')
        .alias('add')
        .description('Create a new memory entry')
        .option('-t, --title <title>', 'memory title')
        .option('-c, --content <content>', 'memory content')
        .option('--type <type>', `memory type (${MEMORY_TYPE_CHOICES.join(', ')})`)
        .option('--tags <tags>', 'comma-separated tags')
        .option('--topic-id <id>', 'topic ID')
        .option('-i, --interactive', 'interactive mode')
        .option('--json <json>', 'JSON payload (title, content, type/memory_type, tags[], topic_id)')
        .option('--content-file <path>', 'Read memory content from a file (overrides --content)')
        .action(async (options) => {
        try {
            let { title, content, type, tags, topicId, interactive, json, contentFile } = options;
            // 1) JSON payload (optional)
            if (json) {
                let parsed;
                try {
                    parsed = JSON.parse(json);
                }
                catch (err) {
                    const msg = err instanceof Error ? err.message : 'Invalid JSON';
                    throw new Error(`Invalid --json payload: ${msg}`);
                }
                if (!title && typeof parsed.title === 'string')
                    title = parsed.title;
                if (!content && typeof parsed.content === 'string')
                    content = parsed.content;
                const parsedType = parsed.memory_type ?? parsed.type;
                if (!type && parsedType !== undefined) {
                    const coerced = coerceMemoryType(parsedType);
                    if (!coerced) {
                        throw new Error(`Invalid memory type in --json payload. Expected one of: ${MEMORY_TYPE_CHOICES.join(', ')}`);
                    }
                    type = coerced;
                }
                if (!tags) {
                    if (Array.isArray(parsed.tags)) {
                        tags = parsed.tags.map((t) => String(t)).join(',');
                    }
                    else if (typeof parsed.tags === 'string') {
                        tags = parsed.tags;
                    }
                }
                const parsedTopic = parsed.topic_id ?? parsed.topicId;
                if (!topicId && typeof parsedTopic === 'string')
                    topicId = parsedTopic;
            }
            // 2) Content file (optional)
            if (contentFile) {
                content = await fs.readFile(contentFile, 'utf-8');
            }
            if (interactive || (!title || !content)) {
                const inputMode = await resolveInputMode();
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'title',
                        message: 'Memory title:',
                        default: title,
                        validate: (input) => input.length > 0 || 'Title is required',
                    },
                    {
                        type: 'list',
                        name: 'type',
                        message: 'Memory type:',
                        choices: [...MEMORY_TYPE_CHOICES],
                        default: type || 'context',
                    },
                    {
                        type: 'input',
                        name: 'tags',
                        message: 'Tags (comma-separated):',
                        default: tags || '',
                    },
                ]);
                title = answers.title;
                type = answers.type;
                tags = answers.tags;
                const shouldPromptContent = !content || (interactive && inputMode === 'editor');
                if (shouldPromptContent) {
                    content = await collectMemoryContent('Memory content:', inputMode, content);
                }
            }
            if (!title || title.trim().length === 0) {
                throw new Error('Title is required');
            }
            if (!content || content.trim().length === 0) {
                throw new Error('Content is required');
            }
            const resolvedType = type ?? 'context';
            const spinner = ora('Creating memory...').start();
            const memoryData = {
                title,
                content,
                memory_type: resolvedType
            };
            if (tags) {
                memoryData.tags = tags.split(',').map((tag) => tag.trim()).filter(Boolean);
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to create memory:'), errorMessage);
            process.exit(1);
        }
    });
    // Save current working session context as a memory
    program
        .command('save-session')
        .description('Save current session context (git branch/status + optional test summary) as a memory')
        .option('-t, --title <title>', 'memory title', 'Session summary')
        .option('--type <type>', `memory type (${MEMORY_TYPE_CHOICES.join(', ')})`, 'project')
        .option('--tags <tags>', 'comma-separated tags', 'session,cli')
        .option('--test-summary <text>', 'Optional test summary to include')
        .action(async (options) => {
        try {
            const spinner = ora('Collecting session info...').start();
            const cwd = process.cwd();
            const runGit = async (cmd) => {
                try {
                    const { stdout } = await exec(cmd, { cwd });
                    return String(stdout || '').trim();
                }
                catch {
                    return null;
                }
            };
            const branch = await runGit('git rev-parse --abbrev-ref HEAD');
            const status = await runGit('git status --porcelain');
            const changedFiles = status
                ? status
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => line.replace(/^.. /, ''))
                : [];
            const lines = [];
            lines.push(`# Session Summary`);
            lines.push('');
            lines.push(`- Date: ${new Date().toISOString()}`);
            lines.push(`- CWD: ${cwd}`);
            if (branch)
                lines.push(`- Git branch: ${branch}`);
            lines.push('');
            lines.push('## Changes');
            if (changedFiles.length === 0) {
                lines.push('No uncommitted changes detected (or git not available).');
            }
            else {
                lines.push(changedFiles.map((f) => `- ${f}`).join('\n'));
            }
            lines.push('');
            if (options.testSummary) {
                lines.push('## Test Summary');
                lines.push(options.testSummary);
                lines.push('');
            }
            spinner.text = 'Saving session memory...';
            const resolvedType = coerceMemoryType(options.type) ?? 'project';
            const memoryData = {
                title: options.title || 'Session summary',
                content: lines.join('\n'),
                memory_type: resolvedType
            };
            if (options.tags) {
                memoryData.tags = options.tags.split(',').map((t) => t.trim()).filter(Boolean);
            }
            const memory = await apiClient.createMemory(memoryData);
            spinner.succeed('Session saved');
            console.log();
            console.log(chalk.green('✓ Memory created:'));
            console.log(`  ID: ${chalk.cyan(memory.id)}`);
            console.log(`  Title: ${memory.title}`);
            console.log(`  Type: ${memory.memory_type}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to save session:'), errorMessage);
            process.exit(1);
        }
    });
    // Session management helpers (sessions are stored as memory entries tagged `session,cli` by default)
    program
        .command('list-sessions')
        .description('List saved CLI sessions (memories tagged session,cli by default)')
        .option('-p, --page <page>', 'page number', '1')
        .option('-l, --limit <limit>', 'number of entries per page', '20')
        .option('--type <type>', 'filter by memory type', 'project')
        .option('--tags <tags>', 'filter by tags (comma-separated)', 'session,cli')
        .option('--sort <field>', 'sort by field (created_at, updated_at, title, last_accessed)', 'created_at')
        .option('--order <order>', 'sort order (asc, desc)', 'desc')
        .action(async (options) => {
        try {
            const spinner = ora('Fetching sessions...').start();
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
            const result = await apiClient.getMemories(params);
            spinner.stop();
            const memories = result.memories || result.data || [];
            if (memories.length === 0) {
                console.log(chalk.yellow('No sessions found'));
                return;
            }
            console.log(chalk.blue.bold(`\n📚 Sessions (${result.pagination.total} total)`));
            console.log(chalk.gray(`Page ${result.pagination.page || 1} of ${result.pagination.pages || Math.ceil(result.pagination.total / result.pagination.limit)}`));
            console.log();
            const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'table';
            if (outputFormat === 'json') {
                console.log(JSON.stringify(result, null, 2));
                return;
            }
            const tableData = memories.map((memory) => [
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
            console.log(table([tableConfig.header, ...tableData], {
                columnDefault: tableConfig.columnDefault,
                columns: tableConfig.columns
            }));
            if (result.pagination.pages > 1) {
                console.log(chalk.gray(`\nUse --page ${result.pagination.page + 1} for next page`));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to list sessions:'), errorMessage);
            process.exit(1);
        }
    });
    program
        .command('load-session')
        .description('Load a saved session by memory ID (prints the saved session context)')
        .argument('<id>', 'session memory ID')
        .action(async (id) => {
        try {
            const spinner = ora('Loading session...').start();
            const memory = await apiClient.getMemory(id);
            spinner.stop();
            const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'text';
            if (outputFormat === 'json') {
                console.log(JSON.stringify(memory, null, 2));
                return;
            }
            console.log(chalk.blue.bold('\n📌 Session'));
            console.log(chalk.gray(`${memory.title} (${memory.id})`));
            console.log();
            console.log(memory.content);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to load session:'), errorMessage);
            process.exit(1);
        }
    });
    program
        .command('delete-session')
        .description('Delete a saved session by memory ID')
        .argument('<id>', 'session memory ID')
        .option('-f, --force', 'skip confirmation')
        .action(async (id, options) => {
        try {
            if (!options.force) {
                const memory = await apiClient.getMemory(id);
                const answer = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete session "${memory.title}"?`,
                        default: false
                    }
                ]);
                if (!answer.confirm) {
                    console.log(chalk.yellow('Deletion cancelled'));
                    return;
                }
            }
            const spinner = ora('Deleting session...').start();
            await apiClient.deleteMemory(id);
            spinner.succeed('Session deleted successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to delete session:'), errorMessage);
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
            const spinner = ora('Fetching memories...').start();
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
            const result = await apiClient.getMemories(params);
            spinner.stop();
            const memories = result.memories || result.data || [];
            if (memories.length === 0) {
                console.log(chalk.yellow('No memories found'));
                return;
            }
            console.log(chalk.blue.bold(`\n📚 Memories (${result.pagination.total} total)`));
            console.log(chalk.gray(`Page ${result.pagination.page || 1} of ${result.pagination.pages || Math.ceil(result.pagination.total / result.pagination.limit)}`));
            console.log();
            const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'table';
            if (outputFormat === 'json') {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                // Table format
                const tableData = memories.map((memory) => [
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
                console.log(table([tableConfig.header, ...tableData], {
                    columnDefault: tableConfig.columnDefault,
                    columns: tableConfig.columns
                }));
                // Pagination info
                if (result.pagination.pages > 1) {
                    console.log(chalk.gray(`\nUse --page ${result.pagination.page + 1} for next page`));
                }
            }
        }
        catch (error) {
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
        .action(async (query, options) => {
        try {
            const spinner = ora(`Searching for "${query}"...`).start();
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
            const result = await apiClient.searchMemories(query, searchOptions);
            spinner.stop();
            const results = result.results || result.data || [];
            if (results.length === 0) {
                console.log(chalk.yellow('No memories found matching your search'));
                return;
            }
            console.log(chalk.blue.bold(`\n🔍 Search Results (${result.total_results || results.length} found)`));
            console.log(chalk.gray(`Query: "${query}" | Search time: ${result.search_time_ms || 0}ms`));
            console.log();
            results.forEach((memory, index) => {
                const score = (memory.relevance_score * 100).toFixed(1);
                console.log(chalk.green(`${index + 1}. ${memory.title}`) + chalk.gray(` (${score}% match)`));
                console.log(chalk.white(`   ${truncateText(memory.content, 100)}`));
                console.log(chalk.cyan(`   ID: ${memory.id}`) + chalk.gray(` | Type: ${memory.memory_type}`));
                if (memory.tags.length > 0) {
                    console.log(chalk.yellow(`   Tags: ${memory.tags.join(', ')}`));
                }
                console.log();
            });
        }
        catch (error) {
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
        .action(async (id) => {
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
        }
        catch (error) {
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
        .option('--type <type>', `new memory type (${MEMORY_TYPE_CHOICES.join(', ')})`)
        .option('--tags <tags>', 'new tags (comma-separated)')
        .option('-i, --interactive', 'interactive mode')
        .action(async (id, options) => {
        try {
            let updateData = {};
            if (options.interactive) {
                // First, get current memory data
                const spinner = ora('Fetching current memory...').start();
                const currentMemory = await apiClient.getMemory(id);
                spinner.stop();
                const inputMode = await resolveInputMode();
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'title',
                        message: 'Title:',
                        default: currentMemory.title,
                    },
                    {
                        type: 'list',
                        name: 'type',
                        message: 'Memory type:',
                        choices: [...MEMORY_TYPE_CHOICES],
                        default: currentMemory.memory_type,
                    },
                    {
                        type: 'input',
                        name: 'tags',
                        message: 'Tags (comma-separated):',
                        default: currentMemory.tags?.join(', ') || '',
                    },
                ]);
                const content = await collectMemoryContent('Content:', inputMode, currentMemory.content);
                updateData = {
                    title: answers.title,
                    content,
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
        }
        catch (error) {
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
        .action(async (id, options) => {
        try {
            if (!options.force) {
                const memory = await apiClient.getMemory(id);
                const answer = await inquirer.prompt([
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
        }
        catch (error) {
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
            Object.entries(stats.memories_by_type).forEach(([type, count]) => {
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
                stats.recent_memories.forEach((memory, index) => {
                    console.log(`  ${index + 1}. ${truncateText(memory.title, 50)}`);
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to get statistics:'), errorMessage);
            process.exit(1);
        }
    });
}
