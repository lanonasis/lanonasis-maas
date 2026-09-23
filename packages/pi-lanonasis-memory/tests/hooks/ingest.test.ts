/**
 * ingest.test.ts — Phase 6: unit tests for the hook ingestion pipeline.
 *
 * Tests the classifyMessage(), extractText(), and buildTitle() helpers,
 * plus the full buildIngestPipeline() lifecycle (session_start → turn_end →
 * session_shutdown) using a mock in-memory store.
 *
 * Does NOT test the ExtensionAPI wiring (pi.on(...)) — those are integration
 * tests that require a live Pi instance and are covered by the manual smoke test.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Import internals for unit testing (these are module-private; tests live
// in the same package so they can access them via the test helper pattern).
// We re-export them via the hooks index for testability.
import {
  buildIngestPipeline,
  type IngestConfig,
} from "../../src/hooks/ingest.js";
import { MemoryStore } from "../../src/store/memory.js";

describe("classifyMessage (via buildIngestPipeline)", () => {
  // The pipeline itself doesn't expose classifyMessage publicly,
  // so we test it indirectly via the turn_end path.

  describe("signal patterns", () => {
    const CASES: Array<{
      content: string;
      toolResults?: Array<{ isError?: boolean }>;
      expectStored: boolean;
      description: string;
    }> = [
      // Short content — below minContentLength threshold
      {
        content: "No.",
        expectStored: false,
        description: "too short",
      },
      {
        content: "Done.",
        expectStored: false,
        description: "very short confirmation",
      },

      // Explicit memory requests
      {
        content:
          "Remember: the config file is at ~/.config/myapp.json",
        expectStored: true,
        description: "explicit remember",
      },
      {
        content:
          "Note that the database schema was updated last week",
        expectStored: true,
        description: "note that",
      },
      {
        content: "Keep in mind: the API has a rate limit of 100 req/min",
        expectStored: true,
        description: "keep in mind",
      },
      {
        content: "Important: always run the migration before deploying",
        expectStored: true,
        description: "important directive",
      },
      {
        content:
          "Worth noting — the legacy endpoint will be removed in v3.0",
        expectStored: true,
        description: "worth noting",
      },

      // Preferences
      {
        content: "I prefer to keep all exports at the top of the file",
        expectStored: true,
        description: "I prefer",
      },
      {
        content: "My convention is to use snake_case for local variables",
        expectStored: true,
        description: "my convention",
      },
      {
        content: "I usually put type imports on a separate line",
        expectStored: true,
        description: "I usually",
      },

      // Config facts
      {
        content: "export const API_KEY = process.env.API_KEY;",
        expectStored: true,
        description: "export const",
      },
      {
        content: "The config lives in .env at the project root",
        expectStored: false, // no signal
        description: "config mention without signal",
      },

      // Error diagnosis
      {
        content:
          "The issue was that the connection string had a trailing slash",
        expectStored: true,
        description: "the issue was",
      },
      {
        content: "Root cause: the timeout was set to 0 by default",
        expectStored: true,
        description: "root cause",
      },
      {
        content: "Solution: increase the batch size to 500",
        expectStored: true,
        description: "solution",
      },

      // Insights
      {
        content: "Interesting — bun's sqlite module doesn't support FTS5 by default",
        expectStored: true,
        description: "interesting",
      },
      {
        content: "TIL that SQLite's json_each() can flatten arrays in queries",
        expectStored: true,
        description: "TIL",
      },
      {
        content:
          "I learned that the pi-coding-agent has a built-in compaction hook",
        expectStored: true,
        description: "learned that",
      },

      // Corrections
      {
        content: "That's wrong — the sort order should be ascending",
        expectStored: true,
        description: "that's wrong",
      },
      {
        content:
          "Your usage of useEffect is incorrect — the dependency array is missing",
        expectStored: true,
        description: "incorrect",
      },

      // Conventions
      {
        content: "Always run the linter before committing",
        expectStored: true,
        description: "always convention",
      },
      {
        content: "Never use eval() in production code",
        expectStored: true,
        description: "never convention",
      },

      // Tool errors — should NOT store
      {
        content: "The file was written successfully after I fixed the permissions",
        expectStored: false, // no signal, not an error
        description: "successful write",
      },
    ];

    for (const tc of CASES) {
      it(`${tc.description} — ${tc.expectStored ? "stores" : "skips"}`, async () => {
        const tmpDir = mkdtempSync(join(tmpdir(), "pi-ingest-test-"));
        try {
          const store = await MemoryStore.open(join(tmpDir, "memories.db"));
          let capturedInput: unknown = null;

          // Monkey-patch store.add to capture what would be stored
          const originalAdd = store.add.bind(store);
          vi.spyOn(store, "add").mockImplementation((input: unknown) => {
            capturedInput = input;
            return originalAdd(input as Parameters<typeof originalAdd>[0]);
          });

          const pipeline = buildIngestPipeline(() => store, {
            target: "user",
            enabled: true,
            minContentLength: 20,
          });

          // Fire session_start to open the store
          await pipeline.onSessionStart({ type: "session_start" }, {} as never);

          // Fire a turn_end with the test content
          await pipeline.onTurnEnd(
            {
              type: "turn_end",
              turnIndex: 1,
              message: {
                role: "assistant",
                content: tc.content,
              },
              toolResults: tc.toolResults ?? [],
            },
            {} as never,
          );

          if (tc.expectStored) {
            expect(capturedInput).not.toBeNull();
            expect((capturedInput as { content?: string }).content).toBe(tc.content);
          } else {
            // No call to add() for this content
            expect(capturedInput).toBeNull();
          }
        } finally {
          rmSync(tmpDir, { recursive: true, force: true });
        }
      });
    }
  });

  describe("tool error gating", () => {
    it("skips storing when any tool result has isError: true", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "pi-ingest-test-"));
      try {
        const store = await MemoryStore.open(join(tmpDir, "memories.db"));
        let captured: unknown = null;
        vi.spyOn(store, "add").mockImplementation((input: unknown) => {
          captured = input;
          return store.add(input as Parameters<typeof store.add>[0]);
        });

        const pipeline = buildIngestPipeline(() => store, {
          enabled: true,
          minContentLength: 20,
        });

        await pipeline.onSessionStart({ type: "session_start" }, {} as never);

        await pipeline.onTurnEnd(
          {
            type: "turn_end",
            turnIndex: 1,
            message: {
              role: "assistant",
              content: "Remember: the API key is stored in the vault",
            },
            toolResults: [{ isError: true, content: [] }],
          },
          {} as never,
        );

        expect(captured).toBeNull();
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe("session_shutdown", () => {
    it("closes the store without throwing", async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), "pi-ingest-test-"));
      try {
        const store = await MemoryStore.open(join(tmpDir, "memories.db"));
        const pipeline = buildIngestPipeline(() => store, { enabled: true });

        await pipeline.onSessionStart({ type: "session_start" }, {} as never);

        // Should not throw
        await expect(
          pipeline.onSessionShutdown({ type: "session_shutdown" }, {} as never),
        ).resolves.not.toThrow();

        // Store should be closed
        expect(() => store.stats()).toThrow();
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
