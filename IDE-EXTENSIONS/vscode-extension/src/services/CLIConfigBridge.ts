import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { SecureApiKeyService, StoredCredential } from '@lanonasis/ide-extension-core';

const CLI_CONFIG_DIR = path.join(os.homedir(), '.maas');
const CLI_CONFIG_PATH = path.join(CLI_CONFIG_DIR, 'config.json');
const LEGACY_SECURE_VENDOR_KEY_MARKER = 'stored_in_api_key_storage';

export const CLI_CONFIG_IMPORT_STATE_KEY = 'lanonasis.cliImportState';

type ImportableSettingKey = 'apiUrl' | 'gatewayUrl' | 'authUrl' | 'organizationId';
type SettingSource = 'explicit' | 'cli-import' | 'default';
type CredentialSource = 'secure-storage' | 'cli-config' | 'none';

interface CLIUserProfile {
  organization_id?: string;
}

interface CLIDiscoveredServices {
  auth_base?: string;
  memory_base?: string;
  project_scope?: string;
}

interface CLIConfigData {
  apiUrl?: string;
  token?: string;
  vendorKey?: string;
  authMethod?: string;
  refresh_token?: string;
  token_expires_at?: string | number;
  tokenExpiry?: string | number;
  user?: CLIUserProfile;
  discoveredServices?: CLIDiscoveredServices;
}

export interface CLIConfigImportState {
  configPath: string;
  available: boolean;
  lastCheckedAt: string;
  lastImportedAt?: string;
  importedCredential: boolean;
  importedSettings: ImportableSettingKey[];
  credentialSource: CredentialSource;
  settingSources: Record<ImportableSettingKey, SettingSource>;
  authMethod?: string;
  skippedReason?: string;
}

type SettingCandidates = Partial<Record<ImportableSettingKey, string>>;

const IMPORTABLE_SETTING_KEYS: ImportableSettingKey[] = [
  'apiUrl',
  'gatewayUrl',
  'authUrl',
  'organizationId'
];

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeExpiry(value: string | number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  // CLI stores JWT exp values in seconds and some OAuth expiry values in ms.
  return parsed > 1_000_000_000_000 ? parsed : parsed * 1000;
}

