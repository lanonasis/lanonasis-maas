import chalk from 'chalk';
import inquirer from 'inquirer';
import { CLIConfig } from '../utils/config.js';
import { apiClient } from '../utils/api.js';

// Color scheme
const colors = {
  primary: chalk.blue.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,
  accent: chalk.magenta,
  muted: chalk.gray,
  highlight: chalk.white.bold
};

interface GuidanceStep {
  id: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  completed?: boolean;
  optional?: boolean;
}

export class UserGuidanceSystem {
  private config: CLIConfig;
  private steps: GuidanceStep[] = [];

  constructor() {
    this.config = new CLIConfig();
    this.initializeSteps();
  }

  private initializeSteps(): void {
    this.steps = [
      {
        id: 'initialization',
        title: 'Initialize Configuration',
        description: 'Set up your CLI configuration and preferences',
        action: this.initializeConfig.bind(this)
      },
      {
        id: 'authentication',
        title: 'Authentication Setup',
        description: 'Connect to your Onasis-Core account using preferred method',
        action: this.setupAuthentication.bind(this)
      },
      {
        id: 'verification',
        title: 'Connection Verification',
        description: 'Verify your connection to Onasis-Core services',
        action: this.verifyConnection.bind(this)
      },
      {
        id: 'first_memory',
        title: 'Create Your First Memory',
        description: 'Learn how to store and retrieve information',
        action: this.createFirstMemory.bind(this),
        optional: true
      },
      {
        id: 'explore_features',
        title: 'Explore Advanced Features',
        description: 'Discover topics, MCP integration, and advanced workflows',
        action: this.exploreFeatures.bind(this),
        optional: true
      },
      {
        id: 'productivity_tips',
        title: 'Productivity Setup',
        description: 'Set up shell completions and aliases for efficient usage',
        action: this.setupProductivity.bind(this),
        optional: true
      }
    ];
  }

