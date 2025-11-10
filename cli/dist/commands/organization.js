"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orgCommands = orgCommands;
const chalk_1 = __importDefault(require("chalk"));
const config_js_1 = require("../utils/config.js");
function orgCommands(program) {
    // Show organization info
    program
        .command('info')
        .description('Show organization information')
        .action(async () => {
        const config = new config_js_1.CLIConfig();
        await config.init();
        const user = await config.getCurrentUser();
        if (!user) {
            console.error(chalk_1.default.red('✖ Not authenticated'));
            process.exit(1);
        }
        console.log(chalk_1.default.blue.bold('🏢 Organization Information'));
        console.log();
        console.log(chalk_1.default.green('Organization ID:'), user.organization_id);
        console.log(chalk_1.default.green('Your Role:'), user.role);
        console.log(chalk_1.default.green('Plan:'), user.plan);
        console.log(chalk_1.default.green('Email:'), user.email);
        // In a full implementation, you'd fetch more org details from the API
        console.log();
        console.log(chalk_1.default.gray('Note: Use the web dashboard for full organization management'));
    });
    // Placeholder for future org management commands
    program
        .command('members')
        .description('List organization members (admin only)')
        .action(async () => {
        console.log(chalk_1.default.yellow('⚠️  This feature is not yet implemented'));
        console.log(chalk_1.default.gray('Use the web dashboard to manage organization members'));
    });
    program
        .command('usage')
        .description('Show organization usage statistics')
        .action(async () => {
        console.log(chalk_1.default.yellow('⚠️  This feature is not yet implemented'));
        console.log(chalk_1.default.gray('Use the web dashboard to view usage statistics'));
    });
}
