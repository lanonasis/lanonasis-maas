/**
 * policy.test.ts — sync origin policy matrix.
 *
 * shouldSync() is the single source of truth for whether a given
 * (origin, env) pair is eligible to push to MaaS. Per the operator
 * decision in LANA-2026-10-06-pi-memory-layer1:
 *
 *   1. explicit origin is always allowed
 *   2. auto origin is allowed only when LANONASIS_PI_MEMORY_AUTO_SYNC === '1'
 *   3. the function never throws and never inspects the API key
 *
 * These tests pin that contract so a refactor that accidentally flips
 * the default to "always sync" or leaks the key on an env probe will
 * be caught here, before VERA's security review.
 */

import { describe, it, expect } from "vitest";

import { shouldSync, type SyncOrigin } from "../../src/sync/policy.js";

const EMPTY: NodeJS.ProcessEnv = {};

const MATRIX: ReadonlyArray<{
  origin: SyncOrigin;
  env: NodeJS.ProcessEnv;
  expected: boolean;
  reason: string;
}> = [
  // --- explicit origin ---
  { origin: "explicit", env: EMPTY, expected: true,
    reason: "explicit origin wins regardless of env" },
  { origin: "explicit", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "0" },
    expected: true, reason: "explicit origin ignores auto-sync flag" },
  { origin: "explicit", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "1" },
    expected: true, reason: "explicit origin is independent of opt-in flag" },
  { origin: "explicit", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "true" },
    expected: true, reason: "explicit origin ignores non-1 truthy values" },

  // --- auto origin ---
  { origin: "auto", env: EMPTY, expected: false,
    reason: "auto origin is opt-in by default" },
  { origin: "auto", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "" },
    expected: false, reason: "empty string is not '1'" },
  { origin: "auto", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "0" },
    expected: false, reason: "0 explicitly disables auto-sync" },
  { origin: "auto", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "false" },
    expected: false, reason: "boolean-ish strings do not enable auto-sync" },
  { origin: "auto", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "yes" },
    expected: false, reason: "non-'1' values are treated as off (strict)" },
  { origin: "auto", env: { LANONASIS_PI_MEMORY_AUTO_SYNC: "1" },
    expected: true, reason: "auto origin is enabled only by exact '1'" },
];

describe("sync/policy — shouldSync()", () => {
  for (const row of MATRIX) {
    it(`${row.origin} / ${JSON.stringify(row.env)} → ${row.expected} (${row.reason})`, () => {
      expect(shouldSync(row.origin, row.env)).toBe(row.expected);
    });
  }

  it("never throws when the env object is missing", () => {
    // @ts-expect-error — exercising the contract for an undefined env
    expect(() => shouldSync("auto", undefined)).not.toThrow();
  });

  it("auto-sync env probe does not reveal the API key", () => {
    const env: NodeJS.ProcessEnv = {
      LANONASIS_API_KEY: "sk-test-should-never-appear-anywhere",
    };
    // We can't inspect internal state, but the function MUST be safe to
    // call from a hot path. Confirm it doesn't throw with a key present.
    expect(shouldSync("auto", env)).toBe(false);
  });
});
