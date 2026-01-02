/**
 * Cursor IDE Adapter Implementation
 *
 * Cursor is VSCode-based, so we can safely reuse the VSCode adapter
 * implementation while keeping branding and factory wiring isolated.
 */

import { BrandingConfig, ExtensionConfig } from '../types/config';
import { CreateIDEAdapterFn, IIDEAdapter, IOutputChannel, ISecureStorage } from './IIDEAdapter';
import { VSCodeAdapter } from './VSCodeAdapter';

type ElectronSafeStorage = {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(buffer: Buffer): string;
};

interface CursorExtensionContext {
  secrets: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  globalState: {
    get<T>(key: string): T | undefined;
    update(key: string, value: unknown): Promise<void>;
  };
}

const CURSOR_STORAGE_PREFIX = 'lanonasis.cursor.secure';

const loadElectronSafeStorage = (): ElectronSafeStorage | null => {
  try {
    const electron = require('electron') as {
      safeStorage?: ElectronSafeStorage;
      remote?: { safeStorage?: ElectronSafeStorage };
    };
    const safeStorage = electron?.safeStorage ?? electron?.remote?.safeStorage;
    if (!safeStorage || typeof safeStorage.isEncryptionAvailable !== 'function') {
      return null;
    }
    return safeStorage;
  } catch (error) {
    return null;
  }
};

class CursorSecureStorage implements ISecureStorage {
  constructor(
    private context: CursorExtensionContext,
    private fallback: ISecureStorage,
    private outputChannel?: IOutputChannel
  ) {}

  private getStorageKey(key: string): string {
    return `${CURSOR_STORAGE_PREFIX}.${key}`;
  }

  private log(message: string): void {
    if (this.outputChannel) {
      this.outputChannel.appendLine(`[CursorSecureStorage] ${message}`);
    }
  }

  private getSafeStorage(): ElectronSafeStorage | null {
    const safeStorage = loadElectronSafeStorage();
    if (!safeStorage || !safeStorage.isEncryptionAvailable()) {
      return null;
    }
    return safeStorage;
  }

  async store(key: string, value: string): Promise<void> {
    const safeStorage = this.getSafeStorage();
    if (safeStorage) {
      const encrypted = safeStorage.encryptString(value).toString('base64');
      await this.context.globalState.update(this.getStorageKey(key), encrypted);
      return;
    }

    this.log('Electron safeStorage unavailable; falling back to SecretStorage.');
    await this.fallback.store(key, value);
  }

  async get(key: string): Promise<string | undefined> {
    const safeStorage = this.getSafeStorage();
    if (safeStorage) {
      const stored = this.context.globalState.get<string>(this.getStorageKey(key));
      if (!stored) {
        return await this.fallback.get(key);
      }
      try {
        return safeStorage.decryptString(Buffer.from(stored, 'base64'));
      } catch (error) {
        this.log('Failed to decrypt Cursor safeStorage value; falling back to SecretStorage.');
      }
    }

    return await this.fallback.get(key);
  }

  async delete(key: string): Promise<void> {
    const safeStorage = this.getSafeStorage();
    if (safeStorage) {
      await this.context.globalState.update(this.getStorageKey(key), undefined);
    }
    await this.fallback.delete(key);
  }
}

// Thin subclass to provide a distinct type and branding while reusing logic.
export class CursorAdapter extends VSCodeAdapter implements IIDEAdapter {
  constructor(nativeContext: any, branding: BrandingConfig) {
    super(nativeContext.context, nativeContext.outputChannel, nativeContext.vscode, branding);
    const fallbackStorage = this.secureStorage;
    this.secureStorage = new CursorSecureStorage(
      nativeContext.context as CursorExtensionContext,
      fallbackStorage,
      this.outputChannel
    );
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
