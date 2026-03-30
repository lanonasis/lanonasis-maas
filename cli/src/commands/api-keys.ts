import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import { apiClient } from '../utils/api.js';
import { formatDate, truncateText } from '../utils/formatting.js';

const API_KEYS_BASE = '/api/v1/auth/api-keys';

// Enhanced VPS-style color scheme
const colors = {
  primary: chalk.blue.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,
  accent: chalk.magenta,
  muted: chalk.gray,
  highlight: chalk.white.bold
};

type AccessLevel = 'public' | 'authenticated' | 'team' | 'admin' | 'enterprise';
type ServiceType = 'all' | 'specific';

interface ServiceScopeRateLimit {
  per_minute?: number;
  per_day?: number;
}

interface PlatformApiKey {
  id: string;
  name: string;
  key?: string;
  user_id: string;
  access_level: AccessLevel | string;
  permissions: string[];
  service: ServiceType | string;
  service_scopes?: Array<{
    service_key: string;
    allowed_actions?: string[];
    max_calls_per_minute?: number;
    max_calls_per_day?: number;
  }>;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  is_active: boolean;
}

interface ConfiguredService {
  service_key: string;
  display_name: string;
  category: string;
  is_enabled: boolean;
}

const apiKeysCommand = new Command('api-keys')
  .alias('keys')
  .description(colors.info('🔐 Manage platform API keys and service scoping'));

const accessLevelChoices: AccessLevel[] = ['public', 'authenticated', 'team', 'admin', 'enterprise'];
const serviceTypeChoices: ServiceType[] = ['all', 'specific'];

const unwrapEnvelope = <T>(response: unknown): T => {
  if (response && typeof response === 'object' && 'data' in (response as Record<string, unknown>)) {
    return (response as { data: T }).data;
  }
  return response as T;
};

