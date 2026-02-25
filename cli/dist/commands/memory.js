import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { table } from 'table';
import wrap from 'word-wrap';
import { format } from 'date-fns';
import { MemoryIntelligenceClient } from '@lanonasis/mem-intel-sdk';
import { apiClient } from '../utils/api.js';
import { formatBytes, truncateText } from '../utils/formatting.js';
import { CLIConfig } from '../utils/config.js';
import { createTextInputHandler } from '../ux/index.js';
import * as fs from 'fs/promises';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
const exec = promisify(execCb);
const MAX_JSON_OPTION_BYTES = 1024 * 1024; // 1 MiB guardrail for CLI JSON flags
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
const parseJsonOption = (value, fieldName) => {
    if (!value)
        return undefined;
    const payloadSize = Buffer.byteLength(value, 'utf8');
    if (payloadSize > MAX_JSON_OPTION_BYTES) {
        throw new Error(`${fieldName} JSON payload is too large (${payloadSize} bytes). Max allowed is ${MAX_JSON_OPTION_BYTES} bytes.`);
    }
    try {
        return JSON.parse(value);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        throw new Error(`Invalid ${fieldName} JSON: ${message}`);
    }
};
const isPlainObject = (value) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const ensureJsonObject = (value, fieldName) => {
    if (value === undefined)
        return undefined;
    if (!isPlainObject(value)) {
        throw new Error(`${fieldName} must be a JSON object`);
    }
    return value;
};
const ensureBehaviorActions = (value, fieldName, options = {}) => {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be a JSON array`);
    }
    if (!options.allowEmpty && value.length === 0) {
        throw new Error(`${fieldName} must be a non-empty JSON array`);
    }
    return value.map((entry, index) => {
        if (!isPlainObject(entry)) {
            throw new Error(`${fieldName}[${index}] must be a JSON object`);
        }
        const tool = typeof entry.tool === 'string' ? entry.tool.trim() : '';
        if (!tool) {
            throw new Error(`${fieldName}[${index}].tool is required`);
        }
        const parsed = { tool };
        if (entry.params !== undefined) {
            if (!isPlainObject(entry.params)) {
                throw new Error(`${fieldName}[${index}].params must be a JSON object`);
            }
            parsed.params = entry.params;
        }
        if (entry.timestamp !== undefined) {
            if (typeof entry.timestamp !== 'string' || !entry.timestamp.trim()) {
                throw new Error(`${fieldName}[${index}].timestamp must be a non-empty string`);
            }
            parsed.timestamp = entry.timestamp;
        }
        if (entry.duration_ms !== undefined) {
            if (typeof entry.duration_ms !== 'number' ||
                !Number.isFinite(entry.duration_ms) ||
                entry.duration_ms < 0) {
                throw new Error(`${fieldName}[${index}].duration_ms must be a non-negative number`);
            }
            parsed.duration_ms = entry.duration_ms;
        }
        return parsed;
    });
};
const clampThreshold = (value) => {
    if (!Number.isFinite(value))
        return 0.55;
    return Math.max(0, Math.min(1, value));
};
const buildSearchThresholdPlan = (requestedThreshold, hasTagFilter) => {
    const plan = [];
    const pushUnique = (threshold) => {
        const normalized = Number(threshold.toFixed(2));
        if (!plan.some((item) => Math.abs(item - normalized) < 0.0001)) {
            plan.push(normalized);
        }
    };
    pushUnique(requestedThreshold);
    if (requestedThreshold > 0.45) {
        pushUnique(Math.max(0.45, requestedThreshold - 0.15));
    }
    if (hasTagFilter) {
        // Tag-assisted recall fallback for sparse semantic scores.
        pushUnique(0);
    }
    return plan;
};
const tokenizeSearchQuery = (input) => {
    return input
        .toLowerCase()
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2);
};
const lexicalSimilarityScore = (query, memory) => {
    const tokens = tokenizeSearchQuery(query);
    if (tokens.length === 0)
        return 0;
    const haystack = `${memory.title || ''} ${memory.content || ''} ${(memory.tags || []).join(' ')}`.toLowerCase();
    const hits = tokens.filter((token) => haystack.includes(token)).length;
    if (hits === 0)
        return 0;
    const ratio = hits / tokens.length;
    return Math.max(0.35, Math.min(0.69, Number((ratio * 0.65).toFixed(3))));
};
const lexicalFallbackSearch = async (query, searchOptions) => {
    const candidateLimit = Math.min(Math.max(searchOptions.limit * 8, 50), 200);
    const primaryType = searchOptions.memory_types?.length === 1 ? searchOptions.memory_types[0] : undefined;
    const memoriesResult = await apiClient.getMemories({
        page: 1,
        limit: candidateLimit,
        memory_type: primaryType,
        tags: searchOptions.tags?.join(','),
    });
    let candidates = (memoriesResult.memories || memoriesResult.data || []);
    if (searchOptions.memory_types && searchOptions.memory_types.length > 1) {
        const typeSet = new Set(searchOptions.memory_types);
        candidates = candidates.filter((memory) => typeSet.has(memory.memory_type));
    }
    if (searchOptions.tags && searchOptions.tags.length > 0) {
        const normalizedTags = new Set(searchOptions.tags.map((tag) => tag.toLowerCase()));
        candidates = candidates.filter((memory) => (memory.tags || []).some((tag) => normalizedTags.has(tag.toLowerCase())));
    }
    return candidates
        .map((memory) => ({
        ...memory,
        similarity_score: lexicalSimilarityScore(query, memory),
    }))
        .filter((memory) => memory.similarity_score > 0)
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, searchOptions.limit);
};
const resolveCurrentUserId = async () => {
    const profile = await apiClient.getUserProfile();
    if (!profile?.id) {
        throw new Error('Unable to resolve user profile id for intelligence request');
    }
    return profile.id;
};
const createIntelligenceTransport = async () => {
    const config = new CLIConfig();
    await config.init();
    await config.refreshTokenIfNeeded();
    const authToken = config.getToken();
    const apiKey = await config.getVendorKeyAsync();
    const apiUrl = `${config.getApiUrl().replace(/\/$/, '')}/api/v1`;
    if (authToken) {
        return {
            mode: 'sdk',
            client: new MemoryIntelligenceClient({
                apiUrl,
                authToken,
                authType: 'bearer',
                allowMissingAuth: false,
            }),
        };
    }
    if (apiKey) {
        if (apiKey.startsWith('lano_')) {
            return {
                mode: 'sdk',
                client: new MemoryIntelligenceClient({
                    apiUrl,
                    apiKey,
                    authType: 'apiKey',
                    allowMissingAuth: false,
                }),
            };
        }
        // Legacy non-lano key path: use CLI API client auth middleware directly.
        return { mode: 'api' };
    }
    throw new Error('Authentication required. Run "lanonasis auth login" first.');
};
const printIntelligenceResult = (title, payload, options) => {
    if (options.json) {
        console.log(JSON.stringify(payload, null, 2));
        return;
    }
    console.log(chalk.cyan.bold(`\n${title}`));
    console.log(JSON.stringify(payload, null, 2));
};
const postIntelligenceEndpoint = async (transport, endpoint, payload) => {
    if (transport.mode === 'sdk') {
        if (!transport.client) {
            throw new Error('SDK transport is not initialized');
        }
        const response = await transport.client.getHttpClient().postEnhanced(endpoint, payload);
        if (response.error) {
            throw new Error(response.error.message || `Request failed for ${endpoint}`);
        }
        return response.data;
    }
    return await apiClient.post(`/api/v1${endpoint}`, payload);
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
                        type: 'select',
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
        .option('--threshold <threshold>', 'similarity threshold (0-1)', '0.55')
        .option('--type <types>', 'filter by memory types (comma-separated)')
        .option('--tags <tags>', 'filter by tags (comma-separated)')
        .action(async (query, options) => {
        try {
            const spinner = ora(`Searching for "${query}"...`).start();
            const requestedThreshold = clampThreshold(parseFloat(options.threshold || '0.55'));
            const searchOptions = {
                limit: parseInt(options.limit || '20'),
                threshold: requestedThreshold
            };
            if (options.type) {
                searchOptions.memory_types = options.type.split(',').map((t) => t.trim());
            }
            if (options.tags) {
                searchOptions.tags = options.tags.split(',').map((t) => t.trim());
            }
            const thresholdPlan = buildSearchThresholdPlan(requestedThreshold, Boolean(searchOptions.tags?.length));
            let result = null;
            let results = [];
            let thresholdUsed = requestedThreshold;
            let searchStrategy = 'semantic';
            for (const threshold of thresholdPlan) {
                const attempt = await apiClient.searchMemories(query, {
                    ...searchOptions,
                    threshold,
                });
                const attemptResults = (attempt.results || attempt.data || []);
                result = attempt;
                if (attemptResults.length > 0) {
                    results = attemptResults;
                    thresholdUsed = threshold;
                    const attemptStrategy = attempt.search_strategy;
                    searchStrategy = typeof attemptStrategy === 'string'
                        ? attemptStrategy
                        : 'semantic';
                    break;
                }
            }
            if (results.length === 0) {
                const lexicalResults = await lexicalFallbackSearch(query, searchOptions);
                if (lexicalResults.length > 0) {
                    results = lexicalResults;
                    searchStrategy = 'cli_lexical_fallback';
                }
            }
            spinner.stop();
            if (results.length === 0) {
                console.log(chalk.yellow('No memories found matching your search'));
                console.log(chalk.gray(`Tried thresholds: ${thresholdPlan.map((t) => t.toFixed(2)).join(', ')}`));
                return;
            }
            console.log(chalk.blue.bold(`\n🔍 Search Results (${result.total_results || results.length} found)`));
            console.log(chalk.gray(`Query: "${query}" | Search time: ${result.search_time_ms || 0}ms`));
            if (Math.abs(thresholdUsed - requestedThreshold) > 0.0001) {
                console.log(chalk.gray(`No matches at ${requestedThreshold.toFixed(2)}; used adaptive threshold ${thresholdUsed.toFixed(2)}`));
            }
            if (searchStrategy) {
                console.log(chalk.gray(`Search strategy: ${searchStrategy}`));
            }
            console.log();
            results.forEach((memory, index) => {
                const score = (memory.similarity_score * 100).toFixed(1);
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
                        type: 'select',
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
    // Intelligence commands powered by @lanonasis/mem-intel-sdk
    const intelligence = program
        .command('intelligence')
        .description('Memory intelligence operations');
    intelligence
        .command('health-check')
        .description('Run memory intelligence health check')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Running intelligence health check...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const result = await postIntelligenceEndpoint(transport, '/intelligence/health-check', { user_id: userId, response_format: 'json' });
            spinner.stop();
            printIntelligenceResult('🩺 Intelligence Health Check', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Intelligence health check failed:'), errorMessage);
            process.exit(1);
        }
    });
    intelligence
        .command('suggest-tags')
        .description('Suggest tags for a memory')
        .argument('<memory-id>', 'Memory ID')
        .option('--max <number>', 'Maximum suggestions', '8')
        .option('--json', 'Output raw JSON payload')
        .action(async (memoryId, options) => {
        try {
            const spinner = ora('Generating tag suggestions...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const maxSuggestions = Math.max(1, Math.min(20, parseInt(options.max || '8', 10)));
            const result = await postIntelligenceEndpoint(transport, '/intelligence/suggest-tags', {
                memory_id: memoryId,
                user_id: userId,
                max_suggestions: maxSuggestions,
                include_existing_tags: true,
                response_format: 'json',
            });
            spinner.stop();
            printIntelligenceResult('🏷️ Tag Suggestions', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to suggest tags:'), errorMessage);
            process.exit(1);
        }
    });
    intelligence
        .command('find-related')
        .description('Find memories related to a source memory')
        .argument('<memory-id>', 'Source memory ID')
        .option('--limit <number>', 'Maximum related memories', '5')
        .option('--threshold <number>', 'Similarity threshold (0-1)', '0.7')
        .option('--json', 'Output raw JSON payload')
        .action(async (memoryId, options) => {
        try {
            const spinner = ora('Finding related memories...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const result = await postIntelligenceEndpoint(transport, '/intelligence/find-related', {
                memory_id: memoryId,
                user_id: userId,
                limit: Math.max(1, Math.min(20, parseInt(options.limit || '5', 10))),
                similarity_threshold: Math.max(0, Math.min(1, parseFloat(options.threshold || '0.7'))),
                response_format: 'json',
            });
            spinner.stop();
            printIntelligenceResult('🔗 Related Memories', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to find related memories:'), errorMessage);
            process.exit(1);
        }
    });
    intelligence
        .command('detect-duplicates')
        .description('Detect duplicate memory entries')
        .option('--threshold <number>', 'Similarity threshold (0-1)', '0.88')
        .option('--max-pairs <number>', 'Maximum duplicate pairs to inspect', '100')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Detecting duplicates...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const result = await postIntelligenceEndpoint(transport, '/intelligence/detect-duplicates', {
                user_id: userId,
                similarity_threshold: Math.max(0, Math.min(1, parseFloat(options.threshold || '0.88'))),
                max_pairs: Math.max(10, Math.min(500, parseInt(options.maxPairs || '100', 10))),
                response_format: 'json',
            });
            spinner.stop();
            printIntelligenceResult('🧬 Duplicate Detection', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to detect duplicates:'), errorMessage);
            process.exit(1);
        }
    });
    intelligence
        .command('extract-insights')
        .description('Extract insights from memory collection')
        .option('--topic <topic>', 'Optional topic filter')
        .option('--type <type>', `Optional memory type filter (${MEMORY_TYPE_CHOICES.join(', ')})`)
        .option('--max-memories <number>', 'Maximum memories to analyze', '50')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Extracting insights...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const memoryType = options.type ? coerceMemoryType(options.type) : undefined;
            if (options.type && !memoryType) {
                throw new Error(`Invalid type "${options.type}". Expected one of: ${MEMORY_TYPE_CHOICES.join(', ')}`);
            }
            const result = await postIntelligenceEndpoint(transport, '/intelligence/extract-insights', {
                user_id: userId,
                topic: options.topic,
                memory_type: memoryType,
                max_memories: Math.max(5, Math.min(200, parseInt(options.maxMemories || '50', 10))),
                response_format: 'json',
            });
            spinner.stop();
            printIntelligenceResult('💡 Memory Insights', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to extract insights:'), errorMessage);
            process.exit(1);
        }
    });
    intelligence
        .command('analyze-patterns')
        .description('Analyze memory usage patterns')
        .option('--days <number>', 'Days to include in analysis', '30')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Analyzing memory patterns...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const result = await postIntelligenceEndpoint(transport, '/intelligence/analyze-patterns', {
                user_id: userId,
                time_range_days: Math.max(1, Math.min(365, parseInt(options.days || '30', 10))),
                response_format: 'json',
            });
            spinner.stop();
            printIntelligenceResult('📈 Pattern Analysis', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to analyze patterns:'), errorMessage);
            process.exit(1);
        }
    });
    // Behavior commands powered by @lanonasis/mem-intel-sdk
    const behavior = program
        .command('behavior')
        .description('Behavior pattern intelligence operations');
    behavior
        .command('record')
        .description('Record a behavior pattern from successful workflow steps')
        .requiredOption('--trigger <text>', 'Behavior trigger description')
        .requiredOption('--final-outcome <result>', 'Final outcome: success | partial | failed')
        .requiredOption('--actions <json>', 'Actions JSON array. Example: [{"tool":"memory.search","params":{"query":"auth fix"}}]')
        .option('--context <json>', 'Context JSON object')
        .option('--confidence <number>', 'Confidence score (0-1)', '0.7')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Recording behavior pattern...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const parsedActions = parseJsonOption(options.actions, '--actions');
            const actions = ensureBehaviorActions(parsedActions, '--actions');
            const parsedContext = parseJsonOption(options.context, '--context');
            const context = ensureJsonObject(parsedContext, '--context');
            const finalOutcome = options.finalOutcome;
            if (!['success', 'partial', 'failed'].includes(finalOutcome)) {
                throw new Error('--final-outcome must be one of: success, partial, failed');
            }
            const result = await postIntelligenceEndpoint(transport, '/intelligence/behavior-record', {
                user_id: userId,
                trigger: options.trigger,
                context: context || {},
                actions,
                final_outcome: finalOutcome,
                confidence: Math.max(0, Math.min(1, parseFloat(options.confidence || '0.7'))),
            });
            spinner.stop();
            printIntelligenceResult('🧠 Behavior Recorded', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to record behavior pattern:'), errorMessage);
            process.exit(1);
        }
    });
    behavior
        .command('recall')
        .description('Recall behavior patterns relevant to the current task')
        .requiredOption('--task <text>', 'Current task description')
        .option('--context <json>', 'Additional context JSON object')
        .option('--limit <number>', 'Maximum patterns to return', '5')
        .option('--threshold <number>', 'Similarity threshold (0-1)', '0.7')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Recalling behavior patterns...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const parsedContext = parseJsonOption(options.context, '--context');
            const context = ensureJsonObject(parsedContext, '--context') || {};
            const result = await postIntelligenceEndpoint(transport, '/intelligence/behavior-recall', {
                user_id: userId,
                context: {
                    ...context,
                    current_task: options.task,
                },
                limit: Math.max(1, Math.min(20, parseInt(options.limit || '5', 10))),
                similarity_threshold: Math.max(0, Math.min(1, parseFloat(options.threshold || '0.7'))),
            });
            spinner.stop();
            printIntelligenceResult('🔁 Behavior Recall', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to recall behavior patterns:'), errorMessage);
            process.exit(1);
        }
    });
    behavior
        .command('suggest')
        .description('Suggest next actions from learned behavior patterns')
        .requiredOption('--task <text>', 'Current task description')
        .option('--state <json>', 'Additional current state JSON object')
        .option('--completed-steps <json>', 'Completed steps JSON array')
        .option('--max-suggestions <number>', 'Maximum suggestions', '3')
        .option('--json', 'Output raw JSON payload')
        .action(async (options) => {
        try {
            const spinner = ora('Generating behavior suggestions...').start();
            const transport = await createIntelligenceTransport();
            const userId = await resolveCurrentUserId();
            const parsedState = parseJsonOption(options.state, '--state');
            const state = ensureJsonObject(parsedState, '--state') || {};
            const parsedCompletedSteps = parseJsonOption(options.completedSteps, '--completed-steps');
            const completedSteps = parsedCompletedSteps === undefined
                ? undefined
                : ensureBehaviorActions(parsedCompletedSteps, '--completed-steps', { allowEmpty: true });
            const result = await postIntelligenceEndpoint(transport, '/intelligence/behavior-suggest', {
                user_id: userId,
                current_state: {
                    ...state,
                    task_description: options.task,
                    completed_steps: completedSteps,
                },
                max_suggestions: Math.max(1, Math.min(10, parseInt(options.maxSuggestions || '3', 10))),
            });
            spinner.stop();
            printIntelligenceResult('🎯 Behavior Suggestions', result, options);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk.red('✖ Failed to suggest actions:'), errorMessage);
            process.exit(1);
        }
    });
}
