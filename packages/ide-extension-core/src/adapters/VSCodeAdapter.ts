/**
 * VSCode IDE Adapter Implementation
 * 
 * Provides VSCode-specific implementations of the IDE adapter interfaces.
 * This adapter should be used when running in VSCode environment.
 */

import {
  IIDEAdapter,
  ISecureStorage,
  IOutputChannel,
  IContext,
  INotification,
  IProgress,
  IInputBox,
  IBrowser,
  IConfiguration,
  CreateIDEAdapterFn
} from './IIDEAdapter';
import { BrandingConfig, ExtensionConfig, ExtensionConfigSchema } from '../types/config';

// VSCode types will be provided by the consuming extension
// We define minimal interfaces here to avoid requiring vscode as a dependency
interface VSCodeExtensionContext {
  secrets: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  extensionPath: string;
  globalStorageUri: { fsPath: string };
  workspaceState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Promise<void>;
  };
  globalState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Promise<void>;
  };
  subscriptions: { dispose(): void }[];
}

interface VSCodeOutputChannel {
  appendLine(value: string): void;
  show(preserveFocus?: boolean): void;
  clear(): void;
  dispose(): void;
}

interface VSCodeUri {
  fsPath: string;
}

interface VSCodeProgressOptions {
  location: number;
  title: string;
  cancellable?: boolean;
}

interface VSCodeProgress {
  report(value: { message?: string; increment?: number }): void;
}

interface VSCodeWorkspaceConfiguration {
  get<T>(section: string, defaultValue?: T): T | undefined;
  update(section: string, value: unknown, configurationTarget?: number): Promise<void>;
  has(section: string): boolean;
}

interface VSCodeAPI {
  window: {
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showInputBox(options: {
      prompt?: string;
      placeHolder?: string;
      value?: string;
      password?: boolean;
      validateInput?: (value: string) => string | undefined | null;
      ignoreFocusOut?: boolean;
    }): Promise<string | undefined>;
    showQuickPick(
      items: string[] | { label: string; description?: string; detail?: string }[],
      options?: { placeHolder?: string; canPickMany?: boolean }
    ): Promise<any>;
    withProgress<T>(
      options: VSCodeProgressOptions,
      task: (progress: VSCodeProgress) => Promise<T>
    ): Promise<T>;
  };
  workspace: {
    getConfiguration(section?: string): VSCodeWorkspaceConfiguration;
  };
  env: {
    openExternal(uri: { toString(): string }): Promise<boolean>;
  };
  Uri: {
    parse(value: string): { toString(): string };
  };
  ProgressLocation: {
    Notification: number;
  };
  ConfigurationTarget: {
    Global: number;
  };
}

/**
 * VSCode Secure Storage Implementation
 */
class VSCodeSecureStorage implements ISecureStorage {
  constructor(private context: VSCodeExtensionContext) {}

  async store(key: string, value: string): Promise<void> {
    await this.context.secrets.store(key, value);
  }

  async get(key: string): Promise<string | undefined> {
    return await this.context.secrets.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.context.secrets.delete(key);
  }
}

/**
 * VSCode Output Channel Implementation
 */
class VSCodeOutputChannelAdapter implements IOutputChannel {
  constructor(private channel: VSCodeOutputChannel) {}

  appendLine(message: string): void {
    this.channel.appendLine(message);
  }

  show(preserveFocus?: boolean): void {
    this.channel.show(preserveFocus);
  }

  clear(): void {
    this.channel.clear();
  }

  dispose(): void {
    this.channel.dispose();
  }
}

/**
 * VSCode Context Implementation
 */
class VSCodeContext implements IContext {
  constructor(private context: VSCodeExtensionContext) {}

  get extensionPath(): string {
    return this.context.extensionPath;
  }

  get globalStoragePath(): string {
    return this.context.globalStorageUri.fsPath;
  }

  get workspaceStoragePath(): string | undefined {
    return undefined; // Will be set if workspace exists
  }

  getGlobalState<T>(key: string): T | undefined {
    return this.context.globalState.get<T>(key);
  }

  async setGlobalState<T>(key: string, value: T): Promise<void> {
    await this.context.globalState.update(key, value);
  }

  getWorkspaceState<T>(key: string): T | undefined {
    return this.context.workspaceState.get<T>(key);
  }

  async setWorkspaceState<T>(key: string, value: T): Promise<void> {
    await this.context.workspaceState.update(key, value);
  }

  subscribeToDisposal(disposable: { dispose(): void }): void {
    this.context.subscriptions.push(disposable);
  }
}

/**
 * VSCode Notification Implementation
 */
class VSCodeNotification implements INotification {
  constructor(private vscode: VSCodeAPI) {}

  async showInformation(message: string, ...actions: string[]): Promise<string | undefined> {
    return await this.vscode.window.showInformationMessage(message, ...actions);
  }