const parseCommaList = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseOptionalPositiveInteger = (value: string | undefined, flagName: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer`);
  }
  return parsed;
};

const parseOptionalJsonObject = <T extends Record<string, unknown>>(
  value: string | undefined,
  flagName: string
): T | undefined => {
  if (!value) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new Error(`Invalid ${flagName} JSON: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${flagName} must be a JSON object`);
  }

  return parsed as T;
};

const formatPermissions = (permissions: string[] | undefined): string =>
  permissions && permissions.length > 0 ? permissions.join(', ') : 'legacy:full_access';

const renderKeySummary = (apiKey: PlatformApiKey): void => {
  const activeText = apiKey.is_active ? colors.success('active') : colors.error('inactive');
  console.log(colors.info('━'.repeat(60)));
  console.log(`${colors.highlight('Key ID:')} ${colors.primary(apiKey.id)}`);
  console.log(`${colors.highlight('Name:')} ${colors.accent(apiKey.name)}`);
  console.log(`${colors.highlight('Access Level:')} ${colors.info(apiKey.access_level)}`);
  console.log(`${colors.highlight('Permissions:')} ${colors.muted(formatPermissions(apiKey.permissions))}`);
  console.log(`${colors.highlight('Service Scope:')} ${colors.info(apiKey.service || 'all')}`);
  console.log(`${colors.highlight('Status:')} ${activeText}`);
  console.log(`${colors.highlight('Created:')} ${colors.muted(formatDate(apiKey.created_at))}`);
  if (apiKey.last_used_at) {
    console.log(`${colors.highlight('Last Used:')} ${colors.muted(formatDate(apiKey.last_used_at))}`);
  }
  if (apiKey.expires_at) {
    console.log(`${colors.highlight('Expires:')} ${colors.warning(formatDate(apiKey.expires_at))}`);
  }
  if (apiKey.service_scopes && apiKey.service_scopes.length > 0) {
    console.log(`${colors.highlight('External Services:')} ${colors.muted(apiKey.service_scopes.map((scope) => scope.service_key).join(', '))}`);
  }
  console.log(colors.info('━'.repeat(60)));
};

const fetchConfiguredServices = async (): Promise<ConfiguredService[]> => {
  const response = await apiClient.get(`${API_KEYS_BASE}/services/configured`);
  const services = unwrapEnvelope<ConfiguredService[]>(response);
  return Array.isArray(services) ? services : [];
};

const resolveServicePayload = async (
  options: {
    name?: string;
    accessLevel?: string;
    expiresInDays?: string;
    scopes?: string;
    serviceType?: string;
    serviceKeys?: string;
    rateLimits?: string;
    interactive?: boolean;
  }
): Promise<{
  name: string;
  access_level?: string;
  expires_in_days?: number;
  scopes?: string[];
  service_type?: ServiceType;
  service_keys?: string[];
  rate_limits?: Record<string, ServiceScopeRateLimit>;
}> => {
  let payload = {
    name: options.name,
    access_level: options.accessLevel,
    expires_in_days: parseOptionalPositiveInteger(options.expiresInDays, '--expires-in-days'),
    scopes: parseCommaList(options.scopes),
    service_type: (options.serviceType as ServiceType | undefined),
    service_keys: parseCommaList(options.serviceKeys),
    rate_limits: parseOptionalJsonObject<Record<string, ServiceScopeRateLimit>>(options.rateLimits, '--rate-limits')
  };

  if (!options.interactive && payload.name) {
    return payload;
  }

  const configuredServices = await fetchConfiguredServices();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'API key name:',
      when: !payload.name,
      default: payload.name,
      validate: (input: string) => input.trim().length > 0 || 'Name is required'
    },
    {
      type: 'select',
      name: 'access_level',
      message: 'Access level:',
      when: !payload.access_level,
      default: payload.access_level || 'authenticated',
      choices: accessLevelChoices
    },
    {
      type: 'input',
      name: 'expires_in_days',
      message: 'Expires in days (optional):',
      default: payload.expires_in_days?.toString() || '',
      when: payload.expires_in_days === undefined,
      validate: (input: string) => {
        if (!input.trim()) return true;
        const parsed = Number.parseInt(input, 10);
        return Number.isFinite(parsed) && parsed > 0 ? true : 'Must be a positive integer';
      },
      filter: (input: string) => input.trim() ? Number.parseInt(input, 10) : undefined
    },
    {
      type: 'input',
      name: 'scopes',
      message: 'Scopes (comma-separated, optional):',
      default: payload.scopes.join(', '),
      when: payload.scopes.length === 0,
      filter: (input: string) => parseCommaList(input)
    },
    {
      type: 'select',
      name: 'service_type',
      message: 'External service access:',
      when: !payload.service_type,
      default: payload.service_type || 'all',
      choices: serviceTypeChoices
    },
    {
      type: 'checkbox',
      name: 'service_keys',
      message: 'Configured external services:',
      when: (answers: { service_type?: ServiceType }) =>
        (answers.service_type || payload.service_type) === 'specific' && configuredServices.length > 0 && payload.service_keys.length === 0,
      choices: configuredServices.map((service) => ({
        name: `${service.display_name} (${service.service_key})`,
        value: service.service_key,
        checked: payload.service_keys.includes(service.service_key)
      })),
      validate: (input: string[]) => input.length > 0 || 'Select at least one configured service'
    }
  ]);

  payload = {
    ...payload,
    ...answers,
    scopes: Array.isArray(answers.scopes) ? answers.scopes : payload.scopes,
    service_keys: Array.isArray(answers.service_keys) ? answers.service_keys : payload.service_keys
  };

  if (payload.service_type === 'specific' && payload.service_keys.length === 0) {
    throw new Error('Specific service mode requires at least one configured service');
  }

  return payload;
};

apiKeysCommand
  .command('create')
  .description('Create a platform API key')
  .option('-n, --name <name>', 'API key name')
  .option('--access-level <level>', 'Access level (public, authenticated, team, admin, enterprise)')
  .option('--expires-in-days <days>', 'Expiration in days')
  .option('--scopes <scopes>', 'Comma-separated scopes')
  .option('--service-type <type>', 'External service mode (all, specific)')
  .option('--service-keys <keys>', 'Comma-separated configured external service keys')
  .option('--rate-limits <json>', 'Optional JSON object of per-service rate limits')
  .option('--interactive', 'Interactive mode')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const payload = await resolveServicePayload(options);
      const route = payload.service_type === 'specific' || (payload.service_keys?.length || 0) > 0 || payload.rate_limits
        ? `${API_KEYS_BASE}/with-services`
        : API_KEYS_BASE;

      const response = await apiClient.post(route, payload);
      const apiKey = unwrapEnvelope<PlatformApiKey>(response);

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(colors.success('🔐 API key created successfully!'));
      renderKeySummary(apiKey);
      if (apiKey.key) {
        console.log(`${colors.highlight('Key Value:')} ${colors.warning(apiKey.key)}`);
      }
      console.log(colors.warning('⚠️  Save the key value now. It will not be shown again.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to create API key:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('list')
  .alias('ls')
  .description('List platform API keys')
  .option('--include-inactive', 'Include revoked/inactive keys')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const query = options.includeInactive ? '?active_only=false' : '';
      const response = await apiClient.get(`${API_KEYS_BASE}${query}`);
      const apiKeys = unwrapEnvelope<PlatformApiKey[]>(response);

      if (options.json) {
        console.log(JSON.stringify(apiKeys, null, 2));
        return;
      }

      if (!Array.isArray(apiKeys) || apiKeys.length === 0) {
        console.log(colors.warning('⚠️  No API keys found'));
        console.log(colors.muted('Run: lanonasis api-keys create'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Name', 'Access', 'Permissions', 'Service', 'Status', 'Last Used'].map((header) => colors.accent(header)),
        style: { head: [], border: [] }
      });

      apiKeys.forEach((key) => {
        table.push([
          truncateText(key.id, 18),
          key.name,
          key.access_level,
          truncateText(formatPermissions(key.permissions), 28),
          key.service || 'all',
          key.is_active ? colors.success('active') : colors.error('inactive'),
          key.last_used_at ? formatDate(key.last_used_at) : colors.muted('never')
        ]);
      });

      console.log(colors.primary('🔐 Platform API Keys'));
      console.log(colors.info('═'.repeat(96)));
      console.log(table.toString());
      console.log(colors.info('═'.repeat(96)));
      console.log(colors.muted(`Total: ${colors.highlight(String(apiKeys.length))} keys`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to list API keys:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('get')
  .description('Get a platform API key')
  .argument('<keyId>', 'API key ID')
  .option('--json', 'Output as JSON')
  .action(async (keyId, options) => {
    try {
      const response = await apiClient.get(`${API_KEYS_BASE}/${keyId}`);
      const apiKey = unwrapEnvelope<PlatformApiKey>(response);

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(colors.primary('🔍 API Key Details'));
      renderKeySummary(apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to get API key:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('update')
  .description('Update API key scopes')
  .argument('<keyId>', 'API key ID')
  .option('--scopes <scopes>', 'Comma-separated scopes')
  .option('--interactive', 'Interactive mode')
  .option('--json', 'Output as JSON')
  .action(async (keyId, options) => {
    try {
      let scopes = parseCommaList(options.scopes);

      if (options.interactive || scopes.length === 0) {
        const response = await apiClient.get(`${API_KEYS_BASE}/${keyId}`);
        const apiKey = unwrapEnvelope<PlatformApiKey>(response);

        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'scopes',
            message: 'Scopes (comma-separated):',
            default: formatPermissions(apiKey.permissions),
            validate: (input: string) => input.trim().length > 0 || 'At least one scope is required',
            filter: (input: string) => parseCommaList(input)
          }
        ]);

        scopes = answers.scopes;
      }

      const response = await apiClient.put(`${API_KEYS_BASE}/${keyId}`, { scopes });
      const apiKey = unwrapEnvelope<PlatformApiKey>(response);

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(colors.success('🔄 API key scopes updated successfully!'));
      renderKeySummary(apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to update API key:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('rotate')
  .description('Rotate an API key and return the new key value')
  .argument('<keyId>', 'API key ID')
  .option('-f, --force', 'Skip confirmation')
  .option('--json', 'Output as JSON')
  .action(async (keyId, options) => {
    try {
      if (!options.force) {
        const response = await apiClient.get(`${API_KEYS_BASE}/${keyId}`);
        const apiKey = unwrapEnvelope<PlatformApiKey>(response);
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Rotate "${apiKey.name}"? The old key value will stop working.`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(colors.warning('🚫 Operation cancelled'));
          return;
        }
      }

      const response = await apiClient.post(`${API_KEYS_BASE}/${keyId}/rotate`, {});
      const apiKey = unwrapEnvelope<PlatformApiKey>(response);

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(colors.success('🔁 API key rotated successfully!'));
      renderKeySummary(apiKey);
      if (apiKey.key) {
        console.log(`${colors.highlight('New Key Value:')} ${colors.warning(apiKey.key)}`);
      }
      console.log(colors.warning('⚠️  Save the new key value now. It will not be shown again.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to rotate API key:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('revoke')
  .description('Revoke an API key without deleting it')
  .argument('<keyId>', 'API key ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (keyId, options) => {
    try {
      if (!options.force) {
        const response = await apiClient.get(`${API_KEYS_BASE}/${keyId}`);
        const apiKey = unwrapEnvelope<PlatformApiKey>(response);
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Revoke "${apiKey.name}"? It can be re-enabled later.`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(colors.warning('🚫 Operation cancelled'));
          return;
        }
      }

      await apiClient.post(`${API_KEYS_BASE}/${keyId}/revoke`, {});
      console.log(colors.success('⛔ API key revoked successfully!'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to revoke API key:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand
  .command('delete')
  .alias('rm')
  .description('Delete an API key permanently')
  .argument('<keyId>', 'API key ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (keyId, options) => {
    try {
      if (!options.force) {
        const response = await apiClient.get(`${API_KEYS_BASE}/${keyId}`);
        const apiKey = unwrapEnvelope<PlatformApiKey>(response);
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Delete "${apiKey.name}" permanently? This cannot be undone.`,
            default: false
          }
        ]);

        if (!confirm) {
          console.log(colors.warning('🚫 Operation cancelled'));
          return;
        }
      }

      await apiClient.delete(`${API_KEYS_BASE}/${keyId}`);
      console.log(colors.success('🗑️  API key deleted successfully!'));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to delete API key:'), colors.muted(message));
      process.exit(1);
    }
  });

