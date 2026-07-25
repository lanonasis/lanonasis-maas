import { describe, expect, it } from '@jest/globals';
import { displayConsumer, parseConsumer } from '../commands/api-consumer.js';

describe('API key consumer helpers', () => {
  it.each([
    ['Claude', 'claude'],
    [' hermes ', 'hermes'],
    ['OPENCLAW', 'openclaw'],
  ])('parses %s as %s', (input, expected) => {
    expect(parseConsumer(input)).toBe(expected);
  });

  it('rejects unsupported consumers', () => {
    expect(() => parseConsumer('browser')).toThrow(
      'Invalid consumer. Allowed: claude, hermes, openclaw',
    );
  });

  it('treats an empty selection as unbound', () => {
    expect(parseConsumer('')).toBeUndefined();
  });

  it('prefers explicit metadata over a legacy name tag', () => {
    expect(displayConsumer({
      consumer: 'hermes',
      name: '[claude] Legacy key',
    })).toBe('hermes');
  });

  it('normalizes legacy name tags case-insensitively', () => {
    expect(displayConsumer({ name: '[OpenClaw] Legacy key' })).toBe('openclaw');
  });

  it('shows an unbound marker when no consumer metadata exists', () => {
    expect(displayConsumer({ name: 'Legacy key' })).toBe('—');
  });
});
