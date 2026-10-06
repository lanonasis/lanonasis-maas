/**
 * types.ts — shared types for slash commands.
 *
 * All commands receive the same dependency container so the extension
 * factory can wire them in any order. Each command exports a `register`
 * function with this exact signature, which keeps the test surface tiny
 * (fake `pi`, real store, fake sync).
 */

import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import type { MemoryStore } from "../store/memory.js";
import type {
  MaaSAdapter,
  SyncAdapter,
  InjectionAdapter,
  CorrectionAdapter,
  MirroredStoreLike,
} from "../deps.js";

/**
 * Container handed to each command's `register(pi, deps)`. All accessors
 * are lazy so the order of `MemoryStore.all` and command registration does
 * not matter; a command that fires before the store opens gets `null` from
 * `getStore()` and is expected to handle that gracefully (the command
 * returns a friendly message instead of crashing).
 */
export interface CommandDeps {
  getStore: () => MemoryStore | null;
  getMirror: () => MirroredStoreLike | null;
  getMaas: () => MaaSAdapter;
  getSync: () => SyncAdapter;
  getInjection: () => InjectionAdapter;
  getCorrection: () => CorrectionAdapter;
}

/**
 * Convenience type for a command module's `register` export. Keeps the
 * individual files from repeating the signature verbatim.
 */
export type CommandRegister = (
  pi: ExtensionAPI,
  deps: CommandDeps,
) => void;

/**
 * Minimal command-context shape commands actually rely on. The full
 * `ExtensionCommandContext` includes a lot we don't use; this subset is
 * enough for testing and keeps mocks small.
 */
export type CommandCtx = Pick<ExtensionCommandContext, "ui" | "cwd">;

export interface CommandArgs {
  raw: string;
  parts: Array<string>;
}