/**
 * Snapshot tests for the pure renderSearchResults() function.
 *
 * Closes audit finding F-004: the CLI memory-search rendering path had no
 * shape contract assertions. The function is now factored out of the
 * commander action and rendered against canonical fixtures here.
 */

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import chalk from 'chalk';
import { renderSearchResults } from '../src/commands/mcp.js';

describe('renderSearchResults', () => {
  let originalChalkLevel: number;

  beforeAll(() => {
    // Force plain text so snapshots stay stable across TTY/CI envs.
    originalChalkLevel = chalk.level;
    chalk.level = 0;
  });

  afterAll(() => {
    chalk.level = originalChalkLevel;
  });

  it('renders the canonical 3-result fixture stably', () => {
    const fixture = [
      {
        id: 'mem-001',
        title: 'Onasis gateway plan',
        memory_type: 'project',
        similarity_score: 0.9123,
        content: 'Auth gateway HA migration notes including Redis fallback strategy.',
      },
      {
        id: 'mem-002',
        title: 'Memory CLI search bug',
        memory_type: 'context',
        similarity_score: 0.7314,
        content: 'CLI lexical fallback path triggers when vector search fails.',
      },
      {
        id: 'mem-003',
        title: 'Token rotation runbook',
        memory_type: 'reference',
        similarity_score: 0.6088,
        content:
          'Steps for rotating Supabase service-role and JWT secrets across services without downtime — preserves session continuity for in-flight users.',
      },
    ];

    expect(renderSearchResults(fixture)).toMatchInlineSnapshot(`
      "
      🔍 Search Results:

      1. Onasis gateway plan
         ID: mem-001
         Type: project
         Score: 91.2%
         Content: Auth gateway HA migration notes including Redis fallback strategy....

      2. Memory CLI search bug
         ID: mem-002
         Type: context
         Score: 73.1%
         Content: CLI lexical fallback path triggers when vector search fails....

      3. Token rotation runbook
         ID: mem-003
         Type: reference
         Score: 60.9%
         Content: Steps for rotating Supabase service-role and JWT secrets across services without downtime — preserve..."
    `);
  });

  it('truncates long content to the default 100-char preview', () => {
    const longContent = 'A'.repeat(500);
    const out = renderSearchResults([
      {
        id: 'long-1',
        title: 'long',
        memory_type: 'context',
        similarity_score: 1,
        content: longContent,
      },
    ]);

    // Preview should be exactly 100 'A's followed by an ellipsis.
    expect(out).toContain(`Content: ${'A'.repeat(100)}...`);
    expect(out).not.toContain(`Content: ${'A'.repeat(101)}`);
  });

  it('respects a custom contentPreviewLength option', () => {
    const out = renderSearchResults(
      [
        {
          id: 'short-1',
          title: 't',
          memory_type: 'context',
          similarity_score: 0.5,
          content: 'B'.repeat(50),
        },
      ],
      { contentPreviewLength: 20 },
    );
    expect(out).toContain(`Content: ${'B'.repeat(20)}...`);
  });

  it('falls back to "context" when memory_type is omitted', () => {
    const out = renderSearchResults([
      {
        id: 'no-type-1',
        title: 'untyped',
        similarity_score: 0.5,
        content: 'no type set',
      },
    ]);
    expect(out).toContain('Type: context');
  });

  it('formats similarity_score as a single-decimal percentage', () => {
    const out = renderSearchResults([
      {
        id: 's-1',
        title: 't',
        memory_type: 'context',
        similarity_score: 0.836712,
        content: 'c',
      },
    ]);
    expect(out).toContain('Score: 83.7%');
  });

  it('returns a single-line header when results array is empty', () => {
    expect(renderSearchResults([])).toBe('\n🔍 Search Results:');
  });
});
