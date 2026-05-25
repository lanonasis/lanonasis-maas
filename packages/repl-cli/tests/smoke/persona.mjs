#!/usr/bin/env node
/**
 * Smoke test for persona switching.
 *
 * Exercises:
 *   1. PersonaRegistry — list, get, switch, active
 *   2. NaturalLanguageOrchestrator.setPersona — system-prompt + model swap
 *   3. saveConfig — round-trips defaultPersona to disk (against a temp file)
 *
 * Skips: interactive REPL, OAuth, network calls.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG = join(homedir(), '.lanonasis', 'repl-config.json');
const BACKUP = CONFIG + '.smoke-backup';

// Back up the live config so we can restore it after.
const hadConfig = existsSync(CONFIG);
if (hadConfig) copyFileSync(CONFIG, BACKUP);

let exitCode = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.log(`  ✗ ${msg}`);
    exitCode = 1;
  }
}

try {
  // ── 1. Registry exercises ───────────────────────────────────────────
  console.log('\n[1] PersonaRegistry');
  // Paths are relative to this file's location (tests/smoke/persona.mjs).
  // The dist path is preferred for end-to-end coverage; the source-tree
  // fallback lets the script run pre-build via tsx.
  const { getPersonaRegistry, BUILTIN_PERSONAS } = await import('../../dist/index.js')
    .catch(async () => {
      return await import('../../src/personas/registry.ts').then(async (m) => ({
        getPersonaRegistry: m.getPersonaRegistry,
        BUILTIN_PERSONAS: (await import('../../src/personas/builtin.ts')).BUILTIN_PERSONAS,
      }));
    });

  const registry = getPersonaRegistry();
  const list = registry.list();
  assert(list.length === 4, `4 built-in personas registered (got ${list.length})`);
  assert(list.map(p => p.name).sort().join(',') === 'concierge,heart,lzero,mind',
    'builtin slugs are lzero/mind/heart/concierge');

  const defaultActive = registry.active();
  assert(defaultActive.name === 'lzero', `default active = lzero (got ${defaultActive.name})`);

  const mind = registry.switch('mind');
  assert(mind && mind.name === 'mind', 'switch("mind") returns mind persona');
  assert(registry.active().name === 'mind', 'active is now mind after switch');

  assert(registry.get('MIND')?.name === 'mind', 'lookup is case-insensitive');
  assert(registry.get('nonsense') === undefined, 'unknown slug returns undefined');

  // ── 2. Orchestrator setPersona swap ─────────────────────────────────
  console.log('\n[2] Orchestrator.setPersona');
  const { NaturalLanguageOrchestrator } = await import('../../src/core/orchestrator.ts');

  const orch = new NaturalLanguageOrchestrator({
    apiUrl: 'https://api.lanonasis.com',
    authToken: 'smoke-test-fake-token',
    model: 'L-Zero',
  });

  // After construction, system prompt should contain "LZero" (the default constructor prompt).
  // setPersona(mind) should replace it with the Mind persona prompt.
  const histBefore = orch.conversationHistory ?? null;
  // conversationHistory is private; reach through any-cast pattern: use bracket access
  // (TypeScript private != JS-runtime private; tsx exposes it).
  const cw = orch;
  const sysBefore = cw.conversationHistory?.[0]?.content ?? '';
  assert(sysBefore.includes('LZero'), 'constructor seeded LZero system prompt');

  orch.setPersona(mind);

  const sysAfter = cw.conversationHistory?.[0]?.content ?? '';
  assert(sysAfter.includes('LZero — Mind'), 'setPersona(mind) replaced system prompt with Mind body');
  assert(!sysAfter.includes('LanOnasis ecosystem'),
    'old LZero default prompt body is no longer present');
  assert(cw.model === mind.model, `orchestrator.model now matches persona.model (${cw.model})`);

  // Switch back to LZero — full round trip.
  const lzero = registry.switch('lzero');
  orch.setPersona(lzero);
  const sysRestored = cw.conversationHistory?.[0]?.content ?? '';
  assert(sysRestored.includes('LanOnasis ecosystem'),
    'setPersona(lzero) restored the LZero body');

  // ── 3. saveConfig round-trip ────────────────────────────────────────
  console.log('\n[3] saveConfig persistence');
  const { saveConfig } = await import('../../src/config/loader.ts');

  const beforeDisk = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf-8')) : {};
  saveConfig({ defaultPersona: 'mind' });
  const onDisk = JSON.parse(readFileSync(CONFIG, 'utf-8'));
  assert(onDisk.defaultPersona === 'mind', `defaultPersona persisted to ${CONFIG}`);

  // Sensitive fields should still be intact (we merged, not overwrote).
  if ('authToken' in beforeDisk) {
    assert(onDisk.authToken === beforeDisk.authToken,
      'existing authToken preserved through merge');
  } else {
    assert(onDisk.authToken === undefined,
      'authToken remains absent when no existing authToken was present');
  }
  if ('openaiApiKey' in beforeDisk) {
    assert(onDisk.openaiApiKey === beforeDisk.openaiApiKey,
      'existing openaiApiKey preserved through merge');
  } else {
    assert(onDisk.openaiApiKey === undefined,
      'openaiApiKey remains absent when no existing openaiApiKey was present');
  }

  // ── 4. loadConfig applies defaultPersona ────────────────────────────
  console.log('\n[4] loadConfig surfaces defaultPersona');
  const { loadConfig, getActiveConfigPath } = await import('../../src/config/loader.ts');
  const loaded = await loadConfig({});
  assert(loaded.defaultPersona === 'mind',
    'loadConfig() exposes defaultPersona="mind" for the engine to apply on startup');

  // ── 5. --config <path> isolation ────────────────────────────────────
  console.log('\n[5] Custom config path (--config flag)');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const tmp = mkdtempSync(join(tmpdir(), 'lzero-persona-'));
  const altPath = join(tmp, 'heart-profile.json');

  // First load against a non-existent custom path — should auto-create.
  const altLoaded = await loadConfig({}, { configPath: altPath });
  assert(existsSync(altPath), `custom config file auto-created at ${altPath}`);
  assert(getActiveConfigPath() === altPath, 'getActiveConfigPath() reflects the custom path');
  assert(altLoaded.defaultPersona === 'lzero',
    'fresh custom config starts with default persona = lzero');

  // saveConfig with no path arg should write to the active custom path,
  // NOT clobber the main ~/.lanonasis/repl-config.json.
  saveConfig({ defaultPersona: 'heart' });
  const altDisk = JSON.parse(readFileSync(altPath, 'utf-8'));
  assert(altDisk.defaultPersona === 'heart',
    'saveConfig() wrote to the active custom path');

  // Main config (which we backed up earlier) must be untouched.
  const mainDisk = existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf-8')) : {};
  assert(mainDisk.defaultPersona === 'mind',
    'main repl-config.json still shows defaultPersona=mind (custom path did not leak)');

  // Explicit configPath override should target a third file independently.
  const thirdPath = join(tmp, 'concierge-profile.json');
  saveConfig({ defaultPersona: 'concierge' }, { configPath: thirdPath });
  const thirdDisk = JSON.parse(readFileSync(thirdPath, 'utf-8'));
  assert(thirdDisk.defaultPersona === 'concierge',
    'saveConfig({configPath}) writes to the explicit override path');

  const invalidPath = join(tmp, 'invalid-profile.json');
  const invalidContent = '{not valid json';
  writeFileSync(invalidPath, invalidContent);
  let invalidSaveThrew = false;
  try {
    saveConfig({ defaultPersona: 'mind' }, { configPath: invalidPath });
  } catch {
    invalidSaveThrew = true;
  }
  assert(invalidSaveThrew, 'saveConfig() rejects malformed existing JSON');
  assert(readFileSync(invalidPath, 'utf-8') === invalidContent,
    'saveConfig() preserves malformed config content instead of overwriting it');

  // The active path should NOT have changed (explicit override doesn't sticky).
  assert(getActiveConfigPath() === altPath,
    'explicit configPath override does not change the active path');

  // Cleanup temp dir
  rmSync(tmp, { recursive: true, force: true });

} catch (err) {
  console.error('\n[FATAL]', err);
  exitCode = 1;
} finally {
  // Restore original config so the smoke test is non-destructive.
  if (existsSync(BACKUP)) {
    copyFileSync(BACKUP, CONFIG);
    unlinkSync(BACKUP);
    console.log('\n  ↺ Restored original repl-config.json from backup.');
  } else if (!hadConfig && existsSync(CONFIG)) {
    unlinkSync(CONFIG);
    console.log('\n  ↺ Removed smoke-created repl-config.json.');
  }
}

console.log(exitCode === 0 ? '\n✅ SMOKE PASS' : '\n❌ SMOKE FAIL');
process.exit(exitCode);