  async runGuidedSetup(): Promise<void> {
    console.log(chalk.blue.bold('🚀 Welcome to Onasis-Core CLI Setup Guide'));
    console.log(colors.info('═'.repeat(50)));
    console.log();
    console.log(colors.highlight('This guided setup will help you get started with enterprise-grade'));
    console.log(colors.highlight('Memory as a Service and API management capabilities.'));
    console.log();

    // Check current status
    await this.assessCurrentStatus();

    const { proceedWithGuide } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceedWithGuide',
        message: 'Would you like to proceed with the guided setup?',
        default: true
      }
    ]);

    if (!proceedWithGuide) {
      console.log(chalk.yellow('Setup cancelled. You can run this guide anytime with:'));
      console.log(chalk.cyan('  lanonasis guide'));
      return;
    }

    // Run through steps
    for (const step of this.steps) {
      if (step.completed) {
        console.log(chalk.green(`✅ ${step.title} (already completed)`));
        continue;
      }

      await this.executeStep(step);
    }

    await this.showCompletionSummary();
  }

  private async assessCurrentStatus(): Promise<void> {
    console.log(chalk.yellow('📋 Checking current setup status...'));
    console.log();

    // Check configuration
    const configExists = await this.config.exists();
    if (configExists) {
      this.markStepCompleted('initialization');
      console.log(chalk.green('✅ Configuration found'));
    } else {
      console.log(chalk.gray('⏳ Configuration needs setup'));
    }

    // Check authentication
    const isAuthenticated = await this.config.isAuthenticated();
    const hasVendorKey = this.config.hasVendorKey();
    
    if (isAuthenticated || hasVendorKey) {
      this.markStepCompleted('authentication');
      console.log(chalk.green(`✅ Authentication configured (${hasVendorKey ? 'vendor key' : 'JWT token'})`));
    } else {
      console.log(chalk.gray('⏳ Authentication needs setup'));
    }

    // Check connection
    try {
      await apiClient.get('/health');
      this.markStepCompleted('verification');
      console.log(chalk.green('✅ Service connection verified'));
    } catch {
      console.log(chalk.gray('⏳ Service connection needs verification'));
    }

    console.log();
  }

  private markStepCompleted(stepId: string): void {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.completed = true;
    }
  }

  private async executeStep(step: GuidanceStep): Promise<void> {
    console.log(chalk.blue.bold(`🔧 ${step.title}`));
    console.log(colors.info('─'.repeat(30)));
    console.log(chalk.white(step.description));
    console.log();

    if (step.optional) {
      const { proceed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: `Execute this optional step: ${step.title}?`,
          default: true
        }
      ]);

      if (!proceed) {
        console.log(chalk.yellow('⏭️ Skipped'));
        console.log();
        return;
      }
    }

    if (step.action) {
      try {
        await step.action();
        step.completed = true;
        console.log(chalk.green(`✅ ${step.title} completed successfully`));
      } catch (error) {
        console.log(chalk.red(`❌ ${step.title} failed`));
        console.log(chalk.gray(error instanceof Error ? error.message : String(error)));
        
        const { retry } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Would you like to retry this step?',
            default: true
          }
        ]);

        if (retry) {
          await this.executeStep(step); // Recursive retry
        }
      }
    }

    console.log();
  }

  private async initializeConfig(): Promise<void> {
    console.log(colors.info('Initializing CLI configuration...'));
    
    const { apiUrl, outputFormat } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'API URL (press Enter for default):',
        default: 'https://api.lanonasis.com/api/v1'
      },
      {
        type: 'list',
        name: 'outputFormat',
        message: 'Preferred output format:',
        choices: ['table', 'json', 'yaml', 'csv'],
        default: 'table'
      }
    ]);

    await this.config.init();
    await this.config.setApiUrl(apiUrl);
    await this.config.setAndSave('defaultOutputFormat', outputFormat);
    
    console.log(colors.success('Configuration initialized successfully'));
  }

  private async setupAuthentication(): Promise<void> {
    console.log(colors.info('Setting up authentication...'));
    console.log(chalk.gray('Choose the authentication method that best fits your use case:'));
    console.log();

    const { authMethod } = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMethod',
        message: 'Choose authentication method:',
        choices: [
          {
            name: '🔑 Vendor Key (Recommended for API integration)',
            value: 'vendor_key',
            short: 'Vendor Key'
          },
          {
            name: '🌐 OAuth (Browser-based authentication)',
            value: 'oauth',
            short: 'OAuth'
          },
          {
            name: '📧 Username/Password (Direct credentials)',
            value: 'credentials',
            short: 'Credentials'
          }
        ]
      }
    ]);

    // Import and call the login command with the chosen method
    const { loginCommand } = await import('./auth.js');
    
    switch (authMethod) {
      case 'vendor_key':
        console.log(chalk.yellow('📝 Vendor keys provide secure, programmatic access'));
        console.log(chalk.gray('Find it in your dashboard under API Keys.'));
        console.log();
        break;
      case 'oauth':
        console.log(chalk.yellow('🌐 OAuth provides secure browser-based authentication'));
        console.log(chalk.gray('Your browser will open for authentication'));
        console.log();
        break;
      case 'credentials':
        console.log(chalk.yellow('📧 Direct authentication with your account'));
        console.log();
        break;
    }

    // This will be handled by the enhanced auth command
    await loginCommand({});
  }

  private async verifyConnection(): Promise<void> {
    console.log(colors.info('Verifying connection to Onasis-Core services...'));
    
    try {
      const health = await apiClient.get('/health');
      console.log(colors.success('✅ Connection verified successfully'));
      console.log(chalk.gray(`Server status: ${health.status}`));
      console.log(chalk.gray(`Server version: ${health.version}`));
    } catch (error) {
      throw new Error(`Connection verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createFirstMemory(): Promise<void> {
    console.log(colors.info('Creating your first memory entry...'));
    console.log(chalk.gray('Memories are the core of the MaaS platform - they store and organize information'));
    console.log();

    const { createSample } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'createSample',
        message: 'Create a sample memory to get started?',
        default: true
      }
    ]);

    if (createSample) {
      try {
        const memory = await apiClient.createMemory({
          title: 'Welcome to Onasis-Core',
          content: 'This is your first memory in the Onasis-Core MaaS platform. You can store, search, and organize information efficiently using memories.',
          memory_type: 'reference',
          tags: ['welcome', 'getting-started', 'onasis-core']
        });

        console.log(colors.success('✅ Sample memory created successfully'));
        console.log(chalk.gray(`Memory ID: ${memory.id}`));
        console.log();
        console.log(colors.info('💡 Try these commands to explore:'));
        console.log(chalk.cyan('  lanonasis memory list'));
        console.log(chalk.cyan('  lanonasis memory search "welcome"'));
      } catch (error) {
        throw new Error(`Failed to create sample memory: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.log(colors.info('💡 You can create memories anytime with:'));
      console.log(chalk.cyan('  lanonasis memory create --title "My Title" --content "Content"'));
    }
  }

  private async exploreFeatures(): Promise<void> {
    console.log(colors.info('🎯 Advanced Features Overview'));
    console.log();

    const features = [
      {
        name: 'Topics',
        description: 'Organize memories into categories',
        command: 'lanonasis topic create --name "My Project"'
      },
      {
        name: 'MCP Integration',
        description: 'Model Context Protocol for AI interactions',
        command: 'lanonasis mcp status'
      },
      {
        name: 'API Key Management',
        description: 'Create and manage API keys for integrations',
        command: 'lanonasis api-keys list'
      },
      {
        name: 'Memory Search',
        description: 'Semantic search across all memories',
        command: 'lanonasis memory search "your query"'
      }
    ];

    console.log(chalk.yellow('📚 Available Features:'));
    features.forEach((feature, index) => {
      console.log(`${index + 1}. ${colors.accent(feature.name)}: ${feature.description}`);
      console.log(`   ${chalk.cyan(feature.command)}`);
      console.log();
    });

    console.log(colors.info('💡 Run any command with --help to learn more'));
  }

  private async setupProductivity(): Promise<void> {
    console.log(colors.info('🚀 Productivity Setup'));
    console.log();

    const { shell } = await inquirer.prompt([
      {
        type: 'list',
        name: 'shell',
        message: 'Which shell do you use?',
        choices: [
          { name: 'Bash', value: 'bash' },
          { name: 'Zsh', value: 'zsh' },
          { name: 'Fish', value: 'fish' },
          { name: 'Other / Skip', value: 'skip' }
        ]
      }
    ]);

    if (shell !== 'skip') {
      console.log(chalk.yellow(`📝 Shell Completion Setup (${shell}):`));
      console.log();
      
      switch (shell) {
        case 'bash':
          console.log(colors.info('Add to your ~/.bashrc:'));
          console.log(chalk.cyan('  source <(lanonasis --completion bash)'));
          break;
        case 'zsh':
          console.log(colors.info('Add to your ~/.zshrc:'));
          console.log(chalk.cyan('  source <(lanonasis --completion zsh)'));
          break;
        case 'fish':
          console.log(colors.info('Add to your ~/.config/fish/config.fish:'));
          console.log(chalk.cyan('  lanonasis --completion fish | source'));
          break;
      }
      
      console.log();
      console.log(colors.success('✅ Completions will provide tab completion for all commands'));
    }

    console.log();
    console.log(chalk.yellow('🔗 Useful Aliases:'));
    console.log(colors.info('You can also use these command aliases:'));
    console.log(chalk.cyan('  onasis    # Same as lanonasis (Golden Contract compliant)'));
    console.log(chalk.cyan('  memory    # Direct memory management'));
    console.log(chalk.cyan('  maas      # MaaS-focused interface'));
  }

  private async showCompletionSummary(): Promise<void> {
    console.log(chalk.blue.bold('🎉 Setup Complete!'));
    console.log(colors.info('═'.repeat(30)));
    console.log();

    const completedSteps = this.steps.filter(s => s.completed);
    const totalSteps = this.steps.filter(s => !s.optional).length;
    const completedRequired = completedSteps.filter(s => !s.optional).length;

    console.log(colors.success(`✅ Completed ${completedRequired}/${totalSteps} required steps`));
    if (completedSteps.some(s => s.optional)) {
      console.log(colors.info(`📚 Plus ${completedSteps.filter(s => s.optional).length} optional steps`));
    }
    console.log();

    console.log(chalk.yellow('🚀 You\'re ready to use Onasis-Core CLI!'));
    console.log();

    console.log(colors.info('Next steps:'));
    console.log(chalk.cyan('  lanonasis health     # Check system status'));
    console.log(chalk.cyan('  lanonasis memory list  # View your memories'));
    console.log(chalk.cyan('  lanonasis --help     # Explore all commands'));
    console.log();

    console.log(chalk.gray('💡 Need help? Visit: https://docs.lanonasis.com/cli'));
    console.log(chalk.gray('🌐 Dashboard: https://api.lanonasis.com/dashboard'));
  }
}

