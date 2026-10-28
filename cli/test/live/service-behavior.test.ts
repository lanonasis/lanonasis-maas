/**
 * Live service behaviour tests — REST (api.lanonasis.com) + MCP (mcp.lanonasis.com/mcp)
 *
 * These are NOT contract/unit tests. They call the deployed services with a real
 * test key and assert what a user actually observes:
 *   - auth boundaries (missing/invalid key)
 *   - memory CRUD round-trips and search after write
 *   - pagination/filter semantics
 *   - pagination, chunking, soft-delete/restore/purge boundaries
 *   - the 40 MCP tools, resources and prompts
 *   - cross-route consistency (write on MCP, read on REST, and vice versa)
 *   - JSON-RPC error behaviour
 *
 * Gated on LANO_TEST_API_KEY so normal CI stays offline/deterministic:
 *
 *   LANO_TEST_API_KEY=lano_... npm run test:live
 *
 * Tests marked with a leading "[known-gap]" assert the CORRECT behaviour and are
 * expected to fail against the current deployment; they are the regression spec
 * for the defects found during live probing.
 */

const REST_BASE = process.env.LANO_TEST_REST_BASE ?? 'https://api.lanonasis.com';
const MCP_URL = process.env.LANO_TEST_MCP_URL ?? 'https://mcp.lanonasis.com/mcp';
const API_KEY = process.env.LANO_TEST_API_KEY;

const describeLive = API_KEY ? describe : describe.skip;

type Json = any;

let rpcId = 0;

// NOTE: use `null`, not `undefined`, to mean "send no credentials". A default
// parameter is applied when the argument is `undefined`, which would silently
// re-authenticate the anonymous-boundary tests.
type Key = string | null;

async function mcpRequest(method: string, params: Json = {}, key: Key = API_KEY) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (key) headers['X-API-Key'] = key;

  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const text = await res.text();
  let body: Json;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  if (res.status === 429 || body?.error === 'Too many requests') {
    const retryAfter = body?.retryAfter ?? 'unknown';
    throw new Error(
      `MCP rate-limited (HTTP ${res.status}); retry after ${retryAfter}s. ` +
        'The live suite needs a cool-down before running again.',
    );
  }
  return { status: res.status, body, text };
}

/** Call an MCP tool and return both the raw result and the parsed text payload. */
async function callTool(name: string, args: Json = {}, key: Key = API_KEY) {
  const res = await mcpRequest('tools/call', { name, arguments: args }, key);
  if (res.body?.error) {
    const err = res.body.error;
    throw new Error(
      `JSON-RPC ${err.code ?? '?'}: ${err.message ?? '?'} | raw=${res.text.slice(0, 300)}`,
    );
  }
  const text = (res.body?.result?.content ?? [])
    .map((c: Json) => c.text)
    .filter((t: unknown) => typeof t === 'string')
    .join('\n');
  let data: Json;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ...res, result: res.body?.result, data, text };
}

