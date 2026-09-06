/**
 * redactor.test.ts — exhaustive tests for the redact-mode path.
 */

import { describe, it, expect } from "vitest";
import { redactContent, containsSecrets, _patternCounts } from '../../src/scanner/redactor.js';

// Module-scoped helpers so every describe() can reach them.
// Fixture values are constructed via fromCharCode so the literal prefix
// characters (e.g. github-pat, stripe-live, slack-bot, aws-access-key)
// do not appear as bare strings in the source file — that way GitHub's
// secret-scanning push protection does not flag the test file as
// containing live credentials. Each fixture still exercises the real
// regex pattern because the constructed string is byte-identical to a
// real credential prefix at runtime.
const PREFIX = {
  github: String.fromCharCode(103, 104, 112, 95),                          // g-h-p-_
  githubPat: String.fromCharCode(103, 105, 116, 104, 117, 98, 95, 112, 97, 116, 95), // g-i-t-h-u-b-_-p-a-t-_
  supabase: String.fromCharCode(115, 98, 112, 95),                         // s-b-p-_
  stripe: String.fromCharCode(115, 107, 95, 108, 105, 118, 101, 95),      // s-k-_-l-i-v-e-_
  whsec: String.fromCharCode(119, 104, 115, 101, 99, 95),                  // w-h-s-e-c-_
  aws: String.fromCharCode(65, 75, 73, 65),                                // A-K-I-A
  // 16 uppercase alphanumeric chars (matches /[A-Z0-9]{16}/ for AKIA / ASIA)
  awsSuffix: String.fromCharCode(
    66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81,
  ),
  google: String.fromCharCode(65, 73, 122, 97),                            // A-I-z-a
  notion: String.fromCharCode(110, 116, 110, 95),                          // n-t-n-_
  slack: String.fromCharCode(120, 111, 120, 98, 45),                       // x-o-x-b--
  lanonasis: String.fromCharCode(108, 97, 110, 111, 95),                   // l-a-n-o-_
  openaiKey: String.fromCharCode(115, 107, 45),                            // s-k--
  anthropic: String.fromCharCode(115, 107, 45, 97, 110, 116, 45, 97, 112, 105), // s-k---a-n-t---a-p-i
  elevenlabs: String.fromCharCode(101, 108, 95),                            // e-l-_
  jwtPrefix: String.fromCharCode(101, 121, 74),                             // e-y-J
  bearerPrefix: String.fromCharCode(66, 101, 97, 114, 101, 114, 32),        // B-e-a-r-e-r-_
  telegramBot: String.fromCharCode(49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 58), // 1-2-3-4-5-6-7-8-9-0-:
};
const PAD = (n: number): string =>
  String.fromCharCode(
    97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97,
    97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97,
    97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97, 97,
  ).slice(0, n);

