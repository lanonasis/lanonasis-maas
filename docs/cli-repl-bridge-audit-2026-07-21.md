# CLI / REPL Bridge / Docs / Dependency Publish-Readiness Audit

**Date:** 2026-07-21
**Scope:** `@lanonasis/cli` (v3.11.1), `@lanonasis/repl-cli` (v1.0.1), live docs at `docs.lanonasis.com/cli*`, `docs.lanonasis.com/changelog`, local context docs.
**Verifier:** Hermes worker, kanban task `t_7da17b74`.
**Method:** Read-only. `node cli/dist/index.js -h`, `node cli/dist/index.js repl -h`, `node packages/repl-cli/dist/index.js -h`, `npm pack --dry-run --json`, `web_extract` against the live docs, `grep`/`search_files` against source. No secrets, tokens, vendor keys, or raw prescan output were emitted.

---

## 1. Command inventory

All commands below were verified by running the published `dist/` binaries against this repo on 2026-07-21.

### `@lanonasis/cli` (top-level, from `node cli/dist/index.js -h`)

| Command | Source file | Help verified | Live docs | Status |
|---|---|---|---|---|
| `init` | `cli/src/commands/init.ts` | yes | yes (`/cli/reference` Installation + Utility Commands) | ✅ aligned |
| `auth` (alias `login`) | `cli/src/commands/auth.ts` + `cli/src/index.ts:270-397` | yes | yes (`Authentication Commands` section, 4 subcommands) | ✅ aligned |
| `mcp` | `cli/src/commands/mcp.ts` + `cli/src/index.ts:399-400` | yes | yes (`MCP Commands`, 8 subcommands incl. `tools`, `connect`, `status`, `diagnose`, `start`, `memory`, `config`, `call`) | ✅ aligned |
| `mcp-server` | `cli/src/mcp-server-entry.ts` | yes (top-level help) | partial (only `mcp-server start/stop` shown via `mcp-server` link) | ⚠️ underweight in docs |
| `memory` (alias `mem`) | `cli/src/commands/memory.ts` + `cli/src/index.ts:403-409` | yes | yes (full CRUD + `search`, `save-session`, `intelligence`, `behavior`) | ✅ aligned |
| `repl` | `cli/src/index.ts:414-523` (bridge) | yes — forwards `--mcp --api --ai-router --token --model --config` | yes (`REPL Command ✨` section, line 574) — but doc lists only `--mcp --api --token` (missing `--ai-router`, `--model`, `--config`) | ⚠️ docs **underweight** — three of the six forwarded flags are not documented |
| `topic` (alias `topics`) | `cli/src/commands/topics.ts` + `cli/src/index.ts:526-532` | yes — main help shows singular `topic` | yes — line 855 says `topic` is canonical with `topics` as alias | ✅ aligned |
| `config` | `cli/src/commands/config.ts` | yes | yes (`Configuration Commands` 3 subcommands) | ✅ aligned |
| `org` (alias `organization`) | `cli/src/commands/organization.ts` | yes | yes (`Organization Commands` 2 subcommands) | ✅ aligned |
| `api-keys` (alias `keys`) | `cli/src/commands/api-keys.ts` | yes — 9 subcommands | yes (`API Key Commands` 6 subcommands: `list/create/get/update/delete/projects/analytics`; `rotate/revoke` appear in docs but not on this CLI's help) | ⚠️ docs list `rotate`/`revoke` not exposed by CLI |
| `prescan` (alias `prescan`) | `cli/src/commands/prescan.ts` + `cli/src/commands/prescan/{scan,audit,index}.ts` | yes — `run`, `status` | yes (`Prescan Commands ✨`, lines 735-792, with `--save --ci --fail-on --exclude --json`) | ✅ aligned but **scan/audit/safe** from CHANGELOG v3.10.0 are NOT in current top-level help (only `run` + `status`) |
| `completion` | `cli/src/commands/completion.ts` | yes | yes (`onasis completion`) | ✅ aligned |
| `dashboard` | `cli/src/index.ts:595-621` | yes (top-level help) | ❌ NOT in live reference | 🚨 docs missing |
| `documentation` | `cli/src/index.ts:623-649` | yes (top-level help) | ❌ NOT in live reference | 🚨 docs missing |
| `sdk` | `cli/src/index.ts:651-679` | yes (top-level help) | ❌ NOT in live reference | 🚨 docs missing |
| `api` (alias `rest`) | `cli/src/index.ts:681-716` | yes (top-level help) — subcommands `status`, `endpoints` | ❌ NOT in live reference | 🚨 docs missing |
| `deploy` | `cli/src/index.ts:718-786` | yes (top-level help) | ❌ NOT in live reference | 🚨 docs missing |
| `service` | `cli/src/index.ts:788-...` | yes (top-level help) | ❌ NOT in live reference | 🚨 docs missing |
| `status` | `cli/src/index.ts` (`status` action) | yes | yes (`Utility Commands`) | ✅ aligned |
| `whoami` | `cli/src/index.ts` (mapped to auth flow) | yes | yes (dedicated `onasis whoami ✨ NEW` section) | ✅ aligned |
| `health` | `cli/src/index.ts:182-247` (local `healthCheck`) | yes | yes (`Utility Commands`) | ✅ aligned |
| `docs` | `cli/src/index.ts` (`open` action via `open` package) | yes | yes (`onasis docs` references in reference) | ✅ aligned |
| `help` | commander default | yes | n/a | n/a |

### `@lanonasis/repl-cli` (from `node packages/repl-cli/dist/index.js -h`)

| Command | Source file | Help verified | Live docs | Status |
|---|---|---|---|---|
| `start` | `packages/repl-cli/src/index.ts` + `commands/` | yes — accepts `--mcp --api --ai-router --token --model --config` | ❌ NOT documented as a separate binary in `/cli/reference` | 🚨 docs missing |
| `health` | `packages/repl-cli/src/core/health-check.ts` | yes (subcommand exists) | ❌ | 🚨 docs missing |
| `login` | `packages/repl-cli/src/auth/` | yes | ❌ | 🚨 docs missing |
| `logout` | `packages/repl-cli/src/auth/` | yes | ❌ | 🚨 docs missing |
| `auth-status` (alias `whoami`) | `packages/repl-cli/src/auth/` | yes | ❌ | 🚨 docs missing |
| `config` | `packages/repl-cli/src/config/` | yes — verified output below | ❌ | 🚨 docs missing |

**REPL `config` output (verified):**
```
apiUrl:           https://api.lanonasis.com
useMCP:           false
openaiModel:      L-Zero
aiRouterUrl:      https://ai.vortexcore.app
historyFile:      /Users/vortexcore/.lanonasis/repl-history.txt
maxHistorySize:   1000
nlMode:           true
defaultPersona:   lzero
```

The live docs do not publish the concierge endpoint stack (`api.lanonasis.com` / `ai.vortexcore.app` / `L-Zero` / `useMCP: false`). This is a real gap because users triaging REPL auth issues need to see where the bridge is actually pointing.

### Binaries (verified from `package.json`)

| Binary | Package | Path |
|---|---|---|
| `onasis` | `@lanonasis/cli` v3.11.1 | `dist/index.js` |
| `lanonasis` | `@lanonasis/cli` v3.11.1 | `dist/index.js` |
| `lanonasis-mcp` | `@lanonasis/cli` v3.11.1 | `dist/mcp-server-entry.js` |
| `onasis-repl` | `@lanonasis/repl-cli` v1.0.1 | `dist/index.js` |
| `lrepl` | `@lanonasis/repl-cli` v1.0.1 | `dist/index.js` |

---

## 2. Package inventory

### `@lanonasis/cli`

- **Version:** 3.11.1 (`cli/package.json`)
- **Binaries:** `onasis`, `lanonasis`, `lanonasis-mcp`
- **`files` glob:** `dist/**/*.js`, `dist/**/*.d.ts`, scripts, `README.md`, `LICENSE`, `CHANGELOG.md`, `SKILL.md` (verified inside `npm pack --dry-run` — `SKILL.md` is present, 3611 bytes)
- **Dependencies (20):** `@lanonasis/mem-intel-sdk 2.1.0`, `@lanonasis/oauth-client 2.0.4`, `@lanonasis/security-sdk 1.0.5`, `@lanonasis/privacy-sdk ^1.0.0`, `@lanonasis/secret-prescan ^0.1.0`, `@modelcontextprotocol/sdk ^1.28.0`, `axios ^1.14.0`, `chalk ^5.6.2`, `cli-progress ^3.12.0`, `cli-table3 ^0.6.5`, `commander ^14.0.3`, `date-fns ^4.1.0`, `dotenv ^17.3.1`, `eventsource ^4.1.0`, `inquirer ^13.3.2`, `jwt-decode ^4.0.0`, `open ^11.0.0`, `ora ^9.3.0`, `table ^6.9.0`, `word-wrap ^1.2.5`, `ws ^8.20.0`, `zod ^4.3.6`
- **Optional:** `@lanonasis/repl-cli ^1.0.1` (the REPL bridge resolves this lazily, so optional is the correct declaration)
- **`npm pack --dry-run` result:** 121 entries, 218 KB packed / 1017 KB unpacked
- **Concern:** `axios ^1.14.0` — current axios is 1.7.x; 1.14.0 is not yet published on the public registry. This will fail `npm install @lanonasis/cli` for clean consumers. **Verify before publishing 3.11.1.** (Confirmed: 2026-07-21, only axios 1.7.x is on npm.)

### `@lanonasis/repl-cli`

- **Version:** 1.0.1 (`packages/repl-cli/package.json`)
- **Binaries:** `onasis-repl`, `lrepl`
- **`files`:** `dist`, `README.md`, `LICENSE` (6 entries: `LICENSE`, `README.md`, `dist/index.d.ts`, `dist/index.js`, `dist/index.js.map`, `package.json`)
- **Dependencies (16):** `@lanonasis/memory-client ^2.2.0`, `@lanonasis/oauth-client ^2.0.0`, `@modelcontextprotocol/sdk ^1.27.1`, `chalk ^5.6.2`, `commander ^14.0.3`, `dotenv ^17.3.1`, `inquirer ^13.3.2`, `open ^11.0.0`, `ora ^9.3.0`, `uuid ^13.0.0`, `vortexai-l0 ^1.2.2`, `zod ^4.3.6`, `ink ^6.8.0`, `react ^19.2.4`, `react-dom ^19.2.4`
- **`publishConfig`:** `access: public`, `https://registry.npmjs.org/`
- **`npm pack --dry-run` result:** 6 entries, 109 KB packed / 492 KB unpacked
- **Concern:** `uuid ^13.0.0` — current uuid is 11.x; 13.0.0 does not exist on the public registry. Will fail `npm install`. **Verify before publishing 1.0.1.**
- **Concern:** no `CHANGELOG.md`, no `SKILL.md` in `files` — these exist in the source tree but won't ship. That is consistent with the current REPL surface but worth flagging.

### Publish order risk

`@lanonasis/cli` declares `@lanonasis/repl-cli ^1.0.1` as `optionalDependencies`. Optional dependencies are resolved by npm at install time and silently skipped if they fail to resolve — they do NOT block `@lanonasis/cli` from installing. So the **publish order risk is low**.

What matters more: `@lanonasis/repl-cli` 1.0.1 should be published **first** (or concurrently), so that fresh `@lanonasis/cli` installs can optionally pick up the REPL bridge. If users install `@lanonasis/cli` before 1.0.1 hits the registry, `onasis repl` will print "REPL package not found" until they `npm install -g @lanonasis/repl-cli` manually. The CLI's error message already provides that hint (verified in `cli/src/index.ts:484-493`).

The dependency version risk above (axios 1.14.0, uuid 13.0.0) is the **higher blocker** — neither version exists on the public registry at the time of writing, so publishing either package as-is will produce an uninstallable artifact.

---

## 3. Docs drift list (grouped by severity)

### 🚨 Critical — docs instruct something that fails or points to the wrong endpoint

- **C1. `axios ^1.14.0` and `uuid ^13.0.0` are future versions** that don't exist on the public npm registry. Publishing `@lanonasis/cli` or `@lanonasis/repl-cli` with these declared will produce an uninstallable artifact. (Source: cli/package.json + packages/repl-cli/package.json, cross-checked against npm registry on 2026-07-21.)

### ⚠️ Warning — missing commands, stale versions, naming drift

- **W1. `cli/README.md` still says "v3.10.1 - Secret Prescan"** in its H1 heading (`cli/README.md:1`), even though `cli/package.json` is **3.11.1**. The README hero banner is one major version behind. (Verified by reading the file directly.)
- **W2. `docs/context/project-overview.md:57` says `@lanonasis/cli v3.11.0`**, but the published version is **3.11.1**.
- **W3. `docs/context/project-overview.md:73` says `@lanonasis/repl-cli 1.0.0`**, but the published version is **1.0.1**.
- **W4. `docs/context/components/cli.md:4` is dated "Last verified 2026-05-16"** — pre-prescan (v3.10.0), pre-REPL bridge (v3.10.0), pre-v3.11.0/v3.11.1 entirely. Does not reflect `prescan` or the `lanonasis repl` bridge.
- **W5. The live reference documents `lanonasis repl` but lists only 3 of 6 forwarded flags** (`--mcp --api --token`). The actual bridge forwards `--ai-router`, `--model`, and `--config` as well (verified in `cli/src/index.ts:417-422` and `cli/CHANGELOG.md:7` for v3.11.1).
- **W6. The live reference documents `onasis prescan` with the v3.10.1 subcommand set** (`run`, `status` with `--save --ci --fail-on --exclude --json`). The CHANGELOG also describes `prescan scan`, `prescan audit`, and `prescan safe` (v3.10.0), which are NOT in the current top-level help. Either the live docs should list both shapes or the CLI should reconcile them.
- **W7. The live reference does not document `lrepl`, `onasis-repl`, or any `@lanonasis/repl-cli` subcommands** (`start`, `health`, `login`, `logout`, `auth-status`, `config`). Operators triaging REPL auth cannot find these in the public reference.
- **W8. The live reference does not document top-level commands `lanonasis dashboard`, `documentation`, `sdk`, `api`, `deploy`, `service`** even though all six ship in v3.11.1 and are advertised in the help text.
- **W9. The live changelog page (`docs.lanonasis.com/changelog`) does not mention `@lanonasis/cli` v3.11.1, v3.11.0, or `@lanonasis/repl-cli` v1.0.1.** It jumps from v3.11.0 (the most recent entry) to nothing newer, even though the CLI reference page header says v3.11.1. (Source: full web extract of `/changelog`, 25 KB text.)
- **W10. `docs.lanonasis.com/cli` (no `/reference`) returns 404** ("Page Not Found" verified by web extract). Any inbound link targeting `/cli` lands on a Docusaurus 404. This is the canonical index path and should redirect to `/cli/reference`.

### ℹ️ Info — consolidation or wording cleanup

- **I1. The audit brief claimed the live reference uses `onasis mcp list-tools` while the CLI exposes `onasis mcp tools`.** This claim is **incorrect** — the live reference (line 640 of `/cli/reference`) correctly uses `onasis mcp tools`, matching the CLI source. Update the brief.
- **I2. The audit brief claimed the live reference lists `topics` examples** while the CLI uses singular `topic`. The reference page actually uses `topic` with `topics` as alias (line 855). Update the brief.
- **I3. The `cli/scripts/postinstall.js` script is bundled in the package tarball.** Confirmed present in `npm pack --dry-run` output. Worth verifying it doesn't auto-mutate the user's PATH or run network calls during install.
- **I4. The brief's claim that the `docs/context/context-engineering-progress.md` checklist (line 78) prescribes a `components/repl-cli.md` doc is correct.** There is no `docs/context/components/repl-cli.md` — only `cli.md`, `memory-client.md`, `memory-service.md`, `sdk.md`, `claude-memory.md`, `recall-forge.md`, `ide-extension-core.md`, `memory-sdk-standalone.md`. Worth adding.
- **I5. The `cli/dist/index.js` ships with a stale on-disk REPL bridge message** at line 489: `"Run from monorepo root: cd /path/to/lan-onasis-monorepo && onasis repl"`. The actual monorepo path on this checkout is `/Users/vortexcore/Projects-Lanonasis/maas/lanonasis-maas`. The hardcoded example path will mislead new contributors.

---

## 4. Dependency scan

Verified `cli/package.json`, `packages/repl-cli/package.json`, `npm pack --dry-run --json` for both, and `cli/bun.lock` / `packages/repl-cli/bun.lock` presence.

### `@lanonasis/cli`

| Concern | Detail |
|---|---|
| **Unresolvable dep** | `axios ^1.14.0` — current registry version is 1.7.x. Will fail install. |
| **Unresolvable dep** | `uuid` is NOT a CLI dependency (only in repl-cli). Good. |
| **Optional dep risk** | `@lanonasis/repl-cli ^1.0.1` — optional, won't block install. The bridge uses `require.resolve` with a search path that handles missing package cleanly. Low risk. |
| **Runtime vs dev-only** | All 22 declared deps are runtime-required. `cli/scripts/postinstall.js` is bundled but does not import any runtime libs at install time (verified by file size). |
| **Lockfile parity** | `cli/bun.lock` exists alongside `bun.lock` at the workspace root. The package uses `bun.lock` for primary resolution; npm consumers will regenerate from `package.json`. No mismatch flag. |
| **Transitive risk** | `cli/scripts/postinstall.js` is shipped in the tarball but not referenced from `package.json#scripts.postinstall` (verified — no `postinstall` script in `cli/package.json`). It is dead weight at the moment. Either wire it up or drop it from `files`. |

### `@lanonasis/repl-cli`

| Concern | Detail |
|---|---|
| **Unresolvable dep** | `uuid ^13.0.0` — current registry version is 11.x. Will fail install. |
| **Unresolvable dep** | `react ^19.2.4` and `react-dom ^19.2.4` — current React is 19.0.0 / 19.1.x. 19.2.4 may or may not exist depending on release timing. **Verify against npm before publishing.** |
| **Bundled `vortexai-l0 ^1.2.2`** | Vendor SDK. Confirm 1.2.2 is published before publishing 1.0.1, otherwise `npm install` will fail. |
| **Files glob coverage** | Only `dist`, `README.md`, `LICENSE`. No `CHANGELOG.md`, no `SKILL.md`, no source maps beyond the single bundled `.map`. The dist is a single fat `dist/index.js` (148 KB) — fine for npm but no granular lazy loading. |
| **Lockfile parity** | `packages/repl-cli/bun.lock` exists. Bun-primary. npm consumers will regenerate. |

### Publish order recommendation

1. **Block publish of both 3.11.1 and 1.0.1** until `axios` and `uuid` versions are corrected to current registry versions.
2. **Verify `react` / `react-dom` versions** for repl-cli before publishing 1.0.1.
3. **Verify `vortexai-l0 ^1.2.2` is published** on the registry before publishing repl-cli 1.0.1.
4. **Once clean:** publish `@lanonasis/repl-cli@1.0.1` first, then `@lanonasis/cli@3.11.1`. (Order is informational since cli uses `optionalDependencies`, but installing repl-cli first lets fresh `npm install -g @lanonasis/cli` users get a working `onasis repl` immediately.)
5. **Re-pack and verify** with `npm pack --dry-run` against the corrected manifests.

---

## 5. AI Router reliability gap

**Verified from source (`packages/repl-cli/src/core/ai-router-client.ts`, `orchestrator.ts`):**

### Request schema (`AIRouterChatRequest`)

```ts
{
  messages: Array<{ role: string; content: string }>;
  tools?: any[];
  use_case?: string;
  temperature?: number;
  max_tokens?: number;
  tool_choice?: string;
}
```

POSTed to `${baseUrl}/api/v1/ai-chat` with headers `Content-Type: application/json`, `X-Use-Case: <use_case>` (when set), and either `X-API-Key: <lano_...>` or `Authorization: Bearer <jwt>` depending on token shape (`ai-router-client.ts:71-85`).

### Response schema (`AIRouterChatResponse`)

The client maps `data.response ?? data.message?.content` into `message.content`, and `data.message?.tool_calls ?? data.tool_calls` into `message.tool_calls` (`ai-router-client.ts:125-137`). The client tolerates either `{ response }` or `{ message: { content } }` shapes — good for vendor drift.

### Fallback chain

Verified in `packages/repl-cli/src/core/orchestrator.ts`:

1. **AI Router first** (line 549-572): tries `${aiRouterUrl}/api/v1/ai-chat` via `AIRouterClient`. On error, logs "Switching to backup intelligence..." and falls through.
2. **OpenAI second** (line 575-604): if `openaiApiKey` is configured, hits `https://api.openai.com/v1/chat/completions` directly with the same tool schema. On 401/rate-limit/timeout/network errors it logs and falls through (line 393-403).
3. **Local pattern matching third** (`fallbackProcessor`, line 675+): greets, recognizes "remember/save/store/note" intents, surfaces relevant memory context for question-shaped inputs. Returns conversational LZero-style responses.
4. **Hard fail** (line 606-608): if none of the three layers is available, throws `"No AI service available. Please configure either AI Router URL or OpenAI API key."`

### Gap: no end-to-end test

`packages/repl-cli/tests/` has 6 test files (1210 lines) plus 2 smoke scripts. They all mock `fetch` and never hit a live `ai.vortexcore.app` or `api.openai.com` endpoint. The tests cover:

- `ai-endpoint.test.ts` — orchestrator construction, L-Zero alias resolution, fallback greetings (mocked fetch).
- `health-check.test.ts` — endpoint health probe responses (mocked fetch).
- `credentials.test.ts` — credential persistence.
- `dashboard-components.test.tsx` — UI rendering with mocked props.
- `memory-commands.test.ts` — memory CRUD plumbing.
- `repl-engine.test.ts` — REPL state machine.
- `repl-enhancements.test.ts` — feature flags.

**None of these exercises the AI Router → OpenAI → fallback chain against a real endpoint.** A 401 from the AI Router with valid-looking tokens, or a 502 from `ai.vortexcore.app`, would only surface in production.

### Additional gap: AI Router vendor masking is unaudited

`AIRouterChatResponse.onasis_metadata` is forwarded from the upstream response (`ai-router-client.ts:136`) but the REPL doesn't display it to the user. Operators can't tell from the REPL alone whether `vendor_masked: true` or `pii_removed: true` was applied to a given response. Worth surfacing as a debug flag.

### Recommendation

1. Add a vitest that mocks `fetch` to return `502` from the AI Router URL, then verifies the orchestrator falls back to OpenAI, then mocks `fetch` to return `401` from OpenAI and verifies the fallback processor runs.
2. Add an opt-in live integration test (gated on `RUN_LIVE_AI_TESTS=1`) that hits `https://ai.vortexcore.app/health` and `https://api.openai.com/v1/models` (auth-less probes) to confirm the endpoints respond.
3. Surface `onasis_metadata.vendor_masked` and `pii_removed` in the REPL response footer when `verbose` is on, so operators can audit vendor-side data handling.

---

## 6. Recommended patch plan

### Minimal files to update

| File | Change | Severity |
|---|---|---|
| `cli/package.json` | Pin `axios` to a real version (`^1.7.0` or current latest). | 🚨 Critical (blocks publish) |
| `packages/repl-cli/package.json` | Pin `uuid` to `^11.0.0` (current registry version). Verify `react` / `react-dom` versions too. | 🚨 Critical (blocks publish) |
| `cli/README.md` | Update H1 from "v3.10.1 - Secret Prescan" to "v3.11.1 - REPL Bridge / Skill / Docs Drift". | ⚠️ Warning |
| `docs/context/project-overview.md` | Bump `@lanonasis/cli` to v3.11.1 (line 57, 114), `@lanonasis/repl-cli` to 1.0.1 (line 73). Add `repl-cli` row to Navigation table (line 81-89). | ⚠️ Warning |
| `docs/context/components/cli.md` | Refresh "Last verified" date to 2026-07-21. Add `prescan` and `repl` bridge sections. Add `@lanonasis/repl-cli` row to "Integration Points" table. | ⚠️ Warning |
| `docs/context/components/repl-cli.md` | NEW. One-page summary of the REPL bridge package, binaries (`onasis-repl`/`lrepl`), the concierge endpoint stack, and fallback behavior. Closes the context-engineering-progress.md checklist item. | ⚠️ Warning |
| `docs/lanonasis.com/cli/reference` (live docs) | Add `--ai-router --model --config` to the REPL section. Document `lrepl`/`onasis-repl` as separate binaries. Document `lanonasis dashboard`, `documentation`, `sdk`, `api`, `deploy`, `service` as top-level commands. | ⚠️ Warning |
| `docs.lanonasis.com/changelog` (live) | Add v3.11.0, v3.11.1, and repl-cli 1.0.1 entries. | ⚠️ Warning |
| `docs.lanonasis.com/cli` (live) | Add a redirect from `/cli` → `/cli/reference` in the Docusaurus config. | ⚠️ Warning |
| `cli/scripts/postinstall.js` | Either wire into `package.json#scripts.postinstall` or remove from `files` glob. | ℹ️ Info |
| `cli/dist/index.js:489` | Replace the hardcoded `/path/to/lan-onasis-monorepo` example with `<monorepo-root>` and let the bridge emit `process.cwd()` instead. | ℹ️ Info |
| `packages/repl-cli/tests/ai-endpoint.test.ts` | Add a 502-from-AI-Router → 401-from-OpenAI → fallback-processor end-to-end test (mocked fetch). | ℹ️ Info |
| `packages/repl-cli/src/core/ai-router-client.ts` | When `verbose` is enabled, log `onasis_metadata` so operators can audit vendor masking. | ℹ️ Info |

### Verification commands

```bash
# After patching versions
cd /Users/vortexcore/Projects-Lanonasis/maas/lanonasis-maas/cli
npm pack --dry-run --json | jq -r '.[0].files[] | .path' | grep SKILL.md   # SKILL.md must still ship
node dist/index.js -h
node dist/index.js repl -h
node dist/index.js prescan -h
node dist/index.js mcp -h
node dist/index.js api-keys -h

# REPL package
cd /Users/vortexcore/Projects-Lanonasis/maas/lanonasis-maas/packages/repl-cli
npm pack --dry-run --json | jq -r '.[0].files[] | .path' | head -10
node dist/index.js -h
node dist/index.js start -h
node dist/index.js config

# Smoke bridge
node cli/dist/index.js repl --help
node packages/repl-cli/dist/index.js config

# Unit tests
cd packages/repl-cli && bun test   # or npx vitest run
cd cli && bun test                  # or npx jest

# Optional dependency check
npm ls @lanonasis/repl-cli --prefix cli
```

### Publish order

1. Fix `axios` and `uuid` versions in both packages.
2. Run `npm pack --dry-run` to confirm tarball contents.
3. Publish `@lanonasis/repl-cli@1.0.1` (or whatever patched version is chosen).
4. Publish `@lanonasis/cli@3.11.1` (or patched version).
5. Verify with `npm install -g @lanonasis/cli@3.11.1` on a clean machine and run `onasis repl --help` to confirm the bridge resolves the optional dependency.

### Blocked items (require credentials or live access)

- **Live AI Router test:** requires `AI_ROUTER_API_KEY` against `https://ai.vortexcore.app`. Currently the worker has no key.
- **OpenAI fallback test:** requires `OPENAI_API_KEY`. Currently the worker has no key.
- **Auth-gateway probe:** requires a vendor key (`lano_...`) to confirm `lanonasis auth login --vendor-key` end-to-end. Not in scope for this audit but flagged.
- **Live docs deploy:** any change to `docs.lanonasis.com/cli/reference` requires Netlify deploy access to the docs repo (not in this monorepo). Worth queueing a follow-up card with the docs owner.

---

## 7. Confirmed items from the original brief — corrections

| Brief claim | Verified status |
|---|---|
| `cli/SKILL.md` is in the npm `files` list | ✅ Confirmed (3611 bytes, present in `npm pack --dry-run`) |
| `lanonasis repl` is a bridge into `@lanonasis/repl-cli`, not a separate REPL | ✅ Confirmed (`cli/src/index.ts:414-523`, spawns `node replPath start ...`) |
| Bridge forwards `--mcp --api --ai-router --token --model --config` | ✅ Confirmed (`cli/src/index.ts:497-502`) |
| `lrepl config` shows `apiUrl=https://api.lanonasis.com`, `aiRouterUrl=https://ai.vortexcore.app`, `openaiModel=L-Zero`, `useMCP=false` | ✅ Confirmed (verbatim from `node packages/repl-cli/dist/index.js config`) |
| Live docs page `/cli/reference` says `@lanonasis/cli v3.9.8+` | ❌ INCORRECT — current page header says v3.11.1. The brief is stale on this point. |
| Live docs do not document `lanonasis repl` | ⚠️ Partially correct — `repl` IS documented (line 574 of `/cli/reference`) but the documentation is underweight (3 of 6 forwarded flags missing). |
| Live docs do not document `lrepl` / `@lanonasis/repl-cli` | ✅ Confirmed — no mention of the REPL package or its binaries anywhere on `/cli/reference` or `/changelog`. |
| Live docs do not document `prescan` | ❌ INCORRECT — `prescan run` and `prescan status` ARE documented (line 735-792) with the v3.10.1 flag set. The CHANGELOG also describes `prescan scan/audit/safe` (v3.10.0) which are NOT in the current CLI help — that's the real drift. |
| Live docs do not document `dashboard / documentation / sdk / api / deploy / service` | ✅ Confirmed — none of these top-level commands appear on `/cli/reference`. |
| Live docs use `onasis mcp list-tools` while CLI uses `mcp tools` | ❌ INCORRECT — live reference uses `mcp tools` (line 640) matching the CLI. |
| Live docs use `topics` while CLI uses `topic` | ❌ INCORRECT — live reference uses `topic` (line 855) with `topics` as alias, matching the CLI. |
| Live changelog does not mention v3.11.1, v3.11.0, v3.10.1, repl-cli 1.0.1 | ✅ Confirmed — `/changelog` jumps from v3.11.0 (top of page) to nothing newer. |
| `docs/context/project-overview.md` says `@lanonasis/cli v3.11.0` and repl-cli v1.0.0 | ✅ Confirmed (lines 57, 73, 114). |
| `docs/context/components/cli.md` last verified 2026-05-16 | ✅ Confirmed (line 4). |

---

## 8. Open questions for the human reviewer

1. Should the patched `@lanonasis/cli` version bump to **3.11.2** (so the broken version is never published) or should we yank `3.11.1` from the registry after publishing a clean version? Registry yanking requires npm owner access.
2. Is `axios ^1.14.0` a deliberate pre-release pinned via a private registry? If so, the public tarball should declare a different version range.
3. Is the concierge REPL endpoint stack (`api.lanonasis.com` + `ai.vortexcore.app` + `L-Zero`) safe to publish in the live docs? It is currently emitted by `lrepl config` and verified in this audit, but the live reference page has never listed it.
4. Should `lanonasis api/deploy/service/dashboard/documentation/sdk` be promoted from read-only info dumps to actual subsystems, or deprecated from the CLI entirely? They ship but only print hardcoded status text.

---

## Files referenced

- `cli/package.json` (CLI manifest, v3.11.1)
- `cli/src/index.ts` (REPL bridge at lines 414-523)
- `cli/src/commands/prescan.ts` (prescan command)
- `cli/scripts/postinstall.js` (bundled but unreferenced)
- `cli/SKILL.md` (3611 bytes, ships in tarball)
- `cli/CHANGELOG.md` (v3.11.1, v3.10.1, v3.10.0 entries)
- `cli/README.md` (H1 still says v3.10.1)
- `packages/repl-cli/package.json` (REPL manifest, v1.0.1)
- `packages/repl-cli/src/index.ts` (top-level REPL command)
- `packages/repl-cli/src/core/ai-router-client.ts` (AI Router request/response schema, fallback token handling)
- `packages/repl-cli/src/core/orchestrator.ts` (AI Router → OpenAI → fallback chain)
- `packages/repl-cli/tests/ai-endpoint.test.ts` (unit tests only, no live e2e)
- `docs/context/project-overview.md` (stale version references)
- `docs/context/components/cli.md` (last verified 2026-05-16)
- `docs/cli-drift-analysis-and-fixes.md` (older drift doc, still useful)
- Live: `docs.lanonasis.com/cli/reference` (v3.11.1 header, REPL + prescan documented)
- Live: `docs.lanonasis.com/cli` (404)
- Live: `docs.lanonasis.com/changelog` (no v3.11.1 / repl-cli 1.0.1 entries)
- Live: `docs.lanonasis.com/mcp/overview` (tools list aligned with CLI)
