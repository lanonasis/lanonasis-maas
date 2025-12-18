import { describe, it, expect, beforeEach } from 'vitest';
import { ReplEngine } from '../src/core/repl-engine';
import { ReplConfig } from '../src/config/types';

describe('ReplEngine', () => {
  let config: ReplConfig;
  
  beforeEach(() => {
    config = {
      apiUrl: 'http://localhost:3000',
      useMCP: false,
      historyFile: '/tmp/test-history',
      maxHistorySize: 100
    };
  });
  
  it('should initialize with correct mode', () => {
    const engine = new ReplEngine(config);
    expect(engine['context'].mode).toBe('remote');
  });
  
  it('should initialize with local mode when MCP is enabled', () => {
    const mcpConfig = { ...config, useMCP: true };
    const engine = new ReplEngine(mcpConfig);
    expect(engine['context'].mode).toBe('local');
  });
  
  it('should have registered commands', () => {
    const engine = new ReplEngine(config);
    const commands = engine['registry'].getCommands();
    expect(commands.length).toBeGreaterThan(0);
    expect(commands).toContain('create');
    expect(commands).toContain('search');
    expect(commands).toContain('help');
    expect(commands).toContain('exit');
    expect(commands).toContain('nl');
    expect(commands).toContain('reset');
  });

  it('should initialize orchestrator with model configuration', () => {
    const modelConfig = { ...config, openaiModel: 'gpt-4' };
    const engine = new ReplEngine(modelConfig);
    expect(engine['orchestrator']['model']).toBe('gpt-4');
  });

  it('should initialize orchestrator with user context', () => {
    const userContextConfig = {
      ...config,
      userContext: {
        name: 'Test User',
        projects: ['project1', 'project2']
      }
    };
    const engine = new ReplEngine(userContextConfig);
    expect(engine['orchestrator']['userContext']).toEqual({
      name: 'Test User',
      projects: ['project1', 'project2']
    });
  });
});
