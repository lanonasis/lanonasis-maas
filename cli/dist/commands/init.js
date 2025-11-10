"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = initCommand;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const config_js_1 = require("../utils/config.js");
async function initCommand(options) {
    const config = new config_js_1.CLIConfig();
    console.log(chalk_1.default.blue.bold('🚀 Initializing MaaS CLI'));
    console.log();
    // Check if config already exists
    const configExists = await config.exists();
    if (configExists && !options.force) {
        const answer = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: 'Configuration already exists. Overwrite?',
                default: false
            }
        ]);
        if (!answer.overwrite) {
            console.log(chalk_1.default.yellow('Initialization cancelled'));
            return;
        }
    }
    // Get configuration
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'apiUrl',
            message: 'API URL:',
            default: 'http://localhost:3000/api/v1',
            validate: (input) => {
                try {
                    new URL(input);
                    return true;
                }
                catch {
                    return 'Please enter a valid URL';
                }
            }
        }
    ]);
    // Initialize config
    await config.init();
    await config.setApiUrl(answers.apiUrl);
    console.log();
    console.log(chalk_1.default.green('✓ CLI initialized successfully'));
    console.log(chalk_1.default.gray(`Configuration saved to: ${config.getConfigPath()}`));
    console.log();
    console.log(chalk_1.default.yellow('Next steps:'));
    console.log(chalk_1.default.white('  memory login    # Authenticate with your account'));
    console.log(chalk_1.default.white('  memory --help   # Show available commands'));
}
