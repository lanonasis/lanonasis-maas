import { describe, expect, it } from "vitest";
import { containsSecrets, redactSecrets } from "./secret-redactor.js";

describe("redactSecrets", () => {
  it("redacts provider tokens", () => {
    const { text, types } = redactSecrets(
      "k=sk-ant-abcdefghijklmnopqrstuvwxyz gh=ghp_abcdefghijklmnopqrstuvwxyz0123 lano_abcdefghijklmnopqrstuvwx",
    );
    expect(text).not.toMatch(/sk-ant-|ghp_|lano_/);
    expect(types).toEqual(expect.arrayContaining(["anthropic-api-key", "github-token", "lanonasis-api-key"]));
  });

  it("redacts short OpenAI keys (20+ chars, as in 1.1.1)", () => {
    expect(redactSecrets("sk-abcdefghij0123456789").types).toContain("openai-api-key");
  });

  it("redacts lowercase and key: value assignments", () => {
    const { text, types } = redactSecrets(
      'api_key: "abcdef0123456789abcd"\npassword=hunter2hunter2\nsecret_key = zyxwvutsrqponmlkjih\naws_secret_access_key=' +
        "A".repeat(40),
    );
    expect(text).not.toMatch(/abcdef0123456789abcd|hunter2hunter2|zyxwvutsrqponmlkjih|A{40}/);
    expect(types).toEqual(expect.arrayContaining(["generic-api-key", "password", "secret-key"]));
  });

  it("does not re-redact an already redacted env assignment", () => {
    const { text } = redactSecrets("export OPENAI_API_KEY=sk-abcdefghij0123456789xyz");
    expect(text).toBe("export OPENAI_API_KEY=[REDACTED:openai-api-key]");
  });

  it("redacts PII by default", () => {
    const { text, types } = redactSecrets("mail jane@example.com card 4111 1111 1111 1111");
    expect(text).not.toMatch(/jane@example\.com|4111/);
    expect(types).toEqual(expect.arrayContaining(["email", "credit-card"]));
  });

  it("keeps PII when redactPII is false, still strips credentials", () => {
    const { text } = redactSecrets("jane@example.com ghp_abcdefghijklmnopqrstuvwxyz0123", { redactPII: false });
    expect(text).toContain("jane@example.com");
    expect(text).not.toContain("ghp_");
  });

  it("containsSecrets is stable across repeated calls", () => {
    const s = "token ghp_abcdefghijklmnopqrstuvwxyz0123";
    expect(containsSecrets(s)).toBe(true);
    expect(containsSecrets(s)).toBe(true);
    expect(containsSecrets("plain text", { redactPII: false })).toBe(false);
  });
});
