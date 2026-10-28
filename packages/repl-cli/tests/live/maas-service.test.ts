/**
 * Live MaaS behaviour tests for @lanonasis/repl-cli.
 *
 * Unlike tests/local-memory/*.test.ts (which inject a mock MemoryClient), these
 * tests build the real `createMemoryClient` the REPL uses and talk to the
 * deployed REST service. They answer the question the mocked suites cannot:
 * "does the REPL's remote memory path actually work against api.lanonasis.com?"
 *
 * Gated on LANO_TEST_API_KEY:
 *
 *   LANO_TEST_API_KEY=lano_... npm run test:live
 *
 * Tests prefixed "[known-gap]" assert correct behaviour and currently fail; they
 * are the regression spec for defects found while probing the live service.
 */

import { afterAll, describe, expect, it } from 'vitest';
import { createMemoryClient } from '@lanonasis/memory-client';
import { MaaSClientAdapter } from '../../src/local-memory/maas-adapter';

const API_KEY = process.env.LANO_TEST_API_KEY;
const REST_BASE = process.env.LANO_TEST_REST_BASE ?? 'https://api.lanonasis.com';
const TAG = `[repl-live ${new Date().toISOString()}]`;

const describeLive = API_KEY ? describe : describe.skip;

const createdIds: string[] = [];

function makeClient() {
  return createMemoryClient({
    apiUrl: REST_BASE,
    authToken: API_KEY as string,
    timeout: 20_000,
  });
}

async function rawRest(method: string, path: string, body?: unknown) {
  const res = await fetch(`${REST_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY as string,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, text };
}

async function createViaRest(overrides: Record<string, unknown> = {}) {
  const res = await rawRest('POST', '/api/v1/memories', {
    title: `${TAG} fixture`,
    content: 'repl live fixture content',
    type: 'knowledge',
    tags: ['repl-live'],
    ...overrides,
  });
  const id = res.data?.data?.id ?? res.data?.id;
  if (id) createdIds.push(id);
  return { ...res, id };
}

function clientError(res: any): string {
  const err = res?.error;
  if (!err) return 'no error';
  return `${err.code ?? '?'}: ${err.message ?? JSON.stringify(err)}`;
}

afterAll(async () => {
  // DELETE /api/v1/memories/:id is a live no-op, so clean up via the working RPC route.
  for (const id of createdIds) {
    await rawRest('POST', '/api/v1/memory/delete', { id }).catch(() => undefined);
  }
}, 120_000);

describeLive('REPL remote memory path (api.lanonasis.com)', () => {
  it('control: the service accepts the test key over plain fetch', async () => {
    const res = await rawRest('GET', '/api/v1/memory/list?limit=1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data?.data)).toBe(true);
  });

  it('[known-gap] createMemoryClient.listMemories reaches the REST API', async () => {
    // Live defect in @lanonasis/memory-client@2.2.0: it does
    //   apiUrl.includes('/api') ? apiUrl.replace('/api', '') : apiUrl
    // and "https://api.lanonasis.com" contains "/api" inside "//api", so the
    // base becomes "https:/.lanonasis.com" and every request fails with
    // NETWORK_ERROR after 3 retries.
    const client = makeClient();
    const res: any = await client.listMemories({ limit: 1 });
    expect(res.error, `memory-client error: ${clientError(res)}`).toBeUndefined();
    expect(Array.isArray(res.data?.data)).toBe(true);
  }, 60_000);

  it('[known-gap] createMemoryClient create → get → delete round-trip', async () => {
    const client = makeClient();

    const created: any = await client.createMemory({
      title: `${TAG} client lifecycle`,
      content: 'client lifecycle content: heliotrope narwhal',
      type: 'knowledge',
      tags: ['repl-live'],
    });
    expect(created.error, `create failed: ${clientError(created)}`).toBeUndefined();
    const id = created.data?.id ?? created.data?.data?.id;
    expect(id).toBeTruthy();
    createdIds.push(id);

    const got: any = await client.getMemory(id);
    expect(got.error, `get failed: ${clientError(got)}`).toBeUndefined();
    expect(JSON.stringify(got.data)).toContain('heliotrope narwhal');

    const deleted: any = await client.deleteMemory(id);
    expect(deleted.error, `delete failed: ${clientError(deleted)}`).toBeUndefined();
  }, 90_000);

  it('[known-gap] MaaSClientAdapter.save persists through the real client', async () => {
    const adapter = new MaaSClientAdapter(makeClient() as any);
    const result = await adapter.save({
      id: '',
      title: `${TAG} adapter save`,
      content: 'adapter save content: viridian okapi',
      memory_type: 'knowledge',
      status: 'active',
      tags: ['repl-live'],
    });
    expect(result.syncedToMaaS).toBe(true);
    expect(result.id).toBeTruthy();
    if (result.id) createdIds.push(result.id);
  }, 60_000);

  it('[known-gap] MaaSClientAdapter.search maps remote rows to MemoryHit', async () => {
    const fixture = await createViaRest({
      title: `${TAG} adapter search`,
      content: 'adapter search content: vermilion serval',
    });
    expect(fixture.id).toBeTruthy();

    const adapter = new MaaSClientAdapter(makeClient() as any);
    const hits = await adapter.search('vermilion serval', { limit: 5 });
    const hit = hits.find((h) => h.id === fixture.id);
    expect(hit).toBeDefined();
    expect(hit).toMatchObject({
      id: fixture.id,
      source: 'maas',
      memory_type: 'knowledge',
    });
    expect(typeof hit!.score).toBe('number');
  }, 60_000);

  it('[known-gap] MaaSClientAdapter.health reports maas reachability', async () => {
    // health() swallows transport errors and reports maas:false instead of
    // throwing. It should still say the service is reachable with a valid key.
    const adapter = new MaaSClientAdapter(makeClient() as any);
    const health = await adapter.health();
    expect(health).toHaveProperty('local');
    expect(health.maas).toBe(true);
  }, 60_000);
});
