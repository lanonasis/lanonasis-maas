import { describe, it, expect } from "vitest";
import { extractDecisionChains } from "../../enrichment/chain-extractor.js";
import { readFileSync } from "fs";
import { join } from "path";

const fixturePath = join(import.meta.dirname, "fixtures", "sample-session.jsonl");
const fixtureLines = readFileSync(fixturePath, "utf-8").trim().split("\n");
const messages = fixtureLines.map((line) => JSON.parse(line));

describe("extractDecisionChains", () => {
  it("extracts at least one decision chain from fixture", () => {
    const chains = extractDecisionChains(messages);
    expect(chains.length).toBeGreaterThan(0);
  });

  it("each chain has a type field", () => {
    const chains = extractDecisionChains(messages);
    for (const chain of chains) {
      expect(["decision", "failure-pivot", "synthesis"]).toContain(chain.type);
    }
  });

  it("detects failure-pivot pattern (tried X, failed, switched to Y)", () => {
    const chains = extractDecisionChains(messages);
    const pivots = chains.filter((c) => c.type === "failure-pivot");
    expect(pivots.length).toBeGreaterThan(0);
  });

  it("detects decision pattern (user directive + assistant confirmation)", () => {
    const chains = extractDecisionChains(messages);
    const decisions = chains.filter((c) => c.type === "decision");
    expect(decisions.length).toBeGreaterThan(0);
  });

  it("produces content suitable for memory storage", () => {
    const chains = extractDecisionChains(messages);
    for (const chain of chains) {
      expect(chain.content.length).toBeGreaterThan(20);
      expect(chain.content.length).toBeLessThan(2000);
    }
  });
});
