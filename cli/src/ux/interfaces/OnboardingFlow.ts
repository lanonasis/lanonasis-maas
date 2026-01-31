/**
 * Onboarding Flow Interface
 *
 * Guides new users through initial setup and configuration
 * for CLI UX improvements as specified in the design document.
 */

export interface SetupResult {
  completed: boolean;
  mcpConfigured: boolean;
  memorySystemReady: boolean;
  issues?: string[];
}

export interface TestResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export interface UserPreferences {
  inputMode: 'inline' | 'editor';
  preferredEditor?: string;
  autoStartMCP: boolean;
  showOnboardingTips: boolean;
  verboseErrors: boolean;
}

export interface OnboardingState {
  isFirstRun: boolean;
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  skippedSteps: string[];
  userPreferences: UserPreferences;
}

/**
 * OnboardingFlow guides new users through initial setup and configuration
 *
 * Key Methods:
 * - runInitialSetup(): Execute the complete onboarding process
 * - detectFirstRun(): Check if this is a first-time user
 * - configureDefaults(): Set up working default configurations
 * - testConnectivity(): Test all major functionality
 * - showWelcomeDemo(): Demonstrate key features
 *
 * Implementation Strategy:
 * - Detect first-run scenarios by checking for configuration files
 * - Create working default configurations automatically
 * - Test all major functionality and report status
 * - Provide interactive demonstrations of key features
 */
export interface OnboardingFlow {
  /**
   * Run the complete initial setup process for new users
   * @returns Promise that resolves to setup result
   */
  runInitialSetup(): Promise<SetupResult>;

  /**
   * Detect if this is a first-run scenario
   * @returns true if this appears to be a first run
   */
  detectFirstRun(): boolean;

  /**
   * Configure working default settings for immediate productivity
   * @returns Promise that resolves when defaults are configured
   */
  configureDefaults(): Promise<void>;

  /**
   * Test connectivity and functionality of all major components
   * @returns Promise that resolves to array of test results
   */
  testConnectivity(): Promise<TestResult[]>;

  /**
   * Show welcome demonstration of key features
   * @returns Promise that resolves when demo is complete
   */
  showWelcomeDemo(): Promise<void>;

  /**
   * Get the current onboarding state
   * @returns Current onboarding state
   */
  getOnboardingState(): OnboardingState;

  /**
   * Update user preferences during onboarding
   * @param preferences New preferences to apply
   * @returns Promise that resolves when preferences are updated
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void>;

  /**
   * Skip the current onboarding step
   * @param reason Optional reason for skipping
   * @returns Promise that resolves when step is skipped
   */
  skipCurrentStep(reason?: string): Promise<void>;

  /**
   * Complete the onboarding process
   * @returns Promise that resolves when onboarding is complete
   */
  completeOnboarding(): Promise<void>;

  /**
   * Reset onboarding state (for testing or re-running)
   * @returns Promise that resolves when state is reset
   */
  resetOnboarding(): Promise<void>;
}
