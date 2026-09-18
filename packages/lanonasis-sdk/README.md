# @lanonasis/sdk

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

LanOnasis Enterprise SDK — Memory-as-a-Service client plus API key
management and MCP server primitives, in one bundle.

> **Status:** This package has **not** been published to npm yet. The source
> is canonical here in `lanonasis/lanonasis-maas`. First-publish is an owner
> action (out of scope for PR-A.2; see blueprint §6.2 in
> `docs/upgrade/lanonasis-maas-public-repo-blueprint.md`).

## Install

```bash
# Once published:
npm install @lanonasis/sdk
```

In the meantime, install directly from the repository:

```bash
npm install github:lanonasis/lanonasis-maas#packages/lanonasis-sdk
```

## Quick start

```ts
import { LanOnasis } from "@lanonasis/sdk";

const client = new LanOnasis({
  apiKey: process.env.LANONASIS_API_KEY,
  baseUrl: "https://api.lanonasis.com/api/v1",
});

// Memory operations
const memory = await client.memory.create({
  title: "First run",
  content: "Hello from @lanonasis/sdk",
  type: "context",
});

// API key management
const apiKey = await client.apiKeys.create({
  name: "ci-deploy",
  scopes: ["memory:read", "memory:write"],
});

// MCP server primitives (used by the CLI's `lanonasis mcp start`)
const server = client.mcp.server({ name: "my-agent", version: "1.0.0" });
```

## Subpath exports

| Subpath | Purpose |
|---|---|
| `@lanonasis/sdk` | Top-level `LanOnasis` client |
| `@lanonasis/sdk/memory` | Memory CRUD + semantic search |
| `@lanonasis/sdk/api-keys` | API key CRUD + rotation |
| `@lanonasis/sdk/mcp` | MCP server and tool primitives |

## Docs

- Public docs landing: <https://docs.lanonasis.com>
- Source repo: <https://github.com/lanonasis/lanonasis-maas/tree/main/packages/lanonasis-sdk>
- Issues: <https://github.com/lanonasis/lanonasis-maas/issues>

## License

MIT — see [LICENSE](./LICENSE).