async function rest(method: string, path: string, body?: Json, key: Key = API_KEY) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['X-API-Key'] = key;

  const res = await fetch(`${REST_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: Json;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, text };
}

const asArray = (data: Json): Json[] =>
  Array.isArray(data) ? data : data?.data ?? data?.memories ?? data?.results ?? data?.items ?? [];

const idOf = (data: Json): string | undefined =>
  data?.id ?? data?.data?.id ?? data?.memory?.id ?? data?.memory_id ?? data?.data?.memory_id;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Semantic search is eventually consistent: poll briefly after a write. */
async function findInSearch(query: string, id: string, attempts = 8) {
  for (let i = 0; i < attempts; i++) {
    // threshold: 0 disables the 0.45 semantic cutoff: synthetic test content
    // can score below it even when the phrase is an exact match. The server
    // caps the response at 10 rows, so keep limit at that ceiling.
    const search = await callTool('search_memories', { query, limit: 10, threshold: 0 });
    const hit = asArray(search.data).find((r: Json) => (r.id ?? r.memory?.id) === id);
    if (hit) return hit;
    await sleep(1500);
  }
  return undefined;
}

const THE_TAG = `[live-behaviour ${new Date().toISOString()}]`;
const createdMemoryIds: string[] = [];
const createdKeyIds: string[] = [];
const createdProjectIds: string[] = [];

async function cleanupMemory(id: string | undefined) {
  if (!id) return;
  // POST /api/v1/memory/delete is the route that actually removes rows; the
  // DELETE /api/v1/memories/:id verb is a live no-op (see known-gap test).
  await rest('POST', '/api/v1/memory/delete', { id }).catch(() => undefined);
}

afterAll(async () => {
  // Best-effort cleanup: soft-delete memories, revoke/delete keys, delete projects.
  await Promise.all(createdMemoryIds.map(id => cleanupMemory(id)));
  for (const id of createdKeyIds) {
    await callTool('revoke_api_key', { key_id: id }).catch(() => undefined);
    await callTool('delete_api_key', { key_id: id }).catch(() => undefined);
  }
  for (const id of createdProjectIds) {
    await rest('DELETE', `/api/v1/projects/${id}`).catch(() => undefined);
  }
}, 120_000);

describeLive('REST api.lanonasis.com', () => {
  const tag = `${THE_TAG} rest`;

  test('GET /health reports a live database and cache', async () => {
    const { status, data } = await rest('GET', '/health', undefined, null);
    expect(status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database).toBeDefined();
    expect(data.cache).toBeDefined();
  });

  test('memory listing requires authentication', async () => {
    const missing = await rest('GET', '/api/v1/memory/list', undefined, null);
    expect(missing.status).toBe(401);

    const bogus = await rest('GET', '/api/v1/memory/list', undefined, 'lano_deadbeef');
    expect(bogus.status).toBe(401);
  });

  test('GET /api/v1/memory/list returns data + pagination envelope', async () => {
    const { status, data } = await rest('GET', '/api/v1/memory/list?limit=3');
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.pagination).toMatchObject({
      limit: expect.any(Number),
      offset: expect.any(Number),
      total: expect.any(Number),
    });
    expect(data.data.length).toBeLessThanOrEqual(3);
  });

  test('create → read → search round-trip', async () => {
    const needle = 'chartreuse wombat';
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} lifecycle`,
      content: `rest lifecycle content ${needle}`,
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    expect([200, 201]).toContain(created.status);
    const id = idOf(created.data);
    expect(id).toBeTruthy();
    createdMemoryIds.push(id!);

    const read = await rest('GET', `/api/v1/memories/${id}`);
    expect(read.status).toBe(200);
    expect(JSON.stringify(read.data)).toContain(needle);

    const search = await rest('POST', '/api/v1/memories/search', { query: needle, limit: 10 });
    expect(search.status).toBe(200);
    expect(asArray(search.data).some((r: Json) => r.id === id)).toBe(true);
  }, 60_000);

  test('POST /api/v1/memories requires a memory type', async () => {
    const { status, data } = await rest('POST', '/api/v1/memories', {
      title: `${tag} untyped`,
      content: 'missing type',
    });
    expect(status).toBe(400);
    expect(JSON.stringify(data)).toMatch(/memory_type.*required|type.*required/i);
  });

  test('POST /api/v1/memory/delete removes the record (working RPC route)', async () => {
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} rpc-delete`,
      content: 'rpc delete target',
      type: 'context',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    expect(id).toBeTruthy();

    const del = await rest('POST', '/api/v1/memory/delete', { id });
    expect(del.status).toBe(200);
    expect(JSON.stringify(del.data)).toMatch(/success|deleted/i);

    const gone = await rest('GET', `/api/v1/memories/${id}`);
    expect([404, 410]).toContain(gone.status);
  }, 60_000);

  test('[known-gap] DELETE /api/v1/memories/:id must actually remove the record', async () => {
    // Live: DELETE answers 200 with the record body, but the row stays readable
    // and listed. Because the status is 200, src/utils/api.ts#deleteMemory never
    // reaches its POST /api/v1/memory/delete fallback: `onasis --no-mcp memory
    // delete <id>` prints "Memory deleted successfully" while the memory remains.
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} delete-gap`,
      content: 'delete gap target',
      type: 'context',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    expect(id).toBeTruthy();
    createdMemoryIds.push(id!);

    const del = await rest('DELETE', `/api/v1/memories/${id}`);
    expect([200, 204]).toContain(del.status);

    const gone = await rest('GET', `/api/v1/memories/${id}`);
    expect([404, 410]).toContain(gone.status);
  }, 60_000);

  test('[known-gap] GET /api/v1/memories is the CLI primary list path and must not 405', async () => {
    // src/utils/api.ts#getMemories calls GET /api/v1/memories first. The live
    // service answers 405 "Use POST", so every list pays a failed round trip.
    const { status, data } = await rest('GET', '/api/v1/memories?limit=2');
    expect({ status, data: data?.error }).toEqual({ status: 200, data: undefined });
  });

  test('[known-gap] PUT /api/v1/memories/:id must persist title/content', async () => {
    // The live route returns 200 but keeps the old row. Because it returns 200,
    // the CLI never reaches its POST /api/v1/memory/update fallback and reports
    // "Memory updated successfully" for a no-op.
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} update-before`,
      content: 'update before: indigo walrus',
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    expect(id).toBeTruthy();
    createdMemoryIds.push(id!);

    const updated = await rest('PUT', `/api/v1/memories/${id}`, {
      title: `${tag} update-after`,
      content: 'update after: magenta gazelle',
    });
    expect(updated.status).toBe(200);

    const read = await rest('GET', `/api/v1/memories/${id}`);
    expect(JSON.stringify(read.data)).toContain('magenta gazelle');
    expect(JSON.stringify(read.data)).not.toContain('indigo walrus');
  }, 60_000);

  test('[known-gap] POST /api/v1/memory/update is the working update route and persists', async () => {
    // Baseline: proves the defect above is specific to /memories/:id, not to updates in general.
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} rpc-update-before`,
      content: 'rpc update before: umber badger',
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    createdMemoryIds.push(id!);

    const updated = await rest('POST', '/api/v1/memory/update', {
      id,
      title: `${tag} rpc-update-after`,
      content: 'rpc update after: scarlet ibis',
    });
    expect(updated.status).toBe(200);

    const read = await rest('GET', `/api/v1/memories/${id}`);
    expect(JSON.stringify(read.data)).toContain('scarlet ibis');
  }, 60_000);

  test('semantic search returns similarity scores and respects limit', async () => {
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} search`,
      content: 'semantic search target: turquoise pangolin carrying a ledger',
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    createdMemoryIds.push(id!);

    const { status, data } = await rest('POST', '/api/v1/memories/search', {
      query: 'turquoise pangolin ledger',
      limit: 5,
    });
    expect(status).toBe(200);
    const results = asArray(data);
    expect(results.length).toBeLessThanOrEqual(5);
    const hit = results.find((r: Json) => r.id === id);
    expect(hit).toBeDefined();
    expect(typeof (hit.similarity_score ?? data.similarity_score)).toBe('number');
  }, 60_000);

  test('list filters by tag', async () => {
    const created = await rest('POST', '/api/v1/memories', {
      title: `${tag} tagged`,
      content: 'tag filter target',
      type: 'knowledge',
      tags: ['live-behaviour', 'filter-me'],
    });
    const id = idOf(created.data);
    createdMemoryIds.push(id!);

    const { status, data } = await rest('GET', '/api/v1/memory/list?tags=filter-me&limit=20');
    expect(status).toBe(200);
    expect(asArray(data).some((r: Json) => r.id === id)).toBe(true);
  }, 60_000);

  test('stats returns a stable shape', async () => {
    const { status, data } = await rest('GET', '/api/v1/memories/stats');
    expect(status).toBe(200);
    const stats = data?.data ?? data;
    expect(stats).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
      }),
    );
    expect(stats.by_type ?? stats.memories_by_type).toBeDefined();
  });

  test('invalid memory id returns 4xx, not 500', async () => {
    const { status } = await rest('GET', '/api/v1/memories/not-a-uuid');
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);
  });

  test('[known-gap] topics routes exist and list topics', async () => {
    // `onasis topic list` calls GET /api/v1/topics and currently prints
    // "Failed to list topics: Request failed with status code 404".
    const { status, data } = await rest('GET', '/api/v1/topics');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  test('projects: camelCase organizationId is accepted', async () => {
    const org = await rest('GET', '/api/v1/organizations');
    const orgId = org.data?.data?.id;
    expect(orgId).toBeTruthy();

    const created = await rest('POST', '/api/v1/projects', {
      name: `${tag} project`,
      organizationId: orgId,
    });
    expect([200, 201]).toContain(created.status);
    const projectId = created.data?.id ?? created.data?.data?.id;
    expect(projectId).toBeTruthy();
    createdProjectIds.push(projectId);

    const listed = await rest('GET', '/api/v1/projects');
    expect(listed.status).toBe(200);
    expect(asArray(listed.data).some((p: Json) => p.id === projectId)).toBe(true);
  }, 60_000);

  test('[known-gap] projects: snake_case organization_id should be accepted or rejected clearly', async () => {
    // The CLI/MCP send organization_id; the live REST route only reads
    // organizationId and answers 400 INVALID_ORGANIZATION, so project create
    // through those surfaces cannot work.
    const org = await rest('GET', '/api/v1/organizations');
    const orgId = org.data?.data?.id;

    const created = await rest('POST', '/api/v1/projects', {
      name: `${tag} snake project`,
      organization_id: orgId,
    });
    expect(created.status).toBeLessThan(400);
    if (created.data?.id) createdProjectIds.push(created.data.id);
  });

  test('GET /api/v1/api-keys lists keys for the caller', async () => {
    const { status, data } = await rest('GET', '/api/v1/api-keys');
    expect(status).toBe(200);
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('GET /v1/auth/me identifies the key owner', async () => {
    const { status, data } = await rest('GET', '/v1/auth/me');
    expect(status).toBe(200);
    expect(typeof data.email).toBe('string');
    expect(data.id).toBeTruthy();
  });
});

describeLive('MCP mcp.lanonasis.com/mcp', () => {
  const tag = `${THE_TAG} mcp`;

  test('initialize negotiates protocol and serverInfo', async () => {
    const { status, body } = await mcpRequest('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'live-behaviour-suite', version: '1.0.0' },
    });
    expect(status).toBe(200);
    expect(body.result?.serverInfo?.name).toBeTruthy();
    expect(body.result?.capabilities?.tools).toBeDefined();
  });

  test('tools/list exposes the full tool surface without auth', async () => {
    const authed = await mcpRequest('tools/list', {});
    const tools = authed.body?.result?.tools ?? [];
    expect(tools.length).toBeGreaterThanOrEqual(40);
    for (const required of [
      'create_memory', 'search_memories', 'get_memory', 'update_memory', 'delete_memory',
      'list_memories', 'memory_stats', 'create_api_key', 'list_projects',
      'behavior_record', 'behavior_recall', 'intelligence_suggest_tags',
    ]) {
      expect(tools.map((t: Json) => t.name)).toContain(required);
    }

    // Metadata is public; execution is not.
    const anonymous = await mcpRequest('tools/list', {}, null);
    expect(anonymous.body?.result?.tools?.length).toBeGreaterThanOrEqual(40);
  });

  test('tools/call rejects missing and invalid credentials', async () => {
    const missing = await mcpRequest('tools/call', {
      name: 'list_memories',
      arguments: { limit: 1 },
    }, null);
    expect(missing.body?.error?.code).toBe(-32001);

    const bogus = await mcpRequest('tools/call', {
      name: 'list_memories',
      arguments: { limit: 1 },
    }, 'lano_deadbeef');
    expect(bogus.body?.error?.code).toBe(-32001);
  });

  test('unknown tool returns a JSON-RPC error', async () => {
    const { body } = await mcpRequest('tools/call', { name: 'no_such_tool', arguments: {} });
    expect(body?.error?.code).toBe(-32603);
  });

  test('invalid arguments are rejected', async () => {
    const { body } = await mcpRequest('tools/call', {
      name: 'create_memory',
      arguments: { title: 'missing content' },
    });
    const isError = Boolean(body?.error) || Boolean(body?.result?.isError);
    expect(isError).toBe(true);
  });

  test('resources/list and resources/read work', async () => {
    const { body } = await mcpRequest('resources/list', {});
    const uris = (body?.result?.resources ?? []).map((r: Json) => r.uri);
    expect(uris).toContain('memory://stats');

    const read = await mcpRequest('resources/read', { uri: 'memory://stats' });
    const contents = read.body?.result?.contents ?? [];
    expect(contents.length).toBeGreaterThan(0);
    expect(typeof contents[0].text).toBe('string');
    expect(contents[0].text.length).toBeGreaterThan(0);
  });

  test('prompts/list and prompts/get work', async () => {
    const { body } = await mcpRequest('prompts/list', {});
    const names = (body?.result?.prompts ?? []).map((p: Json) => p.name);
    expect(names).toContain('quick-note');

    const got = await mcpRequest('prompts/get', {
      name: 'quick-note',
      arguments: { title: 'live test', content: 'prompt body' },
    });
    expect(got.body?.result?.messages?.length).toBeGreaterThan(0);
  });

  test('memory lifecycle: create → get → search → update → list → delete → restore', async () => {
    const needle = 'zebra unicorn quantum';
    const created = await callTool('create_memory', {
      title: `${tag} lifecycle`,
      content: `The quick brown fox jumps over the lazy dog. ${needle}.`,
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    expect(id).toBeTruthy();
    createdMemoryIds.push(id!);

    const got = await callTool('get_memory', { id });
    expect(JSON.stringify(got.data)).toContain(needle);

    // search_memories returns rows shaped as { memory: {...}, similarity_score }
    // and the index can lag the write; poll briefly instead of racing it.
    const hit = await findInSearch(needle, id);
    expect(hit).toBeDefined();

    const updated = await callTool('update_memory', {
      id,
      title: `${tag} lifecycle v2`,
      content: 'The quick brown fox jumps over the lazy dog. ochre marmot carries a lantern through the archive.',
    });
    expect(JSON.stringify(updated.data)).toContain('ochre marmot');

    const afterUpdate = await callTool('get_memory', { id });
    expect(JSON.stringify(afterUpdate.data)).toContain('ochre marmot');

    const resHit = await findInSearch('ochre marmot lantern archive', id);
    expect(resHit).toBeDefined();

    const listed = await callTool('list_memories', { limit: 50 });
    expect(asArray(listed.data).some((r: Json) => (r.id ?? r.memory?.id) === id)).toBe(true);

    const deleted = await callTool('delete_memory', { id });
    expect(deleted.data).toBeDefined();

    const deletedList = await callTool('list_deleted_memories', { limit: 50 });
    expect(asArray(deletedList.data).some((r: Json) => (r.id ?? r.memory?.id) === id)).toBe(true);

    const restored = await callTool('restore_memory', { id });
    expect(restored.data).toBeDefined();

    const afterRestore = await callTool('get_memory', { id });
    expect(JSON.stringify(afterRestore.data)).toContain('ochre marmot');
  }, 120_000);

  test('list_memories pagination does not repeat rows', async () => {
    const first = asArray((await callTool('list_memories', { limit: 2, offset: 0 })).data);
    const second = asArray((await callTool('list_memories', { limit: 2, offset: 2 })).data);
    const firstIds = first.map((r: Json) => r.id ?? r.memory?.id);
    const secondIds = second.map((r: Json) => r.id ?? r.memory?.id);
    expect(firstIds.filter((id: string) => secondIds.includes(id))).toEqual([]);
  });

  test('list_memories enforces memory type filter', async () => {
    const rows = asArray((await callTool('list_memories', { type: 'reference', limit: 20 })).data);
    for (const row of rows) {
      expect(row.type ?? row.memory_type ?? row.memory?.type).toBe('reference');
    }
  });

  test('create_memory_chunked splits and returns a parent record', async () => {
    const content = Array.from(
      { length: 12 },
      (_, i) => `Chunk ${i}: lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor.`,
    ).join('\n\n');
    const { data } = await callTool('create_memory_chunked', {
      title: `${tag} chunked`,
      content,
      type: 'knowledge',
      max_chunk_size: 400,
    });
    const parentId = data?.parent_memory?.id ?? data?.id;
    expect(parentId).toBeTruthy();
    createdMemoryIds.push(parentId);
  }, 60_000);

  test('memory_bulk_delete reports requested/deleted counts', async () => {
    // Content must be long enough for embedding; very short payloads can be
    // rejected by the memory service with a generic store error.
    const a = await callTool('create_memory', {
      title: `${tag} bulk a`,
      content: 'bulk delete alpha: emerald grouse with a sufficiently descriptive body',
      type: 'context',
      tags: ['live-behaviour'],
    });
    const b = await callTool('create_memory', {
      title: `${tag} bulk b`,
      content: 'bulk delete beta: sapphire grouse with a sufficiently descriptive body',
      type: 'context',
      tags: ['live-behaviour'],
    });
    const ids = [idOf(a.data), idOf(b.data)].filter(Boolean) as string[];
    createdMemoryIds.push(...ids);

    const { data } = await callTool('memory_bulk_delete', { ids });
    expect(data.deleted_count).toBe(ids.length);
    expect(data.requested_count).toBe(ids.length);
  }, 60_000);

  test('memory_stats returns counts', async () => {
    const { data } = await callTool('memory_stats', {});
    expect(data).toBeTruthy();
    expect(JSON.stringify(data)).toMatch(/total/i);
  });

  test('intelligence tools respond with structured data', async () => {
    const tags = await callTool('intelligence_suggest_tags', { content: 'kubernetes deployment rollback strategy', title: 'k8s' });
    expect(tags.data).toBeTruthy();

    const related = await callTool('intelligence_find_related', { query: 'kubernetes deployment', limit: 3 });
    expect(related.data).toBeTruthy();

    const health = await callTool('intelligence_health_check', {});
    expect(health.data).toBeTruthy();

    const duplicates = await callTool('intelligence_detect_duplicates', { limit: 5, max_scan: 50 });
    expect(duplicates.data).toBeTruthy();
  }, 60_000);

  test('behavior_record → behavior_recall → behavior_suggest', async () => {
    // Runtime requires context.current_directory (the advertised schema for
    // behavior_record says context.directory; see the known-gap test below).
    const recorded = await callTool('behavior_record', {
      trigger: 'live-behaviour: verify MCP memory lifecycle end to end',
      context: {
        // Runtime requires BOTH directory and current_directory; only directory
        // is advertised in the schema (see known-gap test below).
        directory: process.cwd(),
        current_directory: process.cwd(),
        project_type: 'typescript',
      },
      actions: [
        { tool: 'create_memory', outcome: 'success' },
        { tool: 'search_memories', outcome: 'success' },
      ],
      final_outcome: 'success',
      confidence: 0.9,
    });
    expect(recorded.data).toBeTruthy();

    const recalled = await callTool('behavior_recall', {
      context: {
        current_directory: process.cwd(),
        current_task: 'verify MCP memory lifecycle end to end',
        project_type: 'typescript',
      },
    });
    expect(recalled.data).toBeTruthy();

    const suggested = await callTool('behavior_suggest', {
      current_state: { task_description: 'verify MCP tools', completed_steps: ['tools/list'] },
    });
    expect(suggested.data).toBeTruthy();
  }, 60_000);

  test('[known-gap] behavior_record accepts the documented context.directory field', async () => {
    // The tool's inputSchema marks context.directory as required and does not
    // mention current_directory, but the runtime rejects directory with
    // "context.current_directory is required". Agents following the schema fail.
    const { body } = await mcpRequest('tools/call', {
      name: 'behavior_record',
      arguments: {
        trigger: 'live-behaviour: schema/runtime contract check for behavior_record',
        context: { directory: process.cwd(), project_type: 'typescript' },
        actions: [{ tool: 'tools/list', outcome: 'success' }],
        final_outcome: 'success',
      },
    });
    const isError = Boolean(body?.error) || Boolean(body?.result?.isError);
    expect(isError ? body?.error?.message ?? 'tool returned isError' : undefined).toBeUndefined();
  });

  test('API key lifecycle: create → list → rotate → revoke → delete', async () => {
    const created = await callTool('create_api_key', {
      name: `${tag} key`,
      description: 'live behaviour suite; safe to delete',
      access_level: 'authenticated',
      permissions: ['memories:read'],
    });
    const keyId = created.data?.id ?? created.data?.key_id ?? created.data?.data?.id;
    expect(keyId).toBeTruthy();
    createdKeyIds.push(keyId);

    const listed = await callTool('list_api_keys', { active_only: true });
    expect(asArray(listed.data).some((k: Json) => k.id === keyId)).toBe(true);

    const rotated = await callTool('rotate_api_key', { key_id: keyId });
    expect(rotated.data).toBeTruthy();
    expect(rotated.data?.key ?? rotated.data?.api_key).toBeTruthy();

    const revoked = await callTool('revoke_api_key', { key_id: keyId });
    expect(JSON.stringify(revoked.data)).toMatch(/true|success|revoked/i);

    const deleted = await callTool('delete_api_key', { key_id: keyId });
    expect(JSON.stringify(deleted.data)).toMatch(/true|success|deleted/i);
  }, 90_000);

  test('[known-gap] create_project assigns an organization and list_projects returns it', async () => {
    const org = await rest('GET', '/api/v1/organizations');
    const orgId = org.data?.data?.id;
    expect(orgId).toBeTruthy();

    const created = await callTool('create_project', {
      name: `${tag} project`,
      description: 'live behaviour suite',
      organization_id: orgId,
    });
    const projectId = created.data?.id ?? created.data?.project?.id ?? created.data?.data?.id;
    expect(projectId).toBeTruthy();
    createdProjectIds.push(projectId);

    // The live tool stores organization_id: null and then list_projects (which
    // filters by the caller's organization) cannot see it.
    expect(created.data?.organization_id).toBe(orgId);

    const listed = await callTool('list_projects', {});
    expect(asArray(listed.data).some((p: Json) => p.id === projectId)).toBe(true);
  }, 60_000);

  test('get_health_status / get_auth_status / get_organization_info / get_config', async () => {
    const health = await callTool('get_health_status', {});
    expect(JSON.stringify(health.data)).toMatch(/healthy|status/i);

    const auth = await callTool('get_auth_status', {});
    expect(JSON.stringify(auth.data)).toMatch(/authenticated|email|user/i);

    const org = await callTool('get_organization_info', {});
    expect(JSON.stringify(org.data)).toMatch(/organization|workspace|name/i);

    const config = await callTool('get_config', {});
    expect(config.data).toBeTruthy();
  }, 60_000);
});

describeLive('cross-route consistency (REST ↔ MCP)', () => {
  test('memory written through MCP is visible through REST', async () => {
    const created = await callTool('create_memory', {
      title: `${THE_TAG} cross mcp→rest`,
      content: 'cross route mcp to rest: bistre lemur',
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    expect(id).toBeTruthy();
    createdMemoryIds.push(id!);

    const read = await rest('GET', `/api/v1/memories/${id}`);
    expect(read.status).toBe(200);
    expect(JSON.stringify(read.data)).toContain('bistre lemur');
  }, 60_000);

  test('memory written through REST is visible through MCP', async () => {
    const created = await rest('POST', '/api/v1/memories', {
      title: `${THE_TAG} cross rest→mcp`,
      content: 'cross route rest to mcp: celadon tapir',
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    createdMemoryIds.push(id!);

    const got = await callTool('get_memory', { id });
    expect(JSON.stringify(got.data)).toContain('celadon tapir');
  }, 60_000);

  test('an MCP update is observable through REST', async () => {
    // Isolates whether the REST PUT gap is the only update inconsistency
    // between the two routes.
    const created = await callTool('create_memory', {
      title: `${THE_TAG} cross update`,
      content: 'cross update before: ash chameleon',
      type: 'knowledge',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);
    createdMemoryIds.push(id!);

    await callTool('update_memory', { id, content: 'cross update after: coral gecko' });

    const read = await rest('GET', `/api/v1/memories/${id}`);
    expect(JSON.stringify(read.data)).toContain('coral gecko');
  }, 60_000);

  test('deleting through MCP hides the memory from REST', async () => {
    const created = await callTool('create_memory', {
      title: `${THE_TAG} cross delete`,
      content: 'cross delete target',
      type: 'context',
      tags: ['live-behaviour'],
    });
    const id = idOf(created.data);

    await callTool('delete_memory', { id });

    const read = await rest('GET', `/api/v1/memories/${id}`);
    expect([404, 410]).toContain(read.status);
  }, 60_000);
});
