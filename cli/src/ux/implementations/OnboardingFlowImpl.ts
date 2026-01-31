/**
 * Onboarding Flow Implementation
 *
 * Guides new users through initial setup and configuration
 * Implementation of the OnboardingFlow interface.
 */

import { promises as fs, accessSync } from 'fs';
import { join, dirname } from 'path';
import {
  OnboardingFlow,
  SetupResult,
  TestResult,
  UserPreferences,
  OnboardingState,
} from '../interfaces/OnboardingFlow.js';
import { ConnectionManagerImpl } from './ConnectionManagerImpl.js';
import { TextInputHandlerImpl } from './TextInputHandlerImpl.js';

/**
 * Default user preferences
 */
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  inputMode: 'inline',
  preferredEditor: undefined,
  autoStartMCP: true,
  showOnboardingTips: true,
  verboseErrors: false,
};

/**
 * OnboardingFlowImpl guides new users through initial setup and configuration
 *
 * This implementation detects first-run scenarios, creates working default configurations,
 * tests all major functionality, and provides interactive demonstrations.
 */
export class OnboardingFlowImpl implements OnboardingFlow {
  private onboardingState: OnboardingState;
  private configPath: string;
  private connectionManager: ConnectionManagerImpl;
  private textInputHandler: TextInputHandlerImpl;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), '.lanonasis', 'onboarding.json');
    this.connectionManager = new ConnectionManagerImpl();
    this.textInputHandler = new TextInputHandlerImpl();

    this.onboardingState = {
      isFirstRun: true,
      currentStep: 0,
      totalSteps: 5,
      completedSteps: [],
      skippedSteps: [],
      userPreferences: { ...DEFAULT_USER_PREFERENCES },
    };
  }

  /**
   * Run the complete initial setup process for new users
   */
  async runInitialSetup(): Promise<SetupResult> {
    console.log('🚀 Welcome to LanOnasis CLI!');
    console.log("Let's get you set up for success...\n");

    const result: SetupResult = {
      completed: false,
      mcpConfigured: false,
      memorySystemReady: false,
      issues: [],
    };

    try {
      // Step 1: Detect first run and load existing state
      this.onboardingState.isFirstRun = this.detectFirstRun();
      if (!this.onboardingState.isFirstRun) {
        await this.loadOnboardingState();
      }

      // Step 2: Configure defaults
      console.log('📋 Step 1/5: Configuring default settings...');
      await this.configureDefaults();
      this.onboardingState.completedSteps.push('configure-defaults');
      this.onboardingState.currentStep = 1;

      // Step 3: Set up MCP connection
      console.log('🔌 Step 2/5: Setting up MCP server connection...');
      const mcpResult = await this.connectionManager.autoConfigureLocalServer();
      if (mcpResult.success) {
        result.mcpConfigured = true;
        console.log('✅ MCP server configured successfully');
      } else {
        result.issues?.push(`MCP configuration failed: ${mcpResult.error}`);
        console.log(`⚠️  MCP configuration issue: ${mcpResult.error}`);
      }
      this.onboardingState.completedSteps.push('configure-mcp');
      this.onboardingState.currentStep = 2;

      // Step 4: Test connectivity
      console.log('🧪 Step 3/5: Testing system connectivity...');
      const testResults = await this.testConnectivity();
      const failedTests = testResults.filter((t) => t.status === 'fail');
      if (failedTests.length === 0) {
        result.memorySystemReady = true;
        console.log('✅ All connectivity tests passed');
      } else {
        failedTests.forEach((test) => {
          result.issues?.push(`${test.component}: ${test.message}`);
        });
        console.log(`⚠️  ${failedTests.length} connectivity test(s) failed`);
      }
      this.onboardingState.completedSteps.push('test-connectivity');
      this.onboardingState.currentStep = 3;

      // Step 5: Gather user preferences
      console.log('⚙️  Step 4/5: Configuring your preferences...');
      await this.gatherUserPreferences();
      this.onboardingState.completedSteps.push('gather-preferences');
      this.onboardingState.currentStep = 4;

      // Step 6: Show welcome demo
      console.log('🎉 Step 5/5: Welcome demonstration...');
      await this.showWelcomeDemo();
      this.onboardingState.completedSteps.push('welcome-demo');
      this.onboardingState.currentStep = 5;

      // Complete onboarding
      await this.completeOnboarding();
      result.completed = true;

      console.log('\n🎊 Onboarding completed successfully!');
      console.log("You're ready to start using LanOnasis CLI.");
    } catch (error) {
      result.issues?.push(
        `Onboarding failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error('❌ Onboarding failed:', error);
    }

    return result;
  }

  /**
   * Detect if this is a first-run scenario
   */
  detectFirstRun(): boolean {
    try {
      const configDir = dirname(this.configPath);
      // Check for existing configuration files in the configured directory
      const configPaths = [
        join(configDir, 'config.json'),
        join(configDir, 'onboarding.json'),
        join(configDir, 'mcp-config.json'),
      ];

      for (const configPath of configPaths) {
        try {
          accessSync(configPath);
          return false; // Config exists, not first run
        } catch {
          // Config doesn't exist, continue checking
        }
      }

      return true; // No configs found, first run
    } catch {
      return true; // Error checking, assume first run
    }
  }

  /**
   * Configure working default settings for immediate productivity
   */
  async configureDefaults(): Promise<void> {
    try {
      // Ensure config directory exists
      await fs.mkdir(dirname(this.configPath), { recursive: true });

      // Set up default user preferences
      this.onboardingState.userPreferences = { ...DEFAULT_USER_PREFERENCES };

      // Create default CLI configuration
      const defaultConfig = {
        apiUrl: 'https://api.lanonasis.com',
        outputFormat: 'table',
        verboseLogging: false,
        autoMcpConnect: true,
        inputMode: 'inline',
      };

      const cliConfigPath = join(dirname(this.configPath), 'config.json');
      await fs.writeFile(cliConfigPath, JSON.stringify(defaultConfig, null, 2));

      console.log('✅ Default configuration created');
    } catch (error) {
      throw new Error(
        `Failed to configure defaults: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Test connectivity and functionality of all major components
   */
  async testConnectivity(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test 1: MCP Server Detection
    try {
      const serverPath = await this.connectionManager.detectServerPath();
      if (serverPath) {
        results.push({
          component: 'MCP Server Detection',
          status: 'pass',
          message: 'MCP server found and accessible',
          details: `Server path: ${serverPath}`,
        });
      } else {
        results.push({
          component: 'MCP Server Detection',
          status: 'fail',
          message: 'MCP server not found',
          details: 'Could not locate embedded MCP server',
        });
      }
    } catch (error) {
      results.push({
        component: 'MCP Server Detection',
        status: 'fail',
        message: 'MCP server detection failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 2: Text Input Handler
    try {
      const handler = new TextInputHandlerImpl();
      // Test basic functionality without actually prompting user
      const session = handler.getCurrentSession();
      results.push({
        component: 'Text Input Handler',
        status: 'pass',
        message: 'Text input handler initialized successfully',
      });
    } catch (error) {
      results.push({
        component: 'Text Input Handler',
        status: 'fail',
        message: 'Text input handler initialization failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 3: File System Permissions
    try {
      const testPath = join(dirname(this.configPath), 'test-write.tmp');
      await fs.writeFile(testPath, 'test');
      await fs.unlink(testPath);
      results.push({
        component: 'File System Permissions',
        status: 'pass',
        message: 'Configuration directory is writable',
      });
    } catch (error) {
      results.push({
        component: 'File System Permissions',
        status: 'fail',
        message: 'Cannot write to configuration directory',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    // Test 4: Terminal Capabilities
    try {
      const isTTY = process.stdin.isTTY && process.stdout.isTTY;
      if (isTTY) {
        results.push({
          component: 'Terminal Capabilities',
          status: 'pass',
          message: 'Terminal supports interactive input',
        });
      } else {
        results.push({
          component: 'Terminal Capabilities',
          status: 'warning',
          message: 'Terminal may not support interactive input',
          details: 'Some features may be limited in non-TTY environments',
        });
      }
    } catch (error) {
      results.push({
        component: 'Terminal Capabilities',
        status: 'fail',
        message: 'Terminal capability check failed',
        details: error instanceof Error ? error.message : String(error),
      });
    }

    return results;
  }

  /**
   * Show welcome demonstration of key features
   */
  async showWelcomeDemo(): Promise<void> {
    console.log('\n🎯 Welcome to LanOnasis CLI!');
    console.log('Here are some key features you can use:');
    console.log('');

    console.log('📝 Memory Management:');
    console.log('  • lanonasis memory create    - Create new memories with inline text input');
    console.log('  • lanonasis memory list      - List your existing memories');
    console.log('  • lanonasis memory search    - Search through your memories');
    console.log('');

    console.log('🔌 MCP Integration:');
    console.log('  • lanonasis mcp connect --local  - Connect to local MCP server');
    console.log('  • lanonasis mcp status           - Check MCP connection status');
    console.log('');

    console.log('⚙️  Configuration:');
    console.log('  • lanonasis config show     - View current configuration');
    console.log('  • lanonasis health          - Check system health');
    console.log('');

    console.log('💡 Pro Tips:');
    console.log('  • Use Ctrl+D to finish multi-line input');
    console.log('  • Use Ctrl+C to cancel operations');
    console.log('  • Add --help to any command for detailed usage');
    console.log('');

    console.log('📚 Need help? Visit: https://api.lanonasis.com/docs');
    console.log('');

    // Simulate a brief pause for user to read
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  /**
   * Get the current onboarding state
   */
  getOnboardingState(): OnboardingState {
    return { ...this.onboardingState };
  }

  /**
   * Update user preferences during onboarding
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const sanitizedPreferences = Object.fromEntries(
      Object.entries(preferences).filter(([, value]) => value !== undefined && value !== null),
    ) as Partial<UserPreferences>;

    this.onboardingState.userPreferences = {
      ...this.onboardingState.userPreferences,
      ...sanitizedPreferences,
    };
    await this.saveOnboardingState();
  }

  /**
   * Skip the current onboarding step
   */
  async skipCurrentStep(reason?: string): Promise<void> {
    const stepName = `step-${this.onboardingState.currentStep}`;
    this.onboardingState.skippedSteps.push(stepName);
    if (reason) {
      console.log(`⏭️  Skipping step: ${reason}`);
    }
    this.onboardingState.currentStep++;
    await this.saveOnboardingState();
  }

  /**
   * Complete the onboarding process
   */
  async completeOnboarding(): Promise<void> {
    this.onboardingState.currentStep = this.onboardingState.totalSteps;
    this.onboardingState.isFirstRun = false;

    // Save final state
    await this.saveOnboardingState();

    // Save user preferences to CLI config
    const cliConfigPath = join(dirname(this.configPath), 'config.json');
    try {
      const existingConfig = JSON.parse(await fs.readFile(cliConfigPath, 'utf-8'));
      const updatedConfig = {
        ...existingConfig,
        userPreferences: this.onboardingState.userPreferences,
      };
      await fs.writeFile(cliConfigPath, JSON.stringify(updatedConfig, null, 2));
    } catch {
      // If config doesn't exist, create it with preferences
      const config = {
        userPreferences: this.onboardingState.userPreferences,
      };
      await fs.writeFile(cliConfigPath, JSON.stringify(config, null, 2));
    }
  }

  /**
   * Reset onboarding state (for testing or re-running)
   */
  async resetOnboarding(): Promise<void> {
    this.onboardingState = {
      isFirstRun: true,
      currentStep: 0,
      totalSteps: 5,
      completedSteps: [],
      skippedSteps: [],
      userPreferences: { ...DEFAULT_USER_PREFERENCES },
    };

    try {
      await fs.unlink(this.configPath);
    } catch {
      // File doesn't exist, that's fine
    }
  }

  /**
   * Gather user preferences interactively
   */
  private async gatherUserPreferences(): Promise<void> {
    console.log("Let's configure your preferences...");

    // For now, use defaults. In a full implementation, this would
    // use the TextInputHandler to gather user preferences interactively
    console.log('✅ Using recommended default preferences');
    console.log(`   • Input mode: ${this.onboardingState.userPreferences.inputMode}`);
    console.log(`   • Auto-start MCP: ${this.onboardingState.userPreferences.autoStartMCP}`);
    console.log(`   • Show tips: ${this.onboardingState.userPreferences.showOnboardingTips}`);
  }

  /**
   * Save the current onboarding state to disk
   */
  private async saveOnboardingState(): Promise<void> {
    try {
      await fs.mkdir(dirname(this.configPath), { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(this.onboardingState, null, 2));
    } catch (error) {
      console.warn('Warning: Could not save onboarding state:', error);
    }
  }

  /**
   * Load onboarding state from disk
   */
  private async loadOnboardingState(): Promise<void> {
    try {
      const stateData = await fs.readFile(this.configPath, 'utf-8');
      const loadedState = JSON.parse(stateData);
      this.onboardingState = {
        ...this.onboardingState,
        ...loadedState,
      };
    } catch {
      // State file doesn't exist or is invalid, use defaults
    }
  }
}
