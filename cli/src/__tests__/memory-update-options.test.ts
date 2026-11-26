import { describe, expect, it } from '@jest/globals';
import { buildMemoryUpdateRequest } from '../utils/memory-update-options.js';

describe('buildMemoryUpdateRequest', () => {
  it('keeps a plain update as a replace with no mode sent', () => {
    expect(buildMemoryUpdateRequest({ content: 'new text', tags: 'a, b,' })).toEqual({
      content: 'new text',
      tags: ['a', 'b'],
    });
  });

  it('sends mode append with the content for --append', () => {
    expect(buildMemoryUpdateRequest({ content: 'more', append: true })).toEqual({
      content: 'more',
      mode: 'append',
    });
  });

  it('rejects --append without content', () => {
    expect(() => buildMemoryUpdateRequest({ append: true })).toThrow(/--content/);
    expect(() => buildMemoryUpdateRequest({ append: true, content: '   ' })).toThrow(/--content/);
  });

  it('rejects --append with --forget-history or --interactive', () => {
    expect(() => buildMemoryUpdateRequest({ content: 'x', append: true, forgetHistory: true }))
      .toThrow(/--forget-history/);
    expect(() => buildMemoryUpdateRequest({ content: 'x', append: true, interactive: true }))
      .toThrow(/--interactive/);
  });

  it('allows --forget-history on its own', () => {
    expect(buildMemoryUpdateRequest({ forgetHistory: true })).toEqual({ forget_history: true });
  });
});
