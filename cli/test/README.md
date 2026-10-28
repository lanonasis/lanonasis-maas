# CLI Test Suite (Parity Track)

This suite mirrors the mcp-core testing structure with three layers:

1. `commands.test.ts`
   Contract validation for all 45 CLI commands across auth, memory, topics, MCP, config, and API keys.
   **117 tests - runs in ~7 seconds**
2. `integration.test.ts`
   In-process command integration tests (always on) plus optional live HTTP checks against real API.
   **Requires built CLI and optional API credentials**
3. `load.test.ts`
   In-process concurrency/load checks plus optional live HTTP load checks.
   **Requires built CLI and optional API credentials**
4. `manual-tests.sh`
   Manual test script for debugging and exploratory testing.

## Quick Start

```bash
# Run contract tests (fastest, recommended for CI)
bun run test -- test/commands.test.ts

# Run all tests including existing src/ tests
bun run test

# Run manual tests
./test/manual-tests.sh all
```

## Test Structure

### Command Categories

The CLI commands are organized into these categories:

| Category | Commands | Count |
|----------|----------|-------|
| `auth` | `login`, `logout`, `status`, `register`, `whoami` | 5 |
| `memory` | `list`, `create`, `get`, `update`, `delete`, `search`, `stats`, `save-session`, `list-sessions`, `load-session`, `delete-session` | 11 |
| `topics` | `list`, `create`, `get`, `update`, `delete` | 5 |
| `config` | `list`, `get`, `set`, `reset` | 4 |
| `api-keys` | `list`, `create`, `revoke`, `rotate` | 4 |
| `mcp` | `status`, `connect`, `disconnect`, `list-servers`, `tools`, `resources`, `call`, `health`, `server start`, `server stop` | 10 |
| `system` | `health`, `status`, `init`, `guide`, `quickstart`, `completion` | 6 |

**Total: 45 commands**

## Run Commands

```bash
# From apps/lanonasis-maas/cli

# Contract tests (recommended for CI - fast)
bun run test -- test/commands.test.ts

# Integration tests (requires built CLI)
# Note: These execute actual CLI commands and may be slow
bun run test -- test/integration.test.ts --testTimeout=60000

# Load tests (requires built CLI)
# Note: These execute many concurrent CLI commands
bun run test -- test/load.test.ts --testTimeout=120000

# Full test run (includes existing src/ tests)
bun run test
```

## Optional Live API Tests

```bash
# Set environment variables for live API tests
export RUN_CLI_HTTP_INTEGRATION=true
export RUN_CLI_HTTP_LOAD_TESTS=true
export TEST_CLI_API_URL=https://api.lanonasis.com/api/v1
export TEST_CLI_VENDOR_KEY=<your-vendor-key>

# Run integration tests against live API
bun run test -- test/integration.test.ts --testTimeout=120000

# Run load tests against live API
bun run test -- test/load.test.ts --testTimeout=300000
```

**Important Notes:**
- Integration and load tests execute actual CLI commands via child_process
- These tests are **slow** and may timeout in constrained environments
- For CI/CD, recommend running only contract tests (`commands.test.ts`)
- Live API tests require a valid vendor key and network access

## Test Coverage Goals

- **Contract tests**: 100% of CLI commands covered with schema validation
- **Integration tests**: All command categories exercised with mock API
- **Load tests**: Concurrent command execution with < 5% error rate
- **Manual tests**: Common workflows documented for debugging

## Live service behaviour tests

The suites above are offline: they mock the API and assert command contracts. The
**live behaviour suite** is different — it calls the deployed services with a real
test key and asserts what a user actually observes.

```bash
export LANO_TEST_API_KEY=lano_...
npm run test:live
```

Covered surfaces:

| Suite | File | Endpoint |
|-------|------|----------|
| REST behaviour | `test/live/service-behavior.test.ts` | `https://api.lanonasis.com` |
| MCP tool behaviour | `test/live/service-behavior.test.ts` | `https://mcp.lanonasis.com/mcp` |

It verifies auth boundaries, memory CRUD/search/update/delete round-trips,
pagination and filters, soft-delete/restore, API-key lifecycle, projects,
behavior memory, intelligence tools, MCP resources/prompts, JSON-RPC errors, and
cross-route consistency (write on MCP → read on REST and vice versa).

Tests prefixed `[known-gap]` assert the correct behaviour and are expected to
fail while the corresponding service defects remain open. They are the
regression spec, not flaky tests. Override the targets with
`LANO_TEST_REST_BASE` / `LANO_TEST_MCP_URL` (for example, a staging deployment).

> The MCP host rate-limits aggressively (HTTP 429 with `retryAfter`). If the MCP
> block fails fast with a rate-limit message, wait for the cool-down and rerun.

## Notes

- Live API tests are skipped by default to keep local and CI runs deterministic.
- Contract fixtures live in `test/command-contract.fixtures.ts` and are the source of truth for command parity assertions.
- Mock API server in `test/mocks/api-mock.ts` provides deterministic responses for integration tests.
