import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  detectCorrectionCue,
  detectCorrectionAck,
  createCorrectionCapture,
} from "../../src/hooks/correction";
import { MemoryStore } from "../../src/store/memory";

describe("detectCorrectionCue", () => {
  const POSITIVE = [
    "That's wrong, the port is 5433",
    "that’s wrong — use pnpm",
    "No, actually the file lives in src/lib",
    "You're wrong about the API version",
    "That is incorrect.",
    "This is not what I asked for",
    "that's not right, revert it",
    "That isn't right",
  ];
  const NEGATIVE = [
    "Please add a test for the parser",
    "Looks good, ship it",
    "No tests yet — can you add some?",
    "What's the right way to do this?",
    "",
  ];
  for (const text of POSITIVE) {
    it(`detects cue: ${JSON.stringify(text)}`, () => {
      expect(detectCorrectionCue(text)).toBe(true);
    });
  }
  for (const text of NEGATIVE) {
    it(`no cue: ${JSON.stringify(text)}`, () => {
      expect(detectCorrectionCue(text)).toBe(false);
    });
  }
});

describe("detectCorrectionAck", () => {
  const POSITIVE = [
    "You're right — the port is 5433, not 5432.",
    "You are right, I'll switch to pnpm.",
    "My mistake: the file is in src/lib.",
    "I was wrong about the API version; it's v2.",
    "Apologies, I misread the config.",
    "Correction: the default timeout is 30s.",
    "I misread the stack trace — the error comes from the client.",
  ];
  const NEGATIVE = [
    "Done. Tests pass.",
    "Here is the updated file.",
    "Right now the build takes 30s.",
    "",
  ];
  for (const text of POSITIVE) {
    it(`detects ack: ${JSON.stringify(text)}`, () => {
      expect(detectCorrectionAck(text)).toBe(true);
    });
  }
  for (const text of NEGATIVE) {
    it(`no ack: ${JSON.stringify(text)}`, () => {
      expect(detectCorrectionAck(text)).toBe(false);
    });
  }
});

describe("createCorrectionCapture", () => {
  async function withStore(fn: (store: MemoryStore) => Promise<void>): Promise<void> {
    const dir = mkdtempSync(join(tmpdir(), "pi-correction-test-"));
    const store = await MemoryStore.open(join(dir, "memories.db"));
    try {
      await fn(store);
    } finally {
      try {
        store.close();
      } catch {
        /* already closed */
      }
      rmSync(dir, { recursive: true, force: true });
    }
  }

  const userInput = (text: string, source: "interactive" | "rpc" | "extension" = "interactive") => ({
    type: "input" as const,
    text,
    source,
  });
  const turnEnd = (content: unknown, role = "assistant") => ({
    type: "turn_end" as const,
    turnIndex: 1,
    message: { role, content },
    toolResults: [],
  });

  it("stores the assistant acknowledgement after a user correction cue", async () => {
    await withStore(async (store) => {
      const cap = createCorrectionCapture(() => store);
      cap.onInput(userInput("That's wrong, the DB port is 5433"));
      expect(cap.isPending()).toBe(true);

      const ack = "You're right — the DB port is 5433, not 5432. I'll update the config.";
      const res = await cap.onTurnEnd(turnEnd(ack));
      expect(res?.ok).toBe(true);
      expect(cap.isPending()).toBe(false);

      const records = store.list();
      expect(records).toHaveLength(1);
      expect(records[0].content).toBe(ack);
      expect(records[0].category).toBe("correction");
      expect(records[0].target).toBe("memory");
      expect(records[0].tags).toEqual(["origin:auto", "correction"]);
    });
  });

  it("never stores the user prompt text", async () => {
    await withStore(async (store) => {
      const cap = createCorrectionCapture(() => store);
      const userText = "No, actually the secret folder is /srv/private-user-notes";
      cap.onInput(userInput(userText));
      await cap.onTurnEnd(turnEnd("My mistake — I'll use the folder you mentioned."));
      for (const r of store.list()) {
        expect(r.content).not.toContain("private-user-notes");
        expect(r.title).not.toContain("private-user-notes");
      }
    });
  });

  it("clears the pending flag when the assistant does not acknowledge", async () => {
    await withStore(async (store) => {
      const cap = createCorrectionCapture(() => store);
      cap.onInput(userInput("that's not right"));
      const res = await cap.onTurnEnd(turnEnd("Let me check the logs first."));
      expect(res).toBeNull();
      expect(cap.isPending()).toBe(false);
      // A later ack without a fresh cue is not captured
      const res2 = await cap.onTurnEnd(turnEnd("You're right, the logs show a timeout."));
      expect(res2).toBeNull();
      expect(store.list()).toHaveLength(0);
    });
  });

  it("does nothing without a pending cue", async () => {
    await withStore(async (store) => {
      const cap = createCorrectionCapture(() => store);
      cap.onInput(userInput("Please add retries to the client"));
      expect(cap.isPending()).toBe(false);
      const res = await cap.onTurnEnd(turnEnd("You're right that retries help; added them."));
      expect(res).toBeNull();
      expect(store.list()).toHaveLength(0);
    });
  });

  it("ignores extension-sourced input", () => {
    const cap = createCorrectionCapture(() => null);
    cap.onInput(userInput("That's wrong", "extension"));
    expect(cap.isPending()).toBe(false);
  });

  it("is scanner-gated: secret-bearing acknowledgements are refused", async () => {
    await withStore(async (store) => {
      const cap = createCorrectionCapture(() => store);
      cap.onInput(userInput("That's wrong, use the other key"));
      const res = await cap.onTurnEnd(
        turnEnd("You're right — the key is AKIAIOSFODNN7EXAMPLE for the deploy user."),
      );
      expect(res?.ok).toBe(false);
      expect(store.list()).toHaveLength(0);
      expect(cap.isPending()).toBe(false);
    });
  });

  it("clears the flag even when no store is available", async () => {
    const cap = createCorrectionCapture(() => null);
    cap.onInput(userInput("you're wrong"));
    const res = await cap.onTurnEnd(turnEnd("You're right, sorry about that confusion."));
    expect(res).toBeNull();
    expect(cap.isPending()).toBe(false);
  });

  it("extracts text from content blocks and ignores non-assistant messages", async () => {
    await withStore(async (store) => {
      const cap = createCorrectionCapture(() => store);
      cap.onInput(userInput("incorrect"));
      await cap.onTurnEnd(turnEnd("You're right, sorry.", "user"));
      expect(store.list()).toHaveLength(0);

      cap.onInput(userInput("incorrect"));
      const add = vi.spyOn(store, "add");
      await cap.onTurnEnd(
        turnEnd([
          { type: "text", text: "I was wrong: the cache TTL is 300s." },
          { type: "toolCall", id: "x" },
        ]),
      );
      expect(add).toHaveBeenCalledTimes(1);
      expect(store.list()[0].content).toBe("I was wrong: the cache TTL is 300s.");
    });
  });
});
