import { describe, it, expect } from 'vitest';
import { runEcho } from '../src/commands/echo.js';

describe('runEcho (Phase 1 smoke)', () => {
  it('reverses a non-empty string', () => {
    expect(runEcho('hello')).toEqual({ input: 'hello', output: 'olleh' });
  });

  it('trims whitespace before reversing', () => {
    expect(runEcho('  abc  ')).toEqual({ input: 'abc', output: 'cba' });
  });

  it('returns a placeholder when input is empty', () => {
    expect(runEcho('').output).toMatch(/no input/);
  });

  it('handles multi-byte characters', () => {
    // Phase 6+ will need this for non-Latin identities — assert it now so a
    // future refactor that swaps to string mutation doesn't silently break it.
    const { output } = runEcho('héllo');
    expect([...output].reverse().join('')).toBe('héllo');
  });
});
