import { describe, it, expect } from "vitest";
import { ReviewCadence } from "../../src/hooks/cadence";

describe("ReviewCadence", () => {
  it("defaults to 10 turns / 15 tool calls", () => {
    const c = new ReviewCadence();
    expect(c.everyTurns).toBe(10);
    expect(c.everyToolCalls).toBe(15);
  });

  it("does not fire before either threshold", () => {
    const c = new ReviewCadence();
    for (let i = 0; i < 9; i++) c.recordTurn();
    c.recordToolCalls(14);
    expect(c.shouldReview()).toBe(false);
  });

  it("fires when turns reach everyTurns", () => {
    const c = new ReviewCadence({ everyTurns: 3 });
    c.recordTurn();
    c.recordTurn();
    expect(c.shouldReview()).toBe(false);
    c.recordTurn();
    expect(c.shouldReview()).toBe(true);
  });

  it("fires when tool calls reach everyToolCalls, independent of turns", () => {
    const c = new ReviewCadence({ everyTurns: 100, everyToolCalls: 5 });
    c.recordToolCalls(2);
    c.recordTurn();
    expect(c.shouldReview()).toBe(false);
    c.recordToolCalls(3);
    expect(c.shouldReview()).toBe(true);
  });

  it("accumulates tool calls across turns", () => {
    const c = new ReviewCadence({ everyToolCalls: 4 });
    c.recordToolCalls(1);
    c.recordToolCalls(1);
    c.recordToolCalls(1);
    expect(c.shouldReview()).toBe(false);
    c.recordToolCalls(1);
    expect(c.shouldReview()).toBe(true);
  });

  it("reset() clears both counters", () => {
    const c = new ReviewCadence({ everyTurns: 2, everyToolCalls: 2 });
    c.recordTurn();
    c.recordTurn();
    c.recordToolCalls(5);
    expect(c.shouldReview()).toBe(true);
    c.reset();
    expect(c.shouldReview()).toBe(false);
    expect(c.turns).toBe(0);
    expect(c.toolCalls).toBe(0);
  });

  it("ignores negative / non-finite tool-call counts", () => {
    const c = new ReviewCadence({ everyToolCalls: 2 });
    c.recordToolCalls(-5);
    c.recordToolCalls(Number.NaN);
    expect(c.toolCalls).toBe(0);
    expect(c.shouldReview()).toBe(false);
  });

  it("clamps non-positive thresholds to 1", () => {
    const c = new ReviewCadence({ everyTurns: 0, everyToolCalls: -3 });
    expect(c.everyTurns).toBe(1);
    expect(c.everyToolCalls).toBe(1);
    c.recordTurn();
    expect(c.shouldReview()).toBe(true);
  });
});
