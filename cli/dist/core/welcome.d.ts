/**
 * Welcome and Onboarding Experience
 * Provides first-time user experience and guided setup
 */
import { StateManager } from './architecture.js';
export declare class WelcomeExperience {
    private stateManager;
    private isFirstRun;
    constructor(stateManager: StateManager);
    show(): Promise<void>;
    private displayWelcomeBanner;
    private showMainMenu;
    private handleMenuChoice;
    private startInteractiveSetup;
    private goToDashboard;
    private showDocumentation;
    private showAbout;
    private showSettings;
    private showHelp;
    private checkAuthentication;
}
/**
 * Interactive Setup Flow
 */
export declare class InteractiveSetup {
    private stateManager;
    private setupProgress;
    constructor(stateManager: StateManager);
    run(): Promise<void>;
    private showProgressHeader;
    private renderProgressBar;
    private setupConnection;
    private setupAuthentication;
    private authenticateWithVendorKey;
    private authenticateWithBrowser;
    private authenticateWithEmail;
    private setupConfiguration;
    private showSetupComplete;
    private simulateDelay;
}
