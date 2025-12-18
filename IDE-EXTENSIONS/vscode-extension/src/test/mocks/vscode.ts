// Minimal VS Code API mock for unit tests (Vitest)
import { vi } from 'vitest';

const noop = vi.fn();

export const window = {
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn()
  })),
  showErrorMessage: vi.fn()
};

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: (_key: string, fallback?: unknown) => fallback
  }))
};

export const env = {
  openExternal: vi.fn()
};

export const Uri = {
  parse: (value: string) => value
};

export const commands = {
  executeCommand: vi.fn()
};

export const extensions = {};

export const SecretStorage = vi.fn();

export type SecretStorage = {
  get: (key: string) => Promise<string | undefined>;
  store: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export interface ExtensionContext {
  secrets: SecretStorage;
}

export default {
  window,
  workspace,
  env,
  Uri,
  commands,
  extensions,
  SecretStorage,
  ExtensionContext: {} as ExtensionContext
};

