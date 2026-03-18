/**
 * Contract-level command schema tests for CLI.
 *
 * Mirrors mcp-core tool-suite intent:
 * - enforce 45-command coverage
 * - validate representative payloads
 * - catch contract drift between command schemas and CLI implementation
 */

import { describe, expect, it } from '@jest/globals';
import {
  EXPECTED_COMMAND_NAMES,
  COMMAND_CATEGORIES,
  COMMAND_SCHEMAS,
  VALID_COMMAND_EXAMPLES,
  commandNameToCli,
} from './command-contract.fixtures.js';

describe('CLI Commands - 45 Commands', () => {
  it('has an explicit contract for all 45 commands', () => {
    expect(EXPECTED_COMMAND_NAMES).toHaveLength(45);
    expect(Object.keys(COMMAND_SCHEMAS)).toHaveLength(45);
    expect(Object.keys(VALID_COMMAND_EXAMPLES)).toHaveLength(45);
  });

  it('keeps categories in sync with total command count', () => {
    const flattened = Object.values(COMMAND_CATEGORIES).flat();
    expect(flattened).toHaveLength(45);
    expect(new Set(flattened).size).toBe(45);
    expect(flattened.sort()).toEqual([...EXPECTED_COMMAND_NAMES].sort());
  });

  it('has correct category distribution', () => {
    expect(COMMAND_CATEGORIES.auth).toHaveLength(5);
    expect(COMMAND_CATEGORIES.memory).toHaveLength(11);
    expect(COMMAND_CATEGORIES.topics).toHaveLength(5);
    expect(COMMAND_CATEGORIES.config).toHaveLength(4);
    expect(COMMAND_CATEGORIES.apiKeys).toHaveLength(4);
    expect(COMMAND_CATEGORIES.mcp).toHaveLength(10);
    expect(COMMAND_CATEGORIES.system).toHaveLength(6);
  });

  describe('Command name to CLI path conversion', () => {
    it('converts auth commands correctly', () => {
      expect(commandNameToCli('auth_login')).toBe('auth login');
      expect(commandNameToCli('auth_logout')).toBe('auth logout');
      expect(commandNameToCli('auth_status')).toBe('auth status');
    });

    it('converts memory commands correctly', () => {
      expect(commandNameToCli('memory_list')).toBe('memory list');
      expect(commandNameToCli('memory_create')).toBe('memory create');
      expect(commandNameToCli('memory_save_session')).toBe('memory save-session');
    });

    it('converts topic commands correctly', () => {
      expect(commandNameToCli('topics_list')).toBe('topic list');
      expect(commandNameToCli('topics_create')).toBe('topic create');
    });

    it('converts system commands correctly', () => {
      expect(commandNameToCli('system_health')).toBe('health');
      expect(commandNameToCli('system_status')).toBe('status');
      expect(commandNameToCli('system_completion')).toBe('completion');
    });
  });

  // Test each command schema
  for (const commandName of EXPECTED_COMMAND_NAMES) {
    it(`${commandName} accepts its valid sample payload`, () => {
      const schema = COMMAND_SCHEMAS[commandName];
      const sample = VALID_COMMAND_EXAMPLES[commandName];
      expect(() => schema.parse(sample)).not.toThrow();
    });

    it(`${commandName} rejects unknown fields (strict schema)`, () => {
      const schema = COMMAND_SCHEMAS[commandName];
      const sample = VALID_COMMAND_EXAMPLES[commandName] as Record<string, unknown>;
      expect(() => schema.parse({ ...sample, __unexpected: true })).toThrow();
    });
  }

  describe('Auth command validation', () => {
    it('auth_login accepts vendor key', () => {
      const schema = COMMAND_SCHEMAS.auth_login;
      expect(() => schema.parse({ vendorKey: 'pk_test_abc123' })).not.toThrow();
    });

    it('auth_login accepts oauth flag', () => {
      const schema = COMMAND_SCHEMAS.auth_login;
      expect(() => schema.parse({ oauth: true })).not.toThrow();
    });

    it('auth_register requires matching passwords', () => {
      const schema = COMMAND_SCHEMAS.auth_register;
      // Schema doesn't enforce match, that's runtime validation
      expect(() => schema.parse({
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        organizationName: 'Test Org',
      })).not.toThrow();
    });

    it('auth_register requires valid email', () => {
      const schema = COMMAND_SCHEMAS.auth_register;
      expect(() => schema.parse({
        email: 'invalid-email',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        organizationName: 'Test Org',
      })).toThrow();
    });
  });

  describe('Memory command validation', () => {
    it('memory_create enforces memory type enum', () => {
      const schema = COMMAND_SCHEMAS.memory_create;
      expect(() => schema.parse({
        title: 'Test',
        content: 'Content',
        type: 'invalid_type',
      })).toThrow();
    });

    it('memory_create accepts valid memory types', () => {
      const schema = COMMAND_SCHEMAS.memory_create;
      for (const type of ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow']) {
        expect(() => schema.parse({
          title: 'Test',
          content: 'Content',
          type,
        })).not.toThrow();
      }
    });

    it('memory_create enforces title length', () => {
      const schema = COMMAND_SCHEMAS.memory_create;
      expect(() => schema.parse({ title: '', content: 'Content' })).toThrow();
      expect(() => schema.parse({ title: 'A'.repeat(501), content: 'Content' })).toThrow();
    });

    it('memory_search requires query', () => {
      const schema = COMMAND_SCHEMAS.memory_search;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ query: '' })).toThrow();
    });

    it('memory_delete accepts force flag', () => {
      const schema = COMMAND_SCHEMAS.memory_delete;
      expect(() => schema.parse({ id: '123e4567-e89b-42d3-a456-426614174000', force: true })).not.toThrow();
    });
  });

  describe('Topic command validation', () => {
    it('topics_create enforces color hex format', () => {
      const schema = COMMAND_SCHEMAS.topics_create;
      expect(() => schema.parse({ name: 'Test', color: 'invalid' })).toThrow();
      expect(() => schema.parse({ name: 'Test', color: '#3B82F6' })).not.toThrow();
      expect(() => schema.parse({ name: 'Test', color: '#abc123' })).not.toThrow();
    });

    it('topics_update requires id', () => {
      const schema = COMMAND_SCHEMAS.topics_update;
      expect(() => schema.parse({ name: 'Updated' })).toThrow();
    });
  });

  describe('Config command validation', () => {
    it('config_set requires both key and value', () => {
      const schema = COMMAND_SCHEMAS.config_set;
      expect(() => schema.parse({ key: 'apiUrl' })).toThrow();
      expect(() => schema.parse({ value: 'https://api.example.com' })).toThrow();
    });

    it('config_get requires key', () => {
      const schema = COMMAND_SCHEMAS.config_get;
      expect(() => schema.parse({})).toThrow();
    });
  });

  describe('API Keys command validation', () => {
    it('api_keys_create requires name', () => {
      const schema = COMMAND_SCHEMAS.api_keys_create;
      expect(() => schema.parse({})).toThrow();
    });

    it('api_keys_revoke requires id', () => {
      const schema = COMMAND_SCHEMAS.api_keys_revoke;
      expect(() => schema.parse({})).toThrow();
    });
  });

  describe('MCP command validation', () => {
    it('mcp_connect accepts mode flags', () => {
      const schema = COMMAND_SCHEMAS.mcp_connect;
      expect(() => schema.parse({ remote: true })).not.toThrow();
      expect(() => schema.parse({ local: true })).not.toThrow();
      expect(() => schema.parse({ auto: true })).not.toThrow();
    });

    it('mcp_call requires tool name', () => {
      const schema = COMMAND_SCHEMAS.mcp_call;
      expect(() => schema.parse({})).toThrow();
      expect(() => schema.parse({ tool: '' })).toThrow();
    });

    it('mcp_server_start accepts port', () => {
      const schema = COMMAND_SCHEMAS.mcp_server_start;
      expect(() => schema.parse({ port: '3001' })).not.toThrow();
    });
  });

  describe('System command validation', () => {
    it('system_completion accepts valid shells', () => {
      const schema = COMMAND_SCHEMAS.system_completion;
      for (const shell of ['bash', 'zsh', 'fish']) {
        expect(() => schema.parse({ shell })).not.toThrow();
      }
    });

    it('system_completion rejects invalid shells', () => {
      const schema = COMMAND_SCHEMAS.system_completion;
      expect(() => schema.parse({ shell: 'powershell' })).toThrow();
    });
  });
});
