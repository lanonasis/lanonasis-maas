/**
 * @lanonasis/pi-lanonasis-memory
 *
 * Pi extension that brings LanOnasis MaaS persistent memory into a Pi session.
 *
 * Phase 1 (scaffold) wires a single `/echo` slash command so Pi can load the
 * extension and prove the API surface. Phases 2+ (per
 * docs/context/architecture/pi-maas-integration-review.md §3) layer in:
 *
 *   - LanOnasisMemoryProvider over @lanonasis/memory-client/node
 *   - context-injection hooks (before_provider_request)
 *   - session-boundary persistence (session_start, session_shutdown)
 *   - Mind / Heart / Concierge orchestrated reflections
 *
 * Why this lives at packages/pi-lanonasis-memory/ rather than apps/:
 *   Pi extensions are packages, not apps. The Pi loader expects either a
 *   `package.json` declaring `{"pi":{"extensions":["./src/index.ts"]}}` or a
 *   hand-written `pi-extension.json` pointing at the same entry. We ship both
 *   so users get dual install paths (`npm install` or `pi install <path>`).
 */

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { registerEchoCommand, runEcho } from './commands/echo.js';

export interface ExtensionContextLike {
  ui: {
    notify(message: string, level?: 'info' | 'warn' | 'error'): void;
  };
}

export default function extension(pi: ExtensionAPI): void {
  registerEchoCommand(pi);
  // Surface a one-line banner on session start so users can confirm the
  // extension is loaded without needing to run a command.
  pi.on('session_start', () => {
    // No-op for Phase 1: keeps the hook reserved for the Phase 6 ingest path
    // without claiming to do work we haven't built yet.
  });
}

export { registerEchoCommand, runEcho } from './commands/echo.js';
