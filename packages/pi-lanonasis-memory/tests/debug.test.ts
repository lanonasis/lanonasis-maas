/**
 * debug.test.ts — the opt-in stderr logger used by swallowed catches.
 */

import { describe, it, expect, afterEach, vi } from "vitest";

import { debugLog, isDebugEnabled } from "../src/debug.js";

// Built via fromCharCode so no literal credential prefix sits in source.
const FAKE_GITHUB_TOKEN =
  String.fromCharCode(103, 104, 112, 95) + "A".repeat(36); // g-h-p-_ + 36 chars

describe("debugLog", () => {
  const original = process.env.LANONASIS_PI_MEMORY_DEBUG;

  afterEach(() => {
    if (original === undefined) delete process.env.LANONASIS_PI_MEMORY_DEBUG;
    else process.env.LANONASIS_PI_MEMORY_DEBUG = original;
    vi.restoreAllMocks();
  });

  function captureStderr() {
    const lines: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
      lines.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);
    return lines;
  }

  it("is silent when LANONASIS_PI_MEMORY_DEBUG is unset", () => {
    delete process.env.LANONASIS_PI_MEMORY_DEBUG;
    const lines = captureStderr();
    debugLog("runtime.shutdown", new Error("boom"));
    expect(isDebugEnabled()).toBe(false);
    expect(lines).toEqual([]);
  });

  it("is silent for values other than exactly '1'", () => {
    process.env.LANONASIS_PI_MEMORY_DEBUG = "true";
    const lines = captureStderr();
    debugLog("runtime.shutdown", new Error("boom"));
    expect(lines).toEqual([]);
  });

  it("writes one tagged line to stderr when LANONASIS_PI_MEMORY_DEBUG=1", () => {
    process.env.LANONASIS_PI_MEMORY_DEBUG = "1";
    const lines = captureStderr();
    debugLog("runtime.shutdown", new Error("boom"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("[pi-lanonasis-memory:debug] runtime.shutdown: boom\n");
  });

  it("accepts non-Error throwables", () => {
    process.env.LANONASIS_PI_MEMORY_DEBUG = "1";
    const lines = captureStderr();
    debugLog("ctx", "plain string");
    debugLog("ctx", undefined);
    expect(lines).toEqual([
      "[pi-lanonasis-memory:debug] ctx: plain string\n",
      "[pi-lanonasis-memory:debug] ctx: undefined\n",
    ]);
  });

  it("redacts secrets before writing", () => {
    process.env.LANONASIS_PI_MEMORY_DEBUG = "1";
    const lines = captureStderr();
    debugLog("sync.push", new Error(`auth failed for ${FAKE_GITHUB_TOKEN}`));
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain(FAKE_GITHUB_TOKEN);
    expect(lines[0]).toContain("[REDACTED:github-token]");
  });

  it("never throws, even if stderr.write throws", () => {
    process.env.LANONASIS_PI_MEMORY_DEBUG = "1";
    vi.spyOn(process.stderr, "write").mockImplementation(() => {
      throw new Error("EPIPE");
    });
    expect(() => debugLog("ctx", new Error("x"))).not.toThrow();
  });
});
