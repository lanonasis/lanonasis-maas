/**
 * Power User Mode
 * Streamlined interface for expert users with advanced features
 */
import { StateManager } from './architecture.js';
export declare class PowerUserMode {
    private stateManager;
    private commandHistory;
    private historyIndex;
    private rl?;
    private smartSuggestions;
    private aliases;
    constructor(stateManager: StateManager);
    /**
     * Enter power user mode
     */
    enter(): Promise<void>;
    /**
     * Exit power user mode
     */
    exit(): void;
    /**
     * Show power mode banner
     */
    private showBanner;
    /**
     * Get command prompt
     */
    private getPrompt;
    /**
     * Setup key bindings for enhanced navigation
     */
    private setupKeyBindings;
    /**
     * Start the REPL loop
     */
    private startREPL;
    /**
     * Process power mode commands
     */
    private processCommand;
    /**
     * Quick create command
     */
    private quickCreate;
    /**
     * Quick search command
     */
    private quickSearch;
    /**
     * Quick list command
     */
    private quickList;
    /**
     * Quick delete command
     */
    private quickDelete;
    /**
     * Quick update command
     */
    private quickUpdate;
    /**
     * Handle topic commands
     */
    private handleTopic;
    /**
     * Handle API commands
     */
    private handleApi;
    /**
     * Handle pipe operations
     */
    private handlePipe;
    /**
     * Handle format changes
     */
    private handleFormat;
    /**
     * Execute system command
     */
    private executeSystemCommand;
    /**
     * Show help
     */
    private showHelp;
    /**
     * Show command history
     */
    private showHistory;
    /**
     * Handle alias management
     */
    private handleAlias;
    /**
     * Expand aliases in command
     */
    private expandAliases;
    /**
     * Tab completion function
     */
    private completer;
    /**
     * Parse command arguments
     */
    private parseArgs;
    /**
     * Generate a simple ID
     */
    private generateId;
    /**
     * Load aliases from storage
     */
    private loadAliases;
    /**
     * Save aliases to storage
     */
    private saveAliases;
}
