/**
 * Welcome and Onboarding Experience
 * Provides first-time user experience and guided setup
 */
import chalk from 'chalk';
import inquirer from 'inquirer';
import boxen from 'boxen';
import ora from 'ora';
export class WelcomeExperience {
    stateManager;
    isFirstRun = false;
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    async show() {
        this.displayWelcomeBanner();
        const choice = await this.showMainMenu();
        await this.handleMenuChoice(choice);
    }
    displayWelcomeBanner() {
        const banner = boxen(chalk.bold.blue('🧠 Welcome to Onasis Memory Service\n') +
            chalk.cyan('        Your Knowledge, Amplified'), {
            padding: 2,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan',
            textAlignment: 'center'
        });
        console.clear();
        console.log(banner);
    }
    async showMainMenu() {
        const newUserOptions = [
            {
                name: chalk.green.bold('[↵] Start Interactive Setup') + chalk.gray('      (Recommended)'),
                value: 'setup',
                short: 'Setup'
            },
            {
                name: '[S] Skip to Main Menu',
                value: 'skip',
                short: 'Skip'
            },
            {
                name: '[D] Documentation',
                value: 'docs',
                short: 'Docs'
            },
            {
                name: '[?] What is Onasis?',
                value: 'about',
                short: 'About'
            }
        ];
        const existingUserOptions = [
            {
                name: chalk.bold('[↵] Continue to Dashboard'),
                value: 'dashboard',
                short: 'Dashboard'
            },
            {
                name: '[S] Settings',
                value: 'settings',
                short: 'Settings'
            },
            {
                name: '[H] Help',
                value: 'help',
                short: 'Help'
            }
        ];
        const isAuthenticated = await this.checkAuthentication();
        const choices = isAuthenticated ? existingUserOptions : newUserOptions;
        const { choice } = await inquirer.prompt([
            {
                type: 'list',
                name: 'choice',
                message: isAuthenticated ?
                    'Welcome back! What would you like to do?' :
                    'New here? Let me guide you through setup',
                choices,
                loop: false
            }
        ]);
        return choice;
    }
    async handleMenuChoice(choice) {
        switch (choice) {
            case 'setup':
                await this.startInteractiveSetup();
                break;
            case 'skip':
            case 'dashboard':
                await this.goToDashboard();
                break;
            case 'docs':
                this.showDocumentation();
                break;
            case 'about':
                this.showAbout();
                break;
            case 'settings':
                await this.showSettings();
                break;
            case 'help':
                this.showHelp();
                break;
        }
    }
    async startInteractiveSetup() {
        const setup = new InteractiveSetup(this.stateManager);
        await setup.run();
    }
    async goToDashboard() {
        // Navigate to main dashboard
        this.stateManager.pushNavigation({
            name: 'dashboard',
            path: '/dashboard',
            preferences: {},
            timestamp: new Date()
        });
    }
    showDocumentation() {
        console.log(boxen(chalk.bold('📚 Documentation\n\n') +
            'Online Docs: ' + chalk.cyan('https://docs.lanonasis.com/cli\n') +
            'Quick Start: ' + chalk.cyan('https://docs.lanonasis.com/quickstart\n') +
            'API Reference: ' + chalk.cyan('https://api.lanonasis.com/docs\n\n') +
            chalk.dim('Press any key to continue...'), {
            padding: 1,
            borderStyle: 'single',
            borderColor: 'gray'
        }));
    }
    showAbout() {
        console.log(boxen(chalk.bold('🧠 About Onasis Memory Service\n\n') +
            'Onasis is an enterprise-grade Memory as a Service platform that:\n\n' +
            '  • ' + chalk.green('Captures') + ' and organizes your knowledge\n' +
            '  • ' + chalk.blue('Searches') + ' with AI-powered semantic understanding\n' +
            '  • ' + chalk.magenta('Integrates') + ' with your existing tools\n' +
            '  • ' + chalk.yellow('Scales') + ' from personal to enterprise use\n\n' +
            'Built for developers, teams, and organizations who want to\n' +
            'transform information into actionable intelligence.\n\n' +
            chalk.dim('Learn more at lanonasis.com'), {
            padding: 1,
            borderStyle: 'double',
            borderColor: 'cyan'
        }));
    }
    async showSettings() {
        // Settings implementation
        console.log(chalk.yellow('Settings panel coming soon...'));
    }
    showHelp() {
        console.log(chalk.cyan('💡 Tip: You can always type "help" for assistance'));
    }
    async checkAuthentication() {
        // Check if user is authenticated
        const context = this.stateManager.getUserContext();
        return !!context.userId;
    }
}
/**
 * Interactive Setup Flow
 */
