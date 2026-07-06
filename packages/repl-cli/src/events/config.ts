/**
 * Env-driven configuration for the capture-event ontology hooks.
 *
 * Two knobs (locked decision §2 of capture-event-ontology.md):
 *
 *   LANONASIS_CAPTURE_EVENTS
 *     Default: off. Enables the session-end classifier hook.
 *     When OFF, only the existing rules-pass / manual `/event` commands
 *     run — v0 behavior is fully preserved.
 *
 *   LANONASIS_CLASSIFIER=hybrid|rules-only
 *     Default: hybrid. When `rules-only`, the classifier short-circuits
 *     and never makes a network call — offline path. Independent of
 *     LANONASIS_CAPTURE_EVENTS so an operator can leave capture enabled
 *     across machines and only toggle the router pass per environment.
 *
 * Pure parsers — no I/O, no caching. Cheap to call.
 */

import type { ClassifierMode } from './types.js';

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);
const FALSY = new Set(['0', 'false', 'no', 'off', '']);

/**
 * Returns true if the session-end classifier hook should run at all.
 * Off by default — opt-in via env. Falsy values explicitly disable.
 */
export function isCaptureEventsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.LANONASIS_CAPTURE_EVENTS ?? '').trim().toLowerCase();
  if (TRUTHY.has(raw)) return true;
  if (FALSY.has(raw)) return false;
  return false;
}

/**
 * Read the classifier mode (hybrid vs rules-only).
 *
 * Unknown values fall back to `hybrid` — the safer default that exercises
 * the full feature. `rules-only` is the explicit offline opt-out.
 */
export function readClassifierMode(env: NodeJS.ProcessEnv = process.env): ClassifierMode {
  const raw = (env.LANONASIS_CLASSIFIER ?? '').trim().toLowerCase();
  if (raw === 'rules-only') return 'rules-only';
  return 'hybrid';
}
