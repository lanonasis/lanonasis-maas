/**
 * Cursor IDE Adapter Implementation
 *
 * Cursor is VSCode-based, so we can safely reuse the VSCode adapter
 * implementation while keeping branding and factory wiring isolated.
 */

import { BrandingConfig, ExtensionConfig } from '../types/config';
import { CreateIDEAdapterFn, IIDEAdapter } from './IIDEAdapter';
import { VSCodeAdapter } from './VSCodeAdapter';

// Thin subclass to provide a distinct type and branding while reusing logic.
export class CursorAdapter extends VSCodeAdapter implements IIDEAdapter {
  constructor(nativeContext: any, branding: BrandingConfig) {
    super(nativeContext.context, nativeContext.outputChannel, nativeContext.vscode, branding);
  }

  // Expose getConfig for completeness; behavior is inherited.
  override getConfig(): ExtensionConfig {
    return super.getConfig();
  }
}

/**
 * Factory function to create Cursor adapter.
 * Expects nativeContext to contain:
 * - context: Cursor extension context (VSCode compatible)
 * - outputChannel: output channel instance
 * - vscode: Cursor's VSCode-compatible API surface
 */
export const createCursorAdapter: CreateIDEAdapterFn = (
  nativeContext: unknown,
  branding: BrandingConfig
) => {
  return new CursorAdapter(nativeContext as any, branding);
};
