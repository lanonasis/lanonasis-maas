/**
 * policy.ts — sync-origin policy.
 *
 * MaaS sync is opt-in. Per the LANA-2026-10-06-pi-memory-layer1
 * operator decision:
 *
 *   - "explicit" origin (/memory save, /reflect) is ALWAYS eligible
 *   - "auto" origin (turn_end review, scanner-derived memory) is
 *     eligible ONLY when LANONASIS_PI_MEMORY_AUTO_SYNC === '1'
 *
 * The function is pure, side-effect-free, and MUST NOT inspect the
 * API key. It is called on every enqueue() so it has to be cheap.
 *
 * Exported as a named function (not a class) so it can be unit-tested
 * without instantiating the queue or the MaaS client.
 */

export type SyncOrigin = "explicit" | "auto";

/**
 * Returns true if a memory with the given origin is eligible to be
 * synced to MaaS under the supplied environment. Defaults to
 * `process.env` for ergonomics; tests pass an explicit object.
 */
export function shouldSync(
  origin: SyncOrigin,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (origin === "explicit") return true;
  // origin === "auto"
  return env?.LANONASIS_PI_MEMORY_AUTO_SYNC === "1";
}
