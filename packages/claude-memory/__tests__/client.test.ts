import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock("undici", () => ({
  Agent: class MockAgent {},
  fetch: mockFetch,
}));

import { LanonasisClient } from "../client.js";

function mockJsonResponse(payload: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: vi.fn().mockResolvedValue(JSON.stringify(payload)),
    headers: {
      get: vi.fn().mockReturnValue(null),
    },
  };
}

describe("LanonasisClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("allows project scope to be omitted", () => {
    expect(() =>
      new LanonasisClient({
        apiKey: "lano_test",
        projectId: "",
        baseUrl: "https://api.lanonasis.com",
      }),
    ).not.toThrow();
  });

  it("omits X-Project-Scope header when no explicit scope is configured", async () => {
    mockFetch.mockResolvedValue(
      mockJsonResponse({ status: "ok", version: "1.0.0" }),
    );
    const client = new LanonasisClient({
      apiKey: "lano_test",
      projectId: "",
      baseUrl: "https://api.lanonasis.com",
    });

    await client.getHealth();

    const options = mockFetch.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(options.headers["X-Project-Scope"]).toBeUndefined();
  });

  it("sends X-Project-Scope header when explicit scope is configured", async () => {
    mockFetch.mockResolvedValue(
      mockJsonResponse({ status: "ok", version: "1.0.0" }),
    );
    const client = new LanonasisClient({
      apiKey: "lano_test",
      projectId: "scope-123",
      baseUrl: "https://api.lanonasis.com",
    });

    await client.getHealth();

    const options = mockFetch.mock.calls[0][1] as {
      headers: Record<string, string>;
    };
    expect(options.headers["X-Project-Scope"]).toBe("scope-123");
  });
});
