"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.topicCommands = topicCommands;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const table_1 = require("table");
const date_fns_1 = require("date-fns");
const api_js_1 = require("../utils/api.js");
const formatting_js_1 = require("../utils/formatting.js");
function topicCommands(program) {
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
        .action(async (options) => {
        try {
            let { name, description, color, icon, parent, interactive } = options;
            if (interactive || !name) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Topic name:',
                        default: name,
                        validate: (input) => input.length > 0 || 'Name is required'
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
                        validate: (input) => {
                            if (!input)
                                return true;
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
            const spinner = (0, ora_1.default)('Creating topic...').start();
            const topicData = { name };
            if (description)
                topicData.description = description;
            if (color)
                topicData.color = color;
            if (icon)
                topicData.icon = icon;
            if (parent)
                topicData.parent_topic_id = parent;
            const topic = await api_js_1.apiClient.createTopic(topicData);
            spinner.succeed('Topic created successfully');
            console.log();
            console.log(chalk_1.default.green('✓ Topic created:'));
            console.log(`  ID: ${chalk_1.default.cyan(topic.id)}`);
            console.log(`  Name: ${topic.name}`);
            if (topic.description) {
                console.log(`  Description: ${topic.description}`);
            }
            if (topic.color) {
                console.log(`  Color: ${topic.color}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to create topic:'), errorMessage);
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
            const spinner = (0, ora_1.default)('Fetching topics...').start();
            const topics = await api_js_1.apiClient.getTopics();
            spinner.stop();
            if (topics.length === 0) {
                console.log(chalk_1.default.yellow('No topics found'));
                return;
            }
            console.log(chalk_1.default.blue.bold(`\n📁 Topics (${topics.length} total)`));
            console.log();
            const outputFormat = process.env.CLI_OUTPUT_FORMAT || 'table';
            if (outputFormat === 'json') {
                console.log(JSON.stringify(topics, null, 2));
            }
            else {
                // Table format
                const tableData = topics.map((topic) => [
                    (0, formatting_js_1.truncateText)(topic.name, 25),
                    (0, formatting_js_1.truncateText)(topic.description || '', 40),
                    topic.color || '',
                    (0, date_fns_1.format)(new Date(topic.created_at), 'MMM dd, yyyy'),
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
                console.log((0, table_1.table)([tableHeaders, ...tableData], tableConfig));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to list topics:'), errorMessage);
            process.exit(1);
        }
    });
    // Get topic details
    program
        .command('get')
        .alias('show')
        .description('Get detailed information about a topic')
        .argument('<id>', 'topic ID')
        .action(async (id) => {
        try {
            const spinner = (0, ora_1.default)('Fetching topic...').start();
            const topic = await api_js_1.apiClient.getTopic(id);
            spinner.stop();
            console.log(chalk_1.default.blue.bold('\n📁 Topic Details'));
            console.log();
            console.log(chalk_1.default.green('Name:'), topic.name);
            console.log(chalk_1.default.green('ID:'), chalk_1.default.cyan(topic.id));
            if (topic.description) {
                console.log(chalk_1.default.green('Description:'), topic.description);
            }
            if (topic.color) {
                console.log(chalk_1.default.green('Color:'), topic.color);
            }
            if (topic.icon) {
                console.log(chalk_1.default.green('Icon:'), topic.icon);
            }
            if (topic.parent_topic_id) {
                console.log(chalk_1.default.green('Parent Topic:'), topic.parent_topic_id);
            }
            console.log(chalk_1.default.green('System Topic:'), topic.is_system ? 'Yes' : 'No');
            console.log(chalk_1.default.green('Created:'), (0, date_fns_1.format)(new Date(topic.created_at), 'PPpp'));
            console.log(chalk_1.default.green('Updated:'), (0, date_fns_1.format)(new Date(topic.updated_at), 'PPpp'));
            if (topic.metadata && Object.keys(topic.metadata).length > 0) {
                console.log();
                console.log(chalk_1.default.green('Metadata:'));
                console.log(JSON.stringify(topic.metadata, null, 2));
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to get topic:'), errorMessage);
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
        .action(async (id, options) => {
        try {
            let updateData = {};
            if (options.interactive) {
                // First, get current topic data
                const spinner = (0, ora_1.default)('Fetching current topic...').start();
                const currentTopic = await api_js_1.apiClient.getTopic(id);
                spinner.stop();
                const answers = await inquirer_1.default.prompt([
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
                        validate: (input) => {
                            if (!input)
                                return true;
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
            }
            else {
                if (options.name)
                    updateData.name = options.name;
                if (options.description)
                    updateData.description = options.description;
                if (options.color)
                    updateData.color = options.color;
                if (options.icon)
                    updateData.icon = options.icon;
            }
            if (Object.keys(updateData).length === 0) {
                console.log(chalk_1.default.yellow('No updates specified'));
                return;
            }
            const spinner = (0, ora_1.default)('Updating topic...').start();
            const topic = await api_js_1.apiClient.updateTopic(id, updateData);
            spinner.succeed('Topic updated successfully');
            console.log();
            console.log(chalk_1.default.green('✓ Topic updated:'));
            console.log(`  ID: ${chalk_1.default.cyan(topic.id)}`);
            console.log(`  Name: ${topic.name}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to update topic:'), errorMessage);
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
        .action(async (id, options) => {
        try {
            if (!options.force) {
                const topic = await api_js_1.apiClient.getTopic(id);
                const answer = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete topic "${topic.name}"?`,
                        default: false
                    }
                ]);
                if (!answer.confirm) {
                    console.log(chalk_1.default.yellow('Deletion cancelled'));
                    return;
                }
            }
            const spinner = (0, ora_1.default)('Deleting topic...').start();
            await api_js_1.apiClient.deleteTopic(id);
            spinner.succeed('Topic deleted successfully');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(chalk_1.default.red('✖ Failed to delete topic:'), errorMessage);
            process.exit(1);
        }
    });
}
