#!/usr/bin/env node
/**
 * Type-check src/ against the OLDEST Pi SDK version declared in peerDependencies.
 *
 * Why this exists (lesson from chandra447/pi-hermes-memory#149):
 *   peerDependencies is the only thing telling a user whether this extension
 *   works on their Pi, and nothing verified it. The regular `npm run typecheck`
 *   resolves devDependencies — always new enough — so a misaligned floor is
 *   invisible until a real user hits ERR_PACKAGE_PATH_NOT_EXPORTED.
 *
 * What it does:
 *   1. Resolves the minimum floor from peerDependencies["@earendil-works/pi-coding-agent"].
 *   2. Provisions a fresh temp probe dir and installs that floor.
 *   3. Swaps node_modules/@earendil-works for the probe copy (using a symlink
 *      with `.real` stash so we can restore even on signal/crash).
 *   4. Runs the project's own tsc --noEmit against src/ — same tsconfig that
 *      `npm run typecheck` uses, so a green here implies a green there.
 *   5. Restores node_modules/@earendil-works in a finally block.
 *
 * Network policy:
 *   If npm install fails (offline, registry block, etc.) we exit 0 with a
 *   "skipped: network unavailable" note rather than failing the run — the
 *   task spec for Phase 1 explicitly allows this. The stash/restore finally
 *   block guarantees node_modules stays intact either way.
 *
 * Run: node scripts/check-min-sdk.mjs (or `npm run check:min-sdk`)
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@earendil-works';
// pi-ai is a peer; pi-tui is not — but its types cross the boundary
// (ExtensionCommandContext.ui.custom takes a pi-tui TUI). Letting tui stay
// at a different version yields a duplicate-private-property error instead
// of a real finding, so tui moves with the floor.
const FLOOR_PACKAGES = [
  `${SCOPE}/pi-coding-agent`,
  `${SCOPE}/pi-ai`,
  `${SCOPE}/pi-tui`,
];

const scopeDir = path.join(repoRoot, 'node_modules', SCOPE);
const stashDir = path.join(repoRoot, 'node_modules', `${SCOPE}.real`);

function restore() {
  try {
    if (existsSync(stashDir)) {
      if (existsSync(scopeDir)) unlinkSync(scopeDir);
      renameSync(stashDir, scopeDir);
    }
  } catch (error) {
    console.error(
      `\nFAILED TO RESTORE node_modules/${SCOPE}. Run: mv "${stashDir}" "${scopeDir}"\n`,
      error,
    );
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => { restore(); process.exit(130); });
}

function withScope(suffix) {
  return path.join(repoRoot, `node_modules/${SCOPE}-probe-${suffix}`);
}

const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf-8'));
const range = pkg.peerDependencies?.[`${SCOPE}/pi-coding-agent`];
const match = /(\d+\.\d+\.\d+)/.exec(range ?? '');
const floor = match?.[1];

if (!floor) {
  console.error(
    `[pi-lanonasis-memory] peerDependencies range "${range}" has no explicit floor — pin one like ">=0.80.1"`,
  );
  process.exit(1);
}

console.log(`[pi-lanonasis-memory] Minimum supported ${SCOPE}/pi-coding-agent: ${floor}`);

const scratch = mkdtempSync(path.join(tmpdir(), 'pi-lanonasis-memory-minsdk-'));
let failed = false;
let skipped = false;

try {
  writeFileSync(
    path.join(scratch, 'package.json'),
    `${JSON.stringify({ name: 'min-sdk-probe', private: true })}\n`,
  );
  const specs = FLOOR_PACKAGES.map((name) => `${name}@${floor}`);
  console.log(`[pi-lanonasis-memory] Installing ${specs.join(' ')} ...`);

  const install = spawnSync('npm', [
    'install',
    '--silent',
    '--no-audit',
    '--no-fund',
    '--no-package-lock',
    ...specs,
  ], {
    cwd: scratch,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  if (install.status !== 0) {
    console.warn(
      `[pi-lanonasis-memory] skipped: network unavailable (npm install exited ${install.status}). ` +
        `node_modules was NOT modified.`,
    );
    skipped = true;
    process.exit(0);
  }

  // Swap the scope in place so the project's own tsconfig applies unchanged —
  // no divergent probe config that could drift from what `npm run typecheck`
  // uses.
  renameSync(scopeDir, stashDir);
  symlinkSync(path.join(scratch, 'node_modules', SCOPE), scopeDir);

  console.log('[pi-lanonasis-memory] Type-checking src/ against the minimum SDK ...');
  execFileSync(path.join(repoRoot, 'node_modules', '.bin', 'tsc'), ['--noEmit'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  console.log(
    `[pi-lanonasis-memory] OK — src/ type-checks against ${SCOPE}/pi-coding-agent@${floor}`,
  );
} catch (error) {
  failed = true;
  if (!/Command failed/.test(String(error?.message))) console.error(error);
  console.error(
    `\n[pi-lanonasis-memory] src/ does NOT type-check against the declared minimum (${floor}).\n` +
      'Either raise the peerDependencies floor in package.json to a version that works,\n' +
      'or stop using the SDK API that is missing at that version.\n',
  );
} finally {
  restore();
  rmSync(scratch, { recursive: true, force: true });
}

if (failed && !skipped) process.exit(1);
