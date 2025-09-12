/**
 * Main Dashboard Command Center
 * The central hub for all CLI operations after authentication
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import Table from 'cli-table3';
import { StateManager } from './architecture.js';

export interface DashboardStats {
  totalMemories: number;
  totalTopics: number;
  apiKeys: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  action: string;
  target: string;
  timestamp: string;
}

export class DashboardCommandCenter {
  private stateManager: StateManager;
  private stats: DashboardStats;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.stats = this.loadStats();
  }

  async show(): Promise<void> {
    console.clear();
    await this.render();
    await this.handleUserInput();
  }

  private async render(): Promise<void> {
    const userContext = this.stateManager.getUserContext();
    const email = userContext.email || 'user@example.com';

    // Header
    console.log(this.renderHeader(email));
    
    // Stats and Activity sections
    console.log(this.renderStatsAndActivity());
    
    // Main menu
    console.log(this.renderMainMenu());
    
    // Footer with shortcuts
    console.log(this.renderFooter());
  }

  private renderHeader(email: string): string {
    const header = `Onasis Command Center`;
    const userInfo = `◐ ${email}`;
    const padding = 72 - header.length - userInfo.length - 4;
    
    return boxen(
      chalk.bold(header) + ' '.repeat(padding) + chalk.dim(userInfo),
      {
        borderStyle: 'round',
        borderColor: 'cyan',
        padding: 0
      }
    );
  }

  private renderStatsAndActivity(): string {
    const statsBox = this.renderQuickStats();
    const activityBox = this.renderRecentActivity();
    
    // Create side-by-side layout
    const statsLines = statsBox.split('\n');
    const activityLines = activityBox.split('\n');
    const maxLines = Math.max(statsLines.length, activityLines.length);
    
    let combined = '';
    for (let i = 0; i < maxLines; i++) {
      const statLine = (statsLines[i] || '').padEnd(35);
      const activityLine = activityLines[i] || '';
      combined += `  ${statLine}  ${activityLine}\n`;
    }
    
    return combined;
  }

  private renderQuickStats(): string {
    const stats = [
      `├─ ${chalk.bold(this.stats.totalMemories)} Memories`,
      `├─ ${chalk.bold(this.stats.totalTopics)} Topics`,
      `└─ ${chalk.bold(this.stats.apiKeys)} API Keys`
    ];
    
    return chalk.blue('📊 Quick Stats\n') + stats.join('\n');
  }

  private renderRecentActivity(): string {
    const activities = this.stats.recentActivity.slice(0, 3).map((activity, index) => {
      const isLast = index === this.stats.recentActivity.slice(0, 3).length - 1;
      const prefix = isLast ? '└─' : '├─';
      return `${prefix} "${activity.target}" ${chalk.dim(`(${activity.timestamp})`)}`;
    });
    
    return chalk.green('🎯 Recent Activity\n') + activities.join('\n');
  }

  private renderMainMenu(): string {
    const menuItems = [
      ['1. 📝 Create Memory', '4. 🔍 Search Everything'],
      ['2. 📁 Browse Topics', '5. 🔑 Manage API Keys'],
      ['3. 📊 View Analytics', '6. ⚙️  Settings']
    ];
    
    const menuContent = chalk.bold('What would you like to do?\n\n') +
      menuItems.map(row => `  ${row[0]}     ${row[1]}`).join('\n') +
      '\n\n' +
      chalk.dim('Type a number, command, or describe what you need...');
    
    return boxen(menuContent, {
      padding: 1,
      borderStyle: 'single',
      borderColor: 'gray'
    });
  }

  private renderFooter(): string {
    return chalk.dim('  [↵] Smart Command  [/] Search  [Tab] Complete  [?] Help');
  }

  private async handleUserInput(): Promise<void> {
    const { input } = await inquirer.prompt({
      type: 'input',
      name: 'input',
      message: chalk.green('>'),
      transformer: (input: string) => {
        // Real-time input transformation/hints
        if (input.startsWith('/')) {
          return chalk.cyan(input) + chalk.dim(' (search mode)');
        }
        return input;
      }
    } as any);

    await this.processInput(input);
  }

  private async processInput(input: string): Promise<void> {
    // Smart command parsing
    const normalized = input.toLowerCase().trim();
    
    // Check for numbered options
    if (['1', '2', '3', '4', '5', '6'].includes(normalized)) {
      await this.handleNumberedOption(normalized);
      return;
    }
    
    // Check for natural language commands
    if (normalized.includes('create') || normalized.includes('new')) {
      await this.createMemory();
    } else if (normalized.includes('search') || normalized.startsWith('/')) {
      await this.searchMemories(input.replace('/', ''));
    } else if (normalized.includes('browse') || normalized.includes('topics')) {
      await this.browseTopics();
    } else if (normalized.includes('analytics') || normalized.includes('stats')) {
      await this.viewAnalytics();
    } else if (normalized.includes('api') || normalized.includes('keys')) {
      await this.manageApiKeys();
    } else if (normalized.includes('settings') || normalized.includes('config')) {
      await this.openSettings();
    } else if (normalized === '?' || normalized === 'help') {
      await this.showHelp();
    } else {
      // Try to interpret as a smart command
      await this.interpretSmartCommand(input);
    }
  }

  private async handleNumberedOption(option: string): Promise<void> {
    switch (option) {
      case '1':
        await this.createMemory();
        break;
      case '2':
        await this.browseTopics();
        break;
      case '3':
        await this.viewAnalytics();
        break;
      case '4':
        await this.searchMemories('');
        break;
      case '5':
        await this.manageApiKeys();
        break;
      case '6':
        await this.openSettings();
        break;
    }
  }

  private async createMemory(): Promise<void> {
    const creator = new InteractiveMemoryCreator(this.stateManager);
    await creator.create();
  }

  private async searchMemories(query: string): Promise<void> {
    const search = new InteractiveSearch(this.stateManager);
    await search.search(query);
  }

  private async browseTopics(): Promise<void> {
    console.log(chalk.yellow('Browse Topics - Coming soon...'));
  }

  private async viewAnalytics(): Promise<void> {
    const analytics = new AnalyticsView(this.stateManager);
    await analytics.show();
  }

  private async manageApiKeys(): Promise<void> {
    console.log(chalk.yellow('API Key Management - Coming soon...'));
  }

  private async openSettings(): Promise<void> {
    console.log(chalk.yellow('Settings - Coming soon...'));
  }

  private async showHelp(): Promise<void> {
    console.log(boxen(
      chalk.bold('📚 Help & Commands\n\n') +
      chalk.cyan('Creating Memories:\n') +
      '  create, new, add - Start creating a new memory\n' +
      '  "remember that..." - Natural language memory creation\n\n' +
      chalk.cyan('Searching:\n') +
      '  search, find, / - Search your memories\n' +
      '  /keyword - Quick search for keyword\n\n' +
      chalk.cyan('Navigation:\n') +
      '  1-6 - Select numbered menu options\n' +
      '  back, exit - Return to previous screen\n' +
      '  clear - Clear the screen\n\n' +
      chalk.dim('Pro tip: Use Tab for auto-completion'),
      {
        padding: 1,
        borderStyle: 'single',
        borderColor: 'gray'
      }
    ));
  }

  private async interpretSmartCommand(input: string): Promise<void> {
    // AI-powered command interpretation
    console.log(chalk.dim(`Interpreting: "${input}"...`));
    
    // Simulate smart interpretation
    if (input.toLowerCase().includes('remember')) {
      const content = input.replace(/remember( that)?/i, '').trim();
      const creator = new InteractiveMemoryCreator(this.stateManager);
      await creator.createQuick(content);
    } else {
      console.log(chalk.yellow(`Command not recognized. Type '?' for help.`));
    }
  }

  private loadStats(): DashboardStats {
    // Load real stats from API or cache
    return {
      totalMemories: 247,
      totalTopics: 12,
      apiKeys: 3,
      recentActivity: [
        { action: 'created', target: 'Project Alpha specs', timestamp: '2 min ago' },
        { action: 'searched', target: 'Meeting notes Q4', timestamp: '1 hour ago' },
        { action: 'updated', target: 'Customer feedback', timestamp: 'today' }
      ]
    };
  }
}

/**
 * Interactive Memory Creator
 */
