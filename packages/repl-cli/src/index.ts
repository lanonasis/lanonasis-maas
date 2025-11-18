#!/usr/bin/env node

import { Command } from 'commander';
import { ReplEngine } from './core/repl-engine.js';
import { loadConfig } from './config/loader.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('onasis-repl')
  .description('LanOnasis Interactive Memory Assistant')
  .version('0.2.0');

program
  .command('start', { isDefault: true })
  .description('Start the REPL session')
  .option('--mcp', 'Use local MCP mode', false)
  .option('--api <url>', 'Override API URL')
  .option('--token <token>', 'Authentication token')
  .action(async (options) => {
    const config = await loadConfig({
      useMCP: options.mcp || false,
      apiUrl: options.api,
      authToken: options.token
    });
    
    const repl = new ReplEngine(config);
    await repl.start();
  });

program
  .command('config')
  .description('Show current configuration')
  .action(async () => {
    const config = await loadConfig({});
    console.log(chalk.cyan('Current Configuration:'));
    console.log(JSON.stringify(config, null, 2));
  });

program.parse();
