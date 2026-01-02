/**
 * Windsurf IDE Adapter Implementation
 *
 * Windsurf is also VSCode-based, so we reuse the VSCode adapter
 * implementation while keeping branding and factory wiring isolated.
 */

import { BrandingConfig, ExtensionConfig } from '../types/config';
import { CreateIDEAdapterFn, IIDEAdapter, IOutputChannel, ISecureStorage } from './IIDEAdapter';
import { VSCodeAdapter } from './VSCodeAdapter';

type Keytar = {
  getPassword(service: string, account: string): Promise<string | null>;
  setPassword(service: string, account: string, password: string): Promise<void>;
  deletePassword(service: string, account: string): Promise<boolean>;
};

const loadKeytar = (): Keytar | null => {
  try {
    const keytar = require('keytar') as Keytar;
    if (!keytar?.getPassword || !keytar?.setPassword || !keytar?.deletePassword) {
      return null;
    }
    return keytar;
  } catch (error) {
    return null;
  }
};

class WindsurfSecureStorage implements ISecureStorage {
  private keytar: Keytar | null | undefined;

  constructor(
    private serviceName: string,
    private fallback: ISecureStorage,
    private outputChannel?: IOutputChannel
  ) {}

  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[WindsurfSecureStorage] ${message}`);
    }
  }

  private getKeytar(): Keytar | null {
    if (this.keytar === undefined) {
      this.keytar = loadKeytar();
      if (!this.keytar) {
        this.log('Keytar unavailable; falling back to SecretStorage.');
      }
    }
    return this.keytar;
  }

  async store(key: string, value: string): Promise<void> {
    const keytar = this.getKeytar();
    if (keytar) {
      try {
        await keytar.setPassword(this.serviceName, key, value);
        return;
      } catch (error) {
        this.log('Keytar setPassword failed; falling back to SecretStorage.');
      }
    }

    await this.fallback.store(key, value);
  }

  async get(key: string): Promise<string | undefined> {
    const keytar = this.getKeytar();
    if (keytar) {
      try {
        const value = await keytar.getPassword(this.serviceName, key);
        if (value) {
          return value;
        }
      } catch (error) {
        this.log('Keytar getPassword failed; falling back to SecretStorage.');
      }
    }

    return await this.fallback.get(key);
  }

  async delete(key: string): Promise<void> {
    const keytar = this.getKeytar();
    if (keytar) {
      try {
        await keytar.deletePassword(this.serviceName, key);
      } catch (error) {
        this.log('Keytar deletePassword failed; falling back to SecretStorage.');
      }
    }

    await this.fallback.delete(key);
  }
}

// Thin subclass to provide a distinct type and branding while reusing logic.
export class WindsurfAdapter extends VSCodeAdapter implements IIDEAdapter {
  constructor(nativeContext: any, branding: BrandingConfig) {
    super(nativeContext.context, nativeContext.outputChannel, nativeContext.vscode, branding);
    const fallbackStorage = this.secureStorage;
    const serviceName = branding.extensionName || 'lanonasis-windsurf';
    this.secureStorage = new WindsurfSecureStorage(
      serviceName,
      fallbackStorage,
      this.outputChannel
    );
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