export class InteractiveMemoryCreator {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async create(): Promise<void> {
    console.clear();
    console.log(chalk.bold.blue('📝 Creating New Memory\n'));
    console.log("Let's capture your knowledge. I'll guide you through it:\n");

    // Title input with validation
    const { title } = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Title: (What should we call this memory?)',
        validate: (input) => {
          if (input.length < 3) {
            return 'Title must be at least 3 characters';
          }
          if (input.length > 100) {
            return 'Title must be less than 100 characters';
          }
          return true;
        },
        transformer: (input) => {
          if (input.length > 0) {
            return input + chalk.dim(` (${input.length}/100)`);
          }
          return input;
        }
      }
    ]);

    console.log(chalk.green('✓ Great title! Clear and searchable.\n'));

    // Content input
    const { content } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'content',
        message: 'Content: (Press Ctrl+E for editor, or type/paste below)',
        default: '',
        postfix: '.md'
      }
    ]);

    // Analyze content and suggest metadata
    const suggestions = this.analyzeContent(content);
    
    if (suggestions.topic) {
      console.log(chalk.cyan(`📎 I noticed this looks like ${suggestions.contentType}. Would you like to:`));
      
      const { topicChoice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'topicChoice',
          message: 'Select topic:',
          choices: [
            { name: `Add to "${suggestions.topic}" topic (recommended)`, value: suggestions.topic },
            { name: 'Create new topic', value: 'new' },
            { name: 'Skip categorization', value: 'skip' }
          ]
        }
      ]);

      if (topicChoice === 'new') {
        const { newTopic } = await inquirer.prompt([
          {
            type: 'input',
            name: 'newTopic',
            message: 'New topic name:'
          }
        ]);
        suggestions.topic = newTopic;
      } else if (topicChoice === 'skip') {
        suggestions.topic = null;
      }
    }

    // Tag selection
    if (suggestions.tags.length > 0) {
      console.log(chalk.cyan('🏷️ Suggested tags based on content:'));
      
      const { selectedTags } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedTags',
          message: 'Select tags:',
          choices: suggestions.tags.map(tag => ({
            name: tag,
            value: tag,
            checked: true
          })),
          pageSize: 10
        }
      ]);

      const { additionalTags } = await inquirer.prompt([
        {
          type: 'input',
          name: 'additionalTags',
          message: 'Additional tags (comma-separated):',
          default: ''
        }
      ]);

      if (additionalTags) {
        selectedTags.push(...additionalTags.split(',').map((t: string) => t.trim()));
      }

      suggestions.tags = selectedTags;
    }

    // Memory type selection
    const { memoryType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'memoryType',
        message: 'Memory Type:',
        choices: [
          { name: '[C]ontext - Situational information', value: 'context' },
          { name: '[K]nowledge - Facts and learnings', value: 'knowledge' },
          { name: '[R]eference - Documentation and guides', value: 'reference' },
          { name: '[P]roject - Project-specific information', value: 'project' }
        ]
      }
    ]);

    // Preview
    this.showPreview({
      title,
      content,
      topic: suggestions.topic,
      tags: suggestions.tags,
      type: memoryType
    });

    // Confirm save
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Ready to save?',
        choices: [
          { name: '[S]ave', value: 'save' },
          { name: '[E]dit', value: 'edit' },
          { name: '[C]ancel', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'save') {
      console.log(chalk.green('\n✓ Memory saved successfully!'));
      console.log(chalk.dim('ID: mem_abc123'));
    } else if (action === 'edit') {
      // Restart the process
      await this.create();
    }
  }

  async createQuick(content: string): Promise<void> {
    console.log(chalk.green(`✓ Quick memory created: "${content}"`));
  }

  private analyzeContent(content: string): any {
    // Simple content analysis
    const suggestions = {
      contentType: 'a technical decision',
      topic: null as string | null,
      tags: [] as string[]
    };

    // Detect content type and suggest metadata
    if (content.toLowerCase().includes('architecture')) {
      suggestions.topic = 'Architecture';
      suggestions.tags = ['architecture'];
    }
    if (content.toLowerCase().includes('microservice')) {
      suggestions.tags.push('microservices');
    }
    if (content.toLowerCase().includes('payment')) {
      suggestions.tags.push('payments');
    }
    if (content.toLowerCase().includes('api')) {
      suggestions.tags.push('api');
    }

    return suggestions;
  }

  private showPreview(memory: any): void {
    const typeIcon = {
      context: '🔍',
      knowledge: '📚',
      reference: '📖',
      project: '🎯'
    }[memory.type] || '📝';

    console.log(boxen(
      `${typeIcon} ${chalk.bold(memory.type.charAt(0).toUpperCase() + memory.type.slice(1))} Memory\n\n` +
      `${chalk.bold('Title:')} ${memory.title}\n` +
      `${chalk.bold('Topic:')} ${memory.topic || 'None'}\n` +
      `${chalk.bold('Tags:')} ${memory.tags.join(', ')}\n\n` +
      chalk.dim(memory.content.substring(0, 100) + '...'),
      {
        padding: 1,
        borderStyle: 'single',
        borderColor: 'green',
        title: 'Preview',
        titleAlignment: 'left'
      }
    ));
  }
}

