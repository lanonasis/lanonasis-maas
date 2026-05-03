import { describe, it, expect } from "vitest";
import { parseConfig } from "../config.js";

describe("parseConfig", () => {
  it("returns defaults when given empty object", () => {
    const cfg = parseConfig({});
    expect(cfg.baseUrl).toBe("https://api.lanonasis.com");
    expect(cfg.agentType).toBe("claude-code");
    expect(cfg.captureMode).toBe("hybrid");
    expect(cfg.maxMemoriesPerSession).toBe(5);
    expect(cfg.maxMemoriesPerCompaction).toBe(3);
    expect(cfg.autoRecall).toBe(true);
  });

  it("resolves ${ENV_VAR} in apiKey", () => {
    process.env.TEST_API_KEY = "lano_test123";
    const cfg = parseConfig({ apiKey: "${TEST_API_KEY}" });
    expect(cfg.apiKey).toBe("lano_test123");
    delete process.env.TEST_API_KEY;
  });

  it("rejects invalid captureMode", () => {
    const cfg = parseConfig({ captureMode: "bogus" });
    expect(cfg.captureMode).toBe("hybrid");
  });

  it("builds spoolDir from agentType", () => {
    const cfg = parseConfig({ agentType: "cursor" });
    expect(cfg.spoolDir).toContain("cursor");
  });

  it("prefers orgId input over projectId input", () => {
    const cfg = parseConfig({ orgId: "org-input", projectId: "legacy-project" });
    expect(cfg.projectId).toBe("org-input");
  });

  it("resolves scope from LANONASIS_ORG_ID env var when scope input is missing", () => {
    process.env.LANONASIS_ORG_ID = "org-env";
    delete process.env.LANONASIS_PROJECT_ID;

    const cfg = parseConfig({});
    expect(cfg.projectId).toBe("org-env");

    delete process.env.LANONASIS_ORG_ID;
  });

  it("uses LANONASIS_PROJECT_ID as a legacy alias when LANONASIS_ORG_ID is unset", () => {
    delete process.env.LANONASIS_ORG_ID;
    process.env.LANONASIS_PROJECT_ID = "project-alias";

    const cfg = parseConfig({});
    expect(cfg.projectId).toBe("project-alias");

    delete process.env.LANONASIS_PROJECT_ID;
  });
});
