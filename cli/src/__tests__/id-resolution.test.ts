import { describe, expect, it, jest } from '@jest/globals';
import {
  isFullUuid,
  MIN_ID_PREFIX_LENGTH,
  resolveIdPrefix,
} from '../utils/id-resolution.js';

const KEY_A = 'aaaa1111-1111-4111-8111-111111111111';
const KEY_B = 'bbbb2222-2222-4222-8222-222222222222';
const AMBIGUOUS_A = 'cccc3333-3333-4333-8333-333333333333';
const AMBIGUOUS_B = 'cccc3333-4444-4444-8444-444444444444';

describe('id-resolution', () => {
  describe('isFullUuid', () => {
    it('accepts a standard UUID', () => {
      expect(isFullUuid(KEY_A)).toBe(true);
    });

    it('accepts non-v4 hex UUID shapes', () => {
      expect(isFullUuid('dddd4444-5555-4666-8777-888888888888')).toBe(true);
    });

    it('rejects prefixes and arbitrary strings', () => {
      expect(isFullUuid('aaaa1111')).toBe(false);
      expect(isFullUuid('not-a-uuid')).toBe(false);
    });
  });

  describe('resolveIdPrefix', () => {
    it('returns a full UUID without listing candidates', async () => {
      const listIds = jest.fn(async () => [KEY_A]);
      await expect(resolveIdPrefix(KEY_A, { kind: 'API key', listIds })).resolves.toBe(KEY_A);
      expect(listIds).not.toHaveBeenCalled();
    });

    it(`rejects prefixes shorter than ${MIN_ID_PREFIX_LENGTH} characters before any request`, async () => {
      const listIds = jest.fn(async () => [KEY_A]);
      await expect(
        resolveIdPrefix('aaaa111', { kind: 'API key', listIds }),
      ).rejects.toThrow(/at least 8 characters or a full UUID/);
      expect(listIds).not.toHaveBeenCalled();
    });

    it('resolves a unique prefix to the full ID', async () => {
      const listIds = jest.fn(async () => [KEY_A, KEY_B]);
      await expect(
        resolveIdPrefix('aaaa1111', { kind: 'API key', listIds }),
      ).resolves.toBe(KEY_A);
    });

    it('matches case-insensitively', async () => {
      const listIds = jest.fn(async () => [KEY_A]);
      await expect(
        resolveIdPrefix('AAAA1111', { kind: 'API key', listIds }),
      ).resolves.toBe(KEY_A);
    });

    it('reports ambiguity with candidate matches', async () => {
      const listIds = jest.fn(async () => [AMBIGUOUS_A, AMBIGUOUS_B]);
      await expect(
        resolveIdPrefix('cccc3333', { kind: 'API key', listIds }),
      ).rejects.toThrow(/ambiguous/);
    });

    it('reports an unknown prefix clearly', async () => {
      const listIds = jest.fn(async () => [KEY_A]);
      await expect(
        resolveIdPrefix('deadbeef', { kind: 'Memory', listIds }),
      ).rejects.toThrow(/Memory not found for ID\/prefix: deadbeef/);
    });

    it('rejects an empty ID', async () => {
      const listIds = jest.fn(async () => [KEY_A]);
      await expect(
        resolveIdPrefix('   ', { kind: 'API key', listIds }),
      ).rejects.toThrow(/API key ID is required/);
    });

    it('trims surrounding whitespace', async () => {
      const listIds = jest.fn(async () => [KEY_A]);
      await expect(
        resolveIdPrefix('  aaaa1111  ', { kind: 'API key', listIds }),
      ).resolves.toBe(KEY_A);
    });
  });
});