const servicesCommand = new Command('services')
  .description(colors.accent('🔌 Manage external service scoping for platform API keys'));

servicesCommand
  .command('configured')
  .description('List configured external services available for scoping')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const services = await fetchConfiguredServices();

      if (options.json) {
        console.log(JSON.stringify(services, null, 2));
        return;
      }

      if (services.length === 0) {
        console.log(colors.warning('⚠️  No configured external services found'));
        return;
      }

      const table = new Table({
        head: ['Service Key', 'Display Name', 'Category', 'Enabled'].map((header) => colors.accent(header)),
        style: { head: [], border: [] }
      });

      services.forEach((service) => {
        table.push([
          service.service_key,
          service.display_name,
          service.category,
          service.is_enabled ? colors.success('yes') : colors.error('no')
        ]);
      });

      console.log(colors.primary('🔌 Configured External Services'));
      console.log(table.toString());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to fetch configured services:'), colors.muted(message));
      process.exit(1);
    }
  });

servicesCommand
  .command('set-scopes')
  .description('Set external service scopes for an API key')
  .argument('<keyId>', 'API key ID')
  .option('--service-keys <keys>', 'Comma-separated configured external service keys')
  .option('--rate-limits <json>', 'Optional JSON object of per-service rate limits')
  .option('--interactive', 'Interactive mode')
  .option('--json', 'Output as JSON')
  .action(async (keyId, options) => {
    try {
      let serviceKeys = parseCommaList(options.serviceKeys);
      const rateLimits = parseOptionalJsonObject<Record<string, ServiceScopeRateLimit>>(options.rateLimits, '--rate-limits');

      if (options.interactive || serviceKeys.length === 0) {
        const services = await fetchConfiguredServices();
        if (services.length === 0) {
          throw new Error('No configured external services are available for selection');
        }

        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'serviceKeys',
            message: 'Select configured external services:',
            choices: services.map((service) => ({
              name: `${service.display_name} (${service.service_key})`,
              value: service.service_key,
              checked: serviceKeys.includes(service.service_key)
            })),
            validate: (input: string[]) => input.length > 0 || 'Select at least one service'
          }
        ]);

        serviceKeys = answers.serviceKeys;
      }

      const response = await apiClient.put(`${API_KEYS_BASE}/${keyId}/service-scopes`, {
        service_keys: serviceKeys,
        rate_limits: rateLimits
      });
      const apiKey = unwrapEnvelope<PlatformApiKey>(response);

      if (options.json) {
        console.log(JSON.stringify(apiKey, null, 2));
        return;
      }

      console.log(colors.success('🔌 External service scopes updated successfully!'));
      renderKeySummary(apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(colors.error('✖ Failed to update service scopes:'), colors.muted(message));
      process.exit(1);
    }
  });

apiKeysCommand.addCommand(servicesCommand);

export default apiKeysCommand;
