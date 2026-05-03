import { describe, expect, it, vi } from "vitest";

vi.mock("./client.js", () => ({
  LanonasisClient: vi.fn(function MockLanonasisClient() {
    return {};
  }),
}));

vi.mock("./hooks/local-fallback.js", () => ({
  LocalFallbackWriter: vi.fn(function MockLocalFallbackWriter() {
    return {};
  }),
}));

vi.mock("./hooks/context-engine.js", () => ({
  createContextEngine: vi.fn(() => ({ id: "recall-forge", buildContext: vi.fn() })),
}));

vi.mock("./hooks/capture.js", () => ({
  createCaptureHook: vi.fn(() => vi.fn()),
  createCompactionCaptureHook: vi.fn(() => vi.fn()),
}));

vi.mock("./tools/memory-search.js", () => ({
  registerMemorySearchTool: vi.fn(),
}));

vi.mock("./tools/memory-get.js", () => ({
  registerMemoryGetTool: vi.fn(),
}));

vi.mock("./tools/memory-store.js", () => ({
  registerMemoryStoreTool: vi.fn(),
}));

vi.mock("./tools/memory-forget.js", () => ({
  registerMemoryForgetTool: vi.fn(),
}));

vi.mock("./cli.js", () => ({
  registerCli: vi.fn(),
}));

vi.mock("./privacy/privacy-guard.js", () => ({
  PrivacyGuard: vi.fn(function MockPrivacyGuard() {
    return {};
  }),
}));

vi.mock("./privacy/privacy-log.js", () => ({
  PrivacyLogWriter: vi.fn(function MockPrivacyLogWriter() {
    return {};
  }),
}));

const { default: plugin } = await import("./index.js");

describe("RecallForge registration", () => {
  it("registers the context engine without subscribing recall to before_agent_start", () => {
    const api = {
      pluginConfig: {
        apiKey: "test-api-key",
        projectId: "test-project",
        autoRecall: true,
        recallMode: "auto",
      },
      resolvePath: (value: string) => value,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      on: vi.fn(),
      registerTool: vi.fn(),
      registerCli: vi.fn(),
      registerService: vi.fn(),
      registerContextEngine: vi.fn(),
    };

    plugin.register(api);

    expect(api.registerContextEngine).toHaveBeenCalledTimes(1);
    expect(api.on).not.toHaveBeenCalledWith("before_agent_start", expect.any(Function));
    expect(api.on).toHaveBeenCalledWith("agent_end", expect.any(Function));
    expect(api.on).toHaveBeenCalledWith("before_compaction", expect.any(Function));
  });
});
