import { describe, it, expect } from '@jest/globals';

describe('Config Tests', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });

  it('should have NODE_ENV set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});