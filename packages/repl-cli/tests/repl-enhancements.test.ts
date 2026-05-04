import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReplEngine } from '../src/core/repl-engine';
import { ReplConfig } from '../src/config/types';

describe('ReplEngine Enhancements - History, Completion, Multi-line', () => {
  let config: ReplConfig;
  let engine: ReplEngine;

  beforeEach(() => {
    config = {
      apiUrl: 'http://localhost:3000',
      useMCP: false,
      historyFile: '/tmp/test-history',
      maxHistorySize: 100
    };
    engine = new ReplEngine(config);
  });

  describe('Command History', () => {
    it('should initialize with empty history', () => {
      expect(engine['inputHistory']).toEqual([]);
    });

    it('should add commands to history', async () => {
      await engine['processInput']('search typescript');
      expect(engine['inputHistory']).toContain('search typescript');
    });

    it('should avoid duplicate consecutive commands', async () => {
      await engine['processInput']('list');
      await engine['processInput']('list');
      expect(engine['inputHistory'].filter(cmd => cmd === 'list').length).toBe(1);
    });

    it('should allow same command if not consecutive', async () => {
      await engine['processInput']('list');
      await engine['processInput']('search test');
      await engine['processInput']('list');
      expect(engine['inputHistory'].filter(cmd => cmd === 'list').length).toBe(2);
    });

    it('should maintain history up to maxHistorySize commands', async () => {
      // Mock handleCommand to avoid real network calls — we're testing history trimming only
      vi.spyOn(engine as any, 'handleCommand').mockResolvedValue(undefined);
      vi.spyOn(engine as any, 'rl', 'get').mockReturnValue({ prompt: vi.fn() });

      for (let i = 0; i < 105; i++) {
        await engine['processInput'](`unique command ${i}`);
      }
      expect(engine['inputHistory'].length).toBeLessThanOrEqual(config.maxHistorySize);
    });
  });

  describe('Tab Completion', () => {
    it('should provide command completions', () => {
      const completer = engine['createCompleter'].bind(engine);
      const [completions] = completer('cre');
      expect(completions).toContain('create');
    });

    it('should provide all commands when input is empty', () => {
      const completer = engine['createCompleter'].bind(engine);
      const [completions] = completer('');
      expect(completions).toContain('create');
      expect(completions).toContain('search');
      expect(completions).toContain('list');
      expect(completions).toContain('delete');
      expect(completions).toContain('help');
    });

    it('should include command aliases', () => {
      const completer = engine['createCompleter'].bind(engine);
      const [completions] = completer('');
      expect(completions).toContain('del');
      expect(completions).toContain('rm');
      expect(completions).toContain('edit');
      expect(completions).toContain('h');
      expect(completions).toContain('q');
    });

    it('should be case-insensitive', () => {
      const completer = engine['createCompleter'].bind(engine);
      const [completions] = completer('CRE');
      expect(completions).toContain('create');
    });

    it('should return all commands when no match found', () => {
      const completer = engine['createCompleter'].bind(engine);
      const [completions] = completer('xyz');
      // When no matches, completer returns all available commands
      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-line Input Detection', () => {
    it('should detect unclosed single quotes', () => {
      expect(engine['isIncompleteInput']("create 'test")).toBe(true);
    });

    it('should detect unclosed double quotes', () => {
      expect(engine['isIncompleteInput']('create "test')).toBe(true);
    });

    it('should detect unclosed backticks', () => {
      expect(engine['isIncompleteInput']('create `test')).toBe(true);
    });

    it('should detect unclosed braces', () => {
      expect(engine['isIncompleteInput']('create {test')).toBe(true);
    });

    it('should detect unclosed brackets', () => {
      expect(engine['isIncompleteInput']('create [test')).toBe(true);
    });

    it('should detect unclosed parentheses', () => {
      expect(engine['isIncompleteInput']('create (test')).toBe(true);
    });

    it('should detect unclosed code blocks', () => {
      expect(engine['isIncompleteInput']('create ```code')).toBe(true);
    });

    it('should detect explicit continuation with backslash', () => {
      expect(engine['isIncompleteInput']('create test ' + '\\')).toBe(true);
    });

    it('should mark complete input as not incomplete', () => {
      expect(engine['isIncompleteInput']('create "test"')).toBe(false);
    });

    it('should handle nested structures', () => {
      expect(engine['isIncompleteInput']('create {"key": ["value"]}')).toBe(false);
    });

    it('should handle balanced quotes', () => {
      expect(engine['isIncompleteInput']("create 'test' \"content\"")).toBe(false);
    });

    it('should allow apostrophes in natural language input', () => {
      expect(engine['isIncompleteInput']("what's in my memory")).toBe(false);
    });

    it('should handle empty input', () => {
      expect(engine['isIncompleteInput']('')).toBe(false);
    });

    it('should handle whitespace-only input', () => {
      expect(engine['isIncompleteInput']('   ')).toBe(false);
    });
  });

  describe('Multi-line Mode State', () => {
    it('should start with multiline mode disabled', () => {
      expect(engine['isMultilineMode']).toBe(false);
      expect(engine['multilineBuffer']).toBe('');
    });

    it('should track multiline buffer correctly', () => {
      engine['multilineBuffer'] = 'create "test';
      engine['isMultilineMode'] = true;
      
      expect(engine['multilineBuffer']).toBe('create "test');
      expect(engine['isMultilineMode']).toBe(true);
    });
  });

  describe('History Command', () => {
    it('should be registered as a command', () => {
      const commands = engine['registry'].getCommands();
      expect(commands).toContain('history');
    });

    it('should have hist alias', () => {
      const aliases = engine['registry'].getAliases();
      expect(aliases.get('hist')).toBe('history');
    });
  });
});
