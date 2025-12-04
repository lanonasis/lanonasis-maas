/**
 * IDE Adapter Interface
 * 
 * Provides platform-agnostic abstractions for IDE-specific functionality.
 * Each IDE extension must implement this interface to use the shared core.
 */

import { ExtensionConfig, BrandingConfig } from '../types/config';

/**
 * Secure Storage Interface
 * Abstracts OS-level credential storage (keychain, credential manager, etc.)
 */
export interface ISecureStorage {
  /**
   * Store a secret value
   */
  store(key: string, value: string): Promise<void>;
  
  /**
   * Retrieve a secret value
   */
  get(key: string): Promise<string | undefined>;
  
  /**
   * Delete a secret value
   */
  delete(key: string): Promise<void>;
}

/**
 * Output Channel Interface
 * Abstracts logging and output display
 */
export interface IOutputChannel {
  /**
   * Append line to output
   */
  appendLine(message: string): void;
  
  /**
   * Show the output channel
   */
  show(preserveFocus?: boolean): void;
  
  /**
   * Clear the output channel
   */
  clear(): void;
  
  /**
   * Dispose the output channel
   */
  dispose(): void;
}

/**
 * Context Interface
 * Abstracts extension context and state management
 */
export interface IContext {
  /**
   * Extension storage path
   */
  extensionPath: string;
  
  /**
   * Global state storage path
   */
  globalStoragePath: string;
  
  /**
   * Workspace state storage path (if available)
   */
  workspaceStoragePath?: string;
  
  /**
   * Get global state value
   */
  getGlobalState<T>(key: string): T | undefined;
  
  /**
   * Set global state value
   */
  setGlobalState<T>(key: string, value: T): Promise<void>;
  
  /**
   * Get workspace state value
   */
  getWorkspaceState?<T>(key: string): T | undefined;
  
  /**
   * Set workspace state value
   */
  setWorkspaceState?<T>(key: string, value: T): Promise<void>;
  
  /**
   * Subscribe to disposal
   */
  subscribeToDisposal(disposable: { dispose(): void }): void;
}

/**
 * Notification Interface
 * Abstracts IDE notification system
 */
export interface INotification {
  /**
   * Show information message
   */
  showInformation(message: string, ...actions: string[]): Promise<string | undefined>;
  
  /**
   * Show warning message
   */
  showWarning(message: string, ...actions: string[]): Promise<string | undefined>;
  
  /**
   * Show error message
   */
  showError(message: string, ...actions: string[]): Promise<string | undefined>;
  
  /**
   * Show progress notification
   */
  showProgress<T>(
    title: string,
    task: (progress: IProgress) => Promise<T>
  ): Promise<T>;
}

/**
 * Progress Reporter Interface
 */
export interface IProgress {
  report(value: { message?: string; increment?: number }): void;
}

/**
 * Input Box Interface
 */
export interface IInputBox {
  /**
   * Show input box
   */
  showInputBox(options: {
    prompt?: string;
    placeHolder?: string;
    value?: string;
    password?: boolean;
    validateInput?: (value: string) => string | undefined | null;
  }): Promise<string | undefined>;
  
  /**
   * Show quick pick
   */
  showQuickPick(
    items: string[] | { label: string; description?: string; detail?: string }[],
    options?: {
      placeHolder?: string;
      canPickMany?: boolean;
    }
  ): Promise<string | string[] | undefined>;
}

/**
 * Browser Interface
 */
export interface IBrowser {
  /**
   * Open external URL in browser
   */
  openExternal(url: string): Promise<boolean>;
}

/**
 * Configuration Interface
 */
export interface IConfiguration {
  /**
   * Get configuration value
   */
  get<T>(section: string, defaultValue?: T): T | undefined;
  
  /**
   * Update configuration value
   */
  update(section: string, value: unknown, global?: boolean): Promise<void>;
  
  /**
   * Check if configuration has section
   */
  has(section: string): boolean;
}

/**
 * Main IDE Adapter Interface
 * Combines all platform-specific abstractions
 */
export interface IIDEAdapter {
  /**
   * Secure storage for credentials
   */
  secureStorage: ISecureStorage;
  
  /**
   * Output channel for logging
   */
  outputChannel: IOutputChannel;
  
  /**
   * Extension context
   */
  context: IContext;
  
  /**
   * Notification system
   */
  notification: INotification;
  
  /**
   * Input/Quick pick system
   */
  input: IInputBox;
  
  /**
   * Browser integration
   */
  browser: IBrowser;
  
  /**
   * Configuration system
   */
  configuration: IConfiguration;
  
  /**
   * Branding configuration
   */
  branding: BrandingConfig;
  
  /**
   * Get current extension configuration
   */
  getConfig(): ExtensionConfig;
}

/**
 * Factory function type for creating IDE-specific adapter
 */
export type CreateIDEAdapterFn = (
  nativeContext: unknown,
  branding: BrandingConfig
) => IIDEAdapter;
