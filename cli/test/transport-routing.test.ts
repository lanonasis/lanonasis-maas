import { describe, expect, it } from '@jest/globals';
import { isDirectApiFlow } from '../src/utils/transport-routing.js';

describe('CLI transport routing', () => {
  it('keeps API-key commands on their REST owner without --no-mcp', () => {
    expect(isDirectApiFlow('api-keys')).toBe(true);
    expect(isDirectApiFlow('create', 'api-keys')).toBe(true);
  });

  it('does not force unrelated commands onto REST', () => {
    expect(isDirectApiFlow('mcp')).toBe(false);
  });
});
