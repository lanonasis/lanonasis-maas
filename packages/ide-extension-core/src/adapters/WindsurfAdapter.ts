/**
 * Windsurf IDE Adapter Implementation
 *
 * Windsurf is also VSCode-based, so we reuse the VSCode adapter
 * implementation while keeping branding and factory wiring isolated.
 */

import { BrandingConfig, ExtensionConfig } from '../types/config';
import { CreateIDEAdapterFn, IIDEAdapter } from './IIDEAdapter';
import { VSCodeAdapter } from './VSCodeAdapter';

// Thin subclass to provide a distinct type and branding while reusing logic.
export class WindsurfAdapter extends VSCodeAdapter implements IIDEAdapter {
  constructor(nativeContext: any, branding: BrandingConfig) {
    super(nativeContext.context, nativeContext.outputChannel, nativeContext.vscode, branding);
  }

  override getConfig(): ExtensionConfig {
    return super.getConfig();
  }
}

/**
 * Factory function to create Windsurf adapter.
 * Expects nativeContext to contain:
 * - context: Windsurf extension context (VSCode compatible)
 * - outputChannel: output channel instance
 * - vscode: Windsurf's VSCode-compatible API surface
 */
export const createWindsurfAdapter: CreateIDEAdapterFn = (
  nativeContext: unknown,
  branding: BrandingConfig
) => {
  return new WindsurfAdapter(nativeContext as any, branding);
};