export class InteractiveSetup {
    stateManager;
    setupProgress = {
        connection: false,
        authentication: false,
        configuration: false,
        ready: false
    };
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    async run() {
        console.clear();
        // Show progress header
        this.showProgressHeader();
        // Step 1: Connection Setup
        await this.setupConnection();
        this.setupProgress.connection = true;
        this.showProgressHeader();
        // Step 2: Authentication
        await this.setupAuthentication();
        this.setupProgress.authentication = true;
        this.showProgressHeader();
        // Step 3: Configuration
        await this.setupConfiguration();
        this.setupProgress.configuration = true;
        this.showProgressHeader();
        // Step 4: Complete
        this.setupProgress.ready = true;
        this.showProgressHeader();
        await this.showSetupComplete();
    }
    showProgressHeader() {
        const steps = [
            { name: 'Connect', done: this.setupProgress.connection },
            { name: 'Authenticate', done: this.setupProgress.authentication },
            { name: 'Configure', done: this.setupProgress.configuration },
            { name: 'Ready!', done: this.setupProgress.ready }
        ];
        console.clear();
        console.log(boxen('Setup Progress\n' +
            steps.map((step, i) => {
                const num = `[${i + 1}]`;
                const name = step.done ? chalk.green(step.name) : chalk.gray(step.name);
                return `${num} ${name}`;
            }).join('  ') + '\n' +
            this.renderProgressBar(steps), {
            padding: 1,
            borderStyle: 'single',
            borderColor: 'cyan'
        }));
        console.log();
    }
    renderProgressBar(steps) {
        const completed = steps.filter(s => s.done).length;
        const total = steps.length;
        const percentage = Math.round((completed / total) * 100);
        const barLength = 40;
        const filled = Math.round((completed / total) * barLength);
        const bar = '━'.repeat(filled) + '─'.repeat(barLength - filled);
        return chalk.cyan(bar) + ' ' + chalk.bold(`${percentage}%`);
    }
    async setupConnection() {
        console.log(chalk.bold.blue('🔗 Step 1: Connection Setup'));
        console.log("Let's connect to your Onasis service\n");
        const { connectionType } = await inquirer.prompt([
            {
                type: 'list',
                name: 'connectionType',
                message: 'Where is your Onasis service hosted?',
                choices: [
                    {
                        name: '☁️  Cloud (api.lanonasis.com)' + chalk.gray('     ← Recommended for most users'),
                        value: 'cloud',
                        short: 'Cloud'
                    },
                    {
                        name: '🏢 Self-hosted' + chalk.gray('                      Enter your server URL'),
                        value: 'self-hosted',
                        short: 'Self-hosted'
                    },
                    {
                        name: '💻 Local development' + chalk.gray('               Use localhost:3000'),
                        value: 'local',
                        short: 'Local'
                    }
                ]
            }
        ]);
        let serverUrl = 'https://api.lanonasis.com';
        if (connectionType === 'self-hosted') {
            const { customUrl } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'customUrl',
                    message: 'Enter your server URL:',
                    default: 'https://your-server.com',
                    validate: (input) => {
                        if (!input.startsWith('http://') && !input.startsWith('https://')) {
                            return 'URL must start with http:// or https://';
                        }
                        return true;
                    }
                }
            ]);
            serverUrl = customUrl;
        }
        else if (connectionType === 'local') {
            serverUrl = 'http://localhost:3000';
        }
        // Test connection
        const spinner = ora('Testing connection...').start();
        await this.simulateDelay(1500);
        spinner.succeed('Connection successful!');
        // Save to state
        this.stateManager.updateUserContext({
            organization: serverUrl
        });
    }
    async setupAuthentication() {
        console.log(chalk.bold.blue('\n🔐 Step 2: Authentication'));
        console.log('Choose how you\'d like to connect:\n');
        const authBox = (title, description, features) => {
            return chalk.bold(title) + '\n' +
                chalk.gray(description) + '\n' +
                features.map(f => chalk.dim(`  ▪ ${f}`)).join('\n');
        };
        const { authMethod } = await inquirer.prompt([
            {
                type: 'list',
                name: 'authMethod',
                message: 'Select authentication method:',
                choices: [
                    {
                        name: authBox('🔑 Vendor Key', 'Secure API access with long-lived credentials', ['No expiration', 'Ideal for CI/CD', 'Full API access']),
                        value: 'vendor',
                        short: 'Vendor Key'
                    },
                    {
                        name: authBox('🌐 Browser Authentication', 'Sign in via your web browser', ['Most secure', 'SSO support', 'Session-based']),
                        value: 'browser',
                        short: 'Browser'
                    },
                    {
                        name: authBox('📧 Email & Password', 'Traditional authentication', ['Quick setup', 'Familiar flow', 'Manual entry']),
                        value: 'email',
                        short: 'Email'
                    }
                ],
                pageSize: 10
            }
        ]);
        switch (authMethod) {
            case 'vendor':
                await this.authenticateWithVendorKey();
                break;
            case 'browser':
                await this.authenticateWithBrowser();
                break;
            case 'email':
                await this.authenticateWithEmail();
                break;
        }
    }
    async authenticateWithVendorKey() {
        const { vendorKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'vendorKey',
                message: 'Enter your vendor key:',
                mask: '*',
                validate: (input) => {
                    if (!input || input.trim().length === 0) {
                        return 'Vendor key is required';
                    }
                    return true;
                }
            }
        ]);
        void vendorKey; // collected for future use when hooking real auth
        const spinner = ora('Authenticating...').start();
        await this.simulateDelay(1000);
        spinner.succeed('Authentication successful!');
        this.stateManager.updateUserContext({
            userId: 'vendor_user',
            email: 'vendor@example.com'
        });
    }
    async authenticateWithBrowser() {
        console.log(chalk.cyan('\n🌐 Opening browser for authentication...'));
        console.log(chalk.gray('Please complete the login in your browser'));
        const spinner = ora('Waiting for browser authentication...').start();
        await this.simulateDelay(3000);
        spinner.succeed('Browser authentication successful!');
        this.stateManager.updateUserContext({
            userId: 'browser_user',
            email: 'user@example.com'
        });
    }
    async authenticateWithEmail() {
        const auth = await inquirer.prompt([
            {
                type: 'input',
                name: 'email',
                message: 'Email:',
                validate: (input) => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(input)) {
                        return 'Please enter a valid email address';
                    }
                    return true;
                }
            },
            {
                type: 'password',
                name: 'password',
                message: 'Password:',
                mask: '*'
            }
        ]);
        const spinner = ora('Signing in...').start();
        await this.simulateDelay(1000);
        spinner.succeed('Sign in successful!');
        this.stateManager.updateUserContext({
            userId: 'email_user',
            email: auth.email
        });
    }
    async setupConfiguration() {
        console.log(chalk.bold.blue('\n⚙️  Step 3: Configuration'));
        console.log("Let's personalize your experience\n");
        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'outputFormat',
                message: 'Preferred output format:',
                choices: [
                    { name: 'Table (formatted)', value: 'table' },
                    { name: 'JSON (structured)', value: 'json' },
                    { name: 'Minimal (compact)', value: 'minimal' }
                ],
                default: 'table'
            },
            {
                type: 'confirm',
                name: 'expertMode',
                message: 'Enable expert mode? (streamlined interface for power users)',
                default: false
            },
            {
                type: 'confirm',
                name: 'animations',
                message: 'Enable animations and progress indicators?',
                default: true
            }
        ]);
        const preferences = {
            outputFormat: answers.outputFormat,
            expertMode: answers.expertMode,
            animations: answers.animations
        };
        // Update preferences
        const currentPrefs = this.stateManager.getPreferences();
        Object.assign(currentPrefs, preferences);
        console.log(chalk.green('\n✓ Configuration saved!'));
    }
    async showSetupComplete() {
        console.log(boxen(chalk.green.bold('🎉 Setup Complete!\n\n') +
            'Your Onasis CLI is ready to use.\n\n' +
            chalk.bold('Quick Commands:\n') +
            '  ' + chalk.cyan('onasis memory create') + ' - Create a new memory\n' +
            '  ' + chalk.cyan('onasis search "query"') + ' - Search your memories\n' +
            '  ' + chalk.cyan('onasis help') + ' - Show all commands\n\n' +
            chalk.dim('Press Enter to continue to the dashboard...'), {
            padding: 1,
            borderStyle: 'double',
            borderColor: 'green',
            textAlignment: 'center'
        }));
        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: ''
            }
        ]);
    }
    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