  async showWarning(message: string, ...actions: string[]): Promise<string | undefined> {
    return await this.vscode.window.showWarningMessage(message, ...actions);
  }

  async showError(message: string, ...actions: string[]): Promise<string | undefined> {
    return await this.vscode.window.showErrorMessage(message, ...actions);
  }

  async showProgress<T>(title: string, task: (progress: IProgress) => Promise<T>): Promise<T> {
    return await this.vscode.window.withProgress(
      {
        location: this.vscode.ProgressLocation.Notification,
        title,
        cancellable: false
      },
      async (progress: VSCodeProgress) => {
        return await task(progress as IProgress);
      }
    );
  }
}

/**
 * VSCode Input Box Implementation
 */
class VSCodeInputBox implements IInputBox {
  constructor(private vscode: VSCodeAPI) {}

  async showInputBox(options: {
    prompt?: string;
    placeHolder?: string;
    value?: string;
    password?: boolean;
    validateInput?: (value: string) => string | undefined | null;
  }): Promise<string | undefined> {
    return await this.vscode.window.showInputBox({
      ...options,
      ignoreFocusOut: true
    });
  }

  async showQuickPick(
    items: string[] | { label: string; description?: string; detail?: string }[],
    options?: { placeHolder?: string; canPickMany?: boolean }
  ): Promise<string | string[] | undefined> {
    return await this.vscode.window.showQuickPick(items, options);
  }
}

/**
 * VSCode Browser Implementation
 */
class VSCodeBrowser implements IBrowser {
  constructor(private vscode: VSCodeAPI) {}

  async openExternal(url: string): Promise<boolean> {
    return await this.vscode.env.openExternal(this.vscode.Uri.parse(url));
  }
}

/**
 * VSCode Configuration Implementation
 */
class VSCodeConfiguration implements IConfiguration {
  constructor(private vscode: VSCodeAPI) {}

  get<T>(section: string, defaultValue?: T): T | undefined {
    const config = this.vscode.workspace.getConfiguration();
    return config.get<T>(section, defaultValue);
  }

  async update(section: string, value: unknown, global = true): Promise<void> {
    const config = this.vscode.workspace.getConfiguration();
    await config.update(
      section,
      value,
      global ? this.vscode.ConfigurationTarget.Global : undefined
    );
  }

  has(section: string): boolean {
    const config = this.vscode.workspace.getConfiguration();
    return config.has(section);
  }
}

/**
 * VSCode IDE Adapter Implementation
 */
export class VSCodeAdapter implements IIDEAdapter {
  secureStorage: ISecureStorage;
  outputChannel: IOutputChannel;
  context: IContext;
  notification: INotification;
  input: IInputBox;
  browser: IBrowser;
  configuration: IConfiguration;
  branding: BrandingConfig;

  constructor(
    vscodeContext: VSCodeExtensionContext,
    outputChannel: VSCodeOutputChannel,
    vscode: VSCodeAPI,
    branding: BrandingConfig
  ) {
    this.secureStorage = new VSCodeSecureStorage(vscodeContext);
    this.outputChannel = new VSCodeOutputChannelAdapter(outputChannel);
    this.context = new VSCodeContext(vscodeContext);
    this.notification = new VSCodeNotification(vscode);
    this.input = new VSCodeInputBox(vscode);
    this.browser = new VSCodeBrowser(vscode);
    this.configuration = new VSCodeConfiguration(vscode);
    this.branding = branding;
  }

  getConfig(): ExtensionConfig {
    // Get configuration values from workspace
    const apiUrl = this.configuration.get<string>('lanonasis.apiUrl');
    const authUrl = this.configuration.get<string>('lanonasis.authUrl');
    const enableCliIntegration = this.configuration.get<boolean>('lanonasis.enableCliIntegration');
    const defaultMemoryType = this.configuration.get<string>('lanonasis.defaultMemoryType');
    const searchLimit = this.configuration.get<number>('lanonasis.searchLimit');
    const searchThreshold = this.configuration.get<number>('lanonasis.searchThreshold');
    const logLevel = this.configuration.get<string>('lanonasis.logLevel');

    // Parse and validate with defaults
    const result = ExtensionConfigSchema.safeParse({
      apiUrl,
      authUrl,
      enableCliIntegration,
      defaultMemoryType,
      searchLimit,
      searchThreshold,
      logLevel
    });

    return result.success ? result.data : ExtensionConfigSchema.parse({});
  }
}

/**
 * Factory function to create VSCode adapter
 */
export const createVSCodeAdapter: CreateIDEAdapterFn = (
  nativeContext: unknown,
  branding: BrandingConfig
) => {
  // Extract VSCode components from context
  const context = (nativeContext as any).context as VSCodeExtensionContext;
  const outputChannel = (nativeContext as any).outputChannel as VSCodeOutputChannel;
  const vscode = (nativeContext as any).vscode as VSCodeAPI;

  return new VSCodeAdapter(context, outputChannel, vscode, branding);
};
