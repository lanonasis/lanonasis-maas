/**
 * reflect-categorize.test.ts — pure helper tests for the /reflect heuristic.
 */

import { describe, it, expect } from "vitest";

import { categorizeReflection } from "../../src/commands/reflect-categorize.js";

describe("categorizeReflection", () => {
  it("returns 'preference' for 'I prefer' phrasing", () => {
    expect(categorizeReflection("I prefer bun over npm")).toBe("preference");
  });

  it("returns 'preference' for 'I usually' phrasing", () => {
    expect(categorizeReflection("I usually commit with --no-verify")).toBe(
      "preference",
    );
  });

  it("returns 'correction' for 'actually' phrasing", () => {
    expect(categorizeReflection("actually, the test was wrong")).toBe(
      "correction",
    );
  });

  it("returns 'correction' for 'I was wrong' phrasing", () => {
    expect(categorizeReflection("I was wrong about the timing")).toBe(
      "correction",
    );
  });

  it("defaults to 'insight' for general observations", () => {
    expect(categorizeReflection("the migration reduced startup by 40%")).toBe(
      "insight",
    );
  });

  it("returns 'insight' on empty input (safe default)", () => {
    expect(categorizeReflection("")).toBe("insight");
  });

  it("preference patterns take precedence over correction patterns", () => {
    // 'I prefer' wins even if the text contains 'actually'.
    expect(
      categorizeReflection("I prefer X, actually use Y instead"),
    ).toBe("preference");
  });
});