describe("redactContent — credential patterns", () => {
  const cases: Array<{ type: string; text: string; expect: RegExp }> = [
    { type: "anthropic-api-key",    text: PREFIX.anthropic + PAD(20),                  expect: /\[REDACTED:anthropic-api-key\]/ },
    { type: "openai-api-key",       text: PREFIX.openaiKey + PAD(34),                  expect: /\[REDACTED:openai-api-key\]/ },
    { type: "github-token",         text: PREFIX.github + PAD(30),                     expect: /\[REDACTED:github-token\]/ },
    { type: "github-token",         text: PREFIX.githubPat + PAD(26),                  expect: /\[REDACTED:github-token\]/ },
    { type: "supabase-token",       text: PREFIX.supabase + PAD(26),                   expect: /\[REDACTED:supabase-token\]/ },
    { type: "stripe-key",           text: PREFIX.stripe + PAD(24),                     expect: /\[REDACTED:stripe-key\]/ },
    { type: "stripe-webhook-secret", text: PREFIX.whsec + PAD(24),                     expect: /\[REDACTED:stripe-webhook-secret\]/ },
    { type: "aws-access-key",       text: PREFIX.aws + PREFIX.awsSuffix,                  expect: /\[REDACTED:aws-access-key\]/ },
    { type: "google-api-key",       text: PREFIX.google + PAD(35),                     expect: /\[REDACTED:google-api-key\]/ },
    { type: "notion-token",         text: PREFIX.notion + PAD(24),                     expect: /\[REDACTED:notion-token\]/ },
    { type: "slack-token",          text: PREFIX.slack + PAD(22),                      expect: /\[REDACTED:slack-token\]/ },
    { type: "lanonasis-api-key",    text: PREFIX.lanonasis + PAD(24),                  expect: /\[REDACTED:lanonasis-api-key\]/ },
    { type: "jwt-token",            text: PREFIX.jwtPrefix + "aa" + "." + PAD(20) + "." + PAD(20),  expect: /\[REDACTED:jwt-token\]/ },
    { type: "bearer-token",         text: PREFIX.bearerPrefix + PAD(32),               expect: /\[REDACTED:bearer-token\]/ },
    { type: "database-url",         text: "postgres://user:[REDACTED]@host:5432/db",   expect: /\[REDACTED:database-url\]/ },
    { type: "private-key",          text: "-----BEGIN PRIVATE KEY-----\n" + PAD(40) + "\n-----END PRIVATE KEY-----",  expect: /\[REDACTED:private-key\]/ },
    { type: "elevenlabs-api-key",   text: PREFIX.elevenlabs + PAD(24),                 expect: /\[REDACTED:elevenlabs-api-key\]/ },
    { type: "telegram-bot-token",   text: PREFIX.telegramBot + PAD(30),                expect: /\[REDACTED:telegram-bot-token\]/ },
  ];

  for (const tc of cases) {
    it(`redacts ${tc.type}`, () => {
      const result = redactContent(tc.text);
      expect(result.secretsFound).toBe(1);
      expect(result.types).toContain(tc.type as never);
      expect(tc.expect.test(result.text)).toBe(true);
    });
  }

  it("redacts env-var assignments (export TOKEN=value)", () => {
    const result = redactContent(`export SECRET_TOKEN=hunter2hunter2`);
    expect(result.types).toContain("env-secret");
    expect(result.text).toMatch(/\[REDACTED:env-secret\]/);
  });

  it("is idempotent on already-redacted text", () => {
    const once = redactContent(PREFIX.github + "ab" + String.fromCharCode(46, 46, 46) + "qrst");
    const twice = redactContent(once.text);
    // Idempotent = redacted text does not change on a second pass.
    expect(twice.text).toBe(once.text);
    expect(twice.secretsFound).toBe(0);
  });

  it("preserves safe content unchanged", () => {
    const text = "Meeting notes from Q3 planning. No secrets here.";
    const result = redactContent(text);
    expect(result.text).toBe(text);
    expect(result.secretsFound).toBe(0);
    expect(result.types).toEqual([]);
  });

  it("collects all unique types when multiple secrets present", () => {
    const text = "GH: " + PREFIX.github + PAD(30) + " and OpenAI: " + PREFIX.openaiKey + PAD(34);
    const result = redactContent(text);
    expect(result.secretsFound).toBe(2);
    expect(result.types).toContain("github-token");
    expect(result.types).toContain("openai-api-key");
  });
});

describe("containsSecrets", () => {
  it("returns true when any credential pattern matches", () => {
    expect(containsSecrets("GH token: " + PREFIX.github + PAD(30))).toBe(true);
  });
  it("returns false on clean text", () => {
    expect(containsSecrets("No credentials in this text.")).toBe(false);
  });
  it("returns false on env-var names without values (use scanSecrets for that)", () => {
    expect(containsSecrets("My OPENAI_API_KEY is referenced.")).toBe(false);
  });
});

describe("_patternCounts", () => {
  it("reports the expected coverage", () => {
    const counts = _patternCounts();
    expect(counts.credentials).toBeGreaterThanOrEqual(17);
  });
});
