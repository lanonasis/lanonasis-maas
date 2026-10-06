/**
 * test-helpers.ts — fixtures shared by tool/command/integration suites.
 *
 * Centralises:
 *   - opening a fresh on-disk MemoryStore per test
 *   - a no-op SyncAdapter that records enqueues
 *   - a fake ExtensionAPI that captures registerTool / registerCommand / on
 *   - a fake ExtensionCommandContext that records ui.notify calls
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MemoryStore } from "../src/store/memory.js";
import type { SyncAdapter } from "../src/deps.js";

export interface StoreHandle {
  store: MemoryStore;
  path: string;
  cleanup: () => void;
}

export async function openTempStore(): Promise<StoreHandle> {
  const dir = mkdtempSync(join(tmpdir(), "pi-mem-test-"));
  const path = join(dir, "memories.db");
  const store = await MemoryStore.open(path);
  return {
    store,
    path,
    cleanup: () => {
      try {
        store.close();
      } catch {
        // best-effort
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/**
 * No-op sync adapter that records every `enqueue` call so tests can assert
 * which ops fired without touching the real MaaS layer.
 */
export class RecordingSyncAdapter implements SyncAdapter {
  public calls: Array<{
    localId: string;
    op: "create" | "update" | "delete";
    payload: unknown;
    origin: "explicit" | "auto";
  }> = [];
  public enabled = true;
  createWorker() {
    return null;
  }
  enqueue(input: {
    localId: string;
    op: "create" | "update" | "delete";
    payload: unknown;
    origin: "explicit" | "auto";
  }): void {
    this.calls.push(input);
  }
  async start() {}
  async stop() {}
  async flush() {}
}

export interface CapturedTool {
  name: string;
  label: string;
  description: string;
  parameters: unknown;
  execute: unknown;
}
export interface CapturedCommand {
  name: string;
  description: string;
  handler: unknown;
}

/**
 * ExtensionAPI double — captures every pi.on / registerTool / registerCommand
 * call so tests can assert what was wired. Methods we don't exercise return
 * safe defaults and are no-op stubs.
 */
export class FakePi {
  public onCalls: Array<{ event: string; handler: unknown }> = [];
  public tools: CapturedTool[] = [];
  public commands: CapturedCommand[] = [];

  on(event: string, handler: unknown): () => void {
    this.onCalls.push({ event, handler });
    return () => {};
  }
  registerTool(tool: CapturedTool): void {
    this.tools.push(tool);
  }
  registerCommand(
    name: string,
    options: { description?: string; handler: unknown },
  ): void {
    this.commands.push({
      name,
      description: options.description ?? "",
      handler: options.handler,
    });
  }

  // Stubs for ExtensionAPI surface we don't exercise in tests.
  registerShortcut(): void {}
  registerFlag(): void {}
  registerMessageRenderer(): void {}
  registerMarkdownTransformer(): void {}
  registerEntryRenderer(): void {}
  registerToolRenderer(): void {}
  registerMcpServer(): void {}
  registerProvider(): void {}
  sendMessage(): void {}
  sendUserMessage(): void {}
  appendEntry(): void {}
  setSessionName(): void {}
  getSessionName(): undefined {
    return undefined;
  }
  setLabel(): void {}
  async exec(): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return { stdout: "", stderr: "", exitCode: 0 };
  }
  getActiveTools(): string[] {
    return [];
  }
  getAllTools(): unknown[] {
    return [];
  }
  getSettings(): unknown {
    return {};
  }
  setActiveTools(): void {}
  getCommands(): unknown[] {
    return [];
  }
  async setModel(): Promise<boolean> {
    return true;
  }
  getThinkingLevel(): string {
    return "off";
  }
  setThinkingLevel(): void {}
  getMcpServers(): unknown[] {
    return [];
  }
  getFlag(): undefined {
    return undefined;
  }
  getSystemPrompt(): string {
    return "";
  }
}

/**
 * Command context double — records ui.notify messages and exposes a fake
 * input() answer queue so TUI-style commands can be exercised without a
 * real Pi session.
 */
export class FakeCommandCtx {
  public notifications: Array<{ message: string; level?: string }> = [];
  public inputs: string[] = [];
  public cwd = "/tmp";
  public mode: "tui" | "rpc" | "json" | "print" = "rpc";
  public ui = {
    notify: (message: string, level?: string): void => {
      this.notifications.push({ message, level });
    },
    input: async (_title: string, _placeholder?: string) => {
      return this.inputs.shift();
    },
    confirm: async () => true,
    select: async () => undefined,
  };
}

/** Convenience: invoke a captured command handler. */
export async function runCommand(
  ctx: FakeCommandCtx,
  handler: (args: string, ctx: unknown) => Promise<void>,
  args: string,
): Promise<void> {
  await handler(args, ctx);
}