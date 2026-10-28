// The hook scripts started only when `process.stdin.isTTY === false`. Under
// bun, which is how Claude Code runs them, piped stdin leaves isTTY
// undefined, so every hook exited at once and did nothing. Feeding each
// script invalid JSON proves its entry point ran: only the entry point
// prints a "[claude-memory]" error.
import { describe, expect, it } from "vitest";
import { spawnSync } from "child_process";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const bunAvailable = spawnSync("bun", ["--version"]).status === 0;

describe.skipIf(!bunAvailable)("hook entry points run under bun with piped stdin", () => {
  for (const hook of ["recall", "stop", "precompact"]) {
    it(`${hook}.ts handles its input`, () => {
      const home = mkdtempSync(join(tmpdir(), "claude-memory-guard-"));
      try {
        const run = spawnSync("bun", [join(__dirname, "..", "..", "hooks", `${hook}.ts`)], {
          input: "not json",
          env: { PATH: process.env.PATH ?? "", HOME: home },
          encoding: "utf8",
          timeout: 15000,
        });
        expect(run.status).toBe(0);
        expect(run.stderr).toContain("[claude-memory]");
      } finally {
        rmSync(home, { recursive: true, force: true });
      }
    });
  }
});
