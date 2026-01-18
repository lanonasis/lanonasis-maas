/**
 * Shared Core Integration Bridge
 *
 * This module bridges the VSCode extension with the shared @lanonasis/ide-extension-core package.
 * It provides a unified interface for creating the IDE adapter and authentication service,
 * enabling gradual migration from the legacy VSCode-specific implementation to the shared core.
 *
 * Usage:
 * ```typescript
 * import { createSharedCoreServices } from './services/SharedCoreIntegration';
 *
 * const { adapter, authService } = await createSharedCoreServices(context, outputChannel);
 * await authService.initialize();
 * ```
 */

import * as vscode from 'vscode';
import {
  createVSCodeAdapter,
  SecureApiKeyService,
  IIDEAdapter,
  BrandingConfig
} from '@lanonasis/ide-extension-core';

// Re-export types from shared core for convenience
export type {
  IIDEAdapter,
  ISecureStorage,
  IOutputChannel,
  IContext,
  INotification,
  IInputBox,
  IBrowser,
  IConfiguration
} from '@lanonasis/ide-extension-core';

export { SecureApiKeyService } from '@lanonasis/ide-extension-core';

/**
 * Default branding configuration for VSCode
 */
const VSCODE_BRANDING: BrandingConfig = {
  ideName: 'VSCode',
  extensionName: 'lanonasis-memory',
  extensionDisplayName: 'LanOnasis Memory Assistant',
  commandPrefix: 'lanonasis',
  userAgent: `VSCode/${vscode.version} LanOnasis-Memory/2.0.9`
};

/**
 * Services bundle returned by createSharedCoreServices
 */
export interface SharedCoreServices {
  /** The IDE adapter for platform-agnostic operations */
  adapter: IIDEAdapter;
  /** The secure authentication service using shared core */
  authService: SecureApiKeyService;
  /** The branding configuration used */
  branding: BrandingConfig;
}

/**
 * Create shared core services for the VSCode extension
 *
 * This is the main entry point for integrating with the shared core.
 * It creates the VSCode adapter and SecureApiKeyService using the shared
 * @lanonasis/ide-extension-core package.
 *
 * @param context - VSCode ExtensionContext from activate()
 * @param outputChannel - VSCode OutputChannel for logging
 * @param customBranding - Optional custom branding configuration
 * @returns Promise<SharedCoreServices> - The initialized services bundle
 *
 * @example
 * ```typescript
 * export async function activate(context: vscode.ExtensionContext) {
 *   const outputChannel = vscode.window.createOutputChannel('Lanonasis');
 *
 *   // Use shared core services
 *   const { adapter, authService } = await createSharedCoreServices(context, outputChannel);
 *   await authService.initialize();
 *
 *   // Check authentication status
 *   const hasKey = await authService.hasApiKey();
 *   if (hasKey) {
 *     // User is authenticated
 *   }
 * }
 * ```
 */
export async function createSharedCoreServices(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
  customBranding?: Partial<BrandingConfig>
): Promise<SharedCoreServices> {
  // Merge custom branding with defaults
  const branding: BrandingConfig = {
    ...VSCODE_BRANDING,
    ...customBranding
  };

  // Create the native context object expected by createVSCodeAdapter
  const nativeContext = {
    context,
    outputChannel,
    vscode
  };

  // Create the adapter using the factory function
  const adapter = createVSCodeAdapter(nativeContext, branding);

  // Create the authentication service using the shared core implementation
  const authService = new SecureApiKeyService(adapter);

  return {
    adapter,
    authService,
    branding
  };
}

/**
 * Legacy compatibility wrapper
 *
 * Creates a SecureApiKeyService instance that's compatible with the existing
 * extension code signature: `new SecureApiKeyService(context, outputChannel)`
 *
 * This allows for gradual migration - existing code can continue to work
 * while new code uses the shared core directly.
 *
 * @deprecated Use createSharedCoreServices() for new code
 * @param context - VSCode ExtensionContext
 * @param outputChannel - VSCode OutputChannel
 * @returns SecureApiKeyService - Shared core authentication service
 */
export function createLegacyCompatibleAuthService(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): SecureApiKeyService {
  const nativeContext = {
    context,
    outputChannel,
    vscode
  };

  const adapter = createVSCodeAdapter(nativeContext, VSCODE_BRANDING);
  return new SecureApiKeyService(adapter);
}

/**
 * Type guard to check if a service is using the shared core
 *
 * @param service - Any authentication service instance
 * @returns boolean - True if using shared core SecureApiKeyService
 */
export function isSharedCoreAuthService(
  service: unknown
): service is SecureApiKeyService {
  return service instanceof SecureApiKeyService;
}
