/**
 * debug.ts — opt-in diagnostics for intentionally swallowed errors.
 *
 * Several code paths catch and drop errors on purpose (never throw into
 * Pi, best-effort teardown, graceful degradation). When something goes
 * wrong there, operators need a way to see it without changing the
 * default behaviour. `debugLog()` writes one line to stderr ONLY when
 * `LANONASIS_PI_MEMORY_DEBUG=1`; otherwise it is a no-op.
 *
 * Every message goes through the redactor first, so a credential that
 * ends up in an error message (a URL with a token, an env assignment)
 * is masked before it reaches the terminal. The helper itself never
 * throws.
 */

import { redactContent } from "./scanner/redactor.js";

const PREFIX = "[pi-lanonasis-memory:debug]";

/** True when `LANONASIS_PI_MEMORY_DEBUG` is exactly `"1"`. */
export function isDebugEnabled(): boolean {
  return process.env.LANONASIS_PI_MEMORY_DEBUG === "1";
}

/**
 * Log a swallowed error to stderr when debug mode is on.
 *
 * @param context short dotted location, e.g. `"runtime.shutdown.store"`
 * @param err     whatever was caught
 */
export function debugLog(context: string, err: unknown): void {
  if (!isDebugEnabled()) return;
  try {
    const raw = err instanceof Error ? err.message : String(err);
    const line = redactContent(`${PREFIX} ${context}: ${raw}`).text;
    process.stderr.write(`${line}\n`);
  } catch {
    // Diagnostics must never become a failure of their own.
  }
}
