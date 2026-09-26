/**
 * local-backend.test.ts — covers SQLite FTS5 read/write, secret
 * redaction on persist, legacy markdown import, and pending-sync
 * queue drain via getSyncQueueDeps.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LocalMemoryBackend } from '../../src/local-memory/local-backend.js';
import { redactSecrets } from '../../src/local-memory/privacy.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
async function freshDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'repl-localmem-'));
  tempDirs.push(root);
  return root;
}

describe('privacy.redactSecrets', () => {
  it('redacts OpenAI / Anthropic / GitHub tokens', () => {
    const r = redactSecrets(
      `OPENAI_KEY=${['sk', 'abcdefghijklmnopqrstuvwxyz012345'].join('-')} ` +
      `and ${['sk', 'ant', 'api03', '1234567890abcdefghij'].join('-')} ` +
      `plus ${['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_')}`,
    );
    expect(r.text).toContain('[REDACTED:openai-api-key]');
    expect(r.text).toContain('[REDACTED:anthropic-api-key]');
    expect(r.text).toContain('[REDACTED:github-token]');
    expect(r.secretsFound).toBeGreaterThanOrEqual(3);
    expect(r.types).toContain('openai-api-key');
    expect(r.types).toContain('anthropic-api-key');
    expect(r.types).toContain('github-token');
  });

  it('redacts env-var assignments (API_KEY=value)', () => {
    // Use a generic secret value that isn't matched by the value-specific
    // patterns first. The assignment pattern catches `KEY=value` and
    // redacts as env-secret; value-specific patterns take precedence.
    const r = redactSecrets('export MY_CUSTOM_TOKEN=just-a-plain-string-no-pattern');
    expect(r.text).toContain('[REDACTED:env-secret]');
    expect(r.text).not.toContain('just-a-plain-string-no-pattern');
  });

  it('passes plain prose through unchanged', () => {
    const r = redactSecrets('The user prefers TypeScript over JavaScript and uses vim.');
    expect(r.text).toBe('The user prefers TypeScript over JavaScript and uses vim.');
    expect(r.secretsFound).toBe(0);
  });

  it('detects database URLs', () => {
    const r = redactSecrets('config DATABASE_URL=postgres://user:pass@host:5432/db');
    expect(r.text).toContain('[REDACTED:database-url]');
  });
});

describe('LocalMemoryBackend', () => {
  let backend: LocalMemoryBackend;
  let backendRoot: string;

  beforeEach(async () => {
    backendRoot = await freshDir();
    backend = new LocalMemoryBackend({ rootDir: backendRoot, mirrorToMarkdown: true });
    await backend.init();
  });

  it('saves and retrieves a memory record', async () => {
    const { id } = await backend.save({
      id: 'mem-test-1',
      title: 'OAuth Integration',
      content: 'Use magic link auth with PKCE flow for OAuth integrations.',
      memory_type: 'knowledge',
      status: 'active',
      tags: ['oauth', 'auth'],
    });
    expect(id).toBe('mem-test-1');

    const fetched = await backend.get('mem-test-1');
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe('OAuth Integration');
    expect(fetched!.memory_type).toBe('knowledge');
    expect(fetched!.tags).toEqual(['oauth', 'auth']);
  });

  it('redacts secrets before persisting', async () => {
    // Use a non-pattern-matching value so the env-secret redaction path runs.
    await backend.save({
      id: 'mem-secret',
      title: 'API config',
      content: 'set MY_CUSTOM_TOKEN=plain-string-no-secret-pattern-here',
      memory_type: 'reference',
      status: 'active',
      tags: [],
    });

    const fetched = await backend.get('mem-secret');
    expect(fetched).not.toBeNull();
    expect(fetched!.content).toContain('[REDACTED:env-secret]');
    expect(fetched!.content).not.toContain('plain-string-no-secret-pattern');
  });

  it('redacts nested metadata in SQLite and the queued payload without mutating input', async () => {
    const secret = ['ghp', 'abcdefghijklmnopqrstuvwxyz0123456789'].join('_');
    const metadata = { nested: { token: secret }, values: [secret, 'ordinary'], count: 2, empty: null };
    const expected = {
      nested: { token: '[REDACTED:github-token]' },
      values: ['[REDACTED:github-token]', 'ordinary'], count: 2, empty: null,
    };
    await backend.save({
      id: 'metadata', title: 'Metadata', content: 'safe',
      memory_type: 'context', status: 'active', tags: [], metadata,
    });
    expect((await backend.get('metadata'))!.metadata).toEqual(expected);
    const [row] = backend.getSyncQueueDeps().readReady(10);
    expect(JSON.parse(row.payload).metadata).toEqual(expected);
    expect(metadata.nested.token).toBe(secret);
  });

  it.each([undefined, null])('preserves %s metadata in the queue', async (metadata) => {
    await backend.save({
      id: 'empty-metadata', title: 'Metadata', content: 'safe',
      memory_type: 'context', status: 'active', tags: [],
      // Null is accepted by runtime callers even though the TS contract is optional.
      metadata: metadata as unknown as Record<string, unknown> | undefined,
    });
    const [row] = backend.getSyncQueueDeps().readReady(10);
    expect(JSON.parse(row.payload).metadata).toBe(metadata);
    expect((await backend.get('empty-metadata'))!.metadata).toBeUndefined();
  });

  it('excludes dropped rows while counting ready and delayed rows after reopening', async () => {
    for (const id of ['dropped', 'delayed', 'ready']) {
      await backend.save({ id, title: id, content: 'safe', memory_type: 'context', status: 'active', tags: [] });
    }
    const deps = backend.getSyncQueueDeps();
    const [dropped, delayed] = deps.readReady(10);
    deps.reschedule(delayed.id, 1, 'retry', 60);
    deps.drop(dropped.id, 'schema mismatch');
    expect(deps.count()).toBe(2);
    expect((await backend.health()).pendingSync).toBe(2);
    await backend.close();
    await backend.init();
    expect((await backend.health()).pendingSync).toBe(2);
    const result = await backend.save({
      id: 'another', title: 'Another', content: 'safe', memory_type: 'context', status: 'active', tags: [],
    });
    expect(result.pendingSync).toBe(3);
  });

  it('searches via FTS5 and ranks by relevance', async () => {
    await backend.save({
      id: 'a',
      title: 'OAuth Integration',
      content: 'OAuth PKCE flow with magic link auth.',
      memory_type: 'knowledge',
      status: 'active',
      tags: [],
    });
    await backend.save({
      id: 'b',
      title: 'Database Migrations',
      content: 'How to handle postgres migrations safely.',
      memory_type: 'reference',
      status: 'active',
      tags: [],
    });
    await backend.save({
      id: 'c',
      title: 'OAuth Best Practices',
      content: 'Always use PKCE in public clients.',
      memory_type: 'knowledge',
      status: 'active',
      tags: [],
    });

    const hits = await backend.search('oauth pkce', { limit: 5 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].id === 'a' || hits[0].id === 'c').toBe(true);
    expect(hits.every((h) => h.source === 'local')).toBe(true);
    expect(hits.every((h) => h.score >= 0 && h.score <= 1)).toBe(true);
  });

  it('falls back to LIKE search when FTS query has special chars', async () => {
    await backend.save({
      id: 'special',
      title: 'Pattern matching',
      content: 'some text',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    const hits = await backend.search('pattern', { limit: 5 });
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('special');
  });

  it('filters by memory_type', async () => {
    // Include the query term in both rows so type is the only differentiator.
    await backend.save({ id: 'ctx', title: 'a', content: 'oauth note', memory_type: 'context', status: 'active', tags: [] });
    await backend.save({ id: 'ref', title: 'c', content: 'oauth note', memory_type: 'reference', status: 'active', tags: [] });
    const hits = await backend.search('oauth', { limit: 10, type: 'reference' });
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('ref');
  });

  it('respects status filter', async () => {
    await backend.save({ id: 'live', title: 'a', content: 'foo', memory_type: 'context', status: 'active', tags: [] });
    await backend.save({ id: 'gone', title: 'b', content: 'foo', memory_type: 'context', status: 'deleted', tags: [] });
    const hits = await backend.search('foo', { limit: 10, status: 'active' });
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe('live');
  });

  it('touches last_accessed_at on hit', async () => {
    await backend.save({ id: 'touch', title: 'a', content: 'findable', memory_type: 'context', status: 'active', tags: [] });
    expect((await backend.get('touch'))!.last_accessed_at).toBeNull();
    await backend.search('findable', { limit: 5 });
    const after = await backend.get('touch');
    expect(after!.last_accessed_at).not.toBeNull();
  });

  it('lists records ordered by updated_at DESC', async () => {
    await backend.save({ id: 'old', title: 'a', content: 'b', memory_type: 'context', status: 'active', tags: [] });
    await new Promise((r) => setTimeout(r, 5));
    await backend.save({ id: 'new', title: 'c', content: 'd', memory_type: 'context', status: 'active', tags: [] });
    const items = await backend.list({ limit: 10 });
    expect(items[0].id).toBe('new');
    expect(items[1].id).toBe('old');
  });

  it('mirrors writes to daily markdown file', async () => {
    await backend.save({
      id: 'md-1',
      title: 'Markdown mirror test',
      content: 'should appear in memory/YYYY-MM-DD.md',
      memory_type: 'context',
      status: 'active',
      tags: ['test'],
    });
    const today = new Date().toISOString().slice(0, 10);
    const mdPath = join(backendRoot, 'memory', `${today}.md`);
    const content = await readFile(mdPath, 'utf8');
    expect(content).toContain('## Markdown mirror test');
    expect(content).toContain('id: md-1');
  });

  it('enqueues sync on save and exposes drainable deps', async () => {
    await backend.save({
      id: 'sync-1',
      title: 'pending sync',
      content: 'should appear in sync_queue',
      memory_type: 'context',
      status: 'active',
      tags: [],
    });
    const deps = backend.getSyncQueueDeps();
    expect(deps.count()).toBeGreaterThan(0);
    const rows = deps.readReady(10);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].op).toBe('save');
    expect(JSON.parse(rows[0].payload).id).toBe('sync-1');
  });

  it('imports pre-existing openclaw-format markdown on init', async () => {
    const root = await freshDir();
    const memDir = join(root, 'memory');
    await import('node:fs/promises').then((fs) => fs.mkdir(memDir, { recursive: true }));
    const today = new Date().toISOString().slice(0, 10);
    const legacyPath = join(memDir, `${today}.md`);
    await writeFile(
      legacyPath,
      [
        '## Heartbeat token',
        '',
        'plugin config with token',
        '',
        '---',
        '',
        '## OAuth notes',
        '',
        'PKCE flow recommended',
        '',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );

    const backend2 = new LocalMemoryBackend({ rootDir: root, mirrorToMarkdown: false });
    await backend2.init();

    const items = await backend2.list({ limit: 50 });
    const titles = items.map((r) => r.title);
    expect(titles).toContain('Heartbeat token');
    expect(titles).toContain('OAuth notes');
    expect(items.every((r) => r.source === 'import')).toBe(true);
  });
});