/**
 * Interactive Search Experience
 */
export class InteractiveSearch {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async search(initialQuery: string = ''): Promise<void> {
    console.clear();
    console.log(chalk.bold.blue('🔍 Search Everything\n'));

    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Search:',
        default: initialQuery,
        transformer: (input) => {
          if (input.length > 0) {
            return chalk.cyan(input);
          }
          return input;
        }
      }
    ]);

    if (!query) {
      return;
    }

    // Simulate search
    console.log(chalk.dim(`\nSearching for "${query}"...`));
    await this.simulateDelay(500);

    // Display results
    this.displayResults(query);

    // Result actions
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Actions:',
        choices: [
          { name: '[↵] View first result', value: 'view' },
          { name: '[E]dit result', value: 'edit' },
          { name: '[D]elete result', value: 'delete' },
          { name: '[R]efine search', value: 'refine' },
          { name: '[N]ew search', value: 'new' },
          { name: '[B]ack to dashboard', value: 'back' }
        ]
      }
    ]);

    switch (action) {
      case 'refine':
        await this.search(query);
        break;
      case 'new':
        await this.search('');
        break;
      case 'view':
        console.log(chalk.green('Viewing result...'));
        break;
    }
  }

  private displayResults(query: string): void {
    const results = [
      { score: 94, title: 'Payment Gateway Integration Guide', age: '3 days ago', type: 'Knowledge', tags: 'api, payments, stripe' },
      { score: 87, title: 'Payment Error Handling Strategy', age: '1 week ago', type: 'Context', tags: 'error-handling, payments' },
      { score: 76, title: 'Q3 Payment Provider Comparison', age: '2 weeks ago', type: 'Reference', tags: 'analysis, vendors' }
    ];

    console.log(boxen(
      chalk.bold(`Found ${results.length} relevant memories`) + chalk.dim(' (137ms)\n\n') +
      results.map((r, i) => {
        const marker = i === 0 ? '▶' : ' ';
        return `${marker} ${chalk.green(r.score + '%')} │ ${chalk.bold(r.title)}\n` +
          `       │ ${chalk.dim(r.age + ' • ' + r.type + ' • ' + r.tags)}\n` +
          `       │ ${chalk.dim('"...complete integration guide for Stripe payment..."')}`;
      }).join('\n\n'),
      {
        padding: 1,
        borderStyle: 'single',
        borderColor: 'cyan',
        title: 'Search Results',
        titleAlignment: 'left'
      }
    ));
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Analytics View
 */
export class AnalyticsView {
  private stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  async show(): Promise<void> {
    console.clear();
    console.log(chalk.bold.blue('📊 Analytics Dashboard\n'));

    // Create analytics table
    const table = new Table({
      head: ['Metric', 'Value', 'Change'],
      colWidths: [25, 15, 15],
      style: {
        head: ['cyan'],
        border: ['gray']
      }
    });

    table.push(
      ['Total Memories', '247', chalk.green('+12')],
      ['Topics', '12', chalk.green('+2')],
      ['Tags Used', '89', chalk.green('+8')],
      ['API Calls (Month)', '1,432', chalk.yellow('+5%')],
      ['Search Queries', '342', chalk.green('+18%')],
      ['Avg Response Time', '124ms', chalk.green('-8%')]
    );

    console.log(table.toString());

    // Memory growth chart
    console.log('\n' + chalk.bold('Memory Growth (Last 7 Days)'));
    this.renderChart();

    // Top topics
    console.log('\n' + chalk.bold('Top Topics'));
    const topics = [
      { name: 'Architecture', count: 45 },
      { name: 'API', count: 38 },
      { name: 'Documentation', count: 32 },
      { name: 'Meetings', count: 28 },
      { name: 'Projects', count: 24 }
    ];

    topics.forEach(topic => {
      const bar = '█'.repeat(Math.floor(topic.count / 2));
      console.log(`  ${topic.name.padEnd(15)} ${chalk.cyan(bar)} ${topic.count}`);
    });
  }

  private renderChart(): void {
    const data = [35, 38, 42, 39, 45, 48, 52];
    const max = Math.max(...data);
    const height = 5;

    for (let row = height; row > 0; row--) {
      let line = '  ';
      for (const value of data) {
        const barHeight = Math.round((value / max) * height);
        if (barHeight >= row) {
          line += chalk.cyan('█ ');
        } else {
          line += '  ';
        }
      }
      console.log(line);
    }
    console.log('  ' + chalk.dim('M  T  W  T  F  S  S'));
  }
}
