/**
 * /echo — Phase 1 smoke command.
 *
 * Reverses any arguments and echoes them back through Pi's UI. The point is
 * to prove the extension loaded, the API surface (registerCommand + ui) is
 * reachable, and the package builds. Phase 7 will replace this with real
 * `memory` slash commands wrapping @lanonasis/memory-client.
 */

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

export interface EchoResult {
  input: string;
  output: string;
}

export function runEcho(text: string): EchoResult {
  const trimmed = text.trim();
  const output =
    trimmed.length === 0
      ? '(no input — try `/echo hello`)'
      : [...trimmed].reverse().join('');
  return { input: trimmed, output };
}

export function registerEchoCommand(pi: ExtensionAPI): void {
  pi.registerCommand('echo', {
    description: 'Phase 1 smoke command — reverses its argument (e.g. `/echo hello` -> `olleh`).',
    handler: async (args, ctx) => {
      // The Pi registerCommand handler receives the raw argument string in
      // `args` and a session context (with `ctx.ui.notify` available). We
      // accept text inputs and route them through runEcho so the same logic
      // is unit-testable without spinning up a UI.
      const input = typeof args === 'string' ? args : '';
      const { output } = runEcho(input);
      ctx.ui.notify(`echo: ${output}`, 'info');
    },
  });
}