function isLegacyHashedValue(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function hasExplicitSetting(
  configuration: vscode.WorkspaceConfiguration,
  key: ImportableSettingKey
): boolean {
  const inspected = configuration.inspect<string>(key);
  return inspected?.workspaceFolderValue !== undefined
    || inspected?.workspaceValue !== undefined
    || inspected?.globalValue !== undefined;
}

function buildSettingCandidates(cliConfig: CLIConfigData): SettingCandidates {
  const memoryBase = normalizeString(cliConfig.discoveredServices?.memory_base)
    ?? normalizeString(cliConfig.apiUrl);
  const authBase = normalizeString(cliConfig.discoveredServices?.auth_base);
  const organizationId = normalizeString(cliConfig.user?.organization_id);

  return {
    apiUrl: memoryBase,
    gatewayUrl: memoryBase,
    authUrl: authBase,
    organizationId
  };
}

function extractImportableCredential(cliConfig: CLIConfigData): StoredCredential | null {
  const authMethod = normalizeString(cliConfig.authMethod)?.toLowerCase();
  const token = normalizeString(cliConfig.token);
  const vendorKey = normalizeString(cliConfig.vendorKey);

  if (token && authMethod !== 'vendor_key') {
    const expiresAt = normalizeExpiry(cliConfig.token_expires_at ?? cliConfig.tokenExpiry);
    const refreshToken = normalizeString(cliConfig.refresh_token);

    if (expiresAt && expiresAt <= Date.now() && !refreshToken) {
      return null;
    }

    return {
      type: 'oauth',
      token,
      refreshToken,
      expiresAt
    };
  }

  if (!vendorKey) {
    return null;
  }

  if (vendorKey === LEGACY_SECURE_VENDOR_KEY_MARKER || isLegacyHashedValue(vendorKey)) {
    return null;
  }

  return {
    type: 'apiKey',
    token: vendorKey
  };
}

async function loadCLIConfig(outputChannel: vscode.OutputChannel): Promise<CLIConfigData | null> {
  try {
    const contents = await fs.readFile(CLI_CONFIG_PATH, 'utf8');
    return JSON.parse(contents) as CLIConfigData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      outputChannel.appendLine(
        `[CLI Import] Failed to read ${CLI_CONFIG_PATH}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return null;
  }
}

function resolveSettingSource(
  configuration: vscode.WorkspaceConfiguration,
  key: ImportableSettingKey,
  candidateValue: string | undefined,
  importedSettings: ImportableSettingKey[],
  previousState?: CLIConfigImportState
): SettingSource {
  if (importedSettings.includes(key)) {
    return 'cli-import';
  }

  if (!hasExplicitSetting(configuration, key)) {
    return 'default';
  }

  const currentValue = normalizeString(configuration.get<string>(key));
  if (
    previousState?.settingSources[key] === 'cli-import'
    && candidateValue
    && currentValue === candidateValue
  ) {
    return 'cli-import';
  }

  return 'explicit';
}

export async function syncCLIConfigToExtension(
  context: vscode.ExtensionContext,
  secureApiKeyService: SecureApiKeyService,
  outputChannel: vscode.OutputChannel
): Promise<CLIConfigImportState> {
  const configuration = vscode.workspace.getConfiguration('lanonasis');
  const previousState = context.globalState.get<CLIConfigImportState>(CLI_CONFIG_IMPORT_STATE_KEY);
  const importEnabled = configuration.get<boolean>('importCLIConfig', true);
  const now = new Date().toISOString();

  const baseState: CLIConfigImportState = {
    configPath: CLI_CONFIG_PATH,
    available: false,
    lastCheckedAt: now,
    lastImportedAt: previousState?.lastImportedAt,
    importedCredential: false,
    importedSettings: [],
    credentialSource: previousState?.credentialSource ?? 'none',
    settingSources: previousState?.settingSources ?? {
      apiUrl: 'default',
      gatewayUrl: 'default',
      authUrl: 'default',
      organizationId: 'default'
    }
  };

  if (!importEnabled) {
    const disabledState: CLIConfigImportState = {
      ...baseState,
      skippedReason: 'CLI config import disabled'
    };
    await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, disabledState);
    return disabledState;
  }

  const cliConfig = await loadCLIConfig(outputChannel);
  if (!cliConfig) {
    const missingState: CLIConfigImportState = {
      ...baseState,
      skippedReason: `No CLI config found at ${CLI_CONFIG_PATH}`
    };
    await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, missingState);
    return missingState;
  }

  const settingCandidates = buildSettingCandidates(cliConfig);
  const importedSettings: ImportableSettingKey[] = [];

  for (const key of IMPORTABLE_SETTING_KEYS) {
    const candidateValue = settingCandidates[key];
    if (!candidateValue || hasExplicitSetting(configuration, key)) {
      continue;
    }

    await configuration.update(key, candidateValue, vscode.ConfigurationTarget.Global);
    importedSettings.push(key);
    outputChannel.appendLine(`[CLI Import] Applied ${key} from ${CLI_CONFIG_PATH}`);
  }

  const existingCredential = await secureApiKeyService.getStoredCredentials();
  let importedCredential = false;
  let credentialSource: CredentialSource = existingCredential
    ? (previousState?.credentialSource === 'cli-config' ? 'cli-config' : 'secure-storage')
    : 'none';
  let skippedReason: string | undefined;

  if (!existingCredential) {
    const imported = extractImportableCredential(cliConfig);
    if (imported) {
      await secureApiKeyService.importCredential(imported);
      importedCredential = true;
      credentialSource = 'cli-config';
      outputChannel.appendLine(
        `[CLI Import] Imported ${imported.type === 'oauth' ? 'OAuth session' : 'API key'} from ${CLI_CONFIG_PATH}`
      );
    } else {
      skippedReason = 'CLI config does not contain an importable credential';
    }
  } else if (importedSettings.length === 0 && previousState?.credentialSource !== 'cli-config') {
    skippedReason = 'Extension already has secure credentials and explicit settings';
  }

  const nextState: CLIConfigImportState = {
    configPath: CLI_CONFIG_PATH,
    available: true,
    lastCheckedAt: now,
    lastImportedAt: importedCredential || importedSettings.length > 0 ? now : previousState?.lastImportedAt,
    importedCredential,
    importedSettings,
    credentialSource,
    authMethod: normalizeString(cliConfig.authMethod),
    skippedReason,
    settingSources: {
      apiUrl: resolveSettingSource(configuration, 'apiUrl', settingCandidates.apiUrl, importedSettings, previousState),
      gatewayUrl: resolveSettingSource(configuration, 'gatewayUrl', settingCandidates.gatewayUrl, importedSettings, previousState),
      authUrl: resolveSettingSource(configuration, 'authUrl', settingCandidates.authUrl, importedSettings, previousState),
      organizationId: resolveSettingSource(configuration, 'organizationId', settingCandidates.organizationId, importedSettings, previousState)
    }
  };

  await context.globalState.update(CLI_CONFIG_IMPORT_STATE_KEY, nextState);
  return nextState;
}
