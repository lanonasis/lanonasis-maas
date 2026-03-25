import { afterEach, describe, expect, it } from "vitest";
import { lanonasisConfigSchema } from "./config.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("lanonasisConfigSchema", () => {
  it("uses env fallbacks when config values are omitted", () => {
    process.env.LANONASIS_API_KEY = "env-key";
    process.env.LANONASIS_PROJECT_ID = "env-project";
    process.env.LANONASIS_BASE_URL = "https://memory.example.com/";

    const config = lanonasisConfigSchema.parse({});

    expect(config.apiKey).toBe("env-key");
    expect(config.projectId).toBe("env-project");
    expect(config.baseUrl).toBe("https://memory.example.com");
    expect(config.dedupeThreshold).toBe(0.985);
  });

  it("preserves explicit config values including dedupeThreshold", () => {
    const config = lanonasisConfigSchema.parse({
      apiKey: "cfg-key",
      projectId: "cfg-project",
      baseUrl: "https://api.custom.example/",
      dedupeThreshold: 0.99,
      captureMode: "explicit",
    });

    expect(config.apiKey).toBe("cfg-key");
    expect(config.projectId).toBe("cfg-project");
    expect(config.baseUrl).toBe("https://api.custom.example");
    expect(config.dedupeThreshold).toBe(0.99);
    expect(config.captureMode).toBe("explicit");
  });
});