export async function guideCommand(): Promise<void> {
  const guide = new UserGuidanceSystem();
  await guide.runGuidedSetup();
}

export async function quickStartCommand(): Promise<void> {
  console.log(chalk.blue.bold('⚡ Onasis-Core CLI Quick Start'));
  console.log(colors.info('═'.repeat(30)));
  console.log();

  const essentialCommands = [
    {
      category: 'Setup',
      commands: [
        { cmd: 'lanonasis init', desc: 'Initialize configuration' },
        { cmd: 'lanonasis login --vendor-key <your-key>', desc: 'Authenticate with vendor key' },
        { cmd: 'lanonasis health', desc: 'Verify system health' }
      ]
    },
    {
      category: 'Memory Management',
      commands: [
        { cmd: 'lanonasis memory create --title "Title" --content "Content"', desc: 'Create memory' },
        { cmd: 'lanonasis memory list', desc: 'List all memories' },
        { cmd: 'lanonasis memory search "query"', desc: 'Search memories' }
      ]
    },
    {
      category: 'Advanced',
      commands: [
        { cmd: 'lanonasis topic create --name "Project"', desc: 'Create topic' },
        { cmd: 'lanonasis mcp status', desc: 'Check MCP server' },
        { cmd: 'lanonasis api-keys list', desc: 'Manage API keys' }
      ]
    }
  ];

  essentialCommands.forEach(category => {
    console.log(colors.accent(`📁 ${category.category}:`));
    category.commands.forEach(({ cmd, desc }) => {
      console.log(`  ${chalk.cyan(cmd)}`);
      console.log(`    ${chalk.gray(desc)}`);
      console.log();
    });
  });

  console.log(colors.info('💡 Pro Tips:'));
  console.log(chalk.gray('  • Use --help with any command for detailed options'));
  console.log(chalk.gray('  • Set up shell completions: lanonasis completion'));
  console.log(chalk.gray('  • Use --verbose for detailed operation logs'));
  console.log();
}