// The hook entry points were inert in practice:
// - recall and stop exited unless LANONASIS_API_KEY was exported, so a user
//   logged in through `lanonasis auth login` got nothing, even though the
//   client can read that login;
// - recall printed {"result": ...}, which Claude Code does not read; only
//   hookSpecificOutput.additionalContext is injected;
// - recall searched "<dir> <branch> <tool>" instead of what the user asked.
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { runRecallHook } from "../../hooks/recall.js";
import { runStopHook } from "../../hooks/stop.js";
import type { LanonasisClient } from "../../client.js";

const originalHome = process.env.HOME;
const originalKey = process.env.LANONASIS_API_KEY;
const homes: string[] = [];

function freshHome(): void {
  const home = mkdtempSync(join(tmpdir(), "claude-memory-entry-"));
  homes.push(home);
  process.env.HOME = home;
}

afterEach(() => {
  process.env.HOME = originalHome;
  if (originalKey === undefined) delete process.env.LANONASIS_API_KEY;
  else process.env.LANONASIS_API_KEY = originalKey;
  while (homes.length) rmSync(homes.pop()!, { recursive: true, force: true });
});

const memory = { title: "Hostname-keyed storage", type: "knowledge", content: "Use the stable key", similarity: 0.9 };

function fakeClient(memories: unknown[] = [memory]) {
  const searchMemories = vi.fn().mockResolvedValue(memories);
  return { client: { searchMemories } as unknown as LanonasisClient, searchMemories };
}

describe("runRecallHook", () => {
  it("builds a client from the CLI login when no API key is exported", async () => {
    freshHome();
    delete process.env.LANONASIS_API_KEY;
    const { client } = fakeClient();
    const makeClient = vi.fn(() => client);

    await runRecallHook(JSON.stringify({ session_id: "s1", hook_event_name: "UserPromptSubmit", prompt: "why does the CLI log me out" }), { makeClient, cwd: "/tmp" });

    expect(makeClient).toHaveBeenCalledTimes(1);
  });

  it("searches with the user's prompt on UserPromptSubmit", async () => {
    freshHome();
    const { client, searchMemories } = fakeClient();
    const prompt = `why does the CLI log me out, even with an API key? ${"x".repeat(400)}`;

    await runRecallHook(JSON.stringify({ session_id: "s2", hook_event_name: "UserPromptSubmit", prompt }), { makeClient: () => client, cwd: "/tmp" });

    expect(searchMemories.mock.calls[0][0].query).toBe(prompt.slice(0, 200));
  });

  it("emits hookSpecificOutput.additionalContext, the only field Claude Code injects", async () => {
    freshHome();
    const { client } = fakeClient();

    const out = await runRecallHook(JSON.stringify({ session_id: "s3", hook_event_name: "UserPromptSubmit", prompt: "storage" }), { makeClient: () => client, cwd: "/tmp" });

    const parsed = JSON.parse(out);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(parsed.hookSpecificOutput.additionalContext).toContain("Hostname-keyed storage");
    expect(parsed.result).toBeUndefined();
  });

  it("recalls on every prompt, not only the first one in a session", async () => {
    freshHome();
    const { client, searchMemories } = fakeClient();
    const input = (prompt: string) => JSON.stringify({ session_id: "s4", hook_event_name: "UserPromptSubmit", prompt });

    await runRecallHook(input("first"), { makeClient: () => client, cwd: "/tmp" });
    await runRecallHook(input("second"), { makeClient: () => client, cwd: "/tmp" });

    expect(searchMemories).toHaveBeenCalledTimes(2);
  });

  it("labels memories with the API's memory_type field", async () => {
    freshHome();
    const { client } = fakeClient([{ title: "Ledger", memory_type: "context", content: "notes", similarity: 0.8 }]);
    const out = await runRecallHook(JSON.stringify({ session_id: "s7", hook_event_name: "UserPromptSubmit", prompt: "ledger" }), { makeClient: () => client, cwd: "/tmp" });
    const context = JSON.parse(out).hookSpecificOutput.additionalContext;
    expect(context).toContain("[context] Ledger");
    expect(context).not.toContain("[undefined]");
  });

  it("prints nothing when there is nothing to recall", async () => {
    freshHome();
    const { client } = fakeClient([]);
    const out = await runRecallHook(JSON.stringify({ session_id: "s5", hook_event_name: "UserPromptSubmit", prompt: "nothing" }), { makeClient: () => client, cwd: "/tmp" });
    expect(out).toBe("");
  });
});

describe("runStopHook", () => {
  it("captures the session when no API key is exported", async () => {
    freshHome();
    delete process.env.LANONASIS_API_KEY;
    const handle = vi.fn().mockResolvedValue({});

    await runStopHook(JSON.stringify({ session_id: "s6", transcript_path: "/nonexistent", num_messages: 0 }), { handle });

    expect(handle).toHaveBeenCalledTimes(1);
  });
});
