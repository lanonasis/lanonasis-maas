#!/usr/bin/env node
/**
 * Smoke test for session-memory persistence via onasis-ai-router's proxy.
 *
 * Real network calls against the live router (no mocks) — exercises:
 *   1. First orchestrator instance persists USER/ASSISTANT turns as it goes
 *   2. A second orchestrator instance, given the SAME sessionId, hydrates
 *      those turns on initializeContext() — proving cross-restart continuity
 *   3. regenerateSession() abandons the old session and starts clean
 *
 * Requires AI_ROUTER_URL (defaults to http://localhost:8000) and
 * SMOKE_API_KEY_FILE pointing at a file containing a live lano_* key.
 * Skips (exit 0) if SMOKE_API_KEY_FILE is unset — this test needs a real
 * backend, unlike the other smoke tests which stub network calls out.
 */

import { readFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

let exitCode = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.log(`  ✗ ${msg}`);
    exitCode = 1;
  }
}

const keyFile = process.env.SMOKE_API_KEY_FILE;
if (!keyFile || !existsSync(keyFile)) {
  console.log('SMOKE_API_KEY_FILE not set — skipping (needs a live router + real key).');
  process.exit(0);
}
const authToken = readFileSync(keyFile, 'utf8').trim();
const aiRouterUrl = process.env.AI_ROUTER_URL || 'http://localhost:8000';

try {
  const { NaturalLanguageOrchestrator } = await import('../../src/core/orchestrator.ts');

  const sessionId = randomUUID();
  console.log(`\n[1] First orchestrator instance — sessionId=${sessionId}`);

  const orch1 = new NaturalLanguageOrchestrator({
    apiUrl: 'https://api.lanonasis.com',
    authToken,
    aiRouterUrl,
    aiRouterApiKey: authToken,
    agentMemorySessionId: sessionId,
    l0: { enabled: false },
  });

  await orch1.processNaturalLanguage('What is semantic memory?');
  // Second turn so there are 4 events (2 user, 2 assistant) to hydrate.
  await orch1.processNaturalLanguage('Give me a one-sentence example.');

  const cw1 = orch1;
  const hist1 = cw1.conversationHistory ?? [];
  assert(hist1.length >= 5, `first instance's local history has >=5 entries (system + 2 turns), got ${hist1.length}`);

  // Let the fire-and-forget-but-awaited persistTurn() writes land server-side
  // before the second instance tries to hydrate them.
  await new Promise((r) => setTimeout(r, 500));

  console.log('\n[2] Second orchestrator instance, same sessionId — hydration');
  const orch2 = new NaturalLanguageOrchestrator({
    apiUrl: 'https://api.lanonasis.com',
    authToken,
    aiRouterUrl,
    aiRouterApiKey: authToken,
    agentMemorySessionId: sessionId,
    l0: { enabled: false },
  });

  await orch2.initializeContext();
  const cw2 = orch2;
  const hist2 = cw2.conversationHistory ?? [];

  assert(hist2.length >= 5, `resumed instance hydrated >=5 history entries, got ${hist2.length}`);
  const userTurns = hist2.filter((m) => m.role === 'user');
  const assistantTurns = hist2.filter((m) => m.role === 'assistant');
  assert(userTurns.length >= 2, `resumed instance has >=2 user turns, got ${userTurns.length}`);
  assert(assistantTurns.length >= 2, `resumed instance has >=2 assistant turns, got ${assistantTurns.length}`);
  assert(
    userTurns.some((m) => m.content.includes('semantic memory')),
    'resumed history contains the first real user turn verbatim'
  );

  console.log('\n[3] regenerateSession() abandons the old session');
  const newSessionId = orch2.regenerateSession();
  assert(!!newSessionId && newSessionId !== sessionId, `regenerateSession() returned a different id (${newSessionId})`);
  const cw2After = orch2;
  assert((cw2After.conversationHistory ?? []).length === 1, 'local history reset to just the system prompt after regenerateSession()');

} catch (err) {
  console.error('\n[FATAL]', err);
  exitCode = 1;
}

console.log(exitCode === 0 ? '\n✅ SMOKE PASS' : '\n❌ SMOKE FAIL');
process.exit(exitCode);
